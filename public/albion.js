'use strict';
// Optional fact rotation. The first sourced fact remains readable without JavaScript.
document.querySelectorAll('[data-fact-rotator]').forEach(container => {
  const facts = [...container.querySelectorAll('[data-fact]')];
  const controls = container.querySelector('.fact-controls');
  const button = container.querySelector('[data-next-fact]');
  const status = container.querySelector('[data-fact-status]');
  if (!facts.length || !controls || !button || !status) return;
  let current = 0;
  const render = () => {
    facts.forEach((fact, index) => { fact.hidden = index !== current; });
    status.textContent = `Fact ${current + 1} of ${facts.length}`;
  };
  button.addEventListener('click', () => { current = (current + 1) % facts.length; render(); });
  controls.hidden = facts.length < 2;
  render();
});
