(() => {
  'use strict';
  const preview = document.getElementById('mypremiereplus-preview');
  const trigger = document.querySelector('#project-mypremiereplus .project-image-trigger');
  if (!preview || !trigger) return;
  const scene = preview.querySelector('.project-image-scene');
  const image = scene.querySelector('img');
  const status = preview.querySelector('[role="status"]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let dispose = null;
  let retryOnOpen = false;

  trigger.addEventListener('click', () => {
    if (preview.open) return;
    const savedScroll = { x: window.scrollX, y: window.scrollY };
    preview.showModal();
    const scope = new AbortController();
    const options = { signal: scope.signal };
    const bodyStyle = document.body.style;
    const savedBody = Object.fromEntries(['position', 'top', 'left', 'width'].map(key => [key, bodyStyle[key]]));
    const savedOverflow = document.documentElement.style.overflow;
    Object.assign(bodyStyle, { position: 'fixed', top: `${-savedScroll.y}px`, left: `${-savedScroll.x}px`, width: '100%' });
    document.documentElement.style.overflow = 'hidden';

    let frame = 0;
    let geometry;
    let startedAt = null;
    let pausedAt = null;
    let progress = 0;
    let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
    let previousTime = null;
    preview.removeAttribute('data-ready');
    status.hidden = false;
    status.textContent = 'Loading preview…';

    function schedule() {
      if (!frame && preview.open && geometry && !document.hidden && !reduced.matches) {
        preview.setAttribute('data-moving', '');
        frame = window.requestAnimationFrame(animate);
      }
    }

    function paint() {
      if (!geometry) return;
      const { width, height, imageWidth, imageHeight, guard } = geometry;
      // At t=0 the left side is visible; the photograph translates left to reveal its right side.
      const x = reduced.matches ? (width - imageWidth) / 2
        : -guard - (imageWidth - width - guard * 2) * progress + pointerX;
      const y = (height - imageHeight) / 2 + (reduced.matches ? 0 : pointerY);
      // A slight forward plane provides depth without tilting or stretching the photograph.
      image.style.transform = `translate3d(${x}px, ${y}px, ${reduced.matches ? 0 : 6}px)`;
    }

    function animate(now) {
      frame = 0;
      if (!preview.open || !geometry || document.hidden || reduced.matches) return;
      if (startedAt === null) startedAt = now;
      const duration = geometry.width < geometry.height ? 28000 : 22000;
      const time = Math.min(1, Math.max(0, (now - startedAt) / duration));
      progress = (1 - Math.cos(Math.PI * time)) / 2;
      const smoothing = 1 - Math.exp(-Math.min(64, previousTime === null ? 16 : now - previousTime) / 140);
      previousTime = now;
      pointerX += (targetX - pointerX) * smoothing;
      pointerY += (targetY - pointerY) * smoothing;
      paint();
      if (time < 1 || Math.abs(targetX - pointerX) > .02 || Math.abs(targetY - pointerY) > .02) schedule();
      else preview.removeAttribute('data-moving');
    }

    function measure() {
      if (!preview.open || !image.naturalWidth) return;
      // Read layout only when opening/loading/resizing, never in an animation frame.
      const width = scene.clientWidth;
      const height = scene.clientHeight;
      if (!width || !height) return;
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * (reduced.matches ? 1 : 1.09);
      geometry = { width, height, imageWidth: image.naturalWidth * scale, imageHeight: image.naturalHeight * scale,
        guard: Math.max(12, Math.min(width, height) * .018) };
      image.style.width = `${geometry.imageWidth}px`;
      image.style.height = `${geometry.imageHeight}px`;
      paint();
      preview.setAttribute('data-ready', '');
      status.hidden = true;
      schedule();
    }

    function fail() {
      retryOnOpen = true;
      window.cancelAnimationFrame(frame);
      frame = 0;
      geometry = null;
      preview.removeAttribute('data-ready');
      preview.removeAttribute('data-moving');
      status.textContent = 'The preview could not load. Close it and try again.';
      status.hidden = false;
    }

    image.addEventListener('load', measure, options);
    image.addEventListener('error', fail, options);
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    window.visualViewport?.addEventListener('resize', measure, options);
    preview.addEventListener('pointermove', event => {
      if (!finePointer.matches || reduced.matches || !geometry || event.pointerType === 'touch') return;
      targetX = (event.clientX / geometry.width - .5) * Math.min(20, geometry.width * .012);
      targetY = (event.clientY / geometry.height - .5) * Math.min(16, geometry.height * .012);
      schedule();
    }, options);
    preview.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; schedule(); }, options);
    reduced.addEventListener('change', () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      startedAt = null;
      progress = 0;
      targetX = targetY = pointerX = pointerY = 0;
      preview.removeAttribute('data-moving');
      measure();
    }, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pausedAt = performance.now();
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        if (startedAt !== null && pausedAt !== null) startedAt += performance.now() - pausedAt;
        pausedAt = null;
        previousTime = null;
        schedule();
      }
    }, options);

    dispose = () => {
      scope.abort();
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      preview.removeAttribute('data-moving');
      Object.assign(bodyStyle, savedBody);
      document.documentElement.style.overflow = savedOverflow;
      window.scrollTo({ left: savedScroll.x, top: savedScroll.y, behavior: 'instant' });
      trigger.focus({ preventScroll: true });
      dispose = null;
    };
    image.loading = 'eager';
    if (retryOnOpen) {
      retryOnOpen = false;
      image.src = image.getAttribute('src');
    } else if (image.complete) image.naturalWidth ? measure() : fail();
  });
  function closePreview() {
    preview.close();
    // Restore synchronously: the native close event can arrive on a later frame.
    if (dispose) dispose();
  }
  preview.querySelector('.project-image-close').addEventListener('click', closePreview);
  preview.addEventListener('cancel', event => { event.preventDefault(); closePreview(); });
  preview.addEventListener('close', () => { if (!preview.open && dispose) dispose(); });
})();
