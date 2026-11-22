// main.js — the heist itself: boots the canvas, owns the world, runs the loop.
// Screens: title → playing → caught / roomClear → win. Screenshot staging
// (?shot=cover|patrol|alarm|vault) freezes one composed frame instead.

import {
  ALARM_CHASE_RATE,
  ALARM_DECAY,
  JAMMER_SECONDS,
} from './config.js';
import { LEVELS } from './levels.js';
import { addAlarm, isLockdown, newRunState, resetRoomState, showMessage } from './state.js';
import { dropSmoke, lootInReach, newThief, stepLockpick, stepThief } from './thief.js';
import { newGuard, stepGuard } from './guard.js';
import { newCamera, stepCamera } from './camera.js';
import { draw } from './render.js';
import { attachInput, newInput, pollInput } from './input.js';
import {
  ensureAudio,
  playCaught,
  playClear,
  playClick,
  playLockpick,
  playMainLoot,
  playPickup,
  playSpotted,
  setMuted,
} from './audio.js';
import { STAGED_TIME, parseShot, stageScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const world = {
  state: newRunState(),
  level: LEVELS[0],
  levelIndex: 0,
  doors: [],
  loot: [],
  guards: [],
  cameras: [],
  thief: null,
  prompt: '',
  lastRoomScore: null,
  lockdownShown: false,
  frozen: false, // screenshot staging: render only, never simulate
  time: 0,
};

function loadLevel(index) {
  const def = LEVELS[index];
  world.levelIndex = index;
  world.level = def;
  world.doors = def.doors.map((d) => ({ ...d, open: false }));
  world.loot = def.loot.map((l) => ({ ...l, taken: false }));
  world.guards = def.guards.map((g, i) => newGuard(g, i));
  world.cameras = def.cameras.map((c, i) => newCamera(c, i));
  world.thief = newThief(def.spawn);
  world.prompt = '';
  world.lockdownShown = false;
  resetRoomState(world.state);
  world.state.screen = 'playing';
}
world.loadLevel = loadLevel;

// Rects that block movement and sight right now (closed doors included).
function solids() {
  const closed = world.doors.filter((d) => !d.open);
  return [...world.level.walls, ...world.level.cover, ...closed];
}

function scoreRoom() {
  const { state, level } = world;
  const timeBonus = Math.max(0, Math.round(level.parSeconds - state.levelTime)) * 5;
  const spottedPenalty = state.spottedCount * 25;
  return {
    lootName: level.loot.find((l) => l.kind === 'main').name,
    loot: state.roomLoot,
    time: Math.round(state.levelTime),
    par: level.parSeconds,
    spotted: state.spottedCount,
    total: state.roomLoot + timeBonus - spottedPenalty,
  };
}

function startRun() {
  world.state = newRunState();
  ensureAudio();
  loadLevel(0);
  showMessage(world.state, 'Room 1 — steal the Golden Ibis', 3);
}

function nextAfterClear() {
  if (world.levelIndex + 1 >= LEVELS.length) {
    world.state.screen = 'win';
    return;
  }
  loadLevel(world.levelIndex + 1);
  showMessage(world.state, `Room ${world.levelIndex + 1} — ${world.level.name}`, 3);
}

function takeLoot(item) {
  const { state } = world;
  item.taken = true;
  state.loot += item.value;
  state.roomLoot += item.value;
  if (item.kind === 'main') {
    state.mainTaken = true;
    playMainLoot();
    if (item.tripsAlarm) {
      addAlarm(state, item.tripsAlarm);
      showMessage(state, 'The glass case trips the alarm!', 3);
    } else {
      showMessage(state, `${item.name} secured — get to the GETAWAY door!`, 3);
    }
  } else {
    playPickup();
  }
}

function update(dt) {
  const { state } = world;
  if (state.screen !== 'playing') return;
  const input = world.input;
  pollInput(input);

  if (input.consumeMute) {
    state.muted = !state.muted;
    setMuted(state.muted);
  }
  input.consumeMute = false;

  state.levelTime += dt;
  state.totalTime += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.jamTimer > 0) state.jamTimer -= dt;
  for (const s of state.smokes) s.t -= dt;
  state.smokes = state.smokes.filter((s) => s.t > 0);

  // Tools.
  if (input.consumeSmoke && state.smoke > 0) {
    state.smokes.push(dropSmoke(world.thief));
    state.smoke -= 1;
    playClick();
  }
  input.consumeSmoke = false;
  if (input.consumeJammer && state.jammers > 0) {
    state.jamTimer = JAMMER_SECONDS;
    state.jammers -= 1;
    playClick();
    showMessage(state, 'Cameras jammed!', 2);
  }
  input.consumeJammer = false;

  // The thief.
  const solidsNow = solids();
  stepThief(world.thief, input, dt, solidsNow, world.level.vents);
  const pick = stepLockpick(world.thief, input, dt, world.doors);
  if (pick === 'picking') playLockpick();
  if (pick === 'done') {
    showMessage(state, 'Door picked — a new way through', 2.5);
    playClick();
  }

  // Loot: coins and artifacts lift on touch; the headline loot needs E.
  world.prompt = '';
  for (const item of world.loot) {
    if (item.taken) continue;
    if (!lootInReach(world.thief, item)) continue;
    if (item.kind === 'main') {
      world.prompt = `Press E to take the ${item.name}`;
      if (input.interact) takeLoot(item);
    } else {
      takeLoot(item);
    }
  }

  // Guards and cameras.
  const blockers = solidsNow;
  let anyChase = false;
  let anySeen = false;
  for (const guard of world.guards) {
    const before = guard.mode;
    const result = stepGuard(guard, world.thief, dt, solidsNow, blockers, state.smokes, isLockdown(state));
    if (guard.mode === 'chase') anyChase = true;
    if (result.seen) anySeen = true;
    if (before !== 'chase' && guard.mode === 'chase') {
      state.spottedCount += 1;
      playSpotted();
      showMessage(state, 'SPOTTED! Break line of sight!', 2);
    }
    if (result.caught) {
      state.screen = 'caught';
      state.caughtBy = 'A guard caught you';
      playCaught();
      return;
    }
  }
  const jammed = state.jamTimer > 0;
  let cameraAlarm = 0;
  for (const camera of world.cameras) {
    cameraAlarm += stepCamera(camera, world.time, world.thief, blockers, state.smokes, jammed);
  }

  // Alarm: climbs on camera spots and chases, drains when all is quiet.
  if (cameraAlarm > 0 || anyChase) {
    addAlarm(state, (cameraAlarm + (anyChase ? ALARM_CHASE_RATE : 0)) * dt);
  } else if (!anySeen) {
    addAlarm(state, -ALARM_DECAY * dt);
  }
  if (isLockdown(state) && !world.lockdownShown) {
    world.lockdownShown = true;
    showMessage(state, 'LOCKDOWN — guards are faster and sharper!', 3);
    playSpotted();
  }

  // Getaway: the exit only opens once the headline loot is bagged.
  const exit = world.level.exit;
  const t = world.thief;
  if (
    state.mainTaken &&
    t.x > exit.x && t.x < exit.x + exit.w &&
    t.y > exit.y - 10 && t.y < exit.y + exit.h + 10
  ) {
    const score = scoreRoom();
    world.lastRoomScore = score;
    state.roomScores.push(score);
    state.screen = 'roomClear';
    playClear();
  }
}

function handleMenus() {
  const { state } = world;
  const input = world.input;
  if (!input.consumeStart) return;
  input.consumeStart = false;
  ensureAudio();
  if (state.screen === 'title') startRun();
  else if (state.screen === 'caught') loadLevel(world.levelIndex);
  else if (state.screen === 'roomClear') nextAfterClear();
  else if (state.screen === 'win') startRun();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!world.frozen) {
    world.time += dt;
    handleMenus();
    update(dt);
  }
  draw(ctx, world, world.frozen ? STAGED_TIME : world.time);
  requestAnimationFrame(frame);
}

function boot() {
  world.input = newInput();
  attachInput(world.input, canvas);
  const shot = parseShot();
  if (shot) {
    loadLevel(0);
    if (stageScene(world, shot)) {
      world.frozen = true;
      document.title = `The Gilded Vault — shot ${shot}`;
    }
  } else {
    loadLevel(0);
    world.state.screen = 'title';
  }
  requestAnimationFrame(frame);
}

boot();
