import { useCallback, useState } from 'react';

const PREFIX = 'biomeSimulator.tab.';

/**
 * Like useState for a tab value, but reads from and writes to localStorage so
 * the active tab survives page reloads and is shared across component remounts.
 *
 * @param {string} key         Unique tab namespace (no prefix needed).
 * @param {string[]} valid     List of valid tab values used to validate the stored value.
 * @param {string} defaultValue Fallback used when nothing is stored or the stored value is stale.
 * @returns {[string, (tab: string) => void]}
 */
export function usePersistedTab(key, valid, defaultValue) {
  const [tab, setTabState] = useState(() => {
    try {
      const raw = window.localStorage?.getItem(PREFIX + key);
      return raw && valid.includes(raw) ? raw : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setTab = useCallback((next) => {
    try {
      window.localStorage?.setItem(PREFIX + key, next);
    } catch { /* ignore storage errors */ }
    setTabState(next);
  }, [key]);

  return [tab, setTab];
}
