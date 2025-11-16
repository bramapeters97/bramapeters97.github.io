(function () {
  var script = document.currentScript;
  var measurementId = script && script.dataset ? script.dataset.gtag : null;

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  window.gtag('js', new Date());
  if (measurementId) {
    window.gtag('config', measurementId);
  }
})();
