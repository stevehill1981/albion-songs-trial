import {filterMatches, summarize, filtersFromQuery, queryForFilters} from './results-core.mjs';

const form = document.querySelector('#wartime-filters');
const status = document.querySelector('#wartime-status');
const summary = document.querySelector('#wartime-summary');
const pager = document.querySelector('#wartime-pagination');
const rows = [...document.querySelectorAll('#wartime-rows tr')];
const pageSize = 30;
let page = 0;
try {
  const response = await fetch('/data/wartime-results.json');
  if (!response.ok) throw new Error('Wartime file unavailable');
  const archive = await response.json();
  const retainedRows = new Map(rows.map(row => [row.dataset.matchId, row.dataset.evidenceStatus]));
  if (!archive.matches?.length || archive.matches.length !== rows.length || !archive.matches.every(match => retainedRows.get(match.id) === match.evidenceStatus)) throw new Error('Wartime table and dataset disagree');
  for (const name of ['season', 'competition']) {
    const values = [...new Set(archive.matches.map(m => m[name]))].sort();
    if (name === 'season') values.reverse();
    for (const value of values) form.elements[name].append(new Option(name === 'season' ? value.replace('-', '/') : value, value));
  }
  const selected = filtersFromQuery(location.search, '');
  for (const name of ['season', 'opponent', 'competition']) form.elements[name].value = selected[name];
  function render(updateURL = false) {
    const filters = Object.fromEntries(new FormData(form));
    const matches = filterMatches(archive.matches, filters);
    const totals = summarize(matches);
    const singles = matches.filter(match => match.evidenceStatus === 'single-source').length;
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.min(page, pages - 1);
    const start = page * pageSize;
    const visible = new Set(matches.slice(start, start + pageSize).map(m => m.id));
    for (const row of rows) row.hidden = !visible.has(row.dataset.matchId);
    document.querySelector('#wartime-empty').hidden = matches.length > 0;
    summary.textContent = `Wartime only: ${totals.played} played · ${totals.W} won · ${totals.D} drawn · ${totals.L} lost · Goals ${totals.gf}–${totals.ga}${singles ? ` · ${singles} single-source` : ''}`;
    status.textContent = matches.length ? `Showing ${start + 1}–${Math.min(start + pageSize, matches.length)} of ${matches.length} included wartime matches.` : 'No matching wartime results.';
    document.querySelector('#wartime-page').textContent = `Page ${page + 1} of ${pages}`;
    document.querySelector('#wartime-previous').disabled = page === 0;
    document.querySelector('#wartime-next').disabled = page + 1 >= pages;
    pager.hidden = matches.length <= pageSize;
    if (updateURL) history.replaceState(null, '', `${location.pathname}?${queryForFilters(filters)}${location.hash}`);
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => {page = 0; render(true);});
  form.addEventListener('reset', event => {
    event.preventDefault();
    for (const name of ['season', 'opponent', 'competition']) form.elements[name].value = '';
    page = 0;
    render(true);
  });
  for (const [id, delta] of [['wartime-previous', -1], ['wartime-next', 1]]) document.querySelector(`#${id}`).addEventListener('click', () => {
    page += delta;
    render();
    document.querySelector('#wartime-heading').focus();
  });
  render();
  form.hidden = false;
} catch (error) {
  for (const row of rows) row.hidden = false;
  document.querySelector('#wartime-empty').hidden = true;
  form.hidden = true;
  pager.hidden = true;
  summary.textContent = 'All included wartime records are shown below; single-source results are labelled.';
  status.textContent = 'The filters could not load. All saved rows remain readable, or download the wartime CSV.';
  console.info('Wartime archive retained readable HTML:', error.message);
}
