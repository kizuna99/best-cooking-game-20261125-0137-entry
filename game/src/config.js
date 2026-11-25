// Sizzle & Serve — every tuning number, ingredient, recipe and screen rectangle in one place.
// The kitchen is a fixed 1280x720 logical stage; the renderer scales it to the window, so no
// rule or hit-test below depends on the real screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Seconds in one shift (one "day" of service). The big timer at the top counts this down. */
export const SHIFT_SECONDS = 150;

/** Score the kitchen must reach before the shift timer runs out to open the next day. */
export function dayGoal(day) {
  return 260 + (day - 1) * 140;
}

/** Expired tickets cost one strike each; this many strikes and the kitchen closes. */
export const MAX_STRIKES = 3;

/** How many order tickets fit on the order board at once. */
export const MAX_ORDERS = 3;

/**
 * The eight ingredients on the counter. `prep` names the station an ingredient must visit
 * before it can be plated: 'grill' (patty, fish, egg), 'board' (tomato), or null when it
 * goes straight onto the plate. `prepSeconds` is how long the station takes.
 */
export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', key: '1', prep: null, prepSeconds: 0, color: '#e8a94e', dark: '#b97a2c' },
  { id: 'patty', name: 'Patty', key: '2', prep: 'grill', prepSeconds: 3.0, color: '#7a4a21', dark: '#54300f' },
  { id: 'cheese', name: 'Cheese', key: '3', prep: null, prepSeconds: 0, color: '#ffd23e', dark: '#e0a91c' },
  { id: 'lettuce', name: 'Lettuce', key: '4', prep: null, prepSeconds: 0, color: '#5fbf4d', dark: '#3d8f31' },
  { id: 'tomato', name: 'Tomato', key: '5', prep: 'board', prepSeconds: 1.6, color: '#e5483c', dark: '#b02a20' },
  { id: 'egg', name: 'Egg', key: '6', prep: 'grill', prepSeconds: 2.2, color: '#fff3d6', dark: '#f2b63c' },
  { id: 'rice', name: 'Rice', key: '7', prep: null, prepSeconds: 0, color: '#f7f3e8', dark: '#cfc7ae' },
  { id: 'fish', name: 'Fish', key: '8', prep: 'grill', prepSeconds: 2.6, color: '#7fb6d9', dark: '#4d84ab' },
];

export function ingredientById(id) {
  for (const ingredient of INGREDIENTS) if (ingredient.id === id) return ingredient;
  return null;
}

/**
 * The menu. `items` is the exact multiset of ingredients a plate must hold to serve the
 * dish; `price` is paid in points, before the speed tip. `fromDay` is the first day the
 * dish can be ordered, so later days widen the menu instead of only speeding it up.
 */
export const RECIPES = [
  { id: 'classic', name: 'Classic Sizzle Burger', items: ['bun', 'patty', 'cheese', 'lettuce'], price: 40, fromDay: 1 },
  { id: 'garden', name: 'Garden Crunch Burger', items: ['bun', 'patty', 'tomato', 'lettuce'], price: 44, fromDay: 1 },
  { id: 'sunrise', name: 'Double Sunrise Burger', items: ['bun', 'patty', 'egg', 'cheese'], price: 48, fromDay: 1 },
  { id: 'reef', name: 'Reef Grill Rice Plate', items: ['rice', 'fish', 'tomato'], price: 42, fromDay: 2 },
  { id: 'sunnybowl', name: 'Cheesy Sunrise Bowl', items: ['rice', 'egg', 'cheese'], price: 38, fromDay: 2 },
  { id: 'harbour', name: 'Harbour Stack', items: ['bun', 'fish', 'tomato', 'lettuce'], price: 52, fromDay: 3 },
];

/** Patience of a fresh ticket, in seconds, before day pressure shortens it. */
export function orderPatience(day, random) {
  const base = Math.max(26, 46 - (day - 1) * 4);
  return base + random() * 8;
}

/** Seconds between new tickets arriving, shrinking a little each day. */
export function spawnInterval(day, random) {
  return Math.max(3.2, 6.4 - (day - 1) * 0.7) + random() * 2.2;
}

/** Kitchen layout: every clickable rectangle the input layer hit-tests, in stage units. */
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 62 },
  board: { x: 14, y: 72, w: 1252, h: 158 },
  ticket: { w: 400, h: 138, gap: 16, firstX: 26, y: 82 },
  grill: { x: 30, y: 258, w: 300, h: 196 },
  boardStation: { x: 950, y: 258, w: 300, h: 196 },
  plate: { x: 360, y: 246, w: 560, h: 218 },
  serveButton: { x: 500, y: 408, w: 180, h: 48 },
  trashButton: { x: 700, y: 408, w: 120, h: 48 },
  counter: { x: 14, y: 478, w: 1252, h: 150 },
  tile: { w: 140, h: 118, gap: 12, firstX: 38, y: 494 },
};

export const PALETTE = {
  wall: '#f3e2c7',
  wallDark: '#e3c99e',
  tile: '#fbf4e4',
  wood: '#a0662c',
  woodDark: '#7c4c1e',
  steel: '#c9ced6',
  steelDark: '#9aa1ad',
  ink: '#33241a',
  paper: '#fffdf4',
  red: '#d93b2b',
  green: '#2f9e44',
  gold: '#f2b63c',
  cream: '#fff8ea',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';
