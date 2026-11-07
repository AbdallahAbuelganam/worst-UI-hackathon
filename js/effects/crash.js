// F9 / S9 — flash 80ms → shake 600ms (decaying) → crumbs 1s → crack scar fades in 200ms (stays).
import { state } from '../state.js';
import { explosion } from './sfx.js';

const world = document.getElementById('world');
const flashEl = document.getElementById('flash');
const fx = document.getElementById('fx-layer');
const scars = document.getElementById('scar-layer');
const MAX_SCARS = 3;

export function shake() {
  world.classList.remove('is-shaking');
  void world.offsetWidth;
  world.classList.add('is-shaking');
  setTimeout(() => world.classList.remove('is-shaking'), 620);
}

export function flash(kind = 'white') {
  flashEl.className = 'flash';
  void flashEl.offsetWidth;
  flashEl.classList.add(kind === 'pink' ? 'is-pink' : 'is-on');
}

// convert a screen point to #world-local coords (ignores float rotation, close enough for crumbs)
function toLocal(sx, sy) {
  const r = world.getBoundingClientRect();
  return { x: sx - r.left, y: sy - r.top, w: r.width, h: r.height };
}

function crumbs(lx, ly) {
  const kinds = ['ball', 'ball', 'fry', 'fry', 'herb', 'oil'];
  for (let i = 0; i < 30; i++) {
    const k = kinds[i % kinds.length];
    const c = document.createElement('span');
    c.className = `crumb crumb--${k}`;
    const size = k === 'fry' ? [6 + Math.random() * 3, 16 + Math.random() * 10] : [6 + Math.random() * 12];
    c.style.width = `${size[0]}px`;
    c.style.height = `${size[1] ?? size[0]}px`;
    c.style.left = `${lx}px`;
    c.style.top = `${ly}px`;
    fx.appendChild(c);
    const ang = Math.random() * Math.PI * 2;
    const v = 120 + Math.random() * 380;
    const dx = Math.cos(ang) * v;
    const dy = Math.sin(ang) * v - 160;
    const rot = (Math.random() - 0.5) * 720;
    c.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy * 0.6}px)) rotate(${rot * 0.6}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 420}px)) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 1000, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' }).onfinish = () => c.remove();
  }
}

// a procedurally drawn crack: radial lines from an impact point + a small broken ring
function scarSvg(cx, cy, w, h) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('stroke', '#FFF8EA');
  g.setAttribute('stroke-width', '1.8');
  g.setAttribute('fill', 'none');
  g.setAttribute('opacity', '.85');
  g.setAttribute('stroke-linejoin', 'round');
  let d = '';
  const rays = 7 + Math.floor(Math.random() * 4);
  const reach = Math.max(w, h);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + Math.random() * 0.5;
    let px = cx, py = cy;
    d += `M${cx} ${cy}`;
    const segs = 4;
    const len = reach * (0.25 + Math.random() * 0.55);
    for (let s = 1; s <= segs; s++) {
      const aa = a + (Math.random() - 0.5) * 0.35;
      px = cx + Math.cos(aa) * (len * s / segs);
      py = cy + Math.sin(aa) * (len * s / segs);
      d += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }
  // ring
  const r = 22 + Math.random() * 18;
  d += ' M';
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rr = r * (0.8 + Math.random() * 0.4);
    d += `${i ? ' L' : ''}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  g.appendChild(path);
  svg.appendChild(g);
  if (scars.children.length === MAX_SCARS - 1) {
    const haze = document.createElementNS(ns, 'rect');
    haze.setAttribute('width', w); haze.setAttribute('height', h);
    haze.setAttribute('fill', '#FFF8EA'); haze.setAttribute('opacity', '.06');
    svg.appendChild(haze);
  }
  return svg;
}

function addScar(lx, ly, w, h) {
  if (scars.children.length >= MAX_SCARS) return;
  scars.appendChild(scarSvg(lx, ly, w, h));
  state.scarLevel = scars.children.length;
}

/** Full crash at a screen point. */
export function trigger(sx, sy) {
  const { x, y, w, h } = toLocal(sx, sy);
  explosion();
  flash();
  setTimeout(() => { shake(); crumbs(x, y); }, 80);
  setTimeout(() => addScar(x, y, w, h), 680);
}

export function repair() {
  const had = scars.children.length > 0;
  scars.innerHTML = '';
  state.scarLevel = 0;
  return had;
}
