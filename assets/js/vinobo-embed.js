const vinoboFrame = document.querySelector(".vinobo-frame");
const vinoboViewport = vinoboFrame.parentElement;
function fitVinobo() {
  const width = vinoboViewport.clientWidth;
  const height = vinoboViewport.clientHeight;
  if (!width || !height) return;
  const scale = Math.min(1, width / 1200, height / 760);
  vinoboFrame.style.setProperty("width", Math.floor(width / scale) + "px", "important");
  vinoboFrame.style.height = Math.floor(height / scale) + "px";
  vinoboFrame.style.transform = "scale(" + scale + ")";
}
fitVinobo();
new ResizeObserver(fitVinobo).observe(vinoboViewport);
