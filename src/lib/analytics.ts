// Thin wrapper over GoatCounter's event API (loaded via the count.js tag in
// index.html). Events show up in the dashboard as their own "paths" you can
// filter on. The script loads async, so window.goatcounter may be undefined
// for the first moment after page load — guard every call.

interface GoatCounter {
  count: (vars: { path: string; title?: string; event?: boolean }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

export function trackEvent(path: string, title?: string) {
  window.goatcounter?.count({ path, title, event: true });
}
