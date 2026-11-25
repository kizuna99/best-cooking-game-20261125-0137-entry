// Boot + fixed-step loop + screen flow for Sizzle & Serve — Rush Kitchen 2.5D.
// One job: own the canvas, the clock, and the wiring between input, world,
// audio and render. With ?shot=<scene> the loop freezes on a staged frame
// (see shots.js) so screenshots are deterministic real renders.

import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, update, SCREEN } from './world.js';
import { draw } from './render.js';
import { handleClick, handleKey } from './input.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
const world = createWorld(seed);
const shot = params.get('shot');
if (shot) stageShot(world, shot);

function fit() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', fit);
fit();

function emit(event) {
  if (!event) return;
  world.lastEvent = event;
  switch (event) {
    case 'EVENT_CHOP': sfx.chop(); break;
    case 'EVENT_SIZZLE': sfx.sizzle(); break;
    case 'EVENT_POP': sfx.pop(); break;
    case 'EVENT_SERVED': sfx.serve(); break;
    case 'EVENT_ERROR': case 'EVENT_BUSY': sfx.error(); break;
    case 'EVENT_STRIKE': sfx.strike(); break;
    case 'EVENT_DAY': sfx.day(); break;
    case 'EVENT_TRASH': sfx.chop(); break;
  }
  if (status) {
    status.textContent = world.toast ? world.toast.text
      : `Day ${world.day}, score ${world.score}, ${world.orders.length} tickets on the pass.`;
  }
}

function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (VIEW_W / r.width),
    y: (e.clientY - r.top) * (VIEW_H / r.height),
  };
}

canvas.addEventListener('pointerdown', (e) => handleClick(world, toGame(e), emit));
addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Backspace') e.preventDefault();
  handleKey(world, e.key, emit);
});

let last = performance.now();
let acc = 0;
const STEP = 1000 / 60;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = now - last;
  last = now;
  if (dt > 250) dt = 250;
  acc += dt;
  while (acc >= STEP) {
    acc -= STEP;
    if (!shot) {
      const before = world.lastEvent;
      update(world, STEP / 1000);
      if (world.lastEvent && world.lastEvent !== before) {
        if (world.lastEvent === 'EVENT_DING') sfx.ding();
        if (world.lastEvent === 'EVENT_STRIKE') sfx.strike();
        if (world.lastEvent === 'EVENT_TICK') sfx.tick();
        world.lastEvent = null;
      }
    }
  }
  // scale the fixed 1280×720 stage to the window, letterboxed
  const cw = canvas.width, ch = canvas.height;
  const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#241a10';
  ctx.fillRect(0, 0, cw, ch);
  ctx.setTransform(scale, 0, 0, scale, (cw - VIEW_W * scale) / 2, (ch - VIEW_H * scale) / 2);
  draw(ctx, world);
}
requestAnimationFrame(frame);

export { world, SCREEN };
