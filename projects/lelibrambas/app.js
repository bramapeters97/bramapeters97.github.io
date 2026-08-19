(() => {
  "use strict";

  const films = [
    {
      id: "starling-bay",
      title: "Afterglow at Starling Bay",
      year: 2018,
      date: "18 August",
      duration: 24,
      place: "Starling Bay",
      collection: "Small Adventures",
      description:
        "A late-summer picnic stretches into a glowing evening of paper lanterns, improvised games and one very determined toy sailboat.",
      note: "A wholly fictional memory created for this interface preview.",
      palette: "teal",
      progress: 38,
      featured: true,
    },
    {
      id: "kitchen-orchestra",
      title: "The Kitchen Orchestra",
      year: 2007,
      date: "3 March",
      duration: 14,
      place: "Willow House",
      collection: "Everyday Magic",
      description:
        "Wooden spoons, saucepan cymbals and a flour-cloud finale turn an ordinary rainy morning into a tiny concert.",
      note: "Synthetic catalogue record; no real people or locations are represented.",
      palette: "violet",
      progress: 71,
    },
    {
      id: "paper-kites",
      title: "Paper Kites & Thunder",
      year: 2012,
      date: "12 June",
      duration: 19,
      place: "Juniper Field",
      collection: "Small Adventures",
      description:
        "A kite-building contest meets a summer storm, ending with hot chocolate and several surprisingly brave paper dragons.",
      note: "Fictional demo entry with generated artwork.",
      palette: "rose",
      progress: 0,
    },
    {
      id: "midnight-train",
      title: "The Midnight Train to Elsewhere",
      year: 1999,
      date: "27 October",
      duration: 32,
      place: "Platform Nine",
      collection: "Tiny Epics",
      description:
        "A cardboard railway crosses the living-room floor while its conductors invent stations, snacks and impossible delays.",
      note: "This title, setting and artwork are fictional.",
      palette: "blue",
      progress: 22,
    },
    {
      id: "snowglobe-sunday",
      title: "A Snowglobe Sunday",
      year: 2004,
      date: "9 January",
      duration: 21,
      place: "Pineglass Cottage",
      collection: "Weather Days",
      description:
        "The first snow of the year inspires a lopsided fort, a carrot shortage and a warm window-seat epilogue.",
      note: "Fictional winter scene for the public preview.",
      palette: "blue",
      progress: 0,
    },
    {
      id: "blue-bicycle",
      title: "The Blue Bicycle Club",
      year: 2016,
      date: "4 May",
      duration: 17,
      place: "Crescent Lane",
      collection: "Everyday Magic",
      description:
        "Three chalk arrows lead a bicycle expedition around the block and toward the grand opening of a pavement café.",
      note: "Synthetic memory; no private footage is attached.",
      palette: "green",
      progress: 84,
    },
    {
      id: "seaside-radio",
      title: "Radio From the Seaside",
      year: 2021,
      date: "22 July",
      duration: 11,
      place: "Gullrock Pier",
      collection: "Weekend Notes",
      description:
        "A pocket radio, a windy pier and a handwritten weather report become a broadcast for an audience of seagulls.",
      note: "Fictional public-demo catalogue entry.",
      palette: "teal",
      progress: 0,
    },
    {
      id: "garden-cinema",
      title: "Cinema in the Garden",
      year: 2010,
      date: "6 September",
      duration: 26,
      place: "Marigold Yard",
      collection: "Tiny Epics",
      description:
        "A white sheet, a handmade ticket booth and bowls of popcorn transform the garden into a one-night picture palace.",
      note: "Imagined memory with abstract, CSS-generated art.",
      palette: "amber",
      progress: 0,
    },
    {
      id: "yellow-raincoat",
      title: "The Yellow Raincoat",
      year: 1996,
      date: "14 November",
      duration: 8,
      place: "Fernbridge",
      collection: "Weather Days",
      description:
        "A puddle survey becomes an expedition when the smallest splash is declared the most important discovery of the day.",
      note: "Fictional early-reel placeholder.",
      palette: "amber",
      progress: 100,
    },
    {
      id: "mooncake-mission",
      title: "Mooncake Mission",
      year: 2023,
      date: "2 February",
      duration: 13,
      place: "Little Comet Kitchen",
      collection: "New Memories",
      description:
        "A baking experiment receives a full mission briefing, two cardboard helmets and a successful lunar landing on the cooling rack.",
      note: "Entirely synthetic entry made for the static preview.",
      palette: "violet",
      progress: 0,
    },
    {
      id: "lantern-parade",
      title: "The Lantern Parade",
      year: 2014,
      date: "30 December",
      duration: 28,
      place: "Firefly Square",
      collection: "Weekend Notes",
      description:
        "Handmade lanterns light a slow procession through the hallway, complete with a blanket-fort grandstand.",
      note: "Fictional celebration with no real source media.",
      palette: "rose",
      progress: 53,
    },
    {
      id: "pocket-museum",
      title: "The Pocket Museum",
      year: 2001,
      date: "16 April",
      duration: 16,
      place: "Acorn Room",
      collection: "Everyday Magic",
      description:
        "Buttons, pebbles and a mysterious brass key receive handwritten labels in the smallest museum ever opened.",
      note: "Synthetic record and fictional location.",
      palette: "green",
      progress: 0,
    },
  ];

  const collections = [
    {
      id: "small-adventures",
      title: "Small Adventures",
      description: "Picnics, field trips and journeys just beyond the front door.",
      palette: "blue",
    },
    {
      id: "everyday-magic",
      title: "Everyday Magic",
      description: "Ordinary afternoons that became unexpectedly memorable.",
      palette: "violet",
    },
    {
      id: "tiny-epics",
      title: "Tiny Epics",
      description: "Grand productions made from cardboard, blankets and imagination.",
      palette: "amber",
    },
    {
      id: "weather-days",
      title: "Weather Days",
      description: "Rain, snow, wind and the plans that changed with them.",
      palette: "teal",
    },
    {
      id: "weekend-notes",
      title: "Weekend Notes",
      description: "Short chapters from slow mornings and bright evenings.",
      palette: "rose",
    },
    {
      id: "new-memories",
      title: "New Memories",
      description: "The most recent fictional additions to the preview archive.",
      palette: "green",
    },
  ];

  const storageKey = "lelibrambas-static-preview-v1";
  const validViews = new Set(["home", "browse", "search", "timeline", "saved"]);
  const view = document.querySelector("#view");
  const detailsDialog = document.querySelector("#details-dialog");
  const detailsContent = document.querySelector("#details-content");
  const playerDialog = document.querySelector("#player-dialog");
  const playerContent = document.querySelector("#player-content");
  const profileDialog = document.querySelector("#profile-dialog");
  const toast = document.querySelector("#toast");
  const dialogsWithoutFocusRestore = new WeakSet();

  const persisted = readStorage();
  const state = {
    activeView: routeFromHash(),
    activeCollection: null,
    decade: "all",
    query: "",
    saved: new Set(Array.isArray(persisted.saved) ? persisted.saved : []),
    progress: persisted.progress && typeof persisted.progress === "object" ? persisted.progress : {},
    currentFilm: null,
    playerPosition: 0,
    playerPlaying: false,
    playerMuted: false,
    playerTimer: null,
    lastFocus: null,
  };

  function readStorage() {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function writeStorage() {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ saved: [...state.saved], progress: state.progress }),
      );
    } catch (_error) {
      // The preview still works when browser storage is unavailable.
    }
  }

  function routeFromHash() {
    const candidate = window.location.hash.replace(/^#\/?/, "").split("/")[0];
    return validViews.has(candidate) ? candidate : "home";
  }

  function filmById(id) {
    return films.find((film) => film.id === id);
  }

  function collectionFilms(title) {
    return films.filter((film) => film.collection === title);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function progressFor(film) {
    const stored = Number(state.progress[film.id]);
    return Number.isFinite(stored) ? Math.max(0, Math.min(100, stored)) : film.progress;
  }

  function durationLabel(minutes) {
    return `${minutes} min`;
  }

  function paletteClass(filmOrCollection) {
    return `palette-${filmOrCollection.palette}`;
  }

  function renderFilmCard(film, index = 0) {
    const progress = progressFor(film);
    return `
      <button class="film-card" type="button" data-film="${film.id}" aria-label="Open ${escapeHtml(film.title)} details">
        <span class="film-art ${paletteClass(film)}" aria-hidden="true">
          <span class="film-place">${escapeHtml(film.place)}</span>
          <span class="film-index">${String(index + 1).padStart(2, "0")}</span>
        </span>
        <span class="film-copy">
          <strong>${escapeHtml(film.title)}</strong>
          <small>${film.year} · ${durationLabel(film.duration)} · ${escapeHtml(film.collection)}</small>
          ${
            progress > 0 && progress < 100
              ? `<span class="progress-track" aria-label="${Math.round(progress)} percent watched"><i style="--progress: ${progress}%"></i></span>`
              : ""
          }
        </span>
      </button>`;
  }

  function renderCollectionCard(collection, index = 0) {
    const count = collectionFilms(collection.title).length;
    return `
      <button class="collection-card" type="button" data-collection="${collection.id}">
        <span class="collection-art ${paletteClass(collection)}">
          <small>LeliBramBas+ preview</small>
          <strong>${escapeHtml(collection.title)}</strong>
          <em>${count} fictional ${count === 1 ? "memory" : "memories"}</em>
          <span class="collection-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
        </span>
      </button>`;
  }

  function renderHome() {
    const hero = films.find((film) => film.featured) || films[0];
    const saved = state.saved.has(hero.id);
    const continueWatching = films
      .filter((film) => progressFor(film) > 0 && progressFor(film) < 100)
      .sort((a, b) => progressFor(b) - progressFor(a));
    const recentlyAdded = [...films].sort((a, b) => b.year - a.year).slice(0, 7);

    view.className = "view home-view";
    view.innerHTML = `
      <section class="hero ${paletteClass(hero)}" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">A FICTIONAL LELIBRAMBAS STUDIOS™ PRESENTATION</p>
          <h1 id="hero-title">${escapeHtml(hero.title)}</h1>
          <div class="metadata" aria-label="Title information">
            <span>${hero.year}</span><span>${escapeHtml(hero.date)}</span><span>${durationLabel(hero.duration)}</span>
            <span>${escapeHtml(hero.place)}</span><span class="format">16:9</span>
          </div>
          <p class="hero-description">${escapeHtml(hero.description)}</p>
          <div class="hero-actions">
            <button class="button primary" type="button" data-play="${hero.id}"><span aria-hidden="true">▶</span> Play preview</button>
            <button class="button secondary" type="button" data-film="${hero.id}"><span aria-hidden="true">ⓘ</span> More information</button>
            <button class="button quiet ${saved ? "saved" : ""}" type="button" data-save="${hero.id}" aria-pressed="${saved}">
              <span aria-hidden="true">${saved ? "♥" : "+"}</span> ${saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
        <span class="hero-corner-label">${escapeHtml(hero.place)} · synthetic preview</span>
      </section>
      <div class="home-sections">
        <section class="section-block" aria-labelledby="collections-heading">
          <div class="section-heading"><h2 id="collections-heading">Archive rooms</h2><span>Six fictional ways in</span></div>
          <div class="rail collection-rail">${collections.map(renderCollectionCard).join("")}</div>
        </section>
        <section class="section-block" aria-labelledby="continue-heading">
          <div class="section-heading"><h2 id="continue-heading">Continue watching</h2><span>Stored only on this device</span></div>
          <div class="rail">${continueWatching.map(renderFilmCard).join("")}</div>
        </section>
        <section class="section-block" aria-labelledby="recent-heading">
          <div class="section-heading"><h2 id="recent-heading">Recently added</h2><span>Synthetic catalogue entries</span></div>
          <div class="rail">${recentlyAdded.map(renderFilmCard).join("")}</div>
        </section>
      </div>`;
  }

  function renderBrowse() {
    view.className = "view";
    const active = collections.find((collection) => collection.id === state.activeCollection);
    if (active) {
      const matches = collectionFilms(active.title);
      view.innerHTML = `
        <header class="page-header">
          <div><p class="eyebrow">ARCHIVE ROOM</p><h1>${escapeHtml(active.title)}</h1><p class="page-header-copy">${escapeHtml(active.description)}</p></div>
          <div class="toolbar"><button class="button secondary" type="button" data-action="all-collections">← All collections</button></div>
        </header>
        <div class="content-grid">${matches.map(renderFilmCard).join("")}</div>`;
      return;
    }

    view.innerHTML = `
      <header class="page-header">
        <div><p class="eyebrow">EXPLORE THE FICTIONAL ARCHIVE</p><h1>Collections</h1><p class="page-header-copy">Six curated rooms, built from synthetic catalogue records and abstract artwork.</p></div>
        <div class="toolbar"><button class="button secondary" type="button" data-action="surprise">✦ Surprise me</button></div>
      </header>
      <div class="content-grid">${collections.map(renderCollectionCard).join("")}</div>
      <section class="section-block" aria-labelledby="all-memories-heading">
        <div class="section-heading"><h2 id="all-memories-heading">All preview memories</h2><span>${films.length} fictional records</span></div>
        <div class="content-grid">${films.map(renderFilmCard).join("")}</div>
      </section>`;
  }

  function renderSearch() {
    view.className = "view";
    view.innerHTML = `
      <header class="page-header">
        <div><p class="eyebrow">FIND A FICTIONAL MEMORY</p><h1>Search</h1><p class="page-header-copy">Search titles, years, places and archive rooms. Nothing leaves your browser.</p></div>
      </header>
      <div class="search-panel">
        <section class="search-box" aria-labelledby="search-label">
          <label id="search-label" for="archive-search">What would you like to revisit?</label>
          <div class="search-input-wrap"><span aria-hidden="true">⌕</span><input id="archive-search" type="search" inputmode="search" autocomplete="off" placeholder="Try ‘rain’, ‘2018’ or ‘garden’" value="${escapeHtml(state.query)}" /></div>
          <span class="recent-label">Try a theme</span>
          <div class="chips">
            <button class="chip" type="button" data-query="rain">Rainy days</button>
            <button class="chip" type="button" data-query="adventures">Small adventures</button>
            <button class="chip" type="button" data-query="new memories">New memories</button>
          </div>
        </section>
        <section class="search-results" aria-labelledby="results-title">
          <div id="search-results-content"></div>
        </section>
      </div>`;
    renderSearchResults();
    window.requestAnimationFrame(() => document.querySelector("#archive-search")?.focus());
  }

  function searchMatches() {
    const query = state.query.trim().toLocaleLowerCase();
    if (!query) return films;
    return films.filter((film) =>
      [film.title, film.year, film.place, film.collection, film.description]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query),
    );
  }

  function renderSearchResults() {
    const container = document.querySelector("#search-results-content");
    if (!container) return;
    const matches = searchMatches();
    container.innerHTML = `
      <div class="results-heading"><h2 id="results-title">${state.query ? "Search results" : "Browse everything"}</h2><span aria-live="polite">${matches.length} ${matches.length === 1 ? "match" : "matches"}</span></div>
      ${
        matches.length
          ? `<div class="search-results-grid">${matches.map(renderFilmCard).join("")}</div>`
          : `<div class="empty-state"><div><strong>No memories found</strong><span>Try a title, place, year or a broader theme.</span></div></div>`
      }`;
  }

  function renderTimeline() {
    view.className = "view";
    const sorted = [...films].sort((a, b) => a.year - b.year);
    const filtered = state.decade === "all" ? sorted : sorted.filter((film) => Math.floor(film.year / 10) * 10 === Number(state.decade));
    const decades = ["all", 1990, 2000, 2010, 2020];
    view.innerHTML = `
      <header class="page-header">
        <div><p class="eyebrow">THE PREVIEW, IN CHRONOLOGICAL ORDER</p><h1>Timeline</h1><p class="page-header-copy">Move through four fictional decades of small stories and synthetic archive records.</p></div>
      </header>
      <div class="timeline-controls" aria-label="Filter timeline by decade">
        ${decades
          .map(
            (decade) =>
              `<button class="decade-button ${String(state.decade) === String(decade) ? "active" : ""}" type="button" data-decade="${decade}" aria-pressed="${String(state.decade) === String(decade)}">${decade === "all" ? "All years" : `${decade}s`}</button>`,
          )
          .join("")}
      </div>
      <div class="timeline-list">
        ${filtered
          .map(
            (film, index) => `
            <button class="timeline-item" type="button" data-film="${film.id}">
              <span class="timeline-year">${film.year}</span>
              <span class="timeline-thumb ${paletteClass(film)}" aria-hidden="true"></span>
              <span class="timeline-copy"><small>${escapeHtml(film.place)} · ${durationLabel(film.duration)}</small><strong>${escapeHtml(film.title)}</strong><p>${escapeHtml(film.description)}</p></span>
              <span class="timeline-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            </button>`,
          )
          .join("")}
      </div>`;
  }

  function renderSaved() {
    view.className = "view";
    const savedFilms = films.filter((film) => state.saved.has(film.id));
    view.innerHTML = `
      <header class="page-header">
        <div><p class="eyebrow">YOUR LOCAL PREVIEW LIST</p><h1>Saved</h1><p class="page-header-copy">These choices live only in this browser and can be reset from the preview profile.</p></div>
      </header>
      ${
        savedFilms.length
          ? `<div class="content-grid">${savedFilms.map(renderFilmCard).join("")}</div>`
          : `<div class="empty-state"><div><strong>Nothing saved yet</strong><span>Open a fictional memory and tap Save to keep it here.</span><div class="hero-actions"><button class="button primary" type="button" data-route="browse">Explore collections</button></div></div></div>`
      }`;
  }

  function render() {
    state.activeView = routeFromHash();
    if (state.activeView !== "browse") state.activeCollection = null;

    document.querySelectorAll("[data-nav]").forEach((button) => {
      if (button.dataset.nav === state.activeView) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    const renderers = {
      home: renderHome,
      browse: renderBrowse,
      search: renderSearch,
      timeline: renderTimeline,
      saved: renderSaved,
    };
    renderers[state.activeView]();
    document.title = `${state.activeView === "home" ? "LeliBramBas+" : `${state.activeView[0].toUpperCase()}${state.activeView.slice(1)} — LeliBramBas+`} · Synthetic Preview`;
  }

  function navigate(route) {
    if (!validViews.has(route)) return;
    state.activeCollection = null;
    if (window.location.hash === `#${route}`) {
      state.activeView = route;
      render();
      document.querySelector("#main-content")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.location.hash = route;
    }
  }

  function captureFocusTarget(element = document.activeElement) {
    if (!(element instanceof HTMLElement)) return null;
    const attributes = ["data-film", "data-play", "data-route", "data-action", "data-collection"];
    for (const attribute of attributes) {
      const value = element.getAttribute(attribute);
      if (value === null) continue;
      const matches = [...document.querySelectorAll(`[${attribute}]`)].filter(
        (candidate) => candidate.getAttribute(attribute) === value,
      );
      return { attribute, value, index: Math.max(0, matches.indexOf(element)) };
    }
    return { element };
  }

  function restoreFocusTarget(target) {
    window.requestAnimationFrame(() => {
      let element = target?.element;
      if (!(element instanceof HTMLElement) || !document.contains(element)) {
        const matches = target?.attribute
          ? [...document.querySelectorAll(`[${target.attribute}]`)].filter(
              (candidate) => candidate.getAttribute(target.attribute) === target.value,
            )
          : [];
        element = matches[target?.index ?? 0] || matches[0];
      }
      if (element instanceof HTMLElement && !element.closest("dialog:not([open])")) element.focus();
    });
  }

  function showDialog(dialog, returnFocus = captureFocusTarget()) {
    state.lastFocus = returnFocus;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog, restoreFocus = true) {
    if (!dialog?.open) return;
    if (!restoreFocus) dialogsWithoutFocusRestore.add(dialog);
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function showDetails(film, returnFocus = captureFocusTarget()) {
    if (!film) return;
    const saved = state.saved.has(film.id);
    const progress = progressFor(film);
    detailsContent.innerHTML = `
      <article class="details-layout">
        <div class="detail-art ${paletteClass(film)}" aria-hidden="true"><span>${escapeHtml(film.place)}</span></div>
        <section class="details-copy">
          <button class="dialog-close" type="button" data-close="details" aria-label="Close details">×</button>
          <p class="eyebrow">SYNTHETIC CATALOGUE PLACEHOLDER</p>
          <h2 id="details-title">${escapeHtml(film.title)}</h2>
          <div class="metadata"><span>${film.year}</span><span>${durationLabel(film.duration)}</span><span>${escapeHtml(film.place)}</span><span class="format">16:9</span></div>
          <p class="description">${escapeHtml(film.description)}</p>
          <div class="details-actions">
            <button class="button primary" type="button" data-play="${film.id}">▶ ${progress > 0 && progress < 100 ? "Resume preview" : "Play preview"}</button>
            <button class="button ${saved ? "saved" : "secondary"}" type="button" data-save="${film.id}" aria-pressed="${saved}">${saved ? "♥ Saved" : "+ Save"}</button>
            <button class="button quiet" type="button" data-watched="${film.id}">${progress === 100 ? "✓ Watched" : "Mark watched"}</button>
          </div>
          <dl class="details-facts">
            <div><dt>Recorded</dt><dd>${escapeHtml(film.date)} ${film.year} (fictional)</dd></div>
            <div><dt>Archive room</dt><dd>${escapeHtml(film.collection)}</dd></div>
            <div><dt>Featuring</dt><dd>Fictional ensemble</dd></div>
            <div><dt>Preview note</dt><dd>${escapeHtml(film.note)}</dd></div>
          </dl>
        </section>
      </article>`;
    showDialog(detailsDialog, returnFocus);
    window.requestAnimationFrame(() => detailsDialog.querySelector("[data-close]")?.focus());
  }

  function toggleSaved(filmId) {
    const film = filmById(filmId);
    if (!film) return;
    if (state.saved.has(filmId)) {
      state.saved.delete(filmId);
      showToast(`${film.title} removed from Saved.`);
    } else {
      state.saved.add(filmId);
      showToast(`${film.title} saved on this device.`);
    }
    writeStorage();
    if (detailsDialog.open) showDetailsRefresh(film);
    if (!detailsDialog.open) render();
  }

  function showDetailsRefresh(film) {
    const returnFocus = state.lastFocus;
    const active = document.activeElement;
    const selector = active?.dataset?.save ? `[data-save="${film.id}"]` : active?.dataset?.watched ? `[data-watched="${film.id}"]` : null;
    const scrollTop = detailsDialog.scrollTop;
    closeDialog(detailsDialog, false);
    showDetails(film, returnFocus);
    detailsDialog.scrollTop = scrollTop;
    if (selector) window.requestAnimationFrame(() => detailsDialog.querySelector(selector)?.focus());
  }

  function markWatched(filmId) {
    const film = filmById(filmId);
    if (!film) return;
    state.progress[filmId] = 100;
    writeStorage();
    showToast(`${film.title} marked as watched.`);
    if (detailsDialog.open) showDetailsRefresh(film);
    else render();
  }

  function openPlayer(film) {
    if (!film) return;
    const returnFocus = detailsDialog.open ? state.lastFocus : captureFocusTarget();
    closeDialog(detailsDialog, false);
    state.currentFilm = film;
    state.playerPlaying = false;
    state.playerMuted = false;
    state.playerPosition = Math.round((progressFor(film) / 100) * film.duration * 60);
    if (state.playerPosition >= film.duration * 60) state.playerPosition = 0;
    renderPlayer();
    showDialog(playerDialog, returnFocus);
    window.requestAnimationFrame(() => playerDialog.querySelector("[data-player='toggle']")?.focus());
  }

  function renderPlayer() {
    const film = state.currentFilm;
    if (!film) return;
    const total = film.duration * 60;
    playerContent.innerHTML = `
      <section class="player-shell">
        <div class="player-visual ${paletteClass(film)} ${state.playerPlaying ? "playing" : ""}" aria-hidden="true"></div>
        <header class="player-topbar">
          <button class="dialog-close" type="button" data-close="player" aria-label="Close player">←</button>
          <div class="player-title-group"><strong id="player-title">${escapeHtml(film.title)}</strong><span>${escapeHtml(film.collection)} · ${film.year}</span></div>
          <span class="simulation-badge">Synthetic playback simulation</span>
        </header>
        <div class="player-controls">
          <input class="player-range" type="range" min="0" max="${total}" value="${state.playerPosition}" step="1" data-player="seek" aria-label="Playback position" aria-valuetext="${formatTime(state.playerPosition)} of ${formatTime(total)}" />
          <div class="player-times"><span data-player-time>${formatTime(state.playerPosition)}</span><span>${formatTime(total)}</span></div>
          <div class="player-buttons">
            <button class="round-control" type="button" data-player="back" aria-label="Rewind ten seconds">−10</button>
            <button class="round-control main" type="button" data-player="toggle" aria-label="${state.playerPlaying ? "Pause" : "Play"}">${state.playerPlaying ? "Ⅱ" : "▶"}</button>
            <button class="round-control" type="button" data-player="forward" aria-label="Forward ten seconds">+10</button>
            <button class="round-control" type="button" data-player="mute" aria-label="${state.playerMuted ? "Unmute" : "Mute"}">${state.playerMuted ? "Muted" : "Sound"}</button>
          </div>
        </div>
      </section>`;
  }

  function updatePlayerDom() {
    const film = state.currentFilm;
    if (!film || !playerDialog.open) return;
    const total = film.duration * 60;
    const range = playerDialog.querySelector("[data-player='seek']");
    const time = playerDialog.querySelector("[data-player-time]");
    if (range) {
      range.value = String(state.playerPosition);
      range.setAttribute("aria-valuetext", `${formatTime(state.playerPosition)} of ${formatTime(total)}`);
    }
    if (time) time.textContent = formatTime(state.playerPosition);
  }

  function setPlaying(playing) {
    state.playerPlaying = playing;
    if (state.playerTimer) window.clearInterval(state.playerTimer);
    state.playerTimer = null;
    if (playing) {
      state.playerTimer = window.setInterval(() => {
        const film = state.currentFilm;
        if (!film) return;
        const total = film.duration * 60;
        state.playerPosition = Math.min(total, state.playerPosition + 3);
        state.progress[film.id] = Math.round((state.playerPosition / total) * 1000) / 10;
        writeStorage();
        updatePlayerDom();
        if (state.playerPosition >= total) {
          setPlaying(false);
          renderPlayer();
          showToast("Preview complete.");
        }
      }, 1000);
    }
    renderPlayer();
    window.requestAnimationFrame(() => playerDialog.querySelector("[data-player='toggle']")?.focus());
  }

  function seekPlayer(deltaOrValue, absolute = false) {
    const film = state.currentFilm;
    if (!film) return;
    const total = film.duration * 60;
    state.playerPosition = Math.max(0, Math.min(total, absolute ? deltaOrValue : state.playerPosition + deltaOrValue));
    state.progress[film.id] = Math.round((state.playerPosition / total) * 1000) / 10;
    writeStorage();
    updatePlayerDom();
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
  }

  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  function resetDemo() {
    state.saved.clear();
    state.progress = {};
    writeStorage();
    closeDialog(profileDialog);
    render();
    showToast("Local preview activity reset.");
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;

    if (target.dataset.route) {
      navigate(target.dataset.route);
      return;
    }
    if (target.dataset.film) {
      showDetails(filmById(target.dataset.film));
      return;
    }
    if (target.dataset.play) {
      openPlayer(filmById(target.dataset.play));
      return;
    }
    if (target.dataset.save) {
      toggleSaved(target.dataset.save);
      return;
    }
    if (target.dataset.watched) {
      markWatched(target.dataset.watched);
      return;
    }
    if (target.dataset.collection) {
      state.activeCollection = target.dataset.collection;
      if (state.activeView !== "browse") window.location.hash = "browse";
      else renderBrowse();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target.dataset.query !== undefined) {
      state.query = target.dataset.query;
      const input = document.querySelector("#archive-search");
      if (input) input.value = state.query;
      renderSearchResults();
      input?.focus();
      return;
    }
    if (target.dataset.decade !== undefined) {
      state.decade = target.dataset.decade;
      renderTimeline();
      return;
    }
    if (target.dataset.close) {
      const dialog = target.closest("dialog");
      if (dialog === playerDialog) setPlaying(false);
      closeDialog(dialog);
      return;
    }
    if (target.dataset.player === "toggle") {
      setPlaying(!state.playerPlaying);
      return;
    }
    if (target.dataset.player === "back") {
      seekPlayer(-10);
      return;
    }
    if (target.dataset.player === "forward") {
      seekPlayer(10);
      return;
    }
    if (target.dataset.player === "mute") {
      state.playerMuted = !state.playerMuted;
      renderPlayer();
      window.requestAnimationFrame(() => playerDialog.querySelector("[data-player='mute']")?.focus());
      return;
    }
    if (target.dataset.action === "all-collections") {
      state.activeCollection = null;
      renderBrowse();
      return;
    }
    if (target.dataset.action === "surprise") {
      const randomFilm = films[Math.floor(Math.random() * films.length)];
      showDetails(randomFilm);
      return;
    }
    if (target.dataset.action === "profile") {
      showDialog(profileDialog);
      window.requestAnimationFrame(() => profileDialog.querySelector("[data-close]")?.focus());
      return;
    }
    if (target.dataset.action === "reset-demo") resetDemo();
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("#archive-search")) {
      state.query = event.target.value;
      renderSearchResults();
    }
    if (event.target.matches("[data-player='seek']")) seekPlayer(Number(event.target.value), true);
  });

  document.addEventListener("keydown", (event) => {
    const isInteractiveTarget =
      event.target instanceof HTMLElement &&
      event.target.matches("button, input, textarea, select, [contenteditable='true']");

    if (event.key === "Escape") {
      if (playerDialog.open) {
        setPlaying(false);
        closeDialog(playerDialog);
      } else if (detailsDialog.open) closeDialog(detailsDialog);
      else if (profileDialog.open) closeDialog(profileDialog);
    }
    if (
      !detailsDialog.open &&
      !playerDialog.open &&
      !profileDialog.open &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      event.key.toLowerCase() === "s" &&
      !isInteractiveTarget
    ) {
      event.preventDefault();
      navigate("search");
    }
    if (playerDialog.open && event.key === " " && !isInteractiveTarget) {
      event.preventDefault();
      setPlaying(!state.playerPlaying);
    }
    if (playerDialog.open && event.key === "ArrowLeft" && !event.target.matches("input[type='range']")) seekPlayer(-10);
    if (playerDialog.open && event.key === "ArrowRight" && !event.target.matches("input[type='range']")) seekPlayer(10);
  });

  [detailsDialog, playerDialog, profileDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("close", () => {
      const shouldRestoreFocus = !dialogsWithoutFocusRestore.has(dialog);
      dialogsWithoutFocusRestore.delete(dialog);
      if (dialog === playerDialog) {
        setPlaying(false);
        if (state.currentFilm) state.progress[state.currentFilm.id] = Math.round((state.playerPosition / (state.currentFilm.duration * 60)) * 1000) / 10;
        writeStorage();
        render();
      }
      if (shouldRestoreFocus) restoreFocusTarget(state.lastFocus);
    });
  });

  window.addEventListener("hashchange", () => {
    state.activeView = routeFromHash();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => {
      const focusTarget =
        state.activeView === "search"
          ? document.querySelector("#archive-search")
          : document.querySelector("#main-content");
      focusTarget?.focus({ preventScroll: true });
    });
  });

  if (!window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#home`);
  render();
})();
