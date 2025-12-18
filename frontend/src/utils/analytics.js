export function trackEvent(name, props = {}) {
  try {
    if (window && window.dataLayer && typeof window.dataLayer.push === 'function') {
      window.dataLayer.push({ event: name, ...props });
    } else if (window && window.gtag) {
      window.gtag('event', name, props);
    } else {
      // Fallback: no-op or console for dev
      // console.debug('[trackEvent]', name, props);
    }
  } catch (e) {
    // swallow
  }
}
