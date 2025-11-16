(function () {
  const selectors = [
    '.card',
    '.portfolio-card',
    '.skill-glass-card'
  ];

  const nodes = selectors
    .map(selector => Array.from(document.querySelectorAll(selector)))
    .reduce((acc, list) => acc.concat(list), [])
    .filter((element, index, array) => array.indexOf(element) === index);

  if (!nodes.length) {
    return;
  }

  document.body.classList.add('motion-ready');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  nodes.forEach((node, index) => {
    node.classList.add('motion-fade-up');
    node.style.setProperty('--motion-stagger', `${Math.min(index * 60, 360)}ms`);
  });

  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    nodes.forEach(node => node.classList.add('motion-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('motion-visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  });

  nodes.forEach(node => observer.observe(node));
})();

(function () {
  const cards = document.querySelectorAll('.portfolio-card');
  if (!cards.length) return;

  cards.forEach((card, index) => {
    card.style.setProperty('--card-mobile-order', index);
  });

  const mq = window.matchMedia('(max-width: 600px)');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const toggleMobileClass = () => {
    const shouldAnimate = mq.matches && !prefersReduced.matches;
    document.body.classList.toggle('mobile-card-ready', shouldAnimate);
  };

  if ('addEventListener' in mq) {
    mq.addEventListener('change', toggleMobileClass);
  } else if ('addListener' in mq) {
    mq.addListener(toggleMobileClass);
  }

  if ('addEventListener' in prefersReduced) {
    prefersReduced.addEventListener('change', toggleMobileClass);
  } else if ('addListener' in prefersReduced) {
    prefersReduced.addListener(toggleMobileClass);
  }

  toggleMobileClass();
})();

(function () {
  const filterBar = document.querySelector('[data-portfolio-filter]');
  if (!filterBar) return;

  const buttons = Array.from(filterBar.querySelectorAll('button'));
  const cards = Array.from(document.querySelectorAll('.portfolio-grid .portfolio-card'));

  const applyFilter = (category) => {
    cards.forEach(card => {
      const categories = card.dataset.categories || '';
      const matches = category === 'all' || categories.split(',').map(str => str.trim()).includes(category);
      card.classList.toggle('is-hidden', !matches);
    });
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      if (button.classList.contains('is-active')) return;

      buttons.forEach(btn => {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-pressed', 'false');
      });

      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
      applyFilter(button.dataset.filter || 'all');
    });
  });

  applyFilter('all');
})();
