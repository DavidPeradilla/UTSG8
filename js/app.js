/**
 * ============================================================================
 * Main Application Logic for "Understanding the Self · Group 8"
 * Features:
 *   - Kinetic Text Animation & Scrambler Engine
 *   - IntersectionObserver Scroll Triggers & Parallax
 *   - 1987 Constitution Citizenship Evaluator
 *   - Filipino Traits & Values Interactive Matrix
 *   - 3D Gyroscope Surface Values Flip Switcher
 *   - Kapwa 8 Levels Interactive Synchronizer
 *   - Salawikain Proverbs Wisdom Generator
 *   - 5-Question Interactive Political Self Quiz
 *   - 3D Presentation Deck Mode (Keyboard & Touch Controlled)
 *   - Concept Search Modal & Image Lightbox
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. KINETIC TEXT ANIMATIONS & TEXT SCRAMBLER
  // ==========================================================================

  // Wrap all text words inside kinetic spans for staggered reveals
  function initKineticWords() {
    const targets = document.querySelectorAll('[data-kinetic-words]');
    targets.forEach((el) => {
      const text = el.textContent.trim();
      const words = text.split(/\s+/);
      el.innerHTML = words
        .map((w, idx) => `<span class="kinetic-word" style="--w-idx:${idx}">${w}</span>`)
        .join(' ');
    });
  }

  // Hacker-style character scramble decode effect
  class TextScrambler {
    constructor(element) {
      this.el = element;
      this.chars = '!<>-_\\/[]{}—=+*^?#________';
      this.update = this.update.bind(this);
    }

    setText(newText) {
      const oldText = this.el.innerText;
      const length = Math.max(oldText.length, newText.length);
      const promise = new Promise((resolve) => (this.resolve = resolve));
      this.queue = [];
      for (let i = 0; i < length; i++) {
        const from = oldText[i] || '';
        const to = newText[i] || '';
        const start = Math.floor(Math.random() * 25);
        const end = start + Math.floor(Math.random() * 25);
        this.queue.push({ from, to, start, end });
      }
      cancelAnimationFrame(this.frameRequest);
      this.frame = 0;
      this.update();
      return promise;
    }

    update() {
      let output = '';
      let complete = 0;
      for (let i = 0, n = this.queue.length; i < n; i++) {
        let { from, to, start, end, char } = this.queue[i];
        if (this.frame >= end) {
          complete++;
          output += to;
        } else if (this.frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = this.chars[Math.floor(Math.random() * this.chars.length)];
            this.queue[i].char = char;
          }
          output += `<span style="opacity:0.6;color:var(--c-gold)">${char}</span>`;
        } else {
          output += from;
        }
      }
      this.el.innerHTML = output;
      if (complete === this.queue.length) {
        this.resolve();
      } else {
        this.frameRequest = requestAnimationFrame(this.update);
        this.frame++;
      }
    }
  }

  // ==========================================================================
  // 2. SCROLL OBSERVERS & READING PROGRESS
  // ==========================================================================
  function initScrollObservers() {
    // Reading Progress Bar
    const progressBar = document.getElementById('progress-bar');
    const siteNav = document.querySelector('.site-nav');

    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      if (progressBar) progressBar.style.width = `${progress}%`;

      if (siteNav) {
        if (window.scrollY > 40) siteNav.classList.add('scrolled');
        else siteNav.classList.remove('scrolled');
      }

      // Parallax effect on section ghost watermarks
      document.querySelectorAll('.section-ghost-watermark').forEach((ghost) => {
        const rect = ghost.parentElement.getBoundingClientRect();
        const offset = (window.innerHeight - rect.top) * 0.08;
        ghost.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    }, { passive: true });

    // Section reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            // Animate scramble element inside if present
            const scrambleTarget = entry.target.querySelector('[data-scramble-on-view]');
            if (scrambleTarget && !scrambleTarget.dataset.scrambled) {
              scrambleTarget.dataset.scrambled = 'true';
              const s = new TextScrambler(scrambleTarget);
              s.setText(scrambleTarget.getAttribute('data-scramble-text') || scrambleTarget.innerText);
            }
          }
        });
      },
      { threshold: 0.18 }
    );

    document.querySelectorAll('.module-section').forEach((sec) => observer.observe(sec));
  }

  // ==========================================================================
  // 3. SECTION 03: CONSTITUTIONAL CITIZENSHIP EVALUATOR
  // ==========================================================================
  function initCitizenshipEvaluator() {
    const scenarios = {
      bloodline: {
        title: 'Jus Sanguinis (Article IV, Section 1, Paragraph 2)',
        desc: 'You are a natural-born Filipino citizen! Under Philippine law, citizenship is acquired by blood relationship (jus sanguinis), meaning having either a Filipino father or mother grants you citizenship regardless of your place of birth.',
        badge: 'Natural-Born Citizen',
        color: '#1fe049'
      },
      mothers: {
        title: 'Historic Constitutional Provision (Article IV, Sec. 1, Par. 3)',
        desc: 'Those born before January 17, 1973, of Filipino mothers, who elect Philippine citizenship upon reaching the age of majority (21 years old under the 1935 Constitution / revised rules). This corrected historic gender inequalities in earlier citizenship statutes.',
        badge: 'Citizen by Election',
        color: '#f5b700'
      },
      naturalized: {
        title: 'Naturalization in Accordance with Law (Article IV, Sec. 1, Par. 4)',
        desc: 'You may acquire Philippine citizenship through judicial naturalization (Commonwealth Act No. 473) or administrative naturalization (Republic Act No. 9139), affirming allegiance to the Republic of the Philippines and its Constitution.',
        badge: 'Naturalized Citizen',
        color: '#38a3ff'
      }
    };

    const buttons = document.querySelectorAll('.eval-btn');
    const resultTitle = document.getElementById('eval-result-title');
    const resultDesc = document.getElementById('eval-result-desc');
    const resultBadge = document.getElementById('eval-result-badge');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');

        const key = btn.getAttribute('data-eval-key');
        const data = scenarios[key];
        if (data && resultTitle && resultDesc && resultBadge) {
          resultTitle.textContent = data.title;
          resultDesc.textContent = data.desc;
          resultBadge.textContent = data.badge;
          resultBadge.style.color = data.color;
          if (window.AppAudio) window.AppAudio.playChime(600, 'triangle');
        }
      });
    });
  }

  // ==========================================================================
  // 4. SECTION 06: FILIPINO TRAITS & VALUES MATRIX
  // ==========================================================================
  const traitsData = [
    { name: 'Bayanihan', type: 'positive', meta: 'Communal Unity', desc: 'The spirit of communal unity and cooperation where community members unite to assist a neighbor (traditionally lifting and moving a bahay kubo) without expecting monetary reward. Symbolizes collective civic solidarity.' },
    { name: 'Hospitality', type: 'positive', meta: 'Warm Reception', desc: 'Welcoming guests with generous accommodation, feasts, and genuine care. A foundational manifestation of social acceptance and pakikipagkapwa.' },
    { name: 'Close Family Ties', type: 'positive', meta: 'Family Centric', desc: 'The family serves as the fundamental emotional, financial, and moral support system. Care for elders and devotion to multi-generational welfare is deeply ingrained.' },
    { name: 'Cheerful & Optimistic', type: 'positive', meta: 'Resilience', desc: 'Finding joy and humor even amidst typhoons, crises, and economic hardships. Laughing through adversity is an emotional survival mechanism and resilience.' },
    { name: 'Respect (Paggalang)', type: 'positive', meta: 'Honoring Others', desc: 'Marked by linguistic markers "Po" and "Opo", and physical gestures like "Mano Po" (touching an elder’s hand to one’s forehead), reflecting reverent deference to wisdom and community elders.' },
    { name: 'Bayanihan Spirit', type: 'positive', meta: 'Civic Action', desc: 'Modern manifestations include community pantries, disaster relief networks, and spontaneous volunteerism during national emergencies.' },
    { name: 'Mañana Habit', type: 'challenge', meta: 'Procrastination', desc: 'The phrase "Mamaya na" (later)—postponing tasks until urgency forces hasty execution. Can hinder structured civic planning and institutional efficiency.' },
    { name: 'Crab Mentality', type: 'challenge', meta: 'Jealous Pull-Down', desc: 'The tendency to pull down fellow Filipinos who achieve prominence, success, or status, akin to crabs in a bucket preventing anyone from escaping.' },
    { name: 'Colonial Mentality', type: 'challenge', meta: 'Foreign Preference', desc: 'The internal perception that imported goods, foreign standards of beauty, and Western ideals are inherently superior to indigenous culture and local products.' },
    { name: 'Filipino Time', type: 'challenge', meta: 'Flexible Tardiness', desc: 'The cultural leniency toward starting events 30–60 minutes late. While born from agricultural fluid rhythms, it presents friction in modern civic scheduling.' },
    { name: 'Ningas Kugon', type: 'challenge', meta: 'Fleeting Enthusiasm', desc: 'Bursting with ferocious enthusiasm at the launch of a project (like dry cogon grass catching fire), only to rapidly burn out and leave the initiative unfinished.' },
    { name: 'Amor Propio (Pride)', type: 'challenge', meta: 'Ego Sensitivity', desc: 'Hypersensitivity to perceived slights, loss of face, or public humiliation, which can sometimes obstruct constructive criticism and accountability.' }
  ];

  function initTraitsMatrix() {
    const cloud = document.getElementById('traits-cloud');
    const filterBtns = document.querySelectorAll('.trait-filter-btn');
    const detailBox = document.getElementById('trait-detail-box');
    const detailName = document.getElementById('trait-detail-name');
    const detailType = document.getElementById('trait-detail-type');
    const detailDesc = document.getElementById('trait-detail-desc');
    

    if (!cloud) return;

    // Projector-friendly trait dialog
const traitDialog = document.createElement('dialog');
traitDialog.className = 'trait-projector-dialog';
traitDialog.setAttribute('aria-labelledby', 'projector-trait-name');
traitDialog.setAttribute('aria-describedby', 'projector-trait-desc');

traitDialog.innerHTML = `
  <button type="button" class="trait-projector-close">
    ✕ Close
  </button>
  <span class="trait-projector-label" id="projector-trait-type"></span>
  <h2 id="projector-trait-name"></h2>
  <p id="projector-trait-desc"></p>
  <small>Press Esc to close</small>
`;

document.body.appendChild(traitDialog);

traitDialog.querySelector('.trait-projector-close')
  .addEventListener('click', () => traitDialog.close());

traitDialog.addEventListener('click', (event) => {
  if (event.target === traitDialog) traitDialog.close();
});

    function renderTraits(filter = 'all') {
      cloud.innerHTML = '';
      const filtered = traitsData.filter((t) => (filter === 'all' ? true : t.type === filter));

      filtered.forEach((trait) => {
        const chip = document.createElement('div');
        chip.className = `trait-chip ${trait.type === 'challenge' ? 'double-edged' : ''}`;
        chip.innerHTML = `
          <div class="trait-name">${trait.name}</div>
          <div class="trait-meta">${trait.meta}</div>
        `;

        chip.addEventListener('click', () => {
          document.querySelectorAll('.trait-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');

          if (detailBox && detailName && detailType && detailDesc) {
            detailBox.style.display = 'flex';
            detailName.textContent = trait.name;
            detailType.textContent = trait.type === 'positive' ? 'Adaptive Strength' : 'Cultural Challenge / Coping';
            detailType.style.color = trait.type === 'positive' ? 'var(--c-green-glow)' : 'var(--c-ochre-glow)';
            detailDesc.textContent = trait.desc;
            traitDialog.querySelector('#projector-trait-name').textContent = trait.name;
traitDialog.querySelector('#projector-trait-desc').textContent = trait.desc;
traitDialog.querySelector('#projector-trait-type').textContent =
  trait.type === 'positive' ? 'Adaptive Strength' : 'Cultural Challenge / Coping';

traitDialog.showModal();
            if (window.AppAudio) window.AppAudio.playClick();
          }
        });

        cloud.appendChild(chip);
      });
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');
        renderTraits(filter);
        if (window.AppAudio) window.AppAudio.playClick();
      });
    });

    renderTraits('all');
  }

  // ==========================================================================
  // 5. SECTIONS 07 & 08: 3D GYROSCOPE SURFACE VALUES FLIPPER
  // ==========================================================================
  function initValuesGyroFlipper() {
    const flipper = document.getElementById('values-3d-flipper');
    const btnAcc = document.getElementById('tab-accommodative');
    const btnConf = document.getElementById('tab-confrontative');

    if (!flipper || !btnAcc || !btnConf) return;

    btnAcc.addEventListener('click', () => {
      btnAcc.classList.add('active');
      btnConf.classList.remove('active');
      flipper.classList.remove('flipped');
      if (window.AppAudio) window.AppAudio.playChime(420, 'sine');
    });

    btnConf.addEventListener('click', () => {
      btnConf.classList.add('active');
      btnAcc.classList.remove('active');
      flipper.classList.add('flipped');
      if (window.AppAudio) window.AppAudio.playChime(640, 'sine');
    });
  }

  // ==========================================================================
  // 6. SECTION 09: KAPWA 8 LEVELS INTERACTIVE SYNCHRONIZER
  // ==========================================================================
  function initKapwaLevelRows() {
    const rows = document.querySelectorAll('.kapwa-level-row');
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const lvl = parseInt(row.getAttribute('data-level'), 10);
        if (window.selectKapwaLevel) {
          window.selectKapwaLevel(lvl);
        }
      });
    });
  }

  // ==========================================================================
  // 7. SECTION 10: SALAWIKAIN PROVERBS GENERATOR
  // ==========================================================================
  const proverbsList = [
    {
      tl: '“Ang hindi marunong lumingon sa pinanggalingan ay hindi makakarating sa paroroonan.”',
      en: 'He who does not look back to where he came from will never reach his destination.',
      lesson: 'Core tenet of Utang na Loob and historical consciousness.'
    },
    {
      tl: '“Matutong mamaluktot habang maikli ang kumot.”',
      en: 'While the blanket is short, learn to bend your body.',
      lesson: 'Patience, frugality, and adaptability in times of adversity.'
    },
    {
      tl: '“Aanhin pa ang damo kung patay na ang kabayo?”',
      en: 'What good is the grass if the horse is already dead?',
      lesson: 'The critical importance of timely help and urgent civic action.'
    },
    {
      tl: '“Ang sakit ng kalingkingan, damdam ng buong katawan.”',
      en: 'The pain of the little finger is felt by the whole body.',
      lesson: 'The philosophy of Kapwa: injury to one citizen affects the entire nation.'
    },
    {
      tl: '“Walang mahirap na gawa ' + 'pag dinaan sa tiyaga.”',
      en: 'No task is impossible when approached with perseverance.',
      lesson: 'The value of Sipag at Tiyaga in building a resilient society.'
    }
  ];

  function initProverbsGenerator() {
    const textEl = document.getElementById('proverb-text');
    const lessonEl = document.getElementById('proverb-lesson');
    const nextBtn = document.getElementById('next-proverb-btn');

    if (!textEl || !nextBtn) return;

    let currentIndex = 0;

    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % proverbsList.length;
      const item = proverbsList[currentIndex];

      textEl.style.opacity = '0';
      textEl.style.transform = 'translateY(8px)';

      setTimeout(() => {
        textEl.innerHTML = `<strong>${item.tl}</strong><br><span class="proverb-translation">${item.en}</span>`;
        if (lessonEl) lessonEl.textContent = `Lesson: ${item.lesson}`;
        textEl.style.opacity = '1';
        textEl.style.transform = 'translateY(0)';
      }, 200);

      if (window.AppAudio) window.AppAudio.playChime(580, 'sine');
    });
  }

  // ==========================================================================
  // 8. INTERACTIVE QUIZ ENGINE
  // ==========================================================================
  const quizData = [
    {
      q: 'According to Virgilio Enriquez and Sikolohiyang Pilipino, what lies at the core of Filipino psychology and values?',
      options: ['Hiya (Propriety)', 'Kapwa (Shared Inner Self)', 'Bayanihan (Communal Unity)', 'Bahala Na (Fatalism)'],
      answer: 1,
      explanation: 'Kapwa (a shared inner self) is the core concept that bridges individual ego and collective identity.'
    },
    {
      q: 'Under Article IV, Section 1 of the 1987 Constitution, how is citizenship primarily determined in the Philippines?',
      options: ['Jus Soli (Place of birth)', 'Jus Sanguinis (Bloodline of parents)', 'Economic investment', 'Religious affiliation'],
      answer: 1,
      explanation: 'The Philippines follows Jus Sanguinis: those whose father or mother are Filipino citizens are automatically citizens.'
    },
    {
      q: 'Which of the following is classified as a "Confrontative Surface Value"?',
      options: ['Utang na loob', 'Hiya', 'Lakas ng loob', 'Pakikisama'],
      answer: 2,
      explanation: 'Lakas ng loob (inner courage), along with Bahala na and Pakikibaka, are confrontative values that mobilize Filipinos to act during crises.'
    },
    {
      q: 'What is the deepest, highest level of relationship under "Hindi Ibang Tao" (One of Us)?',
      options: ['Pakikitungo', 'Pakikisangkot', 'Pakikipagpalagayang-loob', 'Pakikipagkaisa'],
      answer: 3,
      explanation: 'Pakikipagkaisa represents total unity, oneness, and deep mutual identification with the community.'
    },
    {
      q: 'Which ancient philosopher described man as naturally a "political animal" (zōon politikon)?',
      options: ['Plato', 'Socrates', 'Aristotle', 'Cicero'],
      answer: 2,
      explanation: 'Aristotle articulated that humans are inherently social and naturally obligated to participate in the polis.'
    }
  ];

  function initQuiz() {
    let currentQ = 0;
    let score = 0;

    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    const stepEl = document.getElementById('quiz-step');
    const feedbackEl = document.getElementById('quiz-feedback');
    const nextBtn = document.getElementById('quiz-next-btn');

    if (!questionEl || !optionsEl) return;

    function loadQuestion(idx) {
      const item = quizData[idx];
      stepEl.textContent = `Question ${idx + 1} of ${quizData.length}`;
      questionEl.textContent = item.q;
      feedbackEl.style.display = 'none';
      nextBtn.style.display = 'none';
      optionsEl.innerHTML = '';

      const letters = ['A', 'B', 'C', 'D'];
      item.options.forEach((opt, oIdx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.innerHTML = `<span class="quiz-badge-key">${letters[oIdx]}</span> <span>${opt}</span>`;

        btn.addEventListener('click', () => {
          // Disable all buttons
          document.querySelectorAll('.quiz-opt-btn').forEach((b) => (b.disabled = true));

          if (oIdx === item.answer) {
            btn.classList.add('correct');
            score++;
            feedbackEl.innerHTML = `<strong>Correct!</strong> ${item.explanation}`;
            feedbackEl.style.borderColor = 'var(--c-green-glow)';
            feedbackEl.style.color = '#fff';
            if (window.AppAudio) window.AppAudio.playChime(660, 'triangle');
          } else {
            btn.classList.add('wrong');
            const correctBtn = optionsEl.children[item.answer];
            if (correctBtn) correctBtn.classList.add('correct');
            feedbackEl.innerHTML = `<strong>Incorrect.</strong> ${item.explanation}`;
            feedbackEl.style.borderColor = '#ef4444';
            feedbackEl.style.color = '#fff';
            if (window.AppAudio) window.AppAudio.playClick();
          }

          feedbackEl.style.display = 'block';
          nextBtn.style.display = 'inline-flex';
        });

        optionsEl.appendChild(btn);
      });
    }

    nextBtn.addEventListener('click', () => {
      currentQ++;
      if (currentQ < quizData.length) {
        loadQuestion(currentQ);
      } else {
        // Quiz Complete
        stepEl.textContent = 'Evaluation Complete';
        questionEl.textContent = `You scored ${score} out of ${quizData.length}!`;
        optionsEl.innerHTML = `
          <div style="text-align:center;padding:20px;font-size:1.1rem;color:var(--c-cream-dim)">
            ${score >= 4 ? 'Mabuhay! You have mastered the core concepts of The Political Self.' : 'Good attempt! Review the modules above and try again to solidify your civic awareness.'}
          </div>
        `;
        feedbackEl.style.display = 'none';
        nextBtn.textContent = 'Retake Assessment';
        nextBtn.onclick = () => {
          currentQ = 0;
          score = 0;
          nextBtn.textContent = 'Next Question →';
          loadQuestion(0);
        };
        if (score >= 4 && window.AppAudio) {
          window.AppAudio.playSuccessFanfare();
        }
      }
    });

    loadQuestion(0);
  }

  // ==========================================================================
  // 9. FULL-SCREEN 3D PRESENTATION DECK MODE
  // ==========================================================================
  function initPresentationDeck() {
    const deck = document.getElementById('presentation-deck-mode');
    const openDeckBtn = document.getElementById('open-deck-btn');
    const closeDeckBtn = document.getElementById('close-deck-btn');
    const prevBtn = document.getElementById('deck-prev-btn');
    const nextBtn = document.getElementById('deck-next-btn');
    const dotsContainer = document.getElementById('deck-dots');
    const counterEl = document.getElementById('deck-counter');

    if (!deck) return;

    const slides = document.querySelectorAll('.deck-slide');
    let currentSlide = 0;

    // Build navigation dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      slides.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `deck-dot ${idx === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(idx));
        dotsContainer.appendChild(dot);
      });
    }

    function updateSlideClasses() {
      slides.forEach((slide, idx) => {
        slide.classList.remove('active', 'prev', 'next');
        if (idx === currentSlide) {
          slide.classList.add('active');
        } else if (idx < currentSlide) {
          slide.classList.add('prev');
        } else {
          slide.classList.add('next');
        }
      });

      // Update dots
      if (dotsContainer) {
        document.querySelectorAll('.deck-dot').forEach((dot, idx) => {
          if (idx === currentSlide) dot.classList.add('active');
          else dot.classList.remove('active');
        });
      }

      if (counterEl) {
        counterEl.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      }
    }

    function goToSlide(idx) {
      if (idx < 0 || idx >= slides.length) return;
      currentSlide = idx;
      updateSlideClasses();
      if (window.AppAudio) window.AppAudio.playClick();
    }

    function openDeck() {
      deck.classList.add('active');
      document.body.style.overflow = 'hidden';
      updateSlideClasses();
      if (window.AppAudio) window.AppAudio.playChime(500, 'sine');
    }

    function closeDeck() {
      deck.classList.remove('active');
      document.body.style.overflow = '';
      if (window.AppAudio) window.AppAudio.playClick();
    }

    if (openDeckBtn) openDeckBtn.addEventListener('click', openDeck);
    if (closeDeckBtn) closeDeckBtn.addEventListener('click', closeDeck);
    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        if (deck.classList.contains('active')) closeDeck();
        else openDeck();
      }
      if (deck.classList.contains('active')) {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
          e.preventDefault();
          goToSlide(currentSlide + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          goToSlide(currentSlide - 1);
        } else if (e.key === 'Escape') {
          closeDeck();
        }
      }
    });
  }

  // ==========================================================================
  // 10. SEARCH MODAL & IMAGE LIGHTBOX
  // ==========================================================================
  function initSearchModal() {
    const modal = document.getElementById('search-modal');
    const openBtn = document.getElementById('open-search-btn');
    const closeBtn = document.getElementById('close-search-btn');
    const input = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');

    if (!modal || !input) return;

    const searchableIndex = [
      { title: 'The Political Self', snippet: 'Aristotle, social citizen obligations, and group decision-making.', anchor: '#sec-political-self' },
      { title: 'Who is a Filipino?', snippet: '1987 Constitution Article IV: Jus Sanguinis, historic provisions, and naturalization.', anchor: '#sec-who-is-filipino' },
      { title: 'What is Political?', snippet: 'Policy formulation vs. administration, republicanism, and governance.', anchor: '#sec-what-is-political' },
      { title: 'Political Self-Organization', snippet: 'Emergence of public opinion, political movements, and revolutions.', anchor: '#sec-political-self-concept' },
      { title: 'Kapwa (Shared Inner Self)', snippet: 'The core of Filipino psychology bridging self and society.', anchor: '#sec-filipino-traits' },
      { title: 'Accommodative Surface Values', snippet: 'Hiya (propriety), Utang na Loob (reciprocity), and Pakikisama.', anchor: '#sec-surface-values' },
      { title: 'Confrontative Surface Values', snippet: 'Bahala Na (determination), Lakas ng Loob (courage), and Pakikibaka (struggle).', anchor: '#sec-surface-values' },
      { title: 'Ibang Tao (Outsider Levels)', snippet: 'Pakikitungo, Pakikisalamuha, Pakikilahok, Pakikibagay, Pakikisama.', anchor: '#sec-kapwa-levels' },
      { title: 'Hindi Ibang Tao (Insider Levels)', snippet: 'Pakikipagpalagayang-loob, Pakikisangkot, and Pakikipagkaisa.', anchor: '#sec-kapwa-levels' },
      { title: 'Filipino Cultural Markers', snippet: 'Salawikain (proverbs), Superstitions, Myths & Legends, and National Heroes.', anchor: '#sec-markers' }
    ];

    function openModal() {
      modal.classList.add('active');
      input.value = '';
      input.focus();
      renderResults('');
      if (window.AppAudio) window.AppAudio.playClick();
    }

    function closeModal() {
      modal.classList.remove('active');
    }

    function renderResults(query) {
      const q = query.toLowerCase().trim();
      const matched = searchableIndex.filter((item) =>
        item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
      );

      if (!matched.length) {
        resultsContainer.innerHTML = '<div style="padding:16px;color:var(--c-cream-dim);text-align:center;">No concepts match your query.</div>';
        return;
      }

      resultsContainer.innerHTML = matched
        .map(
          (m) => `
          <div class="search-item" data-anchor="${m.anchor}">
            <div class="search-item-title">${m.title}</div>
            <div class="search-item-snippet">${m.snippet}</div>
          </div>
        `
        )
        .join('');

      document.querySelectorAll('.search-item').forEach((item) => {
        item.addEventListener('click', () => {
          const anchor = item.getAttribute('data-anchor');
          closeModal();
          const target = document.querySelector(anchor);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    input.addEventListener('input', (e) => {
      renderResults(e.target.value);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal();
      }
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function initLightbox() {
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    if (!lightbox || !lightboxImg) return;

    document.querySelectorAll('.image-frame-3d img, .deck-slide img').forEach((img) => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.classList.add('active');
        if (window.AppAudio) window.AppAudio.playClick();
      });
    });

    lightbox.addEventListener('click', () => {
      lightbox.classList.remove('active');
    });
  }

  // ==========================================================================
  // INITIALIZE APP
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    initKineticWords();
    initScrollObservers();
    initCitizenshipEvaluator();
    initTraitsMatrix();
    initValuesGyroFlipper();
    initKapwaLevelRows();
    initProverbsGenerator();
    initQuiz();
    initPresentationDeck();
    initSearchModal();
    initLightbox();

    // Sound toggle listener
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn && window.AppAudio) {
      soundBtn.addEventListener('click', () => {
        window.AppAudio.toggleMute();
      });
    }
  });
})();
