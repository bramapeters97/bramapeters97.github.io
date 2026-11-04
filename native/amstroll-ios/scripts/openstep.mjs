// Small strict reader for the OpenStep property-list syntax emitted by our
// project generator. This validates syntax; it is not Xcode build validation.
export function parseOpenStep(source) {
  const tokens = [...source.matchAll(/\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|[{}()=;,]|[^\s{}()=;,"]+/g)]
    .map(match => match[0]).filter(token => !/^\s|^\/\//.test(token) && !token.startsWith('/*'));
  let at = 0;
  const expect = token => { if (tokens[at++] !== token) throw Error(`Expected ${token} near token ${at}: ${tokens.slice(at - 3, at + 2).join(' ')}`); };
  const atom = () => { const token = tokens[at++]; if (!token || /^[{}()=;,]$/.test(token)) throw Error('Expected property-list value'); return token.startsWith('"') ? JSON.parse(token) : token; };
  function value() {
    if (tokens[at] === '{') {
      at++; const result = Object.create(null);
      while (tokens[at] !== '}') { const key = atom(); if (Object.hasOwn(result, key)) throw Error(`Duplicate key ${key}`); expect('='); result[key] = value(); expect(';'); }
      at++; return result;
    }
    if (tokens[at] === '(') {
      at++; const result = [];
      while (tokens[at] !== ')') { result.push(value()); if (tokens[at] === ',') at++; else if (tokens[at] !== ')') throw Error('Expected array comma'); }
      at++; return result;
    }
    return atom();
  }
  const result = value(); if (at !== tokens.length) throw Error('Unexpected trailing property-list tokens'); return result;
}
