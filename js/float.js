// F14 — After 25s the whole page floats on the fryer, and it only gets worse:
//  • the bob escalates from a gentle ±12px / ±1.5° to a seasick ±70px / ±9° over 90s, with choppy waves
//  • random oil currents shove the page around on their own
//  • Shift+arrows push it like a boat with a broken rudder (each push goes a bit the wrong way)
//  • the oil is slippery: pushes drift far and bounce hard off the edges
import { bus } from './state.js';
import { TUNING } from './config/tuning.js';

const outer = document.getElementById('world-outer');
const bob = document.getElementById('world-bob');
let floating = false;
let startedAt = 0;
let nextCurrent = 0;
let px = 0, py = 0, vx = 0, vy = 0;
const phase = Math.random() * 10;

const rand = (a, b) => a + Math.random() * (b - a);

function seasickness(now) {
  return Math.min(1, (now - startedAt) / TUNING.floatRampMs);
}

function tick(now) {
  if (floating) {
    const k = seasickness(now);

    // random currents
    if (now >= nextCurrent) {
      const a = Math.random() * Math.PI * 2;
      const p = TUNING.floatCurrentPower * (0.3 + k) * rand(0.5, 1);
      vx += Math.cos(a) * p;
      vy += Math.sin(a) * p;
      const [lo, hi] = TUNING.floatCurrentEveryMs;
      nextCurrent = now + rand(lo, hi) * (1.2 - k * 0.6);
    }

    vx *= TUNING.floatFriction;
    vy *= TUNING.floatFriction;
    px += vx;
    py += vy;
    // keep at least 20% of the page on screen; bounce off the limits
    const maxX = innerWidth * (1 - TUNING.floatKeepOnScreen);
    const maxY = innerHeight * (1 - TUNING.floatKeepOnScreen);
    if (px > maxX) { px = maxX; vx = -Math.abs(vx) * TUNING.floatBounce; }
    if (px < -maxX) { px = -maxX; vx = Math.abs(vx) * TUNING.floatBounce; }
    if (py > maxY) { py = maxY; vy = -Math.abs(vy) * TUNING.floatBounce; }
    if (py < -maxY) { py = -maxY; vy = Math.abs(vy) * TUNING.floatBounce; }
    outer.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`;

    // escalating, choppy bob (two waves on top of each other)
    const t = now / 1000 + phase;
    const amp = 12 + (TUNING.floatBobMaxPx - 12) * k;
    const tilt = 1.5 + (TUNING.floatTiltMaxDeg - 1.5) * k;
    const by = Math.sin(t * Math.PI / 2) * amp * 0.75 + Math.sin(t * 2.7) * amp * 0.25 * k;
    const bx = Math.sin(t * 1.3) * amp * 0.35 * k;
    const br = Math.sin(t * Math.PI / 2 + 1) * tilt * 0.8 + Math.sin(t * 3.1) * tilt * 0.2;
    bob.style.transform = `translate(${bx.toFixed(2)}px, ${by.toFixed(2)}px) rotate(${br.toFixed(3)}deg)`;
  }
  requestAnimationFrame(tick);
}

function push(key) {
  if (!floating) return;
  const dirs = { ArrowLeft: Math.PI, ArrowRight: 0, ArrowUp: -Math.PI / 2, ArrowDown: Math.PI / 2 };
  // a broken rudder: every push goes a bit the wrong way
  const a = dirs[key] + (Math.random() - 0.5) * 2 * TUNING.floatSteerError;
  const i = TUNING.floatImpulse * (1 + seasickness(performance.now()));
  vx += Math.cos(a) * i;
  vy += Math.sin(a) * i;
}

export function initFloat() {
  // one global timer from first load — it does not reset per screen
  setTimeout(() => {
    floating = true;
    startedAt = performance.now();
    nextCurrent = startedAt + 3000;
    bob.classList.add('is-floating');
    bus.emit('float:started');
  }, TUNING.floatStartMs);
  bus.on('float:push', push);
  requestAnimationFrame(tick);
}
