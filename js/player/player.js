// F4 — Fullscreen player. Volume starts at 0. Pause/play only via typed commands.
import { bus, state, S } from '../state.js';
import { TUNING } from '../config/tuning.js';
import { toast } from '../ui/toast.js';
import { createAd, hasAd, setMainVideoHooks, stopFlood, closeAllAds } from '../ads.js';

export const video = document.getElementById('player-video');
const world = document.getElementById('world');
const elTitle = document.getElementById('player-title');
const elMissing = document.getElementById('player-missing');
const elPaused = document.getElementById('player-state-paused');
const elEnded = document.getElementById('player-state-ended');
const decoy = document.getElementById('btn-decoy');
const decoyIcon = document.getElementById('decoy-icon');
const like = document.getElementById('btn-like');
const vFill = document.getElementById('vmeter-fill');
const vPeak = document.getElementById('vmeter-peak');
const vText = document.getElementById('vol-text');

const PLAY_PATH = '<path d="M8 5l11 7-11 7z" fill="#24130A"/>';
const PAUSE_PATH = '<rect x="6" y="5" width="4" height="14" rx="1.5" fill="#24130A"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#24130A"/>';

let missing = false;
let userPaused = false;
let ended = false;
const holds = new Set();
let resumeAfterHolds = false;
let lastTime = 0;
let midrollAcc = 0;

// ---------- fullscreen ----------
export function requestFs() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen().catch(() => {});
}

// ---------- holds: ads / dislike sound pause the main video, then resume only if it was playing ----------
export function hold(reason) {
  const token = { reason };
  if (holds.size === 0) {
    resumeAfterHolds = !video.paused && !ended;
    if (!video.paused) video.pause();
  }
  holds.add(token);
  return () => {
    if (!holds.delete(token)) return;
    if (holds.size === 0 && resumeAfterHolds && state.screen === S.PLAYER && !ended) safePlay();
  };
}

function safePlay() {
  const p = video.play();
  if (p) p.catch(() => { video.muted = true; video.play().catch(() => {}); });
}

// ---------- commands ----------
export function playMain() {
  if (missing) return 'The video is missing. Playing nothing, loudly.';
  if (ended) { ended = false; video.currentTime = 0; }
  userPaused = false;
  if (holds.size) { resumeAfterHolds = true; syncUi(); return 'Fine. Playing, right after this message.'; }
  safePlay();
  syncUi();
  return 'Fine. Playing. Was that so hard?';
}

export function pauseMain() {
  if (missing) return 'Paused. It was already nothing.';
  userPaused = true;
  resumeAfterHolds = false;
  video.pause();
  syncUi();
  return 'Paused. Politely.';
}

export function markEnded() {
  ended = true;
  video.pause();
  syncUi();
}

export const isPlaying = () => !video.paused && !ended;

function syncUi() {
  elPaused.hidden = !(userPaused && !ended && !missing);
  elEnded.hidden = !ended;
  decoyIcon.innerHTML = video.paused ? PLAY_PATH : PAUSE_PATH;
}

// ---------- volume (driven by scream) ----------
export function setVolume(v, peak = v) {
  v = Math.max(0, Math.min(1, v));
  video.volume = v;
  if (v > 0 && video.muted) video.muted = false;
  vFill.style.height = `${v * 100}%`;
  vPeak.style.bottom = `${Math.max(0, Math.min(1, peak)) * 100}%`;
  vText.textContent = Math.round(v * 100);
}

// ---------- open / close ----------
export function openPlayer(v) {
  state.video = v;
  missing = false;
  ended = false;
  userPaused = false;
  holds.clear();
  midrollAcc = 0;
  lastTime = 0;
  elTitle.textContent = v.title;
  elMissing.hidden = true;
  video.hidden = false;
  world.classList.add('is-player');
  video.muted = false;
  setVolume(0, 0);
  video.src = encodeURI(v.src);
  video.currentTime = 0;
  safePlay();
  syncUi();
}

export function closePlayer() {
  stopFlood();
  closeAllAds();
  video.pause();
  video.removeAttribute('src');
  video.load();
  world.classList.remove('is-player');
  state.video = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  state.needsFullscreen = false;
}

export function initPlayer() {
  setMainVideoHooks({ hold });

  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    missing = true;
    video.hidden = true;
    elMissing.hidden = false;
    syncUi();
  });
  video.addEventListener('play', syncUi);
  video.addEventListener('pause', syncUi);
  video.addEventListener('ended', () => { ended = true; syncUi(); });

  // mid-roll: count actual playback time (timeupdate deltas, so pauses don't count)
  video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    const d = t - lastTime;
    lastTime = t;
    if (!TUNING.midrollEveryMs || video.paused || d <= 0 || d > 1.5) return;
    midrollAcc += d * 1000;
    if (midrollAcc >= TUNING.midrollEveryMs) {
      midrollAcc = 0;
      if (!hasAd('midroll') && !state.adFloodActive) createAd({ source: 'midroll' });
    }
  });
  video.addEventListener('seeking', () => { lastTime = video.currentTime; });

  // Decoy rule
  decoy.addEventListener('fakeclick', () => toast('Nice try. Press Space and TYPE it.', 'warn'));
  like.addEventListener('fakeclick', () => toast('+1. Nobody cares.', 'like'));

  // Fullscreen re-entry: if kicked out while in the player, the next keypress silently puts you back.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && state.screen === S.PLAYER) state.needsFullscreen = true;
  });
  bus.on('key:any', () => {
    if (state.needsFullscreen && state.screen === S.PLAYER) {
      state.needsFullscreen = false;
      requestFs();
    }
  });
}
