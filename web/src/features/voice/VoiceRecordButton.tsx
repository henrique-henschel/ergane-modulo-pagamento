import type { VoiceBillingState } from '../../hooks/useVoiceBilling';

interface VoiceRecordButtonProps {
  state: VoiceBillingState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

/**
 * Componente sem lógica: recebe o estado e devolve o acionamento.
 * Não conhece a Web Speech API nem a API do Ergane.
 */

const LABEL: Record<VoiceBillingState, string> = {
  idle: 'Cobrar por voz',
  recording: 'Ouvindo… toque para parar',
  processing: 'Registrando cobrança…',
  success: 'Cobrar por voz',
  error: 'Tentar de novo',
};

const HINT: Record<VoiceBillingState, string> = {
  idle: 'Toque e diga, por exemplo: cobrar cento e cinquenta reais da Maria no Pix.',
  recording: 'Fale a cobrança. Toque de novo quando terminar.',
  processing: 'Aguarde enquanto a cobrança é registrada.',
  success: 'Toque para registrar outra cobrança.',
  error: 'Toque e repita a cobrança.',
};

export function VoiceRecordButton({
  state,
  onStart,
  onStop,
  disabled = false,
}: VoiceRecordButtonProps) {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const hintId = 'voz-dica';

  return (
    <div className="erg-voice">
      <button
        type="button"
        className={`erg-voice__button erg-voice__button--${state}`}
        // Botão-interruptor: o estado ligado/desligado é anunciado pelo pressed.
        aria-pressed={isRecording}
        aria-describedby={hintId}
        aria-busy={isProcessing}
        disabled={disabled || isProcessing}
        onClick={isRecording ? onStop : onStart}
      >
        <span className="erg-voice__icon" aria-hidden="true">
          {isProcessing ? <span className="erg-spinner" /> : '🎙'}
        </span>
        {LABEL[state]}
      </button>

      <p className="erg-voice__hint" id={hintId}>
        {HINT[state]}
      </p>
    </div>
  );
}
