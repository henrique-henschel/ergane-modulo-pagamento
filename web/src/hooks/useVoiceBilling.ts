import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../lib/apiClient';
import {
  describeRecognitionError,
  getSpeechRecognition,
  isSpeechRecognitionSupported,
  speak,
  stopSpeaking,
} from '../lib/speech';
import { newIdempotencyKey } from '../lib/idempotency';
import type { VoiceChargeResult } from '../types/api';

/** Ciclo de vida da interação por voz. */
export type VoiceBillingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export interface UseVoiceBilling {
  state: VoiceBillingState;
  /** Última fala reconhecida, exibida como confirmação do que foi ouvido. */
  transcript: string;
  charge: Extract<VoiceChargeResult, { status: 'CHARGED' }> | null;
  /** Mensagem de erro ou de fala ambígua — a mesma que é sintetizada em voz. */
  message: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Concentra gravação, chamada à API e síntese de voz.
 *
 * A UI que consome este hook não conhece a Web Speech API nem o cliente HTTP:
 * recebe estado e ações, e só renderiza.
 */
export function useVoiceBilling(customerId: string): UseVoiceBilling {
  const [state, setState] = useState<VoiceBillingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [message, setMessage] = useState('');
  const [charge, setCharge] = useState<
    Extract<VoiceChargeResult, { status: 'CHARGED' }> | null
  >(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  const fail = useCallback((text: string) => {
    if (!mountedRef.current) return;
    setState('error');
    setMessage(text);
    // Erro é falado: o microempreendedor costuma estar de mãos ocupadas.
    speak(text);
  }, []);

  const submit = useCallback(
    async (utterance: string) => {
      setState('processing');
      setMessage('');

      try {
        const result = await api.createVoiceCharge({
          customerId,
          utterance,
          currency: 'BRL',
          idempotencyKey: newIdempotencyKey('voz'),
        });

        if (!mountedRef.current) return;

        if (result.status === 'UNCLEAR') {
          fail(result.reason);
          return;
        }

        setCharge(result);
        setState('success');
      } catch (error) {
        if (!mountedRef.current) return;
        fail(
          error instanceof ApiError
            ? error.displayMessage
            : 'Não consegui registrar a cobrança. Tente de novo.',
        );
      }
    },
    [customerId, fail],
  );

  const start = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      fail('Este navegador não reconhece voz. Use o Chrome ou digite a cobrança.');
      return;
    }

    const recognition = getSpeechRecognition();
    if (recognition === null) return;

    stopSpeaking();
    setTranscript('');
    setMessage('');
    setCharge(null);

    // Distingue "reconhecimento terminou sem resultado" de "já tratei o resultado".
    let handled = false;

    recognition.onstart = () => {
      if (mountedRef.current) setState('recording');
    };

    recognition.onresult = (event) => {
      handled = true;
      const heard = event.results[0]?.[0]?.transcript?.trim() ?? '';
      if (!mountedRef.current) return;

      setTranscript(heard);
      if (heard === '') {
        fail('Não ouvi nada. Toque no botão e fale a cobrança.');
        return;
      }
      void submit(heard);
    };

    recognition.onerror = (event) => {
      handled = true;
      fail(describeRecognitionError(event.error));
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      // Encerrou sem resultado nem erro: o usuário soltou antes de falar.
      if (!handled && mountedRef.current) {
        setState((current) => (current === 'recording' ? 'idle' : current));
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      fail('Não consegui iniciar a gravação. Tente de novo.');
    }
  }, [fail, submit]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    stopSpeaking();
    setState('idle');
    setTranscript('');
    setMessage('');
    setCharge(null);
  }, []);

  return {
    state,
    transcript,
    charge,
    message,
    supported: isSpeechRecognitionSupported(),
    start,
    stop,
    reset,
  };
}
