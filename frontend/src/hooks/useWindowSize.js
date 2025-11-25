/**
 * useWindowSize Hook
 *
 * Tracks window dimensions with SSR-safe initialization.
 * Returns undefined during SSR, updates after mount and on resize.
 *
 * @returns {{ width: number | undefined, height: number | undefined }}
 *
 * @example
 * const { width, height } = useWindowSize();
 * const isMobile = width && width < 768;
 */

import { useState, useEffect } from "react";

export default function useWindowSize() {
  const [size, setSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Set size at the beginning
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
