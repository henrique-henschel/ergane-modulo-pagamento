/** Adaptadores finos sobre a Web Speech API, isolando o hook do prefixo do vendor. */

const LANG = 'pt-BR';

export function getSpeechRecognition(): SpeechRecognitionLike | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (Ctor === undefined) return null;

  const recognition = new Ctor();
  recognition.lang = LANG;
  // Uma frase por acionamento: o usuário fala a cobrança e solta o botão.
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.SpeechRecognition ?? window.webkitSpeechRecognition) !== undefined
  );
}

/**
 * Lê a mensagem em voz alta, em pt-BR. Silencioso quando o navegador não tem
 * síntese de voz — a mensagem continua visível na tela de qualquer forma.
 */
export function speak(message: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Cancela o que estiver na fila para não empilhar mensagens antigas.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = LANG;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
}

/** Mensagens de erro do reconhecimento, já em linguagem de usuário. */
export function describeRecognitionError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O microfone está bloqueado. Libere o acesso nas permissões do navegador.';
    case 'no-speech':
      return 'Não ouvi nada. Toque no botão e fale a cobrança.';
    case 'audio-capture':
      return 'Não encontrei um microfone disponível neste aparelho.';
    case 'network':
      return 'O reconhecimento de voz não conseguiu acessar a rede.';
    case 'aborted':
      return 'A gravação foi interrompida.';
    default:
      return 'Não consegui capturar sua fala. Tente de novo.';
  }
}
