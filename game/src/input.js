// input.js — keyboard and mouse, turned into one small intent object.
// WASD or arrows move, Shift sneaks, E interacts, 1 drops smoke, 2 fires the
// jammer, M mutes, Enter or click starts. Clicking the floor sets a move target.

export function newInput() {
  return {
    mx: 0, // movement x, -1..1
    my: 0, // movement y, -1..1
    sneak: false,
    interact: false,
    target: null, // click-to-move destination {x, y} in canvas space
    consumeSmoke: false, // edge-triggered: set on keydown, read once per frame
    consumeJammer: false,
    consumeMute: false,
    consumeStart: false,
  };
}

const KEYS = new Set();

export function attachInput(input, canvas) {
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    KEYS.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (e.key === '1') input.consumeSmoke = true;
    if (e.key === '2') input.consumeJammer = true;
    if (e.key === 'm' || e.key === 'M') input.consumeMute = true;
    if (e.key === 'Enter') input.consumeStart = true;
  };
  const up = (e) => {
    KEYS.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => KEYS.clear());

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.target = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    input.consumeStart = true; // a click also starts the game from a menu
  });
}

export function pollInput(input) {
  const left = KEYS.has('a') || KEYS.has('ArrowLeft');
  const right = KEYS.has('d') || KEYS.has('ArrowRight');
  const upKey = KEYS.has('w') || KEYS.has('ArrowUp');
  const downKey = KEYS.has('s') || KEYS.has('ArrowDown');
  input.mx = (right ? 1 : 0) - (left ? 1 : 0);
  input.my = (downKey ? 1 : 0) - (upKey ? 1 : 0);
  input.sneak = KEYS.has('Shift');
  input.interact = KEYS.has('e') || KEYS.has('E');
  // A fresh keypress cancels click-to-move so the keys always win.
  if (input.mx || input.my) input.target = null;
}
