'use strict';
const escapeQuiz = value => value.replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const questions = JSON.parse(document.querySelector('#quiz-data')?.textContent || '[]').map(q=>({...q,question:escapeQuiz(q.question),explanation:escapeQuiz(q.explanation),answers:q.answers.map(escapeQuiz)}));
const quiz = document.querySelector('#quiz-box');
let current = 0;
let score = 0;
function renderQuiz(focus = false) {
  if (current === questions.length) {
    quiz.innerHTML = `<p class="quiz-progress">FULL TIME</p><h3 class="quiz-question" tabindex="-1">${score} out of ${questions.length}. ${score === questions.length ? 'Top of the league!' : 'There’s always another match.'}</h3><p class="quiz-feedback">The answers: ${new Intl.ListFormat('en-GB',{style:'long',type:'conjunction'}).format(questions.map(q=>q.answers[q.correct]))}.</p><button class="quiz-next" type="button">Have another go ↻</button>`;
    quiz.querySelector('button').addEventListener('click', () => { current = 0; score = 0; renderQuiz(true); });
  } else {
    const question = questions[current];
    quiz.innerHTML = `<p class="quiz-progress">QUESTION ${current + 1} OF ${questions.length}</p><h3 class="quiz-question" tabindex="-1">${question.question}</h3><div class="quiz-answers">${question.answers.map((answer, index) => `<button type="button" data-answer="${index}">${answer}</button>`).join('')}</div><p class="quiz-feedback" role="status"></p><button class="quiz-next" type="button" hidden>${current === questions.length - 1 ? 'See my score' : 'Next question'} →</button>`;
    quiz.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
      const chosen = Number(button.dataset.answer);
      if (chosen === question.correct) score += 1;
      quiz.querySelectorAll('[data-answer]').forEach((answer) => { answer.disabled = true; if (Number(answer.dataset.answer) === question.correct) answer.classList.add('correct'); });
      if (chosen !== question.correct) button.classList.add('incorrect');
      quiz.querySelector('.quiz-feedback').textContent = `${chosen === question.correct ? 'That’s right! ' : 'Not quite. '}${question.explanation}`;
      const next = quiz.querySelector('.quiz-next');
      next.hidden = false;
      next.focus();
    }, { once: true }));
    quiz.querySelector('.quiz-next').addEventListener('click', () => { current += 1; renderQuiz(true); });
  }
  if (focus) quiz.querySelector('.quiz-question').focus();
}
if(quiz && questions.length) renderQuiz();

// The museum enhances generated HTML; all exhibit prose remains readable without JS.
(() => {
  const cards = [...document.querySelectorAll('.collection-card')];
  const readers = [...document.querySelectorAll('.exhibit-reader')];
  const chapters = [...document.querySelectorAll('.era-chapter')];
  const chapterButtons = [...document.querySelectorAll('[data-chapter-target]')];
  const search = document.querySelector('#collection-search');
  const era = document.querySelector('#collection-era');
  const sort = document.querySelector('#collection-sort');
  const grid = document.querySelector('#collection-grid');
  const more = document.querySelector('#show-more');
  const reading = document.querySelector('#reading');
  const collection = document.querySelector('#collection');
  let category = 'all';
  let limit = 12;
  let chapter = 0;
  let lastExhibitLink = null;
  let returnScroll = null;
  let lastViewed = null;
  const normalise = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const categoryButtons = [...document.querySelectorAll('[data-category]')];
  const syncCategories = () => categoryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  function updateCollection() {
    const terms = normalise(search.value).trim().split(/\s+/).filter(Boolean);
    const ordered = [...cards];
    if (sort.value !== 'curated') ordered.sort((a,b) => (Number(a.dataset.year) - Number(b.dataset.year)) * (sort.value === 'newest' ? -1 : 1));
    ordered.forEach(card => grid.append(card));
    const matches = ordered.filter(card => (category === 'all' || category === card.dataset.type) && (era.value === 'all' || era.value === card.dataset.era) && terms.every(term => card.dataset.search.includes(term)));
    const shown = matches.slice(0, limit);
    cards.forEach(card => { card.hidden = !shown.includes(card); });
    document.querySelector('#collection-status').textContent = `Showing ${shown.length} of ${matches.length} ${matches.length === 1 ? 'exhibit' : 'exhibits'}${matches.length !== cards.length ? ` · ${cards.length} in the museum` : ''}`;
    document.querySelector('.collection-empty').hidden = matches.length !== 0;
    more.hidden = shown.length === matches.length;
    more.textContent = `Show ${Math.min(12, matches.length - shown.length)} more exhibits ↓`;
    document.querySelector('#reset-collection').hidden = !search.value && era.value === 'all' && category === 'all' && sort.value === 'curated';
    return matches;
  }
  function resetCollection() {
    search.value = '';
    era.value = 'all';
    sort.value = 'curated';
    category = 'all';
    limit = 12;
    syncCategories();
    updateCollection();
  }
  categoryButtons.forEach(button => button.addEventListener('click', () => { category = button.dataset.category; limit = 12; syncCategories(); updateCollection(); }));
  [search, era, sort].forEach(control => control.addEventListener(control === search ? 'input' : 'change', () => { limit = 12; updateCollection(); }));
  document.querySelector('#reset-collection').addEventListener('click', () => { resetCollection(); search.focus(); });
  more.addEventListener('click', () => {
    const oldLimit = limit;
    limit += 12;
    const matches = updateCollection();
    matches[oldLimit]?.querySelector('a').focus({ preventScroll: true });
  });
  function setChapter(index) {
    chapter = Math.max(0, Math.min(chapters.length - 1, index));
    chapters.forEach((panel, i) => { panel.hidden = i !== chapter; });
    chapterButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === chapter)));
    document.querySelector('#previous-era').disabled = chapter === 0;
    document.querySelector('#next-era').disabled = chapter === chapters.length - 1;
    document.querySelector('#chapter-status').textContent = `Chapter ${chapter + 1} of ${chapters.length}`;
    const stage = document.querySelector('.chapter-stage');
    stage.removeAttribute('data-changing');
    requestAnimationFrame(() => { stage.setAttribute('data-changing', ''); });
  }
  chapterButtons.forEach((button, index) => button.addEventListener('click', () => setChapter(index)));
  document.querySelector('#previous-era').addEventListener('click', () => setChapter(chapter - 1));
  document.querySelector('#next-era').addEventListener('click', () => setChapter(chapter + 1));
  document.querySelectorAll('[data-browse-era]').forEach(button => button.addEventListener('click', () => {
    resetCollection(); era.value = button.dataset.browseEra; updateCollection(); location.hash = 'collection'; document.querySelector('#collection-heading').focus({ preventScroll: true });
  }));
  document.querySelectorAll('[data-collection-type]').forEach(link => link.addEventListener('click', () => { resetCollection(); category = link.dataset.collectionType; syncCategories(); updateCollection(); }));
  document.querySelector('#surprise').addEventListener('click', () => {
    const choices = cards.filter(card => card.dataset.id !== lastViewed);
    const card = choices[Math.floor(Math.random() * choices.length)];
    location.hash = `exhibit-${card.dataset.id}`;
  });
  function route(focus = true) {
    const hash = location.hash.slice(1);
    const wantsExhibit = hash.startsWith('exhibit-');
    const selected = readers.find(reader => reader.id === hash);
    const wasReading = !reading.hidden;
    readers.forEach(reader => { reader.hidden = reader !== selected; reader.open = reader === selected; });
    reading.hidden = !wantsExhibit;
    document.querySelector('#missing-exhibit').hidden = !wantsExhibit || Boolean(selected);
    document.querySelector('#missing-exhibit').tabIndex = -1;
    if (selected) {
      lastViewed = selected.dataset.exhibit;
      cards.find(card => card.dataset.id === lastViewed)?.classList.add('is-seen');
      document.title = `${selected.querySelector('h2').textContent} — Albion museum`;
      if (focus) {
        selected.scrollIntoView({ behavior: 'instant', block: 'start' });
        selected.querySelector('h2').focus({ preventScroll: true });
      }
    } else {
      document.title = 'Albion, through the years — Marie’s interactive club museum';
      if (wantsExhibit && focus) { reading.scrollIntoView({ behavior:'instant' }); document.querySelector('#missing-exhibit').focus({ preventScroll: true }); }
      else if (wasReading && focus && hash === 'collection') {
        collection.scrollIntoView({ behavior: 'instant' });
        if (lastExhibitLink?.isConnected && !lastExhibitLink.closest('[hidden]')) lastExhibitLink.focus({ preventScroll: true });
        else document.querySelector('#collection-heading').focus({ preventScroll: true });
        if (returnScroll !== null) { window.scrollTo({ top: returnScroll, behavior: 'instant' }); returnScroll = null; }
      }
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#exhibit-"]');
    if (!link) return;
    if (!link.closest('.exhibit-reader')) { lastExhibitLink = link.closest('.collection-card') ? link : null; returnScroll = lastExhibitLink ? window.scrollY : null; }
    if (link.hash === location.hash) route();
  });
  window.addEventListener('hashchange', () => route());
  // A native dialog gives the enlarged photograph keyboard focus and Escape-to-close.
  const viewer = document.querySelector('#photo-viewer');
  if (typeof viewer.showModal === 'function') {
    document.querySelectorAll('[data-image]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        const figure = button.previousElementSibling;
        const image = figure.querySelector('img');
        document.querySelector('#photo-full').src = image.src;
        document.querySelector('#photo-full').alt = image.alt;
        document.querySelector('#photo-caption').replaceChildren(...[...figure.querySelector('figcaption').childNodes].map(node => node.cloneNode(true)));
        viewer.showModal();
      });
    });
    document.querySelector('#close-photo').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if (event.target === viewer && (event.clientX < viewer.getBoundingClientRect().left || event.clientX > viewer.getBoundingClientRect().right || event.clientY < viewer.getBoundingClientRect().top || event.clientY > viewer.getBoundingClientRect().bottom)) viewer.close(); });
  }
  document.querySelectorAll('.copy-link').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const status = button.parentElement.querySelector('.copy-status');
      try { await navigator.clipboard.writeText(location.href); status.textContent = 'Exhibit link copied.'; }
      catch { status.textContent = 'Copy the address from your browser to share this exhibit.'; }
    });
  });
  document.querySelectorAll('.era-navigation,.chapter-controls,.chapter-browse,.collection-tools,#surprise').forEach(element => { element.hidden = false; });
  reading.hidden = true;
  updateCollection();
  setChapter(0);
  document.documentElement.classList.add('museum-ready');
  route();
})();
