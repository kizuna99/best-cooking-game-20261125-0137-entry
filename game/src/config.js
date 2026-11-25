// Sizzle & Serve — Rush Kitchen 2.5D: tuning, ingredients, recipes, day ladder.
// One job: every number and table the rest of the game reads, in one place.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIFT_SECONDS = 150;      // one day on the clock
export const MAX_STRIKES = 3;          // expired tickets before the kitchen closes
export const MAX_ORDERS = 3;           // tickets that fit on the pass at once
export const GRILL_SECONDS = 3.0;      // patty / fish sizzle time
export const CHOP_SECONDS = 2.0;       // tomato chopping time
export const BASE_POINTS_PER_ITEM = 10;

// The eight counter ingredients. `station` names the prep a raw click routes
// through before the ingredient may land on the plate: null = straight on.
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     key: '1', station: null,    color: '#e8a94e' },
  { id: 'patty',   name: 'Patty',   key: '2', station: 'grill', color: '#8a4b26' },
  { id: 'fish',    name: 'Fish',    key: '3', station: 'grill', color: '#f2f0e6' },
  { id: 'tomato',  name: 'Tomato',  key: '4', station: 'board', color: '#d93a2b' },
  { id: 'cheese',  name: 'Cheese',  key: '5', station: null,    color: '#ffc93c' },
  { id: 'lettuce', name: 'Lettuce', key: '6', station: null,    color: '#58b368' },
  { id: 'egg',     name: 'Egg',     key: '7', station: null,    color: '#fdfdf5' },
  { id: 'rice',    name: 'Rice',    key: '8', station: null,    color: '#7db3e8' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Recipes are multisets of ingredient ids; the plate must match exactly.
// `fromDay` gates the menu so later days add planning depth.
export const RECIPES = [
  { id: 'sunrise',  name: 'Sunrise Bun',     items: ['bun', 'egg', 'cheese'],                          fromDay: 1 },
  { id: 'garden',   name: 'Garden Crunch',   items: ['bun', 'patty', 'tomato', 'lettuce'],             fromDay: 1 },
  { id: 'double',   name: 'Double Sunrise',  items: ['bun', 'patty', 'patty', 'cheese', 'egg'],        fromDay: 1 },
  { id: 'fisher',   name: "Fisher's Melt",   items: ['bun', 'fish', 'cheese', 'lettuce'],              fromDay: 2 },
  { id: 'ricebowl', name: 'Rice Bowl Deluxe', items: ['rice', 'fish', 'egg', 'tomato'],                fromDay: 2 },
  { id: 'green',    name: 'Green Stack',     items: ['bun', 'lettuce', 'tomato', 'cheese', 'egg'],     fromDay: 3 },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// Day ladder: goal climbs, patience shrinks, tickets arrive faster.
export function dayConfig(day) {
  return {
    day,
    goal: 150 + (day - 1) * 90,
    patience: Math.max(26, 46 - (day - 1) * 5),
    spawnEvery: Math.max(4.5, 9 - (day - 1) * 1.2),
  };
}

export function recipesForDay(day) {
  return RECIPES.filter((r) => r.fromDay <= day);
}
