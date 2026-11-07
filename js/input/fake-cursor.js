// "There IS a mouse, it's just on your keyboard."
// Screen-coordinate cursor moved by arrow keys, accelerating while held.
// Hover = fakeenter/fakeleave on [data-hoverable]; Enter = fakeclick on whatever is under it.
import { bus, cursorActive } from '../state.js';
import { TUNING } from '../config/tuning.js';

const el = document.getElementById('fake-cursor');
const held = new Map(); // key -> timestamp pressed
let x = innerWidth / 2;
let y = innerHeight / 2;
let hovered = null;
let visible = false;
let placedOnce = false;

export const cursor = {
  get x() { return x; },
  get y() { return y; },
  get visible() { return visible; },
  moveTo(nx, ny) { x = nx; y = ny; place(); },
};

function place() {
  el.style.transform = `translate(${x}px, ${y}px)`;
}

function targetAt() {
  const raw = document.elementFromPoint(x, y);
  return raw;
}

function updateHover() {
  const raw = visible ? targetAt() : null;
  const h = raw ? raw.closest('[data-hoverable]') : null;
  if (h !== hovered) {
    if (hovered) { hovered.classList.remove('is-hover'); hovered.dispatchEvent(new CustomEvent('fakeleave', { bubbles: true })); }
    hovered = h;
    if (hovered) { hovered.classList.add('is-hover'); hovered.dispatchEvent(new CustomEvent('fakeenter', { bubbles: true })); }
  }
  el.classList.toggle('is-hover', !!hovered);
}

function tick(now) {
  if (visible && held.size) {
    let dx = 0, dy = 0;
    for (const [key, t0] of held) {
      const k = Math.min(1, (now - t0) / TUNING.cursorRampMs);
      const v = TUNING.cursorSpeedStart + (TUNING.cursorSpeedMax - TUNING.cursorSpeedStart) * k * k;
      if (key === 'ArrowLeft') dx -= v;
      if (key === 'ArrowRight') dx += v;
      if (key === 'ArrowUp') dy -= v;
      if (key === 'ArrowDown') dy += v;
    }
    x = Math.max(0, Math.min(innerWidth - 2, x + dx));
    y = Math.max(0, Math.min(innerHeight - 2, y + dy));
    place();
  }
  // re-check every frame: the page floats and buttons dodge, so things move under us
  updateHover();
  requestAnimationFrame(tick);
}

function setVisible(v) {
  // first appearance (or lost off-screen): start in the middle
  if (v && !visible && (!placedOnce || x <= 0 || y <= 0 || x >= innerWidth || y >= innerHeight)) {
    x = innerWidth / 2; y = innerHeight / 2; placedOnce = true; place();
  }
  visible = v;
  el.hidden = !v;
  if (!v) held.clear();
}

function click() {
  if (!visible) return;
  el.classList.remove('is-click');
  void el.offsetWidth;
  el.classList.add('is-click');
  setTimeout(() => el.classList.remove('is-click'), 160);
  const raw = targetAt();
  if (raw) raw.dispatchEvent(new CustomEvent('fakeclick', { bubbles: true, detail: { x, y } }));
}

export function initFakeCursor() {
  place();
  bus.on('cursor:down', (key) => { if (!held.has(key)) held.set(key, performance.now()); });
  bus.on('cursor:up', (key) => held.delete(key));
  bus.on('cursor:release', () => held.clear());
  bus.on('cursor:click', click);
  bus.on('state', () => setVisible(cursorActive()));
  addEventListener('resize', () => { x = Math.max(0, Math.min(x, innerWidth - 2)); y = Math.max(0, Math.min(y, innerHeight - 2)); place(); });
  setVisible(cursorActive());
  requestAnimationFrame(tick);
}
