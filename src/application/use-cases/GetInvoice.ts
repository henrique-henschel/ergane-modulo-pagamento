import { Invoice } from '../../domain/entities/Invoice';
import { InvoiceRepository } from '../../domain/repositories/InvoiceRepository';
import { NotFoundError } from '../../domain/shared/DomainError';
import { InvoiceId } from '../../domain/shared/Identifier';

export class GetInvoice {
  constructor(private readonly invoices: InvoiceRepository) {}

  async execute(invoiceId: InvoiceId): Promise<Invoice> {
    const invoice = await this.invoices.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundError(`Fatura ${invoiceId} não encontrada.`);
    }
    return invoice;
  }
}
