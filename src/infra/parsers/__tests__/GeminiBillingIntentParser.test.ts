import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExternalServiceError } from '../../../domain/shared/DomainError';
import { GeminiBillingIntentParser } from '../GeminiBillingIntentParser';

function makeParser() {
  return new GeminiBillingIntentParser({
    apiKey: 'chave-de-teste',
    model: 'gemini-2.5-flash',
    timeoutMs: 50,
  });
}

/** Molda a resposta do Gemini em volta do JSON que o modelo teria produzido. */
function geminiRespondsWith(modelJson: string, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  return vi.fn().mockResolvedValue({
    ok,
    status: init.status ?? (ok ? 200 : 500),
    json: async () => ({
      candidates: [{ content: { parts: [{ text: modelJson }] } }],
    }),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GeminiBillingIntentParser', () => {
  it('converte reais em centavos inteiros', async () => {
    vi.stubGlobal(
      'fetch',
      geminiRespondsWith('{"nome":"Maria","valor":150.5,"metodo":"Pix"}'),
    );

    const result = await makeParser().parse('cobra cento e cinquenta e cinquenta da Maria');

    expect(result).toEqual({
      status: 'PARSED',
      intent: { payerName: 'Maria', amountInCents: 15050, method: 'PIX' },
    });
  });

  it('não perde centavos em valores que o float arredonda mal', async () => {
    vi.stubGlobal(
      'fetch',
      geminiRespondsWith('{"nome":"Ana","valor":19.99,"metodo":"Boleto"}'),
    );

    const result = await makeParser().parse('cobra dezenove e noventa e nove da Ana');

    // 19.99 * 100 dá 1998.9999... em float puro.
    expect(result).toMatchObject({ intent: { amountInCents: 1999, method: 'BOLETO' } });
  });

  it('traduz os rótulos em português para os métodos do domínio', async () => {
    vi.stubGlobal(
      'fetch',
      geminiRespondsWith('{"nome":"João","valor":10,"metodo":"Cartão de crédito"}'),
    );

    const result = await makeParser().parse('cobra dez do João no cartão');

    expect(result).toMatchObject({ intent: { method: 'CREDIT_CARD' } });
  });

  it('devolve UNCLEAR quando o modelo sinaliza que não entendeu', async () => {
    vi.stubGlobal(
      'fetch',
      geminiRespondsWith('{"erro":"Não entendi o valor. Repita dizendo quanto cobrar."}'),
    );

    const result = await makeParser().parse('bom dia');

    expect(result).toEqual({
      status: 'UNCLEAR',
      reason: 'Não entendi o valor. Repita dizendo quanto cobrar.',
    });
  });

  it('rejeita JSON bem formado mas fora do contrato', async () => {
    vi.stubGlobal('fetch', geminiRespondsWith('{"nome":"Maria","valor":"cento e cinquenta"}'));

    await expect(makeParser().parse('cobra da Maria')).rejects.toThrow(ExternalServiceError);
  });

  it('rejeita valor negativo vindo do modelo', async () => {
    vi.stubGlobal(
      'fetch',
      geminiRespondsWith('{"nome":"Maria","valor":-50,"metodo":"Pix"}'),
    );

    await expect(makeParser().parse('cobra da Maria')).rejects.toThrow(ExternalServiceError);
  });

  it('rejeita resposta que não é JSON', async () => {
    vi.stubGlobal('fetch', geminiRespondsWith('Claro! Aqui está: {nome: Maria}'));

    await expect(makeParser().parse('cobra da Maria')).rejects.toThrow(ExternalServiceError);
  });

  it('trata erro HTTP do Gemini como falha de serviço externo', async () => {
    vi.stubGlobal('fetch', geminiRespondsWith('{}', { ok: false, status: 429 }));

    await expect(makeParser().parse('cobra da Maria')).rejects.toThrow(/HTTP 429/);
  });

  it('não vaza a chave de API na mensagem de erro', async () => {
    vi.stubGlobal('fetch', geminiRespondsWith('{}', { ok: false, status: 403 }));

    await expect(makeParser().parse('cobra da Maria')).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('chave-de-teste') }),
    );
  });

  it('trata timeout como falha de serviço externo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    );

    await expect(makeParser().parse('cobra da Maria')).rejects.toThrow(/não respondeu a tempo/);
  });

  it('envia a fala e o schema de resposta ao Gemini', async () => {
    const fetchMock = geminiRespondsWith('{"nome":"Ana","valor":10,"metodo":"Pix"}');
    vi.stubGlobal('fetch', fetchMock);

    await makeParser().parse('cobra dez da Ana no pix');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('gemini-2.5-flash:generateContent');

    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'cobra dez da Ana no pix' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
  });
});
