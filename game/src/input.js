// Mouse hit-testing + keyboard hotkeys.
// One job: turn clicks/keys into world actions. Hit areas come from the
// renderer's own layout exports so what you click is what you see.

import { INGREDIENTS } from './config.js';
import { SCREEN, addIngredient, collectStation, serve, trashPlate, targetOrder, startDay } from './world.js';
import { binCentre, grillCentre, boardCentre, plateCentre, TICKET_LAYOUT, SERVE_RECT, TRASH_RECT } from './render.js';

function near(p, c, r) { return Math.abs(p.x - c.x) <= r && Math.abs(p.y - c.y) <= r * 0.78; }
function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }

export function handleClick(world, p, emit) {
  if (world.screen === SCREEN.TITLE) { startDay(world, 1); emit('EVENT_DAY'); return; }
  if (world.screen === SCREEN.END) {
    startDay(world, world.dayCleared ? world.day + 1 : world.day);
    emit('EVENT_DAY');
    return;
  }
  if (world.screen !== SCREEN.PLAY) return;

  // tickets on the pass
  world.orders.forEach((o, k) => {
    const r = { x: TICKET_LAYOUT.x, y: TICKET_LAYOUT.y0 + k * (TICKET_LAYOUT.h + TICKET_LAYOUT.gap), w: TICKET_LAYOUT.w, h: TICKET_LAYOUT.h };
    if (inRect(p, r)) { targetOrder(world, o.id); emit('EVENT_POP'); }
  });

  if (inRect(p, SERVE_RECT)) { emit(serve(world)); return; }
  if (inRect(p, TRASH_RECT)) { emit(trashPlate(world)); return; }
  if (near(p, grillCentre(), 52)) { emit(collectStation(world, 'grill')); return; }
  if (near(p, boardCentre(), 52)) { emit(collectStation(world, 'board')); return; }
  if (near(p, plateCentre(), 56)) { emit(serve(world)); return; }

  INGREDIENTS.forEach((ing, k) => {
    if (near(p, binCentre(k), 40)) emit(addIngredient(world, ing.id));
  });
}

export function handleKey(world, key, emit) {
  if (key === ' ') {
    if (world.screen === SCREEN.TITLE) { startDay(world, 1); emit('EVENT_DAY'); }
    else if (world.screen === SCREEN.END) { startDay(world, world.dayCleared ? world.day + 1 : world.day); emit('EVENT_DAY'); }
    return;
  }
  if (key === 'p' || key === 'P') {
    if (world.screen === SCREEN.PLAY) world.screen = SCREEN.PAUSED;
    else if (world.screen === SCREEN.PAUSED) world.screen = SCREEN.PLAY;
    return;
  }
  if (world.screen !== SCREEN.PLAY) return;
  const ing = INGREDIENTS.find((i) => i.key === key);
  if (ing) { emit(addIngredient(world, ing.id)); return; }
  if (key === 'Enter') { emit(serve(world)); return; }
  if (key === 'Backspace') { emit(trashPlate(world)); return; }
  if (key === 'g' || key === 'G') { emit(collectStation(world, 'grill')); return; }
  if (key === 'b' || key === 'B') { emit(collectStation(world, 'board')); return; }
}
