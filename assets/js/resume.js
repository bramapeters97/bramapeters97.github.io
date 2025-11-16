(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function generatePDF(button) {
    var target = document.querySelector('.container');
    if (!target) {
      window.print();
      return;
    }

    function finish() {
      document.body.classList.remove('pdf-is-generating');
      if (button) {
        button.disabled = false;
      }
    }

    if (button) {
      button.disabled = true;
    }
    document.body.classList.add('pdf-is-generating');

    var width = target.offsetWidth + 60;
    var height = target.scrollHeight + 120;

    if (typeof window.html2pdf === 'undefined') {
      window.print();
      finish();
      return;
    }

    window.html2pdf()
      .set({
        filename: 'bram-peters-portfolio.pdf',
        margin: 0,
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          windowWidth: document.documentElement.offsetWidth
        },
        jsPDF: { unit: 'px', format: [width, height], orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] }
      })
      .from(target)
      .save()
      .then(finish)
      .catch(function () {
        finish();
        window.print();
      });
  }

  ready(function () {
    var button = document.getElementById('downloadBtn');
    if (!button) {
      return;
    }
    button.addEventListener('click', function () {
      generatePDF(button);
    });
  });
})();
