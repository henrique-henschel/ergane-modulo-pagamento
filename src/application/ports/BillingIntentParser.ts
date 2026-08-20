import { PaymentMethod } from '../../domain/entities/Payment';

/** Cobrança extraída de uma frase em linguagem natural. */
export interface BillingIntent {
  payerName: string;
  /** Já convertido para centavos inteiros — nenhum float cruza esta fronteira. */
  amountInCents: number;
  method: PaymentMethod;
}

/**
 * `UNCLEAR` é resposta de negócio, não falha: o interlocutor falou algo que não
 * descreve uma cobrança, e o motivo é devolvido para ser lido em voz alta.
 */
export type ParseResult =
  | { status: 'PARSED'; intent: BillingIntent }
  | { status: 'UNCLEAR'; reason: string };

/**
 * Porta de saída para interpretação de linguagem natural. A camada de aplicação
 * depende só desta interface — trocar de provedor de LLM não toca em caso de uso.
 */
export interface BillingIntentParser {
  readonly name: string;
  parse(utterance: string): Promise<ParseResult>;
}
