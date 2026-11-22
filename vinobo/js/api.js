import { parseCaptions } from "./captions";
import { sampleCaptions, sampleId } from "./sampleVideo";

const cache = new Map();

async function fetchRows(id) {
  if (id === sampleId || id === "20SHvU2PKsM") {
    const response = await fetch(id === sampleId ? sampleCaptions : "/vinobo/sample/intro.vtt");
    if (response.ok) return parseCaptions(await response.text());
  }

  // A Pages Function serves this route on Cloudflare. GitHub Pages only serves files.
  try {
    const local = await fetch("/vinobo/api/get_transcript?id=" + encodeURIComponent(id), { signal: AbortSignal.timeout(8000) });
    if (local.ok && local.headers.get("content-type")?.includes("application/json")) {
      const rows = await local.json();
      if (Array.isArray(rows) && rows.length) return rows;
    }
  } catch { /* Use the public caption API when the local route is unavailable. */ }

  const url = new URL("https://api.freetranscriptapi.com/v1/transcript");
  url.searchParams.set("video_url", id);
  const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(25000) });
  if (response.status === 429) throw new Error("The caption service has reached its hourly limit. Try again later.");
  if (!response.ok) throw new Error(response.status === 404 ? "No public captions were found for this video." : "The caption service is temporarily unavailable.");
  const data = await response.json();
  const rows = (data.transcript || []).filter(row => typeof row.text === "string" && Number.isFinite(row.start))
    .map(row => ({ text: row.text, offset: Math.round(row.start * 1000), duration: Math.round((row.duration || 0) * 1000) }));
  if (!rows.length) throw new Error("No public captions were found for this video.");
  return rows;
}

export default function getTranscript(id) {
  if (!cache.has(id)) {
    cache.set(id, fetchRows(id).catch(error => {
      cache.delete(id);
      throw error;
    }));
  }
  return cache.get(id);
}
