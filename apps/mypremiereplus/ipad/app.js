import { films, account, icon, escapeHtml as h, formatTime, createViewerState, openPlayer } from '../../../assets/mypremiereplus/demo.js';

const platform = document.body.dataset.platform;
const tablet = platform === 'ipad';
const state = createViewerState(platform);
const root = document.querySelector('#preview');
const ui = { tab: 'home', search: '', filter: 'All', detail: null, detailStack: [] };
const featured = films.find(film => film.id === 'lake') || films[0];
const tabs = [['home', 'Home', 'home'], ['library', 'Library', 'library'], ['saved', 'Saved', 'bookmark'], ['search', 'Search', 'search']];
const categories = ['All', ...new Set(films.map(film => film.category))];
const find = id => films.find(film => film.id === id);
const button = (action, text, cls = '', extra = '') => `<button type="button" data-action="${action}" class="${cls}" ${extra}>${text}</button>`;
const metadata = film => `${h(film.year)} <span aria-hidden="true">·</span> ${formatTime(film.duration)} <span aria-hidden="true">·</span> ${h(film.category)}`;

function card(film) {
  return `<button type="button" class="film-card" data-action="details" data-id="${h(film.id)}" aria-label="More information about ${h(film.title)}"><span class="poster"><img src="${h(film.poster)}" alt="" loading="lazy" width="480" height="300" />${state.isSaved(film.id) ? `<span class="saved-mark" aria-label="Saved">${icon('bookmark', 15)}</span>` : ''}${state.progress(film.id) > 0 ? `<span class="progress-track"><span style="width:${Math.min(100, state.progress(film.id) / film.duration * 100)}%"></span></span>` : ''}</span><strong>${h(film.title)}</strong><small>${h(film.year)} · ${formatTime(film.duration)}</small></button>`;
}

function hero(film) {
  return `<section class="hero" aria-label="Featured film"><img src="${h(film.poster)}" alt="Generated landscape artwork for ${h(film.title)}" width="1200" height="750" /><div class="hero-copy"><span class="eyebrow">From your family archive</span><h2>${h(film.title)}</h2><p class="meta">${metadata(film)}</p>${tablet ? `<p class="hero-description">${h(film.description)}</p>` : ''}<div class="actions">${button('play', `${icon('play', 18)} Watch film`, 'primary', `data-id="${h(film.id)}"`)}${button('details', tablet ? 'More information' : `${icon('film', 20)}<span class="sr-only">More information</span>`, 'secondary', `data-id="${h(film.id)}" aria-label="More information about ${h(film.title)}"`)}</div></div></section>`;
}

function home() {
  const continued = films.filter(film => state.progress(film.id) > 0 && state.progress(film.id) < film.duration - 1);
  return `<div class="welcome"><span class="eyebrow">${h(account.archive)}</span><h1>Your stories.${tablet ? ' ' : '<br />'}Your cinema.</h1><p>${tablet ? 'The best seat is the one together.' : 'A little closer, every time you watch.'}</p></div>${hero(featured)}${continued.length ? `<section class="film-section"><h2>Continue watching</h2><div class="film-grid">${continued.map(card).join('')}</div></section>` : ''}<section class="film-section"><div class="section-heading"><h2>Family favourites</h2>${button('tab', 'See all', 'text-button', 'data-tab="library"')}</div><div class="film-grid">${films.slice(0, 4).map(card).join('')}</div></section><p class="demo-note">A fictional cinema, made for exploring. Artwork is generated; films play an 8-second silent illustrated sample.</p>`;
}

function results() {
  const term = ui.search.trim().toLowerCase();
  const matching = films.filter(film => (ui.tab !== 'saved' || state.isSaved(film.id)) && (ui.filter === 'All' || film.category === ui.filter) && (!term || `${film.title} ${film.description} ${film.year} ${film.category}`.toLowerCase().includes(term)));
  return matching.length ? `<div class="film-grid results-grid">${matching.map(card).join('')}</div>` : `<div class="empty-state">${icon(ui.tab === 'saved' ? 'bookmark' : 'search', 38)}<h2>${ui.tab === 'saved' && !term && ui.filter === 'All' ? 'Keep a little something for later.' : 'No films found'}</h2><p>${ui.tab === 'saved' && !term && ui.filter === 'All' ? 'Open a film and choose Save film. Your saved titles stay in this browser.' : 'Try another title, year or category.'}</p>${button('clear', 'Show all films', 'secondary')}</div>`;
}

function catalogue() {
  const heading = ui.tab === 'saved' ? 'Your saved films' : ui.tab === 'search' ? 'Find a memory.' : 'Your library.';
  return `<div class="catalogue-heading"><span class="eyebrow">${h(account.archive)}</span><h1>${heading}</h1><p>${ui.tab === 'saved' ? 'For your next quiet evening.' : 'Small moments. Worth another watch.'}</p><label class="search-box">${icon('search', 20)}<span class="sr-only">Search films</span><input id="film-search" type="search" placeholder="Search titles, years, places…" autocomplete="off" value="${h(ui.search)}" /></label><div class="filters" aria-label="Filter by category">${categories.map(category => button('filter', h(category), `filter${ui.filter === category ? ' selected' : ''}`, `data-filter="${h(category)}" aria-pressed="${ui.filter === category}"`)).join('')}</div></div><div id="results" aria-live="polite">${results()}</div>`;
}

function details(film) {
  return `<div class="detail-view"><div class="detail-art"><img src="${h(film.poster)}" alt="Generated landscape artwork for ${h(film.title)}" width="1200" height="750" />${button('back', `${icon('back', 21)} Back`, 'back-button')}</div><div class="detail-copy"><span class="eyebrow">From your family archive</span><h1 tabindex="-1" id="detail-heading">${h(film.title)}</h1><p class="meta">${metadata(film)}</p><p class="description">${h(film.description)}</p><div class="actions">${button('play', `${icon('play', 18)} ${state.progress(film.id) > 0 ? 'Resume film' : 'Watch film'}`, 'primary', `data-id="${h(film.id)}"`)}${button('save', `${icon(state.isSaved(film.id) ? 'check' : 'bookmark', 18)} ${state.isSaved(film.id) ? 'Saved' : 'Save film'}`, 'secondary', `data-id="${h(film.id)}" aria-pressed="${state.isSaved(film.id)}"`)}</div><p class="demo-note">This fictional title plays an 8-second silent illustrated sample. It contains no private family footage.</p><section class="film-section"><h2>More to discover</h2><div class="film-grid">${films.filter(item => item.id !== film.id).slice(0, tablet ? 3 : 2).map(card).join('')}</div></section></div></div>`;
}

function navigation() {
  return `<nav class="${tablet ? 'sidebar-nav' : 'tabbar'}" aria-label="Cinema navigation">${tabs.map(([id, label, symbol]) => button('tab', `${icon(symbol, 22)}<span>${label}</span>`, `nav-item${ui.tab === id ? ' active' : ''}`, `data-tab="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}`)).join('')}</nav>`;
}

function render() {
  root.innerHTML = `<div class="preview-shell"><header class="preview-header"><a class="preview-brand" href="../../../mypremiereplus/">${icon('film', 25)}<span>MyPremiere+<small>${tablet ? 'iPad' : 'iPhone'} · interactive demo</small></span></a><div class="preview-links"><a href="../../../mypremiereplus.html">Case study</a>${button('reset', 'Reset demo', 'reset-demo')}</div></header>${!tablet ? `<aside class="preview-aside"><span class="preview-eyebrow">iPhone · browser prototype</span><h1>Your family cinema.<br />Always with you.</h1><p>An intimate home for the stories that only your family could tell.</p><div class="preview-description"><span class="fixed-account">${icon('check', 17)} Everyone · demo viewer</span><p>Browse the library, save a film and settle in for a short sample. One fictional account, ready to explore.</p><a href="../../../mypremiereplus/">Explore all three designs ${icon('arrow', 17)}</a></div><p class="preview-footnote">Touch or click to explore. Escape goes back.<br />A browser design study with synthetic artwork.</p></aside>` : `<div class="tablet-heading"><h1>A little more room for your stories.</h1><p>A familiar cinema, with space to explore.</p></div>`}<div class="device ${tablet ? 'tablet' : 'phone'}"><div class="app">${!tablet ? '<div class="island" aria-hidden="true"></div>' : ''}<div class="statusbar" aria-hidden="true"><span>9:41${tablet ? '<small> Sunday cinema</small>' : ''}</span><span class="signals">◔ ▰</span></div><div class="app-layout">${tablet ? `<aside class="sidebar"><div class="archive-brand">${icon('film', 26)}<span>${h(account.archive)}<small>Your family cinema</small></span></div><span class="sidebar-label">Watch</span>${navigation()}<div class="sidebar-profile"><span class="avatar">E</span><span>${h(account.name)}<small>Demo viewer</small></span></div></aside>` : ''}<div class="main-pane"><div class="app-topbar"><span>${tablet ? h(tabs.find(([id]) => id === ui.tab)[1]) : h(account.archive)}</span><span class="avatar" title="Everyone · fixed fictional demo account" aria-label="Everyone, demo viewer">E</span></div><main class="screen" id="cinema-content" aria-label="${tablet ? 'iPad' : 'iPhone'} cinema">${ui.detail ? details(find(ui.detail)) : ui.tab === 'home' ? home() : catalogue()}</main>${!tablet ? navigation() : ''}</div></div><div class="home-indicator" aria-hidden="true"></div></div></div><footer class="preview-footer">Fictional catalogue · Generated artwork · Short sample playback <a href="../../../mypremiereplus/">All demos</a></footer></div>`;
}

function back() {
  if (ui.detail) {
    const previous = ui.detailStack.pop() || { detail: null, tab: ui.tab, focus: '.nav-item.active', scroll: 0 };
    ui.detail = previous.detail; ui.tab = previous.tab;
    render();
    const screen = root.querySelector('.screen');
    screen.scrollTop = previous.scroll;
    (root.querySelector(previous.focus) || root.querySelector('.nav-item.active'))?.focus({ preventScroll: true });
  } else if (ui.tab !== 'home') {
    ui.tab = 'home'; ui.search = ''; ui.filter = 'All'; render();
    root.querySelector('.nav-item.active')?.focus();
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('button[data-action]');
  if (!target) return;
  const { action, id, tab, filter } = target.dataset;
  if (action === 'tab') {
    ui.tab = tab; ui.detail = null; ui.detailStack = []; ui.search = ''; ui.filter = 'All'; render();
    if (tab === 'search') root.querySelector('#film-search')?.focus();
    else root.querySelector(`.nav-item[data-tab="${tab}"]`)?.focus();
  } else if (action === 'details') {
    ui.detailStack.push({ detail: ui.detail, tab: ui.tab, focus: `[data-action="details"][data-id="${id}"]`, scroll: root.querySelector('.screen').scrollTop });
    ui.detail = id; render(); root.querySelector('#detail-heading')?.focus({ preventScroll: true });
  } else if (action === 'back') back();
  else if (action === 'play') {
    const film = find(id);
    openPlayer(film, { startAt: state.progress(id), onProgress: seconds => state.setProgress(id, seconds), onClose: () => { render(); root.querySelector(`[data-action="play"][data-id="${id}"]`)?.focus(); } });
  } else if (action === 'save') {
    state.toggleSaved(id); render(); root.querySelector('[data-action="save"]')?.focus();
  } else if (action === 'filter') {
    ui.filter = filter; render(); root.querySelector(`[data-filter="${filter}"]`)?.focus();
  } else if (action === 'clear') {
    ui.tab = 'library'; ui.filter = 'All'; ui.search = ''; render(); root.querySelector('#film-search')?.focus();
  } else if (action === 'reset') {
    state.reset(); ui.tab = 'home'; ui.detail = null; ui.detailStack = []; ui.search = ''; ui.filter = 'All'; render(); root.querySelector('.reset-demo')?.focus();
  }
});
root.addEventListener('input', event => {
  if (event.target.id !== 'film-search') return;
  ui.search = event.target.value;
  root.querySelector('#results').innerHTML = results();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); back(); }
});
render();
