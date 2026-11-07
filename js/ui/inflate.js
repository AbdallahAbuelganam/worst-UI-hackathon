// Every pop-up opens a bit bigger than the last one, and keeps swelling while it's open.
// Watches the pop-ups centrally, so no feature module has to know about it.
// Reel ads grow on their own (see ads.js): they need the X to stay 14px.
import { TUNING } from '../config/tuning.js';

const world = document.getElementById('world');
const POPUP_IDS = [
  'command-box', 'modal-67', 'modal-scream', 'flood-panel',
  'hangman-lose', 'hangman-win', 'player-state-paused', 'player-state-ended',
];
const live = new Map(); // el -> { base, t0 }
let opens = 0;
let running = false;

function visible(el) {
  return el.isConnected && !el.hidden && el.getClientRects().length > 0;
}

function inflate(el) {
  opens++;
  live.set(el, { base: 1 + Math.min(TUNING.popupGrowMax, opens * TUNING.popupGrowPerOpen), t0: performance.now() });
  if (!running) { running = true; requestAnimationFrame(loop); }
}

function loop(now) {
  for (const [el, s] of live) {
    if (!visible(el)) { el.style.scale = ''; live.delete(el); continue; }
    const want = s.base + Math.min(TUNING.popupCreepMax, ((now - s.t0) / 1000) * TUNING.popupCreepPerSec);
    // never bigger than the screen
    const w = el.offsetWidth || 1, h = el.offsetHeight || 1;
    const fit = Math.min((world.clientWidth * 0.96) / w, (world.clientHeight * 0.96) / h);
    el.style.scale = Math.max(1, Math.min(want, fit)).toFixed(3);
  }
  if (live.size) requestAnimationFrame(loop);
  else running = false;
}

export function initInflate() {
  const attrObs = new MutationObserver((records) => {
    for (const r of records) {
      const el = r.target;
      if (!el.hidden && !live.has(el)) inflate(el);
    }
  });
  for (const id of POPUP_IDS) {
    const el = document.getElementById(id);
    if (el) attrObs.observe(el, { attributes: true, attributeFilter: ['hidden'] });
  }
  // toasts and the foreword are added as new elements
  const childObs = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) {
      if (n.nodeType === 1 && (n.classList.contains('toast') || n.classList.contains('foreword'))) inflate(n);
    }
  });
  childObs.observe(document.getElementById('toast-layer'), { childList: true });
  childObs.observe(document.getElementById('fx-layer'), { childList: true });
}
