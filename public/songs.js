'use strict';
(() => {
  const form = document.querySelector('#song-filters');
  const search = document.querySelector('#song-search');
  const category = document.querySelector('#song-category');
  const entries = [...document.querySelectorAll('.song-entry')];
  const status = document.querySelector('#song-count');
  const empty = document.querySelector('#song-empty');
  if (!form || !search || !category || !status || !empty || !entries.length) return;
  const normalise = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').toLocaleLowerCase('en-GB');
  const records = entries.map(element => ({element, text:normalise(element.textContent), category:element.dataset.category}));
  const update = () => {
    const query = normalise(search.value.trim());
    let shown = 0;
    records.forEach(record => {
      const match = (!category.value || record.category === category.value) && (!query || record.text.includes(query));
      record.element.hidden = !match;
      if (match) shown += 1;
    });
    status.textContent = `Showing ${shown} of ${entries.length} songs and music selections.`;
    empty.hidden = shown !== 0;
  };
  const reset = () => {
    search.value = '';
    category.value = '';
    update();
  };
  form.addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', update);
  category.addEventListener('change', update);
  form.addEventListener('reset', event => {event.preventDefault(); reset();});
  document.querySelector('#show-all-songs').addEventListener('click', () => {reset(); search.focus();});
  form.hidden = false;
  update();
})();
