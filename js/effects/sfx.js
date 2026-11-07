// Web Audio explosion + audio file playback.
let ctx = null;

export function unlockAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function audioCtx() { return unlockAudio(); }

// noise burst through a closing lowpass + low sine thump (~0.8s)
export function explosion() {
  const ac = unlockAudio();
  if (!ac) return;
  const t = ac.currentTime;
  const len = Math.floor(ac.sampleRate * 0.9);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4000, t);
  lp.frequency.exponentialRampToValueAtTime(120, t + 0.8);
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
  noise.connect(lp).connect(ng).connect(ac.destination);

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 0.7);
  const og = ac.createGain();
  og.gain.setValueAtTime(1, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  osc.connect(og).connect(ac.destination);

  noise.start(t);
  osc.start(t);
  noise.stop(t + 0.9);
  osc.stop(t + 0.85);
}

const cache = new Map();
function getAudio(url) {
  if (!cache.has(url)) {
    const a = new Audio(encodeURI(url));
    a.preload = 'auto';
    cache.set(url, a);
  }
  return cache.get(url);
}

export function preload(...urls) { urls.forEach(getAudio); }

/**
 * Play a sound file from the start. Resolves when it ends (or after `fallbackMs` if it can't play).
 * Returns { done: Promise, duration: number (seconds, best guess) }.
 */
export function playFile(url, fallbackMs = 1500) {
  const a = getAudio(url);
  a.pause();
  a.currentTime = 0;
  a.volume = 1;
  const done = new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (settled) return; settled = true; a.removeEventListener('ended', finish); resolve(); };
    a.addEventListener('ended', finish);
    a.addEventListener('error', () => setTimeout(finish, fallbackMs), { once: true });
    a.play().catch(() => {
      // autoplay refused: retry muted so the timing still works
      a.muted = true;
      a.play().then(() => setTimeout(() => { a.muted = false; }, 0)).catch(() => setTimeout(finish, fallbackMs));
    });
  });
  return { done, audio: a };
}
