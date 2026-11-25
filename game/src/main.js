// Sizzle & Serve — boot and the one loop: input is read every frame, the kitchen advances
// in fixed 1/60 s steps, and the renderer paints what is there. Screens: title, play,
// paused, day clear and game over. Clicks and hotkeys become world commands (ingredients,
// stations, serve, trash, ticket targeting); world events become sounds and announcements.
//
// ?seed=N fixes the ticket pattern. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, INGREDIENTS, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_DAY_CLEAR, EVENT_EXPIRED, EVENT_GAME_OVER,
  EVENT_SERVED, EVENT_STATION_DONE, EVENT_WRONG,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { kitchenSounds } from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// A handle for automated playtests and curious players in devtools: the live world.
window.__sizzleWorld = world;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, performance.now());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.toStage);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset(1);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Service started. Build the ticket on the plate and serve it.');
  }

  function finishScreen(next) {
    screen = next;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (next === SCREEN_OVER) announce(`Kitchen closed. Score ${world.state.score}.`);
    else announce(`Day ${world.state.day} cleared with score ${world.state.score}.`);
  }

  function react(events) {
    if (events & EVENT_STATION_DONE) kitchenSounds.ding();
    if (events & EVENT_SERVED) kitchenSounds.serve();
    if (events & EVENT_WRONG) kitchenSounds.error();
    if (events & EVENT_EXPIRED) kitchenSounds.error();
    if (events & EVENT_DAY_CLEAR) { kitchenSounds.bell(); finishScreen(SCREEN_CLEAR); }
    else if (events & EVENT_GAME_OVER) { kitchenSounds.bell(); finishScreen(SCREEN_OVER); }
  }

  function runCommand(command) {
    if (command.kind === 'ticket') {
      world.selectOrder(command.index);
    } else if (command.kind === 'tile') {
      const ingredient = INGREDIENTS[command.index];
      if (!ingredient) return;
      const result = world.addIngredient(ingredient.id);
      if (result === 'grill') kitchenSounds.sizzle();
      else if (result === 'board') kitchenSounds.chop();
      else if (result === 'plate') kitchenSounds.plate();
      else kitchenSounds.error();
    } else if (command.kind === 'grill') {
      if (world.collectStation('grill')) kitchenSounds.plate();
    } else if (command.kind === 'board') {
      if (world.collectStation('board')) kitchenSounds.plate();
    } else if (command.kind === 'serve') {
      react(world.servePlate());
    } else if (command.kind === 'trash') {
      world.trashPlate();
      kitchenSounds.chop();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_CLEAR) { world.nextDay(); screen = SCREEN_PLAY; announce(`Day ${world.state.day}. Service started.`); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      for (const command of input.takeCommands()) runCommand(command);
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        react(world.step(STEP));
        accumulator -= STEP;
      }
    } else {
      input.takeCommands();
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, now);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start service.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
