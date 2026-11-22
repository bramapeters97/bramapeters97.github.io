const frame = document.querySelector('.honeymoon-demo-frame');
let observer;
let navigation;

function showFrameStart() {
  if (frame.getBoundingClientRect().top < 0) {
    frame.scrollIntoView({ block: 'start' });
  }
}

function fitDemo() {
  observer?.disconnect();
  navigation?.abort();

  const document = frame.contentDocument;
  if (!document?.body || document.URL === 'about:blank') return;

  document.body.classList.add('embedded-demo');
  navigation = new AbortController();
  frame.contentWindow.addEventListener('hashchange', showFrameStart, { signal: navigation.signal });

  const resize = () => {
    const height = Math.ceil(document.body.getBoundingClientRect().height) + 2;
    if (height > 2) frame.style.height = `${height}px`;
  };
  observer = new ResizeObserver(resize);
  observer.observe(document.body);
  resize();
}

frame.addEventListener('load', fitDemo);
fitDemo();
