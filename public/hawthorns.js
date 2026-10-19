'use strict';
const standButtons = [...document.querySelectorAll('[data-stand]')];
const standStories = [...document.querySelectorAll('[data-stand-story]')];
standButtons.forEach(button => button.addEventListener('click', () => {
  standButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  standStories.forEach(story => { story.hidden = story.id !== `stand-${button.dataset.stand}`; });
  document.querySelector('.stand-status').textContent = `${button.textContent} history shown.`;
}));
if (standButtons.length && standStories.length) {
  standStories.forEach((story, index) => { story.hidden = index !== 0; });
  document.documentElement.classList.add('stands-ready');
}
const viewButtons = [...document.querySelectorAll('[data-view]')];
const photos = [...document.querySelectorAll('[data-ground-photo]')];
viewButtons.forEach(button => button.addEventListener('click', () => {
  viewButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  photos.forEach(photo => { photo.hidden = button.dataset.view !== 'both' && photo.dataset.groundPhoto !== button.dataset.view; });
  document.querySelector('.ground-photo-pair').classList.toggle('is-single', button.dataset.view !== 'both');
  document.querySelector('#view-status').textContent = button.dataset.view === 'both' ? 'Both archive photographs shown.' : `The ${button.dataset.view} photograph is shown.`;
}));
if (viewButtons.length) document.querySelector('.view-controls').hidden = false;
const photoViewer = document.querySelector('#ground-photo-viewer');
if (photoViewer && typeof photoViewer.showModal === 'function') {
  document.querySelectorAll('.ground-enlarge').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const figure = button.closest('figure');
      const image = figure.querySelector('img');
      document.querySelector('#ground-photo-full').src = image.src;
      document.querySelector('#ground-photo-full').alt = image.alt;
      document.querySelector('#ground-photo-caption').replaceChildren(...[...figure.querySelector('figcaption').childNodes].map(node => node.cloneNode(true)));
      photoViewer.showModal();
    });
  });
  document.querySelector('#close-ground-photo').addEventListener('click', () => photoViewer.close());
  photoViewer.addEventListener('click', event => {
    if (event.target !== photoViewer) return;
    const bounds = photoViewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoViewer.close();
  });
}
