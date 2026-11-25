// Sizzle & Serve — the kitchen's rules and state, with no drawing and no browser in it:
// tickets arrive on the order board, ingredients route through the grill or the chopping
// board, the plate fills layer by layer, and serving the targeted ticket pays its price
// plus a speed tip. step() advances one fixed step; the action methods return event flags
// so the caller can play sounds and announcements without the world knowing about them.

import {
  INGREDIENTS, MAX_ORDERS, MAX_STRIKES, RECIPES, SHIFT_SECONDS,
  dayGoal, ingredientById, orderPatience, spawnInterval,
} from './config.js';
import { pickRandom } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_WRONG = 4;
export const EVENT_STATION_DONE = 8;
export const EVENT_DAY_CLEAR = 16;
export const EVENT_GAME_OVER = 32;

/** Two ingredient lists hold the same dish when every item matches in count. */
export function sameDish(plateItems, recipeItems) {
  if (plateItems.length !== recipeItems.length) return false;
  const counts = new Map();
  for (const id of recipeItems) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of plateItems) {
    const left = (counts.get(id) ?? 0) - 1;
    if (left < 0) return false;
    counts.set(id, left);
  }
  return true;
}

/** Recipes orderable on a given day, in menu order. */
export function menuForDay(day) {
  return RECIPES.filter((recipe) => recipe.fromDay <= day);
}

export function createWorld(random) {
  const state = {
    day: 1,
    score: 0,
    served: 0,
    strikes: 0,
    combo: 0,
    bestCombo: 0,
    shiftLeft: SHIFT_SECONDS,
    orders: [],
    plate: [],
    grill: { item: null, progress: 0, needed: 0, ready: false },
    board: { item: null, progress: 0, needed: 0, ready: false },
    targetIndex: 0,
    spawnTimer: 0,
    message: '',
    messageTime: 0,
    lastTip: 0,
    over: false,
    dayClear: false,
  };

  function stationFor(ingredient) {
    if (ingredient.prep === 'grill') return state.grill;
    if (ingredient.prep === 'board') return state.board;
    return null;
  }

  function spawnOrder() {
    if (state.orders.length >= MAX_ORDERS) return;
    // Prefer a dish nobody is already waiting for, so the board reads as a real rush
    // of different customers; only repeat a recipe when the menu offers no other.
    const menu = menuForDay(state.day);
    const fresh = menu.filter((recipe) => !state.orders.some((order) => order.recipe.id === recipe.id));
    const recipe = pickRandom(random, fresh.length > 0 ? fresh : menu);
    const patience = orderPatience(state.day, random);
    state.orders.push({ recipe, patience, patienceMax: patience });
    if (state.targetIndex >= state.orders.length) state.targetIndex = 0;
  }

  function reset(day) {
    state.day = day;
    state.score = 0;
    state.served = 0;
    state.strikes = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.orders = [];
    state.plate = [];
    state.grill = { item: null, progress: 0, needed: 0, ready: false };
    state.board = { item: null, progress: 0, needed: 0, ready: false };
    state.targetIndex = 0;
    state.spawnTimer = 0.4;
    state.message = '';
    state.messageTime = 0;
    state.lastTip = 0;
    state.over = false;
    state.dayClear = false;
    spawnOrder();
    spawnOrder();
  }

  /** Send the next day in with the score banked: the caller keeps the running total. */
  function nextDay() {
    const banked = state.score;
    const servedTotal = state.served;
    reset(state.day + 1);
    state.score = banked;
    state.served = servedTotal;
  }

  /**
   * Click an ingredient tile. A prep ingredient goes to its station (when free); an
   * instant one lands straight on the plate. Returns 'plate', 'grill', 'board',
   * 'busy' (station occupied) or 'full' (plate already holds 5 layers).
   */
  function addIngredient(id) {
    const ingredient = ingredientById(id);
    if (ingredient === null || state.over) return 'busy';
    const station = stationFor(ingredient);
    if (station !== null) {
      if (station.item !== null) return 'busy';
      station.item = id;
      station.progress = 0;
      station.needed = ingredient.prepSeconds;
      station.ready = false;
      return ingredient.prep;
    }
    if (state.plate.length >= 5) return 'full';
    state.plate.push(id);
    return 'plate';
  }

  /** Move a finished station item onto the plate; false while it is still cooking. */
  function collectStation(which) {
    const station = which === 'grill' ? state.grill : state.board;
    if (station.item === null || !station.ready) return false;
    if (state.plate.length >= 5) return false;
    state.plate.push(station.item);
    station.item = null;
    station.progress = 0;
    station.ready = false;
    return true;
  }

  function trashPlate() {
    state.plate = [];
    state.combo = 0;
  }

  function selectOrder(index) {
    if (index >= 0 && index < state.orders.length) state.targetIndex = index;
  }

  /**
   * Serve the plate to the targeted ticket. On a match: price + tip (up to +50% for a
   * full patience bar) times the combo multiplier (×1 + 0.1 per combo step, capped ×2).
   * On a mismatch the plate stays but the combo breaks.
   */
  function servePlate() {
    const order = state.orders[state.targetIndex];
    if (!order || state.plate.length === 0) return 0;
    if (!sameDish(state.plate, order.recipe.items)) {
      state.combo = 0;
      state.message = 'That plate does not match the ticket!';
      state.messageTime = 2.2;
      return EVENT_WRONG;
    }
    const tip = Math.round(order.recipe.price * 0.5 * (order.patience / order.patienceMax));
    const multiplier = 1 + Math.min(1, state.combo * 0.1);
    const earned = Math.round((order.recipe.price + tip) * multiplier);
    state.lastTip = tip;
    state.score += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.message = `Served ${order.recipe.name}! +${earned} pts`;
    state.messageTime = 2.2;
    state.plate = [];
    state.orders.splice(state.targetIndex, 1);
    if (state.targetIndex >= state.orders.length) state.targetIndex = Math.max(0, state.orders.length - 1);
    return EVENT_SERVED;
  }

  function stepStation(station, dt, events) {
    if (station.item === null || station.ready) return events;
    station.progress += dt;
    if (station.progress >= station.needed) {
      station.progress = station.needed;
      station.ready = true;
      return events | EVENT_STATION_DONE;
    }
    return events;
  }

  /** One fixed step of service: timers, stations, ticket patience and the shift clock. */
  function step(dt) {
    if (state.over || state.dayClear) return 0;
    let events = 0;
    state.shiftLeft = Math.max(0, state.shiftLeft - dt);
    if (state.messageTime > 0) state.messageTime = Math.max(0, state.messageTime - dt);

    events = stepStation(state.grill, dt, events);
    events = stepStation(state.board, dt, events);

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnOrder();
      state.spawnTimer = spawnInterval(state.day, random);
    }

    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience > 0) continue;
      state.orders.splice(index, 1);
      state.strikes += 1;
      state.combo = 0;
      state.message = `${order.recipe.name} walked out! Strike ${state.strikes}/${MAX_STRIKES}`;
      state.messageTime = 2.4;
      events |= EVENT_EXPIRED;
      if (state.targetIndex >= state.orders.length) state.targetIndex = Math.max(0, state.orders.length - 1);
    }

    if (state.strikes >= MAX_STRIKES) {
      state.over = true;
      events |= EVENT_GAME_OVER;
    } else if (state.shiftLeft <= 0) {
      if (state.score >= dayGoal(state.day)) {
        state.dayClear = true;
        events |= EVENT_DAY_CLEAR;
      } else {
        state.over = true;
        events |= EVENT_GAME_OVER;
      }
    }
    return events;
  }

  reset(1);
  return { state, reset, nextDay, addIngredient, collectStation, trashPlate, selectOrder, servePlate, step, spawnOrder };
}

export { INGREDIENTS };
