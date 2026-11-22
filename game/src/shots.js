// shots.js — staged scenes for the screenshots. A URL like ?shot=cover puts the
// game into one composed, frozen frame: the thief, the guards, their cones, a
// camera, the loot and the alarm meter all arranged at once, so every
// screenshot shows a complete heist at its best. Normal play ignores this file.

export function parseShot() {
  try {
    const name = new URLSearchParams(window.location.search).get('shot');
    return ['cover', 'patrol', 'alarm', 'vault'].includes(name) ? name : null;
  } catch (err) {
    return null;
  }
}

// A fixed clock for staged frames so the loot glow never flickers between runs.
export const STAGED_TIME = 1.7;

function placeGuard(guard, x, y, facing, suspicion, mode) {
  guard.x = x;
  guard.y = y;
  guard.facing = facing;
  guard.suspicion = suspicion;
  guard.mode = mode;
  guard.unseenTimer = 0;
  return guard;
}

// Mutates the loaded world into the named scene. Returns true when staged.
export function stageScene(world, shot) {
  const { state } = world;
  state.screen = 'playing';
  state.message = '';
  state.messageTimer = 0;

  if (shot === 'cover') {
    // The Vault, mid-heist: the thief slips toward the Star while two cones
    // cross the floor and a camera sweeps overhead. Alarm at 35%.
    world.loadLevel(2);
    state.alarm = 35;
    state.loot = 200;
    state.roomLoot = 200;
    state.smoke = 2;
    state.jammers = 1;
    world.thief.x = 640;
    world.thief.y = 470;
    world.thief.facing = -Math.PI / 2;
    world.thief.sneaking = true;
    world.loot.find((l) => l.kind === 'coin').taken = true;
    world.loot.find((l) => l.kind === 'artifact').taken = true;
    placeGuard(world.guards[0], 500, 440, 0.35, 55, 'patrol');
    placeGuard(world.guards[1], 200, 320, Math.PI / 2, 10, 'patrol');
    placeGuard(world.guards[2], 1080, 300, Math.PI * 0.85, 0, 'patrol');
    world.cameras[0].facing = Math.PI / 2 + 0.3;
    world.cameras[1].facing = Math.PI / 2;
    world.cameras[1].spotting = false;
    return true;
  }

  if (shot === 'patrol') {
    // The Marble Gallery: cones sweep the room while the thief waits behind
    // a display case, reading the patrols before moving.
    world.loadLevel(0);
    state.alarm = 8;
    state.loot = 0;
    state.roomLoot = 0;
    state.smoke = 3;
    state.jammers = 2;
    world.thief.x = 240;
    world.thief.y = 300;
    world.thief.facing = Math.PI / 2;
    world.thief.sneaking = true;
    placeGuard(world.guards[0], 520, 360, 0, 20, 'patrol');
    placeGuard(world.guards[1], 1080, 420, Math.PI / 2, 0, 'patrol');
    world.cameras[0].facing = Math.PI / 2 - 0.45;
    return true;
  }

  if (shot === 'alarm') {
    // The Hall of Echoes, alarm at 82%: a guard is on the thief's heels as
    // the Moon Pearl is carried toward the getaway door.
    world.loadLevel(1);
    state.alarm = 82;
    state.loot = 800;
    state.roomLoot = 800;
    state.mainTaken = true;
    state.smoke = 1;
    state.jammers = 0;
    world.loot.find((l) => l.kind === 'main').taken = true;
    world.loot.find((l) => l.kind === 'coin').taken = true;
    world.thief.x = 300;
    world.thief.y = 700;
    world.thief.facing = -Math.PI / 2;
    world.thief.moving = true;
    placeGuard(world.guards[0], 620, 300, Math.PI / 2, 60, 'patrol');
    placeGuard(world.guards[1], 900, 420, Math.PI, 15, 'patrol');
    placeGuard(world.guards[2], 470, 640, Math.PI * 1.15, 100, 'chase');
    world.cameras[0].facing = Math.PI / 2 + 0.5;
    world.cameras[0].spotting = true;
    world.cameras[1].facing = Math.PI;
    return true;
  }

  if (shot === 'vault') {
    // The Vault from the doorway: the Star glows on its pedestal behind two
    // crossing cones, the alarm half risen, the thief sizing up the approach.
    world.loadLevel(2);
    state.alarm = 55;
    state.loot = 150;
    state.roomLoot = 150;
    state.smoke = 3;
    state.jammers = 2;
    world.loot.find((l) => l.kind === 'artifact').taken = true;
    world.thief.x = 640;
    world.thief.y = 500;
    world.thief.facing = -Math.PI / 2;
    world.thief.sneaking = true;
    placeGuard(world.guards[0], 430, 440, 0, 30, 'patrol');
    placeGuard(world.guards[1], 200, 480, 0, 0, 'patrol');
    placeGuard(world.guards[2], 1080, 380, Math.PI, 5, 'patrol');
    world.cameras[0].facing = Math.PI / 2 - 0.2;
    world.cameras[1].facing = Math.PI / 2 + 0.35;
    return true;
  }

  return false;
}
