const ytRegex = /^[A-Za-z0-9_-]{11}$/;

function extractID(input) {
  const value = input.trim();
  if (ytRegex.test(value)) return value;
  try {
    const url = new URL(value.includes("://") ? value : "https://" + value);
    const host = url.hostname.replace(/^(www\.|m\.)/, "");
    const parts = url.pathname.split("/");
    let id;
    if (host === "youtu.be") id = parts[1];
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = parts[1] === "watch" ? url.searchParams.get("v")
        : ["embed", "shorts", "live"].includes(parts[1]) ? parts[2] : null;
    }
    return id && ytRegex.test(id) ? id : null;
  } catch {
    return null;
  }
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
