import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'ergane.pagamentos.customerId';

interface CustomerContextValue {
  customerId: string;
  setCustomerId: (id: string) => void;
  regenerate: () => void;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

function readStoredCustomerId(): string {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored !== null && stored !== '') return stored;

  const generated = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

/**
 * Identidade do cliente em uso pelo console.
 *
 * Provisório: enquanto o módulo não tem autenticação, o back-end usa
 * `customerId` como escopo das consultas. Quando houver login, este provider é
 * o único ponto a trocar — passa a ler o id da sessão autenticada.
 */
export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customerId, setCustomerIdState] = useState<string>(readStoredCustomerId);

  const setCustomerId = useCallback((id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setCustomerIdState(id);
  }, []);

  const regenerate = useCallback(() => {
    setCustomerId(crypto.randomUUID());
  }, [setCustomerId]);

  const value = useMemo(
    () => ({ customerId, setCustomerId, regenerate }),
    [customerId, setCustomerId, regenerate],
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer(): CustomerContextValue {
  const context = useContext(CustomerContext);
  if (context === null) {
    throw new Error('useCustomer precisa estar dentro de <CustomerProvider>.');
  }
  return context;
}
