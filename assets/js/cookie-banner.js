(function () {
  const key = 'ga_consent_choice_v1';
  const bannerId = 'cookie-banner';

  function setConsent(allow) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: allow ? 'granted' : 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  }

  function buildBanner() {
    const banner = document.createElement('div');
    banner.id = bannerId;
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie consent');

    banner.innerHTML = `
      <div class="cookie-card">
        <div class="cookie-title">🍪Cookies</div>
        <div class="cookie-copy">
          We use cookies for basic site and analytics features (Google Analytics) to understand how visitors use the site
          (e.g., portfolio items visited, time on site, and interactions). We use these insights to improve the website and
          understand (anonymous) user interest, <strong>never</strong> to sell any personal data.
        </div>
        <div class="cookie-actions">
          <button class="cookie-btn cookie-accept" id="cookie-accept" type="button">Accept</button>
          <button class="cookie-btn cookie-decline" id="cookie-decline" type="button">Not Accept</button>
        </div>
      </div>
    `;

    return banner;
  }

  function mountBanner() {
    if (document.getElementById(bannerId)) return;

    const saved = sessionStorage.getItem(key);
    if (saved) {
      setConsent(saved === 'accept');
      return;
    }

    const banner = buildBanner();
    document.body.appendChild(banner);

    const acceptBtn = banner.querySelector('#cookie-accept');
    const declineBtn = banner.querySelector('#cookie-decline');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        sessionStorage.setItem(key, 'accept');
        setConsent(true);
        banner.remove();
        if (typeof gtag === 'function') gtag('event', 'page_view');
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        sessionStorage.setItem(key, 'decline');
        setConsent(false);
        banner.remove();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountBanner);
  } else {
    mountBanner();
  }
})();
