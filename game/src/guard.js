// guard.js — the museum guards. They walk a patrol loop, watch a vision cone,
// grow suspicious when they see the thief, give chase when they are sure, and
// give up and go back to patrol when the thief stays out of sight.
// A guard never sees through walls, cover, smoke or a vent.

import {
  GUARD_CATCH_DISTANCE,
  GUARD_CHASE_SPEED,
  GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE,
  GUARD_LOSE_SIGHT_SECONDS,
  GUARD_NOISE_RATE,
  GUARD_RADIUS,
  GUARD_SPEED,
  GUARD_SUSPICION_DECAY,
  GUARD_SUSPICION_RATE,
} from './config.js';
import {
  angleTo,
  circleHitsRect,
  dist,
  inVisionCone,
  pointInAnyCircle,
  pushCircleOutOfRect,
} from './geometry.js';

export function newGuard(def, index) {
  const start = def.waypoints[0];
  return {
    index,
    x: start.x,
    y: start.y,
    radius: GUARD_RADIUS,
    waypoints: def.waypoints,
    leg: 0, // which waypoint the guard is walking toward
    facing: 0,
    suspicion: 0, // 0..100; 100 means the guard is sure and chases
    mode: 'patrol', // patrol | chase | return
    unseenTimer: 0,
    chaseTarget: null,
    elite: !!def.elite,
  };
}

function guardSpeed(guard, lockdown) {
  let speed = guard.mode === 'chase' ? GUARD_CHASE_SPEED : GUARD_SPEED;
  if (guard.elite) speed *= 1.18;
  if (lockdown) speed *= 1.25;
  return speed;
}

function guardConeRange(guard, lockdown) {
  return GUARD_CONE_RANGE * (guard.elite ? 1.12 : 1) * (lockdown ? 1.15 : 1);
}

// Can this guard see the thief right now?
export function guardSeesThief(guard, thief, blockers, smokes, lockdown) {
  if (thief.hiddenInVent) return false;
  if (pointInAnyCircle(guard.x, guard.y, smokes)) return false;
  if (pointInAnyCircle(thief.x, thief.y, smokes)) return false;
  return inVisionCone(
    guard.x,
    guard.y,
    guard.facing,
    guardConeRange(guard, lockdown),
    GUARD_CONE_HALF_ANGLE,
    thief.x,
    thief.y,
    blockers,
  );
}

export function stepGuard(guard, thief, dt, solids, blockers, smokes, lockdown) {
  const seen = guardSeesThief(guard, thief, blockers, smokes, lockdown);
  const noise = !thief.hiddenInVent && thief.running
    ? dist(guard.x, guard.y, thief.x, thief.y)
    : Infinity;

  if (seen) {
    guard.suspicion = Math.min(100, guard.suspicion + GUARD_SUSPICION_RATE * dt);
    guard.unseenTimer = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD_SUSPICION_DECAY * dt);
    guard.unseenTimer += dt;
  }
  // Running footsteps nearby make a guard uneasy even outside the cone.
  if (noise < 115 && !seen) {
    guard.suspicion = Math.min(100, guard.suspicion + GUARD_NOISE_RATE * dt);
  }

  if (guard.suspicion >= 100 && guard.mode !== 'chase') {
    guard.mode = 'chase';
    guard.chaseTarget = { x: thief.x, y: thief.y };
  }

  const speed = guardSpeed(guard, lockdown);
  let tx = null;
  let ty = null;

  if (guard.mode === 'chase') {
    if (seen) {
      guard.chaseTarget = { x: thief.x, y: thief.y };
      guard.unseenTimer = 0;
    }
    if (guard.unseenTimer > GUARD_LOSE_SIGHT_SECONDS) {
      guard.mode = 'return';
      guard.suspicion = 40;
    } else if (guard.chaseTarget) {
      tx = guard.chaseTarget.x;
      ty = guard.chaseTarget.y;
    }
  } else if (guard.mode === 'return') {
    const home = guard.waypoints[guard.leg];
    tx = home.x;
    ty = home.y;
    if (dist(guard.x, guard.y, tx, ty) < 12) guard.mode = 'patrol';
  } else {
    const next = guard.waypoints[(guard.leg + 1) % guard.waypoints.length];
    tx = next.x;
    ty = next.y;
    if (dist(guard.x, guard.y, tx, ty) < 10) {
      guard.leg = (guard.leg + 1) % guard.waypoints.length;
    }
  }

  if (tx !== null && ty !== null) {
    const d = dist(guard.x, guard.y, tx, ty);
    if (d > 1) {
      const step = Math.min(d, speed * dt);
      guard.x += ((tx - guard.x) / d) * step;
      guard.y += ((ty - guard.y) / d) * step;
      guard.facing = angleTo(guard.x, guard.y, tx, ty);
      for (const r of solids) {
        if (circleHitsRect(guard.x, guard.y, guard.radius, r)) {
          const fixed = pushCircleOutOfRect(guard.x, guard.y, guard.radius, r);
          guard.x = fixed.x;
          guard.y = fixed.y;
        }
      }
    }
  }

  // While chasing, the guard keeps facing the thief so the cone tracks.
  if (guard.mode === 'chase' && seen) {
    guard.facing = angleTo(guard.x, guard.y, thief.x, thief.y);
  }

  return { seen, caught: guard.mode === 'chase' && dist(guard.x, guard.y, thief.x, thief.y) < GUARD_CATCH_DISTANCE };
}

// Suspicion shown over the guard's head: '!' when sure, '?' when uneasy.
export function guardAlertMark(guard) {
  if (guard.mode === 'chase') return '!';
  if (guard.suspicion > 35) return '?';
  return '';
}

// How wide the guard's cone looks when the player is nearly spotted.
export function guardConeHeat(guard) {
  return guard.mode === 'chase' ? 1 : guard.suspicion / 100;
}
