// F10 — The 67 forward challenge. 15s to type as many 67s as you can. Paste is for cowards.
import { bus, state } from '../state.js';
import { TUNING } from '../config/tuning.js';
import { video } from './player.js';

const wrap = document.getElementById('modal-67');
const playView = document.getElementById('m67-play');
const resultView = document.getElementById('m67-result');
const label = document.getElementById('m67-label');
const timer = document.getElementById('m67-timer');
const input = document.getElementById('m67-input');
const count = document.getElementById('m67-count');
const bar = document.getElementById('m67-bar');
const gain = document.getElementById('m67-gain');
const msg = document.getElementById('m67-msg');
const fx = document.getElementById('fx-layer');

let interval = null;
let closeTimer = null;
let endsAt = 0;
let n = 0;

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(k) {
  if (k < 20) return ONES[k];
  if (k < 100) return TENS[Math.floor(k / 10)] + (k % 10 ? `-${ONES[k % 10]}` : '');
  if (k === 100) return 'one hundred';
  return String(k);
}

function sixSeven() {
  const el = document.createElement('div');
  el.className = 'six-seven';
  el.style.setProperty('--tilt', `${(Math.random() - 0.5) * 16}deg`);
  el.innerHTML = 'SIX SEVEN<span>¯\\_(ツ)_/¯</span>';
  fx.appendChild(el);
  setTimeout(() => el.remove(), 320);
}

function countMatches() {
  return (input.value.match(/67/g) || []).length; // non-overlapping
}

function onInput() {
  const k = countMatches();
  if (k > n) sixSeven();
  n = k;
  count.textContent = n;
  bar.style.width = `${Math.min(100, (n / TUNING.skip67Target) * 100)}%`;
  label.textContent = n ? '67 · MID-TYPING' : '67 · START';
}

function renderTimer() {
  const left = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
  timer.textContent = `0:${String(left).padStart(2, '0')}`;
  if (left <= 0) finish();
}

function finish() {
  clearInterval(interval);
  interval = null;
  input.blur();
  const secs = Math.min(TUNING.skip67MaxSeconds, (n / TUNING.skip67Target) * TUNING.skip67MaxSeconds);
  const s = Math.round(secs * 10) / 10;
  if (isFinite(video.duration)) video.currentTime = Math.min(video.duration - 0.05, video.currentTime + secs);
  playView.hidden = true;
  resultView.hidden = false;
  gain.textContent = `+${s}s`;
  msg.textContent = `You typed 67 ${n === 1 ? 'once' : `${words(n)} times`} for ${s} seconds. Worth it?`;
  closeTimer = setTimeout(close, 2000);
}

export function open67() {
  if (state.challenge67Open) return;
  state.challenge67Open = true;
  n = 0;
  input.value = '';
  count.textContent = '0';
  bar.style.width = '0%';
  label.textContent = '67 · START';
  playView.hidden = false;
  resultView.hidden = true;
  wrap.hidden = false;
  endsAt = performance.now() + TUNING.skip67DurationMs;
  renderTimer();
  interval = setInterval(renderTimer, 200);
  input.focus();
}

export function close() {
  clearInterval(interval);
  clearTimeout(closeTimer);
  interval = null;
  wrap.hidden = true;
  input.blur();
  state.challenge67Open = false;
}

export function initSkip67() {
  input.addEventListener('input', onInput);
  for (const t of ['paste', 'drop', 'cut']) input.addEventListener(t, (e) => e.preventDefault());
  input.addEventListener('beforeinput', (e) => { if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') e.preventDefault(); });
  document.getElementById('btn-forward').addEventListener('fakeclick', open67);
  bus.on('escape', () => { if (state.challenge67Open) close(); });
}
