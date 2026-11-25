// Sizzle & Serve — the screenshot scenes behind ?shot=start|play|end. Each scene builds a
// real kitchen state with the world's own actions (ingredients routed through stations,
// layers stacked on the plate, tickets ticking down), so every screenshot is a frame the
// game itself can show, and the same seed always stages the same frame.

import { STEP } from './config.js';
import { SCREEN_CLEAR, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Advance the world by whole fixed steps, letting stations cook and tickets age. */
function runSteps(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let index = 0; index < steps; index += 1) world.step(STEP);
}

/**
 * Stage the busy mid-service moment the cover needs: three tickets on the board, a patty
 * sizzling on the grill, a chopped tomato already plated, and a Classic Sizzle Burger
 * mid-assembly on the pass with its bun and cheese stacked.
 */
function stagePlayScene(world) {
  world.reset(1);
  world.spawnOrder();
  runSteps(world, 2.0);
  // Grill a patty and chop a tomato the way a player would: tile first, station second.
  world.addIngredient('patty');
  world.addIngredient('tomato');
  runSteps(world, 3.2); // both stations finish (patty 3.0s, tomato 1.6s)
  world.collectStation('board'); // chopped tomato onto the plate
  world.collectStation('grill'); // grilled patty onto the plate
  world.addIngredient('bun');
  // A fish goes on the grill so the station reads mid-cook, not idle.
  world.addIngredient('fish');
  runSteps(world, 1.3); // grill mid-progress, tickets aged, shift timer visibly drained
  // Target the Garden Crunch Burger ticket: the plate (tomato, patty, bun) is that
  // dish mid-assembly, one lettuce away from a plate ready to serve.
  const gardenIndex = world.state.orders.findIndex((order) => order.recipe.id === 'garden');
  world.state.targetIndex = gardenIndex >= 0 ? gardenIndex : 0;
  world.state.combo = 2;
  world.state.score = 96;
  world.state.served = 2;
  world.state.message = '';
  world.state.messageTime = 0;
  return { screen: SCREEN_PLAY, best: 0 };
}

/** The title scene: a stocked kitchen behind the welcome panel, tickets already pinned. */
function stageStartScene(world) {
  world.reset(1);
  world.spawnOrder();
  runSteps(world, 1.0);
  world.addIngredient('fish');
  runSteps(world, 1.2);
  return { screen: SCREEN_TITLE, best: 0 };
}

/** The end scene: a cleared day — goal reached, score banked, next-day panel up. */
function stageEndScene(world) {
  const scene = stagePlayScene(world);
  void scene;
  world.state.score = 342;
  world.state.served = 7;
  world.state.bestCombo = 4;
  world.state.dayClear = true;
  return { screen: SCREEN_CLEAR, best: 342 };
}

/** Set `world` to the named scene (start, play or end; any other name is start). */
export function stageShot(name, world) {
  if (name === 'play') return stagePlayScene(world);
  if (name === 'end') return stageEndScene(world);
  return stageStartScene(world);
}
