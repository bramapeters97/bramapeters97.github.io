const demoWindow = document.querySelector('.honeymoon-demo-window');
const frame = demoWindow.querySelector('iframe');
let observer;
let navigation;

function showFrameStart() {
  if (demoWindow.getBoundingClientRect().top < 0) {
    demoWindow.scrollIntoView({ block: 'start' });
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
    const height = Math.ceil(document.body.getBoundingClientRect().height) + 1;
    if (height > 2) frame.style.height = `${height}px`;
  };
  observer = new ResizeObserver(resize);
  observer.observe(document.body);
  resize();
}

frame.addEventListener('load', fitDemo);
fitDemo();
