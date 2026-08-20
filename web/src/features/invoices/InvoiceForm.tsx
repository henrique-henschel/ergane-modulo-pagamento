import { useRef, useState } from 'react';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { SelectField, TextField } from '../../components/ui/Field';
import { useCustomer } from '../../context/CustomerContext';
import { useMutation } from '../../hooks/useAsync';
import { api } from '../../lib/apiClient';
import { formatMoney, parseAmountToCents } from '../../lib/format';
import type { Currency } from '../../types/api';

interface DraftLineItem {
  key: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface FieldErrors {
  dueDate?: string;
  items: Record<string, { description?: string; quantity?: string; unitPrice?: string }>;
}

const CURRENCY_OPTIONS = [
  { value: 'BRL', label: 'Real (BRL)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
];

function emptyItem(): DraftLineItem {
  return { key: crypto.randomUUID(), description: '', quantity: '1', unitPrice: '' };
}

function defaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

interface InvoiceFormProps {
  onCreated: (invoiceId: string) => void;
}

export function InvoiceForm({ onCreated }: InvoiceFormProps) {
  const { customerId } = useCustomer();
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [items, setItems] = useState<DraftLineItem[]>(() => [emptyItem()]);
  const [errors, setErrors] = useState<FieldErrors>({ items: {} });

  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const mutation = useMutation(api.createInvoice);

  const parsedTotal = items.reduce((sum, item) => {
    const cents = parseAmountToCents(item.unitPrice);
    const quantity = Number(item.quantity);
    if (cents === null || !Number.isInteger(quantity) || quantity <= 0) return sum;
    return sum + cents * quantity;
  }, 0);

  function updateItem(key: string, patch: Partial<DraftLineItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function validate(): FieldErrors | null {
    const next: FieldErrors = { items: {} };
    let valid = true;

    if (dueDate === '') {
      next.dueDate = 'Informe a data de vencimento.';
      valid = false;
    }

    for (const item of items) {
      const itemErrors: FieldErrors['items'][string] = {};

      if (item.description.trim() === '') {
        itemErrors.description = 'Descreva o item cobrado.';
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        itemErrors.quantity = 'Use um número inteiro maior que zero.';
      }

      const cents = parseAmountToCents(item.unitPrice);
      if (cents === null) {
        itemErrors.unitPrice = 'Informe um valor como 49,90.';
      } else if (cents === 0) {
        itemErrors.unitPrice = 'O valor precisa ser maior que zero.';
      }

      if (Object.keys(itemErrors).length > 0) {
        next.items[item.key] = itemErrors;
        valid = false;
      }
    }

    return valid ? null : next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors ?? { items: {} });

    if (validationErrors !== null) {
      // Leva o foco ao resumo para que o erro seja anunciado e visível de imediato.
      errorSummaryRef.current?.focus();
      return;
    }

    const created = await mutation.run({
      customerId,
      currency,
      // Meio-dia local evita que o fuso empurre o vencimento para o dia anterior.
      dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      lineItems: items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPriceInCents: parseAmountToCents(item.unitPrice) ?? 0,
      })),
    });

    if (created === null) {
      errorSummaryRef.current?.focus();
      return;
    }

    setItems([emptyItem()]);
    setDueDate(defaultDueDate());
    onCreated(created.invoiceId);
  }

  const hasFieldErrors = errors.dueDate !== undefined || Object.keys(errors.items).length > 0;

  return (
    <form className="erg-form__rows" onSubmit={handleSubmit} noValidate>
      <div ref={errorSummaryRef} tabIndex={-1}>
        {hasFieldErrors && (
          <Alert tone="danger" title="Revise os campos destacados">
            Não foi possível criar a fatura porque há campos inválidos.
          </Alert>
        )}
        {mutation.error !== null && (
          <Alert tone="danger" title="Falha ao criar a fatura">
            {mutation.error.displayMessage}
          </Alert>
        )}
      </div>

      <div className="erg-form__row erg-form__row--two">
        <SelectField
          label="Moeda"
          required
          value={currency}
          options={CURRENCY_OPTIONS}
          onChange={(event) => setCurrency(event.target.value as Currency)}
        />
        <TextField
          label="Vencimento"
          type="date"
          required
          value={dueDate}
          error={errors.dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      <fieldset className="erg-fieldset">
        <legend className="erg-fieldset__legend">Itens da fatura</legend>
        <div className="erg-form__rows">
          {items.map((item, index) => {
            const itemErrors = errors.items[item.key] ?? {};
            return (
              <div className="erg-line-item" key={item.key}>
                <TextField
                  label={`Descrição do item ${index + 1}`}
                  required
                  value={item.description}
                  error={itemErrors.description}
                  onChange={(event) => updateItem(item.key, { description: event.target.value })}
                />
                <TextField
                  label="Quantidade"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={item.quantity}
                  error={itemErrors.quantity}
                  onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                />
                <TextField
                  label="Valor unitário"
                  inputMode="decimal"
                  placeholder="49,90"
                  required
                  value={item.unitPrice}
                  error={itemErrors.unitPrice}
                  onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })}
                />
                <Button
                  variant="ghost"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((current) => current.filter((candidate) => candidate.key !== item.key))
                  }
                >
                  Remover
                  <span className="visually-hidden"> item {index + 1}</span>
                </Button>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 'var(--space-4)' }}>
          <Button onClick={() => setItems((current) => [...current, emptyItem()])}>
            Adicionar item
          </Button>
        </p>
      </fieldset>

      <div className="erg-button__row" style={{ justifyContent: 'space-between' }}>
        <p>
          <span className="erg-field__hint">Total</span>
          <br />
          <strong style={{ fontSize: '1.25rem' }}>{formatMoney(parsedTotal, currency)}</strong>
        </p>
        <Button type="submit" variant="primary" loading={mutation.submitting}>
          Criar fatura
        </Button>
      </div>
    </form>
  );
}
