import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextField } from '../Field';

describe('TextField', () => {
  it('associa o rótulo ao controle', () => {
    render(<TextField label="Valor a estornar" defaultValue="" />);

    expect(screen.getByLabelText('Valor a estornar')).toBeInTheDocument();
  });

  it('expõe a dica ao leitor de tela via aria-describedby', () => {
    render(<TextField label="Valor" hint="Deixe vazio para estornar tudo." defaultValue="" />);

    expect(screen.getByLabelText('Valor')).toHaveAccessibleDescription(
      'Deixe vazio para estornar tudo.',
    );
  });

  it('marca aria-invalid e descreve o erro quando inválido', () => {
    render(<TextField label="Valor" error="Informe um valor como 49,90." defaultValue="" />);

    const input = screen.getByLabelText('Valor');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe um valor como 49,90.');
  });

  it('anuncia obrigatoriedade sem depender só do asterisco visual', () => {
    render(<TextField label="Motivo" required defaultValue="" />);

    expect(screen.getByLabelText(/Motivo.*\(obrigatório\)/s)).toBeRequired();
  });
});
