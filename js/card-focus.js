/* Projector-friendly card viewer with previous/next navigation. */
(function () {
  'use strict';
  const CARD_SELECTOR = '.tilt-card, .marker-card-3d';
  const TILT_MAX_DEG = 6;
  let overlay, face, body, prev, next, counter;
  let sourceCard = null, cardsInGroup = [], current = 0, isOpen = false;
  let savedOverflow = '';

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'card-focus';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Expanded card viewer');
    overlay.innerHTML = `
      <button type="button" class="cf-close" aria-label="Close expanded card">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg><span>Close</span>
      </button>
      <div class="cf-stage"><div class="cf-card"><article class="cf-face">
        <div class="cf-content" aria-live="polite"></div>
        <nav class="cf-slide-nav" aria-label="Card navigation">
          <button type="button" class="cf-previous" aria-label="Previous card">← <span>Previous</span></button>
          <span class="cf-counter" aria-live="polite"></span>
          <button type="button" class="cf-next" aria-label="Next card"><span>Next</span> →</button>
        </nav>
      </article></div></div>
      <div class="cf-hint">Use ← → to navigate · Press <kbd>Esc</kbd> to close</div>`;
    document.body.appendChild(overlay);
    face = overlay.querySelector('.cf-face');
    body = overlay.querySelector('.cf-content');
    prev = overlay.querySelector('.cf-previous');
    next = overlay.querySelector('.cf-next');
    counter = overlay.querySelector('.cf-counter');
    const stage = overlay.querySelector('.cf-stage');
    overlay.querySelector('.cf-close').addEventListener('click', closeCard);
    prev.addEventListener('click', () => showCard(current - 1));
    next.addEventListener('click', () => showCard(current + 1));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target === stage) closeCard();
    });
    stage.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch' || event.target.closest('.cf-slide-nav')) return;
      const rect = face.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
      face.style.transform = `rotateX(${-y * 2 * TILT_MAX_DEG}deg) rotateY(${x * 2 * TILT_MAX_DEG}deg)`;
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { face.style.transform = ''; });
  }
  function showCard(index) {
    if (index < 0 || index >= cardsInGroup.length) return;
    if (sourceCard) { sourceCard.classList.remove('is-expanded'); sourceCard.setAttribute('aria-expanded', 'false'); }
    current = index;
    sourceCard = cardsInGroup[index];
    sourceCard.classList.add('is-expanded');
    sourceCard.setAttribute('aria-expanded', 'true');
    body.innerHTML = sourceCard.innerHTML;
    body.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
    body.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    face.classList.toggle('is-marker', sourceCard.classList.contains('marker-card-3d'));
    face.classList.toggle('is-tilt', sourceCard.classList.contains('tilt-card'));
    face.style.transform = '';
    body.querySelectorAll('h3, p, .card-num-badge, .marker-icon-wrapper').forEach((el, i) => {
      el.classList.add('cf-item'); el.style.setProperty('--i', i);
    });
    prev.disabled = index === 0;
    next.disabled = index === cardsInGroup.length - 1;
    counter.textContent = `${index + 1} / ${cardsInGroup.length}`;
    overlay.querySelector('.cf-slide-nav').hidden = cardsInGroup.length < 2;
    // Avoid leaving keyboard focus on a button that just became disabled.
    if (document.activeElement === prev && prev.disabled) next.focus({ preventScroll: true });
    if (document.activeElement === next && next.disabled) prev.focus({ preventScroll: true });
  }
  function openCard(card) {
    if (isOpen) return;
    if (!overlay) buildOverlay();
    cardsInGroup = Array.from(card.parentElement.children).filter(child => child.matches(CARD_SELECTOR));
    if (!cardsInGroup.length) cardsInGroup = [card];
    isOpen = true;
    savedOverflow = document.body.style.overflow;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    showCard(cardsInGroup.indexOf(card));
    overlay.querySelector('.cf-close').focus({ preventScroll: true });
  }
  function closeCard() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('active');
    document.body.style.overflow = savedOverflow;
    if (sourceCard) {
      sourceCard.classList.remove('is-expanded'); sourceCard.setAttribute('aria-expanded', 'false');
      sourceCard.focus({ preventScroll: true }); sourceCard = null;
    }
  }
  function initCards() {
    document.querySelectorAll(CARD_SELECTOR).forEach(card => {
      card.setAttribute('data-focusable', ''); card.setAttribute('role', 'button'); card.tabIndex = 0;
      card.setAttribute('aria-haspopup', 'dialog'); card.setAttribute('aria-expanded', 'false');
      card.addEventListener('click', () => openCard(card));
      card.addEventListener('keydown', event => {
        if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openCard(card); }
      });
    });
    document.addEventListener('keydown', event => {
      if (!isOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeCard(); }
      else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); event.stopImmediatePropagation(); showCard(current + (event.key === 'ArrowRight' ? 1 : -1)); }
      else if (event.key === 'Tab') {
        const available = Array.from(overlay.querySelectorAll('button:not(:disabled)')).filter(el => el.getClientRects().length);
        if (!available.length) return;
        const first = available[0], last = available[available.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCards);
  else initCards();
})();
