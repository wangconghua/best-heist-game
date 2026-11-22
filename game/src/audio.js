// audio.js — tiny synthesised sound effects with plain WebAudio.
// No audio files: every blip is an oscillator, so the game ships no assets
// and makes no network request. Silent until the player first interacts.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch (err) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, seconds, type, gain, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
}

export function playPickup() {
  tone(880, 0.12, 'sine', 0.16);
  tone(1318, 0.16, 'sine', 0.12, 0.07);
}

export function playMainLoot() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.09));
}

export function playSpotted() {
  tone(220, 0.3, 'sawtooth', 0.12);
  tone(175, 0.35, 'sawtooth', 0.12, 0.12);
}

export function playCaught() {
  [392, 311, 233, 175].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.14, i * 0.14));
}

export function playClear() {
  [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, i * 0.1));
}

export function playClick() {
  tone(660, 0.06, 'square', 0.08);
}

export function playLockpick() {
  tone(1200, 0.05, 'square', 0.05);
}
