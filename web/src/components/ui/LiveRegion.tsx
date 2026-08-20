interface LiveRegionProps {
  /** Mensagem anunciada a leitores de tela sem roubar o foco do usuário. */
  message: string;
}

/**
 * Região viva permanente no DOM. O elemento precisa existir antes da mensagem
 * chegar, senão parte dos leitores de tela não anuncia a mudança.
 */
export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
