// config.js — every tuning number for The Gilded Vault in one place.
// Nothing here knows about the DOM or the canvas; the other modules read it.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 64;
export const FLOOR_Y = HUD_H;
export const FLOOR_H = VIEW_H - HUD_H;

// Player movement.
export const THIEF_SPEED = 205; // px per second, walking
export const THIEF_SNEAK_SPEED = 118; // px per second, sneaking (silent)
export const THIEF_RADIUS = 14;
export const NOISE_RADIUS = 115; // running this close to a guard raises suspicion

// Guards.
export const GUARD_SPEED = 82; // patrol speed
export const GUARD_CHASE_SPEED = 168; // chase speed
export const GUARD_RADIUS = 15;
export const GUARD_CONE_RANGE = 185;
export const GUARD_CONE_HALF_ANGLE = 0.61; // radians, ~35 degrees each side
export const GUARD_SUSPICION_RATE = 62; // per second while the thief is seen
export const GUARD_SUSPICION_DECAY = 26; // per second while unseen
export const GUARD_NOISE_RATE = 16; // per second while the thief runs nearby
export const GUARD_LOSE_SIGHT_SECONDS = 3.0; // chase ends after this long unseen
export const GUARD_CATCH_DISTANCE = 27; // touching the thief ends the run

// Cameras.
export const CAMERA_RANGE = 215;
export const CAMERA_HALF_ANGLE = 0.5; // radians
export const CAMERA_ALARM_RATE = 24; // alarm points per second while seen

// Alarm meter 0..100.
export const ALARM_DECAY = 1.6; // per second while nobody sees the thief
export const ALARM_CHASE_RATE = 10; // per second while any guard is chasing
export const ALARM_LOCKDOWN = 100; // at this value guards get faster and wider

// Tools.
export const SMOKE_START_COUNT = 3;
export const SMOKE_RADIUS = 78;
export const SMOKE_SECONDS = 5;
export const JAMMER_START_COUNT = 2;
export const JAMMER_SECONDS = 6;
export const LOCKPICK_SECONDS = 2.5; // channel time to open a locked door

// Loot values in dollars.
export const LOOT_MAIN_VALUE = [500, 750, 1000];
export const LOOT_COIN_VALUE = 50;
export const LOOT_ARTIFACT_VALUE = 150;

// Palette: a night museum — dark floors, warm gold loot, red danger.
export const COLORS = {
  floorA: '#1c2433',
  floorB: '#202a3c',
  floorTint: ['#141b29', '#12211f', '#241419'],
  wall: '#3a4358',
  wallTop: '#5a6480',
  coverGlass: '#2e4a5e',
  coverTrim: '#c9a227',
  statue: '#4d5878',
  vent: '#0e1420',
  ventEdge: '#39415a',
  guardBody: '#2b3a67',
  guardCap: '#1d2745',
  guardCone: 'rgba(255, 184, 64, 0.20)',
  guardConeAlert: 'rgba(255, 64, 64, 0.30)',
  cameraCone: 'rgba(255, 70, 70, 0.16)',
  cameraConeAlert: 'rgba(255, 40, 40, 0.34)',
  thief: '#0f0f14',
  thiefTrim: '#e8c860',
  lootGlow: 'rgba(232, 200, 96, 0.35)',
  lootGold: '#e8c860',
  exitGreen: '#3ddc84',
  smoke: 'rgba(200, 205, 215, 0.35)',
  hudBg: '#0b0e16',
  hudText: '#e8e4d8',
  hudDim: '#9aa3b5',
  alarmLow: '#3ddc84',
  alarmMid: '#f5b83d',
  alarmHigh: '#ff4d4d',
};
