// state.js — the single mutable record of a heist run.
// main.js owns one of these; guards, cameras and the renderer only read it
// or ask main.js to change it through the small helpers below.

import {
  ALARM_LOCKDOWN,
  JAMMER_START_COUNT,
  SMOKE_START_COUNT,
} from './config.js';

export function newRunState() {
  return {
    screen: 'title', // title | playing | caught | roomClear | win
    levelIndex: 0,
    levelTime: 0, // seconds spent in the current room
    totalTime: 0,
    alarm: 0, // 0..100
    loot: 0, // dollars grabbed this run
    roomLoot: 0, // dollars grabbed in the current room
    mainTaken: false, // the room's headline loot is in the bag
    smoke: SMOKE_START_COUNT,
    jammers: JAMMER_START_COUNT,
    jamTimer: 0, // seconds of camera blackout left
    spottedCount: 0, // times a guard fully spotted the thief
    smokes: [], // active smoke clouds {x, y, r, t}
    message: '', // centre-screen banner text
    messageTimer: 0,
    caughtBy: '',
    roomScores: [], // per-room score breakdowns for the win screen
    muted: false,
  };
}

export function resetRoomState(state) {
  state.levelTime = 0;
  state.alarm = 0;
  state.roomLoot = 0;
  state.mainTaken = false;
  state.smoke = SMOKE_START_COUNT;
  state.jammers = JAMMER_START_COUNT;
  state.jamTimer = 0;
  state.smokes = [];
  state.message = '';
  state.messageTimer = 0;
  state.caughtBy = '';
}

export function addAlarm(state, amount) {
  state.alarm = Math.max(0, Math.min(ALARM_LOCKDOWN, state.alarm + amount));
}

export function showMessage(state, text, seconds = 2.5) {
  state.message = text;
  state.messageTimer = seconds;
}

export function isLockdown(state) {
  return state.alarm >= ALARM_LOCKDOWN;
}
