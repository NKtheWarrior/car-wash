"use client";

import { useCallback, useEffect } from "react";
import { API_URL, getToken } from "../../../lib/admin";

/**
 * Runs `fn` immediately, every 5s, and whenever one of the named admin SSE
 * events fires. Shared by every admin page (was a private helper in the old
 * single-page dashboard).
 */
export function useAutoRefresh(fn: () => void, deps: unknown[], sseEvents: string[] = []) {
  const stable = useCallback(fn, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    stable();
    const poll = setInterval(stable, 5000);
    const es = new EventSource(`${API_URL}/admin/stream?token=${getToken()}`);
    for (const ev of sseEvents) es.addEventListener(ev, () => stable());
    return () => {
      clearInterval(poll);
      es.close();
    };
  }, [stable]); // eslint-disable-line react-hooks/exhaustive-deps
}
