// Boot + screen router.
import { bus, state, S, setScreen } from './state.js';
import { DEV } from './config/tuning.js';
import { VIDEOS } from './config/videos.js';
import { initKeyboard } from './input/keyboard.js';
import { initFakeCursor, cursor } from './input/fake-cursor.js';
import { initMousePolice } from './input/mouse-police.js';
import { initFloat } from './float.js';
import { initDino, toIdle, pauseForAd, resumeAfterAd } from './dino/game.js';
import { initAds, createAd } from './ads.js';
import { initHangman, openHangman } from './hangman.js';
import { initPlayer, openPlayer, closePlayer, requestFs } from './player/player.js';
import { initTimeline } from './player/timeline.js';
import { initSkip67, close as close67 } from './player/skip67.js';
import { initScream, resetScream } from './player/scream.js';
import { initDislike, resetDislike } from './player/dislike.js';
import { initCommands, setCommandHooks } from './commands.js';
import { repair } from './effects/crash.js';
import { unlockAudio, preload } from './effects/sfx.js';
import { initInflate } from './ui/inflate.js';

const screens = {
  dino: document.getElementById('screen-dino'),
  hangman: document.getElementById('screen-hangman'),
  player: document.getElementById('screen-player'),
};

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
}

// ---------- flows ----------
function goDino() {
  closePlayer();
  close67();
  resetScream();
  resetDislike();
  repair();
  show('dino');
  toIdle();
  setScreen(S.DINO_IDLE);
}

function goHangman(video) {
  state.video = video;
  show('hangman');
  setScreen(S.HANGMAN);
  openHangman(video, {
    win: (v) => {
      requestFs(); // inside the keydown that completed the word (needs the user gesture)
      setTimeout(() => goPlayer(v), 700);
    },
    lose: () => goDino(),
  });
}

function goPlayer(video) {
  toIdle(); // make sure the dino game isn't still running in the background
  show('player');
  resetDislike();
  setScreen(S.PLAYER);
  openPlayer(video);
}

// ---------- boot ----------
initKeyboard();
initMousePolice();
initFakeCursor();
initFloat();
initAds();
initDino();
initHangman();
initPlayer();
initTimeline();
initSkip67();
initScream();
initDislike();
initCommands();
initInflate();
preload('resources/skip add.ogg', 'resources/dislike.ogg');

bus.on('key:any', unlockAudio);

bus.on('dino:thumb', (video) => goHangman(video));

bus.on('dino:bird', () => {
  pauseForAd();
  setScreen(S.AD_OPEN);
  createAd({ source: 'bird' });
});

bus.on('ad:closed', (ad) => {
  if (ad.source === 'bird' && state.screen === S.AD_OPEN && !state.openAds.some((a) => a.source === 'bird')) {
    setScreen(S.DINO_RUNNING);
    resumeAfterAd();
  }
});

setCommandHooks({
  back: goDino,
  devWin: () => { if (state.screen === S.HANGMAN || DEV) { requestFs(); goPlayer(state.video || VIDEOS[0]); } },
  devPlayer: (id) => { const v = VIDEOS.find((x) => x.id === id) || VIDEOS[0]; requestFs(); goPlayer(v); },
});

if (DEV) {
  console.table(VIDEOS.map(({ id, title, password }) => ({ id, title, password })));
  window.__fry = { state, bus, cursor, goPlayer, goHangman, goDino, createAd };
}

show('dino');
