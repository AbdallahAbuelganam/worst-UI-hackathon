// F9 — The timeline dot is a falafel that panics when the cursor gets close,
// sprints (ease-in) to the nearest end, and crashes into it.
import { state, S } from '../state.js';
import { TUNING } from '../config/tuning.js';
import { cursor } from '../input/fake-cursor.js';
import { trigger as crash } from '../effects/crash.js';
import { video, markEnded, isPlaying } from './player.js';
import { toast } from '../ui/toast.js';

const track = document.getElementById('timeline-track');
const fill = document.getElementById('timeline-fill');
const dot = document.getElementById('timeline-dot');
const timeText = document.getElementById('timeline-time');

let panic = null; // { from, to, t0, wasPlaying, lastDrop }
let armed = true;

const fmt = (s) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');
const easeIn = (t) => t * t * t; // ≈ cubic-bezier(.55,0,1,.45)

function setFrac(f) {
  const p = `${Math.max(0, Math.min(1, f)) * 100}%`;
  fill.style.width = p;
  dot.style.left = p;
}

function dropOil(f) {
  const d = document.createElement('span');
  d.className = 'oil-drop';
  d.style.left = `${f * 100}%`;
  track.appendChild(d);
  setTimeout(() => d.remove(), 520);
}

function land() {
  const r = dot.getBoundingClientRect();
  const atEnd = panic.to === 1;
  const wasPlaying = panic.wasPlaying;
  panic = null;
  dot.classList.remove('is-panic');
  crash(r.left + r.width / 2, r.top + r.height / 2);
  if (atEnd) {
    if (isFinite(video.duration)) video.currentTime = Math.max(0, video.duration - 0.01);
    markEnded();
    toast('You killed it. Type back or please play to restart.', 'danger', 3200);
  } else {
    video.currentTime = 0;
    if (wasPlaying) video.play().catch(() => {});
  }
}

function tick(now) {
  if (state.screen === S.PLAYER) {
    const dur = video.duration;
    if (panic) {
      const t = Math.min(1, (now - panic.t0) / TUNING.dotPanicMs);
      const f = panic.from + (panic.to - panic.from) * easeIn(t);
      setFrac(f);
      if (now - panic.lastDrop > 40) { dropOil(f); panic.lastDrop = now; }
      if (t >= 1) land();
    } else {
      const f = isFinite(dur) && dur > 0 ? video.currentTime / dur : 0;
      setFrac(f);
      timeText.textContent = `${fmt(video.currentTime)} / ${fmt(dur)}`;
      if (cursor.visible) {
        const r = dot.getBoundingClientRect();
        const dist = Math.hypot(cursor.x - (r.left + r.width / 2), cursor.y - (r.top + r.height / 2));
        if (dist > TUNING.dotPanicRadiusPx + 20) armed = true;
        if (armed && dist < TUNING.dotPanicRadiusPx && isFinite(dur) && dur > 0) {
          armed = false;
          panic = { from: f, to: f < 0.5 ? 0 : 1, t0: now, wasPlaying: isPlaying(), lastDrop: 0 };
          dot.classList.add('is-panic');
        }
      }
    }
  }
  requestAnimationFrame(tick);
}

export function initTimeline() {
  requestAnimationFrame(tick);
}
