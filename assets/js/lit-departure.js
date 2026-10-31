(() => {
  const duration = 1000;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let overlay;
  let navigationTimer = null;

  function reset() {
    window.clearTimeout(navigationTimer);
    navigationTimer = null;
    overlay?.remove();
    overlay = null;
  }

  // Bubble after existing link/card handlers and respect cancelled navigation.
  window.addEventListener('click', event => {
    if (event.defaultPrevented || !event.cancelable || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download')) return;
    const target = link.getAttribute('target') || document.querySelector('base[target]')?.getAttribute('target');
    if (target && target.toLowerCase() !== '_self') return;

    // Keep the original resolved href, including its path, query, and fragment.
    const destination = link.href;
    let url;
    try {
      url = new URL(destination, document.baseURI);
    } catch {
      return;
    }
    if (!['http:', 'https:'].includes(url.protocol) ||
        !['lostintranslation.nl', 'www.lostintranslation.nl'].includes(url.hostname)) return;

    if (navigationTimer !== null) {
      event.preventDefault();
      return;
    }
    if (reducedMotion.matches) return;

    event.preventDefault();
    // Account for dispatch work: animation and navigation share the click's deadline.
    const elapsed = Math.max(0, performance.now() - event.timeStamp);
    overlay = document.createElement('div');
    overlay.className = 'lit-departure';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.animationDelay = `${-elapsed}ms`;
    document.body.appendChild(overlay);
    navigationTimer = window.setTimeout(() => {
      window.location.assign(destination);
    }, Math.max(0, duration - elapsed));
  });

  // Clear pending departures and cached black frames when leaving or returning.
  window.addEventListener('pagehide', reset);
  window.addEventListener('pageshow', reset);
})();
