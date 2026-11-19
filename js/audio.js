/**
 * ============================================================================
 * Web Audio API Acoustic Feedback Engine (Pure Procedural Sound)
 * Synthesizes organic chimes, tactile clicks, and ceremonial tones
 * ============================================================================
 */

(function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const AppAudio = {
    toggleMute: function () {
      isMuted = !isMuted;
      localStorage.setItem('uts_muted', isMuted ? '1' : '0');
      const btn = document.getElementById('sound-toggle-btn');
      if (btn) {
        if (isMuted) {
          btn.classList.add('muted');
          btn.setAttribute('aria-label', 'Sound Muted');
        } else {
          btn.classList.remove('muted');
          btn.setAttribute('aria-label', 'Sound Enabled');
          this.playClick();
        }
      }
      return isMuted;
    },

    isMuted: function () {
      return isMuted;
    },

    // Soft tactile high-frequency click (like a fine mechanical switch)
    playClick: function () {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    },

    // Resonant gong / chime (inspired by the Philippine Kulintang)
    playChime: function (freq = 520, type = 'sine') {
      if (isMuted) return;
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Fundamental oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = type;
      osc1.frequency.setValueAtTime(freq, now);

      // Overharmonic oscillator for metallic richness
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 1.503, now); // Just fifth with slight beating

      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      gain2.gain.setValueAtTime(0.04, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    },

    // Celebratory harmonic chord (for quiz success or module milestone)
    playSuccessFanfare: function () {
      if (isMuted) return;
      const notes = [440, 554.37, 659.25, 880]; // A major chord
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playChime(freq, 'triangle');
        }, idx * 90);
      });
    }
  };

  // Restore mute preference
  if (localStorage.getItem('uts_muted') === '1') {
    isMuted = true;
  }

  window.AppAudio = AppAudio;

  // Initialize sound on first user gesture
  document.addEventListener('pointerdown', function initOnGesture() {
    getAudioContext();
    document.removeEventListener('pointerdown', initOnGesture);
  }, { once: true });
})();
