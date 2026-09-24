import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

/** Load data from a GET endpoint with loading/error state. Optional polling (ms). */
export function useApi(path, { poll, skip } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const mounted = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!path || skip) return;
    if (!quiet) setLoading(true);
    try {
      const result = await api.get(path);
      if (mounted.current) { setData(result); setError(null); }
    } catch (err) {
      if (mounted.current) setError(err);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [path, skip]);

  useEffect(() => {
    mounted.current = true;
    load();
    if (!poll) return () => { mounted.current = false; };
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, poll);
    return () => { mounted.current = false; clearInterval(id); };
  }, [load, poll]);

  return { data, error, loading, reload: load, setData };
}
