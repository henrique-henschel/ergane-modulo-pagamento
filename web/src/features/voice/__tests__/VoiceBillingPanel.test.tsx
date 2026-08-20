import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerProvider } from '../../../context/CustomerContext';
import { VoiceBillingPanel } from '../VoiceBillingPanel';

const createVoiceCharge = vi.fn();

vi.mock('../../../lib/apiClient', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/apiClient')>();
  return {
    ...original,
    api: {
      ...original.api,
      createVoiceCharge: (...args: unknown[]) => createVoiceCharge(...args),
    },
  };
});

/** Dublê da Web Speech API: o jsdom não implementa reconhecimento de fala. */
class FakeRecognition implements SpeechRecognitionLike {
  static last: FakeRecognition | null = null;

  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;

  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  constructor() {
    FakeRecognition.last = this;
  }

  start() {
    this.onstart?.();
  }
  stop() {
    this.onend?.();
  }
  abort() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }

  /** Simula o navegador devolvendo uma transcrição final. */
  emitTranscript(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: { length: 1, 0: { length: 1, isFinal: true, 0: { transcript: text, confidence: 1 } } },
    } as unknown as SpeechRecognitionEvent);
  }

  emitError(code: string) {
    this.onerror?.({ error: code, message: '' } as SpeechRecognitionErrorEvent);
  }
}

const speakMock = vi.fn();

function renderPanel() {
  return render(
    <CustomerProvider>
      <VoiceBillingPanel onCharged={vi.fn()} />
    </CustomerProvider>,
  );
}

beforeEach(() => {
  createVoiceCharge.mockReset();
  speakMock.mockReset();
  window.localStorage.clear();

  vi.stubGlobal('SpeechRecognition', FakeRecognition);
  vi.stubGlobal('speechSynthesis', { speak: speakMock, cancel: vi.fn() });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = '';
      constructor(public text: string) {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeRecognition.last = null;
});

describe('cobrança por voz', () => {
  it('percorre idle → gravando → processando → sucesso', async () => {
    const user = userEvent.setup();
    createVoiceCharge.mockResolvedValue({
      status: 'CHARGED',
      paymentId: 'pay-1',
      invoiceId: 'inv-1',
      payerName: 'Maria',
      amountInCents: 15000,
      currency: 'BRL',
      method: 'PIX',
      paymentStatus: 'PAID',
    });

    renderPanel();

    const button = screen.getByRole('button', { name: /Cobrar por voz/ });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(screen.getByRole('button', { name: /Ouvindo/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    FakeRecognition.last?.emitTranscript('cobrar cento e cinquenta da Maria no pix');

    expect(await screen.findByText('Cobrança registrada')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*150,00/)).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
  });

  it('envia a transcrição e uma chave de idempotência ao servidor', async () => {
    const user = userEvent.setup();
    createVoiceCharge.mockResolvedValue({
      status: 'CHARGED',
      paymentId: 'p',
      invoiceId: 'i',
      payerName: 'Ana',
      amountInCents: 1000,
      currency: 'BRL',
      method: 'PIX',
      paymentStatus: 'PAID',
    });

    renderPanel();
    await user.click(screen.getByRole('button', { name: /Cobrar por voz/ }));
    FakeRecognition.last?.emitTranscript('cobrar dez da Ana');

    await waitFor(() => expect(createVoiceCharge).toHaveBeenCalledTimes(1));
    const [payload] = createVoiceCharge.mock.calls[0] as [Record<string, unknown>];
    expect(payload.utterance).toBe('cobrar dez da Ana');
    expect(String(payload.idempotencyKey).length).toBeGreaterThanOrEqual(8);
  });

  it('desmonta o botão de gravação ao exibir o card de sucesso', async () => {
    const user = userEvent.setup();
    createVoiceCharge.mockResolvedValue({
      status: 'CHARGED',
      paymentId: 'p',
      invoiceId: 'i',
      payerName: 'Ana',
      amountInCents: 1000,
      currency: 'BRL',
      method: 'PIX',
      paymentStatus: 'PAID',
    });

    renderPanel();
    await user.click(screen.getByRole('button', { name: /Cobrar por voz/ }));
    FakeRecognition.last?.emitTranscript('cobrar dez da Ana');

    await screen.findByText('Cobrança registrada');
    expect(screen.queryByRole('button', { name: /Cobrar por voz/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova cobrança' })).toBeInTheDocument();
  });

  it('fala e exibe o motivo quando o servidor não entende a cobrança', async () => {
    const user = userEvent.setup();
    createVoiceCharge.mockResolvedValue({
      status: 'UNCLEAR',
      reason: 'Não entendi o valor. Repita dizendo quanto quer cobrar.',
    });

    renderPanel();
    await user.click(screen.getByRole('button', { name: /Cobrar por voz/ }));
    FakeRecognition.last?.emitTranscript('bom dia');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não entendi o valor. Repita dizendo quanto quer cobrar.',
    );
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0]?.[0]).toMatchObject({
      text: 'Não entendi o valor. Repita dizendo quanto quer cobrar.',
      lang: 'pt-BR',
    });
  });

  it('traduz microfone bloqueado em orientação falada, sem chamar a API', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /Cobrar por voz/ }));
    FakeRecognition.last?.emitError('not-allowed');

    expect(await screen.findByRole('alert')).toHaveTextContent(/microfone está bloqueado/);
    expect(createVoiceCharge).not.toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
  });

  it('avisa e desabilita o botão quando o navegador não reconhece voz', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);

    renderPanel();

    expect(screen.getByText(/Voz indisponível neste navegador/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cobrar por voz/ })).toBeDisabled();
  });

  it('descreve o botão por dica associada, não só pelo rótulo', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /Cobrar por voz/ })).toHaveAccessibleDescription(
      /cobrar cento e cinquenta reais da Maria no Pix/,
    );
  });
});
