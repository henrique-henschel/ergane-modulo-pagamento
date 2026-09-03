import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { CustomerId } from '../../domain/shared/Identifier';

export interface GetFinancialSummaryInput {
  customerId: CustomerId;
}

export interface FinancialSummaryOutput {
  customerId: string;
  totalInvoicedInCents: number;
  totalPaidInCents: number;
  totalPendingInCents: number;
  totalRefundedInCents: number;
  totalOverdueInCents: number;
  invoiceCount: {
    total: number;
    open: number;
    paid: number;
    overdue: number;
    void: number;
  };
  paymentCount: {
    total: number;
    paid: number;
    failed: number;
    partiallyRefunded: number;
    refunded: number;
  };
  conversionRatePercentage: number;
}

export class GetFinancialSummary {
  constructor(
    private readonly invoices: InvoiceRepository,
    private readonly payments: PaymentRepository,
  ) {}

  async execute(input: GetFinancialSummaryInput): Promise<FinancialSummaryOutput> {
    const customerInvoices = await this.invoices.listByCustomer(input.customerId);
    const customerPayments = await this.payments.listByCustomer(input.customerId);

    let totalInvoicedInCents = 0;
    let totalPendingInCents = 0;
    let totalOverdueInCents = 0;

    const invoiceCounts = {
      total: customerInvoices.length,
      open: 0,
      paid: 0,
      overdue: 0,
      void: 0,
    };

    for (const inv of customerInvoices) {
      const invTotal = inv.total.amountInCents;
      totalInvoicedInCents += invTotal;

      switch (inv.status) {
        case 'OPEN':
          invoiceCounts.open++;
          totalPendingInCents += invTotal;
          break;
        case 'PAID':
          invoiceCounts.paid++;
          break;
        case 'OVERDUE':
          invoiceCounts.overdue++;
          totalPendingInCents += invTotal;
          totalOverdueInCents += invTotal;
          break;
        case 'VOID':
          invoiceCounts.void++;
          break;
      }
    }

    let totalPaidInCents = 0;
    let totalRefundedInCents = 0;

    const paymentCounts = {
      total: customerPayments.length,
      paid: 0,
      failed: 0,
      partiallyRefunded: 0,
      refunded: 0,
    };

    for (const pay of customerPayments) {
      totalRefundedInCents += pay.refundedAmount.amountInCents;

      switch (pay.status) {
        case 'PAID':
          paymentCounts.paid++;
          totalPaidInCents += pay.amount.amountInCents;
          break;
        case 'FAILED':
          paymentCounts.failed++;
          break;
        case 'PARTIALLY_REFUNDED':
          paymentCounts.partiallyRefunded++;
          totalPaidInCents += pay.amount.amountInCents;
          break;
        case 'REFUNDED':
          paymentCounts.refunded++;
          totalPaidInCents += pay.amount.amountInCents;
          break;
      }
    }

    const netRevenue = Math.max(0, totalPaidInCents - totalRefundedInCents);

    const totalAttempted = paymentCounts.total;
    const successfulAttempts = paymentCounts.paid + paymentCounts.partiallyRefunded + paymentCounts.refunded;
    const conversionRatePercentage =
      totalAttempted > 0 ? Number(((successfulAttempts / totalAttempted) * 100).toFixed(1)) : 0;

    return {
      customerId: input.customerId,
      totalInvoicedInCents,
      totalPaidInCents: netRevenue,
      totalPendingInCents,
      totalRefundedInCents,
      totalOverdueInCents,
      invoiceCount: invoiceCounts,
      paymentCount: paymentCounts,
      conversionRatePercentage,
    };
  }
}
