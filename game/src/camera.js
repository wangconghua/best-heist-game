// camera.js — the wall-mounted security cameras. Each sweeps its cone back and
// forth; while the thief stands in a live cone the alarm climbs fast.
// A jammer blacks every camera out for a few seconds; smoke blinds them too.

import { CAMERA_ALARM_RATE, CAMERA_HALF_ANGLE, CAMERA_RANGE } from './config.js';
import { inVisionCone, pointInAnyCircle } from './geometry.js';

export function newCamera(def, index) {
  return {
    index,
    x: def.x,
    y: def.y,
    base: def.base, // centre of the sweep, radians
    sweep: def.sweep, // how far each side of base it swings, radians
    speed: def.speed, // radians per second
    phase: index * 1.3, // staggers the cameras so they never sync up
    facing: def.base,
    spotting: false, // the thief is in this cone right now
  };
}

export function stepCamera(camera, time, thief, blockers, smokes, jammed) {
  camera.facing =
    camera.base + Math.sin(time * camera.speed + camera.phase) * camera.sweep;
  camera.spotting = false;
  if (jammed) return 0;
  if (thief.hiddenInVent) return 0;
  if (pointInAnyCircle(thief.x, thief.y, smokes)) return 0;
  if (pointInAnyCircle(camera.x, camera.y, smokes)) return 0;
  const seen = inVisionCone(
    camera.x,
    camera.y,
    camera.facing,
    CAMERA_RANGE,
    CAMERA_HALF_ANGLE,
    thief.x,
    thief.y,
    blockers,
  );
  camera.spotting = seen;
  return seen ? CAMERA_ALARM_RATE : 0;
}
