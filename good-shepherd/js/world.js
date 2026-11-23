/* NINETY-NINE · world.js
   The map: nine regions in a 3×3 grid, each opened by a chapter. Long barriers (a river, a thorn wall, cliffs, a ridge)
   seal regions off; each barrier has one door the story opens. Ground is painted once into a big canvas; scenery is
   depth-sorted props kept in a spatial hash for drawing and collision. */
(() => {
'use strict';
const NN = window.NN;
const { rand, clamp, pick, mk, disc, rect, oval, seeded } = NN.U;
const TAU = NN.TAU;

const RW = 880, RH = 660, WW = RW * 3, WH = RH * 3;
const REGIONS = {
  pines: { name: 'Pine Woods', ch: 4, col: 0, row: 0, pal: { base: '#5e9e4c', dark: '#4c8a40', darker: '#3e7636', light: '#78b45a', hi: '#9ccc70' }, trees: ['pine', 'pine', 'pine', 'oak'] },
  thorns: { name: 'The Thorn Hills', ch: 3, col: 1, row: 0, pal: { base: '#8aa65a', dark: '#78924c', darker: '#667e40', light: '#a2b86c', hi: '#c0cc84' }, trees: ['oak', 'deadTree', 'pine'] },
  highlands: { name: 'The Highlands', ch: 6, col: 2, row: 0, pal: { base: '#80c06c', dark: '#6aa85a', darker: '#5a944c', light: '#9cd27e', hi: '#c0e49a' }, trees: ['oliveTree', 'oak', 'pine'] },
  road: { name: 'The Old Road', ch: 4, col: 0, row: 1, pal: { base: '#a8b85a', dark: '#94a44c', darker: '#808e40', light: '#c0cc6e', hi: '#d8dc8a' }, trees: ['oak', 'pine', 'blossom'] },
  meadow: { name: 'The Home Meadow', ch: 1, col: 1, row: 1, pal: { base: '#78b84a', dark: '#5f9c3c', darker: '#4f8a34', light: '#93cc5c', hi: '#b8e07a' }, trees: ['oak', 'oak', 'pine', 'pine', 'blossom'] },
  river: { name: 'The Riverlands', ch: 2, col: 2, row: 1, pal: { base: '#6ebc54', dark: '#58a444', darker: '#488e38', light: '#8ed06a', hi: '#b2e28a' }, trees: ['oak', 'blossom', 'oak'] },
  canyon: { name: 'Shadow Canyon', ch: 5, col: 0, row: 2, pal: { base: '#9c8a6a', dark: '#87765a', darker: '#6e5f48', light: '#b2a07e', hi: '#c8b694' }, trees: ['deadTree', 'deadTree', 'pine'], dark: 0.5 },
  canyon2: { name: 'Shadow Canyon', ch: 5, col: 1, row: 2, pal: { base: '#a08e6c', dark: '#8a7a5c', darker: '#72624a', light: '#b6a480', hi: '#ccba96' }, trees: ['deadTree', 'pine'], dark: 0.5, alias: 'canyon' },
  marsh: { name: 'The Marsh', ch: 2, col: 2, row: 2, pal: { base: '#6e9e4a', dark: '#5e8a3e', darker: '#4e7634', light: '#86b25c', hi: '#a6c874' }, trees: ['oak', 'pine'] },
};
const GRID = [['pines', 'thorns', 'highlands'], ['road', 'meadow', 'river'], ['canyon', 'canyon2', 'marsh']];
const regionAt = (x, y) => GRID[clamp(Math.floor(y / RH), 0, 2)][clamp(Math.floor(x / RW), 0, 2)];
const regionId = id => (REGIONS[id] && REGIONS[id].alias) || id;

// ---------------------------------------------------------------- fixed places
const FOLD = { x: 1184, y: 880, w: 288, h: 176 };
const GX = FOLD.x + FOLD.w / 2, GATE = 32;
const FIRE = { x: GX + 10, y: FOLD.y + 96 };
const HUT = { x: 1060, y: 900 };
const POND = { x: 1000, y: 1180, r: 40 };
const LAKE = { x: 2200, y: 1620, r: 96, islet: 20 };
const SITES = {
  bridge: { x: 1768, y: 990 }, thornGap: { x: 1320, y: 660 }, rockslide: { x: 880, y: 990 }, canyonGate: { x: 1325, y: 1320 },
  ridgeGate: { x: 2205, y: 660 }, sycamore: { x: 2120, y: 860 }, tollBooth: { x: 1960, y: 1046 }, village: { x: 2060, y: 1060 },
  nellDock: { x: 1832, y: 1190 }, abeSpot: { x: 2120, y: 1500 }, lakeIslet: { x: LAKE.x, y: LAKE.y + 6 }, thistleHill: { x: 1120, y: 250 },
  maze: { x: 1540, y: 300 }, hankCamp: { x: 430, y: 930 }, pipLedge: { x: 170, y: 1880 }, bramFarm: { x: 2400, y: 310 },
  oliveGrove: { x: 1960, y: 230 }, table: { x: GX, y: FOLD.y + FOLD.h + 120 }, gate: { x: GX, y: FOLD.y + FOLD.h + 8 },
  bramWatch: { x: 1660, y: 1210 }, quartermaster: { x: HUT.x + 70, y: HUT.y + 40 },
};
const RIVER = [[1760, -30], [1748, 300], [1786, 660], [1768, 990], [1744, 1320], [1776, 1650], [1760, 2010]];
const RIVER_HW = 22;
const BRIDGE = { x: SITES.bridge.x - 48, y: SITES.bridge.y - 20, w: 96, h: 40 };
const FORD = { x: LAKE.x - 10, y: LAKE.y - LAKE.r - 6, w: 20, h: LAKE.r - LAKE.islet + 8 };
// Barriers: [x1, y1, x2, y2, halfThickness, kind, door?]. A door segment is passable once its door is open.
const BARRIERS = [];
const seg = (x1, y1, x2, y2, hw, kind, door) => BARRIERS.push([x1, y1, x2, y2, hw, kind, door || null]);
seg(880, 660, 1298, 660, 9, 'thorn'); seg(1298, 660, 1342, 660, 9, 'thorn', 'thorns'); seg(1342, 660, 1760, 660, 9, 'thorn');
seg(880, 0, 880, 962, 12, 'cliff'); seg(880, 962, 880, 1018, 12, 'cliff', 'rockslide'); seg(880, 1018, 880, 1320, 12, 'cliff');
seg(0, 1320, 1300, 1320, 12, 'cliff'); seg(1300, 1320, 1350, 1320, 12, 'cliff', 'canyon'); seg(1350, 1320, 1760, 1320, 12, 'cliff');
seg(1760, 660, 2180, 660, 12, 'ridge'); seg(2180, 660, 2230, 660, 12, 'ridge', 'ridge'); seg(2230, 660, WW, 660, 12, 'ridge');
// The thorn maze around SITES.maze: a seeded depth-first maze, 6×6 cells of 36 px, entrance at the bottom middle.
const MAZE = (() => {
  const n = 6, cs = 36, ox = SITES.maze.x - n * cs / 2, oy = SITES.maze.y - n * cs / 2, r = seeded(77);
  const seen = new Set(), walls = new Set();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { walls.add(`h${x},${y}`); walls.add(`v${x},${y}`); }
  const stack = [[0, 0]]; seen.add('0,0');
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !seen.has(`${x},${y}`));
    if (!nb.length) { stack.pop(); continue; }
    const [nx, ny] = nb[Math.floor(r() * nb.length)];
    if (nx !== cx) walls.delete(`v${Math.max(nx, cx)},${cy}`); else walls.delete(`h${cx},${Math.max(ny, cy)}`);
    seen.add(`${nx},${ny}`); stack.push([nx, ny]);
  }
  const segs = [];
  for (const w of walls) {
    const [x, y] = w.slice(1).split(',').map(Number);
    if (w[0] === 'h' && y > 0) segs.push([ox + x * cs, oy + y * cs, ox + (x + 1) * cs, oy + y * cs]);
    if (w[0] === 'v' && x > 0) segs.push([ox + x * cs, oy + y * cs, ox + x * cs, oy + (y + 1) * cs]);
  }
  const W = n * cs;
  segs.push([ox, oy, ox + W, oy], [ox, oy, ox, oy + W], [ox + W, oy, ox + W, oy + W]);
  segs.push([ox, oy + W, ox + W / 2 - 18, oy + W], [ox + W / 2 + 18, oy + W, ox + W, oy + W]);
  return { segs, center: { x: ox + Math.floor(n / 2) * cs + cs / 2 - cs, y: oy + Math.floor(n / 2) * cs + cs / 2 - cs }, ox, oy, size: W };
})();
for (const [x1, y1, x2, y2] of MAZE.segs) seg(x1, y1, x2, y2, 7, 'maze');
NN.WORLD_BARRIERS = BARRIERS;

const PATHS = [
  [[GX, FOLD.y + FOLD.h - 2], [GX, 1112], [1150, 1124], [1010, 1150]],
  [[GX, 1112], [1560, 1086], [1700, 1000], [1768, 990], [1900, 1000], [2060, 1060], [2160, 1140], [2200, 1400], [2160, 1520]],
  [[1150, 1124], [990, 1010], [880, 990], [620, 990], [300, 980], [-10, 990]],
  [[HUT.x, HUT.y + 4], [1100, 1000], [1030, 1050]],
  [[GX + 150, FOLD.y + FOLD.h - 30], [GX + 180, 820], [1330, 700], [1320, 600], [1240, 420], [1140, 270]],
  [[1320, 600], [1450, 520], [1540, 420]],
  [[GX, 1112], [1330, 1290], [1325, 1400], [1100, 1560], [700, 1640], [400, 1760], [180, 1870]],
  [[2060, 1060], [2190, 820], [2205, 660], [2260, 470], [2380, 320]],
  [[2260, 470], [1980, 260]],
  [[430, 990], [450, 640], [400, 300], [300, 80]],
];
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const polyDist = (x, y, pts) => { let m = 1e9; for (let i = 1; i < pts.length; i++) m = Math.min(m, segDist(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])); return m; };
const pathDist = (x, y) => { let m = 1e9; for (const p of PATHS) m = Math.min(m, polyDist(x, y, p)); return m; };
const riverDist = (x, y) => polyDist(x, y, RIVER);
const inRect = (x, y, r, m = 0) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;

// ---------------------------------------------------------------- state the story changes
const W = NN.WORLD = {
  RW, RH, WW, WH, REGIONS, GRID, regionAt, regionId, FOLD, GX, GATE, FIRE, HUT, POND, LAKE, SITES, RIVER, BRIDGE, MAZE, PATHS,
  doors: { bridge: false, thorns: false, rockslide: false, canyon: false, ridge: false },
  revealed: new Set(['meadow']), // regions without fog
  decor: [], ground: null, rects: [],
  pathDist, riverDist,
};
W.inFold = (x, y) => x > FOLD.x + 5 && x < FOLD.x + FOLD.w - 5 && y > FOLD.y + 5 && y < FOLD.y + FOLD.h - 5;
W.insideFold = e => W.inFold(e.x, e.y);
W.region = e => regionId(regionAt(e.x, e.y));
W.isRevealed = id => W.revealed.has(regionId(id));
W.darkAt = (x, y) => (REGIONS[regionAt(x, y)].dark || 0);

// ---------------------------------------------------------------- spatial hash for scenery
const CELL = 128, COLS = Math.ceil(WW / CELL), ROWS = Math.ceil(WH / CELL);
let hash = [];
function hashAll() {
  hash = Array.from({ length: COLS * ROWS }, () => []);
  for (const o of W.decor) if (!o.gone) hash[clamp(Math.floor(o.y / CELL), 0, ROWS - 1) * COLS + clamp(Math.floor(o.x / CELL), 0, COLS - 1)].push(o);
}
W.addDecor = o => { W.decor.push(o); hash[clamp(Math.floor(o.y / CELL), 0, ROWS - 1) * COLS + clamp(Math.floor(o.x / CELL), 0, COLS - 1)].push(o); return o; };
W.removeDecor = o => { o.gone = true; const b = hash[clamp(Math.floor(o.y / CELL), 0, ROWS - 1) * COLS + clamp(Math.floor(o.x / CELL), 0, COLS - 1)]; const i = b.indexOf(o); if (i >= 0) b.splice(i, 1); };
W.query = (x0, y0, x1, y1) => {
  const out = [];
  const c0 = clamp(Math.floor(x0 / CELL), 0, COLS - 1), c1 = clamp(Math.floor(x1 / CELL), 0, COLS - 1);
  const r0 = clamp(Math.floor(y0 / CELL), 0, ROWS - 1), r1 = clamp(Math.floor(y1 / CELL), 0, ROWS - 1);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) for (const o of hash[r * COLS + c]) out.push(o);
  return out;
};

// ---------------------------------------------------------------- painting the ground
function paintRegion(g, id, rnd) {
  const R = REGIONS[id], p = R.pal, x0 = R.col * RW, y0 = R.row * RH;
  rect(g, p.base, x0, y0, RW, RH);
  const rx = () => x0 + rnd() * RW, ry = () => y0 + rnd() * RH;
  for (let i = 0; i < 80; i++) {
    const cx = rx(), cy = ry(), r = Math.floor(10 + rnd() * 26), col = rnd() < 0.66 ? p.dark : p.light;
    disc(g, cx, cy, r, col);
    for (let k = 0; k < r * 5; k += 2) { const a = rnd() * TAU, d = r + rnd() * 3; rect(g, col, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d)); }
  }
  for (let ty = y0; ty < y0 + RH; ty += 16) for (let tx = x0; tx < x0 + RW; tx += 16) {
    const n = rnd() < 0.6 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const x = tx + Math.floor(1 + rnd() * 11), y = ty + Math.floor(2 + rnd() * 11);
      if (id === 'canyon' || id === 'canyon2') { rect(g, p.darker, x, y, 3, 1); rect(g, p.hi, x + 1, y - 1); continue; }
      for (const [dx, dy] of [[0, 2], [1, 1], [2, 2], [3, 1], [4, 2]]) rect(g, p.darker, x + dx, y + dy);
      rect(g, p.hi, x + 1, y); rect(g, p.hi, x + 3, y);
    }
  }
  const flowers = { meadow: ['#ffffff', '#f5c542', '#ef9aa0', '#a9c4ff'], river: ['#ffffff', '#a9c4ff', '#f5c542'], thorns: ['#b88ad8', '#ffffff'],
    road: ['#f5c542', '#e07a2e', '#ffffff'], highlands: ['#b98ad8', '#d6a8e8', '#ffffff', '#f5c542'], marsh: ['#ffffff', '#f5c542'], pines: ['#ffffff', '#ef9aa0'],
    canyon: ['#d8c8a8'], canyon2: ['#d8c8a8'] }[id];
  const nf = id.startsWith('canyon') ? 60 : 420;
  for (let i = 0; i < nf; i++) {
    const x = Math.floor(rx()), y = Math.floor(ry()), col = flowers[Math.floor(rnd() * flowers.length)];
    rect(g, col, x - 1, y); rect(g, col, x + 1, y); rect(g, col, x, y - 1); rect(g, col, x, y + 1);
    rect(g, col === '#f5c542' ? '#e07a2e' : '#f5c542', x, y); rect(g, p.darker, x, y + 2);
  }
  if (id.startsWith('canyon')) {
    for (let i = 0; i < 70; i++) { // cracks
      let x = rx(), y = ry(), a = rnd() * TAU;
      for (let k = 0; k < 14; k++) { rect(g, p.darker, Math.round(x), Math.round(y), 2, 1); a += rnd() - 0.5; x += Math.cos(a) * 2; y += Math.sin(a) * 2; }
    }
    for (let i = 0; i < 160; i++) { const x = rx(), y = ry(), r = 2 + Math.floor(rnd() * 3); disc(g, x, y + 1, r, '#5a4a38'); disc(g, x, y, r, '#8c7c64'); rect(g, '#b8a88c', Math.round(x) - 1, Math.round(y) - 1); }
  }
  if (id === 'pines' || id === 'thorns') for (let i = 0; i < 90; i++) disc(g, rx(), ry(), 6 + Math.floor(rnd() * 10), id === 'pines' ? '#7a6a40' : '#8a7a58');
}
function stroke(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
    for (let k = 0; k <= n; k++) { const t = k / n; disc(g, ax + (bx - ax) * t, ay + (by - ay) * t, r, col); }
  }
}
function paintWater(g, cx, cy, r, rnd, islet) {
  disc(g, cx, cy + 2, r + 5, '#4f8a34'); disc(g, cx, cy, r + 3, '#e3c88f'); disc(g, cx, cy + 1, r + 1, '#2f6e9e');
  disc(g, cx, cy, r, '#4aa3d8'); disc(g, cx + 4, cy + 5, Math.round(r * 0.7), '#3d8cc4');
  for (let i = 0; i < r / 3; i++) rect(g, '#a8dcf5', Math.floor(cx + (rnd() - 0.6) * r), Math.floor(cy + (rnd() - 0.5) * r), Math.floor(3 + rnd() * 4), 1);
  if (islet) { disc(g, cx, cy + 6, islet + 2, '#e3c88f'); disc(g, cx, cy + 4, islet, '#78b84a'); }
  const lilies = Math.floor(r / 10);
  for (let i = 0; i < lilies; i++) {
    const a = rnd() * TAU, d = (islet ? islet + 10 : 6) + rnd() * (r - (islet ? islet + 16 : 12)), lx = Math.round(cx + Math.cos(a) * d), ly = Math.round(cy + Math.sin(a) * d);
    disc(g, lx, ly, 3, '#5fae4a'); rect(g, '#4aa3d8', lx + 1, ly - 3, 1, 3);
    if (rnd() < 0.5) { rect(g, '#f6b3c8', lx - 1, ly - 1, 2, 2); rect(g, '#ffffff', lx - 1, ly - 1); }
  }
  for (let i = 0; i < r * 0.7; i++) {
    const a = Math.PI * 0.8 + rnd() * Math.PI * 1.4, x = Math.round(cx + Math.cos(a) * (r + 4)), y = Math.round(cy + Math.sin(a) * (r + 4));
    rect(g, '#3d7a2e', x, y - 5, 1, 6); rect(g, '#8a5a33', x, y - 6, 1, 2);
  }
}
function paintCliff(g, x1, y1, x2, y2, kind) {
  const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2), horiz = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const cols = kind === 'ridge' ? ['#5e7a4a', '#7a9a5e', '#9cbc78', '#3e5636'] : ['#6e5a44', '#8c765a', '#b09a78', '#4a3a2c'];
  for (let k = 0; k <= n; k++) {
    const t = k / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t, wob = Math.sin(k * 0.37) * 2 + Math.sin(k * 0.11) * 3;
    if (horiz) { rect(g, cols[3], Math.round(x), Math.round(y - 12 + wob), 2, 26); rect(g, cols[0], Math.round(x), Math.round(y - 10 + wob), 2, 20); rect(g, cols[1], Math.round(x), Math.round(y - 10 + wob), 2, 9); rect(g, cols[2], Math.round(x), Math.round(y - 10 + wob), 2, 2); }
    else { rect(g, cols[3], Math.round(x - 12 + wob), Math.round(y), 26, 2); rect(g, cols[0], Math.round(x - 10 + wob), Math.round(y), 20, 2); rect(g, cols[1], Math.round(x - 10 + wob), Math.round(y), 8, 2); rect(g, cols[2], Math.round(x - 10 + wob), Math.round(y), 2, 2); }
  }
}

W.build = () => {
  const rnd = seeded(2026), g0 = mk(WW, WH), g = g0.getContext('2d');
  for (const id of Object.keys(REGIONS)) paintRegion(g, id, rnd);
  // soften region seams with a dithered band
  for (let i = 1; i < 3; i++) for (let k = 0; k < 9000; k++) {
    const vertical = k & 1, a = i * (vertical ? RW : RH), along = rnd() * (vertical ? WH : WW), off = (rnd() - 0.5) * 30;
    const x = vertical ? a + off : along, y = vertical ? along : a + off, sx = vertical ? a - off : along, sy = vertical ? along : a - off;
    const id = regionAt(sx, sy);
    rect(g, REGIONS[id].pal.base, Math.round(x), Math.round(y), 2, 2);
  }
  // paths
  for (const p of PATHS) stroke(g, p, 10, '#4f8a34');
  for (const p of PATHS) stroke(g, p, 8, '#b5834c');
  for (const p of PATHS) stroke(g, p, 7, '#cf9f62');
  // the Old Road is wider
  stroke(g, PATHS[2].slice(2), 14, '#9c7446'); stroke(g, PATHS[2].slice(2), 12, '#c49660');
  for (let i = 0; i < 26000; i++) {
    const x = rnd() * WW, y = rnd() * WH;
    if (pathDist(x, y) < 6) rect(g, ['#ddb57a', '#b5834c', '#e8c690', '#a57a48'][Math.floor(rnd() * 4)], Math.floor(x), Math.floor(y), rnd() < 0.3 ? 2 : 1, 1);
  }
  // the river
  stroke(g, RIVER, RIVER_HW + 6, '#e3c88f'); stroke(g, RIVER, RIVER_HW + 2, '#2f6e9e'); stroke(g, RIVER, RIVER_HW, '#4aa3d8'); stroke(g, RIVER, RIVER_HW - 9, '#3d8cc4');
  for (let i = 0; i < 260; i++) { const y = rnd() * WH; let x = 0; for (let k = 1; k < RIVER.length; k++) if (y >= RIVER[k - 1][1] && y <= RIVER[k][1]) { const t = (y - RIVER[k - 1][1]) / (RIVER[k][1] - RIVER[k - 1][1]); x = RIVER[k - 1][0] + (RIVER[k][0] - RIVER[k - 1][0]) * t; } rect(g, '#a8dcf5', Math.round(x + (rnd() - 0.5) * 24), Math.round(y), 3 + Math.floor(rnd() * 5), 1); }
  paintWater(g, POND.x, POND.y, POND.r, rnd);
  paintWater(g, LAKE.x, LAKE.y, LAKE.r, rnd, LAKE.islet);
  paintWater(g, 2400, 1320, 34, rnd); paintWater(g, 1990, 1760, 26, rnd);
  for (let k = 0; k < 6; k++) { disc(g, FORD.x + 10, FORD.y + 8 + k * 14, 5, '#5a5868'); disc(g, FORD.x + 10, FORD.y + 7 + k * 14, 4, '#9a98a8'); rect(g, '#c4c3cf', FORD.x + 8, FORD.y + 5 + k * 14, 2, 1); }
  // cliffs and ridges
  for (const [x1, y1, x2, y2, , kind] of BARRIERS) if (kind === 'cliff' || kind === 'ridge') paintCliff(g, x1, y1, x2, y2, kind);
  // the fold: straw floor, a shaded strip under the shelter, the fire ring
  rect(g, '#b8954a', FOLD.x, FOLD.y, FOLD.w, FOLD.h); rect(g, '#dcb965', FOLD.x + 2, FOLD.y + 2, FOLD.w - 4, FOLD.h - 4);
  for (let i = 0; i < 3400; i++) rect(g, ['#c9a352', '#f0d88c', '#c9a352', '#e8c878'][Math.floor(rnd() * 4)], Math.floor(FOLD.x + 3 + rnd() * (FOLD.w - 9)), Math.floor(FOLD.y + 3 + rnd() * (FOLD.h - 8)), rnd() < 0.6 ? 3 : 2, 1);
  g.fillStyle = 'rgba(90,60,20,.22)'; g.fillRect(FOLD.x + 12, FOLD.y + 22, 80, 20);
  for (let a = 0; a < 10; a++) { const sx = Math.round(FIRE.x + Math.cos(a / 10 * TAU) * 8), sy = Math.round(FIRE.y + Math.sin(a / 10 * TAU) * 5); rect(g, '#5a5868', sx - 2, sy - 1, 4, 3); rect(g, '#9a98a8', sx - 1, sy - 1, 3, 2); rect(g, '#c4c3cf', sx - 1, sy - 1); }
  rect(g, '#5a4a3a', FIRE.x - 5, FIRE.y - 2, 10, 4);
  // Bram's bare paddock
  oval(g, SITES.bramFarm.x - 40, SITES.bramFarm.y + 70, 110, 60, '#a8a070'); oval(g, SITES.bramFarm.x - 40, SITES.bramFarm.y + 70, 104, 54, '#bab480');
  for (let i = 0; i < 600; i++) rect(g, '#9a9264', Math.floor(SITES.bramFarm.x - 140 + rnd() * 200), Math.floor(SITES.bramFarm.y + 20 + rnd() * 100), 2, 1);
  W.ground = g0;
  W.groundCtx = g;

  // ---- scenery
  W.decor = [];
  const add = (x, y, prop, extra = {}) => W.decor.push(Object.assign({ x, y, prop }, extra));
  add(HUT.x, HUT.y, 'hut', { r: 0 });
  add(FOLD.x + 52, FOLD.y + 42, 'shelter');
  for (const [hx, hy] of [[FOLD.x + 16, FOLD.y + 62], [FOLD.x + 30, FOLD.y + 66], [FOLD.x + 22, FOLD.y + 56]]) add(hx, hy, 'hay');
  add(FIRE.x, FIRE.y + 2, 'fire');
  add(HUT.x + 40, HUT.y - 4, 'berry', { r: 6 }); add(HUT.x - 42, HUT.y - 2, 'bush', { r: 6 });
  add(SITES.gate.x + 26, SITES.gate.y + 2, 'gateBell', { r: 3, bell: true });
  // barrier dressing: thorn hedges, rockslide, canyon boulders, the ridge gate
  for (const [x1, y1, x2, y2, , kind, door] of BARRIERS) {
    if (kind !== 'thorn' && kind !== 'maze' && !door) continue;
    const len = Math.hypot(x2 - x1, y2 - y1), step = kind === 'maze' ? 14 : 28, n = Math.max(1, Math.round(len / step));
    for (let k = 0; k <= n; k++) {
      const x = x1 + (x2 - x1) * k / n, y = y1 + (y2 - y1) * k / n;
      if (kind === 'thorn' || kind === 'maze') add(x + (rnd() - 0.5) * 3, y + 6, kind === 'maze' ? 'thornBush' : 'thornWall', { door, thorn: true });
      else add(x + (rnd() - 0.5) * 6, y + 8 + (rnd() - 0.5) * 6, door === 'ridge' ? 'boulder2' : rnd() < 0.5 ? 'boulder' : 'boulder2', { door, r: 0 });
    }
  }
  add(SITES.bridge.x - 70, SITES.bridge.y + 20, 'signpost', { sign: 'bridge' });
  add(SITES.thornGap.x + 30, SITES.thornGap.y + 26, 'signpost', { sign: 'thorns' });
  add(SITES.rockslide.x + 34, SITES.rockslide.y + 30, 'signpost', { sign: 'rockslide' });
  add(SITES.canyonGate.x + 34, SITES.canyonGate.y - 18, 'signpost', { sign: 'canyon' });
  add(SITES.ridgeGate.x + 40, SITES.ridgeGate.y + 26, 'signpost', { sign: 'ridge' });
  // story places
  add(SITES.sycamore.x, SITES.sycamore.y, 'sycamore', { r: 8, sycamore: true });
  add(SITES.tollBooth.x, SITES.tollBooth.y, 'tollBooth', { r: 0, booth: true });
  for (let k = 0; k < 6; k++) add(SITES.village.x + 60 + k * 18, SITES.village.y - 70, 'reeds');
  add(SITES.hankCamp.x, SITES.hankCamp.y, 'tent', { r: 0 }); add(SITES.hankCamp.x + 50, SITES.hankCamp.y + 14, 'cart', { r: 10 });
  add(SITES.bramFarm.x, SITES.bramFarm.y, 'bramBarn', { r: 0 });
  for (let k = 0; k < 9; k++) add(SITES.oliveGrove.x + (k % 3) * 44 + (rnd() - 0.5) * 10, SITES.oliveGrove.y + Math.floor(k / 3) * 40 + (rnd() - 0.5) * 8, 'oliveTree', { r: 5, tree: true });
  // building rectangles that block movement
  W.rects = [[HUT.x - 27, HUT.y - 26, 54, 25], [SITES.tollBooth.x - 16, SITES.tollBooth.y - 10, 32, 10], [SITES.hankCamp.x - 18, SITES.hankCamp.y - 10, 36, 10],
    [SITES.bramFarm.x - 38, SITES.bramFarm.y - 24, 76, 24]];

  const busy = (x, y, m) => {
    if (x > FOLD.x - m && x < FOLD.x + FOLD.w + m && y > FOLD.y - m && y < FOLD.y + FOLD.h + m + 30) return true;
    if (Math.hypot(x - POND.x, y - POND.y) < POND.r + 18 || Math.hypot(x - LAKE.x, y - LAKE.y) < LAKE.r + 18) return true;
    if (Math.hypot(x - HUT.x, y - HUT.y + 30) < 60 || pathDist(x, y) < 18 || riverDist(x, y) < RIVER_HW + 16) return true;
    for (const [x1, y1, x2, y2, hw] of BARRIERS) if (segDist(x, y, x1, y1, x2, y2) < hw + 22) return true;
    for (const k of ['sycamore', 'tollBooth', 'village', 'hankCamp', 'bramFarm', 'oliveGrove', 'thistleHill', 'pipLedge', 'nellDock', 'abeSpot', 'table', 'bramWatch', 'quartermaster']) if (Math.hypot(x - SITES[k].x, y - SITES[k].y) < 70) return true;
    if (x > MAZE.ox - 30 && x < MAZE.ox + MAZE.size + 30 && y > MAZE.oy - 30 && y < MAZE.oy + MAZE.size + 40) return true;
    return false;
  };
  const near = (x, y, d) => W.decor.some(o => o.tree && Math.abs(o.x - x) < d && Math.abs(o.y - y) < d && Math.hypot(o.x - x, o.y - y) < d);
  for (const id of Object.keys(REGIONS)) {
    const R = REGIONS[id], x0 = R.col * RW, y0 = R.row * RH;
    let trees = 0, tries = 0;
    const want = id === 'pines' ? 110 : id.startsWith('canyon') ? 34 : 60;
    while (trees < want && tries++ < 4000) {
      const x = x0 + 14 + rnd() * (RW - 28), y = y0 + 46 + rnd() * (RH - 50);
      if (busy(x, y, 46) || near(x, y, 30)) continue;
      const kind = R.trees[Math.floor(rnd() * R.trees.length)];
      add(x, y, kind, { r: 5, tree: true }); trees++;
    }
    for (let n = 0, t2 = 0; n < (id.startsWith('canyon') ? 30 : 46) && t2 < 2000; t2++) {
      const x = x0 + 14 + rnd() * (RW - 28), y = y0 + 20 + rnd() * (RH - 24);
      if (busy(x, y, 24) || near(x, y, 18)) continue;
      const kinds = id === 'thorns' ? ['thornBush', 'thornBush', 'bush', 'stump'] : id === 'marsh' || id === 'river' ? ['bush', 'blue', 'reeds', 'cattail', 'stump'] : id.startsWith('canyon') ? ['boulder', 'boulder2', 'stump'] : ['bush', 'bush', 'berry', 'blue', 'stump', 'mushrooms'];
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      add(x, y, kind, { r: kind === 'reeds' || kind === 'cattail' || kind === 'mushrooms' ? 0 : kind === 'stump' ? 4 : 6, thorn: kind === 'thornBush' });
      n++;
    }
  }
  // the world's edge: a ring of trees just inside the border
  for (let x = 10; x < WW; x += 34) { add(x + rnd() * 8, 30 + rnd() * 6, 'pine', { r: 5, tree: true }); add(x + rnd() * 8, WH - 4, regionAt(x, WH - 4).startsWith('canyon') ? 'deadTree' : 'pine', { r: 5, tree: true }); }
  for (let y = 60; y < WH; y += 34) { add(12 + rnd() * 6, y, regionAt(12, y).startsWith('canyon') ? 'deadTree' : 'pine', { r: 5, tree: true }); add(WW - 12 - rnd() * 6, y, 'pine', { r: 5, tree: true }); }
  hashAll();
};

// ---------------------------------------------------------------- collision
W.dynamicRects = () => W.rects; // game.js replaces this to add building footprints
W.blocked = (x, y, r) => {
  if (x < 6 || y < 10 || x > WW - 6 || y > WH - 3) return true;
  return false;
};
W.collide = (e, r, px, py) => {
  e.x = clamp(e.x, 8, WW - 8); e.y = clamp(e.y, 12, WH - 4);
  // fold fence
  const F = FOLD, fence = [[F.x, F.y, F.w, 4], [F.x, F.y, 4, F.h], [F.x + F.w - 4, F.y, 4, F.h], [F.x, F.y + F.h - 4, (F.w - GATE) / 2, 4], [F.x + (F.w + GATE) / 2, F.y + F.h - 4, (F.w - GATE) / 2, 4]];
  for (const [x, y, w, h] of fence.concat(W.dynamicRects())) {
    if (e.x < x - r - 1 || e.x > x + w + r + 1 || e.y < y - r - 1 || e.y > y + h + r + 1) continue;
    const cx = clamp(e.x, x, x + w), cy = clamp(e.y, y, y + h), dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
    if (d < r) { if (d === 0) { e.y += e.y < y + h / 2 ? -r : r; continue; } e.x = cx + dx / d * r; e.y = cy + dy / d * r; }
  }
  // scenery
  for (const o of W.query(e.x - 24, e.y - 24, e.x + 24, e.y + 24)) {
    if (!o.r) continue;
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = o.r + r;
    if (d < m && d > 0) { e.x = o.x + dx / d * m; e.y = o.y + dy / d * m; }
  }
  // water: the river (except on the bridge), the pond, the lake (except the ford and the islet)
  const onBridge = W.doors.bridge && inRect(e.x, e.y, BRIDGE);
  if (!onBridge && Math.abs(e.x - 1765) < 80) pushFromPoly(e, RIVER, RIVER_HW + r - 4);
  for (const P of [POND, { x: 2400, y: 1320, r: 34 }, { x: 1990, y: 1760, r: 26 }]) {
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy), m = P.r + r - 2;
    if (d < m && d > 0) { e.x = P.x + dx / d * m; e.y = P.y + dy / d * m; }
  }
  { const dx = e.x - LAKE.x, dy = e.y - LAKE.y, d = Math.hypot(dx, dy) || 0.01, outer = LAKE.r + r - 2, inner = LAKE.islet - r + 2;
    if (d < outer && d > inner && !inRect(e.x, e.y, FORD)) {
      const toOut = outer - d, toIn = d - inner;
      if (toOut < toIn) { e.x = LAKE.x + dx / d * outer; e.y = LAKE.y + dy / d * outer; } else { e.x = LAKE.x + dx / d * inner; e.y = LAKE.y + dy / d * inner; }
    } }
  // barriers
  for (const [x1, y1, x2, y2, hw, , door] of BARRIERS) {
    if (door && W.doors[door]) continue;
    if (e.x < Math.min(x1, x2) - hw - r - 2 || e.x > Math.max(x1, x2) + hw + r + 2 || e.y < Math.min(y1, y2) - hw - r - 2 || e.y > Math.max(y1, y2) + hw + r + 2) continue;
    pushFromSeg(e, x1, y1, x2, y2, hw + r, px, py);
  }
};
function pushFromSeg(e, x1, y1, x2, y2, m, px, py) {
  const dx = x2 - x1, dy = y2 - y1, t = clamp(((e.x - x1) * dx + (e.y - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const cx = x1 + dx * t, cy = y1 + dy * t, ex = e.x - cx, ey = e.y - cy, d = Math.hypot(ex, ey);
  if (d >= m) return;
  if (d < 0.01) {
    // standing right on the line: push back to the side we came from
    const nx = -dy, ny = dx, side = px !== undefined ? Math.sign((px - cx) * nx + (py - cy) * ny) || 1 : 1, nl = Math.hypot(nx, ny) || 1;
    e.x = cx + nx / nl * m * side; e.y = cy + ny / nl * m * side; return;
  }
  e.x = cx + ex / d * m; e.y = cy + ey / d * m;
}
function pushFromPoly(e, pts, m) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    if (e.y < Math.min(y1, y2) - m || e.y > Math.max(y1, y2) + m) continue;
    pushFromSeg(e, x1, y1, x2, y2, m);
  }
}

// ---------------------------------------------------------------- pathfinding
// A 16 px walkability grid, rebuilt when doors open or buildings go up. Animals that can't walk straight to where
// they're going ask for a path and follow its waypoints.
const NC = 16, NCOLS = Math.ceil(WW / NC), NROWS = Math.ceil(WH / NC);
let navGrid = null, navKey = '';
W.navDirty = () => { navKey = ''; };
const ensureNav = () => {
  const key = JSON.stringify(W.doors) + ':' + (W.dynamicRects().length);
  if (key === navKey && navGrid) return;
  navKey = key; navGrid = new Uint8Array(NCOLS * NROWS);
  for (let j = 0; j < NROWS; j++) for (let i = 0; i < NCOLS; i++) {
    const x = i * NC + 8, y = j * NC + 8, e = { x, y };
    W.collide(e, 4, x, y);
    navGrid[j * NCOLS + i] = Math.hypot(e.x - x, e.y - y) < 3 ? 1 : 0;
  }
};
const walk = (x, y) => { const i = Math.floor(x / NC), j = Math.floor(y / NC); return i >= 0 && j >= 0 && i < NCOLS && j < NROWS && navGrid[j * NCOLS + i] === 1; };
W.clearLine = (x1, y1, x2, y2) => {
  ensureNav();
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 8);
  for (let k = 1; k < n; k++) { const t = k / n; if (!walk(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false; }
  return true;
};
W.path = (sx, sy, tx, ty, maxNodes = 9000) => {
  ensureNav();
  const cl = (v, m) => Math.max(0, Math.min(m - 1, v));
  const si = cl(Math.floor(sx / NC), NCOLS), sj = cl(Math.floor(sy / NC), NROWS), ti = cl(Math.floor(tx / NC), NCOLS), tj = cl(Math.floor(ty / NC), NROWS);
  const s0 = sj * NCOLS + si, t0 = tj * NCOLS + ti;
  const g = new Map([[s0, 0]]), from = new Map(), open = [[Math.hypot(ti - si, tj - sj), s0]];
  let best = s0, bestH = 1e9, n = 0;
  while (open.length && n++ < maxNodes) {
    let mi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[mi][0]) mi = k;
    const cur = open[mi][1]; open[mi] = open[open.length - 1]; open.pop();
    const ci = cur % NCOLS, cj = (cur / NCOLS) | 0, h = Math.hypot(ti - ci, tj - cj);
    if (h < bestH) { bestH = h; best = cur; }
    if (cur === t0) break;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= NCOLS || nj >= NROWS) continue;
      const nk = nj * NCOLS + ni;
      if (!navGrid[nk] && nk !== t0) continue;
      if (di && dj && (!navGrid[cj * NCOLS + ni] || !navGrid[nj * NCOLS + ci])) continue;
      const ng = g.get(cur) + (di && dj ? 1.414 : 1);
      if (ng < (g.get(nk) ?? 1e9)) { g.set(nk, ng); from.set(nk, cur); open.push([ng + Math.hypot(ti - ni, tj - nj), nk]); }
    }
  }
  const out = []; let k = best;
  while (k !== undefined && out.length < 600) { out.push({ x: (k % NCOLS) * NC + 8, y: ((k / NCOLS) | 0) * NC + 8 }); k = from.get(k); }
  out.reverse();
  if (best === t0) out.push({ x: tx, y: ty });
  return out;
};

// Route through the fold gate when the target is on the other side of the fence.
W.nav = (e, tx, ty) => {
  const a = W.insideFold(e), b = W.inFold(tx, ty);
  if (a === b) return [tx, ty];
  const outY = FOLD.y + FOLD.h + 10, inY = FOLD.y + FOLD.h - 20;
  const first = a ? inY : outY, second = a ? outY : inY;
  if (Math.abs(e.x - GX) < 11 && Math.abs(e.y - first) < 14) return [GX, second];
  if (!a && e.y < FOLD.y + FOLD.h && e.y > FOLD.y - 8 && (e.x < FOLD.x || e.x > FOLD.x + FOLD.w)) return [e.x < GX ? FOLD.x - 12 : FOLD.x + FOLD.w + 12, outY + 4];
  if (!a && e.y < FOLD.y + 4) return [e.x < GX ? FOLD.x - 14 : FOLD.x + FOLD.w + 14, FOLD.y + 20];
  return [GX, first];
};

// Is a building footprint (in world px, top-left x,y, w,h) free to build on?
W.canPlace = (x, y, w, h, others) => {
  if (x < 10 || y < 40 || x + w > WW - 10 || y + h > WH - 10) return false;
  if (!W.isRevealed(regionAt(x + w / 2, y + h / 2))) return false;
  const inF = x >= FOLD.x + 6 && x + w <= FOLD.x + FOLD.w - 6 && y >= FOLD.y + 8 && y + h <= FOLD.y + FOLD.h - 6;
  const overlapsFold = x < FOLD.x + FOLD.w + 4 && x + w > FOLD.x - 4 && y < FOLD.y + FOLD.h + 4 && y + h > FOLD.y - 4;
  if (overlapsFold && !inF) return false;
  if (inF && x < GX + 22 && x + w > GX - 22 && y + h > FOLD.y + FOLD.h - 40) return false; // keep the gate clear
  if (inF && Math.hypot(x + w / 2 - FIRE.x, y + h / 2 - FIRE.y) < 30) return false;
  if (x < FOLD.x + 96 && x + w > FOLD.x + 8 && y < FOLD.y + 46 && y + h > FOLD.y + 4) return false; // the shelter
  for (const [rx, ry, rw, rh] of W.rects.concat(others || [])) if (x < rx + rw && x + w > rx && y < ry + rh && y + h > ry) return false;
  for (const o of W.query(x - 20, y - 20, x + w + 20, y + h + 20)) if ((o.r || o.tree || o.thorn) && o.x > x - 6 && o.x < x + w + 6 && o.y > y - 2 && o.y < y + h + 8) return false;
  for (let px = x; px <= x + w; px += 8) for (let py = y; py <= y + h; py += 8) {
    if (riverDist(px, py) < RIVER_HW + 6 || Math.hypot(px - POND.x, py - POND.y) < POND.r + 4 || Math.hypot(px - LAKE.x, py - LAKE.y) < LAKE.r + 4) return false;
    for (const [x1, y1, x2, y2, hw] of BARRIERS) if (segDist(px, py, x1, y1, x2, y2) < hw + 6) return false;
  }
  return true;
};
W.paintBridge = () => {
  try { const p = NN.prop('bridge'); W.groundCtx.drawImage(p.img, SITES.bridge.x - p.ox, SITES.bridge.y - p.oy); }
  catch (e) { rect(W.groundCtx, '#8a5a33', BRIDGE.x, BRIDGE.y, BRIDGE.w, BRIDGE.h); for (let i = 0; i < BRIDGE.w; i += 6) rect(W.groundCtx, '#c58d55', BRIDGE.x + i, BRIDGE.y + 2, 5, BRIDGE.h - 4); }
};
W.openDoor = id => {
  W.doors[id] = true;
  for (const o of W.decor) if (o.door === id && !o.gone) W.removeDecor(o);
  if (id === 'bridge') W.paintBridge();
};
W.reveal = id => { for (const k of Object.keys(REGIONS)) if (regionId(k) === regionId(id)) W.revealed.add(k); };
})();
