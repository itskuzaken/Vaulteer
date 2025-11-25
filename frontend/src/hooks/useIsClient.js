/**
 * useIsClient Hook
 *
 * Safely detects if code is running on the client (browser) vs server (SSR).
 * Prevents hydration mismatches by returning false during SSR, then true after mount.
 *
 * @returns {boolean} - true if running in browser, false during SSR
 *
 * @example
 * const isClient = useIsClient();
 * const width = isClient ? window.innerWidth : 0;
 */

import { useEffect, useState } from "react";

export default function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
