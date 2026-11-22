// geometry.js — small pure helpers: rectangles, circles, segments, angles.
// Every other module uses these; nothing here touches the DOM or the canvas,
// so the vision and collision math can be unit-tested in plain Node.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Shortest distance between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

// True when point (px, py) lies inside rect {x, y, w, h} (edges count).
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// True when a circle (cx, cy, radius) overlaps rect r.
export function circleHitsRect(cx, cy, radius, r) {
  const nx = clamp(cx, r.x, r.x + r.w);
  const ny = clamp(cy, r.y, r.y + r.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

// Move a circle out of a rect it overlaps; returns the corrected position.
export function pushCircleOutOfRect(cx, cy, radius, r) {
  const nx = clamp(cx, r.x, r.x + r.w);
  const ny = clamp(cy, r.y, r.y + r.h);
  let dx = cx - nx;
  let dy = cy - ny;
  let d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return { x: cx, y: cy };
  if (d2 === 0) {
    // Centre is inside the rect: push out along the smallest exit.
    const left = cx - r.x;
    const right = r.x + r.w - cx;
    const top = cy - r.y;
    const bottom = r.y + r.h - cy;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: r.x - radius, y: cy };
    if (m === right) return { x: r.x + r.w + radius, y: cy };
    if (m === top) return { x: cx, y: r.y - radius };
    return { x: cx, y: r.y + r.h + radius };
  }
  const d = Math.sqrt(d2);
  dx /= d;
  dy /= d;
  return { x: nx + dx * radius, y: ny + dy * radius };
}

// Segment (x1,y1)-(x2,y2) against rect r: true when the segment hits the rect.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = side(x3, y3, x4, y4, x1, y1);
  const d2 = side(x3, y3, x4, y4, x2, y2);
  const d3 = side(x1, y1, x2, y2, x3, y3);
  const d4 = side(x1, y1, x2, y2, x4, y4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  // Touching cases: an endpoint sitting exactly on the other segment counts
  // (a sight line grazing a wall corner is blocked).
  if (d1 === 0 && onSegment(x3, y3, x4, y4, x1, y1)) return true;
  if (d2 === 0 && onSegment(x3, y3, x4, y4, x2, y2)) return true;
  if (d3 === 0 && onSegment(x1, y1, x2, y2, x3, y3)) return true;
  if (d4 === 0 && onSegment(x1, y1, x2, y2, x4, y4)) return true;
  return false;
}

function onSegment(ax, ay, bx, by, px, py) {
  return px >= Math.min(ax, bx) && px <= Math.max(ax, bx)
    && py >= Math.min(ay, by) && py <= Math.max(ay, by);
}

function side(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

// Line of sight: true when no rect in blockers stands between the two points.
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (const r of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}

// True when (tx, ty) sits inside a vision cone from (ox, oy) facing `facing`,
// with the given range and half-angle, and nothing blocks the view.
export function inVisionCone(ox, oy, facing, range, halfAngle, tx, ty, blockers) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  if (d < 1) return true;
  if (Math.abs(angleDiff(angleTo(ox, oy, tx, ty), facing)) > halfAngle) return false;
  return hasLineOfSight(ox, oy, tx, ty, blockers);
}

// True when point (px, py) is inside any circle in `circles` [{x, y, r}].
export function pointInAnyCircle(px, py, circles) {
  for (const c of circles) {
    if (dist(px, py, c.x, c.y) <= c.r) return true;
  }
  return false;
}
