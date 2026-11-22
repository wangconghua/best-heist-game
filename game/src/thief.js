// thief.js — the burglar. Movement, sneaking, noise, tools and interaction.
// Pure movement math: it knows the room's solid rects but never draws anything.

import {
  LOCKPICK_SECONDS,
  NOISE_RADIUS,
  SMOKE_RADIUS,
  SMOKE_SECONDS,
  THIEF_RADIUS,
  THIEF_SNEAK_SPEED,
  THIEF_SPEED,
} from './config.js';
import { circleHitsRect, clamp, pointInRect, pushCircleOutOfRect } from './geometry.js';

export function newThief(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    radius: THIEF_RADIUS,
    facing: -Math.PI / 2, // starts facing up the room
    moving: false,
    sneaking: false,
    running: false, // moving while not sneaking: audible to nearby guards
    hiddenInVent: false,
    lockpicking: null, // the door being picked, or null
    lockpickProgress: 0,
  };
}

// Step the thief one frame. `input` is {mx, my, sneak, interact} plus the
// click-to-move target; `solids` are the rects that block movement;
// `vents` are rects where the thief is hidden from every watcher.
export function stepThief(thief, input, dt, solids, vents) {
  thief.moving = false;
  thief.sneaking = !!input.sneak;
  let dx = input.mx;
  let dy = input.my;

  // Click-to-move: steer toward the target until close, then stop.
  if (!dx && !dy && input.target) {
    const tx = input.target.x - thief.x;
    const ty = input.target.y - thief.y;
    const d = Math.hypot(tx, ty);
    if (d > 8) {
      dx = tx / d;
      dy = ty / d;
    } else {
      input.target = null;
    }
  }

  const len = Math.hypot(dx, dy);
  if (len > 0) {
    const speed = thief.sneaking ? THIEF_SNEAK_SPEED : THIEF_SPEED;
    // Move in short sub-steps so a fast step can never tunnel through a wall.
    const total = speed * dt;
    const steps = Math.max(1, Math.ceil(total / 8));
    const stepX = (dx / len) * (total / steps);
    const stepY = (dy / len) * (total / steps);
    for (let i = 0; i < steps; i++) {
      thief.x += stepX;
      thief.y += stepY;
      for (const r of solids) {
        if (circleHitsRect(thief.x, thief.y, thief.radius, r)) {
          const fixed = pushCircleOutOfRect(thief.x, thief.y, thief.radius, r);
          thief.x = fixed.x;
          thief.y = fixed.y;
        }
      }
    }
    thief.x = clamp(thief.x, 26 + thief.radius, 1280 - 26 - thief.radius);
    thief.y = clamp(thief.y, 64 + 26 + thief.radius, 800 - 26 - thief.radius);
    thief.facing = Math.atan2(dy, dx);
    thief.moving = true;
    thief.running = !thief.sneaking;
  } else {
    thief.running = false;
  }

  thief.hiddenInVent = vents.some((v) => pointInRect(thief.x, thief.y, v));
  return thief;
}

// The thief makes noise only while running (not sneaking) and not hidden.
export function thiefNoiseRadius(thief) {
  if (!thief.running || thief.hiddenInVent) return 0;
  return NOISE_RADIUS;
}

// Loot within arm's reach (gathered by the interact key or by walking over it).
export function lootInReach(thief, loot) {
  return Math.hypot(loot.x - thief.x, loot.y - thief.y) < thief.radius + 26;
}

// Start or continue picking a locked door the thief stands beside.
// Returns 'done' when the pick finishes, 'picking' while it runs, null otherwise.
export function stepLockpick(thief, input, dt, doors) {
  const door = doors.find(
    (d) =>
      d.locked &&
      Math.hypot(d.x + d.w / 2 - thief.x, d.y + d.h / 2 - thief.y) < 70,
  );
  if (!door || !input.interact) {
    thief.lockpicking = null;
    thief.lockpickProgress = 0;
    return null;
  }
  thief.lockpicking = door;
  thief.lockpickProgress += dt;
  if (thief.lockpickProgress >= LOCKPICK_SECONDS) {
    door.locked = false;
    door.open = true;
    thief.lockpicking = null;
    thief.lockpickProgress = 0;
    return 'done';
  }
  return 'picking';
}

export function dropSmoke(thief) {
  return { x: thief.x, y: thief.y, r: SMOKE_RADIUS, t: SMOKE_SECONDS };
}
