import { z } from 'zod';
import {
  BillingIntent,
  BillingIntentParser,
  ParseResult,
} from '../../application/ports/BillingIntentParser';
import { PaymentMethod } from '../../domain/entities/Payment';
import { ExternalServiceError } from '../../domain/shared/DomainError';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

const SYSTEM_INSTRUCTION = `Você extrai cobranças de falas de microempreendedores brasileiros.

Devolva os campos "nome", "valor" e "metodo" quando a fala descrever uma cobrança.
- "valor" é o total em reais, como número (150.5 para cento e cinquenta reais e cinquenta centavos).
- "metodo" é exatamente um de: "Pix", "Cartão de crédito", "Boleto".
- Quando o método não for dito, use "Pix".

Devolva apenas o campo "erro", com uma frase curta em português para ser lida em voz
alta, quando a fala não descrever uma cobrança ou faltar o nome ou o valor.
A frase deve dizer ao interlocutor o que repetir.

Nunca devolva "erro" junto com os outros campos.`;

/**
 * Schema enviado ao Gemini (subconjunto OpenAPI). Restringe a saída na origem,
 * em vez de pedir JSON em prosa e torcer.
 */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    nome: { type: 'STRING' },
    valor: { type: 'NUMBER' },
    metodo: { type: 'STRING', enum: ['Pix', 'Cartão de crédito', 'Boleto'] },
    erro: { type: 'STRING' },
  },
} as const;

/**
 * O schema acima restringe, mas não garante: a saída do modelo é entrada
 * não confiável e passa pela mesma validação que qualquer payload externo.
 */
const modelOutputSchema = z.union([
  z.object({ erro: z.string().min(1) }),
  z.object({
    nome: z.string().min(1).max(120),
    valor: z.number().finite().positive(),
    metodo: z.enum(['Pix', 'Cartão de crédito', 'Boleto']),
  }),
]);

const METHOD_BY_LABEL: Record<string, PaymentMethod> = {
  Pix: 'PIX',
  'Cartão de crédito': 'CREDIT_CARD',
  Boleto: 'BOLETO',
};

export interface GeminiParserOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class GeminiBillingIntentParser implements BillingIntentParser {
  readonly name = 'gemini';

  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: GeminiParserOptions) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async parse(utterance: string): Promise<ParseResult> {
    const payload = await this.callGemini(utterance);
    const text = this.extractText(payload);

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new ExternalServiceError('O Gemini devolveu uma resposta que não é JSON.');
    }

    const parsed = modelOutputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ExternalServiceError(
        'O Gemini devolveu um JSON fora do formato esperado.',
      );
    }

    if ('erro' in parsed.data) {
      return { status: 'UNCLEAR', reason: parsed.data.erro };
    }

    const method = METHOD_BY_LABEL[parsed.data.metodo];
    if (method === undefined) {
      throw new ExternalServiceError(
        `Método de pagamento desconhecido: ${parsed.data.metodo}.`,
      );
    }

    const intent: BillingIntent = {
      payerName: parsed.data.nome.trim(),
      // Reais (float) para centavos (inteiro) no ponto de entrada: daqui para
      // dentro do sistema o dinheiro nunca mais é float.
      amountInCents: Math.round(parsed.data.valor * 100),
      method,
    };

    return { status: 'PARSED', intent };
  }

  private async callGemini(utterance: string): Promise<unknown> {
    const url =
      `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.options.model)}` +
      `:generateContent?key=${encodeURIComponent(this.options.apiKey)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: 'user', parts: [{ text: utterance }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0,
          },
        }),
      });
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new ExternalServiceError(
        aborted
          ? 'O Gemini não respondeu a tempo.'
          : 'Não foi possível contatar o Gemini.',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // A chave viaja na query string; nada da URL entra na mensagem de erro.
      throw new ExternalServiceError(
        `O Gemini recusou a requisição (HTTP ${response.status}).`,
      );
    }

    return response.json();
  }

  /** Extrai o texto da primeira candidata, tolerando partes múltiplas. */
  private extractText(payload: unknown): string {
    const shape = z.object({
      candidates: z
        .array(
          z.object({
            content: z.object({
              parts: z.array(z.object({ text: z.string() }).partial()).optional(),
            }),
          }),
        )
        .min(1),
    });

    const parsed = shape.safeParse(payload);
    if (!parsed.success) {
      throw new ExternalServiceError('O Gemini devolveu uma resposta sem conteúdo.');
    }

    const text = (parsed.data.candidates[0]?.content.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

    if (text === '') {
      throw new ExternalServiceError('O Gemini devolveu uma resposta vazia.');
    }

    return text;
  }
}
