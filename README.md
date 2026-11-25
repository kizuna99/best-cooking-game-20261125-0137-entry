[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/kizuna99/best-cooking-game-20261125-0137-entry/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/kizuna99/best-cooking-game-20261125-0137-entry/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Sizzle & Serve — Rush Kitchen 2.5D

A timed order-fulfilment cooking game in an **isometric 2.5D kitchen**: diamond
floor tiles, counters extruded into boxes with front faces and drop shadows, a
back wall with a window, jar shelf, hanging pans and a wall clock, and a chef
who works the room between the back counter and the island — everything
depth-sorted so the kitchen reads in true 2.5D.

Tickets land on **THE PASS** (the order board on the right). Each dish is a
recipe of ingredients: click the ingredient bins on the island counter to build
the dish on the plate — patties and fish must first sizzle on the **grill**,
tomatoes must be chopped at the **board** (stations show progress bars and a
READY! tag). Click a ticket to target it, then hit **SERVE** before its
patience bar runs out. Fast serves earn tip bonuses and build a combo
multiplier; expired tickets cost a strike, and 3 strikes close the kitchen. A
150-second shift timer and a score goal per day; clear the goal and the next
day is faster, with new recipes on the menu.

**Controls:** mouse clicks, or keys `1–8` ingredients, `G` collect grill,
`B` collect board, `Enter` serve, `Backspace` trash the plate, `P` pause,
`Space` start / next day.

## Run it

The game is plain static files — no build step, no network. Serve `game/`
with any static server, e.g.:

```sh
node serve.ts   # then open http://localhost:8080
```

## Hand-in

`node main.ts` copies `game/` and `screenshots/` to `/output` (or
`$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` via the vendored make.fun
library in `vendor/makefun-game.ts`.

## Layout

- `game/src/config.js` — tuning, ingredients, recipes, day ladder
- `game/src/random.js` — seeded RNG (mulberry32)
- `game/src/audio.js` — tiny WebAudio kitchen sounds (chop, ding, serve, error)
- `game/src/world.js` — game state & rules: orders, stations, plate, scoring, days
- `game/src/render.js` — the isometric 2.5D canvas renderer: wall, floor slab, counters, chef, tickets, HUD
- `game/src/input.js` — mouse hit-testing + keyboard hotkeys
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|rush|end`)
- `game/src/main.js` — boot + fixed-step loop + screens

Original idea, art and names. MIT licensed — see `LICENSE`.
