// F3 — Hangman password gate. The victim is the T-rex.
// 6 wrong guesses: head → body → left arm → right arm → left leg → right leg/tail.
import { bus, state, S } from './state.js';
import { TUNING } from './config/tuning.js';
import { toast } from './ui/toast.js';

const elTitle = document.getElementById('hangman-title');
const elSlots = document.getElementById('hangman-slots');
const elHint = document.getElementById('hangman-hint');
const elWrong = document.getElementById('hangman-wrong');
const elLives = document.getElementById('hangman-lives');
const elRex = document.getElementById('hangman-rex');
const elSwing = document.getElementById('hangman-swing');
const elLose = document.getElementById('hangman-lose');
const elWin = document.getElementById('hangman-win');
const elAnswer = document.getElementById('hangman-answer');
const elWinWord = document.getElementById('hangman-win-word');

// rex parts in sprite px (22×24 grid, scaled ×7 in the SVG)
const PARTS = [
  { name: 'head', rects: [[11, 0, 10, 7], [11, 7, 5, 1]], eye: [13, 1, 2, 2] },
  { name: 'body', rects: [[9, 8, 8, 7], [4, 10, 7, 6]] },
  { name: 'left arm', rects: [[17, 10, 3, 1]] },
  { name: 'right arm', rects: [[17, 12, 3, 1]] },
  { name: 'left leg', rects: [[7, 16, 2, 6], [7, 22, 3, 1]] },
  { name: 'right leg + tail', rects: [[12, 16, 2, 6], [12, 22, 3, 1], [0, 8, 2, 4], [1, 11, 4, 3]] },
];

const ns = 'http://www.w3.org/2000/svg';
let word = '';
let guessed = new Set();
let wrong = [];
let over = false;
let video = null;
let onWin = () => {};
let onLose = () => {};

function rect(x, y, w, h, cls, fill) {
  const r = document.createElementNS(ns, 'rect');
  r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h);
  if (cls) r.setAttribute('class', cls);
  if (fill) r.setAttribute('fill', fill);
  return r;
}

function drawRex() {
  elRex.innerHTML = '';
  elSwing.classList.toggle('is-dead', wrong.length >= TUNING.hangmanLives);
  PARTS.forEach((p, i) => {
    const drawn = i < wrong.length;
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', drawn ? 'part' : 'ghost');
    if (drawn) g.setAttribute('fill', '#5A3413');
    p.rects.forEach((r) => g.appendChild(rect(...r)));
    elRex.appendChild(g);
    if (drawn && p.eye) {
      const dead = wrong.length >= TUNING.hangmanLives;
      if (dead) { elRex.appendChild(rect(12, 1, 4, 4, null, '#F6ECD6')); elRex.appendChild(rect(13, 2, 2, 2, null, '#5A3413')); }
      else elRex.appendChild(rect(...p.eye, null, '#F6ECD6'));
    }
  });
}

function render(newLetter) {
  elSlots.innerHTML = '';
  for (const ch of word) {
    const d = document.createElement('div');
    d.className = 'hangman__slot';
    if (guessed.has(ch)) { d.textContent = ch; if (ch === newLetter) d.classList.add('is-new'); }
    elSlots.appendChild(d);
  }
  elWrong.innerHTML = '';
  for (const ch of wrong) {
    const c = document.createElement('span');
    c.className = 'hangman__chip';
    c.textContent = ch;
    elWrong.appendChild(c);
  }
  elLives.innerHTML = '';
  for (let i = 0; i < TUNING.hangmanLives; i++) {
    const b = document.createElement('span');
    b.className = 'hangman__ball' + (i >= TUNING.hangmanLives - wrong.length ? ' is-lost' : '');
    elLives.appendChild(b);
  }
  drawRex();
}

export function openHangman(v, { win, lose }) {
  video = v;
  word = v.password.toUpperCase().replace(/[^A-Z]/g, '');
  guessed = new Set();
  wrong = [];
  over = false;
  onWin = win;
  onLose = lose;
  elTitle.textContent = v.title;
  elHint.textContent = v.hint;
  elLose.hidden = true;
  elWin.hidden = true;
  render();
}

function guess(letter) {
  if (over || state.screen !== S.HANGMAN) return;
  if (guessed.has(letter) || wrong.includes(letter)) { toast('You already tried that, genius.', 'danger'); return; }
  if (word.includes(letter)) {
    guessed.add(letter);
    render(letter);
    if ([...word].every((c) => guessed.has(c))) {
      over = true;
      elWinWord.textContent = word;
      elWin.hidden = false;
      // this keypress completes the word → fullscreen must be requested right here (user gesture)
      onWin(video);
    }
  } else {
    wrong.push(letter);
    render();
    if (wrong.length >= TUNING.hangmanLives) {
      over = true;
      elAnswer.textContent = word;
      setTimeout(() => { elLose.hidden = false; }, 400);
      setTimeout(() => onLose(), 2400);
    }
  }
}

export function initHangman() {
  bus.on('hangman:letter', guess);
}
