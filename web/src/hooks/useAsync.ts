import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/apiClient';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Executa uma consulta e reexecuta quando `deps` muda. Descarta respostas de
 * requisições superadas, evitando que uma resposta lenta sobrescreva a atual.
 */
export function useQuery<T>(
  fetcher: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current()
      .then((data) => {
        if (current) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!current) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', String(error)),
        });
      });

    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { ...state, reload };
}

export interface MutationState {
  submitting: boolean;
  error: ApiError | null;
}

/**
 * Envolve uma ação de escrita, centralizando estado de envio e tradução do erro.
 * Devolve o resultado da ação, ou `null` quando ela falhou — nesse caso o erro
 * fica em `error`. A ação é executada uma única vez por chamada: repetir a
 * requisição para inspecionar o erro geraria cobrança duplicada.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): MutationState & { run: (...args: TArgs) => Promise<TResult | null>; reset: () => void } {
  const [state, setState] = useState<MutationState>({ submitting: false, error: null });

  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args: TArgs): Promise<TResult | null> => {
    setState({ submitting: true, error: null });
    try {
      const result = await actionRef.current(...args);
      setState({ submitting: false, error: null });
      return result;
    } catch (error: unknown) {
      setState({
        submitting: false,
        error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', String(error)),
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ submitting: false, error: null });
  }, []);

  return { ...state, run, reset };
}
