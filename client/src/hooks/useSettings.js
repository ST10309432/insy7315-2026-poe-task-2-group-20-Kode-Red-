import { useApi } from './useApi';

const DEFAULTS = { serviceFee: 2, randsPerPoint: 10, pointValue: 0.5, freeMealEvery: 10, freeMealCap: 60 };

/** Public shop settings (service fee, loyalty rules), with safe defaults while loading. */
export function useSettings() {
  const { data } = useApi('/settings/public');
  return data || DEFAULTS;
}
