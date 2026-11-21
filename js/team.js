/* ==========================================================================
   Section 13 · Meet the Team — 3D card deck interactions

   Three behaviours, kept in one small file so they can't fight each other:

   1. POINTER TILT
      Each .team-card rotates in 3D toward the cursor. Only the hovered card
      animates, and only via CSS custom properties, so the browser can keep
      the work on the compositor.

   2. FLIP
      A card marked .is-flippable (Aeron) swaps .team-photo-a for
      .team-photo-b. The flip is triggered by the Flip button/pill or by
      keyboard, NOT by the card click — because the card click opens the
      profile overlay. That way a projector click always means "show me this
      person", and the flip stays a deliberate second gesture.

   3. PROJECTOR OVERLAY (#team-focus)
      A single reusable dialog. It reads the card's data-attributes and
      child images, so adding a member later needs no JS changes.
      Arrow keys cycle photos, Esc closes, focus is trapped while open.
   ========================================================================== */
(function () {
  'use strict';

  const CARD_SELECTOR = '.team-card';
  const FLIP_CLASS = 'is-flipped';
  const FOCUS_ID = 'team-focus';
  const TILT_MAX = 9;        // degrees at the card's corners
  const TILT_LIFT = 10;      // px the card rises

  const reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ------------------------------------------------------------------ tilt --- */

  function initTilt(cards) {
    cards.forEach((card) => {
      let raf = 0;
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let hovering = false;

      function apply() {
        raf = 0;
        // ease toward the target so movement feels weighted, not jittery
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;

        card.style.setProperty('--tilt-x', currentX.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', currentY.toFixed(2) + 'deg');

        const stillMoving =
          Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

        if (stillMoving || hovering) {
          raf = requestAnimationFrame(apply);
        }
      }

      function schedule() {
        if (!raf) raf = requestAnimationFrame(apply);
      }

      card.addEventListener('pointerenter', (e) => {
        if (reducedMotion.matches || e.pointerType === 'touch') return;
        hovering = true;
        schedule();
      });

      card.addEventListener('pointermove', (e) => {
        if (reducedMotion.matches || e.pointerType === 'touch') return;

        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const px = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 .. 0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5;

        // pointer right  -> tilt toward viewer on the Y axis
        // pointer down   -> tip the top away on the X axis
        targetY = px * TILT_MAX * 2;
        targetX = -py * TILT_MAX * 2;
        schedule();
      });

      card.addEventListener('pointerleave', () => {
        hovering = false;
        targetX = 0;
        targetY = 0;
        schedule();
      });

      // Keyboard focus should still get a small pose, not a flat card.
      card.addEventListener('focus', () => {
        if (reducedMotion.matches) return;
        targetX = -4;
        targetY = 4;
        hovering = true;
        schedule();
      });

      card.addEventListener('blur', () => {
        hovering = false;
        targetX = 0;
        targetY = 0;
        schedule();
      });
    });
  }

  /* ------------------------------------------------------------------ flip --- */

  function initFlip(cards) {
    cards.forEach((card) => {
      if (!card.classList.contains('is-flippable')) return;

      // Add a real button so the flip is discoverable and keyboard-operable.
      const wrap = card.querySelector('.team-photo-wrap');
      if (!wrap || wrap.querySelector('.team-flip-btn')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'team-flip-btn';
      btn.setAttribute('aria-label', 'Show the other photo of this member');
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = '<span class="sr-only">Flip photo</span>';
      wrap.appendChild(btn);

      function toggleFlip(event) {
        if (event) {
          event.stopPropagation();   // never open the overlay by accident
          event.preventDefault();
        }
        const flipped = card.classList.toggle(FLIP_CLASS);
        btn.setAttribute('aria-pressed', flipped ? 'true' : 'false');
        if (window.AppAudio && typeof window.AppAudio.playClick === 'function') {
          window.AppAudio.playClick();
        }
      }

      btn.addEventListener('click', toggleFlip);

      // Pressing "F" while the card has focus also flips it.
      card.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleFlip(e);
        }
      });
    });
  }

  /* --------------------------------------------------------------- overlay --- */

  let overlay, focusTarget, lastFocused;
  let photos = [];        // { el, src, alt }
  let activePhoto = 0;
  let isOpen = false;

  function cacheOverlay() {
    if (overlay) return !!overlay;
    overlay = document.getElementById(FOCUS_ID);
    if (!overlay) return false;
    focusTarget = overlay.querySelector('.tf-card');
    return true;
  }

  function collectPhotos(card) {
    const imgs = Array.from(card.querySelectorAll('.team-photo img'));
    return imgs.map((img) => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' }));
  }

  function renderPhotos(list) {
    const host = overlay.querySelector('[data-tf-photos]');
    const counter = overlay.querySelector('[data-tf-counter]');
    host.innerHTML = '';

    photos = list.length ? list : [{ src: '', alt: '' }];
    activePhoto = 0;

    photos.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = 'tf-photo' + (i === 0 ? ' is-active' : '');
      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt;
      img.loading = 'eager';
      div.appendChild(img);
      host.appendChild(div);
    });

    const multi = photos.length > 1;
    counter.hidden = !multi;
    counter.textContent = '1 / ' + photos.length;
  }

  function showPhoto(index) {
    if (!photos.length) return;
    const n = photos.length;
    activePhoto = ((index % n) + n) % n;

    overlay.querySelectorAll('.tf-photo').forEach((el, i) => {
      el.classList.toggle('is-active', i === activePhoto);
    });

    const counter = overlay.querySelector('[data-tf-counter]');
    if (!counter.hidden) counter.textContent = (activePhoto + 1) + ' / ' + n;
  }

  function nextPhoto(dir) {
    if (photos.length < 2) return;
    showPhoto(activePhoto + dir);
    if (window.AppAudio && typeof window.AppAudio.playClick === 'function') {
      window.AppAudio.playClick();
    }
  }

  function fillOverlay(card) {
    const set = (sel, value) => {
      const el = overlay.querySelector(sel);
      if (el) el.innerHTML = value || '';
    };

    set('[data-tf-role]', card.dataset.role || '');
    set('[data-tf-name]', card.dataset.name || '');
    set('[data-tf-cred]', card.dataset.cred || '');
    set('[data-tf-bio]', card.dataset.bio || '');
    set('[data-tf-quote]', card.dataset.quote || '');
    set('[data-tf-fact]', card.dataset.fact || '');

    const statsHost = overlay.querySelector('[data-tf-stats]');
    statsHost.innerHTML = '';
    (card.dataset.stats || '')
      .split('|')
      .filter(Boolean)
      .forEach((pair) => {
        const [k, v] = pair.split('::');
        if (!k) return;
        const li = document.createElement('li');
        li.innerHTML = '<span>' + k + '</span><strong>' + (v || '') + '</strong>';
        statsHost.appendChild(li);
      });

    renderPhotos(collectPhotos(card));

    // Tint the overlay glow to match the card's tone.
    const tint = card.dataset.tone || 'ochre';
    overlay.dataset.tone = tint;
    const glow = overlay.querySelector('.tf-glow');
    const tints = {
      green: 'radial-gradient(45% 60% at 22% 20%, rgba(31,224,73,0.24), transparent 70%), radial-gradient(45% 60% at 80% 80%, rgba(56,163,255,0.14), transparent 72%)',
      blue: 'radial-gradient(45% 60% at 22% 20%, rgba(56,163,255,0.24), transparent 70%), radial-gradient(45% 60% at 80% 80%, rgba(31,224,73,0.12), transparent 72%)',
      ochre: 'radial-gradient(45% 60% at 22% 20%, rgba(245,158,11,0.26), transparent 70%), radial-gradient(45% 60% at 80% 80%, rgba(31,224,73,0.14), transparent 72%)'
    };
    if (glow) glow.style.background = tints[tint] || tints.ochre;
  }

  function openOverlay(card) {
    if (!cacheOverlay()) return;

    lastFocused = document.activeElement;
    fillOverlay(card);

    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('team-focus-open');
    isOpen = true;

    // Move focus into the dialog for keyboard and screen-reader users.
    const closeBtn = overlay.querySelector('.tf-close');
    if (closeBtn) closeBtn.focus({ preventScroll: true });

    if (window.AppAudio && typeof window.AppAudio.playChime === 'function') {
      window.AppAudio.playChime(560, 'triangle');
    }
  }

  function closeOverlay() {
    if (!isOpen || !overlay) return;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('team-focus-open');
    isOpen = false;
    photos = [];

    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }

    if (window.AppAudio && typeof window.AppAudio.playClick === 'function') {
      window.AppAudio.playClick();
    }
  }

  function initOverlay(cards) {
    if (!cacheOverlay()) return;

    overlay.querySelector('.tf-close').addEventListener('click', closeOverlay);

    // Clicking the dimmed backdrop closes; clicking the card does not.
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.classList.contains('tf-stage')) {
        closeOverlay();
      }
    });

    // Click a photo to cycle to the next one (Aeron has two).
    overlay.querySelector('[data-tf-photos]').addEventListener('click', (e) => {
      if (photos.length < 2) return;
      e.stopPropagation();
      nextPhoto(1);
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPhoto(1);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextPhoto(-1);
        return;
      }
      // Trap Tab inside the dialog so focus can't wander behind the backdrop.
      if (e.key === 'Tab') {
        const focusables = overlay.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    cards.forEach((card) => {
      card.addEventListener('click', () => openOverlay(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          // "F" is handled by initFlip; don't double-trigger here.
          e.preventDefault();
          openOverlay(card);
        }
      });
    });
  }

  /* -------------------------------------------------------- data plumbing --- */

  // Copy the card's structured text into data-attributes once, at startup, so
  // the overlay can stay a dumb renderer and the HTML stays readable.
  function hydrateCards(cards) {
    cards.forEach((card) => {
      const pick = (sel) => {
        const el = card.querySelector(sel);
        return el ? el.innerHTML.trim() : '';
      };
      const text = (sel) => {
        const el = card.querySelector(sel);
        return el ? el.textContent.trim() : '';
      };

      card.dataset.name = card.dataset.name || text('.team-name');
      card.dataset.role = card.dataset.role || text('.team-role');
      card.dataset.cred = card.dataset.cred || pick('.team-cred');
      card.dataset.bio = card.dataset.bio || pick('.team-bio');
      card.dataset.fact = card.dataset.fact || text('.tf-fact-source') || '';

      if (!card.dataset.stats) {
        const pairs = Array.from(card.querySelectorAll('.team-stats li')).map((li) => {
          const k = li.querySelector('span');
          const v = li.querySelector('strong');
          return (k ? k.textContent.trim() : '') + '::' + (v ? v.textContent.trim() : '');
        });
        card.dataset.stats = pairs.join('|');
      }
    });
  }

  /* ------------------------------------------------------------------ init --- */

  function init() {
    const cards = Array.from(document.querySelectorAll(CARD_SELECTOR));
    if (!cards.length) return;

    hydrateCards(cards);
    initTilt(cards);
    initFlip(cards);
    initOverlay(cards);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
