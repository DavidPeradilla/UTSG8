/* ==========================================================================
   SECTION 3D — entrance / exit choreography for every section.

   Two triggers:
     1. Scroll  — a section reaching ~20% visibility plays its entrance.
                  Dropping below ~5% re-arms it, so it replays every time.
     2. Nav click — any a[href^="#sec-"]: the section you are leaving plays a
                  short exit, then the destination plays its entrance on arrival.
                  Sections merely scrolled past on the way do NOT animate.

   API:
     window.Section3D.play(id)     — play a section's entrance by id
     window.Section3D.refresh()    — re-scan the DOM (after adding sections)
     window.Section3D.setActive(id)— sync the nav highlight manually

   ── The three golden rules this file obeys ────────────────────────────────
   1. NEVER write to an element's own `transform`. .tilt-card,
      .marker-card-3d and .team-card all receive inline transforms from
      three-d-engine.js / card-focus.js / team.js. We write the individual
      CSS properties `translate`, `rotate`, `scale` and `opacity` instead.
      Those compose independently of `transform`, so nothing fights.
   2. The <section> itself NEVER gets a transform. It has overflow:hidden, and
      a lingering transform on it would trap position:fixed children. We put
      `perspective` (not a transform) on the section and animate
      .section-container inside it.
   3. The ghost watermark gets an inline transform from app.js's parallax
      loop. We never touch it — our selectors are scoped to :not() or to
      specific child classes that exclude it.
   ========================================================================== */

(function () {
  'use strict';

  var ROOT = document.documentElement;
  if (!window.IntersectionObserver || !window.requestAnimationFrame) return;

  /* ------------------------------------------------------------------ setup */

  ROOT.classList.add('js-3d');

  var REDUCED = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener: function () {} };

  var MOBILE_MQ = window.matchMedia ? window.matchMedia('(max-width: 768px)') : { matches: false };

  // Scale factors for the mobile/performance pass.
  var Z_SCALE = 1;      // multiplies every translateZ
  var ROT_SCALE = 1;    // multiplies every rotation
  var STAGGER = 1;      // multiplies every per-item delay

  function readEnvironment() {
    var mobile = MOBILE_MQ.matches;
    Z_SCALE = mobile ? 0.5 : 1;
    ROT_SCALE = mobile ? 0.5 : 1;
    STAGGER = mobile ? 0.4 : 1;
  }
  readEnvironment();

  /* ---------------------------------------------------------- the animation
     Each entry: enter() and exit() receive a context object and return a
     CSSAnimation, an array of them, or null. All of them only ever touch
     `translate`, `rotate`, `scale` and `opacity`.

     ctx = {
       section,                 the <section> (never animated)
       container,               .section-container
       header,                  .section-header  (may be null)
       q(sel), qa(sel),         scoped queries, already filtered
       items,                   safe per-section "list" elements
       isMobile, reduced
     }
     ------------------------------------------------------------------------ */

  var DUR = 760;                          // base duration, ms
  var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';   // ease-out, no overshoot
  var EASE_BACK = 'cubic-bezier(0.34, 1.3, 0.64, 1)'; // used only for 'drop'
  var MAX_STAGGER = 60;                   // ms per item
  var MAX_STEPS = 7;                      // extra items beyond this share the last delay

  // Build + play one animation. `frames` is a Keyframe array.
  function anim(el, frames, opts) {
    if (!el) return null;
    var options = {
      duration: DUR,
      easing: EASE,
      fill: 'both',
      composite: 'replace'
    };
    if (opts) {
      if (opts.duration != null) options.duration = opts.duration;
      if (opts.easing) options.easing = opts.easing;
      if (opts.delay) options.delay = opts.delay;
    }
    el.style.willChange = 'translate, rotate, scale, opacity';
    var a = el.animate(frames, options);
    a.addEventListener('finish', function () {
      // Hand the element back to CSS once we're done with it.
      el.style.willChange = '';
    });
    a.addEventListener('cancel', function () { el.style.willChange = ''; });
    return a;
  }

  function stagger(i) {
    return Math.min(i * MAX_STAGGER, MAX_STEPS * MAX_STAGGER) * STAGGER;
  }

  // Which properties does a keyframe object use? Only these four are allowed.
  function z(px) { return (px * Z_SCALE).toFixed(1) + 'px'; }
  function rot(deg) { return (deg * ROT_SCALE).toFixed(2) + 'deg'; }

  /* --------------------------------------------------------- animation book
     Every effect returns a list of animations so we can cancel them later.  */

  var EFFECTS = {

    /* Hero: the whole card pulls back from right up against your face. */
    pullback: function (c) {
      var out = [];
      out.push(anim(c.container, [
        { opacity: 0, scale: 1.28, translate: '0 0 ' + z(340) },
        { opacity: 1, scale: 1, translate: '0 0 0px' }
      ], { duration: DUR + 60 }));

      var kids = c.qa('.hero-pill-badge, .hero-subtitle, .hero-ctas, .hero-interaction-hint');
      kids.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: '0 26px ' + z(-180) },
          { opacity: 1, translate: '0 0 0px' }
        ], { delay: 220 + stagger(i), duration: 600 }));
      });

      c.qa('.hero-stat-item').forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: '0 ' + z(90) + ' 0', scale: 0.82 },
          { opacity: 1, translate: '0 0 0px', scale: 1 }
        ], { delay: 380 + stagger(i), duration: 560 }));
      });
      return out;
    },

    /* Objectives: cards rush in from deep Z, tipped back on X. */
    cascade: function (c) {
      var out = [];
      var cards = c.items;
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 0 ' + z(-260), rotate: rot(4) + ' 0 0' },
        { opacity: 1, translate: '0 0 0px', rotate: '0deg 0deg 0deg' }
      ], { duration: 620 }));

      cards.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: '0 0 ' + z(-600), rotate: 'x ' + rot(18) },
          { opacity: 1, translate: '0 0 0px', rotate: 'x 0deg' }
        ], { delay: 120 + stagger(i) }));
      });
      return out;
    },

    /* Team: cards start as a tight stack and fan out around Y. */
    fan: function (c) {
      var out = [];
      var cards = c.items;
      var mid = (cards.length - 1) / 2;
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 -18px 0' },
        { opacity: 1, translate: '0 0 0px' }
      ], { duration: 560 }));

      cards.forEach(function (el, i) {
        var away = i - mid;                                  // -1.5 … +1.5
        var spread = (away * 46) * ROT_SCALE;                // deg
        out.push(anim(el, [
          {
            opacity: 0,
            translate: '0 0 ' + z(-120),
            rotate: 'y ' + spread.toFixed(1) + 'deg',
            scale: 0.94
          },
          { opacity: 1, translate: '0 0 0px', rotate: 'y 0deg', scale: 1 }
        ], { delay: 100 + stagger(i), duration: 780 }));
      });
      return out;
    },

    /* Political Self: the heading swings in along a Y arc. */
    orbit: function (c) {
      var out = [];
      var title = c.q('.section-title') || c.header;
      if (title) {
        out.push(anim(title, [
          { opacity: 0, rotate: 'y ' + rot(-68), translate: z(-160) + ' 0 0' },
          { opacity: 1, rotate: 'y 0deg', translate: '0 0 0px' }
        ], { duration: 820 }));
      }
      if (c.header && c.header !== title) {
        out.push(anim(c.header, [
          { opacity: 0, translate: '0 0 ' + z(-120), rotate: 'y ' + rot(-30) },
          { opacity: 1, translate: '0 0 0px', rotate: 'y 0deg' }
        ], { duration: 640 }));
      }
      c.items.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, rotate: 'y ' + rot(-46), translate: z(-90) },
          { opacity: 1, rotate: 'y 0deg', translate: '0 0 0px' }
        ], { delay: 180 + stagger(i), duration: 680 }));
      });
      return out;
    },

    /* Citizenship: the page swings open like a book, hinged on the left. */
    page: function (c) {
      var out = [];
      // A perspective on the container itself gives the page-turn depth
      // without touching the section.
      if (c.container) c.container.style.perspective = '1400px';
      out.push(anim(c.container, [
        { opacity: 0, rotate: 'y ' + rot(-90) },
        { opacity: 1, rotate: 'y 0deg' }
      ], { duration: 860 }));

      c.items.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: '0 0 ' + z(-200) },
          { opacity: 1, translate: '0 0 0px' }
        ], { delay: 260 + stagger(i), duration: 620 }));
      });
      return out;
    },

    /* What is Political: everything rushes forward out of a vanishing point. */
    tunnel: function (c) {
      var out = [];
      if (c.container) c.container.style.perspective = '900px';
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 0 ' + z(-700), scale: 0.4 },
        { opacity: 1, translate: '0 0 0px', scale: 1 }
      ], { duration: 780 }));
      c.items.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: '0 0 ' + z(-900), scale: 0.3 },
          { opacity: 1, translate: '0 0 0px', scale: 1 }
        ], { delay: 140 + stagger(i), duration: 720 }));
      });
      return out;
    },

    /* Self-Concept: stacked layers peel apart and settle onto the Z axis. */
    layers: function (c) {
      var out = [];
      if (c.container) c.container.style.perspective = '1200px';
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 0 ' + z(220) },
        { opacity: 1, translate: '0 0 0px' }
      ], { duration: 620 }));

      c.items.forEach(function (el, i) {
        var depth = 40 * (c.items.length - i);      // back layers are further away
        out.push(anim(el, [
          { opacity: 0, translate: '0 0 ' + z(depth), rotate: 'x ' + rot(12) },
          { opacity: 1, translate: '0 0 0px', rotate: 'x 0deg' }
        ], { delay: 90 + stagger(i), duration: 700 }));
      });
      return out;
    },

    /* Filipino Traits: a wave of pops travelling out from the centre. */
    ripple: function (c) {
      var out = [];
      out.push(anim(c.header, [
        { opacity: 0, scale: 0.94, translate: '0 0 ' + z(-160) },
        { opacity: 1, scale: 1, translate: '0 0 0px' }
      ], { duration: 580 }));

      var items = c.items;
      var mid = (items.length - 1) / 2;
      items.forEach(function (el, i) {
        var dist = Math.abs(i - mid);
        out.push(anim(el, [
          { opacity: 0, scale: 0.62, translate: '0 0 ' + z(-220) },
          { opacity: 1, scale: 1, translate: '0 0 0px' }
        ], { delay: 120 + Math.min(dist * 70, MAX_STEPS * MAX_STAGGER) * STAGGER, duration: 620 }));
      });
      return out;
    },

    /* Surface Values: the panel flips up on X and settles. */
    gyro: function (c) {
      var out = [];
      if (c.container) c.container.style.perspective = '1300px';
      out.push(anim(c.container, [
        { opacity: 0, rotate: 'x ' + rot(58), translate: '0 ' + z(-120) + ' 0' },
        { opacity: 1, rotate: 'x 0deg', translate: '0 0 0px' }
      ], { duration: 840 }));

      c.items.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, rotate: 'x ' + rot(26), translate: '0 ' + z(-140) + ' 0' },
          { opacity: 1, rotate: 'x 0deg', translate: '0 0 0px' }
        ], { delay: 200 + stagger(i), duration: 640 }));
      });
      return out;
    },

    /* Kapwa Levels: the rings rush in from a great distance. */
    rings: function (c) {
      var out = [];
      out.push(anim(c.header, [
        { opacity: 0, scale: 0.7, translate: '0 0 ' + z(-500) },
        { opacity: 1, scale: 1, translate: '0 0 0px' }
      ], { duration: 720 }));

      var rows = c.items;
      var mid = (rows.length - 1) / 2;
      rows.forEach(function (el, i) {
        var dist = Math.abs(i - mid);
        out.push(anim(el, [
          {
            opacity: 0,
            scale: 1 + dist * 0.14,
            translate: '0 0 ' + z(-320 - dist * 90)
          },
          { opacity: 1, scale: 1, translate: '0 0 0px' }
        ], { delay: 120 + stagger(i), duration: 760 }));
      });
      return out;
    },

    /* Markers: dropped from above, with one small settle. */
    drop: function (c) {
      var out = [];
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 ' + z(-120) + ' 0' },
        { opacity: 1, translate: '0 0px 0' }
      ], { duration: 600, easing: EASE }));

      var cards = c.items;
      cards.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: '0 ' + z(-420) + ' 0' },
          { opacity: 1, translate: '0 ' + z(26) + ' 0', offset: 0.72 },
          { opacity: 1, translate: '0 0px 0' }
        ], { delay: 140 + stagger(i), duration: 780, easing: 'ease-in' }));
      });
      return out;
    },

    /* Community: a left-to-right rolling stagger. */
    wave: function (c) {
      var out = [];
      out.push(anim(c.header, [
        { opacity: 0, translate: z(-70) + ' 0 0' },
        { opacity: 1, translate: '0 0 0px' }
      ], { duration: 560 }));

      c.items.forEach(function (el, i) {
        out.push(anim(el, [
          { opacity: 0, translate: z(-110) + ' ' + z(40) + ' 0', rotate: 'z ' + rot(-7) },
          { opacity: 1, translate: '0 0px 0', rotate: 'z 0deg' }
        ], { delay: 100 + stagger(i), duration: 680 }));
      });
      return out;
    },

    /* Democracy: panels hinge in from alternating sides. */
    slide: function (c) {
      var out = [];
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 0 ' + z(-200), rotate: 'y ' + rot(-16) },
        { opacity: 1, translate: '0 0 0px', rotate: 'y 0deg' }
      ], { duration: 640 }));

      c.items.forEach(function (el, i) {
        var side = i % 2 === 0 ? -1 : 1;
        out.push(anim(el, [
          {
            opacity: 0,
            translate: z(side * 150) + ' 0 ' + z(-140),
            rotate: 'y ' + rot(side * -24)
          },
          { opacity: 1, translate: '0 0 0px', rotate: 'y 0deg' }
        ], { delay: 120 + stagger(i), duration: 720 }));
      });
      return out;
    },

    /* Political Skills: items rise in steps. */
    stairs: function (c) {
      var out = [];
      out.push(anim(c.header, [
        { opacity: 0, translate: '0 ' + z(50) + ' 0' },
        { opacity: 1, translate: '0 0px 0' }
      ], { duration: 560 }));

      c.items.forEach(function (el, i) {
        var step = 46 + i * 26;                   // each one starts lower
        out.push(anim(el, [
          { opacity: 0, translate: z(-90) + ' ' + z(step) + ' 0' },
          { opacity: 1, translate: '0 0px 0' }
        ], { delay: 100 + stagger(i), duration: 700 }));
      });
      return out;
    },

    /* Closing: a full 3D flip, then the fanfare. */
    finale: function (c) {
      var out = [];
      if (c.container) c.container.style.perspective = '1400px';
      out.push(anim(c.container, [
        { opacity: 0, rotate: 'y ' + rot(180), translate: '0 0 ' + z(-260), scale: 0.9 },
        { opacity: 1, rotate: 'y 360deg', translate: '0 0 0px', scale: 1 }
      ], { duration: 940 }));

      if (c.header) {
        out.push(anim(c.header, [
          { opacity: 0, translate: '0 0 ' + z(180) },
          { opacity: 1, translate: '0 0 0px' }
        ], { delay: 420, duration: 620 }));
      }
      return out;
    },

    /* Fallback for any section without a mapped animation. */
    fade: function (c) {
      return [anim(c.container, [
        { opacity: 0, translate: '0 ' + z(30) + ' 0' },
        { opacity: 1, translate: '0 0 0px' }
      ], { duration: 640 })];
    }
  };

  /* ------------------------------------------------------------------ exit
     A single short, restrained exit. It must feel like leaving, not like a
     second entrance — 350ms, no rotation jitter.                          */

  function playExit(section) {
    if (!section) return null;
    var ctx = contextFor(section);
    if (!ctx || !ctx.container) return null;

    var dur = REDUCED.matches ? 200 : 350;
    return anim(ctx.container, [
      { opacity: 1, translate: '0 0 0px', scale: 1 },
      { opacity: 0, translate: '0 0 ' + z(-70), scale: 0.97 }
    ], { duration: dur, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
  }

  /* ------------------------------------------------------------- the context */

  var SUPPORTED = ['pullback', 'cascade', 'fan', 'orbit', 'page', 'tunnel', 'layers',
                   'ripple', 'gyro', 'rings', 'drop', 'wave', 'slide', 'stairs', 'finale'];

  // Which inner elements count as "items" for a given effect. Deliberately
  // never includes .section-ghost-watermark (the parallax owns that).
  var ITEM_MAP = {
    pullback: '.hero-stat-item',
    cascade: '.card-grid > *, .editorial-media, .image-frame-3d',
    fan: '.team-card',
    orbit: '.editorial-media, .card-grid > *, .image-frame-3d',
    page: '.card-grid > *, .editorial-media, .image-frame-3d',
    tunnel: '.card-grid > *, .editorial-media, .image-frame-3d',
    layers: '.card-grid > *, .editorial-media, .image-frame-3d',
    ripple: '.trait-filter-btn, .card-grid > *, .editorial-media',
    gyro: '.value-item-card, .values-cards-row > *, .hero-pill-badge',
    rings: '.kapwa-level-row',
    drop: '.marker-card-3d',
    wave: '.civic-card',
    slide: '.civic-card',
    stairs: '.civic-card',
    finale: '',
    fade: ''
  };

  var FOCUSABLE_IN_OVERLAY = '.card-focus-stage, #team-focus, .value-focus-dialog, .citizenship-focus-dialog, .trait-projector-dialog, #presentation-deck-mode, #lightbox';

  function contextFor(section) {
    if (!section) return null;
    var effect = section.getAttribute('data-3d-anim') || 'fade';
    if (SUPPORTED.indexOf(effect) === -1) effect = 'fade';

    var container = section.querySelector('.section-container') ||
                    section.querySelector('.hero-overlay-content');
    var header = container ? container.querySelector('.section-header') : null;

    function qa(sel) {
      if (!container || !sel) return [];
      return Array.prototype.slice.call(container.querySelectorAll(sel));
    }

    var itemSel = ITEM_MAP[effect] || '';
    var items = qa(itemSel);

    // Hard guard: never let an overlay or the watermark slip into the list.
    items = items.filter(function (el) {
      if (el.classList.contains('section-ghost-watermark')) return false;
      if (el.closest(FOCUSABLE_IN_OVERLAY)) return false;
      return true;
    });

    return {
      section: section,
      effect: effect,
      container: container,
      header: header,
      q: function (sel) { return container ? container.querySelector(sel) : null; },
      qa: qa,
      items: items,
      reduced: REDUCED.matches,
      isMobile: MOBILE_MQ.matches
    };
  }

  /* ------------------------------------------------------------- play / arm */

  var running = new WeakMap();   // section → array of Animation
  var armed = new WeakMap();     // section → bool (entrance may play)
  var sections = [];

  function cancelAll(section) {
    var list = running.get(section);
    if (list) {
      list.forEach(function (a) {
        try { a.cancel(); } catch (e) {}
      });
      running.delete(section);
    }
  }

  function cleanupInlineStyles(ctx) {
    // We set `perspective` on the container for a few effects. Clearing it
    // afterwards keeps the DOM pristine, as promised.
    if (ctx && ctx.container) ctx.container.style.perspective = '';
    if (ctx && ctx.container) ctx.container.style.willChange = '';
  }

  function playEntrance(section, options) {
    if (!section) return;
    var opts = options || {};
    var ctx = contextFor(section);
    if (!ctx || !ctx.container) return;

    cancelAll(section);

    var list;
    if (REDUCED.matches) {
      // Reduced motion: a plain 200ms fade, no 3D at all.
      list = [anim(ctx.container, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 })];
    } else {
      var fn = EFFECTS[ctx.effect] || EFFECTS.fade;
      list = (fn(ctx) || []).filter(Boolean);
    }

    running.set(section, list);
    armed.set(section, false);
    section.dataset.animState = 'playing';

    var longest = 0;
    list.forEach(function (a) {
      try {
        var t = (a.effect.getTiming().delay || 0) + (a.effect.getTiming().duration || 0);
        if (t > longest) longest = t;
      } catch (e) {}
    });

    window.setTimeout(function () {
      if (section.dataset.animState !== 'playing') return;
      section.dataset.animState = 'idle';
      cleanupInlineStyles(ctx);
      running.delete(section);
      // The chime: one per theme, only on a nav arrival.
      if (opts.chime) playArrivalChime(section);
    }, longest + 60);
  }

  function rearm(section) {
    cancelAll(section);
    var ctx = contextFor(section);
    cleanupInlineStyles(ctx);
    section.dataset.animState = 'idle';
    armed.set(section, true);
  }

  /* ---------------------------------------------------------------- the chime */

  var THEME_FREQ = {
    'theme-green': 523.25,   // C5
    'theme-blue': 440.00,    // A4
    'theme-ochre': 659.25,   // E5
    'quiz-section': 783.99   // G5 — the closing section resolves upward
  };

  function playArrivalChime(section) {
    if (!section) return;
    if (!(window.AppAudio && typeof window.AppAudio.playChime === 'function')) return;
    if (typeof window.AppAudio.isMuted === 'function' && window.AppAudio.isMuted()) return;

    var freq = null;
    var classes = section.classList;
    for (var key in THEME_FREQ) {
      if (classes.contains(key)) { freq = THEME_FREQ[key]; break; }
    }
    if (freq === null) freq = 523.25;

    try {
      window.AppAudio.playChime(freq, 'triangle');
    } catch (e) { /* audio is a nicety, never a failure */ }
  }

  /* --------------------------------------------------------- scroll trigger
     One observer per section, with re-arm hysteresis:
       in  at >= 20% visible
       out at < 5% visible
     The 15% gap between them is what stops a section chattering on and off
     while it sits near the viewport edge.                                */

  var observers = [];

  function buildObserver(section) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var r = entry.intersectionRatio;

        if (entry.isIntersecting && r >= 0.2) {
          if (isScrollingProgrammatically()) return;   // nav click owns this one
          if (armed.get(section) === true) {
            armed.set(section, false);
            playEntrance(section, { chime: false });
          }
        } else if (!entry.isIntersecting || r < 0.05) {
          if (armed.get(section) !== true) rearm(section);
        }
      });
    }, { threshold: [0, 0.05, 0.2, 0.4, 0.7, 1] });

    io.observe(section);
    observers.push(io);
  }

  /* ------------------------------------------------------------- nav clicks */

  var scrolling = false;
  var pendingTarget = null;

  function isScrollingProgrammatically() { return scrolling; }

  function prefersReduced() { return REDUCED.matches; }

  /* Wait until the page has actually stopped moving.
     A fixed timeout is wrong here: Chromium's smooth scroll duration scales
     with distance, so scrolling from the hero to the closing section can take
     well over a second. An early "settled" call flips `scrolling` off while
     the page is still in flight, and every section passed on the way then
     animates — exactly the thing that must not happen.
     So we watch the scroll position itself and settle when it has not moved
     for a few frames. scrollend is used when present, as a fast path. */
  function waitForScrollSettle(callback, maxMs) {
    var started = performance.now();
    var lastY = window.pageYOffset;
    var stable = 0;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      window.removeEventListener('scrollend', finish);
      callback();
    }

    if ('onscrollend' in window) {
      window.addEventListener('scrollend', finish, { once: true });
    }

    function tick() {
      if (done) return;
      var y = window.pageYOffset;
      var elapsed = performance.now() - started;

      if (Math.abs(y - lastY) < 1) stable++;
      else { stable = 0; lastY = y; }

      // Ignore the first few frames: the scroll has not started moving yet.
      if (stable >= 4 && elapsed > 160) return finish();
      if (elapsed > (maxMs || 4000)) return finish();

      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function scrollToSection(target) {
    // Accounting for the sticky nav.
    var navH = parseInt(
      getComputedStyle(ROOT).getPropertyValue('--nav-h') || '70', 10
    ) || 70;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navH;

    scrolling = true;
    pendingTarget = target;

    try {
      window.scrollTo({ top: top, behavior: prefersReduced() ? 'auto' : 'smooth' });
    } catch (e) {
      window.scrollTo(0, top);
    }

    waitForScrollSettle(function () {
      scrolling = false;

      var dest = pendingTarget;
      pendingTarget = null;
      if (!dest) return;

      // Everything the viewport merely ended up near is marked as seen, so it
      // does not sneak an entrance in behind the destination.
      markSeenExcept(dest);

      rearm(dest);
      playEntrance(dest, { chime: true });
      setActive(dest.id);
    }, prefersReduced() ? 1200 : 4000);
  }

  // Sections that are already >=20% visible but are not the destination: mark
  // them as having played, without animating them.
  function markSeenExcept(target) {
    var navH = 80;
    sections.forEach(function (s) {
      if (s === target) return;
      var r = s.getBoundingClientRect();
      var overlap = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, navH);
      var ratio = overlap > 0 ? overlap / Math.min(r.height, window.innerHeight) : 0;
      if (ratio >= 0.2) {
        cancelAll(s);
        cleanupInlineStyles(contextFor(s));
        s.dataset.animState = 'idle';
        armed.set(s, false);
      }
    });
  }

  function onNavClick(e) {
    // Ignore modified clicks and anything inside an open overlay.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var link = e.target.closest ? e.target.closest('a[href^="#sec-"]') : null;
    if (!link) return;

    var id = link.getAttribute('href').slice(1);
    var target = document.getElementById(id);
    if (!target) return;

    // If we're opening a link from inside a dialog/overlay, let the site's own
    // handlers deal with it rather than fighting over the scroll.
    if (link.closest(FOCUSABLE_IN_OVERLAY)) return;

    e.preventDefault();

    // Close the mobile menu if the link lived inside it.
    var details = link.closest('details.mobile-nav');
    if (details) details.removeAttribute('open');

    var current = document.querySelector('.module-section.anim-current, .hero-section.anim-current');
    if (!current) {
      current = document.querySelector('[data-anim-state="playing"]');
    }
    // Fall back to whichever section occupies the top of the viewport.
    if (!current) current = sectionAtViewportTop();

    if (current && current !== target) {
      playExit(current);
      window.setTimeout(function () { rearm(current); }, prefersReduced() ? 210 : 370);
    }

    scrollToSection(target);
    setActive(id);
  }

  function sectionAtViewportTop() {
    var navH = 80;
    var best = null;
    var bestTop = Infinity;
    sections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.bottom > navH && r.top < window.innerHeight) {
        var d = Math.abs(r.top - navH);
        if (d < bestTop) { bestTop = d; best = s; }
      }
    });
    return best;
  }

  /* ------------------------------------------------------------- nav highlight */

  var activeId = null;

  function setActive(id) {
    if (!id || id === activeId) {
      if (id) applyActive(id);
      return;
    }
    activeId = id;
    applyActive(id);
  }

  function applyActive(id) {
    var links = document.querySelectorAll('.nav-link');
    for (var i = 0; i < links.length; i++) {
      var isMatch = links[i].getAttribute('href') === '#' + id;
      links[i].classList.toggle('active', isMatch);
      if (isMatch) links[i].setAttribute('aria-current', 'true');
      else links[i].removeAttribute('aria-current');
    }
    // Mobile panel links too.
    var mlinks = document.querySelectorAll('.mobile-nav-panel a');
    for (var j = 0; j < mlinks.length; j++) {
      mlinks[j].classList.toggle('active', mlinks[j].getAttribute('href') === '#' + id);
    }
    // Mark the section itself so the exit trigger knows where we are.
    sections.forEach(function (s) {
      s.classList.toggle('anim-current', s.id === id);
    });
    window.dispatchEvent(new CustomEvent('section3d:active', { detail: { id: id } }));
  }

  // Scroll-driven highlight, throttled with rAF. Purely additive — it never
  // calls setActive while a nav click is in flight.
  var rafPending = false;
  window.addEventListener('scroll', function () {
    if (rafPending || scrolling) return;
    rafPending = true;
    window.requestAnimationFrame(function () {
      rafPending = false;
      var s = sectionAtViewportTop();
      if (s && s.id && s.id !== activeId) setActive(s.id);
    });
  }, { passive: true });

  /* --------------------------------------------------------- hash on load */

  function handleInitialHash() {
    var hash = window.location.hash;
    if (!hash || hash.indexOf('#sec-') !== 0) return;
    var target = document.getElementById(hash.slice(1));
    if (!target) return;

    // A browser performs the hash jump against the layout as it was BEFORE
    // images and fonts arrived, so the section can end up a couple of hundred
    // pixels off. (Measured on this page: the native jump leaves #sec-community
    // 248px from the top instead of 70px.) Re-align once the page has settled,
    // then play the entrance.
    function align() {
      var navH = parseInt(
        getComputedStyle(ROOT).getPropertyValue('--nav-h') || '70', 10
      ) || 70;

      function targetY() {
        return target.getBoundingClientRect().top + window.pageYOffset - navH;
      }

      function snap() {
        var y = targetY();
        if (Math.abs(window.pageYOffset - y) > 2) window.scrollTo(0, y);
      }

      // Lazy-loaded images above this section keep landing after the first
      // alignment and shove it down. Re-check a few times instead of trusting
      // a single measurement. Corrections stop after ~1.2s so we never fight
      // the person scrolling.
      var passes = [0, 180, 420, 800, 1200];
      passes.forEach(function (delay) {
        window.setTimeout(snap, delay);
      });

      window.setTimeout(function () {
        rearm(target);
        playEntrance(target, { chime: false });
        setActive(target.id);
      }, 140);
    }

    function afterLoad() { window.setTimeout(align, 120); }

    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }

  // A hash typed into the bar (or a back/forward) — honour it.
  window.addEventListener('hashchange', function () {
    var id = window.location.hash.slice(1);
    var el = id ? document.getElementById(id) : null;
    if (!el) return;
    if (scrolling) return;                        // our own nav click is driving
    if (id.indexOf('sec-') !== 0) { setActive(id); return; }
    scrollToSection(el);
  });

  /* --------------------------------------------------------------- boot up */

  function collect() {
    sections = Array.prototype.slice.call(
      document.querySelectorAll('.module-section, .hero-section')
    ).filter(function (s) { return s.id && s.id.indexOf('sec-') === 0; });

    sections.forEach(function (s) {
      armed.set(s, true);
      s.dataset.animState = 'idle';
    });
  }

  function refresh() {
    observers.forEach(function (o) { o.disconnect(); });
    observers = [];
    collect();

    sections.forEach(function (section) { buildObserver(section); });

    // Anything already on screen at boot gets marked, never animated.
    var navH = 80;
    sections.forEach(function (s) {
      var r = s.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.8 && r.bottom > navH) {
        armed.set(s, false);
      }
    });

    var current = sectionAtViewportTop();
    if (current) setActive(current.id);
  }

  function init() {
    collect();
    refresh();

    // One delegated listener covers desktop nav, mobile panel, footer and the
    // hero buttons — no need to wire each group.
    document.addEventListener('click', onNavClick, false);

    // Keep the mobile scale correct across rotation / resize.
    var reflowTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(reflowTimer);
      reflowTimer = window.setTimeout(readEnvironment, 180);
    }, { passive: true });

    handleInitialHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ------------------------------------------------------------------- API */

  window.Section3D = {
    play: function (id) {
      var el = typeof id === 'string' ? document.getElementById(id) : id;
      if (!el) return false;
      rearm(el);
      playEntrance(el, { chime: false });
      setActive(el.id);
      return true;
    },
    exit: function (id) {
      var el = typeof id === 'string' ? document.getElementById(id) : id;
      if (!el) return false;
      playExit(el);
      return true;
    },
    refresh: refresh,
    setActive: setActive,
    effects: SUPPORTED.slice()
  };

})();
