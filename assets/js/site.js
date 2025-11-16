(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function initNavigationButtons() {
    var buttons = document.querySelectorAll('[data-navigate]');
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-navigate');
        if (target) {
          window.location.href = target;
        }
      });
    });
  }

  function initStepReveal() {
    var steps = document.querySelectorAll('.lit-steps .lit-step');
    if (!steps.length) {
      return;
    }
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      steps.forEach(function (step) {
        step.classList.add('in-view');
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });
    steps.forEach(function (step) { observer.observe(step); });
  }

  function initCookieConsent() {
    var banner = document.getElementById('cookie-banner');
    var storageKey = 'ga_consent_choice_v1';

    function setConsent(allow) {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
          'analytics_storage': allow ? 'granted' : 'denied',
          'ad_storage': 'denied',
          'ad_user_data': 'denied',
          'ad_personalization': 'denied'
        });
      }
    }

    if (!banner) {
      var stored = localStorage.getItem(storageKey);
      if (stored) {
        setConsent(stored === 'accept');
      }
      return;
    }

    var saved = localStorage.getItem(storageKey);
    if (saved) {
      banner.style.display = 'none';
      setConsent(saved === 'accept');
    } else {
      banner.style.display = 'block';
    }

    var acceptBtn = document.getElementById('cookie-accept');
    var declineBtn = document.getElementById('cookie-decline');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        localStorage.setItem(storageKey, 'accept');
        setConsent(true);
        banner.remove();
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'page_view');
        }
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        localStorage.setItem(storageKey, 'decline');
        setConsent(false);
        banner.remove();
      });
    }
  }

  function initContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) {
      return;
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var name = (data.get('name') || '').trim() || 'Portfolio visitor';
      var email = (data.get('email') || '').trim();
      var title = (data.get('title') || '').trim() || 'Project inquiry';
      var topic = data.get('topic') || 'Project Proposal';
      var message = (data.get('message') || '').trim();
      var countryCode = (data.get('countryCode') || '').trim();
      var phone = (data.get('phone') || '').trim();
      var subject = [topic, title].filter(Boolean).join(', ');
      var formattedPhone = phone ? [countryCode, phone].filter(Boolean).join(' ') : '';
      var body = [
        'Name: ' + name,
        email ? 'Email: ' + email : null,
        formattedPhone ? 'Phone: ' + formattedPhone : null,
        'Topic: ' + topic,
        'Title: ' + title,
        '',
        message
      ].filter(Boolean).join('\n');
      var mailto = 'mailto:bramapeters@outlook.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.location.href = mailto;
    });
  }

  function initImageModal() {
    var modal = document.getElementById('imageModal');
    var modalImg = document.getElementById('modalImg');
    var triggers = document.querySelectorAll('.popup-trigger');
    if (!modal || !modalImg || !triggers.length) {
      return;
    }
    var closeBtn = modal.querySelector('.modal-close');

    modal.style.visibility = 'hidden';

    function closeModal() {
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var source = trigger.getAttribute('data-full') || trigger.getAttribute('src');
        if (source) {
          modalImg.src = source;
        }
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    });
  }

  ready(function () {
    initNavigationButtons();
    initStepReveal();
    initCookieConsent();
    initContactForm();
    initImageModal();
  });
})();
