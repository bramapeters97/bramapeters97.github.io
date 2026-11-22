import YoutubeTranscript from "youtube-transcript";
import cache from "memory-cache";

export default async function handler(req, res) {
  const id = new URL(req.url, `http://${req.headers.host}`).searchParams.get("id");
  const cached = cache.get(id);
  if (cached)
    return new Promise((resolve) =>
      resolve({
        status: "success",
        data: res.status(200).json(cached),
      })
    );
  else
    return YoutubeTranscript.fetchTranscript(id)
      .then((data) => {
        cache.put(id, data, 24 * 1000 * 60 * 60);
        return {
          status: "success",
          data: res.status(200).json(data),
        };
      })
      .catch((error) => ({
        status: "error",
        data: res.status(500).json(error),
      }));
}
