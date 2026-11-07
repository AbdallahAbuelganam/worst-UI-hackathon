// F2 — Reel ad pop-up (one component, used everywhere): bird ads, mid-rolls, the dislike flood.
// The X is tiny and never grows. Clicks 1–6 grow the ad; click 7 pauses everything,
// plays "skip add.ogg", then closes it.
import { bus, state } from './state.js';
import { TUNING } from './config/tuning.js';
import { AD_REELS, AD_FOLDER, MAIN_AD, MAIN_AD_LABEL } from './config/ads.js';
import { playFile } from './effects/sfx.js';
import { toast } from './ui/toast.js';

const world = document.getElementById('world');
const layer = document.getElementById('ad-layer');
const floodPanel = document.getElementById('flood-panel');
const floodCount = document.getElementById('flood-count');
const floodPlaying = document.getElementById('flood-playing');

const SKIP_SOUND = 'resources/skip add.ogg';
let nextId = 1;
let lastReel = null;
let reels = [...AD_REELS];
let spawned = 0; // every ad starts a bit bigger than the last one
const isMain = (r) => !!r && r.toLowerCase() === MAIN_AD.toLowerCase();
let floodTimer = null;
let floodDelay = null;
const brokenReels = new Set();

// Hooks into the main video (set by the player) so ads can pause/resume it.
let mainVideo = { hold: () => () => {} };
export function setMainVideoHooks(hooks) { mainVideo = hooks; }

const X_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 4l6 6M10 4l-6 6" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const PAUSE_SVG = `<svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30" fill="#8C5220" stroke="#F5C542" stroke-width="4"/><rect x="26" y="24" width="7" height="24" rx="2" fill="#F6ECD6"/><rect x="39" y="24" width="7" height="24" rx="2" fill="#F6ECD6"/></svg>`;
const SPEAKER_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5C542" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>`;

// Fallback static parody ads — same 9:16 frame, 2005 energy
const FALLBACKS = [
  `<div class="fad fad--falafel"><svg class="fad__icon" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="24" fill="#8C5220" stroke="#5A3413" stroke-width="3"/><circle cx="20" cy="24" r="3" fill="#F6ECD6"/><circle cx="36" cy="24" r="3" fill="#F6ECD6"/><path d="M18 34 Q28 42 38 34" stroke="#F6ECD6" stroke-width="3" fill="none" stroke-linecap="round"/></svg><div class="fad__big">Hot single falafels in your area</div><div class="fad__small">3 are frying right now</div></div>`,
  `<div class="fad fad--ram"><div class="fad__big">Download more RAM</div><div class="fad__btn">DOWNLOAD NOW</div><div class="fad__small">100% legit · 0% RAM</div></div>`,
  `<div class="fad fad--doctors"><svg class="fad__icon" viewBox="0 0 22 24" shape-rendering="crispEdges" aria-hidden="true"><g fill="#F5C542"><rect x="11" y="0" width="10" height="7"/><rect x="9" y="8" width="8" height="7"/><rect x="4" y="10" width="7" height="6"/><rect x="0" y="8" width="2" height="4"/><rect x="7" y="16" width="2" height="6"/><rect x="12" y="16" width="2" height="6"/></g></svg><div class="fad__big">Doctors HATE this one weird T-rex</div></div>`,
  `<div class="fad fad--virus"><svg class="fad__icon" viewBox="0 0 24 24" fill="none" stroke="#D63A2A" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5" stroke-linecap="round"/></svg><div class="fad__big">Your PC has 67 viruses.</div><div class="fad__small">Type 67 to fix.</div></div>`,
  `<div class="fad fad--fries"><svg class="fad__icon" viewBox="0 0 64 64" aria-hidden="true"><path d="M14 30 L50 30 L45 58 L19 58 Z" fill="#D63A2A" stroke="#24130A" stroke-width="3" stroke-linejoin="round"/><g fill="#F6ECD6" stroke="#24130A" stroke-width="2"><rect x="18" y="8" width="6" height="26" rx="2"/><rect x="27" y="4" width="6" height="30" rx="2"/><rect x="36" y="10" width="6" height="24" rx="2"/></g></svg><div class="fad__big">Free fries*</div><div class="fad__small">*no</div></div>`,
  `<div class="fad fad--hangman"><div class="fad__word">_ A _ _</div><div class="fad__big">Learn hangman in 3 days</div><div class="fad__small">or your money back (you paid nothing)</div></div>`,
  `<div class="fad fad--oil"><div class="fad__huge">#1</div><div class="fad__big">Oil so hot it fried this ad</div><div class="fad__small">Ask your doctor about tahini</div></div>`,
  `<div class="fad fad--congrats"><div class="fad__kicker">CONGRATULATIONS</div><div class="fad__big">You are the 1,000,000th person to press Enter</div><div class="fad__small">Prize: this ad, bigger</div></div>`,
];

/** Find every .mp4 in the ads folder via the dev server's directory listing. */
export async function discoverReels() {
  try {
    const base = new URL(encodeURI(AD_FOLDER), location.href);
    const res = await fetch(base, { headers: { Accept: 'text/html' } });
    if (!res.ok) return;
    const html = await res.text();
    const found = new Set();
    for (const m of html.matchAll(/href=["']([^"']+?\.mp4)["']/gi)) {
      const path = decodeURIComponent(new URL(m[1], base).pathname).replace(/^\//, '');
      found.add(path);
    }
    if (found.size) reels = [...new Set([...found, ...AD_REELS])];
  } catch { /* keep the config list */ }
}

function pickReel() {
  const pool = reels.filter((r) => !brokenReels.has(r));
  if (!pool.length) return null;
  // the main sponsor always gets the first slot
  if (lastReel === null) {
    const main = pool.find(isMain);
    if (main) { lastReel = main; return main; }
  }
  let r = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1) while (r === lastReel) r = pool[Math.floor(Math.random() * pool.length)];
  lastReel = r;
  return r;
}

function worldSize() {
  return { w: world.clientWidth, h: world.clientHeight };
}

function sizeFor(step, ad) {
  const { h: wh, w: ww } = worldSize();
  // pop-ups get bigger and bigger: each new ad starts larger, and it keeps creeping while open
  const extra = ad ? ad.boost + ad.creep : 0;
  let h = wh * Math.min(0.94, TUNING.adSizeStepsVh[step] / 100 + extra);
  let w = h * 9 / 16;
  if (w > ww * 0.96) { w = ww * 0.96; h = w * 16 / 9; }
  return { w, h };
}

function layout(ad) {
  const { w, h } = sizeFor(ad.sizeStep, ad);
  const { w: ww, h: wh } = worldSize();
  // grow from centre, then clamp so the box stays fully on screen
  let left = ad.cx - w / 2;
  let top = ad.cy - h / 2;
  left = Math.max(4, Math.min(ww - w - 4, left));
  top = Math.max(4, Math.min(wh - h - 4, top));
  ad.cx = left + w / 2;
  ad.cy = top + h / 2;
  Object.assign(ad.el.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
  ad.el.dataset.step = ad.sizeStep;
  return { w, h };
}

function useFallback(ad) {
  if (ad.video) { ad.video.remove(); ad.video = null; }
  if (ad.frame.querySelector('.fad')) return;
  ad.frame.insertAdjacentHTML('afterbegin', FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)]);
}

/** Only the newest ad has sound; only the N newest reels play, older ones freeze. */
export function refreshPlayback() {
  const live = state.openAds.filter((a) => !a.closing);
  live.forEach((ad, i) => {
    const rank = live.length - 1 - i; // 0 = newest
    ad.el.classList.toggle('is-loud', rank === 0);
    const v = ad.video;
    if (!v) return;
    v.muted = rank !== 0;
    v.volume = 1;
    if (rank < TUNING.adFloodPlayingCount) {
      if (v.paused) v.play().catch(() => { if (!v.isConnected) return; v.muted = true; v.play().catch(() => {}); });
    } else if (!v.paused) v.pause();
  });
  if (state.adFloodActive) {
    floodCount.textContent = state.openAds.length;
    floodPlaying.textContent = live.filter((a) => a.video && !a.video.paused).length || Math.min(live.length, TUNING.adFloodPlayingCount);
  }
}

export function createAd({ source = 'midroll' } = {}) {
  const id = nextId++;
  const el = document.createElement('div');
  el.className = `ad is-${source}`;
  el.dataset.ad = id;
  el.innerHTML = `
    <div class="ad__frame">
      <div class="ad__top"><span class="ad__pill">Ad</span><span class="ad__skip">Skip in 5</span></div>
      <div class="ad__x" data-hoverable role="button" aria-label="Close ad">${X_SVG}</div>
      <div class="ad__progress"><i></i></div>
      <div class="ad__main">★ ${MAIN_AD_LABEL}</div>
      <div class="ad__loud">${SPEAKER_SVG}newest · loud</div>
      <div class="ad__closing">${PAUSE_SVG}<div class="ad__skipping">Skipping…</div><div class="ad__enjoy">Please enjoy this 6.8 second sound about skipping.</div><div class="ad__bar"><i></i></div></div>
    </div>`;
  const frame = el.querySelector('.ad__frame');
  const boost = Math.min(TUNING.adBoostMax, spawned * TUNING.adBoostPerAd);
  spawned++;
  const ad = { id, el, frame, video: null, clicks: 0, sizeStep: 0, closing: false, source, skip: 5, cx: 0, cy: 0, boost, creep: 0 };

  const reel = pickReel();
  if (isMain(reel)) el.classList.add('is-main');
  if (reel) {
    const v = document.createElement('video');
    v.className = 'ad__reel';
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.preload = 'auto';
    v.muted = true; // unmuted by refreshPlayback if it is the newest
    v.src = encodeURI(reel);
    v.addEventListener('error', () => { brokenReels.add(reel); useFallback(ad); });
    v.addEventListener('timeupdate', () => {
      if (v.duration) el.querySelector('.ad__progress i').style.width = `${(v.currentTime / v.duration) * 100}%`;
    });
    frame.prepend(v);
    ad.video = v;
  } else {
    useFallback(ad);
  }

  // random position that keeps it fully on screen
  const { w: ww, h: wh } = worldSize();
  const { w, h } = sizeFor(0, ad);
  ad.cx = w / 2 + 4 + Math.random() * Math.max(0, ww - w - 8);
  ad.cy = h / 2 + 4 + Math.random() * Math.max(0, wh - h - 8 - (state.screen === 'PLAYER' ? 120 : 0));
  if (source === 'flood') el.style.rotate = `${(Math.random() - 0.5) * 14}deg`;
  layout(ad);
  layer.appendChild(el);

  // "Skip in 5" counts UP. Forever.
  ad.skipTimer = setInterval(() => {
    if (ad.closing) return;
    ad.skip++;
    el.querySelector('.ad__skip').textContent = `Skip in ${ad.skip}`;
    ad.creep += TUNING.adCreepPerSec;
    layout(ad);
  }, 1000);

  el.querySelector('.ad__x').addEventListener('fakeclick', (e) => { e.stopPropagation(); clickX(ad); });
  el.addEventListener('fakeclick', () => { if (!ad.closing) toast('Thanks for your interest. Nothing happens.', 'info'); });

  state.openAds.push(ad);
  // safety cap: remove the oldest beyond 15
  while (state.openAds.length > TUNING.adFloodCap) removeAd(state.openAds[0], true);
  refreshPlayback();
  bus.emit('ad:opened', ad);
  return ad;
}

function clickX(ad) {
  if (ad.closing) return; // clicks during closing are ignored
  ad.clicks++;
  if (ad.clicks < TUNING.adCloseClicks) {
    const before = sizeFor(ad.sizeStep, ad).h;
    ad.sizeStep = Math.min(TUNING.adSizeStepsVh.length - 1, ad.sizeStep + 1);
    const after = layout(ad).h;
    ad.el.style.setProperty('--from', (before / after).toFixed(3));
    ad.el.classList.remove('is-growing');
    void ad.el.offsetWidth;
    ad.el.classList.add('is-growing');
    return;
  }
  closeWithSound(ad);
}

function closeWithSound(ad) {
  ad.closing = true;
  ad.el.classList.add('is-closing');
  // 1. main video (if any) + the reel pause
  const release = mainVideo.hold('ad');
  const otherReels = state.openAds.filter((a) => a.video && !a.video.paused);
  otherReels.forEach((a) => a.video.pause());
  if (ad.video) ad.video.pause();
  // 2. skip add.ogg plays
  const { done, audio } = playFile(SKIP_SOUND);
  const bar = ad.el.querySelector('.ad__bar i');
  const t0 = performance.now();
  const tick = () => {
    if (!ad.el.isConnected || !ad.closing) return;
    const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 6.8;
    const p = audio.duration ? audio.currentTime / dur : (performance.now() - t0) / 6800;
    bar.style.width = `${Math.min(100, p * 100)}%`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // 3. when it ends: close, resume what was playing
  done.then(() => {
    removeAd(ad);
    release();
    refreshPlayback();
    bus.emit('ad:closed', ad);
  });
}

function removeAd(ad, instant = false) {
  clearInterval(ad.skipTimer);
  state.openAds = state.openAds.filter((a) => a !== ad);
  if (ad.video) { ad.video.pause(); ad.video.removeAttribute('src'); ad.video.load(); }
  if (instant) { ad.el.remove(); return; }
  ad.el.classList.remove('is-growing');
  ad.el.classList.add('is-leaving');
  setTimeout(() => ad.el.remove(), 200);
}

export function closeAllAds() {
  [...state.openAds].forEach((a) => removeAd(a));
  refreshPlayback();
}

export const hasAd = (source) => state.openAds.some((a) => a.source === source);

// ---------- Ad flood (F12) ----------
export function scheduleFlood() {
  if (state.adFloodActive || floodDelay) return;
  floodDelay = setTimeout(() => { floodDelay = null; startFlood(); }, TUNING.adFloodDelayMs);
}

export function startFlood() {
  if (state.adFloodActive) return;
  state.adFloodActive = true;
  floodPanel.hidden = false;
  const burst = () => { for (let i = 0; i < TUNING.adFloodPerTick; i++) setTimeout(() => { if (state.adFloodActive) createAd({ source: 'flood' }); }, i * 120); };
  burst();
  floodTimer = setInterval(burst, TUNING.adFloodIntervalMs);
}

/** "sorry, I like the video" — closes all ads at once (no sound). */
export function stopFlood() {
  const was = state.adFloodActive || !!floodDelay;
  clearInterval(floodTimer);
  clearTimeout(floodDelay);
  floodTimer = null;
  floodDelay = null;
  state.adFloodActive = false;
  floodPanel.hidden = true;
  closeAllAds();
  return was;
}

export function initAds() {
  discoverReels();
  addEventListener('resize', () => state.openAds.forEach(layout));
}
