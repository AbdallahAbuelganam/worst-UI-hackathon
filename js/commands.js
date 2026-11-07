// F7 — The command box ("the pita pocket"). Space opens, Enter submits, Esc closes.
import { bus, state, S } from './state.js';
import { DEV } from './config/tuning.js';
import { VIDEOS } from './config/videos.js';
import { maybeCorrect } from './autocorrect.js';
import { createAd, stopFlood } from './ads.js';
import { repair, flash } from './effects/crash.js';
import { playMain, pauseMain } from './player/player.js';
import { open67 } from './player/skip67.js';
import { openScream } from './player/scream.js';

const box = document.getElementById('command-box');
const input = document.getElementById('cmd-input');
const elCorrect = document.getElementById('cmd-correct');
const elFrom = document.getElementById('cmd-correct-from');
const elTo = document.getElementById('cmd-correct-to');
const elResp = document.getElementById('cmd-response');
const elSub = document.getElementById('cmd-sub');
const fx = document.getElementById('fx-layer');

const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF8EA" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const INSULTS = [
  'Command not found. Neither is your talent.',
  'That is not a command. That is a cry for help. Type "help".',
  'The fryer does not understand you. Nobody does.',
  'Unknown command. Have you tried being better?',
  'Error 67: skill issue.',
];
const HELP = ['please play', 'please pause', 'back', 'repair screen', 'forward', 'scream again', 'sorry, I like the video', 'help'];

let closeTimer = null;
let busy = false;
let hooks = { back: () => {}, devWin: () => {}, devPlayer: () => {} };
export function setCommandHooks(h) { hooks = { ...hooks, ...h }; }

export function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const inPlayer = () => state.screen === S.PLAYER;

function respond(text, kind = 'info') {
  elResp.hidden = false;
  elResp.className = `cmd__response cmd__response--${kind}`;
  elResp.innerHTML = kind === 'ok' ? CHECK : '';
  elResp.appendChild(document.createTextNode(text));
  input.classList.remove('is-typed', 'is-ok', 'is-refused');
  if (kind === 'ok') input.classList.add('is-ok');
  if (kind === 'refused') input.classList.add('is-refused');
}

// ---------- autocorrect gags ----------
function gag(cls, html, ms = 1700) {
  const el = document.createElement('div');
  el.className = `gag ${cls}`;
  el.innerHTML = html;
  fx.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function paws() {
  const W = fx.clientWidth, H = fx.clientHeight;
  for (let i = 0; i < 12; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'gag gag--paw';
      p.textContent = '🐾';
      p.style.left = `${(i / 12) * W}px`;
      p.style.top = `${H * 0.55 + (i % 2 ? -30 : 30) - i * 8}px`;
      p.style.setProperty('--r', '75deg');
      fx.appendChild(p);
      setTimeout(() => p.remove(), 1700);
    }, i * 140);
  }
}

function foreword() {
  const el = document.createElement('div');
  el.className = 'foreword';
  el.innerHTML = `<h3>Foreword</h3>
    <p>When I first held a falafel, I knew it would outlive me. Crisp of shell, green of heart, it asked nothing of me but a pita and my undivided attention.</p>
    <p>This book is not about falafel. It is about everything else, which is worse.</p>
    <em>— A chickpea, probably</em>`;
  fx.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

const CORRECTED_EFFECTS = {
  'please pray': () => { gag('gag--pray', '🙏'); return ['🙏 Your prayer has been received. Nothing happens.', 'info']; },
  'please paws': () => { paws(); return ['🐾 Paws deployed. The video is still playing.', 'info']; },
  'repaint screen': () => { flash('pink'); return ['Repainted. Still cracked.', 'info']; },
  'sorry not sorry': () => { for (let i = 0; i < 3; i++) setTimeout(() => createAd({ source: state.adFloodActive ? 'flood' : 'midroll' }), i * 250); return ['Not sorry? Have some ads.', 'refused']; },
  'bark': () => { gag('gag--woof', '<i>🐕</i>Woof.'); return ['Woof.', 'info']; },
  'foreword': () => { foreword(); return ['A foreword. As requested.', 'info']; },
};

// ---------- the command table ----------
function run(cmd) {
  switch (cmd) {
    case 'please play':
      if (!inPlayer()) return ['Play what? You are a dinosaur.', 'refused'];
      return [playMain(), 'ok'];
    case 'please pause':
      if (!inPlayer()) return ['Paused. Nothing. Congrats.', 'info'];
      return [pauseMain(), 'ok'];
    case 'play':
    case 'pause':
      return ['Say please.', 'refused'];
    case 'skip ad':
    case 'skip add':
    case 'close ad':
    case 'close add':
      return ["There's an X. Use it.", 'refused'];
    case 'sorry i like the video':
      if (stopFlood()) return ['Apology accepted. The ads are gone. For now.', 'ok'];
      return ['Apology accepted. Nothing changed.', 'info'];
    case 'repair screen':
      return repair() ? ["Screen repaired. Don't do it again.", 'ok'] : ["Your screen is fine. Your choices aren't.", 'info'];
    case 'forward':
      if (!inPlayer()) return ['Forward to what? You are already running.', 'refused'];
      setTimeout(open67, 350);
      return ['Fine. Type 67. A lot.', 'ok'];
    case 'scream again':
      if (!inPlayer()) return ['Scream all you want. Nobody is listening here.', 'info'];
      setTimeout(openScream, 350);
      return ['Deep breath…', 'ok'];
    case 'back':
      if (!inPlayer()) return ['You are already at the bottom.', 'info'];
      setTimeout(hooks.back, 400);
      return ['Back to the fryer.', 'ok'];
    case 'help': {
      const list = [...HELP].sort(() => Math.random() - 0.5).join(' · ');
      elSub.textContent = `help → ${list}`;
      return ['Here. Try not to need it again.', 'info'];
    }
    default:
      if (DEV) {
        if (cmd === 'dev win') { setTimeout(hooks.devWin, 300); return ['dev: winning.', 'ok']; }
        if (cmd.startsWith('dev player')) {
          const id = cmd.split(' ')[2] || VIDEOS[0]?.id;
          setTimeout(() => hooks.devPlayer(id), 300);
          return [`dev: opening ${id}.`, 'ok'];
        }
        if (cmd === 'dev ad') { createAd({ source: 'midroll' }); return ['dev: ad.', 'ok']; }
        if (cmd === 'dev flood') { setTimeout(() => import('./ads.js').then((m) => m.startFlood()), 0); return ['dev: flood.', 'ok']; }
      }
      return [INSULTS[Math.floor(Math.random() * INSULTS.length)], 'info'];
  }
}

function submit() {
  if (busy) return;
  const raw = input.value;
  const cmd = normalize(raw);
  if (!cmd) { close(); return; }
  const corrected = maybeCorrect(cmd);
  if (corrected) {
    // strike-through animation, then the wrong thing happens
    busy = true;
    elFrom.textContent = raw.trim();
    elTo.textContent = corrected;
    input.hidden = true;
    elCorrect.hidden = false;
    elResp.hidden = true;
    elSub.textContent = "Autocorrected. You're welcome.";
    setTimeout(() => {
      const [text, kind] = CORRECTED_EFFECTS[corrected]();
      respond(text, kind);
      busy = false;
      scheduleClose(2000);
    }, 900);
    return;
  }
  elSub.textContent = 'Esc to close. Or just wait.';
  const [text, kind] = run(cmd);
  respond(text, kind);
  input.select();
  scheduleClose(cmd === 'help' ? 4000 : 1800);
}

function scheduleClose(ms) {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(close, ms);
}

export function openCommandBox() {
  clearTimeout(closeTimer);
  if (state.commandBoxOpen) { input.focus(); return; }
  state.commandBoxOpen = true;
  box.hidden = false;
  input.hidden = false;
  elCorrect.hidden = true;
  elResp.hidden = true;
  input.value = '';
  input.className = 'cmd__input';
  elSub.textContent = 'Try "help". Or don\'t.';
  input.focus();
}

export function close() {
  clearTimeout(closeTimer);
  busy = false;
  state.commandBoxOpen = false;
  box.hidden = true;
  input.blur();
}

export function initCommands() {
  bus.on('command:open', openCommandBox);
  bus.on('input:submit', (el) => { if (el === input) submit(); });
  bus.on('escape', () => { if (state.commandBoxOpen) close(); });
  input.addEventListener('input', () => {
    clearTimeout(closeTimer); // typing again keeps it open
    input.hidden = false;
    elCorrect.hidden = true;
    input.classList.remove('is-ok', 'is-refused');
    input.classList.toggle('is-typed', input.value.length > 0);
    elSub.textContent = input.value ? 'Enter to submit' : 'Try "help". Or don\'t.';
  });
  bus.on('state', () => { if (state.commandBoxOpen) close(); });
}
