/** Public, fictional viewer fixtures. No production application imports. */
const asset = (name) => new URL(name, import.meta.url).href;
export const account = Object.freeze({ name: "Everyone", archive: "The Sunday Cinema" });
const video = asset("media/sunday-cinema.mp4");
export const films = Object.freeze([
  { id: "lake", title: "Summer by the Lake", year: 2007, category: "Summer", artwork: "lake", description: "Long afternoons, little discoveries and the kind of summer we still talk about. A fictional story from The Sunday Cinema." },
  { id: "coast", title: "The Long Way Home", year: 2009, category: "Journeys", artwork: "coast", description: "One more stop by the sea before the journey home. A fictional road trip, illustrated with generated scenery." },
  { id: "garden", title: "An Evening Together", year: 2016, category: "Together", artwork: "garden", description: "The table is set, the lights come on and there is nowhere else to be. An imagined evening worth keeping." },
  { id: "mountains", title: "Into the Blue", year: 2012, category: "Journeys", artwork: "mountains", description: "A quiet lake at the end of a long walk. An illustrated mountain escape from our fictional archive." },
  { id: "cinema", title: "Our Sunday Cinema", year: 2024, category: "Together", artwork: "cinema", description: "A familiar room, a favourite film and a little time together. The idea behind this fictional family cinema." },
  { id: "meadow", title: "The Last Day of Summer", year: 2019, category: "Summer", artwork: "coast", description: "One last afternoon in the warm light before autumn arrives. A fictional memory with an illustrated cover." },
].map((film) => Object.freeze({ ...film, duration: 8, poster: asset(`artwork/${film.artwork}.jpg`), video })));

export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const formatTime = (value) => { const seconds = Math.max(0, Math.floor(Number(value) || 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; };
const paths = {
  home: "m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7",
  library: "M3 4h5v16H3zM10 4h5v16h-5zM17 5l4-1 3 15-4 1z",
  search: "M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
  bookmark: "M6 3h12v18l-6-4-6 4z", play: "m8 4 13 8L8 20z", pause: "M8 4v16M16 4v16",
  back: "m15 4-8 8 8 8", close: "m6 6 12 12M18 6 6 18", check: "m4 12 5 5L20 6",
  film: "M3 9h18v12H3zM3 9V4l18-3v8M7 3l3 5m3-6 3 5M10 12l5 3-5 3z",
  reset: "M20 7a9 9 0 1 0 1 9M20 2v6h-6", arrow: "M4 12h16m-6-6 6 6-6 6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 10v7M12 7h.01",
};
export function icon(name, size = 22) { return `<svg aria-hidden="true" viewBox="0 0 24 24" width="${Number(size) || 22}" height="${Number(size) || 22}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.film}"/></svg>`; }

export function createViewerState(platform) {
  const key = `mpp:public-demo:${platform}:v1`;
  const valid = new Set(films.map((film) => film.id));
  let saved = new Set(), progress = {};
  // Storage is optional: blocked storage must not prevent browsing or playback.
  try {
    const data = JSON.parse(localStorage.getItem(key) || "null");
    saved = new Set(Array.isArray(data?.saved) ? data.saved.filter((id) => valid.has(id)) : []);
    if (data?.progress && typeof data.progress === "object") {
      for (const [id, seconds] of Object.entries(data.progress)) if (valid.has(id) && Number.isFinite(seconds)) progress[id] = Math.max(0, Math.min(8, seconds));
    }
  } catch { /* Use ephemeral viewing state if browser storage is unavailable. */ }
  const persist = () => { try { localStorage.setItem(key, JSON.stringify({ saved: [...saved], progress })); } catch { /* Optional local persistence only. */ } };
  return {
    isSaved: (id) => saved.has(id),
    toggleSaved(id) { if (!valid.has(id)) return false; saved.has(id) ? saved.delete(id) : saved.add(id); persist(); return saved.has(id); },
    progress: (id) => progress[id] || 0,
    setProgress(id, seconds) { if (valid.has(id) && Number.isFinite(seconds)) { progress[id] = Math.max(0, Math.min(8, seconds)); persist(); } },
    reset() { saved.clear(); progress = {}; try { localStorage.removeItem(key); } catch { /* Optional local persistence only. */ } },
  };
}

let currentPlayer;
export function openPlayer(film, { startAt = 0, onClose = () => {}, onProgress = () => {} } = {}) {
  currentPlayer?.close();
  const previousFocus = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "mpp-player";
  dialog.setAttribute("aria-labelledby", "mpp-player-title");
  dialog.innerHTML = `<div class="mpp-player-inner"><header><div><small>THE SUNDAY CINEMA</small><h2 id="mpp-player-title">${escapeHtml(film.title)}</h2></div><button type="button" class="mpp-player-close" aria-label="Close player">${icon("close")}<span>Back</span></button></header><video controls playsinline preload="metadata" poster="${escapeHtml(film.poster)}" aria-label="${escapeHtml(film.title)} illustrated sample"><source src="${escapeHtml(film.video)}" type="video/mp4"></video><p class="mpp-player-status" role="status" aria-live="polite">Loading the illustrated sample…</p><button type="button" class="mpp-player-retry" hidden>Retry sample</button><footer><p>8-second silent illustrated sample. Every title uses this same generated-artwork clip; no family footage is included.</p><p>Space: play / pause · ← / →: seek · Esc: back</p></footer></div>`;
  document.body.append(dialog);
  const media = dialog.querySelector("video"), status = dialog.querySelector(".mpp-player-status"), retry = dialog.querySelector(".mpp-player-retry");
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    onProgress(media.currentTime || 0);
    media.pause();
    dialog.close();
    dialog.remove();
    currentPlayer = null;
    onClose();
    if (previousFocus?.isConnected) previousFocus.focus();
  };
  dialog.querySelector(".mpp-player-close").addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
  dialog.addEventListener("keydown", (event) => {
    if (event.code === "Space" && event.target.tagName !== "BUTTON") { event.preventDefault(); event.stopPropagation(); media.paused ? attemptPlay() : media.pause(); }
    if (["ArrowLeft", "ArrowRight"].includes(event.key) && event.target !== media) { event.preventDefault(); media.currentTime = Math.max(0, Math.min(media.duration || 8, media.currentTime + (event.key === "ArrowRight" ? 2 : -2))); }
  }, true);
  const attemptPlay = () => { media.play().catch(() => { status.textContent = media.error ? "The sample could not play. Please retry." : "Press play to start the sample."; }); };
  media.addEventListener("loadedmetadata", () => { const offset = Number.isFinite(startAt) ? Math.max(0, startAt) : 0; media.currentTime = offset < media.duration - 0.5 ? offset : 0; });
  media.addEventListener("playing", () => { status.textContent = "Playing illustrated sample"; retry.hidden = true; });
  media.addEventListener("pause", () => { if (!media.error && !media.ended) status.textContent = "Sample paused"; });
  media.addEventListener("waiting", () => { status.textContent = "Loading the illustrated sample…"; });
  media.addEventListener("timeupdate", () => onProgress(media.currentTime));
  media.addEventListener("ended", () => { status.textContent = "Sample finished. Use play to watch again."; onProgress(media.currentTime); });
  const failure = () => { status.textContent = "This sample is unavailable. Please retry or go back to browsing."; retry.hidden = false; };
  media.addEventListener("error", failure);
  media.querySelector("source").addEventListener("error", failure);
  retry.addEventListener("click", () => { status.textContent = "Loading the illustrated sample…"; retry.hidden = true; media.load(); attemptPlay(); });
  dialog.showModal();
  media.focus();
  currentPlayer = { close };
  attemptPlay();
  return currentPlayer;
}
