// F8 — Evil autocorrect. ~1 in 5 commands get "corrected". Never twice in a row.
import { TUNING } from './config/tuning.js';

export const CORRECTIONS = {
  'please play': 'please pray',
  'please pause': 'please paws',
  'repair screen': 'repaint screen',
  'sorry i like the video': 'sorry not sorry',
  'back': 'bark',
  'forward': 'foreword',
};

let lastWasCorrected = false;

/** Returns the corrected command, or null if autocorrect stayed asleep. */
export function maybeCorrect(cmd) {
  if (lastWasCorrected) { lastWasCorrected = false; return null; }
  if (!CORRECTIONS[cmd] || Math.random() >= TUNING.autocorrectChance) return null;
  lastWasCorrected = true;
  return CORRECTIONS[cmd];
}
