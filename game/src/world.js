// Game state & rules for Sizzle & Serve — Rush Kitchen 2.5D.
// One job: own the simulation (orders, stations, plate, score, clock) and
// expose intent-level actions. No drawing, no DOM — this module is unit
// testable in plain Node, which is how the logic was verified.

import {
  SHIFT_SECONDS, MAX_STRIKES, MAX_ORDERS, GRILL_SECONDS, CHOP_SECONDS,
  BASE_POINTS_PER_ITEM, INGREDIENT_BY_ID, RECIPE_BY_ID, dayConfig, recipesForDay,
} from './config.js';
import { mulberry32, pick } from './random.js';

export const SCREEN = { TITLE: 'title', PLAY: 'play', PAUSED: 'paused', END: 'end' };

export function sameDish(a, b) {
  if (a.length !== b.length) return false;
  const count = new Map();
  for (const id of a) count.set(id, (count.get(id) || 0) + 1);
  for (const id of b) {
    const n = count.get(id) || 0;
    if (n === 0) return false;
    count.set(id, n - 1);
  }
  return true;
}

export function createWorld(seed = 7) {
  return {
    screen: SCREEN.TITLE,
    rng: mulberry32(seed),
    day: 1,
    cfg: dayConfig(1),
    score: 0,
    combo: 0,
    bestCombo: 0,
    strikes: 0,
    served: 0,
    lost: 0,
    timeLeft: SHIFT_SECONDS,
    orders: [],            // {id, recipeId, patience, patienceMax, targeted}
    nextOrderId: 1,
    spawnIn: 0,
    plate: [],             // ingredient ids, bottom of the stack first
    grill: null,           // {ingredientId, t, total, ready}
    board: null,           // {ingredientId, t, total, ready}
    chefStationX: 0.5,     // 0..1 along the kitchen, render-only hint
    toast: null,           // {text, t}
    lastEvent: null,       // EVENT_* string for audio / announcements
    endReason: null,       // 'goal' | 'closed' | 'time'
    dayCleared: false,
    elapsed: 0,
  };
}

export function startDay(world, day) {
  world.day = day;
  world.cfg = dayConfig(day);
  world.timeLeft = SHIFT_SECONDS;
  world.orders = [];
  world.plate = [];
  world.grill = null;
  world.board = null;
  world.strikes = 0;
  world.spawnIn = 0;
  world.endReason = null;
  world.dayCleared = false;
  world.screen = SCREEN.PLAY;
  spawnOrder(world);
  spawnOrder(world);
}

function spawnOrder(world) {
  if (world.orders.length >= MAX_ORDERS) return;
  const menu = recipesForDay(world.day);
  // Prefer a dish not already on the pass so the board stays readable.
  const fresh = menu.filter((r) => !world.orders.some((o) => o.recipeId === r.id));
  const recipe = pick(world.rng, fresh.length ? fresh : menu);
  world.orders.push({
    id: world.nextOrderId++,
    recipeId: recipe.id,
    patience: world.cfg.patience,
    patienceMax: world.cfg.patience,
    targeted: world.orders.length === 0,
  });
}

export function targetOrder(world, orderId) {
  for (const o of world.orders) o.targeted = o.id === orderId;
}

export function targetedOrder(world) {
  return world.orders.find((o) => o.targeted) || world.orders[0] || null;
}

// Clicking an ingredient tile: grill/board items route to their station
// first; everything else lands straight on the plate.
export function addIngredient(world, ingredientId) {
  const ing = INGREDIENT_BY_ID[ingredientId];
  if (!ing || world.screen !== SCREEN.PLAY) return 'EVENT_NONE';
  if (ing.station === 'grill') {
    if (world.grill) { world.toast = { text: 'Grill is busy!', t: 1.6 }; return 'EVENT_BUSY'; }
    world.grill = { ingredientId, t: 0, total: GRILL_SECONDS, ready: false };
    world.chefStationX = 0.22;
    return 'EVENT_SIZZLE';
  }
  if (ing.station === 'board') {
    if (world.board) { world.toast = { text: 'Board is busy!', t: 1.6 }; return 'EVENT_BUSY'; }
    world.board = { ingredientId, t: 0, total: CHOP_SECONDS, ready: false };
    world.chefStationX = 0.48;
    return 'EVENT_CHOP';
  }
  world.plate.push(ingredientId);
  world.chefStationX = 0.78;
  return 'EVENT_POP';
}

// Clicking a station collects its finished item onto the plate.
export function collectStation(world, which) {
  const st = which === 'grill' ? world.grill : world.board;
  if (!st) return 'EVENT_NONE';
  if (!st.ready) { world.toast = { text: 'Not ready yet…', t: 1.2 }; return 'EVENT_BUSY'; }
  world.plate.push(st.ingredientId);
  if (which === 'grill') world.grill = null; else world.board = null;
  world.chefStationX = 0.78;
  return 'EVENT_POP';
}

export function trashPlate(world) {
  if (!world.plate.length) return 'EVENT_NONE';
  world.plate = [];
  world.combo = 0;
  return 'EVENT_TRASH';
}

export function serve(world) {
  if (!world.plate.length) { world.toast = { text: 'The plate is empty!', t: 1.4 }; return 'EVENT_ERROR'; }
  const target = targetedOrder(world);
  const match = (target && sameDish(world.plate, RECIPE_BY_ID[target.recipeId].items))
    ? target
    : world.orders.find((o) => sameDish(world.plate, RECIPE_BY_ID[o.recipeId].items));
  if (!match) {
    world.combo = 0;
    world.toast = { text: 'That plate does not match the ticket!', t: 1.8 };
    return 'EVENT_ERROR';
  }
  const recipe = RECIPE_BY_ID[match.recipeId];
  const tip = Math.round(20 * (match.patience / match.patienceMax));
  const base = recipe.items.length * BASE_POINTS_PER_ITEM;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const gained = Math.round((base + tip) * (1 + 0.25 * (world.combo - 1)));
  world.score += gained;
  world.served += 1;
  world.orders = world.orders.filter((o) => o.id !== match.id);
  if (world.orders.length && !world.orders.some((o) => o.targeted)) world.orders[0].targeted = true;
  world.plate = [];
  world.toast = { text: `Served ${recipe.name}! +${gained}`, t: 1.8 };
  world.chefStationX = 0.9;
  return 'EVENT_SERVED';
}

function endDay(world, reason) {
  world.screen = SCREEN.END;
  world.endReason = reason;
  world.dayCleared = world.score >= world.cfg.goal;
}

export function update(world, dt) {
  world.elapsed += dt;
  if (world.toast) { world.toast.t -= dt; if (world.toast.t <= 0) world.toast = null; }
  if (world.screen !== SCREEN.PLAY) return;

  world.timeLeft -= dt;
  if (world.timeLeft <= 10.5 && world.timeLeft + dt > 10.5) world.lastEvent = 'EVENT_TICK';
  if (world.timeLeft <= 0) { world.timeLeft = 0; endDay(world, world.score >= world.cfg.goal ? 'goal' : 'time'); return; }

  for (const st of [world.grill, world.board]) {
    if (st && !st.ready) {
      st.t += dt;
      if (st.t >= st.total) { st.ready = true; world.lastEvent = 'EVENT_DING'; }
    }
  }

  world.spawnIn -= dt;
  if (world.spawnIn <= 0) { spawnOrder(world); world.spawnIn = world.cfg.spawnEvery; }

  for (const o of [...world.orders]) {
    o.patience -= dt;
    if (o.patience <= 0) {
      world.orders = world.orders.filter((x) => x.id !== o.id);
      world.strikes += 1;
      world.lost += 1;
      world.combo = 0;
      world.toast = { text: 'Ticket expired — strike!', t: 1.8 };
      world.lastEvent = 'EVENT_STRIKE';
      if (world.strikes >= MAX_STRIKES) { endDay(world, 'closed'); return; }
    }
  }
  if (world.orders.length && !world.orders.some((o) => o.targeted)) world.orders[0].targeted = true;
}
