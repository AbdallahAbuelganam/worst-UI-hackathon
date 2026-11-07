// F1 — The homepage is a T-rex runner. Cacti kill, thumbnail trees open hangman, ad birds open ads.
import { bus, state, S, setScreen } from '../state.js';
import { TUNING, DEV } from '../config/tuning.js';
import { VIDEOS } from '../config/videos.js';
import { SPRITES, C, drawSprite, roundRect } from './sprites.js';

const canvas = document.getElementById('dino-canvas');
const ctx = canvas.getContext('2d');
const elScore = document.getElementById('dino-score');
const elHi = document.getElementById('dino-hi');
const elSpeed = document.getElementById('dino-speed');
const elIdle = document.getElementById('dino-idle');
const elOver = document.getElementById('dino-over');

const SCALE = 4;
const BIRD_SCALE = 3;
const REX_X = 120;
const JUMP_V = -17;
const GRAVITY = 0.85;
const SHRINK = 0.15;
const BANNERS = ['HOT FALAFELS NEAR YOU', 'FREE FRIES*', 'DOWNLOAD MORE RAM', '67 VIRUSES FOUND', 'HOT TAHINI DEALS'];
const THUMB_FILLS = [C.golden, C.herb, C.turnip, C.tomato];

let W = 0, H = 0, groundY = 0;
let running = false;
let paused = false;
let dead = false;
let speed = TUNING.dinoSpeedStart;
let rexY = 0, rexVy = 0, ducking = false, onGround = true;
let obstacles = [];
let clouds = [];
let distToNext = 600;
let lastType = null;
let dodged = 0;
let hi = 0;
let groundOffset = 0;
let frame = 0;
let invincibleUntil = 0;
let lastT = 0;

try { hi = Number(localStorage.getItem('frytube-hi')) || 0; } catch { /* private mode */ }

// ---------- thumbnails ----------
const thumbs = new Map(); // id -> { img, duration }
function loadThumb(v) {
  const rec = { img: null, duration: null };
  thumbs.set(v.id, rec);
  const img = new Image();
  let haveImg = false;
  img.onload = () => { haveImg = true; rec.img = img; };
  img.src = encodeURI(v.thumb || '');
  // grab a frame from the video: used when the thumb file is missing, and for the duration badge
  const vid = document.createElement('video');
  vid.muted = true;
  vid.preload = 'auto';
  vid.playsInline = true;
  vid.addEventListener('loadedmetadata', () => {
    rec.duration = vid.duration;
    vid.currentTime = Math.min(4, vid.duration / 3);
  });
  vid.addEventListener('seeked', () => {
    if (!haveImg) {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 180;
      const g = c.getContext('2d');
      const r = Math.max(320 / vid.videoWidth, 180 / vid.videoHeight);
      const dw = vid.videoWidth * r, dh = vid.videoHeight * r;
      try { g.drawImage(vid, (320 - dw) / 2, (180 - dh) / 2, dw, dh); rec.img = c; } catch { /* tainted/failed */ }
    }
    vid.removeAttribute('src');
    vid.load();
  }, { once: true });
  vid.src = `${encodeURI(v.src)}?v=${Date.now()}`;
}

// ---------- layout ----------
function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  const dpr = window.devicePixelRatio || 1;
  W = r.width; H = r.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = Math.round(H * 0.73);
  if (!clouds.length) {
    for (let i = 0; i < 3; i++) clouds.push({ x: Math.random() * W, y: 70 + Math.random() * (groundY * 0.35), s: 3 + Math.random() * 1 });
  }
}

// ---------- helpers ----------
const rand = (a, b) => a + Math.random() * (b - a);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function rexBox() {
  const s = ducking && onGround ? SPRITES.rexDuck1 : SPRITES.rexStand;
  const w = s.w * SCALE, h = s.h * SCALE;
  return { x: REX_X, y: groundY - h + rexY, w, h };
}

function shrink(b) {
  return { x: b.x + b.w * SHRINK, y: b.y + b.h * SHRINK, w: b.w * (1 - 2 * SHRINK), h: b.h * (1 - 2 * SHRINK) };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pickType() {
  const w = TUNING.spawnWeights;
  const r = Math.random() * (w.cactus + w.thumb + w.bird);
  let t = r < w.cactus ? 'cactus' : r < w.cactus + w.thumb ? 'thumb' : 'bird';
  if (t === 'thumb' && (lastType === 'thumb' || !VIDEOS.length)) t = 'cactus';
  return t;
}

function spawn() {
  const type = pickType();
  lastType = type;
  if (type === 'cactus') {
    const sp = [SPRITES.cactusS, SPRITES.cactusM, SPRITES.cactusL][Math.floor(Math.random() * 3)];
    const w = sp.w * SCALE, h = sp.h * SCALE;
    obstacles.push({ type, sprite: sp, x: W + 20, y: groundY - h, w, h });
  } else if (type === 'thumb') {
    const video = VIDEOS[Math.floor(Math.random() * VIDEOS.length)];
    const w = 116, h = 112;
    obstacles.push({ type, video, x: W + 20, y: groundY - h, w, h, passed: false });
  } else {
    const heights = [40, 64, 135];
    const above = heights[Math.floor(Math.random() * heights.length)];
    const bw = SPRITES.birdUp.w * BIRD_SCALE, bh = SPRITES.birdUp.h * BIRD_SCALE;
    ctx.font = '700 12px Fredoka, sans-serif';
    const text = BANNERS[Math.floor(Math.random() * BANNERS.length)];
    const tw = ctx.measureText(text).width + 20;
    obstacles.push({ type, x: W + 20, y: groundY - above - bh, w: bw + 18 + tw, h: bh, bw, bh, text, tw, flap: 0 });
  }
  distToNext = rand(380, 720) + speed * 18;
}

// ---------- update ----------
function update(f, now) {
  speed = Math.min(TUNING.dinoSpeedMax, speed + TUNING.dinoSpeedGain * f * 60 / 60 * 1);
  const dx = speed * f;
  groundOffset = (groundOffset + dx) % 60;
  frame += f;

  // rex physics
  if (!onGround || rexVy < 0) {
    rexVy += GRAVITY * (ducking ? 2.6 : 1) * f;
    rexY += rexVy * f;
    if (rexY >= 0) { rexY = 0; rexVy = 0; onGround = true; }
  }

  for (const c of clouds) {
    c.x -= dx * 0.2;
    if (c.x < -140) { c.x = W + Math.random() * 200; c.y = 70 + Math.random() * (groundY * 0.35); }
  }

  distToNext -= dx;
  if (distToNext <= 0) spawn();

  const rb = shrink(rexBox());
  const invincible = now < invincibleUntil;
  for (const o of obstacles) {
    o.x -= dx;
    if (o.type === 'bird') o.flap += f;
    if (o.type === 'thumb' && !o.passed && o.x + o.w < REX_X) {
      o.passed = true;
      dodged++;
      elScore.textContent = dodged;
      if (dodged > hi) { hi = dodged; elHi.textContent = hi; try { localStorage.setItem('frytube-hi', hi); } catch { /* ignore */ } }
    }
  }
  obstacles = obstacles.filter((o) => o.x + o.w > -40);
  elSpeed.textContent = speed.toFixed(1);

  if (invincible) return;
  for (const o of obstacles) {
    if (!overlap(rb, shrink(o))) continue;
    if (o.type === 'cactus') { gameOver(); return; }
    if (o.type === 'thumb') { hitThumb(o.video); return; }
    if (o.type === 'bird') {
      obstacles = obstacles.filter((x) => x !== o);
      paused = true;
      bus.emit('dino:bird');
      return;
    }
  }
}

// ---------- draw ----------
function drawGround() {
  ctx.fillStyle = 'rgba(230,200,142,.55)';
  ctx.fillRect(0, groundY + 6, W, H - groundY - 6);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, groundY - 3, W, 3);
  for (let x = -groundOffset; x < W; x += 60) {
    ctx.fillRect(x, groundY + 3, 14, 3);
    ctx.fillRect(x + 30, groundY + 3, 4, 3);
  }
}

function drawThumb(o) {
  const { x, y, video } = o;
  const cw = 112, ch = 63;
  const rec = thumbs.get(video.id) || {};
  // shadow
  ctx.fillStyle = C.ink;
  roundRect(ctx, x, y + 5, cw, ch, [14, 14, 12, 12]);
  ctx.fill();
  // canopy
  ctx.save();
  roundRect(ctx, x, y, cw, ch, [14, 14, 12, 12]);
  ctx.clip();
  if (rec.img) {
    ctx.drawImage(rec.img, x, y, cw, ch);
  } else {
    ctx.fillStyle = THUMB_FILLS[video.id.length % THUMB_FILLS.length];
    ctx.fillRect(x, y, cw, ch);
    ctx.fillStyle = C.cream;
    ctx.font = '700 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(video.title.slice(0, 18), x + cw / 2, y + ch / 2 + 4);
  }
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  roundRect(ctx, x + 2, y + 2, cw - 4, ch - 4, [12, 12, 10, 10]);
  ctx.stroke();
  if (rec.duration) {
    ctx.font = '600 9px Fredoka, sans-serif';
    const t = fmt(rec.duration);
    const tw = ctx.measureText(t).width + 8;
    ctx.fillStyle = C.oil;
    roundRect(ctx, x + cw - tw - 6, y + ch - 18, tw, 13, 4);
    ctx.fill();
    ctx.fillStyle = C.tahini;
    ctx.textAlign = 'left';
    ctx.fillText(t, x + cw - tw - 2, y + ch - 8);
  }
  // title label
  ctx.font = '600 11px Fredoka, sans-serif';
  let title = video.title;
  while (ctx.measureText(title).width > cw - 4 && title.length > 4) title = title.slice(0, -2);
  if (title !== video.title) title = title.trimEnd() + '…';
  const lw = Math.min(cw + 4, ctx.measureText(title).width + 16);
  const lx = x + (cw - lw) / 2, ly = y + ch + 8;
  ctx.fillStyle = C.tahini;
  roundRect(ctx, lx, ly, lw, 19, 7);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText(title, x + cw / 2, ly + 13.5);
  // trunk + roots
  const ty = ly + 19;
  ctx.fillStyle = C.crust;
  ctx.fillRect(x + cw / 2 - 7, ty, 14, groundY - ty);
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + cw / 2 - 9, ty, 2.5, groundY - ty);
  ctx.fillRect(x + cw / 2 + 6.5, ty, 2.5, groundY - ty);
  ctx.fillStyle = C.crust;
  roundRect(ctx, x + cw / 2 - 18, groundY - 10, 36, 10, [5, 5, 0, 0]);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.textAlign = 'left';
}

function drawBird(o) {
  const sp = Math.floor(o.flap / 10) % 2 ? SPRITES.birdDown : SPRITES.birdUp;
  drawSprite(ctx, sp, o.x, o.y, BIRD_SCALE);
  const cy = o.y + o.bh * 0.45;
  ctx.fillStyle = C.ink;
  ctx.fillRect(o.x + o.bw, cy - 1, 18, 2);
  ctx.save();
  ctx.translate(o.x + o.bw + 18 + o.tw / 2, cy);
  ctx.rotate(-4 * Math.PI / 180);
  ctx.fillStyle = C.fry;
  roundRect(ctx, -o.tw / 2 - 3, -15, o.tw + 6, 30, 10);
  ctx.fill();
  ctx.fillStyle = C.turnip;
  roundRect(ctx, -o.tw / 2, -12, o.tw, 24, 8);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  ctx.fillStyle = C.cream;
  ctx.font = '700 12px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(o.text, 0, 4.5);
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawRex(now) {
  if (now < invincibleUntil && Math.floor(now / 100) % 2) return; // blink 100ms on/off
  let sp;
  if (dead) sp = SPRITES.rexDead;
  else if (!running) sp = SPRITES.rexStand;
  else if (!onGround) sp = SPRITES.rexStand;
  else if (ducking) sp = Math.floor(frame / 6) % 2 ? SPRITES.rexDuck2 : SPRITES.rexDuck1;
  else sp = Math.floor(frame / 6) % 2 ? SPRITES.rexRun2 : SPRITES.rexRun1;
  drawSprite(ctx, sp, REX_X, groundY - sp.h * SCALE + rexY, SCALE);
}

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  for (const c of clouds) drawSprite(ctx, SPRITES.cloud, c.x, c.y, c.s, C.pita);
  drawGround();
  for (const o of obstacles) {
    if (o.type === 'cactus') drawSprite(ctx, o.sprite, o.x, o.y, SCALE);
    else if (o.type === 'thumb') drawThumb(o);
    else drawBird(o);
  }
  drawRex(now);
  if (DEV) {
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    const r = shrink(rexBox());
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    for (const o of obstacles) { const b = shrink(o); ctx.strokeRect(b.x, b.y, b.w, b.h); }
  }
}

function loop(now) {
  const dt = Math.min(50, now - (lastT || now));
  lastT = now;
  if (!W) resize();
  if (running && !paused && !dead) update(dt / (1000 / 60), now);
  if (W && !document.getElementById('screen-dino').hidden) draw(now);
  requestAnimationFrame(loop);
}

// ---------- state changes ----------
function reset() {
  obstacles = [];
  speed = TUNING.dinoSpeedStart;
  rexY = 0; rexVy = 0; onGround = true; ducking = false;
  distToNext = 500;
  lastType = null;
  dodged = 0;
  frame = 0;
  dead = false;
  paused = false;
  invincibleUntil = 0;
  elScore.textContent = '0';
  elSpeed.textContent = speed.toFixed(1);
}

function start() {
  reset();
  running = true;
  elIdle.hidden = true;
  elOver.hidden = true;
  setScreen(S.DINO_RUNNING);
}

function gameOver() {
  dead = true;
  running = true;
  elOver.hidden = false;
  setScreen(S.GAME_OVER);
}

function hitThumb(video) {
  running = false;
  bus.emit('dino:thumb', video);
}

export function toIdle() {
  reset();
  running = false;
  elIdle.hidden = false;
  elOver.hidden = true;
}

export function pauseForAd() { paused = true; ducking = false; }

export function resumeAfterAd() {
  paused = false;
  invincibleUntil = performance.now() + TUNING.dinoInvincibleMs;
  lastT = performance.now();
}

function jump() {
  const sc = state.screen;
  if (sc === S.DINO_IDLE || sc === S.GAME_OVER) { start(); return; }
  if (sc !== S.DINO_RUNNING || paused) return;
  if (onGround) { rexVy = JUMP_V; onGround = false; }
}

export function initDino() {
  VIDEOS.forEach(loadThumb);
  elHi.textContent = hi;
  new ResizeObserver(resize).observe(canvas);
  bus.on('dino:jump', jump);
  bus.on('dino:duck', (d) => { ducking = d && state.screen === S.DINO_RUNNING; });
  document.fonts?.ready.then(() => draw(performance.now()));
  requestAnimationFrame(loop);
}
