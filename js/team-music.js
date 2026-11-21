(function () {
  'use strict';

  const START_AT = 20;
  const STOP_AT = 60;
  const VOLUME = 0.28;
  const TEAM_SELECTOR = '#sec-team';
  const MUSIC_SRC = './assets/team-music.mp3';

  const section = document.querySelector(TEAM_SELECTOR);
  if (!section) return;

  const audio = new Audio(MUSIC_SRC);
  audio.preload = 'auto';
  audio.volume = VOLUME;

  let sectionVisible = false;
  let userInteracted = false;
  let wantsPlayback = false;
  let userMuted = false;

  function readSiteMute() {
    try {
      return window.localStorage.getItem('uts_muted') === '1';
    } catch (error) {
      console.warn('[team-music] Could not read the saved sound preference.', error);
      return false;
    }
  }

  function play() {
    if (!sectionVisible || !userInteracted || userMuted) return;
    wantsPlayback = true;
    if (audio.readyState >= 1 && (audio.currentTime < START_AT || audio.currentTime >= STOP_AT)) {
      audio.currentTime = START_AT;
    }

    audio.play().catch(function (error) {
      wantsPlayback = false;
      console.warn('[team-music] Playback failed. Check that assets/team-music.mp3 exists and click the sound button to try again.', error);
    });
  }

  function pause() {
    wantsPlayback = false;
    audio.pause();
  }

  audio.addEventListener('loadedmetadata', function () {
    if (wantsPlayback && audio.currentTime < START_AT) {
      audio.currentTime = START_AT;
      audio.play().catch(function (error) {
        wantsPlayback = false;
        console.warn('[team-music] Playback failed.', error);
      });
    }
  });

  audio.addEventListener('timeupdate', function () {
    if (audio.currentTime >= STOP_AT) {
      audio.currentTime = START_AT;
    }
  });

  audio.addEventListener('error', function () {
    console.warn('[team-music] Could not load ' + MUSIC_SRC + '.', audio.error);
  });

  function onFirstInteraction() {
    userInteracted = true;
    window.removeEventListener('pointerdown', onFirstInteraction, true);
    window.removeEventListener('keydown', onFirstInteraction, true);
    if (sectionVisible) play();
  }

  userMuted = readSiteMute();
  audio.muted = userMuted;

  window.addEventListener('pointerdown', onFirstInteraction, true);
  window.addEventListener('keydown', onFirstInteraction, true);

  const soundButton = document.getElementById('sound-toggle-btn');
  if (soundButton) {
    soundButton.addEventListener('click', function () {
      userMuted = readSiteMute();
      audio.muted = userMuted;
      if (userMuted) pause();
      else if (sectionVisible) {
        userInteracted = true;
        play();
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionVisible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        if (sectionVisible) {
          if (userInteracted) play();
        } else {
          pause();
        }
      });
    }, { threshold: [0, 0.35, 0.6] });
    observer.observe(section);
  }
})();
