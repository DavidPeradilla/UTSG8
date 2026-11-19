/* ==========================================================================
   Card Focus: click any card to expand it full-screen (projector-friendly)

   - Applies to every .tilt-card and .marker-card-3d on the page.
   - Click / Enter / Space  -> expands the card with large type + 3D tilt.
   - Esc, the Close button, or a click outside the card -> closes it.
   - The expanded copy is a clone of the card's static content, so the
     original card's own tilt/hover effects are left untouched.
   ========================================================================== */
(function () {
  'use strict';

  const CARD_SELECTOR = '.tilt-card, .marker-card-3d';
  const TILT_MAX_DEG = 6;

  let overlay = null;
  let face = null;
  let sourceCard = null;   // the card that was clicked
  let isOpen = false;

  // ---------------------------------------------------------------------------
  // Build the overlay once, the first time a card is opened.
  // ---------------------------------------------------------------------------
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'card-focus';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Expanded card');

    overlay.innerHTML = `
      <button type="button" class="cf-close" aria-label="Close expanded card">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        <span>Close</span>
      </button>
      <div class="cf-stage">
        <div class="cf-card">
          <article class="cf-face"></article>
        </div>
      </div>
      <div class="cf-hint">Press <kbd>Esc</kbd> or click outside the card to close</div>
    `;

    document.body.appendChild(overlay);
    face = overlay.querySelector('.cf-face');
    const stage = overlay.querySelector('.cf-stage');
    const closeBtn = overlay.querySelector('.cf-close');

    closeBtn.addEventListener('click', closeCard);

    // Clicking the dimmed background (not the card) closes the view.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === stage) closeCard();
    });

    // Gentle 3D tilt that follows the pointer, like the page cards.
    stage.addEventListener('pointermove', (e) => {
      const rect = face.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 .. 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const rotY = x * 2 * TILT_MAX_DEG;
      const rotX = -y * 2 * TILT_MAX_DEG;
      face.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
    }, { passive: true });

    stage.addEventListener('pointerleave', () => {
      face.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  // ---------------------------------------------------------------------------
  // Open a card: copy its content into the big face and stagger the text in.
  // ---------------------------------------------------------------------------
  function openCard(card) {
    if (isOpen) return;
    if (!overlay) buildOverlay();

    sourceCard = card;
    isOpen = true;

    // Clone the static markup. Strip inline styles so the large-format CSS
    // below can control size (the originals carry inline font sizes).
    face.innerHTML = card.innerHTML;
    face.querySelectorAll('[style]').forEach((el) => el.removeAttribute('style'));
    face.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    face.classList.toggle('is-marker', card.classList.contains('marker-card-3d'));
    face.classList.toggle('is-tilt', card.classList.contains('tilt-card'));
    face.style.transform = '';

    // Stagger the text: each element gets an index for the animation delay.
    const items = face.querySelectorAll('h3, p, .card-num-badge, .marker-icon-wrapper');
    items.forEach((el, i) => {
      el.classList.add('cf-item');
      el.style.setProperty('--i', i);
    });

    card.classList.add('is-expanded');
    card.setAttribute('aria-expanded', 'true');

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.cf-close').focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------
  // Close the expanded view and return focus to the card that opened it.
  // ---------------------------------------------------------------------------
  function closeCard() {
    if (!isOpen) return;
    isOpen = false;

    overlay.classList.remove('active');
    document.body.style.overflow = '';

    if (sourceCard) {
      sourceCard.classList.remove('is-expanded');
      sourceCard.setAttribute('aria-expanded', 'false');
      sourceCard.focus({ preventScroll: true });
      sourceCard = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Wire up every card on the page.
  // ---------------------------------------------------------------------------
  function initCards() {
    const cards = document.querySelectorAll(CARD_SELECTOR);

    cards.forEach((card) => {
      card.setAttribute('data-focusable', '');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-expanded', 'false');

      card.addEventListener('click', () => openCard(card));

      card.addEventListener('keydown', (e) => {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCard(card);
        }
      });
    });

    // Esc closes; Tab stays on the Close button while the view is open.
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCard();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        overlay.querySelector('.cf-close').focus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCards);
  } else {
    initCards();
  }
})();
