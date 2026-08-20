import {
  BillingIntentParser,
  ParseResult,
} from '../../application/ports/BillingIntentParser';
import { PaymentMethod } from '../../domain/entities/Payment';

const METHOD_PATTERNS: Array<{ pattern: RegExp; method: PaymentMethod }> = [
  { pattern: /\bpix\b/i, method: 'PIX' },
  { pattern: /\b(cart[ãa]o|cr[ée]dito)\b/i, method: 'CREDIT_CARD' },
  { pattern: /\bboleto\b/i, method: 'BOLETO' },
];

/**
 * Interpretador local por expressão regular, usado quando não há GEMINI_API_KEY.
 *
 * Existe para que o módulo rode e seja testável sem credencial e sem rede — não
 * é um substituto do Gemini: entende só o formato "<valor> ... <nome>".
 */
export class StubBillingIntentParser implements BillingIntentParser {
  readonly name = 'stub';

  async parse(utterance: string): Promise<ParseResult> {
    const amountMatch = utterance.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!amountMatch?.[1]) {
      return {
        status: 'UNCLEAR',
        reason: 'Não entendi o valor. Repita dizendo quanto quer cobrar.',
      };
    }

    const nameMatch = utterance.match(/\b(?:d[aeo]|para|pro|pra)\s+([A-Za-zÀ-ÿ]+)/i);
    if (!nameMatch?.[1]) {
      return {
        status: 'UNCLEAR',
        reason: 'Não entendi de quem é a cobrança. Repita dizendo o nome da pessoa.',
      };
    }

    const method =
      METHOD_PATTERNS.find(({ pattern }) => pattern.test(utterance))?.method ?? 'PIX';

    const amountInReais = Number(amountMatch[1].replace(',', '.'));

    return {
      status: 'PARSED',
      intent: {
        payerName: nameMatch[1],
        amountInCents: Math.round(amountInReais * 100),
        method,
      },
    };
  }
}
