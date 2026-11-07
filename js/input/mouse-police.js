// F6 — The real cursor is hidden, real clicks/wheel are blocked, and moving the mouse gets you arrested.
import { TUNING } from '../config/tuning.js';
import { shake } from '../effects/crash.js';

const banner = document.getElementById('mouse-police');
let last = -Infinity;

function block(e) {
  e.preventDefault();
  e.stopPropagation();
}

function arrest() {
  const now = performance.now();
  if (now - last < TUNING.mousePoliceThrottleMs) return;
  last = now;
  banner.classList.remove('is-on');
  void banner.offsetWidth;
  banner.classList.add('is-on');
  shake();
}

export function initMousePolice() {
  for (const type of ['click', 'mousedown', 'mouseup', 'dblclick', 'auxclick', 'contextmenu', 'dragstart', 'selectstart']) {
    window.addEventListener(type, block, { capture: true });
  }
  window.addEventListener('wheel', block, { capture: true, passive: false });
  window.addEventListener('touchstart', block, { capture: true, passive: false });
  let lx = null, ly = null;
  window.addEventListener('mousemove', (e) => {
    // ignore synthetic zero-movement events (e.g. after layout changes)
    if (lx !== null && Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly) < 2) return;
    const first = lx === null;
    lx = e.clientX; ly = e.clientY;
    if (!first || e.movementX || e.movementY) arrest();
  }, { capture: true });
}
