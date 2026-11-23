/* ==========================================================================
   SITE BACKGROUND MUSIC
   The main playlist plays on every section except The Team.
   The Team switches to assets/team-music.mp3.
   ==========================================================================

   Volume is on a 0-100 scale. Both tracks use volume: 45.
   ========================================================================= */

var MUSIC_CONFIG = {
  siteTrack: './assets/site-music.mp3',
  teamTrack: './assets/team-music.mp3',
  teamSectionId: 'sec-team',
  volume: 45,
  fadeSeconds: 1.2
};

(function () {
  'use strict';

  var CFG = MUSIC_CONFIG;
  var LOG = '[music]';
  var TARGET_VOLUME = Math.max(0, Math.min(100, CFG.volume)) / 100;

  var siteAudio = null;
  var teamAudio = null;
  var teamVisible = false;
  var userInteracted = false;
  var musicMuted = false;
  var siteFadeTimer = 0;
  var teamFadeTimer = 0;
  var reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  function createTrack(src) {
    var audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.addEventListener('error', function () {
      console.warn(LOG, 'could not load', src);
    });
    return audio;
  }

  function readMusicMuted() {
    try {
      return window.localStorage.getItem('uts_music_muted') === '1';
    } catch (e) {
      return false;
    }
  }

  function fadeAudio(audio, target, seconds, timerName) {
    if (!audio) return;

    window.clearInterval(timerName === 'site' ? siteFadeTimer : teamFadeTimer);

    if (reducedMotion || !seconds) {
      audio.volume = target;
      return;
    }

    var steps = Math.max(1, Math.round(seconds * 20));
    var step = 0;
    var start = audio.volume;
    var delta = (target - start) / steps;
    var timer = window.setInterval(function () {
      step++;
      var nextVolume = step >= steps ? target : start + delta * step;
      audio.volume = Math.max(0, Math.min(1, nextVolume));

      if (step >= steps) {
        window.clearInterval(timer);
        if (timerName === 'site') siteFadeTimer = 0;
        else teamFadeTimer = 0;
      }
    }, 50);

    if (timerName === 'site') siteFadeTimer = timer;
    else teamFadeTimer = timer;
  }

  function startTrack(audio, timerName) {
    if (!audio || musicMuted || !userInteracted) return;

    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        console.info(LOG, 'waiting for another user interaction to unlock audio');
      });
    }
    fadeAudio(audio, TARGET_VOLUME, CFG.fadeSeconds, timerName);
  }

  function stopTrack(audio, timerName) {
    if (!audio) return;
    fadeAudio(audio, 0, CFG.fadeSeconds, timerName);
    window.setTimeout(function () {
      if (audio.volume <= 0.01) audio.pause();
    }, Math.max(250, CFG.fadeSeconds * 1100));
  }

  function updateTracks() {
    if (teamVisible) {
      stopTrack(siteAudio, 'site');
      startTrack(teamAudio, 'team');
      console.info(LOG, 'playing team-music.mp3 at volume', CFG.volume);
    } else {
      stopTrack(teamAudio, 'team');
      startTrack(siteAudio, 'site');
      console.info(LOG, 'playing site-music.mp3 at volume', CFG.volume);
    }
  }

  function watchTeamSection() {
    var section = document.getElementById(CFG.teamSectionId);
    if (!section) {
      console.info(LOG, 'team section not found; site music will play everywhere');
      teamVisible = false;
      updateTracks();
      return;
    }

    if (!('IntersectionObserver' in window)) {
      teamVisible = false;
      updateTracks();
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.some ? entries.some(function (entry) {
        return entry.isIntersecting;
      }) : entries[0].isIntersecting;

      if (visible !== teamVisible) {
        teamVisible = visible;
        updateTracks();
      }
    }, { threshold: [0, 0.25, 0.5] });

    observer.observe(section);
  }

  function onFirstInteraction() {
    if (userInteracted) return;
    userInteracted = true;
    console.info(LOG, 'first interaction - audio unlocked');
    updateTracks();
  }

  function watchMusicToggle() {
    var btn = document.getElementById('music-toggle-btn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      musicMuted = !musicMuted;
      try {
        window.localStorage.setItem('uts_music_muted', musicMuted ? '1' : '0');
      } catch (err) {}

      btn.classList.toggle('is-muted', musicMuted);
      btn.setAttribute('aria-pressed', musicMuted ? 'true' : 'false');
      btn.title = musicMuted ? 'Turn background music on' : 'Turn background music off';

      if (musicMuted) {
        stopTrack(siteAudio, 'site');
        stopTrack(teamAudio, 'team');
      } else {
        userInteracted = true;
        updateTracks();
      }
    });
  }

  window.SiteMusic = {
    play: function () {
      userInteracted = true;
      musicMuted = false;
      updateTracks();
    },
    pause: function () {
      stopTrack(siteAudio, 'site');
      stopTrack(teamAudio, 'team');
    },
    status: function () {
      var status = {
        volume: CFG.volume,
        teamVisible: teamVisible,
        userInteracted: userInteracted,
        musicMuted: musicMuted,
        activeTrack: teamVisible ? 'team-music.mp3' : 'site-music.mp3'
      };
      if (siteAudio) status.sitePaused = siteAudio.paused;
      if (teamAudio) status.teamPaused = teamAudio.paused;
      console.table ? console.table(status) : console.log(status);
      return status;
    }
  };

  function init() {
    siteAudio = createTrack(CFG.siteTrack);
    teamAudio = createTrack(CFG.teamTrack);
    musicMuted = readMusicMuted();

    var btn = document.getElementById('music-toggle-btn');
    if (btn) btn.classList.toggle('is-muted', musicMuted);

    watchTeamSection();
    watchMusicToggle();

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, onFirstInteraction, { once: true, passive: true });
    });

    console.info(LOG, 'loaded. site volume =', CFG.volume,
      '| team volume =', CFG.volume,
      '| click once anywhere to start audio');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
