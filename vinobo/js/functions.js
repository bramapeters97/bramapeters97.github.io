const ytRegex =
  /^((https?:\/\/)?(youtu\.be\/|www\.youtube\.com\/watch\?.*v=))?(?<id>[A-Za-z0-9-_]{11}).*$/;
// /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

/**
 * Takes in a YouTube URL or video ID and returns the video ID.
 * @param {string} URL_or_ID The string to extract video ID from.
 * @returns The ID or `null`.
 */
function extractID(URL_or_ID) {
  const match = URL_or_ID.match(ytRegex);
  return match ? match.groups.id : null;
}

/**
 * Format timestamp of seconds to [hh:]mm:ss. Rounds down to nearest whole second.
 * @param {Number} sec Number of seconds.
 * @returns {string} Formatted timestamp.
 */
function formatTimestamp(sec) {
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let min = Math.floor(sec / 60);
  sec %= 60;
  sec = `00${sec}`.substring(String(sec).length);

  if (hrs) {
    min = `00${min}`.substring(String(min).length);
    return `${hrs}:${min}:${sec}`;
  }
  return `${min}:${sec}`;
}

const timestampRegex =
  /^((?<hours>[0-9]*)[:\.])?(?<minutes>[0-5]?[0-9])[:\.](?<seconds>[0-5]?[0-9])$/;
/**
 * Takes a timestamp in the form [hh:]mm:ss and returns the number of seconds that the timestamp represents.
 * If the timestamp is invalid, returns `null`.
 * @param {String} timestamp The timestamp to parse.
 * @returns The number of seconds represented, or `null`.
 */
function parseTimestamp(timestamp) {
  const match = timestamp.match(timestampRegex);
  if (!match) return null;
  const { hours, minutes, seconds } = match.groups;
  return Number((hours * 3600 || 0) + minutes * 60 + seconds * 1);
}

export { ytRegex, extractID, formatTimestamp, timestampRegex, parseTimestamp };
