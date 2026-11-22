// main.ts — the hand-in program for The Gilded Vault (Node 22, stdlib only).
//
// It gathers the entry into the output directory the grader reads:
//   - game/        the playable game, plain static files
//   - screenshots/ the four renders of the game itself
//   - dossier.json the judge's view, written by the vendored make.fun library
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same repository always writes the same bytes,
// so the grader's two runs agree.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, as the gate states them: at most 4 screenshots and
// 256 KiB each, at most 993 files and 48 MiB under game/, every game path at
// most 1000 bytes, and the dossier text at most 160 KiB.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(from, to) {
  if (!existsSync(from)) return 0;
  cpSync(from, to, { recursive: true });
  return countFiles(to);
}

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    total += statSync(full).isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

function handIn() {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const gameFiles = copyTree(join(REPO_ROOT, 'game'), join(OUTPUT_DIR, 'game'));
  mkdirSync(join(OUTPUT_DIR, 'screenshots'), { recursive: true });
  const shotFiles = copyTree(join(REPO_ROOT, 'screenshots'), join(OUTPUT_DIR, 'screenshots'));
  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_OPTIONS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log(
    `handed in ${gameFiles} game files and ${shotFiles} screenshots to ${OUTPUT_DIR} ` +
      `(dossier.json: ${dossier.length} bytes)`,
  );
}

handIn();
