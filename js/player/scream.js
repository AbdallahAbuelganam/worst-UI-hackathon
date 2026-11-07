// F11 — Scream volume. 5s window, max volume = loudest peak, then it decays to 0 over 20s.
import { bus, state } from '../state.js';
import { TUNING } from '../config/tuning.js';
import { audioCtx } from '../effects/sfx.js';
import { setVolume } from './player.js';

const wrap = document.getElementById('modal-scream');
const vWait = document.getElementById('scream-wait');
const vLive = document.getElementById('scream-live');
const vDenied = document.getElementById('scream-denied');
const elTimer = document.getElementById('scream-timer');
const elLevel = document.getElementById('scream-level');
const elPeak = document.getElementById('scream-peak');
const elPeakText = document.getElementById('scream-peak-text');

let busy = false;
let decayRaf = null;
let closeTimer = null;

function show(view) {
  wrap.hidden = false;
  for (const v of [vWait, vLive, vDenied]) v.hidden = v !== view;
}

function hide() {
  wrap.hidden = true;
  state.screamOpen = false;
}

function quip(p) {
  const pct = Math.round(p * 100);
  if (pct < 15) return `Peak: ${pct}%. Whisper detected. Pathetic.`;
  if (pct < 45) return `Peak: ${pct}%. Try harder.`;
  if (pct < 80) return `Peak: ${pct}%. Neighbours: concerned.`;
  return `Peak: ${pct}%. The glass is cracking.`;
}

function decayFrom(peak) {
  cancelAnimationFrame(decayRaf);
  const t0 = performance.now();
  const step = (now) => {
    // hold the scream volume for a full minute, then slide down
    const t = Math.max(0, now - t0 - TUNING.volumeHoldMs) / TUNING.volumeDecayMs;
    const v = Math.max(0, peak * (1 - t));
    // the peak line drops slower than the volume, so you can see what you lost
    const line = Math.max(0, peak * (1 - t / 2));
    setVolume(v, line);
    if (t < 2) decayRaf = requestAnimationFrame(step);
  };
  decayRaf = requestAnimationFrame(step);
}

export async function openScream() {
  if (busy) return;
  busy = true;
  state.screamOpen = true;
  clearTimeout(closeTimer);
  show(vWait);
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    show(vDenied);
    busy = false;
    closeTimer = setTimeout(hide, 3500);
    return;
  }
  const ac = audioCtx();
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  let peak = 0;
  const t0 = performance.now();
  show(vLive);

  await new Promise((resolve) => {
    const frame = (now) => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const level = Math.min(1, rms / 0.3); // calibrated so a loud scream ≈ 1.0
      peak = Math.max(peak, level);
      elLevel.style.height = `${level * 100}%`;
      elPeak.style.bottom = `${peak * 100}%`;
      elPeakText.textContent = quip(peak);
      const left = Math.max(0, TUNING.screamWindowMs - (now - t0));
      elTimer.textContent = `0:0${Math.ceil(left / 1000)}`;
      if (left > 0) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  stream.getTracks().forEach((t) => t.stop());
  src.disconnect();
  hide();
  busy = false;
  setVolume(peak, peak);
  decayFrom(peak);
}

export function resetScream() {
  cancelAnimationFrame(decayRaf);
  setVolume(0, 0);
  clearTimeout(closeTimer);
  hide();
}

export function initScream() {
  document.getElementById('btn-mic').addEventListener('fakeclick', openScream);
  bus.on('escape', () => { if (state.screamOpen && !busy) hide(); });
}
