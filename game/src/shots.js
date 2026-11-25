// Deterministic screenshot scenes (?shot=start|play|rush|end&seed=7).
// One job: stage a frozen, representative frame of the real game so the
// screenshots are honest renders of the shipped code — same world, same
// renderer, just arranged mid-service instead of played live.

import { SCREEN, startDay } from './world.js';

function ticket(world, recipeId, patience, patienceMax, targeted) {
  world.orders.push({ id: world.nextOrderId++, recipeId, patience, patienceMax, targeted });
}

export function stageShot(world, name) {
  world.elapsed = 2.4; // fixed steam/bob phase
  if (name === 'start') {
    startDay(world, 1);
    world.screen = SCREEN.TITLE;
    return;
  }
  if (name === 'end') {
    startDay(world, 1);
    world.score = 236; world.served = 5; world.lost = 1;
    world.bestCombo = 3; world.combo = 0;
    world.screen = SCREEN.END; world.endReason = 'goal'; world.dayCleared = true;
    return;
  }
  // 'play' (cover) and 'rush': mid-service, dish mid-assembly, plate ready.
  startDay(world, 1);
  world.orders = [];
  if (name === 'rush') {
    world.score = 248; world.combo = 3; world.bestCombo = 3; world.served = 4;
    world.timeLeft = 107;
    ticket(world, 'fisher', 21, 46, true);
    ticket(world, 'double', 33, 46, false);
    ticket(world, 'sunrise', 40, 46, false);
    world.plate = ['bun', 'fish', 'cheese', 'lettuce']; // Fisher's Melt, ready to serve
    world.grill = { ingredientId: 'patty', t: 3, total: 3, ready: true };
    world.board = { ingredientId: 'tomato', t: 1.1, total: 2, ready: false };
    world.chefStationX = 0.9;
    world.toast = { text: "Fisher's Melt ready — hit SERVE!", t: 99 };
  } else {
    world.score = 136; world.combo = 2; world.bestCombo = 2; world.served = 2;
    world.timeLeft = 144;
    ticket(world, 'garden', 30, 46, true);
    ticket(world, 'fisher', 38, 46, false);
    ticket(world, 'sunrise', 44, 46, false);
    world.plate = ['bun', 'patty', 'tomato']; // Garden Crunch mid-assembly (lettuce missing)
    world.grill = { ingredientId: 'fish', t: 1.8, total: 3, ready: false };
    world.board = { ingredientId: 'tomato', t: 2, total: 2, ready: true };
    world.chefStationX = 0.48;
    world.toast = { text: 'Tomato chopped — click the board!', t: 99 };
  }
  world.screen = SCREEN.PLAY;
}
