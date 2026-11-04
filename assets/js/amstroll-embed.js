(() => {
  const panel = document.getElementById('amstroll-prototype-view');
  if (!panel) return;
  const controls = panel.querySelector('.case-prototype-controls');
  const toggle = panel.querySelector('.case-prototype-toggle');
  const label = toggle.querySelector('span');
  const icon = toggle.querySelector('i');
  const mobile = window.matchMedia('(max-width: 767px)');
  const supported = typeof panel.showModal === 'function' && typeof panel.show === 'function';
  let expanded = false;
  let priorFocus;
  let scrollPosition = 0;
  let priorStyles;

  function lockPage() {
    scrollPosition = window.scrollY;
    priorStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
      rootOverflow: document.documentElement.style.overflow,
    };
    document.documentElement.style.overflow = 'hidden';
    Object.assign(document.body.style, { position: 'fixed', top: `-${scrollPosition}px`, width: '100%', overflow: 'hidden' });
  }

  function unlockPage() {
    if (!priorStyles) return;
    document.documentElement.style.overflow = priorStyles.rootOverflow;
    for (const property of ['position', 'top', 'width', 'overflow']) document.body.style[property] = priorStyles[property];
    window.scrollTo(0, scrollPosition);
    priorStyles = null;
  }

  function minimize(restoreFocus = true) {
    if (!expanded) return;
    expanded = false;
    panel.close();
    panel.classList.remove('is-expanded');
    panel.setAttribute('role', 'region');
    panel.removeAttribute('aria-modal');
    panel.show();
    toggle.setAttribute('aria-expanded', 'false');
    label.textContent = 'Full screen';
    icon.className = 'fa-solid fa-expand';
    unlockPage();
    if (restoreFocus && priorFocus?.isConnected) priorFocus.focus({ preventScroll: true });
  }

  function expand() {
    if (!mobile.matches || !supported || expanded) return;
    priorFocus = document.activeElement;
    lockPage();
    panel.close();
    panel.classList.add('is-expanded');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    expanded = true;
    try {
      panel.showModal();
    } catch {
      minimize();
      return;
    }
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Minimize';
    icon.className = 'fa-solid fa-compress';
    toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => expanded ? minimize() : expand());
  panel.addEventListener('cancel', event => {
    if (!expanded) return;
    event.preventDefault();
    minimize();
  });
  panel.addEventListener('close', () => {
    if (expanded && !panel.open) minimize();
  });

  function syncMobile() {
    const leavingFullScreen = expanded && !mobile.matches;
    if (leavingFullScreen) minimize(false);
    controls.hidden = !mobile.matches || !supported;
    if (leavingFullScreen) document.querySelector('#prototype .publication-btn[href]')?.focus({ preventScroll: true });
  }
  if (mobile.addEventListener) mobile.addEventListener('change', syncMobile);
  else mobile.addListener(syncMobile);
  syncMobile();
})();
