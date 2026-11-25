// Sizzle & Serve — mouse and keyboard input. Clicks are translated from window pixels into
// the 1280x720 stage and hit-tested against the layout rectangles from config.js, so the
// same zones the renderer draws are the zones the player clicks. One-shot actions (serve,
// trash, pause, confirm) are queued as flags and taken once by the loop; ingredient and
// station clicks are queued as commands, so a click between frames is never lost.

import { INGREDIENTS, LAYOUT } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function ticketRect(index) {
  return {
    x: LAYOUT.ticket.firstX + index * (LAYOUT.ticket.w + LAYOUT.ticket.gap),
    y: LAYOUT.ticket.y,
    w: LAYOUT.ticket.w,
    h: LAYOUT.ticket.h,
  };
}

export function tileRect(index) {
  return {
    x: LAYOUT.tile.firstX + index * (LAYOUT.tile.w + LAYOUT.tile.gap),
    y: LAYOUT.tile.y,
    w: LAYOUT.tile.w,
    h: LAYOUT.tile.h,
  };
}

function inside(point, rect) {
  return point.x >= rect.x && point.x < rect.x + rect.w && point.y >= rect.y && point.y < rect.y + rect.h;
}

/** What a stage point hits: { kind: 'ticket'|'tile'|'grill'|'board'|'serve'|'trash', index? } or null. */
export function hitTest(point) {
  for (let index = 0; index < 3; index += 1) {
    if (inside(point, ticketRect(index))) return { kind: 'ticket', index };
  }
  if (inside(point, LAYOUT.serveButton)) return { kind: 'serve' };
  if (inside(point, LAYOUT.trashButton)) return { kind: 'trash' };
  if (inside(point, LAYOUT.grill)) return { kind: 'grill' };
  if (inside(point, LAYOUT.boardStation)) return { kind: 'board' };
  for (let index = 0; index < INGREDIENTS.length; index += 1) {
    if (inside(point, tileRect(index))) return { kind: 'tile', index };
  }
  return null;
}

export function createInput(canvas, toStage) {
  let actions = 0;
  const commands = [];

  canvas.addEventListener('pointerdown', (event) => {
    const point = toStage(event.clientX, event.clientY);
    if (point === null) return;
    const hit = hitTest(point);
    if (hit === null) {
      actions |= ACTION_CONFIRM;
      return;
    }
    commands.push(hit);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const tileIndex = INGREDIENTS.findIndex((ingredient) => `Digit${ingredient.key}` === event.code || `Numpad${ingredient.key}` === event.code);
    if (tileIndex >= 0) {
      commands.push({ kind: 'tile', index: tileIndex });
    } else if (event.code === 'Enter') {
      commands.push({ kind: 'serve' });
    } else if (event.code === 'Backspace' || event.code === 'Delete') {
      commands.push({ kind: 'trash' });
    } else if (event.code === 'KeyG') {
      commands.push({ kind: 'grill' });
    } else if (event.code === 'KeyB') {
      commands.push({ kind: 'board' });
    } else if (event.code === 'Space') {
      actions |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });

  return {
    /** The queued click/keyboard commands since the last call. */
    takeCommands() {
      return commands.splice(0, commands.length);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
