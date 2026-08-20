import { Alert } from '../../components/ui/Alert';
import { LiveRegion } from '../../components/ui/LiveRegion';
import { useCustomer } from '../../context/CustomerContext';
import { useVoiceBilling } from '../../hooks/useVoiceBilling';
import { SuccessCard } from './SuccessCard';
import { VoiceRecordButton } from './VoiceRecordButton';

interface VoiceBillingPanelProps {
  /** Disparado após uma cobrança concluída, para as listas se atualizarem. */
  onCharged: () => void;
}

/**
 * Liga o hook aos componentes de apresentação. É o único ponto do fluxo de voz
 * que decide *o que* renderizar; o botão e o card apenas exibem props.
 */
export function VoiceBillingPanel({ onCharged }: VoiceBillingPanelProps) {
  const { customerId } = useCustomer();
  const voice = useVoiceBilling(customerId);

  function handleNewCharge() {
    voice.reset();
    onCharged();
  }

  return (
    <section className="erg-card" aria-labelledby="titulo-voz">
      <div className="erg-card__header">
        <h2 className="erg-card__title" id="titulo-voz">
          Cobrança por voz
        </h2>
        <p className="erg-card__hint">Interpretada pelo Gemini, no servidor.</p>
      </div>

      <LiveRegion
        message={
          voice.state === 'recording'
            ? 'Ouvindo.'
            : voice.state === 'processing'
              ? 'Registrando cobrança.'
              : voice.state === 'success' && voice.charge !== null
                ? `Cobrança de ${voice.charge.payerName} registrada.`
                : ''
        }
      />

      {!voice.supported && (
        <Alert tone="warning" title="Voz indisponível neste navegador">
          O reconhecimento de fala exige um navegador baseado em Chromium. As demais
          formas de cobrança continuam funcionando normalmente.
        </Alert>
      )}

      {voice.transcript !== '' && voice.state !== 'success' && (
        <p className="erg-voice__transcript">
          <span className="erg-field__hint">Ouvi:</span> “{voice.transcript}”
        </p>
      )}

      {voice.state === 'error' && voice.message !== '' && (
        <Alert tone="danger" title="Não deu para cobrar">
          {voice.message}
        </Alert>
      )}

      {/* Sucesso desmonta o fluxo de escuta e dá lugar ao card, como no spec. */}
      {voice.state === 'success' && voice.charge !== null ? (
        <SuccessCard
          payerName={voice.charge.payerName}
          amountInCents={voice.charge.amountInCents}
          currency={voice.charge.currency}
          method={voice.charge.method}
          paymentStatus={voice.charge.paymentStatus}
          onNewCharge={handleNewCharge}
        />
      ) : (
        <VoiceRecordButton
          state={voice.state}
          onStart={voice.start}
          onStop={voice.stop}
          disabled={!voice.supported}
        />
      )}
    </section>
  );
}
