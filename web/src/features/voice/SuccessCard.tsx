import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  formatMoney,
} from '../../lib/format';
import type { Currency, PaymentMethod, PaymentStatus } from '../../types/api';

interface SuccessCardProps {
  payerName: string;
  amountInCents: number;
  currency: Currency;
  method: PaymentMethod;
  paymentStatus: PaymentStatus;
  onNewCharge: () => void;
}

/** Card de confirmação. Sem lógica: só apresenta o que recebeu por props. */
export function SuccessCard({
  payerName,
  amountInCents,
  currency,
  method,
  paymentStatus,
  onNewCharge,
}: SuccessCardProps) {
  return (
    <div className="erg-success-card">
      <div className="erg-success-card__header">
        <h3 className="erg-success-card__title">Cobrança registrada</h3>
        <StatusBadge
          tone={PAYMENT_STATUS_TONE[paymentStatus]}
          label={PAYMENT_STATUS_LABEL[paymentStatus]}
        />
      </div>

      <p className="erg-success-card__amount">{formatMoney(amountInCents, currency)}</p>

      <dl className="erg-details">
        <dt className="erg-details__term">Pagador</dt>
        <dd className="erg-details__value">{payerName}</dd>

        <dt className="erg-details__term">Forma de pagamento</dt>
        <dd className="erg-details__value">{PAYMENT_METHOD_LABEL[method]}</dd>
      </dl>

      {/*
        Espaço do QR Code. O gateway simulado não emite payload de cobrança;
        quando o adaptador real entrar, a imagem ocupa exatamente esta caixa.
      */}
      <figure className="erg-success-card__qr">
        <div className="erg-qr-placeholder" role="img" aria-label="QR Code indisponível">
          <span aria-hidden="true">QR</span>
        </div>
        <figcaption className="erg-success-card__qr-caption">
          O QR Code aparece aqui quando um gateway real estiver configurado.
        </figcaption>
      </figure>

      <Button variant="primary" onClick={onNewCharge}>
        Nova cobrança
      </Button>
    </div>
  );
}
