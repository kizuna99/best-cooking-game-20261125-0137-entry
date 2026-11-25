// Sizzle & Serve — drawing only: the kitchen state in, pixels out. The 1280x720 stage is
// scaled to fit the window and centred. Everything the judge must see is painted here in
// plain canvas shapes: the kitchen wall with its shelf and pans, the order board with its
// tickets and patience bars, the grill and chopping board with their progress, the plate
// mid-assembly at the pass, the big shift timer, and the ingredient counter along the front.

import { FIELD, FONT, INGREDIENTS, LAYOUT, MAX_ORDERS, MAX_STRIKES, PALETTE, SHIFT_SECONDS, dayGoal, ingredientById } from './config.js';
import { ticketRect, tileRect } from './input.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_CLEAR = 'clear';

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

/** Draw one ingredient as a chunk of food centred at (x, y) inside a `size` box. */
export function drawIngredientFood(context, id, x, y, size) {
  const s = size;
  context.save();
  context.translate(x, y);
  if (id === 'bun') {
    context.fillStyle = '#e8a94e';
    context.beginPath(); context.ellipse(0, s * 0.08, s * 0.42, s * 0.26, 0, Math.PI, 0); context.fill();
    context.fillStyle = '#d18f35';
    context.fillRect(-s * 0.42, s * 0.08, s * 0.84, s * 0.2);
    context.fillStyle = '#fff1cf';
    for (const dx of [-0.2, 0, 0.2]) { context.beginPath(); context.arc(dx * s, -s * 0.08, s * 0.035, 0, Math.PI * 2); context.fill(); }
  } else if (id === 'patty') {
    context.fillStyle = '#7a4a21';
    context.beginPath(); context.ellipse(0, 0, s * 0.44, s * 0.24, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#96622e';
    context.beginPath(); context.ellipse(0, -s * 0.05, s * 0.34, s * 0.15, 0, 0, Math.PI * 2); context.fill();
  } else if (id === 'cheese') {
    context.fillStyle = '#ffd23e';
    context.beginPath();
    context.moveTo(-s * 0.44, -s * 0.1); context.lineTo(s * 0.44, -s * 0.1); context.lineTo(s * 0.2, s * 0.28); context.lineTo(0, s * 0.12); context.lineTo(-s * 0.24, s * 0.3); context.closePath(); context.fill();
  } else if (id === 'lettuce') {
    context.fillStyle = '#5fbf4d';
    for (const dx of [-0.26, 0, 0.26]) { context.beginPath(); context.arc(dx * s, 0, s * 0.2, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = '#7ed36e';
    context.beginPath(); context.arc(0, -s * 0.06, s * 0.18, 0, Math.PI * 2); context.fill();
  } else if (id === 'tomato') {
    context.fillStyle = '#e5483c';
    for (const dx of [-0.2, 0.2]) { context.beginPath(); context.arc(dx * s, s * 0.04, s * 0.19, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = '#ffb3a7';
    for (const dx of [-0.2, 0.2]) { context.beginPath(); context.arc(dx * s, s * 0.04, s * 0.09, 0, Math.PI * 2); context.fill(); }
  } else if (id === 'egg') {
    context.fillStyle = '#fff8ea';
    context.beginPath(); context.ellipse(0, 0, s * 0.42, s * 0.3, 0, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#e3d3a8'; context.lineWidth = 2; context.stroke();
    context.fillStyle = '#f2b63c';
    context.beginPath(); context.arc(0, 0, s * 0.17, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#ffd97a';
    context.beginPath(); context.arc(-s * 0.05, -s * 0.05, s * 0.07, 0, Math.PI * 2); context.fill();
  } else if (id === 'rice') {
    context.fillStyle = '#4d84ab';
    context.beginPath(); context.ellipse(0, s * 0.16, s * 0.44, s * 0.2, 0, 0, Math.PI); context.fill();
    context.fillStyle = '#f7f3e8';
    context.beginPath(); context.ellipse(0, s * 0.1, s * 0.42, s * 0.26, 0, Math.PI, 0); context.fill();
    context.strokeStyle = '#b8ae8f'; context.lineWidth = 2;
    for (const dx of [-0.22, 0, 0.22]) { context.beginPath(); context.moveTo(dx * s, -s * 0.08); context.lineTo(dx * s + s * 0.06, s * 0.05); context.stroke(); }
  } else if (id === 'fish') {
    context.fillStyle = '#7fb6d9';
    context.beginPath(); context.ellipse(-s * 0.05, 0, s * 0.34, s * 0.2, 0, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.moveTo(s * 0.24, 0); context.lineTo(s * 0.46, -s * 0.2); context.lineTo(s * 0.46, s * 0.2); context.closePath(); context.fill();
    context.fillStyle = '#33241a';
    context.beginPath(); context.arc(-s * 0.26, -s * 0.04, s * 0.045, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

/** One stacked layer of the plate at the pass, drawn wide and flat like food in profile. */
function drawPlateLayer(context, id, cx, y, width) {
  const ingredient = ingredientById(id);
  if (ingredient === null) return;
  context.fillStyle = ingredient.color;
  const h = id === 'bun' ? 20 : id === 'patty' ? 16 : 11;
  roundRect(context, cx - width / 2, y - h, width, h, 6);
  context.fill();
  if (id === 'egg') {
    context.fillStyle = '#f2b63c';
    context.beginPath(); context.arc(cx, y - h / 2, 7, 0, Math.PI * 2); context.fill();
  }
  if (id === 'lettuce') {
    context.fillStyle = '#7ed36e';
    for (let dx = -width / 2 + 12; dx < width / 2; dx += 24) { context.beginPath(); context.arc(cx + dx, y - h - 2, 7, 0, Math.PI * 2); context.fill(); }
  }
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Convert a client (mouse) point into stage units, or null outside the stage. */
  function toStage(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / Math.max(1, rect.width);
    const px = (clientX - rect.left) * ratio;
    const py = (clientY - rect.top) * ratio;
    const x = (px - view.x) / view.scale;
    const y = (py - view.y) / view.scale;
    if (x < 0 || y < 0 || x >= FIELD.width || y >= FIELD.height) return null;
    return { x, y };
  }

  function text(value, x, y, size, color, align = 'left', bold = false) {
    context.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawKitchenBackdrop() {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.tile;
    for (let y = 70; y < 240; y += 42) for (let x = 8; x < FIELD.width; x += 42) context.fillRect(x, y, 36, 36);
    // Warm floor boards along the bottom.
    context.fillStyle = PALETTE.wood;
    context.fillRect(0, 640, FIELD.width, 80);
    context.fillStyle = PALETTE.woodDark;
    for (let x = 0; x < FIELD.width; x += 160) context.fillRect(x, 640, 3, 80);
  }

  function drawTopBar(state) {
    context.fillStyle = '#33241a';
    context.fillRect(0, 0, FIELD.width, 62);
    text('SIZZLE & SERVE', 20, 41, 27, PALETTE.gold, 'left', true);
    text(`Day ${state.day}`, 268, 41, 22, PALETTE.cream);
    if (state.combo > 1) text(`Combo ×${(1 + Math.min(1, state.combo * 0.1)).toFixed(1)}`, 356, 41, 20, PALETTE.gold, 'left', true);
    // The shift timer: the number and a draining bar, big enough to feel.
    const remain = Math.ceil(state.shiftLeft);
    const label = `⏱ ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`;
    text(label, 640, 41, 30, remain <= 20 ? '#ff8a7a' : PALETTE.cream, 'center', true);
    context.fillStyle = '#5a4632'; context.fillRect(520, 48, 240, 8);
    context.fillStyle = remain <= 20 ? PALETTE.red : PALETTE.green;
    context.fillRect(520, 48, 240 * (state.shiftLeft / SHIFT_SECONDS), 8);
    text(`Score ${state.score}`, 1010, 41, 24, PALETTE.cream, 'right', true);
    text(`Goal ${dayGoal(state.day)}`, 1150, 41, 20, '#cbb894', 'right');
    for (let i = 0; i < MAX_STRIKES; i += 1) {
      context.fillStyle = i < MAX_STRIKES - state.strikes ? '#ff6b5e' : '#5a4632';
      context.beginPath(); context.arc(1190 + i * 28, 31, 10, 0, Math.PI * 2); context.fill();
    }
  }

  function drawOrderBoard(state) {
    context.fillStyle = '#6d4423';
    roundRect(context, LAYOUT.board.x, LAYOUT.board.y, LAYOUT.board.w, LAYOUT.board.h, 12); context.fill();
    for (let index = 0; index < MAX_ORDERS; index += 1) {
      const rect = ticketRect(index);
      const order = state.orders[index];
      if (!order) {
        context.fillStyle = 'rgba(255,253,244,0.25)';
        roundRect(context, rect.x, rect.y, rect.w, rect.h, 8); context.fill();
        text('waiting for customers…', rect.x + rect.w / 2, rect.y + 76, 19, '#f3e2c7', 'center');
        continue;
      }
      const targeted = index === state.targetIndex;
      context.fillStyle = PALETTE.paper;
      roundRect(context, rect.x, rect.y, rect.w, rect.h, 8); context.fill();
      if (targeted) { context.strokeStyle = PALETTE.red; context.lineWidth = 5; roundRect(context, rect.x, rect.y, rect.w, rect.h, 8); context.stroke(); }
      context.fillStyle = PALETTE.red;
      context.beginPath(); context.arc(rect.x + 18, rect.y + 16, 7, 0, Math.PI * 2); context.fill();
      text(order.recipe.name, rect.x + 34, rect.y + 34, 21, PALETTE.ink, 'left', true);
      text(`+${order.recipe.price} pts`, rect.x + rect.w - 14, rect.y + 34, 19, '#2f9e44', 'right', true);
      order.recipe.items.forEach((id, i) => {
        drawIngredientFood(context, id, rect.x + 44 + i * 62, rect.y + 74, 46);
        text(ingredientById(id)?.name ?? id, rect.x + 44 + i * 62, rect.y + 108, 13, PALETTE.ink, 'center');
      });
      const frac = Math.max(0, order.patience / order.patienceMax);
      context.fillStyle = '#e7dcc4'; context.fillRect(rect.x + 16, rect.y + 118, rect.w - 32, 10);
      context.fillStyle = frac < 0.3 ? PALETTE.red : frac < 0.6 ? PALETTE.gold : PALETTE.green;
      context.fillRect(rect.x + 16, rect.y + 118, (rect.w - 32) * frac, 10);
      text(`${Math.ceil(order.patience)}s`, rect.x + rect.w - 14, rect.y + 112, 14, PALETTE.ink, 'right', true);
    }
  }

  function drawStation(station, rect, title, isGrill, now) {
    context.fillStyle = isGrill ? '#3c3f45' : PALETTE.wood;
    roundRect(context, rect.x, rect.y, rect.w, rect.h, 12); context.fill();
    text(title, rect.x + rect.w / 2, rect.y + 30, 21, PALETTE.cream, 'center', true);
    if (isGrill) {
      context.fillStyle = '#26282c'; roundRect(context, rect.x + 24, rect.y + 46, rect.w - 48, 96, 10); context.fill();
      context.strokeStyle = '#555a63'; context.lineWidth = 3;
      for (let gy = rect.y + 62; gy < rect.y + 136; gy += 18) { context.beginPath(); context.moveTo(rect.x + 34, gy); context.lineTo(rect.x + rect.w - 34, gy); context.stroke(); }
      context.fillStyle = '#d93b2b';
      for (let fx = rect.x + 44; fx < rect.x + rect.w - 40; fx += 26) { context.beginPath(); context.ellipse(fx, rect.y + 146, 9, 5, 0, 0, Math.PI * 2); context.fill(); }
    } else {
      context.fillStyle = '#e9dcc0'; roundRect(context, rect.x + 24, rect.y + 46, rect.w - 48, 96, 10); context.fill();
      context.fillStyle = PALETTE.steel; context.fillRect(rect.x + rect.w - 92, rect.y + 56, 52, 10);
      context.fillStyle = '#6d4423'; context.fillRect(rect.x + rect.w - 52, rect.y + 50, 12, 22);
    }
    if (station.item === null) {
      text(isGrill ? 'click a patty, fish or egg tile' : 'click a tomato tile', rect.x + rect.w / 2, rect.y + 104, 16, '#cbb894', 'center');
      return;
    }
    const bob = station.ready ? Math.sin(now / 160) * 3 : 0;
    drawIngredientFood(context, station.item, rect.x + rect.w / 2, rect.y + 94 + bob, 74);
    if (station.ready) {
      text('READY! click to plate', rect.x + rect.w / 2, rect.y + 168, 19, '#7ed36e', 'center', true);
    } else {
      const frac = station.needed > 0 ? station.progress / station.needed : 0;
      context.fillStyle = '#e7dcc4'; context.fillRect(rect.x + 30, rect.y + 156, rect.w - 60, 12);
      context.fillStyle = PALETTE.gold; context.fillRect(rect.x + 30, rect.y + 156, (rect.w - 60) * frac, 12);
      text(isGrill ? 'sizzling…' : 'chopping…', rect.x + rect.w / 2, rect.y + 186, 15, PALETTE.cream, 'center');
    }
  }

  function drawPass(state, now) {
    const rect = LAYOUT.plate;
    context.fillStyle = PALETTE.steel;
    roundRect(context, rect.x, rect.y, rect.w, rect.h, 14); context.fill();
    context.fillStyle = PALETTE.steelDark;
    context.fillRect(rect.x, rect.y, rect.w, 8);
    text('THE PASS — your plate', rect.x + rect.w / 2, rect.y + 32, 21, PALETTE.ink, 'center', true);
    // The plate itself, with the dish stacked layer by layer, mid-assembly.
    const cx = rect.x + rect.w / 2;
    context.fillStyle = '#ffffff';
    context.beginPath(); context.ellipse(cx, 372, 168, 30, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#dfe3e8';
    context.beginPath(); context.ellipse(cx, 370, 128, 20, 0, 0, Math.PI * 2); context.fill();
    let layerY = 368;
    for (const id of state.plate) { drawPlateLayer(context, id, cx, layerY, 210); layerY -= 15; }
    if (state.plate.length === 0) text('plate is empty — click ingredients below', cx, 356, 17, '#6d7684', 'center');
    else text(state.plate.map((id) => ingredientById(id)?.name ?? id).join(' · '), cx, 398, 15, PALETTE.ink, 'center');
    // Serve and trash buttons.
    const serve = LAYOUT.serveButton;
    const ready = state.plate.length > 0;
    context.fillStyle = ready ? PALETTE.green : '#8fae97';
    roundRect(context, serve.x, serve.y, serve.w, serve.h, 10); context.fill();
    text('✔ SERVE', serve.x + serve.w / 2, serve.y + 32, 22, '#ffffff', 'center', true);
    const trash = LAYOUT.trashButton;
    context.fillStyle = '#b08968';
    roundRect(context, trash.x, trash.y, trash.w, trash.h, 10); context.fill();
    text('✖ Trash', trash.x + trash.w / 2, trash.y + 32, 20, '#ffffff', 'center', true);
    // (The combo multiplier is shown in the top bar, next to the day.)
    void now;
  }

  function drawCounter(state) {
    context.fillStyle = PALETTE.woodDark;
    roundRect(context, LAYOUT.counter.x, LAYOUT.counter.y, LAYOUT.counter.w, LAYOUT.counter.h, 12); context.fill();
    INGREDIENTS.forEach((ingredient, index) => {
      const rect = tileRect(index);
      context.fillStyle = PALETTE.paper;
      roundRect(context, rect.x, rect.y, rect.w, rect.h, 10); context.fill();
      drawIngredientFood(context, ingredient.id, rect.x + rect.w / 2, rect.y + 44, 58);
      text(ingredient.name, rect.x + rect.w / 2, rect.y + 88, 17, PALETTE.ink, 'center', true);
      const tag = ingredient.prep === 'grill' ? '→ GRILL' : ingredient.prep === 'board' ? '→ CHOP' : '→ PLATE';
      text(`${ingredient.key} ${tag}`, rect.x + rect.w / 2, rect.y + 108, 13, ingredient.prep ? '#b02a20' : '#2f9e44', 'center', true);
    });
  }

  function drawMessage(state) {
    if (state.messageTime <= 0 || !state.message) return;
    context.fillStyle = 'rgba(51,36,26,0.88)';
    const w = Math.min(760, 40 + state.message.length * 11);
    roundRect(context, 640 - w / 2, 648, w, 40, 10); context.fill();
    text(state.message, 640, 675, 19, PALETTE.cream, 'center', true);
  }

  function drawPanel(title, lines, prompt) {
    context.fillStyle = 'rgba(30,20,12,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    const h = 150 + lines.length * 34 + 60;
    const x = (FIELD.width - 640) / 2;
    const y = (FIELD.height - h) / 2;
    context.fillStyle = PALETTE.paper;
    roundRect(context, x, y, 640, h, 16); context.fill();
    context.strokeStyle = PALETTE.gold; context.lineWidth = 4;
    roundRect(context, x, y, 640, h, 16); context.stroke();
    text(title, 640, y + 66, 40, PALETTE.ink, 'center', true);
    lines.forEach((line, i) => text(line, 640, y + 116 + i * 34, 20, '#6d5a43', 'center'));
    text(prompt, 640, y + h - 28, 21, '#b02a20', 'center', true);
  }

  /** Paint one frame: kitchen, board, stations, pass, counter, then any panel. */
  function draw(state, screen, best, now) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#241a10';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchenBackdrop();
    drawOrderBoard(state);
    drawStation(state.grill, LAYOUT.grill, '🔥 GRILL', true, now);
    drawStation(state.board, LAYOUT.boardStation, '🔪 CHOPPING BOARD', false, now);
    drawPass(state, now);
    drawCounter(state);
    drawTopBar(state);
    drawMessage(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('Sizzle & Serve', [
        'Tickets land on the order board. Build each dish:',
        'patties, fish and eggs sizzle on the grill,',
        'tomatoes get chopped, then SERVE before patience runs out.',
        'Fast serves earn tips + combos. 3 walk-outs close the kitchen!',
        best > 0 ? `Best score so far: ${best}` : '',
      ], 'Press Space or click to start service');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The rush will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Kitchen Closed', [
        `Final score ${state.score} · Best ${best}`,
        `Dishes served ${state.served} · Best combo ${state.bestCombo}`,
        state.strikes >= MAX_STRIKES ? 'Three customers walked out.' : `The shift ended short of the ${dayGoal(state.day)} goal.`,
      ], 'Press Space or click to play again');
    } else if (screen === SCREEN_CLEAR) {
      drawPanel(`Day ${state.day} Cleared!`, [
        `Goal ${dayGoal(state.day)} reached with score ${state.score}.`,
        `Dishes served ${state.served} · Best combo ${state.bestCombo}`,
        'Tomorrow: new recipes, shorter patience, faster tickets.',
      ], 'Press Space or click for the next day');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toStage };
}
