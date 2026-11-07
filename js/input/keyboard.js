// The ONE keyboard handler. Routes keys by current state and re-emits them as
// semantic bus events. No other module adds keydown listeners.
//
// Cursed rule: EVERY key does its thing 2 seconds after you press it (TUNING.keyDelayMs),
// even typing. Exception: Enter on an on-screen button, because the button itself already
// takes 2s to respond (fake-cursor.js), so it fires right away to keep it at 2s, not 4.
import { bus, state, S, cursorActive } from '../state.js';
import { DEV, TUNING } from '../config/tuning.js';

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const badge = document.getElementById('key-queue');
const badgeCount = document.getElementById('key-queue-count');
let queued = 0;

function inputFocused() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
}

function later(fn) {
  queued++;
  renderBadge();
  setTimeout(() => {
    queued--;
    renderBadge();
    fn();
  }, TUNING.keyDelayMs);
}

function renderBadge() {
  if (!badge) return;
  badge.hidden = queued === 0;
  badgeCount.textContent = queued;
}

// typing into a box, 2 seconds late
function typeInto(el, key) {
  if (!el.isConnected || el.hidden || el.closest('[hidden]')) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  if (key === 'Backspace') {
    if (start !== end) el.setRangeText('', start, end, 'end');
    else if (start > 0) el.setRangeText('', start - 1, start, 'end');
  } else if (key === 'Delete') {
    if (start !== end) el.setRangeText('', start, end, 'end');
    else el.setRangeText('', start, Math.min(el.value.length, start + 1), 'end');
  } else {
    el.setRangeText(key, start, end, 'end');
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// what a key DOES — runs 2s after the press, routed by the state at that moment
function route(k) {
  // R: put the floating page back where it belongs (in hangman it still counts as a guess too)
  if ((k.key === 'r' || k.key === 'R') && !k.mod) bus.emit('float:reset');

  // Shift + arrows: float impulse, any state (checked before plain arrows)
  if (k.shift && ARROWS.includes(k.key)) { bus.emit('float:push', k.key); return; }

  // ?dev: backtick opens the command box anywhere (for dev win / dev player / dev ad)
  if (DEV && k.key === '`') { bus.emit('command:open'); return; }

  const sc = state.screen;

  if (sc === S.DINO_IDLE || sc === S.DINO_RUNNING || sc === S.GAME_OVER) {
    if (k.key === ' ' || k.key === 'ArrowUp') { if (!k.repeat || sc === S.DINO_RUNNING) bus.emit('dino:jump'); }
    else if (k.key === 'ArrowDown') bus.emit('dino:duck', true);
    return;
  }

  if (sc === S.HANGMAN) {
    if (/^[a-z]$/i.test(k.key) && !k.mod) bus.emit('hangman:letter', k.key.toUpperCase());
    return;
  }

  if (cursorActive()) {
    if (k.key === ' ') bus.emit('command:open');
    else if (ARROWS.includes(k.key)) bus.emit('cursor:down', k.key);
    else if (k.key === 'Escape') bus.emit('escape');
  }
}

function onKeyDown(e) {
  bus.emit('key:any', e); // audio unlock, fullscreen re-entry (these stay instant)

  if (e.key === 'Tab') { e.preventDefault(); return; }
  const mod = e.ctrlKey || e.metaKey || e.altKey;

  // While an input is focused: keys type into it (late); only Enter and Esc are shortcuts.
  if (inputFocused()) {
    const el = document.activeElement;
    if (e.key === 'Enter') { e.preventDefault(); later(() => bus.emit('input:submit', el)); }
    else if (e.key === 'Escape') { e.preventDefault(); later(() => bus.emit('escape')); }
    else if (!mod && (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      const key = e.key;
      later(() => typeInto(el, key));
    }
    return;
  }

  if (e.key === ' ' || ARROWS.includes(e.key) || e.key === 'Enter' || (DEV && e.key === '`')) e.preventDefault();

  // Enter on a button: the button already takes 2s (fake-cursor.js), so don't add another 2s
  if (e.key === 'Enter' && !e.shiftKey && cursorActive()) {
    if (!e.repeat) bus.emit('cursor:click');
    return;
  }

  const k = { key: e.key, shift: e.shiftKey, repeat: e.repeat, mod };
  later(() => route(k));
}

function onKeyUp(e) {
  const key = e.key;
  if (ARROWS.includes(key) || key === 'ArrowDown') {
    later(() => {
      if (ARROWS.includes(key)) bus.emit('cursor:up', key);
      if (key === 'ArrowDown') bus.emit('dino:duck', false);
    });
  }
}

export function initKeyboard() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { bus.emit('cursor:release'); bus.emit('dino:duck', false); });
}
