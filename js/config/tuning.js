// All the numbers in one place so they can be tweaked quickly during the demo.
export const DEV = new URLSearchParams(location.search).has('dev');

export const TUNING = {
  floatStartMs: DEV ? 3000 : 25000,
  dotPanicRadiusPx: 60,
  dotPanicMs: 600,
  skip67MaxSeconds: 10,
  skip67Target: 100,
  skip67DurationMs: 15000,
  screamWindowMs: 5000,
  volumeDecayMs: 20000,
  dislikeDodges: 3,
  adFloodDelayMs: 10000,
  adFloodIntervalMs: 2000,
  adFloodCap: 15,
  adFloodPlayingCount: 3,
  adSizeStepsVh: [30, 40, 50, 60, 70, 80, 92],
  adCloseClicks: 7,
  adXSizePx: 14,
  midrollEveryMs: 60000,   // 0 = off
  autocorrectChance: 0.2,
  hangmanLives: 6,
  spawnWeights: { cactus: 0.5, thumb: 0.3, bird: 0.2 },
  // dino
  dinoSpeedStart: 6,
  dinoSpeedGain: 0.001,
  dinoSpeedMax: 13,
  dinoInvincibleMs: 2000,
  // cursor
  cursorSpeedStart: 4,
  cursorSpeedMax: 18,
  cursorRampMs: 500,
  // float
  floatImpulse: 4,
  floatFriction: 0.96,
  floatBounce: 0.5,
  floatKeepOnScreen: 0.2,
  mousePoliceThrottleMs: 2000,
};
