(function () {
  'use strict';
  function init() {
    const cards = document.querySelectorAll('.value-item-card');
    if (!cards.length) return;
    const dialog = document.createElement('dialog');
    dialog.className = 'value-focus-dialog';
    dialog.setAttribute('aria-labelledby', 'value-focus-title');
    dialog.setAttribute('aria-describedby', 'value-focus-description');
    dialog.innerHTML = '<button type="button" class="value-focus-close">✕ Close</button><div class="value-focus-label">SURFACE VALUES</div><h2 id="value-focus-title"></h2><div id="value-focus-description"></div><small>Press Esc to close</small>';
    document.body.appendChild(dialog);
    const close = dialog.querySelector('.value-focus-close');
    let opener;
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus({preventScroll: true}); });
    function open(card) {
      const title = card.querySelector('.value-term');
      const meaning = card.querySelector('.value-meaning');
      if (!title || !meaning || dialog.open) return;
      opener = card;
      dialog.querySelector('#value-focus-title').textContent = title.textContent.trim();
      dialog.querySelector('#value-focus-description').innerHTML = meaning.innerHTML;
      dialog.showModal();
      close.focus();
    }
    cards.forEach(card => {
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.addEventListener('click', () => open(card));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(card); }
      });
    });
    const flipper = document.getElementById('values-3d-flipper');
    function updateTabs() {
      const flipped = flipper && flipper.classList.contains('flipped');
      cards.forEach(card => {
        const back = card.closest('.gyro-face.back');
        card.tabIndex = (back ? flipped : !flipped) ? 0 : -1;
      });
    }
    if (flipper) new MutationObserver(updateTabs).observe(flipper, {attributes: true, attributeFilter: ['class']});
    updateTabs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
