[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137.svg?label=rank)](https://github.com/kizuna99/best-cooking-game-20261125-0137-entry)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137.svg?label=reward)](https://github.com/kizuna99/best-cooking-game-20261125-0137-entry)

# Sizzle & Serve — Rush Kitchen

An original, timed order-fulfilment cooking game for the make.fun bounty
**best-cooking-game-20261125-0137** ("Make the best cooking game", $250 pot,
Top 10 paid). Built fresh for this bounty in `kizuna99/best-cooking-game-20261125-0137-entry`.

## The game

Service is about to start and the tickets are already coming in. Each ticket on
the **order board** names a dish — a Classic Sizzle Burger, a Garden Crunch
Burger, a Reef Grill Rice Plate — and shows the exact ingredients it needs, its
points, and a patience bar that drains in real time.

You run the whole kitchen:

- **Ingredient counter** (bottom): eight ingredients — bun, patty, cheese,
  lettuce, tomato, egg, rice, fish. Click one (or press its key, 1–8) to use it.
- **Grill** (left): patties, fish and eggs must sizzle here first. Watch the
  progress bar; when it dings **READY**, click the grill to plate it.
- **Chopping board** (right): tomatoes must be chopped here before plating.
- **The pass** (centre): your plate fills layer by layer, exactly as the dish
  will be served. Click a ticket to target it, then hit **SERVE** — or **Trash**
  to start the plate over.

Scoring rewards speed and planning: a served dish pays its price plus a **tip**
of up to +50% scaled by the patience left on the ticket, multiplied by a
**combo** bonus (×1.1, ×1.2, … up to ×2) for consecutive good serves. Route
ingredients through the stations *while* you plate the instant ones, or the
rush will bury you. Let a ticket's patience hit zero and the customer walks
out: three strikes and the kitchen closes.

Each **day** is a 150-second shift with a score goal, shown beside the big
shift timer. Clear the goal to open the next day — new recipes join the menu,
patience shrinks, and tickets arrive faster.

## How to play

| Action | Mouse | Keyboard |
| --- | --- | --- |
| Use an ingredient | Click its counter tile | `1`–`8` |
| Plate a finished grill item | Click the grill | `G` |
| Plate a finished chopped item | Click the chopping board | `B` |
| Target a ticket | Click the ticket | — |
| Serve the plate | Click **SERVE** | `Enter` |
| Trash the plate | Click **Trash** | `Backspace` |
| Pause | — | `P` |
| Start / next day / restart | Click | `Space` |

## Running it

The game is plain static files under `game/` — no build step, no network.
Serve it with the included development server (Node 22):

```sh
node serve.ts            # then open http://localhost:8080
```

or any static file server pointed at `game/`.

## Handing it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — the page and its one canvas
- `game/src/config.js` — tuning, ingredients, recipes, kitchen layout
- `game/src/world.js` — rules and state: orders, stations, plate, scoring, days
- `game/src/render.js` — all canvas drawing: kitchen, tickets, food, HUD, panels
- `game/src/input.js` — mouse hit-testing and keyboard hotkeys
- `game/src/audio.js` — synthesised WebAudio kitchen sounds (no audio files)
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|end`)
- `game/src/random.js` — seeded RNG so scenes and shifts are repeatable
- `game/src/main.js` — boot and the fixed-step game loop
- `screenshots/` — real renders of the game: start, mid-service, day cleared

## License

MIT — see `LICENSE` (SPDX-License-Identifier: MIT).
