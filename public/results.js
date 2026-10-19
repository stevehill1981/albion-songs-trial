import {perspective, filterMatches, summarize, parseCurrentFeed, mergeCurrent, filtersFromQuery, queryForFilters} from './results-core.mjs';

const form = document.querySelector('#result-filters');
const body = document.querySelector('#result-rows');
const status = document.querySelector('#result-status');
const summary = document.querySelector('#result-summary');
const pager = document.querySelector('#result-pagination');
const refresh = document.querySelector('#refresh-results');
const freshness = document.querySelector('#feed-status');
const formatDate = value => new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${value}T12:00:00Z`));
const pageSize = 30;
let archive;
let page = 0;
let filtered = [];
let seasonManuallyChanged = false;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function readFilters() { return Object.fromEntries(new FormData(form)); }
function latestIncluded() {
  document.querySelector('#latest-included').textContent = formatDate(archive.matches.at(-1).date);
}
function render() {
  filtered = filterMatches(archive.matches, readFilters());
  const totals = summarize(filtered);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages - 1);
  const start = page * pageSize;
  const fragment = document.createDocumentFragment();
  for (const match of filtered.slice(start, start + pageSize)) {
    const p = perspective(match);
    const row = element('tr');
    const dateCell = element('td');
    const time = element('time', formatDate(match.date));
    time.dateTime = match.date;
    dateCell.append(time);
    const opponent = element('td');
    opponent.append(element('strong', p.opponent));
    let detail = match.competitionDetail || match.competition;
    if (match.aet) detail += ' · after extra time';
    if (match.pens) detail += ` · pens ${match.pens[0]}–${match.pens[1]} (home–away)`;
    opponent.append(element('span', detail, 'match-meta'));
    if (match.note) opponent.append(element('span', match.note, 'match-meta'));
    const venue = element('td', p.venue);
    venue.title = {H: 'Home', A: 'Away', N: 'Neutral'}[p.venue];
    const score = element('td', `${p.gf}–${p.ga}`, 'ledger-score');
    const outcome = element('td');
    const mark = element('span', p.outcome, `result-mark result-${p.outcome.toLowerCase()}`);
    mark.setAttribute('aria-label', {W: 'Albion win', D: 'Draw', L: 'Albion loss'}[p.outcome]);
    outcome.append(mark);
    const source = element('td');
    const link = element('a', 'Source');
    link.href = archive.sources[match.source].url;
    link.setAttribute('aria-label', `Source for ${p.opponent} on ${formatDate(match.date)}`);
    source.append(link);
    row.append(dateCell, opponent, venue, score, outcome, source);
    fragment.append(row);
  }
  if (!filtered.length) {
    const row = element('tr');
    const cell = element('td', 'No included results match these filters. Try another opponent or choose All seasons.', 'empty-results');
    cell.colSpan = 6;
    row.append(cell);
    fragment.append(row);
  }
  body.replaceChildren(fragment);
  status.textContent = filtered.length ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length.toLocaleString('en-GB')} included matches.` : 'No matching results.';
  summary.textContent = `${totals.played.toLocaleString('en-GB')} played · ${totals.W} won · ${totals.D} drawn · ${totals.L} lost · Goals ${totals.gf}–${totals.ga}`;
  document.querySelector('#result-page').textContent = `Page ${page + 1} of ${pages}`;
  document.querySelector('#previous-results').disabled = page === 0;
  document.querySelector('#next-results').disabled = page + 1 >= pages;
  pager.hidden = filtered.length <= pageSize;
}
function updateQuery() {
  const query = queryForFilters(readFilters());
  history.replaceState(null, '', `${location.pathname}?${query}${location.hash}`);
}
function updateRivalryRecords() {
  document.querySelectorAll('[data-rival-record]').forEach(node => {
    const totals = summarize(archive.matches.filter(match => perspective(match).opponent === node.dataset.rivalRecord));
    node.textContent = `In this archive: ${totals.played} meetings · Albion ${totals.W} wins · ${totals.D} draws · ${totals.L} defeats.`;
  });
}
async function checkForUpdates() {
  refresh.disabled = true;
  refresh.textContent = 'Checking free source…';
  try {
    const year = Number(archive.currentSeason.slice(0, 4));
    const now = new Date();
    const realSeason = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
    if (year !== realSeason) throw new Error('This archive needs a new-season review. Saved results remain available.');
    const url = `https://raw.githubusercontent.com/openfootball/football.json/master/${archive.currentSeason}/en.2.json`;
    const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('Free source unavailable');
    const incoming = parseCurrentFeed(await response.json(), archive.currentSeason, now.toISOString().slice(0, 10));
    const before = archive.matches.length;
    const merged = mergeCurrent(archive.matches, incoming);
    archive.sources['free-current'] = {url};
    archive.matches = merged;
    const count = merged.length - before;
    const latestFeed = incoming.map(match => match.date).sort().at(-1);
    const checked = new Intl.DateTimeFormat('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London'}).format(new Date());
    freshness.textContent = `Free feed checked ${checked} (UK). ${count ? `${count} new result${count === 1 ? '' : 's'} added for this visit.` : 'No newer results supplied.'} Feed includes league results through ${formatDate(latestFeed)}; separately checked results may be newer.`;
    render();
    updateRivalryRecords();
    latestIncluded();
  } catch (error) {
    freshness.textContent = 'The free feed could not be applied. The saved archive is still shown. Try again later or follow Albion’s official reports below.';
    console.info('Albion results update retained the saved archive:', error.message);
  } finally {
    refresh.disabled = false;
    refresh.textContent = 'Check for updates';
  }
}

try {
  const response = await fetch('/data/results.json');
  if (!response.ok) throw new Error('Local archive unavailable');
  archive = await response.json();
  if (!archive.matches?.length || !archive.sources || !archive.currentSeason) throw new Error('Invalid local archive');
  const select = form.elements.season;
  for (const value of [...new Set(archive.matches.map(match => match.season))].sort().reverse()) select.append(new Option(value.replace('-', '/'), value));
  select.value = archive.currentSeason;
  const opponents = [...new Set(archive.matches.map(match => perspective(match).opponent))].sort();
  const suggestions = document.querySelector('#opponent-suggestions');
  opponents.forEach(value => { const option = element('option'); option.value = value; suggestions.append(option); });
  for (const [name, value] of Object.entries(filtersFromQuery(location.search, archive.currentSeason))) form.elements[name].value = value;
  document.querySelector('#snapshot-checked').textContent = new Intl.DateTimeFormat('en-GB', {dateStyle: 'long', timeZone: 'Europe/London'}).format(new Date(archive.checkedAt));
  document.querySelector('#archive-size').textContent = archive.matches.length.toLocaleString('en-GB');
  form.hidden = false;
  refresh.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    if (event.target.name === 'season') seasonManuallyChanged = true;
    // A named opponent starts a head-to-head across every included season.
    if (event.target.name === 'opponent' && !seasonManuallyChanged) select.value = '';
    page = 0;
    render();
    updateQuery();
  });
  form.addEventListener('reset', event => {
    event.preventDefault();
    for (const control of form.elements) if (control.name) control.value = '';
    select.value = archive.currentSeason;
    seasonManuallyChanged = false;
    page = 0;
    render();
    updateQuery();
  });
  for (const [id, delta] of [['previous-results', -1], ['next-results', 1]]) document.querySelector(`#${id}`).addEventListener('click', () => {page += delta; render(); document.querySelector('#ledger-heading').focus();});
  refresh.addEventListener('click', checkForUpdates);
  document.querySelectorAll('[data-rival-filter]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    form.reset();
    queueMicrotask(() => {form.elements.opponent.value = link.dataset.rivalFilter; select.value = ''; page = 0; render(); updateQuery(); document.querySelector('#ledger-heading').focus(); document.querySelector('#ledger').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});});
  }));
  render();
  updateRivalryRecords();
  latestIncluded();
  checkForUpdates();
} catch (error) {
  freshness.textContent = 'The interactive archive could not load. Saved current-season results below and the complete CSV download remain available.';
  console.info('Albion results fallback:', error.message);
}
