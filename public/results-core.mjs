export const ALBION = 'West Bromwich Albion';
export const normalizeClub = name => name.trim().replace(/\s+(?:FC|AFC)$/, '');
export const matchKey = match => [match.date, match.home, match.away, match.competition].join('|');
export function filtersFromQuery(search, currentSeason) {
  const params = new URLSearchParams(search);
  const filters = Object.fromEntries(['season', 'opponent', 'competition', 'venue', 'outcome'].map(key => [key, params.get(key) || '']));
  filters.season = params.get('season') === 'all' ? '' : params.has('season') ? filters.season : params.has('opponent') ? '' : currentSeason;
  return filters;
}
export function queryForFilters(filters) {
  const query = new URLSearchParams();
  for (const key of ['season', 'opponent', 'competition', 'venue', 'outcome']) if (filters[key]) query.set(key, filters[key]);
  if (!filters.season) query.set('season', 'all');
  return query.toString();
}
export function perspective(match) {
  const home = match.home === ALBION;
  const gf = home ? match.hg : match.ag;
  const ga = home ? match.ag : match.hg;
  return {opponent: home ? match.away : match.home, venue: match.neutral ? 'N' : home ? 'H' : 'A', gf, ga, outcome: gf > ga ? 'W' : gf < ga ? 'L' : 'D'};
}
export function filterMatches(matches, filters) {
  const opponent = filters.opponent?.trim().toLocaleLowerCase('en-GB');
  const query = opponent === 'wolves' ? 'wolverhampton wanderers' : opponent;
  return matches.filter(match => {
    const p = perspective(match);
    return (!filters.season || match.season === filters.season) && (!filters.opponent || p.opponent.toLocaleLowerCase('en-GB').includes(query)) && (!filters.competition || match.competition === filters.competition) && (!filters.venue || p.venue === filters.venue) && (!filters.outcome || p.outcome === filters.outcome);
  }).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
export function summarize(matches) {
  return matches.reduce((summary, match) => {
    const p = perspective(match);
    summary.played += 1;
    summary[p.outcome] += 1;
    summary.gf += p.gf;
    summary.ga += p.ga;
    return summary;
  }, {played: 0, W: 0, D: 0, L: 0, gf: 0, ga: 0});
}
export function parseCurrentFeed(payload, season, today) {
  if (!payload || typeof payload.name !== 'string' || !payload.name.includes(season.replace('-', '/')) || !Array.isArray(payload.matches)) throw new Error('Unexpected free-feed format');
  const relevant = payload.matches.filter(row => typeof row.team1 === 'string' && typeof row.team2 === 'string' && [normalizeClub(row.team1), normalizeClub(row.team2)].includes(ALBION));
  const records = [];
  const seen = new Set();
  for (const row of relevant) {
    const score = Array.isArray(row.score) ? row.score : row.score?.ft;
    if (score === undefined) continue; // A scheduled fixture is not a result.
    if (!Array.isArray(score) || score.length !== 2 || !score.every(value => Number.isInteger(value) && value >= 0 && value <= 30) || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || row.date > today || row.date < `${season.slice(0, 4)}-07-01` || row.date > `${Number(season.slice(0, 4)) + 1}-06-30` || Number.isNaN(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date) throw new Error('Invalid completed match in free feed');
    const match = {date: row.date, season, home: normalizeClub(row.team1), away: normalizeClub(row.team2), hg: score[0], ag: score[1], competition: 'League', neutral: false, aet: false, pens: null, note: '', source: 'free-current'};
    if (match.home === match.away) throw new Error('Invalid opponent');
    match.id = matchKey(match);
    if (seen.has(match.id)) throw new Error('Duplicate match in free feed');
    seen.add(match.id);
    records.push(match);
  }
  if (!records.length) throw new Error('Free feed supplied no completed Albion matches');
  return records;
}
export function mergeCurrent(saved, incoming) {
  if (!incoming.length) throw new Error('Empty updates cannot replace saved results');
  const merged = new Map(saved.map(match => [match.id, match]));
  for (const match of incoming) {
    const previous = merged.get(match.id);
    if (previous && (previous.hg !== match.hg || previous.ag !== match.ag)) throw new Error('Free feed disagrees with a saved result; archive retained');
    if (!previous) merged.set(match.id, match);
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
