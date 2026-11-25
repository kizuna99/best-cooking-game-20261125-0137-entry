// All canvas drawing for Sizzle & Serve — Rush Kitchen 2.5D.
// One job: paint the world. The kitchen is drawn in isometric projection —
// diamond floor tiles, counters as extruded boxes with front faces, a back
// wall with real height, drop shadows, and painter's-order depth sorting
// (back counter → chef → island → plating counter) so the 2.5D depth reads
// at a glance, including in a still screenshot.

import { INGREDIENTS, INGREDIENT_BY_ID, RECIPE_BY_ID, MAX_STRIKES } from './config.js';
import { SCREEN, sameDish, targetedOrder } from './world.js';

// ---------- isometric projection ----------
// Grid cell (i → right-down, j → left-down) to screen point.
export const ISO = { ox: 470, oy: 268, hw: 46, hh: 23 };
export function isoPoint(i, j, lift = 0) {
  return {
    x: ISO.ox + (i - j) * ISO.hw,
    y: ISO.oy + (i + j) * ISO.hh - lift,
  };
}
// Screen centre of a counter-top bin / station, used by input hit-testing.
export function cellTopCentre(i, j, lift) {
  return isoPoint(i + 0.5, j + 0.5, lift);
}

const COUNTER_H = 52;   // island / plating counter height in px
const BACK_H = 46;      // back counter height

export const TICKET_LAYOUT = { x: 1002, w: 260, y0: 128, h: 172, gap: 14 };
export const SERVE_RECT = { x: 596, y: 656, w: 190, h: 52 };
export const TRASH_RECT = { x: 806, y: 656, w: 150, h: 52 };

export function binCentre(index) { return cellTopCentre(1 + index, 3, COUNTER_H + 16); }
export function grillCentre() { return cellTopCentre(2.5, 0, BACK_H + 6); }
export function boardCentre() { return cellTopCentre(5, 0, BACK_H + 6); }
export function plateCentre() { return cellTopCentre(7, 5, COUNTER_H + 8); }

// ---------- small canvas helpers ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
  ctx.closePath();
}
function shadowEllipse(ctx, x, y, rx, ry, alpha = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(30,16,4,${alpha})`;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function text(ctx, str, x, y, size, color, align = 'center', weight = 700, font = 'Verdana, Geneva, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// An extruded isometric box spanning cells [i0..i1]×[j0..j1], `h` px tall,
// standing on `base` lift (0 = floor, COUNTER_H = on top of a counter).
// Returns the top-face corners for placing things on it.
function isoBox(ctx, i0, j0, i1, j1, h, colors, base = 0) {
  const a = isoPoint(i0, j0, base), b = isoPoint(i1, j0, base), c = isoPoint(i1, j1, base), d = isoPoint(i0, j1, base);
  const A = { x: a.x, y: a.y - h }, B = { x: b.x, y: b.y - h }, C = { x: c.x, y: c.y - h }, D = { x: d.x, y: d.y - h };
  if (base === 0) {
    // floor shadow, offset down-right
    poly(ctx, [{ x: a.x + 10, y: a.y + 8 }, { x: b.x + 10, y: b.y + 8 }, { x: c.x + 10, y: c.y + 8 }, { x: d.x + 10, y: d.y + 8 }]);
    ctx.fillStyle = 'rgba(30,16,4,0.20)'; ctx.fill();
  }
  // left-front face (toward viewer-left) and right-front face
  poly(ctx, [D, C, c, d]); ctx.fillStyle = colors.left; ctx.fill();
  poly(ctx, [B, C, c, b]); ctx.fillStyle = colors.right; ctx.fill();
  // top face
  poly(ctx, [A, B, C, D]); ctx.fillStyle = colors.top; ctx.fill();
  ctx.strokeStyle = 'rgba(60,32,8,0.35)'; ctx.lineWidth = 1.5;
  poly(ctx, [A, B, C, D]); ctx.stroke();
  return { A, B, C, D };
}

const WOOD = { top: '#c98d4e', left: '#a06a34', right: '#8a5727' };
const WOOD_DARK = { top: '#b57e42', left: '#8a5a2a', right: '#74491f' };

// ---------- ingredient icons (flat 2D, drawn at a point) ----------
export function drawIngredient(ctx, id, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  switch (id) {
    case 'bun': {
      ctx.fillStyle = '#e8a94e'; ctx.strokeStyle = '#b97a2a';
      ctx.beginPath(); ctx.ellipse(0, s * 0.18, s * 0.52, s * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.5, s * 0.34, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      for (const [sx, sy] of [[-0.2, -0.22], [0.05, -0.3], [0.25, -0.18]]) {
        ctx.beginPath(); ctx.ellipse(s * sx, s * sy, s * 0.05, s * 0.028, 0.5, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = '#8a4b26'; ctx.strokeStyle = '#5f3013';
      ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.52, s * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#a05e30';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.5, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'fish': {
      ctx.fillStyle = '#f2f0e6'; ctx.strokeStyle = '#9aa0a8';
      ctx.beginPath(); ctx.ellipse(-s * 0.05, 0, s * 0.42, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.32, 0); ctx.lineTo(s * 0.58, -s * 0.24); ctx.lineTo(s * 0.58, s * 0.24); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(-s * 0.28, -s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c8ccd2';
      ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.18); ctx.quadraticCurveTo(s * 0.05, 0, -s * 0.05, s * 0.18); ctx.stroke();
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#d93a2b'; ctx.strokeStyle = '#a32418';
      ctx.beginPath(); ctx.arc(0, s * 0.05, s * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#58b368';
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5;
        ctx.lineTo(Math.cos(a) * s * 0.2, -s * 0.28 + Math.sin(a) * s * 0.1);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(-s * 0.14, -s * 0.06, s * 0.1, s * 0.06, -0.6, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#ffc93c'; ctx.strokeStyle = '#d99a16';
      ctx.beginPath(); ctx.moveTo(-s * 0.5, s * 0.25); ctx.lineTo(s * 0.5, s * 0.25); ctx.lineTo(0, -s * 0.38); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#eab54f';
      for (const [hx, hy, hr] of [[-0.15, 0.08, 0.07], [0.18, 0.12, 0.055], [0.02, -0.08, 0.05]]) {
        ctx.beginPath(); ctx.arc(s * hx, s * hy, s * hr, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#58b368'; ctx.strokeStyle = '#3c8549';
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const r = s * (0.34 + (k % 2 ? 0.1 : 0));
        const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.72;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7cc98a';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'egg': {
      ctx.fillStyle = '#fdfdf5'; ctx.strokeStyle = '#c9c9b8';
      ctx.beginPath(); ctx.ellipse(0, s * 0.04, s * 0.48, s * 0.32, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffb703'; ctx.strokeStyle = '#e08e00';
      ctx.beginPath(); ctx.arc(s * 0.05, 0, s * 0.19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'rice': {
      ctx.fillStyle = '#fdfdf5';
      ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.34, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b9c4cc'; ctx.beginPath(); ctx.ellipse(0, -s * 0.14, s * 0.3, s * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#4a7fb5'; ctx.strokeStyle = '#2f5a86';
      ctx.beginPath(); ctx.moveTo(-s * 0.42, -s * 0.05); ctx.lineTo(s * 0.42, -s * 0.05);
      ctx.quadraticCurveTo(s * 0.36, s * 0.34, 0, s * 0.36);
      ctx.quadraticCurveTo(-s * 0.36, s * 0.34, -s * 0.42, -s * 0.05); ctx.fill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ---------- room: back wall with height + isometric floor slab ----------
function drawWall(ctx, world) {
  // wall face (full kitchen width, real height above the floor line)
  const g = ctx.createLinearGradient(0, 60, 0, 300);
  g.addColorStop(0, '#f3e2c7'); g.addColorStop(1, '#e8cf9f');
  ctx.fillStyle = g; ctx.fillRect(0, 60, 984, 240);
  // cornice + picture rail + wainscot for height cues
  ctx.fillStyle = '#b57e42'; ctx.fillRect(0, 60, 984, 14);
  ctx.fillStyle = '#caa06a'; ctx.fillRect(0, 216, 984, 8);
  ctx.fillStyle = '#d9b77e'; ctx.fillRect(0, 224, 984, 76);
  ctx.fillStyle = 'rgba(120,72,20,0.5)'; ctx.fillRect(0, 296, 984, 5);
  // sign
  rr(ctx, 300, 88, 330, 52, 10); ctx.fillStyle = '#7a3f16'; ctx.fill();
  rr(ctx, 306, 94, 318, 40, 8); ctx.fillStyle = '#934d1c'; ctx.fill();
  text(ctx, 'SIZZLE & SERVE', 465, 115, 27, '#ffd98a', 'center', 800);
  // window with daylight (left)
  rr(ctx, 36, 96, 150, 118, 6); ctx.fillStyle = '#8a5a2a'; ctx.fill();
  const wg = ctx.createLinearGradient(0, 100, 0, 210);
  wg.addColorStop(0, '#bfe6ff'); wg.addColorStop(1, '#e8f7ff');
  ctx.fillStyle = wg; ctx.fillRect(46, 106, 130, 98);
  ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.arc(140, 132, 17, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a5a2a'; ctx.fillRect(106, 106, 8, 98); ctx.fillRect(46, 150, 130, 8);
  // shelf with jars (mid-right)
  ctx.fillStyle = '#8a5a2a'; ctx.fillRect(700, 168, 210, 10);
  ctx.fillStyle = 'rgba(60,32,8,0.25)'; ctx.fillRect(700, 178, 210, 5);
  const jarCols = ['#d93a2b', '#58b368', '#ffc93c', '#e07b39', '#b565d8'];
  jarCols.forEach((c, k) => {
    const jx = 716 + k * 40;
    rr(ctx, jx, 128, 26, 40, 5); ctx.fillStyle = c; ctx.fill();
    ctx.fillStyle = '#6b4423'; ctx.fillRect(jx + 3, 120, 20, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(jx + 4, 132, 5, 30);
  });
  // hanging pans rail (right) — perspective props with shadows on the wall
  ctx.fillStyle = '#5b3a1c'; ctx.fillRect(724, 196, 196, 6);
  [[748, '#3c3f45'], [806, '#575b63'], [866, '#3c3f45']].forEach(([px, col], k) => {
    ctx.fillStyle = 'rgba(90,55,15,0.18)';
    ctx.beginPath(); ctx.ellipse(px + 7, 236 + k * 2, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c2c2c'; ctx.fillRect(px - 2, 202, 4, 16);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(px, 240, 23, 27, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(px - 6, 232, 8, 11, -0.4, 0, Math.PI * 2); ctx.fill();
  });
  // wall clock showing the shift
  ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.arc(238, 128, 30, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#7a3f16'; ctx.stroke();
  const frac = 1 - world.timeLeft / 150;
  const ang = -Math.PI / 2 + frac * Math.PI * 2;
  ctx.lineWidth = 3; ctx.strokeStyle = '#333';
  ctx.beginPath(); ctx.moveTo(238, 128); ctx.lineTo(238 + Math.cos(ang) * 20, 128 + Math.sin(ang) * 20); ctx.stroke();
  // chalk menu board (right of the clock, clear of the sign)
  rr(ctx, 196, 168, 118, 44, 4); ctx.fillStyle = '#2e4a3a'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#8a5a2a'; ctx.stroke();
  text(ctx, "TODAY'S MENU", 255, 184, 11.5, '#ffd98a');
  text(ctx, '6 dishes · days 1–3', 255, 201, 9.5, '#e8f2e4', 'center', 400);
}

function drawFloor(ctx) {
  // room surround (darker wood beyond the slab)
  ctx.fillStyle = '#4a3520'; ctx.fillRect(0, 300, 984, 420);
  // floor slab: diamond tiles + extruded front edge for slab depth
  const COLS = 10, ROWS = 8;
  const top = isoPoint(0, 0), right = isoPoint(COLS, 0), bottom = isoPoint(COLS, ROWS), left = isoPoint(0, ROWS);
  poly(ctx, [{ x: left.x, y: left.y + 16 }, bottom && { x: bottom.x, y: bottom.y + 16 }, { x: right.x, y: right.y + 16 }, { x: right.x, y: right.y }, { x: bottom.x, y: bottom.y }, { x: left.x, y: left.y }]);
  ctx.fillStyle = '#6e4a26'; ctx.fill();
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = isoPoint(i, j), b = isoPoint(i + 1, j), c = isoPoint(i + 1, j + 1), d = isoPoint(i, j + 1);
      poly(ctx, [a, b, c, d]);
      ctx.fillStyle = (i + j) % 2 === 0 ? '#e9d8b4' : '#dfc491';
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,100,50,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  void top;
}

// ---------- stations on the back counter ----------
function progressBar(ctx, x, y, frac, ready) {
  rr(ctx, x - 42, y, 84, 11, 5);
  ctx.fillStyle = 'rgba(20,12,4,0.72)'; ctx.fill();
  rr(ctx, x - 39, y + 2.5, 78 * Math.min(1, frac), 6, 3);
  ctx.fillStyle = ready ? '#7be382' : '#ffb703'; ctx.fill();
  if (ready) {
    rr(ctx, x - 34, y - 24, 68, 17, 8); ctx.fillStyle = '#2e9e4f'; ctx.fill();
    text(ctx, 'READY!', x, y - 15, 11, '#ffffff');
  }
}

function drawBackCounter(ctx, world) {
  isoBox(ctx, 1, 0, 9, 1, BACK_H, WOOD_DARK);
  // stove top across cells 2..3: dark plate following the top face
  const s1 = isoPoint(2, 0, BACK_H), s2 = isoPoint(4, 0, BACK_H), s3 = isoPoint(4, 1, BACK_H), s4 = isoPoint(2, 1, BACK_H);
  poly(ctx, [s1, s2, s3, s4]); ctx.fillStyle = '#33373d'; ctx.fill();
  ctx.strokeStyle = '#17191c'; ctx.lineWidth = 2; ctx.stroke();
  for (const [bx, by] of [[2.6, 0.35], [3.4, 0.65]]) {
    const p = isoPoint(bx, by, BACK_H);
    ctx.fillStyle = '#101215';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 17, 8.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = world.grill ? '#ff7b33' : '#454a51'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  // the pan + whatever is sizzling
  const gc = grillCentre();
  ctx.fillStyle = '#1d1f23';
  ctx.beginPath(); ctx.ellipse(gc.x, gc.y, 34, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1d1f23'; ctx.fillRect(gc.x + 28, gc.y - 4, 20, 6);
  if (world.grill) {
    drawIngredient(ctx, world.grill.ingredientId, gc.x, gc.y - 3, 34);
    // steam wisps (phase from elapsed — frozen deterministically in shots)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5;
    for (let k = 0; k < 3; k++) {
      const ph = world.elapsed * 2 + k * 2.1;
      const sx = gc.x - 14 + k * 14, sy = gc.y - 22 - (Math.sin(ph) * 3 + 3);
      ctx.beginPath(); ctx.moveTo(sx, sy + 10);
      ctx.quadraticCurveTo(sx + 5, sy + 4, sx, sy - 4); ctx.stroke();
    }
    progressBar(ctx, gc.x, gc.y - 58, world.grill.t / world.grill.total, world.grill.ready);
  }
  text(ctx, 'GRILL', gc.x, gc.y + 40, 12, '#5f3013');
  // chopping board across cell 5
  const b1 = isoPoint(5, 0, BACK_H), b2 = isoPoint(6, 0, BACK_H), b3 = isoPoint(6, 1, BACK_H), b4 = isoPoint(5, 1, BACK_H);
  poly(ctx, [b1, b2, b3, b4]); ctx.fillStyle = '#e6c88f'; ctx.fill();
  ctx.strokeStyle = '#b98d4e'; ctx.lineWidth = 2; ctx.stroke();
  const bc = boardCentre();
  if (world.board) {
    drawIngredient(ctx, 'tomato', bc.x - 6, bc.y, 30);
    // knife
    ctx.save(); ctx.translate(bc.x + 16, bc.y - 8); ctx.rotate(-0.5);
    ctx.fillStyle = '#c8ccd2'; ctx.fillRect(-3, -14, 6, 18);
    ctx.fillStyle = '#6b4423'; ctx.fillRect(-3, 4, 6, 10); ctx.restore();
    progressBar(ctx, bc.x, bc.y - 52, world.board.t / world.board.total, world.board.ready);
  } else {
    drawIngredient(ctx, 'tomato', bc.x - 12, bc.y, 22);
    ctx.save(); ctx.translate(bc.x + 14, bc.y - 4); ctx.rotate(-0.5);
    ctx.fillStyle = '#c8ccd2'; ctx.fillRect(-3, -14, 6, 18);
    ctx.fillStyle = '#6b4423'; ctx.fillRect(-3, 4, 6, 10); ctx.restore();
  }
  text(ctx, 'CHOP BOARD', bc.x, bc.y + 40, 12, '#5f3013');
  // prep bowls at the far end of the back counter
  const pc = cellTopCentre(7, 0, BACK_H + 4);
  drawIngredient(ctx, 'lettuce', pc.x - 16, pc.y, 24);
  drawIngredient(ctx, 'cheese', pc.x + 18, pc.y + 2, 24);
}

// ---------- the chef (depth-sorted between counters) ----------
function drawChef(ctx, world) {
  const i = 1.2 + world.chefStationX * 6.6;
  const base = isoPoint(i, 2.15);
  const bob = Math.sin(world.elapsed * 2.2) * 1.6;
  const x = base.x, y = base.y + bob;
  shadowEllipse(ctx, base.x, base.y + 4, 30, 9, 0.3);
  // legs + shoes
  ctx.fillStyle = '#3a4a63'; ctx.fillRect(x - 13, y - 26, 10, 22); ctx.fillRect(x + 3, y - 26, 10, 22);
  ctx.fillStyle = '#222'; ctx.fillRect(x - 15, y - 6, 13, 6); ctx.fillRect(x + 2, y - 6, 13, 6);
  // body: jacket + apron
  rr(ctx, x - 21, y - 62, 42, 40, 9); ctx.fillStyle = '#fdfdf8'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#c9c9b8'; ctx.stroke();
  rr(ctx, x - 13, y - 48, 26, 26, 4); ctx.fillStyle = '#e4572e'; ctx.fill();
  // arm holding a spatula toward the grill side
  ctx.strokeStyle = '#f2c094'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 18, y - 52); ctx.lineTo(x - 32, y - 36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 18, y - 52); ctx.lineTo(x + 30, y - 40); ctx.stroke();
  ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(x + 30, y - 40); ctx.lineTo(x + 40, y - 50); ctx.stroke();
  ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x + 36, y - 58, 10, 8);
  // head + toque
  ctx.fillStyle = '#f2c094';
  ctx.beginPath(); ctx.arc(x, y - 76, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y - 94, 17, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 16, y - 92, 32, 7);
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(x - 5, y - 77, 1.8, 0, Math.PI * 2); ctx.arc(x + 5, y - 77, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(x, y - 72, 6, 0.25, Math.PI - 0.25); ctx.stroke();
  ctx.lineCap = 'butt';
}

// ---------- island counter with the 8 ingredient bins ----------
function drawIsland(ctx, world) {
  const box = isoBox(ctx, 1, 3, 9, 4, COUNTER_H, WOOD);
  INGREDIENTS.forEach((ing, k) => {
    const c = binCentre(k);
    // bin: small extruded crate on the counter top
    isoBox(ctx, 1 + k + 0.12, 3 + 0.12, 1 + k + 0.88, 3 + 0.88, 13, { top: '#f7ead2', left: '#c9a86a', right: '#b08d4e' }, COUNTER_H);
    shadowEllipse(ctx, c.x, c.y + 4, 16, 5, 0.15);
    drawIngredient(ctx, ing.id, c.x, c.y - 4, 30);
    // name + hotkey on the island's front face
    const f = isoPoint(1 + k + 0.5, 4, COUNTER_H - 26);
    text(ctx, ing.name, f.x, f.y, 12.5, '#ffe9bd');
    text(ctx, ing.key, f.x, f.y + 15, 10, '#e8cf9f', 'center', 400);
  });
  void box;
  text(ctx, 'INGREDIENT COUNTER — click a tile (patties & fish go to the grill, tomato to the board)', 415, 648, 13, '#ffe9bd');
}

// ---------- plating counter: the dish mid-assembly lives here ----------
function drawPlating(ctx, world) {
  isoBox(ctx, 6, 5, 9, 6, COUNTER_H, WOOD_DARK);
  const pc = plateCentre();
  shadowEllipse(ctx, pc.x, pc.y + 8, 44, 13, 0.3);
  const target = targetedOrder(world);
  const ready = target && sameDish(world.plate, RECIPE_BY_ID[target.recipeId].items);
  if (ready) {
    ctx.save();
    ctx.strokeStyle = 'rgba(123,227,130,0.85)'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(pc.x, pc.y + 2, 52, 19, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  // plate
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(pc.x, pc.y + 2, 46, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9c9b8'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#eef0ea';
  ctx.beginPath(); ctx.ellipse(pc.x, pc.y + 1, 34, 11, 0, 0, Math.PI * 2); ctx.fill();
  // stacked layers, bottom first — the mid-assembly dish
  world.plate.forEach((id, k) => {
    ctx.save();
    ctx.translate(pc.x, pc.y - 2 - k * 7);
    ctx.scale(1, 0.62);
    drawIngredient(ctx, id, 0, 0, 40);
    ctx.restore();
  });
  if (!world.plate.length) text(ctx, 'plate', pc.x, pc.y - 20, 11, '#8a6a3a', 'center', 400);
  // serving cloche on the same counter
  const cc = cellTopCentre(8, 5, COUNTER_H + 6);
  ctx.fillStyle = '#c8ccd2';
  ctx.beginPath(); ctx.ellipse(cc.x, cc.y + 4, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cc.x, cc.y + 2, 23, 15, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a8f96'; ctx.beginPath(); ctx.arc(cc.x, cc.y - 14, 3.5, 0, Math.PI * 2); ctx.fill();
  text(ctx, 'THE PLATE', pc.x, pc.y + 42, 12, '#5f3013');
  // SERVE + TRASH buttons (screen space, below the counters)
  const canServe = world.plate.length > 0;
  rr(ctx, SERVE_RECT.x, SERVE_RECT.y, SERVE_RECT.w, SERVE_RECT.h, 12);
  ctx.fillStyle = canServe ? '#2e9e4f' : '#7a8a7d'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#1d6b34'; ctx.stroke();
  text(ctx, 'SERVE ⏎', SERVE_RECT.x + SERVE_RECT.w / 2, SERVE_RECT.y + 27, 21, '#ffffff', 'center', 800);
  rr(ctx, TRASH_RECT.x, TRASH_RECT.y, TRASH_RECT.w, TRASH_RECT.h, 12);
  ctx.fillStyle = '#8a4b3a'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#5f3013'; ctx.stroke();
  text(ctx, 'TRASH ⌫', TRASH_RECT.x + TRASH_RECT.w / 2, TRASH_RECT.y + 27, 17, '#ffe9bd', 'center', 800);
}

// ---------- order rail: THE PASS ----------
function drawRail(ctx, world) {
  ctx.fillStyle = '#5f4126'; ctx.fillRect(984, 60, 296, 660);
  ctx.fillStyle = '#74491f'; ctx.fillRect(984, 60, 10, 660);
  // hanging rail the tickets clip to
  ctx.fillStyle = '#2c2c2c'; ctx.fillRect(1000, 108, 264, 7);
  text(ctx, 'THE PASS — ORDERS', 1132, 88, 19, '#ffd98a', 'center', 800);
  world.orders.forEach((o, k) => {
    const y = TICKET_LAYOUT.y0 + k * (TICKET_LAYOUT.h + TICKET_LAYOUT.gap);
    const x = TICKET_LAYOUT.x;
    const recipe = RECIPE_BY_ID[o.recipeId];
    ctx.save();
    ctx.translate(x + TICKET_LAYOUT.w / 2, y + 6);
    ctx.rotate(k % 2 === 0 ? -0.012 : 0.012);
    ctx.translate(-TICKET_LAYOUT.w / 2, -6);
    // drop shadow + paper
    rr(ctx, 4, 6, TICKET_LAYOUT.w, TICKET_LAYOUT.h, 5); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    rr(ctx, 0, 0, TICKET_LAYOUT.w, TICKET_LAYOUT.h, 5); ctx.fillStyle = '#fffaf0'; ctx.fill();
    if (o.targeted) { ctx.lineWidth = 4; ctx.strokeStyle = '#d93a2b'; ctx.stroke(); }
    // clip
    rr(ctx, TICKET_LAYOUT.w / 2 - 14, -8, 28, 16, 4); ctx.fillStyle = '#9aa0a8'; ctx.fill();
    text(ctx, recipe.name, TICKET_LAYOUT.w / 2, 24, 17, '#33302a', 'center', 800);
    if (o.targeted) {
      rr(ctx, TICKET_LAYOUT.w - 66, 38, 56, 16, 8); ctx.fillStyle = '#d93a2b'; ctx.fill();
      text(ctx, 'TARGET', TICKET_LAYOUT.w - 38, 46.5, 10, '#fff');
    }
    recipe.items.forEach((id, m) => {
      drawIngredient(ctx, id, 34 + m * 42, 74, 27);
      text(ctx, INGREDIENT_BY_ID[id].name, 34 + m * 42, 100, 9.5, '#6b6252', 'center', 400);
    });
    // patience bar + seconds
    const frac = Math.max(0, o.patience / o.patienceMax);
    rr(ctx, 14, 122, TICKET_LAYOUT.w - 28, 13, 6); ctx.fillStyle = '#e3d9c4'; ctx.fill();
    rr(ctx, 16, 124, (TICKET_LAYOUT.w - 32) * frac, 9, 4);
    ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#ffb703' : '#d93a2b'; ctx.fill();
    text(ctx, `patience ${Math.ceil(o.patience)}s`, TICKET_LAYOUT.w / 2, 152, 12, '#6b6252', 'center', 600);
    ctx.restore();
  });
  if (!world.orders.length) {
    text(ctx, 'waiting for tickets…', 1132, 220, 14, '#e8cf9f', 'center', 400);
  }
}

// ---------- HUD ----------
function fmtTime(s) {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function drawHUD(ctx, world) {
  ctx.fillStyle = '#33241a'; ctx.fillRect(0, 0, 1280, 60);
  ctx.fillStyle = '#ffd98a';
  text(ctx, 'SIZZLE & SERVE', 16, 30, 21, '#ffd98a', 'left', 800);
  rr(ctx, 238, 14, 92, 32, 8); ctx.fillStyle = '#7a3f16'; ctx.fill();
  text(ctx, `DAY ${world.day}`, 284, 31, 16, '#ffe9bd');
  text(ctx, `SCORE ${world.score}`, 352, 31, 18, '#ffffff', 'left', 800);
  // goal progress
  rr(ctx, 520, 20, 120, 20, 9); ctx.fillStyle = '#241a10'; ctx.fill();
  if (world.score > 0) {
    rr(ctx, 522, 22, Math.max(10, 116 * Math.min(1, world.score / world.cfg.goal)), 16, 7); ctx.fillStyle = '#ffb703'; ctx.fill();
  }
  text(ctx, `GOAL ${world.cfg.goal}`, 580, 31, 11, '#241a10');
  if (world.combo > 1) text(ctx, `🔥 COMBO ×${world.combo}`, 668, 31, 17, '#ff9d5c', 'left', 800);
  // big shift timer
  const urgent = world.timeLeft <= 15 && world.screen === SCREEN.PLAY;
  text(ctx, `⏱ ${fmtTime(world.timeLeft)}`, 862, 26, 25, urgent ? '#ff6b5c' : '#ffffff', 'center', 800);
  rr(ctx, 796, 44, 132, 8, 4); ctx.fillStyle = '#241a10'; ctx.fill();
  rr(ctx, 797, 45, 130 * Math.max(0, world.timeLeft / 150), 6, 3);
  ctx.fillStyle = urgent ? '#ff6b5c' : '#7be382'; ctx.fill();
  // strikes
  for (let k = 0; k < MAX_STRIKES; k++) {
    text(ctx, k < world.strikes ? '✖' : '🍴', 1168 + k * 36, 31, 19, k < world.strikes ? '#ff6b5c' : '#e8cf9f');
  }
  text(ctx, 'strikes', 1216, 52, 9, '#caa06a', 'center', 400);
}

// ---------- overlays ----------
function panel(ctx, w, h) {
  const x = (1280 - w) / 2, y = (720 - h) / 2;
  ctx.fillStyle = 'rgba(24,14,4,0.55)'; ctx.fillRect(0, 0, 1280, 720);
  rr(ctx, x, y, w, h, 16); ctx.fillStyle = '#fff6e3'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#b57e42'; ctx.stroke();
  return { x, y };
}

function drawTitle(ctx, world) {
  const { x, y } = panel(ctx, 620, 430);
  text(ctx, 'SIZZLE & SERVE', x + 310, y + 58, 40, '#7a3f16', 'center', 800);
  text(ctx, '— RUSH KITCHEN 2.5D —', x + 310, y + 94, 17, '#b57e42', 'center', 700);
  const lines = [
    'Tickets land on THE PASS. Build each dish on the plate:',
    'click ingredients on the counter — patties & fish sizzle',
    'on the GRILL, tomatoes get chopped at the BOARD.',
    'Click a ticket to target it, then SERVE before patience runs out.',
    'Fast serves earn tips and build your combo. 3 strikes = closed!',
    'Keys: 1–8 ingredients · Enter serve · Backspace trash · P pause',
  ];
  lines.forEach((l, k) => text(ctx, l, x + 310, y + 140 + k * 30, 15.5, '#4a3a26', 'center', 400));
  rr(ctx, x + 160, y + 336, 300, 56, 12); ctx.fillStyle = '#2e9e4f'; ctx.fill();
  text(ctx, 'START DAY 1 ▶', x + 310, y + 365, 21, '#ffffff', 'center', 800);
  void world;
}

function drawEnd(ctx, world) {
  const { x, y } = panel(ctx, 560, 420);
  const title = world.endReason === 'closed' ? 'KITCHEN CLOSED!' : world.dayCleared ? `DAY ${world.day} CLEARED!` : 'SHIFT OVER';
  text(ctx, title, x + 280, y + 56, 34, world.dayCleared ? '#2e9e4f' : '#b03a2b', 'center', 800);
  const stars = world.dayCleared ? (world.score >= world.cfg.goal * 1.5 ? 3 : world.score >= world.cfg.goal * 1.2 ? 2 : 1) : 0;
  text(ctx, '★'.repeat(stars) + '☆'.repeat(3 - stars), x + 280, y + 100, 34, '#ffb703');
  const rows = [
    ['Final score', world.score],
    ['Day goal', world.cfg.goal],
    ['Dishes served', world.served],
    ['Tickets lost', world.lost],
    ['Best combo', `×${Math.max(1, world.bestCombo)}`],
  ];
  rows.forEach(([k, v], i) => {
    text(ctx, k, x + 90, y + 148 + i * 34, 17, '#4a3a26', 'left', 400);
    text(ctx, String(v), x + 470, y + 148 + i * 34, 18, '#7a3f16', 'right', 800);
  });
  rr(ctx, x + 130, y + 330, 300, 54, 12); ctx.fillStyle = '#2e9e4f'; ctx.fill();
  text(ctx, world.dayCleared ? `START DAY ${world.day + 1} ▶` : 'TRY AGAIN ▶', x + 280, y + 358, 19, '#ffffff', 'center', 800);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(24,14,4,0.5)'; ctx.fillRect(0, 0, 1280, 720);
  text(ctx, 'PAUSED', 640, 340, 44, '#ffd98a', 'center', 800);
  text(ctx, 'press P to resume', 640, 384, 17, '#fff6e3', 'center', 400);
}

// ---------- frame ----------
export function draw(ctx, world) {
  ctx.fillStyle = '#241a10'; ctx.fillRect(0, 0, 1280, 720);
  drawWall(ctx, world);
  drawFloor(ctx);
  drawBackCounter(ctx, world);
  drawChef(ctx, world);
  drawIsland(ctx, world);
  drawPlating(ctx, world);
  drawRail(ctx, world);
  drawHUD(ctx, world);
  if (world.toast && world.screen === SCREEN.PLAY) {
    const w = 26 + world.toast.text.length * 9.5;
    rr(ctx, 415 - w / 2, 556, w, 36, 10); ctx.fillStyle = 'rgba(24,14,4,0.85)'; ctx.fill();
    text(ctx, world.toast.text, 415, 575, 16, '#ffe9bd');
  }
  if (world.screen === SCREEN.TITLE) drawTitle(ctx, world);
  else if (world.screen === SCREEN.END) drawEnd(ctx, world);
  else if (world.screen === SCREEN.PAUSED) drawPaused(ctx);
}
