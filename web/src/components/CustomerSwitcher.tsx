import { Button } from './ui/Button';
import { useCustomer } from '../context/CustomerContext';

/**
 * Enquanto não há autenticação, o console precisa de um cliente para escopar as
 * consultas. Trocar de cliente aqui equivale a trocar de sessão.
 */
export function CustomerSwitcher() {
  const { customerId, regenerate } = useCustomer();

  return (
    <div className="erg-customer">
      <span className="erg-field__hint" id="rotulo-cliente">
        Cliente
      </span>
      <code className="erg-customer__id" aria-labelledby="rotulo-cliente">
        {customerId}
      </code>
      <Button variant="ghost" onClick={regenerate}>
        Trocar de cliente
      </Button>
    </div>
  );
}
