// The ONE keyboard handler. Routes keys by current state and re-emits them as
// semantic bus events. No other module adds keydown listeners.
import { bus, state, S, cursorActive } from '../state.js';
import { DEV } from '../config/tuning.js';

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function inputFocused() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA');
}

function onKeyDown(e) {
  bus.emit('key:any', e); // audio unlock, fullscreen re-entry

  if (e.key === 'Tab') { e.preventDefault(); return; }

  // While an input is focused: keys type into it; only Enter and Esc are shortcuts.
  if (inputFocused()) {
    if (e.key === 'Enter') { e.preventDefault(); bus.emit('input:submit', document.activeElement); }
    else if (e.key === 'Escape') { e.preventDefault(); bus.emit('escape'); }
    return;
  }

  // Shift + arrows: float impulse, any state (checked before plain arrows)
  if (e.shiftKey && ARROWS.includes(e.key)) {
    e.preventDefault();
    bus.emit('float:push', e.key);
    return;
  }

  if (e.key === ' ' || ARROWS.includes(e.key) || e.key === 'Enter') e.preventDefault();

  const sc = state.screen;

  // ?dev: backtick opens the command box anywhere (for dev win / dev player / dev ad)
  if (DEV && e.key === '`') { e.preventDefault(); bus.emit('command:open'); return; }

  if (sc === S.DINO_IDLE || sc === S.DINO_RUNNING || sc === S.GAME_OVER) {
    if (e.key === ' ' || e.key === 'ArrowUp') { if (!e.repeat || sc === S.DINO_RUNNING) bus.emit('dino:jump'); }
    else if (e.key === 'ArrowDown') bus.emit('dino:duck', true);
    return;
  }

  if (sc === S.HANGMAN) {
    if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) bus.emit('hangman:letter', e.key.toUpperCase());
    return;
  }

  if (cursorActive()) {
    if (e.key === ' ') bus.emit('command:open');
    else if (ARROWS.includes(e.key)) bus.emit('cursor:down', e.key);
    else if (e.key === 'Enter') { if (!e.repeat) bus.emit('cursor:click'); }
    else if (e.key === 'Escape') bus.emit('escape');
  }
}

function onKeyUp(e) {
  if (ARROWS.includes(e.key)) bus.emit('cursor:up', e.key);
  if (e.key === 'ArrowDown') bus.emit('dino:duck', false);
}

export function initKeyboard() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { bus.emit('cursor:release'); bus.emit('dino:duck', false); });
}
