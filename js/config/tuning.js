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
  volumeHoldMs: 60000,      // after a scream the volume stays up for a full minute…
  volumeDecayMs: 20000,     // …then slides back to 0
  dislikeDodges: 3,
  adFloodDelayMs: 2000,     // dislike → flood starts after 2s
  adFloodIntervalMs: 2000,
  adFloodPerTick: 3,        // 3× the ads every tick
  adFloodCap: 45,           // 3× the old cap
  adFloodPlayingCount: 3,
  adSizeStepsVh: [30, 40, 50, 60, 70, 80, 92],
  adCloseClicks: 7,
  adXSizePx: 14,
  adBoostPerAd: 0.02,       // each new ad starts 2% of screen height bigger than the last…
  adBoostMax: 0.3,          // …up to +30%
  adCreepPerSec: 0.006,     // and keeps growing ~0.6%/s while it's open
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
  floatFriction: 0.985,     // oilier: pushes drift much further
  floatBounce: 0.8,
  floatSteerError: 0.6,     // radians of random error on every Shift+arrow push
  floatRampMs: 90000,       // the bob escalates from calm to seasick over this long
  floatBobMaxPx: 70,
  floatTiltMaxDeg: 9,
  floatCurrentEveryMs: [2500, 6000], // random currents shove the page
  floatCurrentPower: 7,
  buttonDelayMs: 2000,      // every on-screen button takes 2s to respond
  popupGrowPerOpen: 0.06,   // every pop-up opens bigger than the last…
  popupGrowMax: 0.7,
  popupCreepPerSec: 0.02,   // …and swells while it's open
  popupCreepMax: 0.5,
  floatKeepOnScreen: 0.2,
  mousePoliceThrottleMs: 2000,
};
