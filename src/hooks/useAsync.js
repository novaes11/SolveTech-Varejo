import { useState, useEffect, useCallback } from 'react';

export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:data-updated'));
  }
}

export function useAsync(fn, deps = [], { listen = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);
  const refetch = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(fn())
      .then(res => { if (active) { setData(res); setError(null); } })
      .catch(err => { if (active) setError(err); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  useEffect(() => {
    if (!listen) return;
    const handler = () => setNonce(n => n + 1);
    window.addEventListener('app:data-updated', handler);
    return () => window.removeEventListener('app:data-updated', handler);
  }, [listen]);

  return { data, loading, error, refetch, setData };
}