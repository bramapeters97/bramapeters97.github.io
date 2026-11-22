import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";

function errorResponse(message, status) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function onRequest({ request, waitUntil }) {
  if (request.method !== "GET") return new Response(null, { status: 405, headers: { Allow: "GET" } });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return errorResponse("Invalid YouTube video ID.", 400);

  url.search = new URLSearchParams({ id }).toString();
  const key = new Request(url);
  const cached = await caches.default.match(key);
  if (cached) return cached;

  const signal = AbortSignal.timeout(15000);
  try {
    const rows = await fetchTranscript(id, {
      fetch: (input, init) => {
        const upstream = new URL(input);
        if (upstream.origin !== "https://www.youtube.com") throw new Error("Unexpected caption source");
        // Vinobo's transcript highlights and seek controls use milliseconds.
        if (upstream.pathname === "/api/timedtext") upstream.searchParams.set("fmt", "srv3");
        return fetch(upstream, { ...init, signal, redirect: "error" });
      },
    });
    if (!rows.length) return errorResponse("YouTube returned no captions for this video.", 404);
    const response = Response.json(rows, { headers: { "Cache-Control": "public, max-age=86400" } });
    waitUntil(caches.default.put(key, response.clone()));
    return response;
  } catch (error) {
    if (error instanceof YoutubeTranscriptTooManyRequestError) {
      return errorResponse("YouTube is limiting caption requests. Please try again later.", 429);
    }
    if (error instanceof YoutubeTranscriptDisabledError || error instanceof YoutubeTranscriptNotAvailableError
        || error instanceof YoutubeTranscriptVideoUnavailableError) {
      return errorResponse("No public captions are available for this video.", 404);
    }
    return errorResponse("YouTube captions are temporarily unavailable.", 502);
  }
}
