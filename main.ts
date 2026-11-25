// Sizzle & Serve — Rush Kitchen 2.5D: the hand-in program (Node 22, stdlib only).
// The game itself is this repository's game/ folder: plain static files a desktop
// browser loads offline (game/index.html plus its ES modules, no library, no
// network request). This program copies game/ and screenshots/ from beside itself
// into /output and writes /output/dossier.json — the summary the judge reads —
// with the vendored make.fun library (vendor/makefun-game.ts, the kit's copy,
// unchanged).
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps below mirror the sealed gate's own limits, so the dossier this writes
// is the one the gate rebuilds and compares byte for byte: at most 4 screenshots
// of 256 KiB, at most 993 files and 48 MiB under game/, no game path over 1,000
// UTF-8 bytes, and the dossier text capped at 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
