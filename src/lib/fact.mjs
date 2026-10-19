export const fields = ['title', 'text', 'sourceURL', 'sourceLabel'];

export function validateFact(fact) {
  if (!fact || typeof fact !== 'object' || Array.isArray(fact) || Object.keys(fact).sort().join() !== [...fields].sort().join()) throw new Error('The fact must contain exactly the four editor fields.');
  for (const key of fields) {
    if (typeof fact[key] !== 'string' || !fact[key].trim() || fact[key].length > (key === 'text' ? 2000 : 500)) throw new Error(`Check the ${key} field.`);
  }
  const url = new URL(fact.sourceURL);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use a public HTTPS source link without credentials.');
  return fact;
}

export const escapeHTML = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderFact(input) {
  const fact = validateFact(input);
  return `<article class="fact-panel" data-fact><h3>${escapeHTML(fact.title)}</h3><p>${escapeHTML(fact.text)}</p><a href="${escapeHTML(fact.sourceURL)}">${escapeHTML(fact.sourceLabel)}</a></article>`;
}
