export function trackEvent(name, props = {}) {
  try {
    // Reuse global analytics utility if available
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({ event: name, ...props });
    }
  } catch (e) {
    // swallow
  }
}
