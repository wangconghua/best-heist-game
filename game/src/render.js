// render.js — everything the player sees, drawn on one canvas.
// Floor and walls, vision cones, guards, cameras, loot, the getaway door,
// the HUD with its alarm meter, and the title / caught / clear / win screens.
// It never changes game state; main.js hands it a snapshot each frame.

import {
  CAMERA_HALF_ANGLE,
  CAMERA_RANGE,
  COLORS,
  FLOOR_H,
  FLOOR_Y,
  GUARD_CONE_HALF_ANGLE,
  HUD_H,
  VIEW_H,
  VIEW_W,
} from './config.js';
import { guardAlertMark, guardConeHeat } from './guard.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = level.tint;
  ctx.fillRect(0, FLOOR_Y, VIEW_W, FLOOR_H);
  const tile = 64;
  for (let y = FLOOR_Y; y < VIEW_H; y += tile) {
    for (let x = 0; x < VIEW_W; x += tile) {
      const odd = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = odd ? COLORS.floorA : COLORS.floorB;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      ctx.globalAlpha = 1;
    }
  }
  // Faint carpet runner down the middle of each room, for depth.
  ctx.fillStyle = 'rgba(120, 40, 40, 0.10)';
  ctx.fillRect(VIEW_W / 2 - 130, FLOOR_Y, 260, FLOOR_H);
}

function drawVents(ctx, vents) {
  for (const v of vents) {
    ctx.fillStyle = COLORS.vent;
    ctx.fillRect(v.x, v.y, v.w, v.h);
    ctx.strokeStyle = COLORS.ventEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(v.x + 2, v.y + 2, v.w - 4, v.h - 4);
    ctx.fillStyle = '#5a6480';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    // Keep the label on screen: a tall narrow vent is narrower than its text.
    const label = 'VENT — HIDDEN';
    const labelW = ctx.measureText(label).width;
    const labelX = Math.max(
      labelW / 2 + 6,
      Math.min(VIEW_W - labelW / 2 - 6, v.x + v.w / 2),
    );
    ctx.fillText(label, labelX, v.y + v.h / 2 + 5);
  }
}

function drawWalls(ctx, walls, doors) {
  for (const w of walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fillRect(w.x, w.y, w.w, 5);
  }
  for (const d of doors) {
    if (d.open) continue;
    ctx.fillStyle = d.locked ? '#6b4d1f' : '#4d5878';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#e8c860';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', d.x + d.w / 2, d.y + d.h / 2 + 5);
  }
}

function drawCover(ctx, cover) {
  for (const c of cover) {
    if (c.kind === 'case') {
      ctx.fillStyle = '#1a2432';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = COLORS.coverGlass;
      ctx.fillRect(c.x + 6, c.y + 6, c.w - 12, c.h - 12);
      ctx.strokeStyle = COLORS.coverTrim;
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(c.x + 12, c.y + 8, c.w - 40, 8);
    } else {
      ctx.fillStyle = COLORS.statue;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b7a9e';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLoot(ctx, loot, time) {
  for (const item of loot) {
    if (item.taken) continue;
    const pulse = 0.5 + 0.3 * Math.sin(time * 3 + item.x);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = COLORS.lootGlow;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.kind === 'main' ? 34 : 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.lootGold;
    if (item.kind === 'main') {
      // A faceted gem.
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 16);
      ctx.lineTo(item.x + 13, item.y - 4);
      ctx.lineTo(item.x + 9, item.y + 12);
      ctx.lineTo(item.x - 9, item.y + 12);
      ctx.lineTo(item.x - 13, item.y - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 16);
      ctx.lineTo(item.x + 13, item.y - 4);
      ctx.lineTo(item.x, item.y + 2);
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === 'artifact') {
      ctx.fillRect(item.x - 10, item.y - 12, 20, 24);
      ctx.fillStyle = '#8a6d1f';
      ctx.fillRect(item.x - 6, item.y - 6, 12, 12);
    } else {
      ctx.beginPath();
      ctx.arc(item.x, item.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6d1f';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', item.x, item.y + 4);
    }
    if (item.kind === 'main') {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name.toUpperCase(), item.x, item.y - 26);
    }
  }
}

function drawExit(ctx, exit, mainTaken) {
  ctx.fillStyle = mainTaken ? COLORS.exitGreen : '#2c7a4d';
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.fillStyle = '#062b16';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(mainTaken ? '◀ GETAWAY — GO! ▶' : 'GETAWAY (LOCKED: TAKE THE LOOT)', exit.x + exit.w / 2, exit.y + 31);
}

function drawSmoke(ctx, smokes) {
  for (const s of smokes) {
    ctx.fillStyle = COLORS.smoke;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s.x - s.r * 0.4, s.y + s.r * 0.25, s.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPrompt(ctx, prompt) {
  if (!prompt) return;
  ctx.save();
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(prompt).width + 28;
  const x = VIEW_W / 2 - w / 2;
  const y = VIEW_H - 92;
  ctx.fillStyle = 'rgba(5, 7, 13, 0.82)';
  ctx.fillRect(x, y, w, 32);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, 32);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(prompt, VIEW_W / 2, y + 21);
  ctx.restore();
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(time * 10) * 2 : 0;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob * 0.3);
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded body.
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(0, 0, thief.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefTrim;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Face direction: a gold mask slit.
  ctx.fillStyle = COLORS.thiefTrim;
  ctx.beginPath();
  ctx.arc(Math.cos(thief.facing) * 7, Math.sin(thief.facing) * 7, 4, 0, Math.PI * 2);
  ctx.fill();
  if (thief.sneaking) {
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, thief.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (thief.lockpicking) {
    const p = thief.lockpickProgress;
    ctx.strokeStyle = '#e8c860';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, thief.radius + 10, -Math.PI / 2, -Math.PI / 2 + (p / 2.5) * Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGuard(ctx, guard, lockdown) {
  const heat = guardConeHeat(guard);
  const range = 185 * (guard.elite ? 1.12 : 1) * (lockdown ? 1.15 : 1);
  const fill = heat > 0.6 ? COLORS.guardConeAlert : COLORS.guardCone;
  drawCone(ctx, guard.x, guard.y, guard.facing, range, GUARD_CONE_HALF_ANGLE, fill);

  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 13, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.guardBody;
  ctx.beginPath();
  ctx.arc(0, 0, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = guard.elite ? '#e8c860' : '#8fa3d9';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Cap brim toward facing.
  ctx.fillStyle = COLORS.guardCap;
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 8, Math.sin(guard.facing) * 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Suspicion ring + alert mark.
  if (guard.suspicion > 1) {
    ctx.strokeStyle = guard.mode === 'chase' ? '#ff4d4d' : '#f5b83d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius + 8, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.stroke();
  }
  const mark = guardAlertMark(guard);
  if (mark) {
    ctx.fillStyle = guard.mode === 'chase' ? '#ff4d4d' : '#f5b83d';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mark, guard.x, guard.y - 26);
  }
}

function drawCamera(ctx, camera, jammed) {
  const fill = camera.spotting ? COLORS.cameraConeAlert : COLORS.cameraCone;
  if (!jammed) drawCone(ctx, camera.x, camera.y, camera.facing, CAMERA_RANGE, CAMERA_HALF_ANGLE, fill);
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.rotate(camera.facing);
  ctx.fillStyle = jammed ? '#4a4a4a' : '#c0392b';
  ctx.fillRect(-4, -6, 22, 12);
  ctx.fillStyle = jammed ? '#888' : '#ff6b6b';
  ctx.beginPath();
  ctx.arc(18, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (camera.spotting) {
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED', camera.x, camera.y - 18);
  }
  if (jammed) {
    ctx.fillStyle = '#9aa3b5';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JAMMED', camera.x, camera.y - 18);
  }
}

function alarmColor(alarm) {
  if (alarm >= 70) return COLORS.alarmHigh;
  if (alarm >= 35) return COLORS.alarmMid;
  return COLORS.alarmLow;
}

function drawHud(ctx, world) {
  const { state, level } = world;
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#232a3d';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(level.name, 18, 27);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '15px sans-serif';
  ctx.fillText(state.mainTaken ? 'Loot secured — reach the GETAWAY door!' : `Steal the ${level.loot.find((l) => l.kind === 'main').name}`, 18, 50);

  // Alarm meter.
  const meterX = 470;
  const meterW = 300;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('ALARM', meterX, 27);
  ctx.fillStyle = '#1c2433';
  roundRect(ctx, meterX + 70, 12, meterW, 22, 6);
  ctx.fill();
  ctx.fillStyle = alarmColor(state.alarm);
  const fillW = Math.max(0, (state.alarm / 100) * meterW);
  if (fillW > 0) {
    roundRect(ctx, meterX + 70, 12, fillW, 22, 6);
    ctx.fill();
  }
  ctx.strokeStyle = '#5a6480';
  ctx.lineWidth = 1.5;
  roundRect(ctx, meterX + 70, 12, meterW, 22, 6);
  ctx.stroke();
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '14px sans-serif';
  ctx.fillText(`${Math.round(state.alarm)}%`, meterX + 70 + meterW + 10, 29);
  ctx.fillText(state.jamTimer > 0 ? 'CAMERAS JAMMED' : state.alarm >= 70 ? 'LOCKDOWN!' : '', meterX, 52);

  // Loot and tools, right side.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`LOOT $${state.loot}`, VIEW_W - 18, 27);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '15px sans-serif';
  ctx.fillText(`Smoke [1] ×${state.smoke}   Jammer [2] ×${state.jammers}   ${Math.floor(state.levelTime)}s`, VIEW_W - 18, 50);
  ctx.textAlign = 'left';
}

function drawBanner(ctx, text) {
  ctx.fillStyle = 'rgba(5, 8, 16, 0.72)';
  ctx.fillRect(0, 300, VIEW_W, 64);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, 341);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(6, 9, 18, 0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('THE GILDED VAULT', VIEW_W / 2, 210);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '22px sans-serif';
  ctx.fillText('A three-room museum heist. Outwit the guards, dodge the cameras,', VIEW_W / 2, 268);
  ctx.fillText('lift the Star of Meridia — and walk out the getaway door.', VIEW_W / 2, 300);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '18px sans-serif';
  ctx.fillText('WASD / arrows — move      Shift — sneak (silent)      E — grab / pick locks', VIEW_W / 2, 380);
  ctx.fillText('1 — smoke pellet      2 — camera jammer      Click the floor — walk there', VIEW_W / 2, 410);
  ctx.fillText('Stay out of the cones. If a guard fills with suspicion, run and break sight.', VIEW_W / 2, 440);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('Press ENTER or click to begin the heist', VIEW_W / 2, 520);
  ctx.textAlign = 'left';
}

function drawCaught(ctx, world) {
  ctx.fillStyle = 'rgba(40, 4, 8, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 58px sans-serif';
  ctx.fillText('CAUGHT!', VIEW_W / 2, 300);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '22px sans-serif';
  ctx.fillText(`${world.state.caughtBy} — the museum keeps its gold tonight.`, VIEW_W / 2, 350);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '19px sans-serif';
  ctx.fillText(`Loot kept: $${world.state.loot}   ·   Press ENTER to retry this room`, VIEW_W / 2, 400);
  ctx.textAlign = 'left';
}

function drawRoomClear(ctx, world) {
  const score = world.lastRoomScore;
  ctx.fillStyle = 'rgba(6, 18, 10, 0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.exitGreen;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText('CLEAN GETAWAY', VIEW_W / 2, 250);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '22px sans-serif';
  ctx.fillText(`${world.level.name} — ${score.lootName} secured`, VIEW_W / 2, 300);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '20px sans-serif';
  ctx.fillText(`Loot $${score.loot}   ·   Time ${score.time}s (par ${score.par}s)   ·   Spotted ${score.spotted}x`, VIEW_W / 2, 350);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`Room score: ${score.total}`, VIEW_W / 2, 410);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '19px sans-serif';
  ctx.fillText('Press ENTER for the next room', VIEW_W / 2, 470);
  ctx.textAlign = 'left';
}

function drawWin(ctx, world) {
  const total = world.state.roomScores.reduce((a, s) => a + s.total, 0);
  ctx.fillStyle = 'rgba(8, 10, 20, 0.9)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.lootGold;
  ctx.font = 'bold 60px sans-serif';
  ctx.fillText('THE STAR IS YOURS', VIEW_W / 2, 240);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '22px sans-serif';
  ctx.fillText('Three rooms, three treasures, one very quiet thief.', VIEW_W / 2, 292);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '20px sans-serif';
  world.state.roomScores.forEach((s, i) => {
    ctx.fillText(`Room ${i + 1} — ${s.lootName}: $${s.total}`, VIEW_W / 2, 350 + i * 32);
  });
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`Final score: ${total}   ·   Total loot $${world.state.loot}`, VIEW_W / 2, 480);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '19px sans-serif';
  ctx.fillText('Press ENTER to run the heist again', VIEW_W / 2, 540);
  ctx.textAlign = 'left';
}

export function draw(ctx, world, time) {
  const { state, level } = world;
  drawFloor(ctx, level);
  drawWalls(ctx, level.walls, world.doors);
  // Vents after walls: a narrow vent's label reaches past the vent's own
  // edge, and the border wall would paint over its first letter.
  drawVents(ctx, level.vents);
  drawCover(ctx, level.cover);
  drawExit(ctx, level.exit, state.mainTaken);
  drawLoot(ctx, world.loot, time);
  drawSmoke(ctx, state.smokes);
  for (const camera of world.cameras) drawCamera(ctx, camera, state.jamTimer > 0);
  for (const guard of world.guards) drawGuard(ctx, guard, state.alarm >= 100);
  if (world.thief) drawThief(ctx, world.thief, time);
  if (state.screen === 'playing') drawPrompt(ctx, world.prompt);
  drawHud(ctx, world);
  if (state.messageTimer > 0 && state.message) drawBanner(ctx, state.message);
  if (state.screen === 'title') drawTitle(ctx, world);
  else if (state.screen === 'caught') drawCaught(ctx, world);
  else if (state.screen === 'roomClear') drawRoomClear(ctx, world);
  else if (state.screen === 'win') drawWin(ctx, world);
}
