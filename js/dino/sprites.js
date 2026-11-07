// S2 — Sprite sheet, straight from the design. 1 sprite px = 4 screen px (birds 3).
// Each sprite: w, h in sprite px; ink = rects in $ink; paper = rects in $tahini (eyes).

export const C = {
  crust: '#7A4317', golden: '#D08A2A', herb: '#5E8C31', fry: '#F5C542', tomato: '#D63A2A',
  turnip: '#D9437A', tahini: '#F6ECD6', pita: '#E6C88E', ink: '#5A3413', oil: '#24130A',
  cream: '#FFF8EA', bean: '#8C5220',
};

const REX_BODY = [[11, 0, 10, 7], [9, 8, 8, 7], [4, 10, 7, 6], [0, 8, 2, 4], [1, 11, 4, 3], [17, 10, 3, 1]];

export const SPRITES = {
  rexStand: { w: 22, h: 24, ink: [...REX_BODY, [11, 7, 5, 1], [7, 16, 2, 6], [7, 22, 3, 1], [12, 16, 2, 6], [12, 22, 3, 1]], paper: [[13, 1, 2, 2]] },
  rexRun1: { w: 22, h: 24, ink: [...REX_BODY, [11, 7, 5, 1], [7, 16, 2, 3], [7, 19, 3, 1], [12, 16, 2, 6], [12, 22, 3, 1]], paper: [[13, 1, 2, 2]] },
  rexRun2: { w: 22, h: 24, ink: [...REX_BODY, [11, 7, 5, 1], [7, 16, 2, 6], [7, 22, 3, 1], [12, 16, 2, 3], [12, 19, 3, 1]], paper: [[13, 1, 2, 2]] },
  rexDead: { w: 22, h: 24, ink: [...REX_BODY, [11, 7, 7, 1], [7, 16, 2, 6], [7, 22, 3, 1], [12, 16, 2, 6], [12, 22, 3, 1]], paper: [[12, 1, 4, 4]], inkTop: [[13, 2, 2, 2]] },
  rexDuck1: { w: 30, h: 14, ink: [[0, 2, 20, 6], [18, 0, 12, 6], [22, 6, 5, 1], [20, 7, 3, 1], [6, 8, 2, 4], [6, 12, 3, 1], [12, 8, 2, 2], [12, 10, 3, 1]], paper: [[21, 1, 2, 2]] },
  rexDuck2: { w: 30, h: 14, ink: [[0, 2, 20, 6], [18, 0, 12, 6], [22, 6, 5, 1], [20, 7, 3, 1], [6, 8, 2, 2], [6, 10, 3, 1], [12, 8, 2, 4], [12, 12, 3, 1]], paper: [[21, 1, 2, 2]] },

  cactusS: { w: 8, h: 15, ink: [[3, 0, 3, 15], [0, 4, 2, 5], [0, 7, 3, 2], [7, 3, 1, 4], [6, 6, 2, 1]] },
  cactusM: { w: 12, h: 21, ink: [[4, 0, 4, 21], [0, 5, 2, 7], [0, 10, 4, 2], [10, 3, 2, 7], [8, 8, 4, 2]] },
  cactusL: { w: 25, h: 21, ink: [[4, 0, 4, 21], [0, 5, 2, 7], [0, 10, 4, 2], [10, 3, 2, 7], [8, 8, 4, 2], [16, 4, 4, 17], [13, 8, 2, 5], [13, 11, 3, 2], [22, 6, 2, 6], [20, 10, 3, 2]] },

  birdUp: { w: 23, h: 16, ink: [[0, 5, 6, 3], [4, 3, 4, 7], [8, 6, 12, 4], [20, 7, 3, 2], [10, 0, 3, 6], [12, 2, 2, 4], [9, 10, 8, 2]], paper: [[5, 5, 1, 1]] },
  birdDown: { w: 23, h: 16, ink: [[0, 5, 6, 3], [4, 3, 4, 7], [8, 6, 12, 4], [20, 7, 3, 2], [10, 10, 3, 6], [12, 10, 2, 4]], paper: [[5, 5, 1, 1]] },

  cloud: { w: 30, h: 11, ink: [[6, 3, 14, 6], [9, 0, 8, 3], [2, 6, 26, 5]] },
};

export function drawSprite(ctx, s, x, y, scale, ink = C.ink, paper = C.tahini) {
  ctx.fillStyle = ink;
  for (const [rx, ry, rw, rh] of s.ink) ctx.fillRect(Math.round(x + rx * scale), Math.round(y + ry * scale), rw * scale, rh * scale);
  if (s.paper) {
    ctx.fillStyle = paper;
    for (const [rx, ry, rw, rh] of s.paper) ctx.fillRect(Math.round(x + rx * scale), Math.round(y + ry * scale), rw * scale, rh * scale);
  }
  if (s.inkTop) {
    ctx.fillStyle = ink;
    for (const [rx, ry, rw, rh] of s.inkTop) ctx.fillRect(Math.round(x + rx * scale), Math.round(y + ry * scale), rw * scale, rh * scale);
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + rr[0], y);
  ctx.lineTo(x + w - rr[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr[1]);
  ctx.lineTo(x + w, y + h - rr[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr[2], y + h);
  ctx.lineTo(x + rr[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr[3]);
  ctx.lineTo(x, y + rr[0]);
  ctx.quadraticCurveTo(x, y, x + rr[0], y);
  ctx.closePath();
}
