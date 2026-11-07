// F14 — After 25s the whole page floats on the fryer. Shift+arrows push it like a boat.
import { bus } from './state.js';
import { TUNING } from './config/tuning.js';

const outer = document.getElementById('world-outer');
const bob = document.getElementById('world-bob');
let floating = false;
let px = 0, py = 0, vx = 0, vy = 0;

function tick() {
  if (floating) {
    vx *= TUNING.floatFriction;
    vy *= TUNING.floatFriction;
    px += vx;
    py += vy;
    // keep at least 20% of the page on screen; soft bounce at the limits
    const maxX = innerWidth * (1 - TUNING.floatKeepOnScreen);
    const maxY = innerHeight * (1 - TUNING.floatKeepOnScreen);
    if (px > maxX) { px = maxX; vx = -Math.abs(vx) * TUNING.floatBounce; }
    if (px < -maxX) { px = -maxX; vx = Math.abs(vx) * TUNING.floatBounce; }
    if (py > maxY) { py = maxY; vy = -Math.abs(vy) * TUNING.floatBounce; }
    if (py < -maxY) { py = -maxY; vy = Math.abs(vy) * TUNING.floatBounce; }
    if (Math.abs(vx) < 0.01) vx = 0;
    if (Math.abs(vy) < 0.01) vy = 0;
    outer.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px)`;
  }
  requestAnimationFrame(tick);
}

function push(key) {
  if (!floating) return;
  const i = TUNING.floatImpulse;
  if (key === 'ArrowLeft') vx -= i;
  if (key === 'ArrowRight') vx += i;
  if (key === 'ArrowUp') vy -= i;
  if (key === 'ArrowDown') vy += i;
}

export function initFloat() {
  // one global timer from first load — it does not reset per screen
  setTimeout(() => {
    floating = true;
    bob.classList.add('is-floating');
    bus.emit('float:started');
  }, TUNING.floatStartMs);
  bus.on('float:push', push);
  requestAnimationFrame(tick);
}
