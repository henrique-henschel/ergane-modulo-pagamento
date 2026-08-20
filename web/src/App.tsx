import { Route, Routes } from 'react-router-dom';
import { CustomerSwitcher } from './components/CustomerSwitcher';
import { CustomerProvider } from './context/CustomerContext';
import { DashboardPage } from './pages/DashboardPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';

function NotFoundPage() {
  return (
    <section className="erg-card">
      <h2 className="erg-card__title">Página não encontrada</h2>
      <p>O endereço acessado não corresponde a nenhuma tela do console.</p>
    </section>
  );
}

export function App() {
  return (
    <CustomerProvider>
      <a className="erg-skip-link" href="#conteudo">
        Pular para o conteúdo principal
      </a>

      <div className="erg-app">
        <header className="erg-header">
          <div className="erg-header__inner">
            <div className="erg-header__brand">
              <h1 className="erg-header__title">Ergane · Pagamentos</h1>
              <p className="erg-header__subtitle">
                Faturas, cobranças e estornos do módulo de pagamentos
              </p>
            </div>
            <CustomerSwitcher />
          </div>
        </header>

        <main className="erg-main" id="conteudo" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pagamentos/:paymentId" element={<PaymentDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="erg-footer">
          <p>
            Ambiente de desenvolvimento: gateway simulado e dados em memória. Reiniciar o
            servidor limpa faturas e cobranças.
          </p>
        </footer>
      </div>
    </CustomerProvider>
  );
}
