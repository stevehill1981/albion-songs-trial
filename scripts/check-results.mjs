import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ALBION, matchKey, perspective, filterMatches, summarize, parseCurrentFeed, mergeCurrent, filtersFromQuery, queryForFilters} from '../public/results-core.mjs';

const archive = JSON.parse(readFileSync(new URL('../public/data/results.json', import.meta.url), 'utf8'));
const matches = archive.matches;
assert(matches.length > 5700, 'The archive must not silently become a small selection');
assert.equal(new Set(matches.map(match => match.id)).size, matches.length);
for (const match of matches) {
  assert.equal(match.id, matchKey(match));
  assert([match.home, match.away].includes(ALBION));
  assert(archive.sources[match.source]?.url, 'Every row must retain its provenance');
  assert.equal(new Date(`${match.date}T12:00Z`).toISOString().slice(0, 10), match.date);
}
assert.equal(filterMatches(matches, {season: '1888-89', competition: 'League'}).length, 22, 'First Football League season had 22 Albion matches');
assert.equal(filterMatches(matches, {season: '1919-20', competition: 'League'}).length, 42, 'Title season had 42 league matches');
assert.equal(filterMatches(matches, {season: '2025-26', competition: 'League'}).length, 46, 'Completed Championship season must have all 46 league results');
assert.equal(filterMatches(matches, {competition: 'Europe'}).length, 22, 'Major European competition coverage');

const expectedLeagueYears = [...Array.from({length: 27}, (_, i) => 1888 + i), ...Array.from({length: 20}, (_, i) => 1919 + i), ...Array.from({length: 81}, (_, i) => 1946 + i)];
assert.deepEqual([...new Set(matches.filter(m => m.competition === 'League').map(m => Number(m.season.slice(0, 4))))].sort((a, b) => a - b), expectedLeagueYears, 'Every expected Football League season must be present; wars are explicit gaps');
for (const year of expectedLeagueYears.filter(year => year < 2026)) {
  const rows = filterMatches(matches, {season: `${year}-${String(year + 1).slice(2)}`, competition: 'League'});
  const opponents = new Map();
  for (const match of rows) {
    const projected = perspective(match);
    const venues = opponents.get(projected.opponent) || [];
    venues.push(projected.venue);
    opponents.set(projected.opponent, venues);
  }
  for (const [opponent, venues] of opponents) assert.deepEqual(venues.sort(), ['A', 'H'], `${year}: Albion must play ${opponent} once home and once away`);
}

const firstLeague = matches.find(match => match.date === '1888-09-08' && match.competition === 'League');
assert.deepEqual(perspective(firstLeague), {opponent: 'Stoke City', venue: 'A', gf: 2, ga: 0, outcome: 'W'});
const final1968 = matches.find(match => match.date === '1968-05-18' && match.competition === 'FA Cup');
assert.equal(perspective(final1968).gf, 1);
assert.equal(perspective(final1968).ga, 0);
assert.equal(perspective(final1968).venue, 'N');
assert(final1968.aet, 'Astle final was settled in extra time');
const villa2019 = matches.find(match => match.date === '2019-05-14');
assert.equal(perspective(villa2019).outcome, 'W', 'Shootout must not erase an individual match win');
assert.deepEqual(villa2019.pens, [3, 4]);
assert.equal(perspective(matches.find(match => match.date === '2007-05-16')).venue, 'H', 'Hawthorns playoff semi-final was not neutral');
const swansea = matches.find(match => match.date === '2026-01-11');
assert.deepEqual(swansea.pens, [5, 6]);
assert.equal(perspective(swansea).outcome, 'D', 'A shootout is distinct from the level match score');
const wolves = filterMatches(matches, {opponent: 'Wolves'});
assert(wolves.length > 100);
assert(wolves.every(match => perspective(match).opponent === 'Wolverhampton Wanderers'));
const summary = summarize(wolves);
assert.equal(summary.W + summary.D + summary.L, wolves.length);
assert.equal(summary.gf + summary.ga, wolves.reduce((total, match) => total + match.hg + match.ag, 0), 'Home/away projection must preserve total goals');
assert.equal(filterMatches(matches, {season: '1888-89', opponent: 'Nonexistent opponent'}).length, 0);
assert.equal(filtersFromQuery('', '2026-27').season, '2026-27');
assert.equal(filtersFromQuery('?opponent=Aston+Villa', '2026-27').season, '', 'Direct rivalry links must include every season');
for (const selected of [
  {season: '', opponent: '', competition: '', venue: '', outcome: ''},
  {season: '', opponent: 'Aston Villa', competition: '', venue: 'A', outcome: 'W'},
  {season: '1888-89', opponent: '', competition: 'League', venue: '', outcome: ''},
  {season: '2026-27', opponent: '', competition: '', venue: '', outcome: ''}
]) {
  const restored = filtersFromQuery(queryForFilters(selected), '2026-27');
  assert.deepEqual(restored, selected, 'Reloading a shared URL must preserve the complete filter state');
  assert.deepEqual(filterMatches(matches, restored), filterMatches(matches, selected));
}
const payload = {name: 'English Championship 2026/27', matches: [
  {date: '2026-08-15', team1: 'Norwich City FC', team2: `${ALBION} FC`, score: {ft: [1, 2]}},
  {date: '2026-08-23', team1: `${ALBION} FC`, team2: 'Burnley FC', score: [0, 0]},
  {date: '2027-03-10', team1: `${ALBION} FC`, team2: 'Watford FC'}
]};
const parsed = parseCurrentFeed(payload, '2026-27', '2026-10-19');
assert.equal(parsed.length, 2, 'Fixtures without a final score are not results; zero-zero draws are results');
assert.equal(perspective(parsed[1]).outcome, 'D');
const saved = matches.filter(match => match.season === '2026-27');
const one = parseCurrentFeed({...payload, matches: [payload.matches[0]]}, '2026-27', '2026-10-19');
assert.deepEqual(mergeCurrent(saved, one), [...saved].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)), 'Stale or partial source must preserve every saved match');
const added = {...one[0], date: '2026-10-18', home: ALBION, away: 'Portsmouth', hg: 2, ag: 0};
added.id = matchKey(added);
assert.equal(mergeCurrent(saved, [added]).length, saved.length + 1, 'A valid new completed result is appended');
const badScore = {...one[0], hg: 9};
assert.throws(() => mergeCurrent(saved, [badScore]), /disagrees/);
assert.throws(() => mergeCurrent(saved, []), /Empty/);
for (const broken of [
  {name: 'Wrong season', matches: payload.matches},
  {name: payload.name, matches: []},
  {...payload, matches: [{...payload.matches[0], score: {ft: [-1, 0]}}]},
  {...payload, matches: [{...payload.matches[0], date: '2026-02-30'}]},
  {...payload, matches: [{...payload.matches[0], date: '2026-02-01'}]},
  {...payload, matches: [{...payload.matches[0], date: '2027-01-01'}]},
  {...payload, matches: [payload.matches[0], payload.matches[0]]}
]) assert.throws(() => parseCurrentFeed(broken, '2026-27', '2026-10-19'), 'Malformed, future, duplicate and empty feeds must fail');
console.log(`PASS: ${matches.length.toLocaleString('en-GB')} sourced matches; season counts, neutral grounds, extra time, shootouts, filters and score projections agree.`);
console.log('PASS: free updates add completed results, preserve newer saved records and reject conflicting, malformed, future, empty and duplicate feeds.');

const cups = JSON.parse(readFileSync(new URL('../test/fixtures/verified-cups.json', import.meta.url), 'utf8'));
const cupRows = matches.filter(m => m.source.startsWith('gap-cup-'));
assert(cupRows.length >= 53);
assert(cupRows.length >= cups.matches.length);
for (const row of cups.matches) {
  const included = matches.find(m => m.id === matchKey(row));
  assert(included, 'Every verified cup record must survive import');
  assert.deepEqual([included.hg, included.ag, included.pens, included.aet], [row.hg, row.ag, row.pens, row.aet]);
  assert(filterMatches(matches, {competition: row.competition}).some(m => m.id === included.id), 'Named cup filter must find its rows');
}
assert(filterMatches(matches, {competition: 'League'}).length >= 5151, 'Existing league coverage must survive additions');
assert.equal(matches.some(m => m.date === '1976-08-11' && m.competition === 'Anglo-Scottish Cup'), false, 'Disputed date stays deferred');
const watney = cupRows.find(m => m.date === '1971-08-07');
assert.deepEqual(watney.pens, [3, 4]);
assert.equal(watney.aet, false, 'Watney final used a shootout after 90 minutes');
const blues = cupRows.find(m => m.date === '1996-01-30');
assert.equal(perspective(blues).venue, 'A');
assert.deepEqual(blues.pens, [1, 4], 'Penalties retain home-away order');
assert.equal(perspective(blues).outcome, 'D');
const historical = JSON.parse(readFileSync(new URL('../protected/historical-results.json', import.meta.url), 'utf8')).matches;
assert.deepEqual(historical.map(m => [m.date, perspective(m).gf, perspective(m).ga, perspective(m).venue]), [['1939-08-26', 2, 1, 'A'], ['1939-08-28', 3, 3, 'A'], ['1939-09-02', 3, 4, 'H']]);
assert.equal(matches.filter(m => m.season === '1939-40').length, 0, 'Annulled fixtures must never enter competitive or rivalry totals');
const page = readFileSync(new URL('../build/results.html', import.meta.url), 'utf8');
for (const cup of new Set(cupRows.map(m => m.competition))) assert(page.includes(`<option>${cup}</option>`), 'Every included cup must be selectable');
const historicalMarkup = page.split('<!-- HISTORICAL:START -->')[1].split('<!-- HISTORICAL:END -->')[0];
assert.equal((historicalMarkup.match(/<tr>/g) || []).length, historical.length);
for (const m of historical) assert(historicalMarkup.includes(`datetime="${m.date}"`));
assert.equal(readFileSync(new URL('../public/data/historical-results.csv', import.meta.url), 'utf8').trim().split('\n').length, historical.length + 1);
console.log('PASS: 53 verified cup additions, named filters, penalty conventions and separate annulled appendix; league totals unchanged.');
