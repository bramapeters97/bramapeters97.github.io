import { films, account, icon, escapeHtml as esc, formatTime, createViewerState, openPlayer } from "../../../assets/mypremiereplus/demo.js";

const viewer = createViewerState("tvos");
const app = document.querySelector("#tv-app");
const state = { view: "home", query: "", category: "all", filmId: null, history: [] };
const featured = films.find((film) => film.id === "lake") || films[0];
let toastTimer;

const button = (text, action, options = "", css = "secondary") => `<button type="button" class="${css}" data-action="${action}" ${options}>${text}</button>`;
const keyFor = (element) => element?.dataset.focus || null;
const focusKey = (key) => {
  const target = [...app.querySelectorAll("[data-focus]")].find((element) => element.dataset.focus === key);
  (target || app.querySelector("[data-initial-focus]") || app.querySelector("button"))?.focus({ preventScroll: true });
};
const findFilm = (id) => films.find((film) => film.id === id);

function filmCard(film, prefix = "film") {
  const elapsed = viewer.progress(film.id);
  const percent = Math.min(100, elapsed / film.duration * 100);
  return `<button type="button" class="film-card" data-action="detail" data-id="${esc(film.id)}" data-focus="${prefix}-${esc(film.id)}" aria-label="More information about ${esc(film.title)}">
    <span class="poster"><img src="${esc(film.poster)}" alt="" loading="lazy" /><span class="duration">${formatTime(film.duration)}</span>${elapsed > 0 ? `<span class="progress-track"><span style="width:${percent}%"></span></span>` : ""}</span>
    <strong>${esc(film.title)}</strong><span class="card-meta">${esc(film.year)} · ${esc(film.category)}</span>
  </button>`;
}

function filmRow(title, items, prefix) {
  if (!items.length) return "";
  return `<section class="content-section"><div class="section-heading"><h2>${title}</h2><span>${items.length} ${items.length === 1 ? "film" : "films"}</span></div><div class="film-row">${items.map((film) => filmCard(film, prefix)).join("")}</div></section>`;
}

function header() {
  return `<header class="tv-header"><div class="tv-brand">${icon("film", 26)}<span>${esc(account.archive)}</span></div><nav class="tv-nav" aria-label="Cinema navigation">${[["home", "Home"], ["library", "Library"], ["saved", "Saved"], ["search", "Search"]].map(([view, label]) => button(label, "navigate", `data-view="${view}" data-focus="nav-${view}" ${state.view === view ? 'aria-current="page"' : ""}`, `nav-item ${state.view === view ? "selected" : ""}`)).join("")}</nav><span class="viewer-badge" title="Fictional demo account: Everyone" aria-label="Viewing as Everyone">E</span></header>`;
}

function home() {
  const continuing = films.filter((film) => viewer.progress(film.id) > 0);
  return `<section class="hero"><img class="hero-art" src="${esc(featured.poster)}" alt="" /><div class="hero-copy"><p class="eyebrow">YOUR STORIES. YOUR CINEMA.</p><h2>${esc(featured.title)}</h2><p class="meta">${esc(featured.year)} <span>·</span> ${esc(featured.category)} <span>·</span> ${formatTime(featured.duration)}</p><p class="description">${esc(featured.description)}</p><div class="action-row">${button(`${icon("play")}Play film`, "play", `data-id="${featured.id}" data-focus="home-play" data-initial-focus`, "primary")}${button("More information", "detail", `data-id="${featured.id}" data-focus="home-details"`)}</div></div></section>
    ${filmRow("Continue watching", continuing, "continue")}
    ${filmRow("The places we went", films.filter((film) => film.id !== "cinema"), "places")}
    ${filmRow("Your saved films", films.filter((film) => viewer.isSaved(film.id)), "saved")}
    <section class="content-section cinema-note"><div>${icon("film", 30)}<h2>Your own little cinema.</h2><p>A few familiar places. A reason to watch together.</p></div>${button("Explore the library", "navigate", 'data-view="library" data-focus="explore-library"')}</section>`;
}

function matchingFilms() {
  const query = state.query.trim().toLowerCase();
  return films.filter((film) => (state.view !== "saved" || viewer.isSaved(film.id)) && (state.category === "all" || film.category === state.category) && (state.view !== "search" || `${film.title} ${film.description} ${film.category} ${film.year}`.toLowerCase().includes(query)));
}

function results() {
  const matches = matchingFilms();
  if (!matches.length) return `<div class="empty-state">${icon(state.view === "saved" ? "bookmark" : "search", 38)}<h3>${state.view === "saved" ? "Keep something for later." : "No films found."}</h3><p>${state.view === "saved" ? "Save a film from its detail screen and it will be waiting here." : "Try a different title, year or place, or choose All films."}</p>${button("Browse all films", "navigate", 'data-view="library" data-focus="empty-library"', "primary")}</div>`;
  return `<p class="result-count" role="status">${matches.length} ${matches.length === 1 ? "film" : "films"}${state.view === "search" && state.query ? ` matching “${esc(state.query)}”` : ""}</p><div class="film-grid">${matches.map((film) => filmCard(film, state.view)).join("")}</div>`;
}

function library() {
  const titles = { library: ["The film library", "Every chapter, all in one place."], saved: ["Saved for a quiet evening", "Your favourites, ready when you are."], search: ["Find a familiar moment", "Search a title, a year or a place."] };
  const [title, description] = titles[state.view];
  const categories = [...new Set(films.map((film) => film.category))];
  return `<section class="library-page"><div class="page-title"><p class="eyebrow">${esc(account.archive)}</p><h2>${title}</h2><p>${description}</p></div>${state.view === "search" ? `<label class="search-field">${icon("search")}<span class="sr-only">Search films</span><input type="search" id="film-search" data-focus="search-input" data-initial-focus placeholder="Search your cinema" value="${esc(state.query)}" autocomplete="off" /></label>` : ""}<div class="filters" aria-label="Filter films by category">${["all", ...categories].map((category) => button(category === "all" ? "All films" : esc(category), "filter", `data-category="${esc(category)}" data-focus="filter-${esc(category)}" aria-pressed="${state.category === category}"`, `filter-chip ${state.category === category ? "selected" : ""}`)).join("")}</div><div id="film-results">${results()}</div></section>`;
}

function detail() {
  const film = findFilm(state.filmId);
  const saved = viewer.isSaved(film.id);
  const elapsed = viewer.progress(film.id);
  return `<section class="detail-page"><img class="detail-art" src="${esc(film.poster)}" alt="" /><div class="detail-copy">${button(`${icon("back")}Back`, "back", 'data-focus="detail-back"', "back-button")}<p class="eyebrow">A FILM FROM YOUR CINEMA</p><h2>${esc(film.title)}</h2><p class="meta">${esc(film.year)} <span>·</span> ${esc(film.category)} <span>·</span> ${formatTime(film.duration)}</p><p class="description">${esc(film.description)}</p><div class="action-row">${button(`${icon("play")}${elapsed > 0 ? "Resume film" : "Play film"}`, "play", `data-id="${film.id}" data-focus="detail-play" data-initial-focus`, "primary")}${button(`${icon(saved ? "check" : "bookmark")}${saved ? "Saved" : "Save for later"}`, "save", `data-id="${film.id}" data-focus="detail-save" aria-pressed="${saved}"`, "secondary")}</div><p class="sample-note">Fictional title · short demonstration clip<br>Generated artwork. No personal recordings.</p></div></section>${filmRow("A few more to rediscover", films.filter((item) => item.id !== film.id).slice(0, 4), "related")}`;
}

function render(focus = null) {
  app.innerHTML = `${header()}<div id="tv-content" class="tv-content" tabindex="-1">${state.view === "home" ? home() : state.view === "detail" ? detail() : library()}</div>`;
  requestAnimationFrame(() => focusKey(focus));
}

function navigate(view, focus = null) {
  if (!["home", "library", "saved", "search"].includes(view)) return;
  state.view = view;
  state.category = "all";
  state.history = [];
  render(focus || (view === "home" ? "home-play" : view === "search" ? "search-input" : `nav-${view}`));
}

function showDetail(id, returnFocus) {
  if (!findFilm(id)) return;
  state.history.push({ view: state.view, filmId: state.filmId, category: state.category, focus: returnFocus, scroll: app.querySelector(".tv-content")?.scrollTop || 0 });
  state.view = "detail";
  state.filmId = id;
  render("detail-play");
}

function back() {
  const previous = state.history.pop();
  if (previous) {
    Object.assign(state, { view: previous.view, filmId: previous.filmId, category: previous.category });
    render(previous.focus);
    requestAnimationFrame(() => { app.querySelector(".tv-content").scrollTop = previous.scroll; });
  } else if (state.view !== "home") navigate("home", "nav-home");
}

function notify(text) {
  const toast = document.querySelector("#tv-toast");
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2500);
}

app.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const action = control.dataset.action;
  const film = findFilm(control.dataset.id);
  if (action === "navigate") navigate(control.dataset.view);
  if (action === "detail") showDetail(control.dataset.id, keyFor(control));
  if (action === "back") back();
  if (action === "filter") {
    state.category = control.dataset.category;
    app.querySelectorAll("[data-action='filter']").forEach((chip) => {
      const selected = chip.dataset.category === state.category;
      chip.classList.toggle("selected", selected);
      chip.setAttribute("aria-pressed", String(selected));
    });
    app.querySelector("#film-results").innerHTML = results();
  }
  if (action === "save" && film) {
    const saved = viewer.toggleSaved(film.id);
    render("detail-save");
    notify(saved ? "Saved for later." : "Removed from saved films.");
  }
  if (action === "play" && film) {
    const returnFocus = keyFor(control);
    openPlayer(film, { startAt: viewer.progress(film.id), onProgress: (seconds) => viewer.setProgress(film.id, seconds), onClose: () => render(returnFocus) });
  }
});

app.addEventListener("input", (event) => {
  if (event.target.id !== "film-search") return;
  state.query = event.target.value;
  app.querySelector("#film-results").innerHTML = results();
});

function moveFocus(direction) {
  const current = document.activeElement;
  const candidates = [...app.querySelectorAll("button:not([disabled]), input, a[href]")].filter((element) => element.getClientRects().length);
  if (!candidates.includes(current)) { focusKey("home-play"); return; }
  const origin = current.getBoundingClientRect();
  const ox = origin.x + origin.width / 2, oy = origin.y + origin.height / 2;
  const horizontal = direction === "ArrowLeft" || direction === "ArrowRight";
  const positive = direction === "ArrowRight" || direction === "ArrowDown";
  let nearest = null, score = Infinity;
  for (const element of candidates) {
    if (element === current) continue;
    const rect = element.getBoundingClientRect();
    const dx = rect.x + rect.width / 2 - ox, dy = rect.y + rect.height / 2 - oy;
    const primary = horizontal ? dx : dy, secondary = horizontal ? Math.abs(dy) : Math.abs(dx);
    if ((positive ? primary : -primary) <= 5) continue;
    const distance = Math.abs(primary) + secondary * 3;
    if (distance < score) { score = distance; nearest = element; }
  }
  if (nearest) {
    nearest.focus({ preventScroll: true });
    nearest.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  }
}

document.addEventListener("keydown", (event) => {
  if (document.querySelector("dialog[open]")) return;
  if (event.key === "Escape") { event.preventDefault(); back(); return; }
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  const editing = document.activeElement?.matches("input, textarea, select");
  if (editing && ["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  if (!app.contains(document.activeElement)) return;
  event.preventDefault();
  moveFocus(event.key);
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  viewer.reset();
  state.query = "";
  navigate("home");
  notify("Demo reset. A fresh evening at the cinema.");
});

render("home-play");
