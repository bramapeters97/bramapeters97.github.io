/**
 * Fetches the YT transcript for the given video ID.
 * @param {string} id A valid YT video ID.
 * @returns A promise yielding the JSON response.
 */
function getTranscript(id) {
  return fetch(`/api/get_transcript?id=${id}`)
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res;
    })
    .then((res) => res.json());
}

export default getTranscript;
