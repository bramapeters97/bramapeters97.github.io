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
