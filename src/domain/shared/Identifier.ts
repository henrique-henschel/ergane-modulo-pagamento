import { randomUUID } from 'node:crypto';

export type PaymentId = string & { readonly __brand: 'PaymentId' };
export type InvoiceId = string & { readonly __brand: 'InvoiceId' };
export type RefundId = string & { readonly __brand: 'RefundId' };
export type CustomerId = string & { readonly __brand: 'CustomerId' };

export function newId<T extends string>(): T {
  return randomUUID() as T;
}
