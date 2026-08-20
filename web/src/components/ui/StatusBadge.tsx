import type { Tone } from '../../lib/format';

interface StatusBadgeProps {
  tone: Tone;
  /** Texto sempre visível: a cor reforça, nunca substitui, o significado. */
  label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return <span className={`erg-badge erg-badge--${tone}`}>{label}</span>;
}
