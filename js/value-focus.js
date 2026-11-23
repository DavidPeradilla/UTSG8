(function () {
  'use strict';
  function init() {
    const cards = document.querySelectorAll('.value-item-card');
    if (!cards.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'value-focus-dialog';
    dialog.setAttribute('aria-labelledby', 'value-focus-title');
    dialog.setAttribute('aria-describedby', 'value-focus-description');
    dialog.innerHTML = `<button type="button" class="value-focus-close">✕ Close</button>
      <div class="value-focus-label">SURFACE VALUES</div><h2 id="value-focus-title"></h2>
      <div id="value-focus-description"></div>
      <nav class="value-slide-nav" aria-label="Surface value navigation">
        <button type="button" class="slide-prev" aria-label="Previous value">← Previous</button>
        <span class="slide-counter" aria-live="polite"></span>
        <button type="button" class="slide-next" aria-label="Next value">Next →</button>
      </nav><small>Use arrow keys to navigate · Press Esc to close</small>`;
    document.body.appendChild(dialog);
    const close = dialog.querySelector('.value-focus-close');
    const prev = dialog.querySelector('.slide-prev'), next = dialog.querySelector('.slide-next');
    let group = [], current = 0, opener;
    function show(index) {
      if (index < 0 || index >= group.length) return;
      current = index; opener = group[index];
      const title = opener.querySelector('.value-term'), meaning = opener.querySelector('.value-meaning');
      if (!title || !meaning) return;
      dialog.querySelector('#value-focus-title').textContent = title.textContent.trim();
      dialog.querySelector('#value-focus-description').innerHTML = meaning.innerHTML;
      dialog.querySelector('.slide-counter').textContent = `${current + 1} / ${group.length}`;
      prev.disabled = index === 0; next.disabled = index === group.length - 1;
      if (document.activeElement === prev && prev.disabled) next.focus();
      if (document.activeElement === next && next.disabled) prev.focus();
    }
    prev.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus({preventScroll: true}); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault(); event.stopPropagation(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    function open(card) {
      if (dialog.open) return;
      group = Array.from(card.parentElement.children).filter(item => item.matches('.value-item-card'));
      show(group.indexOf(card)); dialog.showModal(); close.focus();
    }
    cards.forEach(card => {
      card.setAttribute('role', 'button'); card.setAttribute('aria-haspopup', 'dialog');
      card.addEventListener('click', () => open(card));
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(card); } });
    });
    const flipper = document.getElementById('values-3d-flipper');
    function updateTabs() {
      const flipped = flipper && flipper.classList.contains('flipped');
      cards.forEach(card => { card.tabIndex = (card.closest('.gyro-face.back') ? flipped : !flipped) ? 0 : -1; });
    }
    if (flipper) new MutationObserver(updateTabs).observe(flipper, {attributes:true, attributeFilter:['class']});
    updateTabs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
