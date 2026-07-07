import { useState, useCallback, useRef } from 'react';
import api from '../services/api';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

/**
 * Generic data-fetching hook with loading/error states.
 */
export function useApi<T>(options?: UseApiOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const request = useCallback(async (method: string, url: string, body?: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.request({ method, url, data: body });
      const result = res.data.data ?? res.data;
      setData(result);
      optionsRef.current?.onSuccess?.(result);
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Something went wrong';
      setError(msg);
      optionsRef.current?.onError?.(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((url: string) => request('GET', url), [request]);
  const post = useCallback((url: string, body: unknown) => request('POST', url, body), [request]);
  const put = useCallback((url: string, body: unknown) => request('PUT', url, body), [request]);
  const del = useCallback((url: string) => request('DELETE', url), [request]);

  return { data, loading, error, get, post, put, del, setData };
}
