// levels.js — the three rooms of the heist. Each level is plain data: walls,
// cover that blocks sight and movement, crawl vents where the thief is hidden,
// guard patrols, sweeping cameras, loot, the getaway exit and the spawn point.
// Coordinates live in the 1280x800 canvas; the floor starts below the HUD at y=64.

import { COLORS } from './config.js';

const BORDER_TOP = { x: 0, y: 64, w: 1280, h: 26 };
const BORDER_LEFT = { x: 0, y: 64, w: 26, h: 736 };
const BORDER_RIGHT = { x: 1254, y: 64, w: 26, h: 736 };

function borderWithExit(gapX, gapW) {
  return [
    BORDER_TOP,
    BORDER_LEFT,
    BORDER_RIGHT,
    { x: 0, y: 774, w: gapX, h: 26 },
    { x: gapX + gapW, y: 774, w: 1280 - (gapX + gapW), h: 26 },
  ];
}

export const LEVELS = [
  {
    name: 'The Marble Gallery',
    subtitle: 'Room 1 of 3 — lift the Golden Ibis, then slip out the south door.',
    tint: COLORS.floorTint[0],
    parSeconds: 75,
    spawn: { x: 640, y: 720 },
    exit: { x: 520, y: 736, w: 180, h: 38, label: 'GETAWAY' },
    walls: [
      ...borderWithExit(520, 180),
      { x: 420, y: 64, w: 26, h: 220 },
      { x: 820, y: 420, w: 26, h: 354 },
      { x: 640, y: 300, w: 240, h: 26 },
    ],
    doors: [],
    cover: [
      { x: 180, y: 220, w: 90, h: 46, kind: 'case' },
      { x: 180, y: 420, w: 90, h: 46, kind: 'case' },
      { x: 560, y: 520, w: 90, h: 46, kind: 'case' },
      { x: 980, y: 200, w: 90, h: 46, kind: 'case' },
      { x: 700, y: 150, w: 56, h: 56, kind: 'statue' },
      { x: 1050, y: 520, w: 56, h: 56, kind: 'statue' },
    ],
    vents: [{ x: 36, y: 180, w: 70, h: 380 }],
    guards: [
      { waypoints: [{ x: 300, y: 360 }, { x: 900, y: 360 }], elite: false },
      { waypoints: [{ x: 1080, y: 180 }, { x: 1080, y: 640 }], elite: false },
    ],
    cameras: [{ x: 640, y: 96, base: Math.PI / 2, sweep: 0.7, speed: 0.5 }],
    loot: [
      { x: 1130, y: 130, kind: 'main', name: 'Golden Ibis', value: 500 },
      { x: 240, y: 640, kind: 'coin', name: 'Coin purse', value: 50 },
      { x: 900, y: 640, kind: 'coin', name: 'Coin purse', value: 50 },
      { x: 520, y: 140, kind: 'artifact', name: 'Jade figurine', value: 150 },
    ],
  },
  {
    name: 'The Hall of Echoes',
    subtitle: 'Room 2 of 3 — the Moon Pearl waits past the locked door or the vent.',
    tint: COLORS.floorTint[1],
    parSeconds: 95,
    spawn: { x: 640, y: 720 },
    exit: { x: 180, y: 736, w: 180, h: 38, label: 'GETAWAY' },
    walls: [
      ...borderWithExit(180, 180),
      { x: 26, y: 400, w: 274, h: 26 },
      { x: 346, y: 400, w: 180, h: 26 },
      { x: 780, y: 400, w: 474, h: 26 },
    ],
    doors: [{ x: 300, y: 400, w: 46, h: 26, locked: true }],
    cover: [
      { x: 200, y: 200, w: 90, h: 46, kind: 'case' },
      { x: 700, y: 180, w: 90, h: 46, kind: 'case' },
      { x: 1000, y: 520, w: 90, h: 46, kind: 'case' },
      { x: 400, y: 560, w: 90, h: 46, kind: 'case' },
      { x: 900, y: 300, w: 56, h: 56, kind: 'statue' },
      { x: 150, y: 600, w: 56, h: 56, kind: 'statue' },
    ],
    vents: [{ x: 500, y: 96, w: 400, h: 56 }],
    guards: [
      { waypoints: [{ x: 200, y: 300 }, { x: 600, y: 300 }], elite: false },
      { waypoints: [{ x: 900, y: 200 }, { x: 900, y: 650 }], elite: false },
      { waypoints: [{ x: 500, y: 600 }, { x: 1100, y: 600 }], elite: false },
    ],
    cameras: [
      { x: 640, y: 96, base: Math.PI / 2, sweep: 0.6, speed: 0.6 },
      { x: 1200, y: 400, base: Math.PI, sweep: 0.6, speed: 0.45 },
    ],
    loot: [
      { x: 1150, y: 140, kind: 'main', name: 'Moon Pearl', value: 750 },
      { x: 120, y: 700, kind: 'coin', name: 'Coin purse', value: 50 },
      { x: 700, y: 700, kind: 'coin', name: 'Coin purse', value: 50 },
      { x: 150, y: 150, kind: 'artifact', name: 'Ivory fan', value: 150 },
      { x: 1050, y: 330, kind: 'artifact', name: 'Bronze mirror', value: 150 },
    ],
  },
  {
    name: 'The Vault',
    subtitle: 'Room 3 of 3 — the Star of Meridia. Its glass case trips the alarm.',
    tint: COLORS.floorTint[2],
    parSeconds: 110,
    spawn: { x: 640, y: 720 },
    exit: { x: 550, y: 736, w: 180, h: 38, label: 'GETAWAY' },
    walls: [
      ...borderWithExit(550, 180),
      // The vault box, open at the bottom middle.
      { x: 440, y: 120, w: 400, h: 26 },
      { x: 440, y: 120, w: 26, h: 266 },
      { x: 814, y: 120, w: 26, h: 266 },
      { x: 440, y: 360, w: 160, h: 26 },
      { x: 680, y: 360, w: 160, h: 26 },
    ],
    doors: [{ x: 560, y: 360, w: 160, h: 22, locked: true }],
    cover: [
      { x: 150, y: 450, w: 90, h: 46, kind: 'case' },
      { x: 1040, y: 450, w: 90, h: 46, kind: 'case' },
      { x: 300, y: 550, w: 56, h: 56, kind: 'statue' },
      { x: 950, y: 550, w: 56, h: 56, kind: 'statue' },
    ],
    vents: [{ x: 36, y: 200, w: 70, h: 400 }],
    guards: [
      { waypoints: [{ x: 420, y: 440 }, { x: 860, y: 440 }], elite: true },
      { waypoints: [{ x: 200, y: 200 }, { x: 200, y: 650 }], elite: false },
      { waypoints: [{ x: 1080, y: 200 }, { x: 1080, y: 650 }], elite: false },
    ],
    cameras: [
      { x: 640, y: 96, base: Math.PI / 2, sweep: 0.5, speed: 0.8 },
      { x: 1080, y: 96, base: Math.PI / 2, sweep: 0.55, speed: 0.7 },
    ],
    loot: [
      { x: 640, y: 220, kind: 'main', name: 'Star of Meridia', value: 1000, tripsAlarm: 25 },
      { x: 120, y: 700, kind: 'coin', name: 'Coin purse', value: 50 },
      { x: 1160, y: 700, kind: 'coin', name: 'Coin purse', value: 50 },
      { x: 640, y: 600, kind: 'artifact', name: 'Ruby scarab', value: 150 },
    ],
  },
];
