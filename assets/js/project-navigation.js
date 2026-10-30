(() => {
  const navigation = document.querySelector('[data-project-navigation]');
  if (!navigation) return;
  const toggle = navigation.querySelector('.project-nav-toggle');
  const panel = navigation.querySelector('.project-nav-panel');
  const more = navigation.querySelector('.project-nav-more');
  const compact = window.matchMedia('(max-width: 1199px)');
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
  navigation.setAttribute('data-nav-ready', '');

  function setExpanded(expanded) {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Close navigation menu' : 'Open navigation menu');
    panel.hidden = compact.matches && !expanded;
    more.open = compact.matches && expanded;
  }
  toggle.addEventListener('click', () => setExpanded(toggle.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (compact.matches && event.target.closest('a')) setExpanded(false);
  });
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target)) setExpanded(false);
  });
  navigation.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (compact.matches && toggle.getAttribute('aria-expanded') === 'true') {
      setExpanded(false);
      toggle.focus();
    } else if (more.open) {
      more.open = false;
      more.querySelector('summary').focus();
    }
  });
  more.addEventListener('pointerenter', () => {
    if (!compact.matches && hover.matches) more.open = true;
  });
  more.addEventListener('pointerleave', () => {
    if (!compact.matches && !more.contains(document.activeElement)) more.open = false;
  });
  more.addEventListener('focusout', () => {
    window.setTimeout(() => {
      if (!compact.matches && !more.contains(document.activeElement)) more.open = false;
    }, 0);
  });
  const sync = () => setExpanded(false);
  if (compact.addEventListener) compact.addEventListener('change', sync);
  else compact.addListener(sync);
  sync();
})();
