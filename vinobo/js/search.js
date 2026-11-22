const punctuationRegex = /[\.,:;\-_<>|'*^´`+?\\!"#%&\/()=@{}[\]]/g;
const secondRegex = /[\s-]+/g;
/**
 * Removes punctuation and more.
 * @param {String} str The string to clean.
 * @returns New string.
 */
function makeStringSearchable(str) {
  return str
    .trim() // remove leading and trailing whitespace
    .replace(punctuationRegex, "") // remove punctuation
    .replace(secondRegex, " ") // replace sequences of whitespace with one space
    .normalize() // unicode normalize
    .toLocaleLowerCase(); // to lower case
}

/**
 * Filters `data` to the elements that have a property that matches anything in `words`.
 * @param {Array} data A list of objects.
 * @param {Array} words A list of strings to match.
 * @param {Array} textProperties A list of the keys to the properties in data objects that contains the searchable string.
 * @returns {Array} Filtered version of `data`.
 */
function filterList(data, words, textProperties) {
  if (!data) return data;
  return data.filter(
    (obj) =>
      !words.length || textProperties.find((prop) => words.find((word) => obj[prop].includes(word)))
  );
}

export { filterList, makeStringSearchable };
