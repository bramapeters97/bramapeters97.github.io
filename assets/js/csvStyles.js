(function () {
  var currentScript = document.currentScript;
  var source = currentScript && currentScript.dataset ? currentScript.dataset.styleSrc : null;
  var fallback = 'assets/styles/style-map.csv';
  var csvPath = source || fallback;

  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = '';
    var insideQuotes = false;
    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      if (insideQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            insideQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\r') {
        continue;
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function buildCSS(table) {
    if (!table.length) {
      return '';
    }
    var headers = table[0];
    var headerIndex = headers.reduce(function (acc, key, idx) {
      acc[key.trim()] = idx;
      return acc;
    }, {});
    var imports = [];
    var contexts = [];
    var contextMap = new Map();

    function ensureContext(context) {
      if (!contextMap.has(context)) {
        contextMap.set(context, new Map());
        contexts.push(context);
      }
      return contextMap.get(context);
    }

    for (var r = 1; r < table.length; r += 1) {
      var row = table[r];
      if (!row.length) continue;
      var context = (row[headerIndex.context] || 'global').trim() || 'global';
      var selector = (row[headerIndex.selector] || '').trim();
      var property = (row[headerIndex.property] || '').trim();
      var value = (row[headerIndex.value] || '').trim();

      if (!property) {
        continue;
      }

      if (context === '@import') {
        if (value) {
          imports.push(value);
        }
        continue;
      }

      var scopedMap = ensureContext(context);
      if (!scopedMap.has(selector)) {
        scopedMap.set(selector, []);
      }
      scopedMap.get(selector).push(property + ':' + value + ';');
    }

    var css = '';
    if (imports.length) {
      css += imports.map(function (val) { return '@import ' + val + ';'; }).join('');
    }

    contexts.forEach(function (context) {
      var selectorMap = contextMap.get(context);
      if (!selectorMap) return;
      var block = '';
      selectorMap.forEach(function (decls, selector) {
        if (!selector) return;
        block += selector + '{' + decls.join('') + '}';
      });
      if (!block) return;
      if (context === 'global') {
        css += block;
      } else {
        css += context + '{' + block + '}';
      }
    });
    return css;
  }

  function injectCSS(cssText) {
    if (!cssText) return;
    var styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.dataset = styleEl.dataset || {};
    styleEl.dataset.source = 'csv-styles';
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
  }

  function handleError(err) {
    console.error('Unable to load CSV styles', err);
  }

  fetch(csvPath)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Request failed with status ' + response.status);
      }
      return response.text();
    })
    .then(function (text) {
      var table = parseCSV(text);
      var css = buildCSS(table);
      injectCSS(css);
    })
    .catch(handleError);
})();
