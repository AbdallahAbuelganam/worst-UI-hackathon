// F12 — The dislike button runs away 3 times, gives up on the 4th, and then punishes you.
import { state } from '../state.js';
import { TUNING } from '../config/tuning.js';
import { playFile } from '../effects/sfx.js';
import { scheduleFlood } from '../ads.js';
import { hold } from './player.js';
import { toast } from '../ui/toast.js';

const bar = document.getElementById('player-bar');
const slot = document.getElementById('dislike-slot');
const btn = document.getElementById('btn-dislike');
let busy = false;

function barPos(el) {
  const b = bar.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - b.left, y: r.top - b.top };
}

function ghosts(from, to) {
  [0.15, 0.35, 0.6].forEach((op, i) => {
    const g = document.createElement('div');
    g.className = 'dislike-ghost';
    const t = (i + 1) / 4;
    g.style.left = `${from.x + (to.x - from.x) * t}px`;
    g.style.top = `${from.y + (to.y - from.y) * t}px`;
    g.style.opacity = op;
    bar.appendChild(g);
    setTimeout(() => g.remove(), 320);
  });
}

function dodge() {
  if (busy || state.dislikeDodges >= TUNING.dislikeDodges) return;
  const from = barPos(btn);
  const bw = bar.clientWidth;
  const size = 56;
  // a random FREE spot in the control bar (not on another button), far from where it was
  const b = bar.getBoundingClientRect();
  const taken = ['btn-decoy', 'btn-forward', 'btn-mic', 'btn-like', 'timeline-dot']
    .map((id) => document.getElementById(id).getBoundingClientRect())
    .map((r) => [r.left - b.left - 12, r.right - b.left + 12]);
  taken.push([document.querySelector('.mic').getBoundingClientRect().left - b.left - 12, document.querySelector('.mic').getBoundingClientRect().right - b.left + 12]);
  const free = (cx) => taken.every(([l, r]) => cx + size < l || cx > r);
  let x = from.x;
  for (let i = 0; i < 60; i++) {
    const cand = 16 + Math.random() * (bw - size - 32);
    if (free(cand) && Math.abs(cand - from.x) > 140) { x = cand; break; }
  }
  const y = (bar.clientHeight - size) / 2 + (Math.random() - 0.5) * 16;
  btn.classList.add('is-free');
  if (btn.parentElement !== bar) bar.appendChild(btn);
  // 150ms jump with a motion trail
  btn.animate([{ left: `${from.x}px`, top: `${from.y}px` }, { left: `${x}px`, top: `${y}px` }], { duration: 150, easing: 'ease-out' });
  btn.style.left = `${x}px`;
  btn.style.top = `${y}px`;
  ghosts(from, { x, y });
  state.dislikeDodges++;
  if (state.dislikeDodges >= TUNING.dislikeDodges) btn.classList.add('gave-up');
}

export function resetDislike() {
  state.dislikeDodges = 0;
  btn.classList.remove('is-free', 'gave-up');
  btn.style.left = '';
  btn.style.top = '';
  slot.appendChild(btn);
}

async function dislike() {
  if (busy || state.dislikeDodges < TUNING.dislikeDodges) return;
  busy = true;
  // pause → dislike.ogg → resume → 10s later: ad flood
  const release = hold('dislike');
  toast('Feedback received. Processing your feelings…', 'danger', 3000);
  await playFile('resources/dislike.ogg').done;
  release();
  busy = false;
  resetDislike();
  scheduleFlood();
}

export function initDislike() {
  btn.addEventListener('fakeenter', () => {
    // the button gives up on the 4th hover; until then it jumps away
    if (state.dislikeDodges < TUNING.dislikeDodges) requestAnimationFrame(dodge);
  });
  btn.addEventListener('fakeclick', dislike);
}
