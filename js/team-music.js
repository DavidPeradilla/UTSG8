/* ==========================================================================
   SITE BACKGROUND MUSIC
   The main track plays everywhere. The Team section can either switch to its
   own track, be silenced, or keep the main track running — see the config.
   ==========================================================================

   Volume is on a 0-100 scale.
   ========================================================================= */

var MUSIC_CONFIG = {
  siteTrack: './assets/site-music.mp3',
  teamTrack: './assets/team-music.mp3',
  teamSectionId: 'sec-team',

  // Volume for the main track, everywhere.
  volume: 45,

  // Volume for team-music.mp3, ONLY while The Team is on screen.
  // Set to 0 to mute it. Nothing else changes.
  teamVolume: 0,

  // What plays on The Team section when teamVolume is 0:
  //   false = silence (the main track stops too)
  //   true  = keep the main track playing straight through
  keepSiteMusicOnTeam: false,

  fadeSeconds: 1.2
};

(function () {
  'use strict';

  var CFG = MUSIC_CONFIG;
  var LOG = '[music]';

  function clamp(n) { return Math.max(0, Math.min(100, Number(n) || 0)); }
  var SITE_VOL  = clamp(CFG.volume) / 100;
  var TEAM_VOL  = clamp(CFG.teamVolume) / 100;
  var TEAM_MUTED = TEAM_VOL <= 0;
  var KEEP_SITE_ON_TEAM = CFG.keepSiteMusicOnTeam === true;

  var siteAudio = null;
  var teamAudio = null;
  var teamVisible = false;
  var userInteracted = false;
  var musicMuted = true;
  var siteFadeTimer = 0;
  var teamFadeTimer = 0;
  var siteFadeTarget = SITE_VOL;
  var reducedMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  function createTrack(src) {
    var audio = new Audio(src);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audio.addEventListener('error', function () {
      console.warn(LOG, 'could not load', src, '— check the path and the filename');
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

  function fadeAudio(audio, target, seconds, which) {
    if (!audio) return;

    var existing = which === 'site' ? siteFadeTimer : teamFadeTimer;
    window.clearInterval(existing);

    if (reducedMotion || !seconds) {
      audio.volume = Math.max(0, Math.min(1, target));
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
        if (which === 'site') siteFadeTimer = 0;
        else teamFadeTimer = 0;
      }
    }, 50);

    if (which === 'site') siteFadeTimer = timer;
    else teamFadeTimer = timer;
  }

  function startTrack(audio, targetVol, seconds, which) {
    if (!audio || musicMuted || !userInteracted) return;
    if (targetVol <= 0) { stopTrack(audio, seconds, which); return; }

    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        console.info(LOG, 'browser blocked playback; waiting for another click');
      });
    }
    fadeAudio(audio, targetVol, seconds, which);
  }

  function stopTrack(audio, seconds, which) {
    if (!audio) return;
    fadeAudio(audio, 0, seconds == null ? CFG.fadeSeconds : seconds, which);
    window.setTimeout(function () {
      if (audio.volume <= 0.01) audio.pause();
    }, Math.max(250, CFG.fadeSeconds * 1100));
  }

  function updateTracks() {
    // The Team section is on screen.
    if (teamVisible) {
      if (TEAM_MUTED) {
        // team-music.mp3 is muted by config. Either go silent or keep the
        // main track running through this section.
        stopTrack(teamAudio, CFG.fadeSeconds, 'team');
        if (KEEP_SITE_ON_TEAM) {
          startTrack(siteAudio, SITE_VOL, CFG.fadeSeconds, 'site');
          console.info(LOG, 'team track muted — keeping the main track playing');
        } else {
          stopTrack(siteAudio, CFG.fadeSeconds, 'site');
          console.info(LOG, 'team track muted — this section is silent');
        }
        return;
      }
      stopTrack(siteAudio, CFG.fadeSeconds, 'site');
      startTrack(teamAudio, TEAM_VOL, CFG.fadeSeconds, 'team');
      console.info(LOG, 'playing team-music.mp3 at volume', CFG.teamVolume);
      return;
    }

    // Everywhere else.
    stopTrack(teamAudio, CFG.fadeSeconds, 'team');
    startTrack(siteAudio, SITE_VOL, CFG.fadeSeconds, 'site');
    console.info(LOG, 'playing site-music.mp3 at volume', CFG.volume);
  }

  function watchTeamSection() {
    var section = document.getElementById(CFG.teamSectionId);
    if (!section) {
      console.info(LOG, 'team section not found; main track plays everywhere');
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
    console.info(LOG, 'first interaction — audio unlocked');
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
        stopTrack(siteAudio, CFG.fadeSeconds, 'site');
        stopTrack(teamAudio, CFG.fadeSeconds, 'team');
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
      stopTrack(siteAudio, CFG.fadeSeconds, 'site');
      stopTrack(teamAudio, CFG.fadeSeconds, 'team');
    },
    status: function () {
      var status = {
        siteVolume: CFG.volume,
        teamVolume: CFG.teamVolume,
        teamMuted: TEAM_MUTED,
        teamVisible: teamVisible,
        userInteracted: userInteracted,
        musicMuted: musicMuted,
        activeTrack: teamVisible
          ? (TEAM_MUTED ? (KEEP_SITE_ON_TEAM ? 'site-music.mp3 (team muted)' : 'silent') : 'team-music.mp3')
          : 'site-music.mp3'
      };
      if (siteAudio) { status.sitePaused = siteAudio.paused; status.siteLive = Math.round(siteAudio.volume * 100); }
      if (teamAudio) { status.teamPaused = teamAudio.paused; status.teamLive = Math.round(teamAudio.volume * 100); }
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

    console.info(LOG, 'loaded. site =', CFG.volume,
      '| team =', CFG.teamVolume, TEAM_MUTED ? '(muted)' : '',
      '| click once to start audio');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
