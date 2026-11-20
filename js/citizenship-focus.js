(function () {
  'use strict';
  function init() {
    const box = document.querySelector('.evaluator-box');
    const button = document.getElementById('enlarge-citizenship');
    if (!box || !button) return;
    const placeholder = document.createComment('Citizenship validator original location');
    box.parentNode.insertBefore(placeholder, box);
    const dialog = document.createElement('dialog');
    dialog.className = 'citizenship-focus-dialog';
    dialog.setAttribute('aria-label', 'Enlarged citizenship validator');
    dialog.innerHTML = '<div class="citizenship-focus-bar"><span>PROJECTOR VIEW · ARTICLE IV</span><button type="button" class="citizenship-focus-close">✕ Close</button></div><div class="citizenship-focus-content"></div><p class="citizenship-focus-hint">Select a scenario to explore. Press Esc to close.</p>';
    document.body.appendChild(dialog);
    const content = dialog.querySelector('.citizenship-focus-content');
    const close = dialog.querySelector('.citizenship-focus-close');
    button.addEventListener('click', () => {
      content.appendChild(box);
      try { dialog.showModal(); close.focus(); }
      catch (error) { placeholder.after(box); console.error(error); }
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { placeholder.after(box); button.focus({preventScroll: true}); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
