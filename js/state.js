// App state machine + event bus.
//   DINO_IDLE → DINO_RUNNING ⇄ AD_OPEN → GAME_OVER → DINO_RUNNING
//   DINO_RUNNING → HANGMAN → (lose) DINO_IDLE | (win) PLAYER
//   PLAYER → (back) DINO_IDLE

const listeners = new Map();

export const bus = {
  on(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  },
  emit(name, payload) {
    const set = listeners.get(name);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  },
};

export const S = Object.freeze({
  DINO_IDLE: 'DINO_IDLE',
  DINO_RUNNING: 'DINO_RUNNING',
  AD_OPEN: 'AD_OPEN',
  GAME_OVER: 'GAME_OVER',
  HANGMAN: 'HANGMAN',
  PLAYER: 'PLAYER',
});

export const state = {
  screen: S.DINO_IDLE,
  video: null,            // current video config
  // player sub-flags
  commandBoxOpen: false,
  challenge67Open: false,
  screamOpen: false,
  adFloodActive: false,
  scarLevel: 0,
  dislikeDodges: 0,
  openAds: [],            // {id, el, video, clicks, sizeStep, closing, source}
  needsFullscreen: false,
};

export function setScreen(next) {
  const prev = state.screen;
  if (prev === next) return;
  state.screen = next;
  bus.emit('state', { prev, next });
}

export const isDino = () => [S.DINO_IDLE, S.DINO_RUNNING, S.GAME_OVER, S.AD_OPEN].includes(state.screen);
export const cursorActive = () => state.screen === S.PLAYER || state.screen === S.AD_OPEN;
