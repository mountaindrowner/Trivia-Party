/* NINETY-NINE: Chapter 1 slice ("Green Pastures").
   A 384×216 canvas for the world in a cozy farm-sim pixel style, plus a DOM layer for text. No build step, no libraries.
   Design rules (see DESIGN.md §1): nothing is killed, no sheep is lost for good, forgiveness has one button. */
(() => {
'use strict';

// ---------------------------------------------------------------- setup
const W = 384, H = 216, WW = 1120, WH = 720, TAU = Math.PI * 2, UIW = 384;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const dark = mk(W, H), dctx = dark.getContext('2d');

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- drawing helpers
function disc(c, cx, cy, r, col) {
  if (col) c.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}
function rect(c, col, x, y, w = 1, h = 1) { c.fillStyle = col; c.fillRect(x, y, w, h); }
const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
// Adds a 1px colored outline around everything opaque (the warm outlines of the style).
function outline(src, col, pad = true) {
  const p = pad ? 1 : 0, w = src.width + 2 * p, h = src.height + 2 * p, c = mk(w, h);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, p, p);
  const id = x.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d), [r, g, b] = hexRGB(col);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (d[k + 3]) continue;
    if ((i > 0 && d[k - 1]) || (i < w - 1 && d[k + 7]) || (j > 0 && d[k - w * 4 + 3]) || (j < h - 1 && d[k + w * 4 + 3])) {
      o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = 255;
    }
  }
  id.data.set(o); x.putImageData(id, 0, 0);
  return c;
}
function mirror(src) { const c = mk(src.width, src.height), x = c.getContext('2d'); x.scale(-1, 1); x.drawImage(src, -src.width, 0); return c; }
function shadow(c, x, y, w) {
  c.fillStyle = 'rgba(38,52,24,.32)';
  c.fillRect(Math.round(x - w / 2) + 1, Math.round(y) - 1, w - 2, 1);
  c.fillRect(Math.round(x - w / 2), Math.round(y), w, 1);
  c.fillRect(Math.round(x - w / 2) + 1, Math.round(y) + 1, w - 2, 1);
}

// ---------------------------------------------------------------- hand-drawn sprites
const PAL = {
  o: '#4e3d3f', l: '#4e3d3f', w: '#fdf8ee', W: '#e6dacb', V: '#c7b6a5', f: '#5b4746', F: '#7d6563', e: '#1d1418', y: '#ffffff',
  p: '#ef9aa0', n: '#1d1418', g: '#f5c542', Y: '#ffe680', r: '#d8574f', c: '#3f8f93', k: '#2b2638', L: '#d4d5e0',
  G: '#8e8fa6', D: '#5d5e78', N: '#2e2a3a', d: '#4a4b62', b: '#c07a3e', B: '#7a4a24', s: '#fff2c4',
};
const SWAPS = {
  chomp: { w: '#ddd1be', W: '#c3b4a0', V: '#a69480', e: '#d8574f' },
  mercy: { b: '#4b4552', B: '#2f2a36', s: '#efe6d8' },
};
const sheepTop = [
  '...ooo.ooo......', '..owwwowwwoo....', '.owwywwwwwwwo...', 'owwwwwwwwwwoooo.', 'owwwwwwwwfoFFFFo',
  'owwwwwwwwwofFefo', 'oWwwwwwwwwoffffo', 'oWWwwwwwwWWoffpo', '.oVWWWWWWWVVooo.', '..oVVVVVVVVo....',
];
const SPR = {
  sheep: { frames: [
    sheepTop.concat(['..olo...olo.....', '..olo...olo.....', '..oo....oo......']),
    sheepTop.concat(['...olo.olo......', '...olo.olo......', '...oo..oo.......']),
  ] },
  wolf: { out: '#2b2638', frames: [
    ['.............G.G...', '.............GGGG..', 'GG..DDDDDDDDDDGYGG.', '.GDDDDDDDDDDDGGGGGN', '..GGGGGGGGGGGGGGLL.',
      '..GLLLLLLLLLGGGG...', '...GG...GG.GG.GG...', '...GG...GG.GG.GG...', '...dd...dd.dd.dd...'],
    ['.............G.G...', '.............GGGG..', 'GG..DDDDDDDDDDGYGG.', '.GDDDDDDDDDDDGGGGGN', '..GGGGGGGGGGGGGGLL.',
      '..GLLLLLLLLLGGGG...', '....GG.GG....GG.GG.', '....GG.GG....GG.GG.', '....dd.dd....dd.dd.'],
  ] },
  dog: { out: '#3a2418', frames: [
    ['.........b.b.', '.........bbbb', 'b.......bbkbN', '.bbbbbbbbbbb.', '.bssssssbb...', '.b.b...b.b...', '.B.B...B.B...'],
    ['.........b.b.', '.........bbbb', 'b.......bbkbN', '.bbbbbbbbbbb.', '.bssssssbb...', '..b.b.b.b....', '..B.B.B.B....'],
  ] },
  heart: { out: '#5a2430', frames: [['.rr.rr.', 'ryrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']] },
};
const set = (r, x, y, c) => { if (r[y] && r[y][x] !== undefined) r[y][x] = c; };
const MODS = {
  shades: r => { set(r, 12, 5, 'n'); set(r, 13, 5, 'n'); set(r, 14, 5, 'n'); },
  bow: r => { set(r, 11, 3, 'p'); set(r, 11, 2, 'p'); set(r, 12, 2, 'p'); },
  beanie: r => { for (const x of [11, 12, 13, 14]) set(r, x, 3, 'r'); set(r, 12, 2, 'r'); set(r, 13, 2, 'r'); set(r, 13, 1, 'y'); },
  bandana: r => { set(r, 11, 8, 'r'); set(r, 12, 8, 'r'); set(r, 13, 8, 'r'); },
  specs: r => { set(r, 12, 5, 'g'); set(r, 13, 5, 'y'); set(r, 14, 5, 'g'); },
  scarf: r => { set(r, 10, 7, 'c'); set(r, 10, 8, 'c'); set(r, 11, 8, 'c'); },
  bandage: r => { set(r, 5, 3, 'p'); set(r, 4, 4, 'p'); set(r, 5, 4, 'p'); set(r, 6, 4, 'p'); set(r, 5, 5, 'p'); },
  doc: r => { for (const x of [11, 12, 13, 14]) { set(r, x, 2, 'y'); set(r, x, 3, 'y'); } set(r, 13, 2, 'r'); },
  bell: r => { set(r, 11, 9, 'g'); set(r, 11, 10, 'Y'); },
  candle: r => { set(r, 13, 2, 'y'); set(r, 13, 1, 'y'); set(r, 13, 0, 'g'); },
  collar: r => { set(r, 10, 7, 'k'); set(r, 10, 8, 'k'); set(r, 11, 8, 'L'); },
};
const cache = new Map();
function spr(name, fr, flip, mods, swap) {
  const key = `${name}|${fr}|${flip ? 1 : 0}|${mods || ''}|${swap || ''}`;
  let c = cache.get(key);
  if (c) return c;
  const def = SPR[name], rows = def.frames[fr].map(s => s.split(''));
  if (mods) for (const m of mods.split(',')) if (m && MODS[m]) MODS[m](rows);
  const pal = swap ? Object.assign({}, PAL, SWAPS[swap]) : PAL;
  c = mk(rows[0].length, rows.length);
  const x = c.getContext('2d');
  rows.forEach((row, j) => row.forEach((ch, i) => { if (ch !== '.') rect(x, pal[ch] || '#f0f', i, j); }));
  if (def.out) c = outline(c, def.out);
  if (flip) c = mirror(c);
  cache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- people: tall, slender, tiny heads, big noses
const HLOOK = {
  shepherd: { skin: '#f0c69c', skinS: '#d29b70', cloak: '#3f8f93', cloakS: '#2b676b', cloakL: '#68b8b1', tunic: '#f1e4c6',
    belt: '#9a6a3a', legs: '#8a6a50', legsS: '#6b4f3a', shoe: '#5a3a24', beard: '#7a4a2a', out: '#2a2026', nose: 1, staff: true },
  jory: { skin: '#e6b48c', skinS: '#bf8a62', cloak: '#6b4380', cloakS: '#4a2c5c', cloakL: '#9068a8', tunic: '#a29a88',
    belt: '#5a4030', legs: '#4a4448', legsS: '#353035', shoe: '#2e2626', beard: null, out: '#211a22', nose: 3, sack: true, hunch: 1 },
};
HLOOK.joryWatch = Object.assign({}, HLOOK.jory, { sack: false, lantern: true });
// Canvas 20×36. Feet on rows 31–32; the head is only 5×7 on a body about four and a half heads tall.
function buildHuman(L, dir, st, bob) {
  const c = mk(20, 36), x = c.getContext('2d');
  const R = (col, X, Y, w = 1, h = 1) => rect(x, col, X, Y, w, h);
  const u = -bob, hipY = 21 + u, hx = L.hunch || 0;
  const leg = (fromX, toX, col, lift) => {
    const end = 30 - lift;
    for (let y = hipY; y <= end; y++) { const t = (y - hipY) / Math.max(1, end - hipY); R(col, Math.round(fromX + (toX - fromX) * t), y, 2, 1); }
    return Math.round(toX);
  };
  const robe = (side) => {
    for (let i = 0; i <= 12; i++) {
      const y = 11 + u + i, wide = i >= 7 ? 1 : 0, l = 8 - wide, w = 5 + wide * 2;
      R(L.cloak, l, y, w, 1);
      R(L.cloakS, l, y, 1, 1);
      if (side) { if (i >= 2) R(L.tunic, l + w - 1, y, 1, 1); } else R(L.cloakS, l + w - 1, y, 1, 1);
      if (dir === 'down' && i >= 1) R(L.tunic, 9, y, 3, 1);
      if (i === 6) R(L.belt, l, y, w, 1);
    }
    R(L.cloakL, 9, 11 + u, 2, 1);
  };
  if (dir === 'side') {
    const fb = leg(9, 9 - st * 2, L.legsS, 0); R(L.shoe, fb, 31, 3, 1); R(L.shoe, fb, 32, 4, 1);
    if (L.sack) { R('#b08d57', 4, 12 + u, 4, 8); R('#8e6d3e', 4, 18 + u, 4, 2); R('#5a4030', 6, 11 + u, 1, 1); }
    robe(true);
    const ff = leg(10, 10 + st * 2, L.legs, 0); R(L.shoe, ff, 31, 3, 1); R(L.shoe, ff, 32, 4, 1);
    // head
    R(L.cloak, 8 + hx, 3 + u, 4, 2); R(L.cloakL, 9 + hx, 3 + u, 2, 1); R(L.cloak, 8 + hx, 5 + u, 2, 6); R(L.cloakS, 8 + hx, 6 + u, 1, 5);
    R(L.skin, 10 + hx, 5 + u, 3, 5); R(L.cloak, 10 + hx, 4 + u, 3, 1);
    R('#2a1a1a', 11 + hx, 6 + u);
    if (L.nose === 1) R(L.skinS, 13 + hx, 7 + u);
    else { R(L.skin, 13 + hx, 6 + u); R(L.skin, 14 + hx, 7 + u); R(L.skinS, 13 + hx, 7 + u); R(L.skinS, 15 + hx, 8 + u); }
    if (L.beard) { R(L.beard, 10 + hx, 8 + u, 3, 2); R(L.beard, 11 + hx, 10 + u, 2, 1); } else R(L.skinS, 10 + hx, 10 + u, 2, 1);
    // arm
    if (L.staff || L.lantern) { R(L.cloak, 10, 12 + u, 2, 3); R(L.cloakS, 11, 15 + u, 2, 2); R(L.skin, 12, 17 + u, 2, 2); }
    else for (let y = 12; y <= 19; y++) R(y < 18 ? L.cloakS : L.skin, Math.round(10 - st * (y - 12) / 4), y + u, y < 18 ? 2 : 1, 1);
    if (L.lantern) { R('#5a3a24', 13, 19 + u, 3, 1); R('#f5c542', 13, 20 + u, 3, 3); R('#fff2a8', 14, 21 + u); }
  } else {
    const liftL = st > 0 ? 1 : 0, liftR = st < 0 ? 1 : 0;
    leg(8, 8, L.legsS, liftL); R(L.shoe, 8, 31 - liftL, 2, 2);
    leg(11, 11, L.legs, liftR); R(L.shoe, 11, 31 - liftR, 2, 2);
    robe(false);
    // arms: one pixel wide, long
    const armL = 20 + st, armR = 20 - st;
    for (let y = 12; y <= armL; y++) R(y > armL - 2 ? L.skin : L.cloakS, 7, y + u);
    if (L.staff && dir === 'down') { R(L.cloakS, 13, 12 + u, 1, 5); R(L.skin, 13, 17 + u, 2, 2); }
    else for (let y = 12; y <= armR; y++) R(y > armR - 2 ? L.skin : L.cloakS, 13, y + u);
    if (dir === 'down') {
      R(L.cloak, 8, 3 + u, 5, 2); R(L.cloakL, 9, 3 + u, 2, 1); R(L.cloak, 8, 5 + u, 1, 5); R(L.cloak, 12, 5 + u, 1, 5);
      R(L.skin, 9, 5 + u, 3, 5); R(L.cloakS, 9, 4 + u, 3, 1);
      R('#2a1a1a', 9, 6 + u); R('#2a1a1a', 11, 6 + u);
      if (L.nose === 1) R(L.skinS, 10, 7 + u);
      else { R(L.skinS, 10, 7 + u, 1, 3); R(L.skin, 10, 6 + u); }
      if (L.beard) { R(L.beard, 9, 8 + u, 3, 3); R(L.skinS, 10, 7 + u); }
      if (L.sack) { R('#b08d57', 13, 9 + u, 3, 4); R('#8e6d3e', 13, 12 + u, 3, 1); }
      if (L.lantern) { R('#5a3a24', 6, 20 + u, 2, 1); R('#f5c542', 6, 21 + u, 2, 3); }
    } else {
      R(L.cloak, 8, 3 + u, 5, 8); R(L.cloakL, 9, 3 + u, 2, 1); R(L.cloakS, 8, 6 + u, 1, 5); R(L.cloakS, 12, 6 + u, 1, 5);
      if (L.sack) { R('#b08d57', 8, 12 + u, 5, 7); R('#8e6d3e', 8, 17 + u, 5, 2); R('#5a4030', 10, 11 + u); }
    }
  }
  return outline(c, L.out, false);
}
function human(look, dir, st, bob, flip) {
  const key = `h|${look}|${dir}|${st}|${bob}|${flip ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  c = buildHuman(HLOOK[look], dir, st, bob);
  if (flip) c = mirror(c);
  cache.set(key, c);
  return c;
}

// 3×5 pixel font for words that float in the world.
const GLYPH = {
  A: '75755', B: '65656', C: '74447', D: '65556', E: '74647', F: '74644', G: '74557', H: '55755', I: '72227',
  J: '11157', K: '55655', L: '44447', M: '57755', N: '65555', O: '75557', P: '75744', Q: '75571', R: '65655',
  S: '74717', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  0: '75557', 1: '26227', 2: '71747', 3: '71317', 4: '55711', 5: '74717', 6: '74757', 7: '71122', 8: '75757',
  9: '75717', '!': '22202', '?': '71302', '+': '02720', '.': '00002', "'": '22000', '♥': '57720', '-': '00700',
  ' ': '00000', '/': '11244', ',': '00024',
};
function ptext(str, x, y, col = '#fff7e0', out = '#3e2416') {
  str = String(str).toUpperCase();
  const ox = Math.round(x - (str.length * 4 - 1) / 2), oy = Math.round(y);
  const draw = (dx, dy, c) => {
    ctx.fillStyle = c;
    for (let n = 0; n < str.length; n++) {
      const g = GLYPH[str[n]] || GLYPH[' '];
      for (let row = 0; row < 5; row++) for (let b = 0; b < 3; b++) if (+g[row] & (4 >> b)) ctx.fillRect(ox + n * 4 + b + dx, oy + row + dy, 1, 1);
    }
  };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) draw(dx, dy, out);
  draw(0, 0, col);
}

// ---------------------------------------------------------------- the world
const FOLD = { x: 464, y: 240, w: 192, h: 128 };
const GX = FOLD.x + FOLD.w / 2, GATE = 32;
const FIRE = { x: GX + 8, y: FOLD.y + 70 };
const POND = { x: 262, y: 548, r: 36 };
const HUT = { x: 318, y: 252 }; // door, bottom center
const FENCE = [
  [FOLD.x, FOLD.y, FOLD.w, 4],
  [FOLD.x, FOLD.y, 4, FOLD.h],
  [FOLD.x + FOLD.w - 4, FOLD.y, 4, FOLD.h],
  [FOLD.x, FOLD.y + FOLD.h - 4, (FOLD.w - GATE) / 2, 4],
  [FOLD.x + (FOLD.w + GATE) / 2, FOLD.y + FOLD.h - 4, (FOLD.w - GATE) / 2, 4],
];
const RECTS = FENCE.concat([
  [HUT.x - 27, HUT.y - 26, 54, 25],
  [FOLD.x + 150, FOLD.y + 20, 28, 7], // trough
]);
const inFold = (x, y) => x > FOLD.x + 5 && x < FOLD.x + FOLD.w - 5 && y > FOLD.y + 5 && y < FOLD.y + FOLD.h - 5;
const insideFold = e => inFold(e.x, e.y);
const PATHS = [
  [[GX, FOLD.y + FOLD.h - 2], [GX, 430], [600, 520], [572, 640], [590, WH + 12]],
  [[GX, 430], [440, 452], [340, 478], [300, 510]],
  [[400, 446], [336, 330], [HUT.x, HUT.y + 4]],
  [[GX, 430], [720, 420], [840, 380], [980, 300], [WW + 12, 268]],
];
function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const pathDist = (x, y) => Math.min(...PATHS.flatMap(p => p.slice(1).map((b, i) => segDist(x, y, p[i], b))));

const GR = { base: '#78b84a', dark: '#5f9c3c', darker: '#4f8a34', light: '#93cc5c', hi: '#b8e07a' };
let ground, decor = [], IMG = {}, CIRCLES = [];

function makeOak(blossom) {
  const c = mk(36, 48), x = c.getContext('2d');
  rect(x, '#8a5a33', 15, 28, 6, 17); rect(x, '#6b4226', 15, 28, 2, 17); rect(x, '#b07a45', 19, 31, 1, 10);
  rect(x, '#8a5a33', 12, 43, 12, 2); rect(x, '#6b4226', 12, 44, 4, 1);
  for (const [cx, cy, r] of [[18, 18, 15], [9, 22, 8], [27, 22, 8], [18, 8, 9]]) disc(x, cx, cy, r, '#3f7a34');
  for (const [cx, cy, r] of [[16, 15, 12], [10, 20, 6], [24, 18, 7], [17, 8, 7]]) disc(x, cx, cy, r, '#56983f');
  for (const [cx, cy, r] of [[13, 11, 7], [8, 18, 3], [21, 9, 4], [25, 15, 3]]) disc(x, cx, cy, r, '#74b54d');
  for (const [cx, cy, r] of [[11, 8, 2], [19, 6, 1], [7, 16, 1], [24, 13, 1]]) disc(x, cx, cy, r, '#9bd16a');
  if (blossom) for (let i = 0; i < 16; i++) { const a = rand(0, TAU), d = rand(3, 13); rect(x, pick(['#f6b3c8', '#ffffff', '#f6b3c8']), Math.round(18 + Math.cos(a) * d), Math.round(17 + Math.sin(a) * d)); }
  for (let i = 0; i < 18; i++) { const a = rand(0, TAU), d = rand(4, 14); rect(x, '#35692d', Math.round(18 + Math.cos(a) * d), Math.round(20 + Math.abs(Math.sin(a)) * d * 0.7), 2, 1); }
  return outline(c, '#22381f', false);
}
function makePine() {
  const c = mk(28, 50), x = c.getContext('2d');
  rect(x, '#7a4a24', 12, 40, 4, 8); rect(x, '#5a3418', 12, 40, 1, 8);
  for (let k = 0; k < 4; k++) {
    const top = 3 + k * 9;
    for (let r = 0; r < 13; r++) {
      const half = Math.round(1 + r * (0.55 + k * 0.12)), y = top + r;
      rect(x, '#2f6b45', 14 - half, y, half * 2, 1);
      rect(x, '#3f8a55', 14 - half + 1, y, Math.max(1, half - 1), 1);
      if (r % 3 === 0) rect(x, '#62ad6a', 14 - half + 2, y, Math.max(1, Math.floor(half / 2)), 1);
    }
  }
  return outline(c, '#1d3a28', false);
}
function makeBush(berries) {
  const c = mk(22, 16), x = c.getContext('2d');
  for (const [cx, cy, r] of [[7, 9, 6], [14, 9, 6], [10, 6, 5]]) disc(x, cx, cy, r, '#4f9a3c');
  for (const [cx, cy, r] of [[8, 6, 3], [14, 7, 2]]) disc(x, cx, cy, r, '#7cc256');
  rect(x, '#3d7a2e', 4, 13, 14, 1);
  if (berries) for (const [bx, by] of [[6, 10], [12, 8], [15, 11], [9, 12]]) { rect(x, berries, bx, by, 2, 2); rect(x, '#ffffff', bx, by); }
  return outline(c, '#22381f', false);
}
function makeHut(night) {
  const c = mk(62, 66), x = c.getContext('2d');
  rect(x, '#c58d55', 6, 32, 50, 28);
  for (let i = 8; i < 56; i += 6) rect(x, '#a8703f', i, 32, 1, 28);
  rect(x, '#e0aa6c', 6, 32, 50, 1);
  rect(x, '#9a98a8', 6, 56, 50, 5);
  for (let i = 7; i < 55; i += 7) rect(x, '#76748a', i, 57 + (i % 2), 4, 2);
  rect(x, '#7a4a24', 25, 42, 12, 19); rect(x, '#5a3418', 30, 42, 1, 19); rect(x, '#5a3418', 25, 42, 12, 1); rect(x, '#f5c542', 34, 52, 1, 2);
  rect(x, '#5a3418', 41, 39, 11, 10);
  rect(x, night ? '#ffd36a' : '#a8d8f0', 42, 40, 9, 8);
  rect(x, night ? '#fff2a8' : '#d8f0fa', 43, 41, 3, 2);
  rect(x, '#5a3418', 46, 40, 1, 8); rect(x, '#5a3418', 42, 44, 9, 1);
  rect(x, '#8a5a33', 40, 49, 13, 2); rect(x, '#d8574f', 42, 48, 2, 1); rect(x, '#f5c542', 46, 48, 2, 1); rect(x, '#ef9aa0', 50, 48, 2, 1);
  rect(x, '#8a8898', 43, 2, 7, 16); rect(x, '#6b697a', 43, 2, 7, 2); rect(x, '#a9a7b6', 44, 5, 2, 1);
  for (let y = 8; y <= 34; y++) {
    const inset = Math.round((34 - y) / 2.6), l = 1 + inset, w = 60 - inset * 2;
    const row = Math.floor((y - 8) / 4);
    rect(x, row % 2 ? '#b34f3f' : '#9e4334', l, y, w, 1);
    if ((y - 8) % 4 === 3) rect(x, '#7a2e26', l, y, w, 1);
    if ((y - 8) % 4 === 0) for (let i = l + (row % 2 ? 2 : 5); i < l + w - 1; i += 7) rect(x, '#d06a52', i, y, 2, 1);
  }
  rect(x, '#7a2e26', 20, 7, 22, 2);
  return outline(c, '#2e1a14', false);
}
function makeShelter() {
  const c = mk(84, 42), x = c.getContext('2d');
  rect(x, '#8a5a33', 5, 16, 3, 24); rect(x, '#6b4226', 7, 16, 1, 24);
  rect(x, '#8a5a33', 76, 16, 3, 24); rect(x, '#6b4226', 78, 16, 1, 24);
  for (let y = 3; y <= 18; y++) {
    const row = Math.floor((y - 3) / 3);
    rect(x, row % 2 ? '#a8703f' : '#94603a', 1, y, 82, 1);
    if ((y - 3) % 3 === 2) rect(x, '#6b4226', 1, y, 82, 1);
    if ((y - 3) % 3 === 0) for (let i = 3 + (row % 2) * 4; i < 82; i += 9) rect(x, '#c48d55', i, y, 3, 1);
  }
  return outline(c, '#3e2416', false);
}
function makeTrough() {
  const c = mk(28, 11), x = c.getContext('2d');
  rect(x, '#8a5a33', 0, 2, 28, 8); rect(x, '#6b4226', 0, 7, 28, 3); rect(x, '#4aa3d8', 2, 3, 24, 3); rect(x, '#a8dcf5', 4, 3, 6, 1);
  rect(x, '#6b4226', 2, 10, 3, 1); rect(x, '#6b4226', 23, 10, 3, 1);
  return outline(c, '#3e2416');
}
function makeHay() {
  const c = mk(14, 11), x = c.getContext('2d');
  rect(x, '#e3c35a', 0, 0, 14, 11); rect(x, '#f5dd8a', 0, 0, 14, 2); rect(x, '#c9a03e', 0, 9, 14, 2);
  for (let i = 1; i < 14; i += 3) rect(x, '#c9a03e', i, 3, 1, 5);
  rect(x, '#8a5a33', 4, 0, 1, 11); rect(x, '#8a5a33', 10, 0, 1, 11);
  return outline(c, '#5a3a14');
}
function makeStump() {
  const c = mk(12, 8), x = c.getContext('2d');
  rect(x, '#8a5a33', 1, 2, 10, 6); rect(x, '#e0b97c', 2, 1, 8, 3); rect(x, '#b08550', 4, 2, 4, 1);
  rect(x, '#6b4226', 0, 7, 12, 1);
  return outline(c, '#3e2416');
}

function buildWorld() {
  IMG = { oak: makeOak(false), blossom: makeOak(true), pine: makePine(), bush: makeBush(null), berry: makeBush('#d8574f'),
    blue: makeBush('#6a7fd8'), hutDay: makeHut(false), hutNight: makeHut(true), shelter: makeShelter(), trough: makeTrough(),
    hay: makeHay(), stump: makeStump() };
  ground = mk(WW, WH);
  const g = ground.getContext('2d');
  rect(g, GR.base, 0, 0, WW, WH);
  // soft patches of darker and lighter grass with dithered edges
  for (let i = 0; i < 90; i++) {
    const cx = rand(0, WW), cy = rand(0, WH), r = Math.floor(rand(10, 34)), col = pick([GR.dark, GR.dark, GR.light]);
    disc(g, cx, cy, r, col);
    for (let k = 0; k < r * 5; k++) { const a = rand(0, TAU), d = r + rand(0, 3); if ((k & 1) === 0) rect(g, col, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d)); }
  }
  // grass tufts, one or two per tile
  for (let ty = 0; ty < WH; ty += 16) for (let tx = 0; tx < WW; tx += 16) {
    const n = Math.random() < 0.6 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const x = tx + Math.floor(rand(1, 12)), y = ty + Math.floor(rand(2, 13));
      for (const [dx, dy] of [[0, 2], [1, 1], [2, 2], [3, 1], [4, 2]]) rect(g, GR.darker, x + dx, y + dy);
      rect(g, GR.hi, x + 1, y); rect(g, GR.hi, x + 3, y);
    }
  }
  // flowers
  for (let i = 0; i < 340; i++) {
    const x = Math.floor(rand(4, WW - 4)), y = Math.floor(rand(4, WH - 4)), col = pick(['#ffffff', '#f5c542', '#ef9aa0', '#a9c4ff', '#ffffff']);
    rect(g, col, x - 1, y); rect(g, col, x + 1, y); rect(g, col, x, y - 1); rect(g, col, x, y + 1);
    rect(g, col === '#f5c542' ? '#e07a2e' : '#f5c542', x, y); rect(g, GR.darker, x, y + 2);
  }
  // dirt paths with a dark grass rim
  const stroke = (pts, r, col) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
      for (let k = 0; k <= n; k++) { const t = k / n; disc(g, ax + (bx - ax) * t, ay + (by - ay) * t, r, col); }
    }
  };
  for (const p of PATHS) stroke(p, 10, GR.darker);
  for (const p of PATHS) stroke(p, 8, '#b5834c');
  for (const p of PATHS) stroke(p, 7, '#cf9f62');
  for (let i = 0; i < 2600; i++) {
    const x = rand(0, WW), y = rand(0, WH);
    if (pathDist(x, y) < 6) rect(g, pick(['#ddb57a', '#b5834c', '#e8c690', '#a57a48']), Math.floor(x), Math.floor(y), Math.random() < 0.3 ? 2 : 1, 1);
  }
  // the pond (still waters, a teaser for Chapter 2)
  disc(g, POND.x, POND.y + 2, POND.r + 5, GR.darker);
  disc(g, POND.x, POND.y, POND.r + 3, '#e3c88f');
  disc(g, POND.x, POND.y + 1, POND.r + 1, '#2f6e9e');
  disc(g, POND.x, POND.y, POND.r, '#4aa3d8');
  disc(g, POND.x + 4, POND.y + 5, POND.r - 10, '#3d8cc4');
  for (let i = 0; i < 10; i++) rect(g, '#a8dcf5', Math.floor(POND.x + rand(-22, 14)), Math.floor(POND.y + rand(-20, 18)), Math.floor(rand(3, 7)), 1);
  for (const [lx, ly, fl] of [[-14, -10, 1], [10, 12, 0], [16, -16, 1], [-20, 14, 0]]) {
    disc(g, POND.x + lx, POND.y + ly, 3, '#5fae4a'); rect(g, '#4aa3d8', POND.x + lx + 1, POND.y + ly - 3, 1, 3); rect(g, '#86cc62', POND.x + lx - 2, POND.y + ly - 1, 2, 1);
    if (fl) { rect(g, '#f6b3c8', POND.x + lx - 1, POND.y + ly - 1, 2, 2); rect(g, '#ffffff', POND.x + lx - 1, POND.y + ly - 1); }
  }
  for (let i = 0; i < 26; i++) {
    const a = rand(Math.PI * 0.8, Math.PI * 2.2), rx = Math.round(POND.x + Math.cos(a) * (POND.r + 4)), ry = Math.round(POND.y + Math.sin(a) * (POND.r + 4));
    rect(g, '#3d7a2e', rx, ry - 5, 1, 6); rect(g, '#8a5a33', rx, ry - 6, 1, 2);
  }
  // the fold: straw floor
  rect(g, '#b8954a', FOLD.x, FOLD.y, FOLD.w, FOLD.h);
  rect(g, '#dcb965', FOLD.x + 2, FOLD.y + 2, FOLD.w - 4, FOLD.h - 4);
  for (let i = 0; i < 1400; i++) {
    const sx = Math.floor(FOLD.x + rand(3, FOLD.w - 6)), sy = Math.floor(FOLD.y + rand(3, FOLD.h - 5));
    rect(g, pick(['#c9a352', '#f0d88c', '#c9a352', '#e8c878']), sx, sy, Math.random() < 0.6 ? 3 : 2, 1);
  }
  g.fillStyle = 'rgba(90,60,20,.22)'; g.fillRect(FOLD.x + 12, FOLD.y + 22, 80, 20); // shade under the shelter roof
  for (let a = 0; a < 10; a++) { // fire ring stones
    const sx = Math.round(FIRE.x + Math.cos(a / 10 * TAU) * 8), sy = Math.round(FIRE.y + Math.sin(a / 10 * TAU) * 5);
    rect(g, '#5a5868', sx - 2, sy - 1, 4, 3); rect(g, '#9a98a8', sx - 1, sy - 1, 3, 2); rect(g, '#c4c3cf', sx - 1, sy - 1);
  }
  rect(g, '#5a4a3a', FIRE.x - 5, FIRE.y - 2, 10, 4);
  for (let i = 0; i < 34; i++) { // rocks
    const x = rand(20, WW - 20), y = rand(20, WH - 20);
    if (Math.hypot(x - GX, y - (FOLD.y + 64)) < 140 || Math.hypot(x - POND.x, y - POND.y) < 50 || pathDist(x, y) < 12) continue;
    const r = Math.random() < 0.3 ? 4 : 3;
    rect(g, 'rgba(38,52,24,.3)', Math.round(x) - r, Math.round(y) + r - 1, r * 2 + 1, 2);
    disc(g, x, y, r + 1, '#3d3b4a'); disc(g, x, y, r, '#8f8da0'); disc(g, x - 1, y - 1, r - 1, '#aeadbd'); rect(g, '#d6d5e0', Math.round(x) - 2, Math.round(y) - 2);
  }

  // y-sorted scenery
  decor = [];
  decor.push({ x: HUT.x, y: HUT.y, ox: 31, oy: 63, img: 'hut' });
  decor.push({ x: FOLD.x + 52, y: FOLD.y + 42, ox: 42, oy: 41, img: 'shelter' });
  decor.push({ x: FOLD.x + 164, y: FOLD.y + 27, ox: 15, oy: 12, img: 'trough' });
  for (const [hx, hy] of [[FOLD.x + 16, FOLD.y + 60], [FOLD.x + 30, FOLD.y + 64], [FOLD.x + 22, FOLD.y + 54]]) decor.push({ x: hx, y: hy, ox: 8, oy: 12, img: 'hay' });
  decor.push({ x: FIRE.x, y: FIRE.y + 2, fire: true });
  decor.push({ x: HUT.x + 40, y: HUT.y - 4, ox: 11, oy: 15, img: 'berry', r: 6 });
  decor.push({ x: HUT.x - 42, y: HUT.y - 2, ox: 11, oy: 15, img: 'bush', r: 6 });
  const clear = (x, y, m) => !(x > FOLD.x - m && x < FOLD.x + FOLD.w + m && y > FOLD.y - m && y < FOLD.y + FOLD.h + m + 30)
    && Math.hypot(x - POND.x, y - POND.y) > POND.r + 16 && Math.hypot(x - HUT.x, y - HUT.y + 30) > 56 && pathDist(x, y) > 16
    && !decor.some(o => Math.hypot(o.x - x, o.y - y) < (o.tree ? 28 : 16));
  let tries = 0, trees = 0;
  while (trees < 52 && tries++ < 3000) {
    const x = rand(16, WW - 16), y = rand(46, WH - 4);
    if (!clear(x, y, 46)) continue;
    const kind = pick(['oak', 'oak', 'pine', 'pine', 'blossom']);
    decor.push({ x, y, r: 5, tree: true, img: kind, ox: kind === 'pine' ? 14 : 18, oy: kind === 'pine' ? 47 : 45 });
    trees++;
  }
  tries = 0;
  for (let n = 0; n < 40 && tries++ < 1500;) {
    const x = rand(16, WW - 16), y = rand(20, WH - 4);
    if (!clear(x, y, 24)) continue;
    const kind = pick(['bush', 'bush', 'berry', 'blue', 'stump']);
    decor.push(kind === 'stump' ? { x, y, ox: 7, oy: 9, img: 'stump', r: 4 } : { x, y, ox: 11, oy: 15, img: kind, r: 6 });
    n++;
  }
  CIRCLES = decor.filter(o => o.r).concat([POND]);
}

function collide(e, r) {
  e.x = clamp(e.x, 6, WW - 6); e.y = clamp(e.y, 10, WH - 3);
  for (const [x, y, w, h] of RECTS) {
    const cx = clamp(e.x, x, x + w), cy = clamp(e.y, y, y + h);
    const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d === 0) { e.y += (e.y < y + h / 2 ? -r : r); continue; }
      e.x = cx + dx / d * r; e.y = cy + dy / d * r;
    }
  }
  for (const o of CIRCLES) {
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), m = o.r + r;
    if (d < m && d > 0) { e.x = o.x + dx / d * m; e.y = o.y + dy / d * m; }
  }
}

// Route through the gate when the target is on the other side of the fence.
function nav(e, tx, ty) {
  const a = insideFold(e), b = inFold(tx, ty);
  if (a === b) return [tx, ty];
  const outY = FOLD.y + FOLD.h + 10, inY = FOLD.y + FOLD.h - 18;
  const first = a ? inY : outY, second = a ? outY : inY;
  if (Math.abs(e.x - GX) < 10 && Math.abs(e.y - first) < 13) return [GX, second];
  if (!a && e.y < FOLD.y + FOLD.h && e.y > FOLD.y - 8 && (e.x < FOLD.x || e.x > FOLD.x + FOLD.w)) return [e.x < GX ? FOLD.x - 10 : FOLD.x + FOLD.w + 10, outY + 4];
  if (!a && e.y < FOLD.y + 4) return [e.x < GX ? FOLD.x - 12 : FOLD.x + FOLD.w + 12, FOLD.y + 20];
  return [GX, first];
}
function steer(e, tx, ty, speed, dt, arrive = 8) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  let vx = 0, vy = 0;
  if (d > 0.5) { const sp = d < arrive ? speed * d / arrive : speed; vx = dx / d * sp; vy = dy / d * sp; }
  const k = Math.min(1, dt * 7);
  e.vx += (vx - e.vx) * k; e.vy += (vy - e.vy) * k;
}
function move(e, dt, r = 4) {
  e.x += (e.vx + (e.kx || 0)) * dt; e.y += (e.vy + (e.ky || 0)) * dt;
  if (e.kx) { e.kx -= e.kx * Math.min(1, dt * 6); e.ky -= e.ky * Math.min(1, dt * 6); }
  if (Math.abs(e.vx) > 4) e.face = e.vx > 0 ? 1 : -1;
  if (Math.hypot(e.vx, e.vy) > 6) e.dir = Math.abs(e.vy) > Math.abs(e.vx) * 1.2 ? (e.vy < 0 ? 'up' : 'down') : 'side';
  e.anim = (e.anim || 0) + Math.hypot(e.vx, e.vy) * dt;
  collide(e, r);
}
function knock(e, from, force) {
  const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1;
  e.kx = dx / d * force; e.ky = dy / d * force;
}

// ---------------------------------------------------------------- game state
const NAMES = shuffle(['Fleecia', 'Clover', 'Biscuit', 'Pepper', 'Nugget', 'Ewegene', 'Barley', 'Tumbleweed', 'Sprout',
  'Velvet', 'Flapjack', 'Ziggy', 'Marmalade', 'Pebble', 'Juniper', 'Cosmo', 'Waffles', 'Dottie', 'Mabel', 'Gus',
  'Tater', 'Noodle', 'Honey', 'Rufus']);
const LOOKS = ['', '', '', 'shades', 'bow', 'beanie', 'bandana', 'specs', 'scarf'];
const NIGHTS = [null, { day: 100, night: 45, wolves: 5, fear: 3 }, { day: 90, night: 60, wolves: 10, fear: 3 }, { day: 90, night: 75, wolves: 15, fear: 4 }];

let G, sh, sheep, wolves, hearts, fx, shots, dogs, jory;
let S;
let mode = 'title';
function newGame() {
  S = { speed: 74, staffRange: 26, staffCd: 1.0, lantern: 46, lanternLvl: 1, callR: 40, trustRate: 0.55, sling: 0, harp: 0, taken: {} };
  sh = { x: GX, y: FOLD.y + FOLD.h + 30, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, dir: 'down', anim: 0, stun: 0, staffT: 0, slingT: 0, harpT: 4, whistleT: 0, moving: false, swing: 0 };
  sheep = []; wolves = []; hearts = []; fx = []; shots = []; dogs = []; jory = null;
  G = {
    day: 1, phase: 'day', t: 0, len: NIGHTS[1].day, xp: 0, lv: 1, spawns: [], shake: 0, nameI: 0, smokeT: 0,
    roles: { lookout: null, doc: null, lamp: null }, flags: {},
    stats: { found: 0, joined: 0, turned: 0, forgiven: 0, scattered: 0 },
    lvPending: 0,
  };
  const starters = [['Woolsworth', 'shades'], ['Baabara', 'bow'], ['Ramsey', 'beanie']];
  starters.forEach(([n, l], i) => { const s = addSheep(sh.x - 16 + i * 14, sh.y + 12, n, l); s.state = 'follow'; });
  for (let i = 0; i < 12; i++) spawnWild(170, i < 6 ? 360 : 560);
}
function nextName() { return NAMES[G.nameI++ % NAMES.length]; }
function addSheep(x, y, name, look) {
  const s = { x, y, vx: 0, vy: 0, kx: 0, ky: 0, face: Math.random() < 0.5 ? 1 : -1, anim: 0, name, look: look ?? pick(LOOKS),
    state: 'wild', trust: 0, lost: false, hurt: false, heal: 0, role: null, ax: x, ay: y, tx: x, ty: y, wt: 0, scaredT: 0, baaT: rand(3, 12), bite: 0 };
  sheep.push(s);
  return s;
}
function spawnWild(minD, maxD) {
  for (let tries = 0; tries < 80; tries++) {
    const a = rand(0, TAU), d = rand(minD, maxD);
    const x = clamp(GX + Math.cos(a) * d, 24, WW - 24), y = clamp(FOLD.y + 64 + Math.sin(a) * d * 0.8, 30, WH - 14);
    if (CIRCLES.some(t => Math.hypot(t.x - x, t.y - y) < t.r + 8)) continue;
    if (x > FOLD.x - 20 && x < FOLD.x + FOLD.w + 20 && y > FOLD.y - 20 && y < FOLD.y + FOLD.h + 30) continue;
    if (Math.abs(x - HUT.x) < 40 && y > HUT.y - 40 && y < HUT.y + 10) continue;
    const n = Math.random() < 0.35 ? 2 : 1;
    for (let k = 0; k < n; k++) addSheep(x + k * 12, y + k * 4, nextName());
    return;
  }
}

// ---------------------------------------------------------------- audio (all synthesized)
const A = { ctx: null, out: null, mus: null, muted: false, music: true, step: 0, next: 0, track: 'day', noise: null };
function audioInit() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  A.out = A.ctx.createGain(); A.out.gain.value = 0.5; A.out.connect(A.ctx.destination);
  A.mus = A.ctx.createGain(); A.mus.gain.value = 0.32; A.mus.connect(A.out);
  const len = A.ctx.sampleRate * 0.2; A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
  const d = A.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.next = A.ctx.currentTime + 0.1;
  setInterval(schedule, 25);
}
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function note(t, f, d, type = 'square', v = 0.1, dest = A.out, slide = 0) {
  if (!A.ctx) return;
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.02);
}
function hat(t, v = 0.03, d = 0.04, freq = 7000) {
  if (!A.ctx) return;
  const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain();
  s.buffer = A.noise; f.type = 'highpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(A.mus); s.start(t); s.stop(t + d + 0.02);
}
const TRACKS = {
  day: { bpm: 104,
    bass: [41, 0, 0, 41, 0, 0, 53, 0, 41, 0, 44, 45, 0, 48, 0, 0, 46, 0, 0, 46, 0, 0, 58, 0, 46, 0, 48, 50, 0, 53, 0, 0],
    lead: [77, 0, 0, 0, 72, 0, 74, 0, 0, 0, 77, 0, 79, 0, 0, 0, 77, 0, 0, 0, 74, 0, 72, 0, 0, 0, 70, 0, 72, 0, 0, 0], kick: true },
  night: { bpm: 84,
    bass: [45, 0, 0, 0, 0, 0, 45, 0, 48, 0, 0, 0, 47, 0, 0, 0, 41, 0, 0, 0, 0, 0, 41, 0, 43, 0, 0, 0, 44, 0, 0, 0],
    lead: [0, 0, 0, 0, 76, 0, 0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74, 0, 0, 0, 0, 0, 71, 0, 0, 0, 0, 0], kick: false },
};
function schedule() {
  if (!A.ctx) return;
  while (A.next < A.ctx.currentTime + 0.12) {
    const tr = TRACKS[A.track], i = A.step % 32, t = A.next;
    if (A.music && !A.muted && mode !== 'paused') {
      if (tr.bass[i]) note(t, mf(tr.bass[i]), 0.22, 'triangle', 0.5, A.mus);
      if (tr.lead[i]) note(t, mf(tr.lead[i]), 0.16, 'square', 0.06, A.mus);
      if (i % 2 === 1) hat(t, tr.kick ? 0.045 : 0.025);
      if (tr.kick && i % 8 === 0) note(t, 120, 0.12, 'sine', 0.5, A.mus, -80);
      if (tr.kick && i % 8 === 4) hat(t, 0.11, 0.09, 1800);
      if (!tr.kick && i % 16 === 0) note(t, 90, 0.3, 'sine', 0.35, A.mus, -40);
    }
    A.next += 60 / tr.bpm / 4; A.step++;
  }
}
const sfxOk = () => A.ctx && !A.muted;
const sfx = {
  heart() { if (sfxOk()) { const t = A.ctx.currentTime; note(t, 988, 0.06, 'square', 0.06); note(t + 0.05, 1319, 0.08, 'square', 0.06); } },
  join() { if (sfxOk()) { const t = A.ctx.currentTime; [72, 76, 79, 84].forEach((m, i) => note(t + i * 0.07, mf(m), 0.12, 'square', 0.07)); } },
  swing() { if (sfxOk()) note(A.ctx.currentTime, 420, 0.08, 'triangle', 0.14, A.out, -260); },
  bark() { if (sfxOk()) { const t = A.ctx.currentTime; note(t, 330, 0.07, 'square', 0.08, A.out, -120); note(t + 0.1, 330, 0.07, 'square', 0.08, A.out, -120); } },
  bell() { if (sfxOk()) { const t = A.ctx.currentTime; note(t, 1568, 0.5, 'triangle', 0.12); note(t + 0.18, 1568, 0.5, 'triangle', 0.1); } },
  whistle() { if (sfxOk()) { const t = A.ctx.currentTime; note(t, 1700, 0.14, 'sine', 0.12, A.out, 600); note(t + 0.16, 2300, 0.18, 'sine', 0.12, A.out, -500); } },
  hurt() { if (sfxOk()) note(A.ctx.currentTime, 180, 0.18, 'sawtooth', 0.09, A.out, -90); },
  yelp() { if (sfxOk()) note(A.ctx.currentTime, 900, 0.12, 'square', 0.05, A.out, 500); },
  level() { if (sfxOk()) { const t = A.ctx.currentTime; [60, 64, 67, 72, 76, 79].forEach((m, i) => note(t + i * 0.06, mf(m), 0.14, 'square', 0.07)); } },
  baa() { if (sfxOk()) { const t = A.ctx.currentTime; const o = A.ctx.createOscillator(), g = A.ctx.createGain(), l = A.ctx.createOscillator(), lg = A.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 330; l.frequency.value = 22; lg.gain.value = 18; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(A.out); o.start(t); l.start(t); o.stop(t + 0.4); l.stop(t + 0.4); } },
  forgive() { if (sfxOk()) { const t = A.ctx.currentTime; [[65, 69, 72], [67, 71, 74], [72, 76, 79, 84]].forEach((ch, i) => ch.forEach(m => note(t + i * 0.32, mf(m), 0.7, 'triangle', 0.08))); } },
};

// ---------------------------------------------------------------- UI helpers
const ui = $('ui'), stage = $('stage');
let scale = 1;
function resize() {
  const aw = Math.max(100, document.documentElement.clientWidth - 40), ah = Math.max(60, window.innerHeight - 20);
  let s = Math.min(aw / W, ah / H);
  if (s >= 2) s = Math.floor(s);
  scale = s;
  stage.style.width = W * s + 'px'; stage.style.height = H * s + 'px';
  ui.style.transform = `scale(${W * s / UIW})`;
}
addEventListener('resize', resize);

let toastT = 0;
function toast(msg, secs = 3.2) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); toastT = secs; }
function banner(big, small = '') {
  const el = $('banner'); el.classList.remove('on'); void el.offsetWidth;
  el.textContent = big; if (small) { const s = document.createElement('small'); s.textContent = small; el.append(s); }
  el.classList.add('on');
}
function pop(x, y, text, col = '#fff7e0', life = 1.1) { fx.push({ kind: 'text', x, y, text, col, t: 0, life }); }
function ring(x, y, r, col, life = 0.45) { fx.push({ kind: 'ring', x, y, r, col, t: 0, life }); }

// Dialogue: a queue of scenes. Each scene is lines plus an optional final single choice.
function portraitOf(key) {
  if (key === 'shepherd') return { name: 'The Shepherd', human: 'shepherd' };
  if (key === 'jory') return { name: 'Jory', human: jory && jory.state === 'redeemed' ? 'joryWatch' : 'jory' };
  return { name: key, sheep: sheep.find(q => q.name === key) };
}
function drawPortrait(who) {
  const p = $('portrait').getContext('2d');
  p.imageSmoothingEnabled = false;
  rect(p, '#cfe3c4', 0, 0, 34, 34); rect(p, '#b5d6a6', 0, 24, 34, 10);
  if (who.human) p.drawImage(human(who.human, 'down', 0, 0, false), 3, 1, 15, 17, 2, 2, 30, 34);
  else { const s = who.sheep; p.drawImage(spr('sheep', 0, false, s ? modsFor(s) : '', s && s.isChomp ? 'chomp' : null), 1, 4, 32, 26); }
}
let scenes = [], dlg = null, prevMode = 'play', inDone = false;
function say(lines, opts = {}) { scenes.push({ lines, ...opts }); if (!dlg && !inDone) nextScene(); }
function nextScene() {
  dlg = scenes.shift() || null;
  if (!dlg) { $('dialog').hidden = true; if (mode === 'dialog') mode = prevMode; return; }
  if (mode !== 'dialog') prevMode = mode === 'title' ? 'play' : mode;
  mode = 'dialog';
  dlg.i = -1; $('dialog').hidden = false; nextLine();
}
function nextLine() {
  dlg.i++;
  if (dlg.i >= dlg.lines.length) {
    const d = dlg; dlg = null;
    inDone = true; try { if (d.done) d.done(); } finally { inDone = false; }
    nextScene(); return;
  }
  const [who, text] = dlg.lines[dlg.i];
  const w = portraitOf(who);
  $('dname').textContent = w.name;
  drawPortrait(w);
  dlg.text = text; dlg.shown = 0;
  $('dline').textContent = '';
  $('dchoices').innerHTML = '';
  $('dnext').hidden = true;
}
function finishLine() {
  dlg.shown = dlg.text.length; $('dline').textContent = dlg.text;
  const last = dlg.i === dlg.lines.length - 1;
  if (last && dlg.choice && !$('dchoices').firstChild) {
    const b = document.createElement('button');
    b.className = 'btn forgive'; b.type = 'button'; b.textContent = dlg.choice;
    b.addEventListener('pointerdown', e => { e.stopPropagation(); advance(); });
    $('dchoices').append(b); b.focus({ preventScroll: true });
  } else $('dnext').hidden = false;
}
function advance() {
  if (!dlg) return;
  if (dlg.shown < dlg.text.length) { finishLine(); return; }
  if (dlg.i === dlg.lines.length - 1 && dlg.choice) { const c = dlg.onChoice; dlg.choice = null; if (c) c(); }
  nextLine();
}
function tickDialog(dt) {
  if (!dlg || dlg.shown >= dlg.text.length) return;
  dlg.shown = Math.min(dlg.text.length, dlg.shown + dt * 55);
  $('dline').textContent = dlg.text.slice(0, Math.floor(dlg.shown));
  if (dlg.shown >= dlg.text.length) finishLine();
}

// ---------------------------------------------------------------- level-ups (Knacks)
const KNACKS = [
  { id: 'staff', name: 'Longer Staff', desc: 'Reach the ones just out of reach.', max: 4, apply() { S.staffRange += 6; } },
  { id: 'quick', name: 'Quick Hands', desc: 'Swing the staff more often.', max: 4, apply() { S.staffCd *= 0.8; } },
  { id: 'lantern', name: 'Brighter Lantern', desc: 'The dark has to back off a little more.', max: 4, apply() { S.lantern += 11; S.lanternLvl += 0.6; } },
  { id: 'sandals', name: 'Swift Sandals', desc: 'Shepherding is a cardio sport.', max: 3, apply() { S.speed += 10; } },
  { id: 'voice', name: 'Kind Voice', desc: 'Wild sheep trust you faster, from farther off.', max: 3, apply() { S.callR += 10; S.trustRate *= 1.35; } },
  { id: 'sling', name: 'Sling', desc: 'Pebbles that say "not today." A shepherd boy made this famous.', max: 4, apply() { S.sling++; } },
  { id: 'harp', name: 'Harp Song', desc: 'A tune that makes wolves rethink their choices.', max: 3, apply() { S.harp++; } },
  { id: 'goodness', name: 'Goodness', desc: 'A very good dog. Follows you everywhere.', max: 1, apply() { addDog('goodness'); } },
  { id: 'mercy', name: 'Mercy', desc: 'Goodness has a sister. She follows you too.', max: 1, req: 'goodness', apply() { addDog('mercy'); } },
];
const needXP = lv => 2 + lv * 2;
function addXP(n) { G.xp += n; while (G.xp >= needXP(G.lv)) { G.xp -= needXP(G.lv); G.lv++; G.lvPending++; } }
function openLevelUp() {
  G.lvPending--;
  const pool = KNACKS.filter(k => (S.taken[k.id] || 0) < k.max && (!k.req || S.taken[k.req]));
  const choices = shuffle(pool.slice()).slice(0, 3);
  if (!choices.length) return;
  prevMode = 'play'; mode = 'levelup'; sfx.level();
  const box = $('cards'); box.innerHTML = '';
  choices.forEach((k, i) => {
    const b = document.createElement('button');
    b.className = 'card wood'; b.type = 'button';
    const lvl = (S.taken[k.id] || 0) + 1;
    b.innerHTML = `<b></b><span></span><em>${k.max > 1 ? 'Lv ' + lvl + '/' + k.max : 'New friend'} · key ${i + 1}</em>`;
    b.querySelector('b').textContent = k.name; b.querySelector('span').textContent = k.desc;
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.addEventListener('click', () => chooseKnack(k));
    box.append(b);
  });
  $('levelup').hidden = false;
  box.firstChild.focus({ preventScroll: true });
  $('levelup').choices = choices;
}
function chooseKnack(k) {
  if (mode !== 'levelup') return;
  $('levelup').hidden = true; mode = 'play';
  S.taken[k.id] = (S.taken[k.id] || 0) + 1; k.apply();
  toast(k.name + (S.taken[k.id] > 1 ? ' ' + S.taken[k.id] : '') + '!');
}
function addDog(kind) {
  dogs.push({ kind, x: sh.x, y: sh.y + 6, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, anim: 0, cd: 0, dash: null });
  sfx.bark();
  if (kind === 'goodness') say([['Woolsworth', 'A DOG? Boss. Boss. Is that a dog.'], ['shepherd', 'Her name is Goodness. She stays with us.'], ['Woolsworth', 'I have never felt so safe and so threatened at the same time.']]);
  else say([['Baabara', "There's TWO of them now?"], ['shepherd', "Goodness and Mercy. They'll follow you all your days."]]);
}

// ---------------------------------------------------------------- flock logic
function modsFor(s) {
  const m = [s.look];
  if (s.hurt) m.push('bandage');
  if (s.role === 'doc') m.push('doc');
  if (s.role === 'lookout') m.push('bell');
  if (s.role === 'lamp') m.push('candle');
  if (s.role === 'guard') m.push('collar');
  return m.filter(Boolean).join(',');
}
function joinFlock(s) {
  s.state = 'follow'; s.trust = 0;
  if (s.lost) {
    s.lost = false; G.stats.found++;
    pop(s.x, s.y - 18, 'FOUND', '#f5c542');
    toast(`${s.name} knew your voice.`);
  } else {
    G.stats.joined++;
    pop(s.x, s.y - 18, '♥', '#ef9aa0');
    if (!G.flags.firstJoin) { G.flags.firstJoin = true; toast(`${s.name} joined the flock! Walk them through the gate.`, 4); }
    else toast(`${s.name} joined the flock!`);
  }
  dropHearts(s.x, s.y, 2); sfx.join();
}
function goHome(s) {
  s.state = 'home'; s.wt = 0;
  if (!G.flags.firstHome) {
    G.flags.firstHome = true;
    say([['Woolsworth', 'Home sweet home. Smells like hay and victory.'], ['Baabara', 'There are so many more of us out there, though.'], ['shepherd', "Then I'll keep going out. Every one of them."]]);
  }
}
function scare(s, by) {
  if (s.state === 'chomp') return;
  const wasOut = !insideFold(s);
  s.from = { x: by.x, y: by.y }; s.scaredT = wasOut ? 2.4 : 1.4; s.state = 'scared'; s.hurt = true;
  if (s.role && wasOut) clearRole(s);
  pop(s.x, s.y - 18, '!', '#d8574f'); sfx.hurt();
  if (wasOut) {
    G.stats.scattered++;
    if (!G.flags.firstScatter) { G.flags.firstScatter = true; toast(`${s.name} got scared and ran off. Go find them.`, 4); }
  }
}
function clearRole(s) { for (const k in G.roles) if (G.roles[k] === s) G.roles[k] = null; s.role = null; }
function dropHearts(x, y, n) { for (let i = 0; i < n; i++) hearts.push({ x: x + rand(-4, 4), y: y + rand(-4, 2), vx: rand(-30, 30), vy: rand(-40, -10), t: 0 }); }

const ROLE_LINES = {
  lookout: n => [[n, "I'll be lookout. I brought my own bell."], ['shepherd', 'Thank you. Ring it if anything comes.'], [n, 'Oh, I will ring it. Constantly.']],
  doc: n => [[n, "Some of us got nicked up out there. I'll be the doc."], ['Woolsworth', 'Where did you get a stethoscope?'], [n, 'Nobody asks the doc where the doc gets things.']],
  lamp: n => [[n, "I'll keep the fire going. Fire good. Dark bad. That's the whole job."], ['shepherd', "Wolves don't like a bright fire. Good thinking."]],
};
function checkRoles() {
  const home = sheep.filter(s => s.state === 'home' && insideFold(s));
  const free = home.filter(s => !s.role && !s.hurt && !s.isChomp);
  const assign = (role, need) => {
    if (G.roles[role] || home.length < need || !free.length) return;
    const s = free.shift(); s.role = role; G.roles[role] = s;
    pop(s.x, s.y - 18, role === 'lamp' ? 'LAMPLIGHTER' : role.toUpperCase(), '#f5c542', 1.8);
    if (!G.flags['role_' + role]) { G.flags['role_' + role] = true; say(ROLE_LINES[role](s.name)); }
    else toast(`${s.name} took over as ${role === 'lamp' ? 'lamplighter' : role}.`);
  };
  assign('lookout', 3); assign('doc', 5); assign('lamp', 8);
  const c = sheep.find(s => s.isChomp);
  if (c && c.state === 'home' && !c.hurt && c.role !== 'guard') {
    c.role = 'guard';
    say([['Chomp', "I've been thinking. These teeth."], ['Chomp', 'What if I used them... for wolves?'], ['shepherd', 'Guard the fold, Chomp. Just chase them off.'], ['Chomp', 'Chasing. Only chasing. Mostly.']]);
  }
}

const fireR = () => 54 + (G.roles.lamp ? 26 : 0) + (jory && jory.state === 'redeemed' ? 8 : 0);
const randInFold = s => { s.tx = rand(FOLD.x + 16, FOLD.x + FOLD.w - 16); s.ty = rand(FOLD.y + 18, FOLD.y + FOLD.h - 18); };
function updSheep(s, dt) {
  const sp = s.hurt ? 0.65 : 1;
  s.baaT -= dt;
  if (s.baaT <= 0) {
    s.baaT = rand(6, 16);
    if (Math.abs(s.x - sh.x) < W / 2 && Math.abs(s.y - sh.y) < H / 2 && s.state !== 'scared') {
      pop(s.x, s.y - 18, s.state === 'wild' ? (s.lost ? 'BAA?' : 'BAA') : pick(['BAA', 'MEH', 'BAA!']), '#fff7e0', 0.9);
      if (Math.random() < 0.5) sfx.baa();
    }
  }
  switch (s.state) {
    case 'wild': {
      s.wt -= dt;
      if (s.wt <= 0) { s.tx = s.ax + rand(-30, 30); s.ty = s.ay + rand(-22, 22); s.wt = rand(2, 5); }
      steer(s, s.tx, s.ty, 14 * sp, dt, 6);
      if (dist(s, sh) < S.callR) {
        s.trust += dt * S.trustRate * (s.lost ? 2 : 1);
        if (s.trust >= 1) joinFlock(s);
      } else s.trust = Math.max(0, s.trust - dt * 0.12);
      break;
    }
    case 'follow': {
      const i = s.fi || 0, r = 10 * Math.sqrt(i + 1), a = i * 2.4;
      const bx = sh.x - sh.face * 14 + Math.cos(a) * r, by = sh.y + 3 + Math.sin(a) * r * 0.6;
      const [tx, ty] = nav(s, bx, by);
      steer(s, tx, ty, (dist(s, sh) > 90 ? 86 : 64) * (s.hurt ? 0.8 : 1), dt, 14);
      if (insideFold(s)) goHome(s);
      break;
    }
    case 'home': {
      let tx = s.tx, ty = s.ty;
      const night = G.phase === 'night';
      if (s.role === 'lookout' && night) { tx = FOLD.x + 14; ty = FOLD.y + 16; }
      else if (s.role === 'lamp') { tx = FIRE.x + 14; ty = FIRE.y + 6; }
      else if (s.role === 'doc') {
        s.wt -= dt;
        const p = sheep.find(q => q.hurt && q.state === 'home' && insideFold(q));
        if (p) { tx = p.x + 11; ty = p.y; } else if (s.wt <= 0) { randInFold(s); s.wt = rand(3, 6); }
      } else if (s.role === 'guard' && night) {
        let best = null, bd = 110;
        for (const w of wolves) if (!w.flee && dist(w, FIRE) < 130) { const d = dist(w, s); if (d < bd) { bd = d; best = w; } }
        if (best) {
          [tx, ty] = nav(s, best.x, best.y);
          s.bite -= dt;
          if (bd < 11 && s.bite <= 0) { s.bite = 1.1; best.fear += 1; knock(best, s, 110); pop(best.x, best.y - 14, 'CHOMP', '#f5c542'); sfx.bark(); }
        } else [tx, ty] = nav(s, GX, FOLD.y + FOLD.h - 22);
      } else {
        s.wt -= dt;
        if (s.wt <= 0 || !inFold(s.tx, s.ty)) { randInFold(s); s.wt = rand(3, 7); }
        [tx, ty] = nav(s, s.tx, s.ty);
      }
      steer(s, tx, ty, (s.role === 'guard' && night ? 64 : 22) * sp, dt, 6);
      if (s.hurt && G.roles.doc && G.roles.doc !== s && insideFold(s)) {
        s.heal += dt / 6;
        if (s.heal >= 1) { s.hurt = false; s.heal = 0; pop(s.x, s.y - 18, '+', '#f5c542'); dropHearts(s.x, s.y, 1); toast(`Doc ${G.roles.doc.name} patched up ${s.name}.`); }
      }
      break;
    }
    case 'scared': {
      s.scaredT -= dt;
      const dx = s.x - s.from.x, dy = s.y - s.from.y, d = Math.hypot(dx, dy) || 1;
      steer(s, s.x + dx / d * 40, s.y + dy / d * 40, 74 * sp, dt, 1);
      if (s.scaredT <= 0) {
        if (insideFold(s)) s.state = 'home';
        else { s.state = 'wild'; s.lost = true; s.trust = 0; s.ax = s.x; s.ay = s.y; s.wt = 0; }
      }
      break;
    }
    case 'stolen': {
      if (!jory) { s.state = 'follow'; break; }
      const i = s.fi || 0;
      const [tx, ty] = nav(s, jory.x - jory.face * 12 + (i % 2) * 7, jory.y + i * 6 - 4);
      steer(s, tx, ty, 60, dt, 10);
      break;
    }
    case 'chomp': updChomp(s, dt); break;
  }
  move(s, dt, 5);
}

function updChomp(s, dt) {
  const d = dist(s, sh);
  s.bite -= dt;
  if (d < 76) {
    if (!G.flags.chompHint) { G.flags.chompHint = true; toast('Chomp is scared. Stand still and let him come to you.', 5); }
    if (sh.moving) {
      const dx = s.x - sh.x, dy = s.y - sh.y, n = d || 1;
      steer(s, s.x + dx / n * 30, s.y + dy / n * 30, 34, dt, 1);
      s.trust = Math.max(0, s.trust - dt * 0.3);
      if (d < 14 && s.bite <= 0) {
        s.bite = 2.2; sh.stun = 0.7; knock(sh, s, 120); G.shake = 0.25; sfx.hurt();
        pop(s.x, s.y - 18, 'CHOMP!', '#d8574f');
        if (!G.flags.bitten) { G.flags.bitten = true; toast('Chomp bit you. Ow. Try being still.', 4); }
      }
    } else {
      steer(s, sh.x + (s.x < sh.x ? -16 : 16), sh.y, 12, dt, 6);
      s.trust += dt / 4.5;
      if (s.trust >= 1) { s.trust = 1; s.state = 'scene'; chompScene(s); }
    }
  } else {
    s.wt -= dt;
    if (s.wt <= 0) { s.tx = s.ax + rand(-24, 24); s.ty = s.ay + rand(-18, 18); s.wt = rand(2, 4); }
    steer(s, s.tx, s.ty, 16, dt, 6);
  }
}
function chompScene(s) {
  s.vx = s.vy = 0;
  say([
    ['Chomp', 'Back off! I bite. I bit you already. I will do it again.'],
    ['shepherd', 'I know.'],
    ['Chomp', "So... aren't you mad? Everyone gets mad. Then they leave."],
  ], {
    choice: 'Forgive',
    onChoice() { G.stats.forgiven++; sfx.forgive(); ring(s.x, s.y - 6, 30, '#f5c542', 1.2); },
    done() {
      say([
        ['shepherd', "You're hurt, Chomp. Hurt sheep bite. Come home, and let's get you patched up."],
        ['Chomp', '...Is there food?'],
        ['Woolsworth', 'There is SO much hay, man.'],
      ], { done() { s.state = 'follow'; s.hurt = true; dropHearts(s.x, s.y, 4); sfx.join(); toast('Chomp joined the flock. Get him to the Doc.', 4); } });
    },
  });
}

// ---------------------------------------------------------------- wolves, the thief, the dogs
function spawnWolf() {
  const a = rand(0, TAU), R = rand(260, 320);
  wolves.push({ x: clamp(FIRE.x + Math.cos(a) * R, 10, WW - 10), y: clamp(FIRE.y + Math.sin(a) * R, 14, WH - 6),
    vx: 0, vy: 0, kx: 0, ky: 0, face: 1, anim: 0, fear: 0, fearMax: NIGHTS[G.day].fear, flee: 0, rest: 0 });
  if (G.roles.lookout) { sfx.bell(); pop(G.roles.lookout.x, G.roles.lookout.y - 20, 'DING', '#f5c542', 0.8); }
  if (!G.flags.wolfTalk && G.day === 1) {
    G.flags.wolfTalk = true;
    say([['Woolsworth', "WOLF. That's a wolf. I'm not being dramatic."], ['shepherd', 'Stay close to the light. I have you.']]);
  }
}
function turnWolf(w) {
  w.flee = 2.6; G.stats.turned++; dropHearts(w.x, w.y, 1); sfx.yelp(); pop(w.x, w.y - 14, pick(['YIPE', 'NOPE', '!']), '#d4d5e0', 0.8);
}
function updWolf(w, dt) {
  if (w.flee > 0) {
    const dx = w.x - sh.x, dy = w.y - sh.y, d = Math.hypot(dx, dy) || 1;
    w.vx = dx / d * 100; w.vy = dy / d * 100;
    w.flee -= dt;
    w.x += w.vx * dt; w.y += w.vy * dt; w.face = w.vx > 0 ? 1 : -1; w.anim += 100 * dt;
    if (w.flee <= 0 || w.x < -20 || w.x > WW + 20 || w.y < -20 || w.y > WH + 20) w.gone = true;
    return;
  }
  let slow = 1;
  const dsh = dist(w, sh);
  if (G.phase === 'night' && dsh < S.lantern) { w.fear += dt * 0.25 * S.lanternLvl; slow = 0.62; }
  if (dist(w, FIRE) < fireR() * 0.8) { w.fear += dt * (G.roles.lamp ? 0.45 : 0.15); slow *= 0.75; }
  if (w.fear >= w.fearMax) { turnWolf(w); return; }
  if (w.rest > 0) {
    w.rest -= dt;
    const dx = w.x - w.rx, dy = w.y - w.ry, d = Math.hypot(dx, dy) || 1;
    steer(w, w.x + dx / d * 30, w.y + dy / d * 30, 40, dt, 1);
  } else {
    let best = null, bd = 1e9;
    for (const s of sheep) {
      if (s.state === 'scared' || s.state === 'chomp' || s.state === 'scene' || s.role === 'guard') continue;
      const d = dist(w, s) + (insideFold(s) ? 90 : 0);
      if (d < bd) { bd = d; best = s; }
    }
    if (best) {
      const [tx, ty] = nav(w, best.x, best.y);
      steer(w, tx, ty, 48 * slow, dt, 1);
      if (dist(w, best) < 9) { scare(best, w); w.rest = 1.7; w.rx = best.x; w.ry = best.y; }
    } else steer(w, sh.x, sh.y, 40 * slow, dt, 1);
    if (dsh < 10 && sh.stun <= 0) { sh.stun = 0.4; knock(sh, w, 110); w.rest = 1; w.rx = sh.x; w.ry = sh.y; G.shake = 0.2; sfx.hurt(); }
  }
  move(w, dt, 5);
}

function spawnJory() {
  jory = { x: WW - 16, y: FIRE.y + 80, vx: 0, vy: 0, kx: 0, ky: 0, face: -1, dir: 'side', anim: 0, nerve: 1, state: 'sneak', tx: 0, ty: 0 };
  say([['Woolsworth', 'Boss. There is a guy. A guy guy. With a SACK.'], ['Baabara', "He's sneaking toward the fold!"], ['shepherd', "Stay close to him. He'll run out of places to hide."]]);
}
function updJory(dt) {
  const j = jory;
  if (j.state === 'redeemed') { steer(j, GX + 24, FOLD.y + FOLD.h + 10, 40, dt, 8); move(j, dt, 4); if (Math.hypot(j.vx, j.vy) < 6) j.dir = 'down'; return; }
  if (j.state === 'scene') { j.vx = j.vy = 0; return; }
  const d = dist(j, sh);
  let slow = 1;
  if (d < 20) { j.nerve -= dt / 3.5; slow = 0.55; if (Math.random() < dt * 2) pop(j.x, j.y - 40, pick(['!', '?!', 'UH']), '#f5c542', 0.5); }
  else j.nerve = Math.min(1, j.nerve + dt / 20);
  if (j.nerve <= 0) { joryScene(false); return; }
  if (j.state === 'sneak') {
    const targets = sheep.filter(s => s.state === 'home' && s.role !== 'guard');
    const pool = targets.length ? targets : sheep.filter(s => s.state === 'follow');
    let best = null, bd = 1e9;
    for (const s of pool) { const q = dist(j, s); if (q < bd) { bd = q; best = s; } }
    if (best) {
      const [tx, ty] = nav(j, best.x, best.y);
      steer(j, tx, ty, 46 * slow, dt, 1);
      if (bd < 11) {
        const grab = pool.filter(s => dist(s, j) < 36).slice(0, 3);
        grab.forEach((s, i) => { s.state = 'stolen'; s.fi = i; if (s.role) clearRole(s); });
        pop(j.x, j.y - 40, 'HEH', '#d4d5e0');
        toast(`Jory is leading ${grab.map(s => s.name).join(', ')} away!`, 4);
        j.state = 'run'; j.tx = pick([30, WW - 30]); j.ty = pick([40, WH - 30]);
      }
    } else steer(j, sh.x, sh.y, 30, dt, 20);
  } else if (d < 54) {
    const dx = j.x - sh.x, dy = j.y - sh.y, n = d || 1, wob = Math.sin(performance.now() / 260) * 0.8;
    steer(j, j.x + (dx / n - dy / n * wob) * 40, j.y + (dy / n + dx / n * wob) * 40, 54 * slow, dt, 1);
  } else {
    steer(j, j.tx, j.ty, 48 * slow, dt, 4);
    if (Math.hypot(j.x - j.tx, j.y - j.ty) < 20) { j.tx = rand(30, WW - 30); j.ty = rand(40, WH - 30); }
  }
  move(j, dt, 4);
}
function joryScene(atDawn) {
  jory.state = 'scene'; jory.dir = 'side'; jory.face = sh.x < jory.x ? -1 : 1;
  const lines = atDawn ? [['jory', "Sun's up. Nowhere left to hide. Fine. You got me."]] : [['jory', 'Alright, alright! You got me. Go on, then.']];
  lines.push(['shepherd', 'Go on and what?'], ['jory', 'Do what shepherds do to thieves. I know how this goes.']);
  say(lines, {
    choice: 'Forgive',
    onChoice() { G.stats.forgiven++; sfx.forgive(); ring(jory.x, jory.y - 14, 34, '#f5c542', 1.2); },
    done() {
      say([
        ['shepherd', 'You came here to steal. I am giving you a place by the fire instead.'],
        ['jory', '...Why would you do that?'],
        ['shepherd', 'Because you were lost too, Jory. I came out here looking for you.'],
        ['jory', 'Nobody has ever... okay. Okay.'],
        ['jory', 'I know every trick a thief would try. Let me keep watch. Nobody gets past me again.'],
      ], { done() {
        jory.state = 'redeemed';
        for (const s of sheep) if (s.state === 'stolen') s.state = 'follow';
        dropHearts(jory.x, jory.y, 5); sfx.join();
        toast('Jory joined the farm as Night Watch.', 4);
        if (atDawn) endGame();
      } });
    },
  });
}

function updDog(g, i, dt) {
  g.cd -= dt;
  if (g.dash && (g.dash.gone || g.dash.flee > 0)) g.dash = null;
  if (G.phase === 'night' && !g.dash && g.cd <= 0) {
    let best = null, bd = 84;
    for (const w of wolves) if (!w.flee) { const d = dist(w, sh); if (d < bd) { bd = d; best = w; } }
    g.dash = best;
  }
  if (g.dash) {
    steer(g, g.dash.x, g.dash.y, 118, dt, 1);
    if (dist(g, g.dash) < 10) { g.dash.fear += 1; knock(g.dash, g, 120); pop(g.x, g.y - 12, 'WOOF', '#fff7e0', 0.6); sfx.bark(); g.dash = null; g.cd = 1.5; }
  } else {
    steer(g, sh.x + (i === 0 ? -15 : 15), sh.y + 6, dist(g, sh) > 60 ? 104 : 78, dt, 10);
    if (G.phase === 'day') for (const s of sheep) if (s.state === 'wild' && dist(s, g) < 42) s.trust += dt * 0.12;
  }
  move(g, dt, 4);
}

// ---------------------------------------------------------------- phases
function startNight() {
  const cfg = NIGHTS[G.day];
  G.phase = 'night'; G.t = 0; G.len = cfg.night; G.spawns = [];
  for (let i = 0; i < cfg.wolves; i++) G.spawns.push(2 + (cfg.night * 0.75) * i / cfg.wolves + rand(0, 2));
  A.track = 'night';
  const out = sheep.filter(s => s.state === 'follow' || s.state === 'wild').length;
  banner('Night ' + G.day, out ? 'Keep them close to the light.' : 'Everyone is home. Guard the gate.');
  if (G.day === 3) G.joryAt = 14;
}
function startDay() {
  for (const w of wolves) if (!w.flee) w.flee = 2.5;
  if (G.day === 3) {
    if (jory && jory.state !== 'redeemed') { joryScene(true); return; }
    endGame(); return;
  }
  G.day++; G.phase = 'day'; G.t = 0; G.len = NIGHTS[G.day].day; A.track = 'day';
  const home = sheep.filter(s => s.state === 'home').length, lost = sheep.filter(s => s.lost).length;
  banner('Day ' + G.day, `${home} safe in the fold${lost ? ` · ${lost} still out there` : ''}`);
  for (let i = 0; i < 4; i++) spawnWild(280, 620);
  if (G.day === 2) {
    const c = addSheep(WW - 110, 100, 'Chomp', ''); c.isChomp = true; c.state = 'chomp';
    say([['Baabara', "Boss, there's a sheep up north-east, in the thorns. He bit Pepper's ear. Calls himself Chomp."],
      ['shepherd', "Then he's hurting. Let's go see him."], ['Woolsworth', 'Respectfully: no.']]);
  }
  if (G.day === 3) toast('Some sheep are still out there. The ones who got scared know your voice.', 4);
}
function endGame() {
  mode = 'end';
  const home = sheep.filter(s => s.state === 'home' || s.state === 'follow').length;
  const rows = [['Sheep in the fold', home + ' / ' + sheep.length], ['Lost sheep found again', G.stats.found],
    ['Wolves turned away', G.stats.turned], ['Times forgiveness was offered', G.stats.forgiven], ['Times it was refused', 0]];
  const box = $('end-stats'); box.innerHTML = '';
  for (const [k, v] of rows) { const a = document.createElement('span'); a.textContent = k; const b = document.createElement('b'); b.textContent = v; box.append(a, b); }
  $('end').hidden = false; $('hud').hidden = true; $('btn-whistle').hidden = true;
  $('btn-again').focus({ preventScroll: true });
}
function whistle() {
  if (sh.whistleT > 0 || mode !== 'play') return;
  sh.whistleT = 4; sfx.whistle(); ring(sh.x, sh.y - 12, 84, '#f5c542', 0.6);
  for (const s of sheep) {
    if (dist(s, sh) > 84) continue;
    if (s.state === 'wild') s.trust = Math.min(0.99, s.trust + (s.lost ? 0.6 : 0.3));
    if (s.state === 'chomp') { s.trust = Math.max(0, s.trust - 0.3); pop(s.x, s.y - 18, '!', '#d8574f'); }
  }
}

// ---------------------------------------------------------------- update
const keys = {};
const joy = { on: false, ox: 0, oy: 0, x: 0, y: 0 };
function update(dt) {
  G.smokeT -= dt;
  if (G.smokeT <= 0) { G.smokeT = 0.5; fx.push({ kind: 'smoke', x: HUT.x + 16 + rand(-1, 1), y: HUT.y - 63, t: 0, life: 3.2, dx: rand(4, 9) }); }
  if (mode === 'title') { sheep.forEach(s => updSheep(s, dt)); return; }
  if (mode !== 'play') return;

  G.t += dt;
  if (G.phase === 'day' && G.t >= G.len) startNight();
  else if (G.phase === 'night' && G.t >= G.len) startDay();
  if (mode !== 'play') return;
  if (G.phase === 'day' && G.len - G.t < 15 && !G.flags['dusk' + G.day]) { G.flags['dusk' + G.day] = true; toast('The sun is getting low. Bring them home.'); }
  if (G.phase === 'night') {
    while (G.spawns.length && G.t >= G.spawns[0]) { G.spawns.shift(); spawnWolf(); }
    if (G.joryAt && G.t >= G.joryAt) { G.joryAt = 0; spawnJory(); }
  }

  // shepherd
  let ix = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0) + joy.x;
  let iy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0) + joy.y;
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  if (sh.stun > 0) { sh.stun -= dt; ix = iy = 0; }
  sh.vx = ix * S.speed; sh.vy = iy * S.speed; sh.moving = Math.hypot(ix, iy) > 0.15;
  const f = sh.face, dr = sh.dir; move(sh, dt, 4);
  sh.face = Math.abs(ix) > 0.2 ? (ix > 0 ? 1 : -1) : f;
  sh.dir = sh.moving ? (Math.abs(iy) > Math.abs(ix) * 1.2 ? (iy < 0 ? 'up' : 'down') : 'side') : dr;
  sh.whistleT = Math.max(0, sh.whistleT - dt); sh.swing = Math.max(0, sh.swing - dt);

  // staff
  sh.staffT -= dt;
  if (sh.staffT <= 0) {
    const hit = wolves.filter(w => !w.flee && dist(w, sh) < S.staffRange);
    if (hit.length) {
      for (const w of hit) { w.fear += 1; knock(w, sh, 120); }
      sh.swing = 0.25; sh.staffT = S.staffCd; sfx.swing();
      fx.push({ kind: 'arc', x: sh.x, y: sh.y - 10, r: S.staffRange, t: 0, life: 0.25, a: Math.atan2(hit[0].y - sh.y, hit[0].x - sh.x) });
    } else sh.staffT = 0.08;
  }
  if (S.sling && G.phase === 'night') {
    sh.slingT -= dt;
    if (sh.slingT <= 0) {
      let best = null, bd = 130;
      for (const w of wolves) if (!w.flee) { const d = dist(w, sh); if (d < bd) { bd = d; best = w; } }
      if (best) { shots.push({ x: sh.x, y: sh.y - 18, tgt: best }); sh.slingT = 2.0 / (1 + 0.35 * (S.sling - 1)); } else sh.slingT = 0.2;
    }
  }
  if (S.harp && G.phase === 'night') {
    sh.harpT -= dt;
    if (sh.harpT <= 0) {
      sh.harpT = 8 - S.harp * 1.4;
      const R = 50 + S.harp * 12;
      ring(sh.x, sh.y - 10, R, '#9fb4ff', 0.8);
      if (sfxOk()) { const t = A.ctx.currentTime; [69, 72, 76, 81].forEach((m, i) => note(t + i * 0.05, mf(m), 0.4, 'triangle', 0.06)); }
      for (const w of wolves) if (!w.flee && dist(w, sh) < R) { w.fear += 1; knock(w, sh, 150); }
    }
  }
  for (const p of shots) {
    if (!p.tgt || p.tgt.gone || p.tgt.flee) { p.dead = true; continue; }
    const dx = p.tgt.x - p.x, dy = p.tgt.y - 6 - p.y, d = Math.hypot(dx, dy);
    if (d < 5) { p.dead = true; p.tgt.fear += 1; knock(p.tgt, sh, 70); pop(p.tgt.x, p.tgt.y - 14, 'BONK', '#fff7e0', 0.5); continue; }
    p.x += dx / d * 170 * dt; p.y += dy / d * 170 * dt;
  }
  shots = shots.filter(p => !p.dead);

  let fi = 0, si = 0;
  for (const s of sheep) { if (s.state === 'follow') s.fi = fi++; if (s.state === 'stolen') s.fi = si++; }
  for (const s of sheep) updSheep(s, dt);
  for (let i = 0; i < sheep.length; i++) for (let j = i + 1; j < sheep.length; j++) {
    const a = sheep[i], b = sheep[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 11 && d > 0) { const p = (11 - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
  }
  for (const w of wolves) updWolf(w, dt);
  wolves = wolves.filter(w => !w.gone);
  dogs.forEach((g, i) => updDog(g, i, dt));
  if (jory) updJory(dt);
  checkRoles();

  for (const h of hearts) {
    h.t += dt;
    const d = dist(h, sh);
    if (h.t > 0.35 && d < 64) { const k = 240 / Math.max(d, 1); h.x += (sh.x - h.x) * Math.min(1, k * dt); h.y += (sh.y - 6 - h.y) * Math.min(1, k * dt); }
    else if (h.t < 0.35) { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 160 * dt; }
    if (d < 8 && h.t > 0.35) { h.got = true; addXP(1); sfx.heart(); }
  }
  hearts = hearts.filter(h => !h.got && h.t < 40);
  if (G.lvPending > 0 && mode === 'play') openLevelUp();
}

// ---------------------------------------------------------------- draw
function darkness() {
  if (!G) return 0;
  if (G.phase === 'night') return Math.min(0.8, 0.42 + G.t / 3 * 0.38);
  if (G.day > 1 && G.t < 4) return 0.8 * (1 - G.t / 4);
  const left = G.len - G.t;
  return left < 14 ? 0.42 * (1 - left / 14) : 0;
}
const walkFrame = e => {
  if (Math.hypot(e.vx, e.vy) < 6) return [0, 0];
  const k = Math.floor(e.anim / 5) % 4;
  return [[1, 0, -1, 0][k], k % 2];
};
function drawFire(X, Y) {
  rect(ctx, '#5a3418', X - 6, Y - 3, 12, 2); rect(ctx, '#7a4a24', X - 5, Y - 4, 10, 2); rect(ctx, '#3e2416', X - 6, Y - 1, 12, 1);
  const fr = Math.floor(performance.now() / 110) % 3;
  const shapes = [[[-3, 5], [-2, 8], [-1, 10], [0, 9], [1, 11], [2, 8], [3, 5]], [[-3, 6], [-2, 9], [-1, 8], [0, 11], [1, 9], [2, 10], [3, 5]], [[-3, 5], [-2, 7], [-1, 10], [0, 12], [1, 9], [2, 7], [3, 6]]][fr];
  for (const [dx, h] of shapes) rect(ctx, '#e8602c', X + dx, Y - 3 - h, 1, h);
  for (const [dx, h] of shapes) if (Math.abs(dx) < 3) rect(ctx, '#f5a23c', X + dx, Y - 3 - Math.round(h * 0.7), 1, Math.round(h * 0.7));
  rect(ctx, '#ffe680', X - 1, Y - 7, 2, 4); rect(ctx, '#fffbe0', X, Y - 5, 1, 2);
}
function fencePost(px, py) { rect(ctx, '#3e2416', px - 2, py - 13, 5, 14); rect(ctx, '#a8703f', px - 1, py - 12, 3, 12); rect(ctx, '#7a4a24', px + 1, py - 11, 1, 11); rect(ctx, '#d39a5c', px - 1, py - 12, 3, 1); }
function fenceRails(x0, x1, py) {
  for (const h of [9, 5]) { rect(ctx, '#3e2416', x0, py - h - 1, x1 - x0, 4); rect(ctx, '#c58d55', x0, py - h, x1 - x0, 2); rect(ctx, '#8a5a33', x0, py - h + 1, x1 - x0, 1); }
}
function draw() {
  const shake = G.shake > 0 ? (Math.random() - 0.5) * 3 : 0;
  const camX = Math.round(clamp(sh.x - W / 2, 0, WW - W) + shake), camY = Math.round(clamp(sh.y - 16 - H / 2, 0, WH - H));
  ctx.drawImage(ground, camX, camY, W, H, 0, 0, W, H);
  const X = x => Math.round(x - camX), Y = y => Math.round(y - camY);
  const onScreen = (x, y, m = 40) => x > camX - m && x < camX + W + m && y > camY - m && y < camY + H + m + 20;
  const now = performance.now();

  if (onScreen(POND.x, POND.y, 60)) for (let i = 0; i < 5; i++) { // water sparkle
    const ph = (now / 900 + i * 1.7) % 3;
    if (ph < 1) rect(ctx, '#ffffff', X(POND.x - 20 + ((i * 13) % 34)), Y(POND.y - 16 + ((i * 11) % 28)), ph < 0.5 ? 1 : 2, 1);
  }
  for (const h of hearts) if (onScreen(h.x, h.y)) { shadow(ctx, X(h.x), Y(h.y) + 1, 6); ctx.drawImage(spr('heart', 0), X(h.x) - 4, Y(h.y) - 9 + Math.round(Math.sin(h.t * 6))); }

  const dk = darkness();
  const list = [];
  for (const o of decor) {
    if (!onScreen(o.x, o.y, 70)) continue;
    if (o.fire) list.push({ y: o.y, d: () => drawFire(X(o.x), Y(o.y)) });
    else list.push({ y: o.y, d: () => {
      if (o.tree) shadow(ctx, X(o.x), Y(o.y), 18);
      const img = o.img === 'hut' ? (dk > 0.3 ? IMG.hutNight : IMG.hutDay) : IMG[o.img];
      ctx.drawImage(img, X(o.x) - o.ox, Y(o.y) - o.oy);
    } });
  }
  // fences: top and bottom as long runs; side posts one by one so sheep sort correctly against them
  list.push({ y: FOLD.y + 2, d: () => { fenceRails(X(FOLD.x), X(FOLD.x + FOLD.w), Y(FOLD.y + 2)); for (let px = FOLD.x + 2; px <= FOLD.x + FOLD.w - 2; px += 16) fencePost(X(px), Y(FOLD.y + 2)); } });
  const by = FOLD.y + FOLD.h - 1, gl = GX - GATE / 2, gr = GX + GATE / 2;
  list.push({ y: by, d: () => {
    fenceRails(X(FOLD.x), X(gl), Y(by)); fenceRails(X(gr), X(FOLD.x + FOLD.w), Y(by));
    for (let px = FOLD.x + 2; px < gl; px += 16) fencePost(X(px), Y(by));
    for (let px = FOLD.x + FOLD.w - 2; px > gr; px -= 16) fencePost(X(px), Y(by));
    fencePost(X(gl), Y(by)); fencePost(X(gr), Y(by));
    for (const gx of [gl, gr]) { rect(ctx, '#3e2416', X(gx) - 2, Y(by) - 17, 5, 5); rect(ctx, '#d39a5c', X(gx) - 1, Y(by) - 16, 3, 3); }
  } });
  for (const sx of [FOLD.x + 2, FOLD.x + FOLD.w - 2]) for (let py = FOLD.y + 14; py < FOLD.y + FOLD.h - 4; py += 14) {
    list.push({ y: py, d: () => { rect(ctx, '#3e2416', X(sx) - 1, Y(py) - 23, 3, 15); rect(ctx, '#c58d55', X(sx), Y(py) - 22, 1, 13); fencePost(X(sx), Y(py)); } });
  }
  for (const s of sheep) if (onScreen(s.x, s.y)) list.push({ y: s.y, d: () => {
    const moving = Math.hypot(s.vx, s.vy) > 4, fr = moving ? Math.floor(s.anim / 5) % 2 : 0;
    shadow(ctx, X(s.x), Y(s.y), 12);
    const hop = s.state === 'scared' ? -Math.abs(Math.round(Math.sin(s.anim / 3) * 2)) : (moving && fr ? -1 : 0);
    ctx.drawImage(spr('sheep', fr, s.face < 0, modsFor(s), s.isChomp ? 'chomp' : null), X(s.x) - 8, Y(s.y) - 13 + hop);
  } });
  for (const w of wolves) if (onScreen(w.x, w.y)) list.push({ y: w.y, d: () => {
    shadow(ctx, X(w.x), Y(w.y), 16);
    ctx.drawImage(spr('wolf', Math.floor(w.anim / 6) % 2, w.face < 0), X(w.x) - 10, Y(w.y) - 11);
  } });
  for (const g of dogs) list.push({ y: g.y, d: () => {
    shadow(ctx, X(g.x), Y(g.y), 10);
    ctx.drawImage(spr('dog', Math.hypot(g.vx, g.vy) > 4 ? Math.floor(g.anim / 5) % 2 : 0, g.face < 0, '', g.kind === 'mercy' ? 'mercy' : null), X(g.x) - 7, Y(g.y) - 9);
  } });
  if (jory) list.push({ y: jory.y, d: () => drawPerson(X(jory.x), Y(jory.y), jory, jory.state === 'redeemed' ? 'joryWatch' : 'jory') });
  list.push({ y: sh.y, d: () => drawPerson(X(sh.x), Y(sh.y), sh, 'shepherd') });
  list.sort((a, b) => a.y - b.y).forEach(o => o.d());

  for (const p of shots) { rect(ctx, '#3e2416', X(p.x) - 2, Y(p.y) - 2, 4, 4); rect(ctx, '#d4d5e0', X(p.x) - 1, Y(p.y) - 1, 2, 2); }
  for (const e of fx) {
    const k = e.t / e.life;
    if (e.kind === 'ring') {
      const r = Math.round(e.r * (0.3 + 0.7 * k));
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(X(e.x) + 0.5, Y(e.y) + 0.5, r, Math.round(r * 0.7), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (e.kind === 'arc') {
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff7e0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(e.x), Y(e.y), e.r * 0.8, e.a - 1.2 + k * 0.8, e.a + 0.4 + k * 0.8); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (e.kind === 'smoke' && onScreen(e.x, e.y, 30)) {
      ctx.globalAlpha = 0.4 * (1 - k); disc(ctx, X(e.x + e.dx * k * 2), Y(e.y - k * 26), Math.round(1 + k * 4), dk > 0.3 ? '#7a7a98' : '#d8d6e4'); ctx.globalAlpha = 1;
    }
  }

  // night: stepped pools of light cut from a blue dark, then a little warm glow added back
  if (dk > 0) {
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = `rgba(18,22,58,${dk})`; dctx.fillRect(0, 0, W, H);
    const left = G.phase === 'day' ? G.len - G.t : 99;
    if (left < 14) { dctx.fillStyle = `rgba(255,120,50,${0.18 * (1 - left / 14)})`; dctx.fillRect(0, 0, W, H); }
    dctx.globalCompositeOperation = 'destination-out';
    const flick = Math.sin(now / 90) * 1.5;
    const lights = [[sh.x, sh.y - 14, S.lantern + flick], [FIRE.x, FIRE.y - 4, fireR() + flick], [HUT.x + 16, HUT.y - 18, 22]];
    if (jory && jory.state === 'redeemed') lights.push([jory.x, jory.y - 12, 32 + flick]);
    for (const [lx, ly, r] of lights) for (const [m, a] of [[1, 0.18], [0.84, 0.2], [0.68, 0.24], [0.52, 0.3], [0.36, 0.5]]) { dctx.fillStyle = `rgba(0,0,0,${a})`; disc(dctx, X(lx), Y(ly), Math.round(r * m)); }
    ctx.drawImage(dark, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, r] of lights) { ctx.fillStyle = 'rgba(255,140,50,.05)'; disc(ctx, X(lx), Y(ly), Math.round(r * 0.7)); ctx.fillStyle = 'rgba(255,170,80,.05)'; disc(ctx, X(lx), Y(ly), Math.round(r * 0.4)); }
    ctx.globalCompositeOperation = 'source-over';
  }

  // labels above the dark
  for (const s of sheep) {
    if (!onScreen(s.x, s.y)) continue;
    if ((s.state === 'wild' || s.state === 'chomp') && s.trust > 0.02) {
      rect(ctx, '#3e2416', X(s.x) - 8, Y(s.y) - 21, 16, 4); rect(ctx, '#f7e7c4', X(s.x) - 7, Y(s.y) - 20, 14, 2);
      rect(ctx, s.isChomp ? '#d8574f' : '#ef9aa0', X(s.x) - 7, Y(s.y) - 20, Math.round(14 * Math.min(1, s.trust)), 2);
    } else if (s.lost && s.state === 'wild' && Math.floor(now / 400) % 2) ptext('?', X(s.x), Y(s.y) - 23, '#f5c542');
    if (s.isChomp && s.state === 'chomp' && dist(s, sh) > 64) ptext('CHOMP', X(s.x), Y(s.y) - 23, '#d8574f');
  }
  if (jory && jory.state !== 'redeemed' && jory.state !== 'scene') {
    rect(ctx, '#3e2416', X(jory.x) - 10, Y(jory.y) - 42, 20, 4); rect(ctx, '#f7e7c4', X(jory.x) - 9, Y(jory.y) - 41, 18, 2);
    rect(ctx, '#f5c542', X(jory.x) - 9, Y(jory.y) - 41, Math.round(18 * jory.nerve), 2);
  }
  for (const e of fx) if (e.kind === 'text') ptext(e.text, X(e.x), Y(e.y) - (e.t / e.life) * 8, e.col);

  // edge markers: nearest wild sheep (cream), lost sheep (gold), Chomp (red), wolves when there is a lookout (red), Jory (purple)
  const marks = [];
  for (const s of sheep.filter(q => q.state === 'wild' && !q.lost).sort((a, b) => dist(a, sh) - dist(b, sh)).slice(0, 3)) marks.push([s.x, s.y, '#fff7e0']);
  for (const s of sheep) { if (s.state === 'wild' && s.lost) marks.push([s.x, s.y, '#f5c542']); if (s.state === 'chomp') marks.push([s.x, s.y, '#d8574f']); }
  if (G.roles.lookout) for (const w of wolves) if (!w.flee) marks.push([w.x, w.y, '#d8574f', true]);
  if (jory && jory.state !== 'redeemed') marks.push([jory.x, jory.y, '#b98ad8']);
  for (const [x, y, col, wolf] of marks) {
    const sx = x - camX, sy = y - 8 - camY;
    if (sx >= 0 && sx < W && sy >= 0 && sy < H) continue;
    const cx = Math.round(clamp(sx, 5, W - 6));
    let cy = Math.round(clamp(sy, 8, H - 8));
    if (cx > W - 96 && cy < 72) cy = 72;
    if (cx < 92 && cy < 30) cy = 30;
    rect(ctx, '#3e2416', cx - 3, cy - 3, 7, 7); rect(ctx, col, cx - 2, cy - 2, 5, 5);
    if (wolf) rect(ctx, '#3e2416', cx, cy, 1, 1);
  }

  if (joy.on) {
    const r = stage.getBoundingClientRect();
    const ox = (joy.ox - r.left) / scale, oy = (joy.oy - r.top) / scale;
    ctx.globalAlpha = 0.4; ctx.strokeStyle = '#fff7e0'; ctx.beginPath(); ctx.arc(ox, oy, 16, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff7e0'; disc(ctx, ox + joy.x * 13, oy + joy.y * 13, 6); ctx.globalAlpha = 1;
  }
}
// People: sprite drawn with feet at (x, y). The Shepherd carries a crook taller than he is, with a lantern hanging from the hook.
function drawPerson(x, y, p, look) {
  const [st, bob] = walkFrame(p), dir = p.dir || 'down', flip = dir === 'side' && p.face < 0;
  shadow(ctx, x, y, 12);
  const ox = x - 10, oy = y - 33;
  const staff = () => {
    const col = dir === 'up' ? 5 : dir === 'down' ? 15 : 14;
    const cx = c => ox + (flip ? 19 - c : c);
    const lean = p.swing > 0 ? 1 : 0;
    rect(ctx, '#3e2416', cx(col) - 1, oy - 4, 3, 37);
    rect(ctx, '#b07a45', cx(col), oy - 3, 1, 35);
    const hook = (dir === 'up') !== flip ? -1 : 1, hx = c => cx(col) + c * hook;
    for (const [dx, dy] of [[0, -5], [1, -6], [2, -6], [3, -5], [3, -4]]) rect(ctx, '#3e2416', hx(dx) - 1, oy + dy - 1 - lean, 3, 3);
    for (const [dx, dy] of [[0, -4], [0, -5], [1, -6], [2, -6], [3, -5], [3, -4]]) rect(ctx, '#b07a45', hx(dx), oy + dy - lean, 1, 1);
    const lx = hx(3) - 1, ly = oy - 3 - lean; // the lantern
    rect(ctx, '#3e2416', lx - 1, ly - 1, 5, 7); rect(ctx, '#7a4a24', lx, ly, 3, 1); rect(ctx, '#f5c542', lx, ly + 1, 3, 3); rect(ctx, '#fff2a8', lx + 1, ly + 2, 1, 1); rect(ctx, '#7a4a24', lx, ly + 4, 3, 1);
  };
  if (look === 'shepherd' && dir === 'up') staff();
  ctx.drawImage(human(look, dir, st, bob, flip), ox, oy);
  if (look === 'shepherd' && dir !== 'up') staff();
}

// ---------------------------------------------------------------- HUD
let hudCache = '';
const clockText = () => {
  const mins = G.phase === 'day' ? 360 + (840 * G.t / G.len) : 1200 + (600 * G.t / G.len);
  const m = Math.floor(mins / 10) * 10 % 1440, h = Math.floor(m / 60), mm = m % 60;
  return `${(h + 11) % 12 + 1}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
function hud() {
  const night = G.phase === 'night';
  const home = sheep.filter(s => s.state === 'home').length, follow = sheep.filter(s => s.state === 'follow').length;
  const lost = sheep.filter(s => s.lost && s.state === 'wild').length;
  const time = clockText();
  const part = night ? 'Night' : G.len - G.t < 15 ? 'Dusk' : G.t < G.len * 0.35 ? 'Morning' : 'Afternoon';
  const key = [G.phase, G.day, home, follow, lost, sheep.length, G.lv, time, part].join('|');
  if (key !== hudCache) {
    hudCache = key;
    $('hud-day').textContent = 'Day ' + G.day;
    $('hud-time').textContent = time;
    $('hud-phase').textContent = part;
    $('hud-sun').className = night ? 'sunmoon moon' : 'sunmoon';
    $('hud-count').textContent = `Fold ${home}/${sheep.length}`;
    $('hud-follow').textContent = [follow ? `${follow} with you` : '', lost ? `${lost} lost` : ''].filter(Boolean).join(' · ');
    $('hud-lv').textContent = 'Lv ' + G.lv;
    $('hud-bar').className = night ? 'night' : '';
  }
  $('hud-bar').style.width = (100 * (1 - G.t / G.len)) + '%';
  $('hud-xpbar').style.width = (100 * G.xp / needXP(G.lv)) + '%';
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 1 / 30); last = now;
  if (mode === 'dialog') tickDialog(dt);
  update(dt);
  for (const e of fx) e.t += dt;
  fx = fx.filter(e => e.t < e.life);
  if (G.shake > 0) G.shake -= dt;
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  draw();
  if (mode !== 'title') hud();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- flow and input
function startGame() {
  audioInit();
  $('title').hidden = true; $('chapter').hidden = false;
  mode = 'chapter';
  setTimeout(() => { if (mode === 'chapter') beginPlay(); }, 4200);
}
function beginPlay() {
  $('chapter').hidden = true; $('hud').hidden = false; $('btn-whistle').hidden = false; $('btn-mute').hidden = false;
  mode = 'play'; prevMode = 'play';
  say([
    ['Woolsworth', 'Boss. BOSS. The field is empty. Where is everybody?'],
    ['shepherd', 'Out there. Scattered. Scared.'],
    ['Baabara', 'So... we wait here until they come back?'],
    ['shepherd', 'No. We go and get them.'],
    ['Woolsworth', 'Ugh. Cardio. Fine. I am in.'],
  ], { done() { toast('Walk near wild sheep to win their trust, then bring them through the gate before dark.', 5); } });
}
function restart() {
  $('end').hidden = true; newGame(); hudCache = ''; mode = 'play'; A.track = 'day';
  $('hud').hidden = false; $('btn-whistle').hidden = false;
  banner('Day 1', 'Green Pastures');
}
function togglePause() {
  if (mode === 'play') { mode = 'paused'; $('paused').hidden = false; }
  else if (mode === 'paused') { mode = 'play'; $('paused').hidden = true; last = performance.now(); }
}
function toggleMute() { A.muted = !A.muted; $('btn-mute').textContent = A.muted ? 'Muted' : 'Music on'; }

addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (e.repeat && (k === 'enter' || k === ' ')) return;
  keys[k] = true;
  audioInit();
  if (k === 'm') { toggleMute(); return; }
  if (mode === 'title') { if (k === 'enter' || k === ' ') startGame(); return; }
  if (mode === 'chapter') { if (k === 'enter' || k === ' ') beginPlay(); return; }
  if (mode === 'dialog') { if (k === 'enter' || k === ' ' || k === 'e') advance(); return; }
  if (mode === 'levelup') { const c = $('levelup').choices; const n = +k; if (n >= 1 && n <= c.length) chooseKnack(c[n - 1]); return; }
  if (mode === 'end') { if (k === 'enter') restart(); return; }
  if (k === 'p' || k === 'escape') { togglePause(); return; }
  if (mode !== 'play') return;
  if (k === ' ') whistle();
  if (k === 'n') G.t = G.len; // testing shortcut: skip to the next dusk or dawn
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; joy.on = false; joy.x = joy.y = 0; });

stage.addEventListener('pointerdown', e => {
  audioInit();
  if (e.target.closest('button')) return;
  if (mode === 'title') { startGame(); return; }
  if (mode === 'chapter') { beginPlay(); return; }
  if (mode === 'dialog') { advance(); return; }
  if (mode === 'paused') { togglePause(); return; }
  if (mode !== 'play') return;
  joy.on = true; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; joy.id = e.pointerId;
  try { stage.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
});
stage.addEventListener('pointermove', e => {
  if (!joy.on || e.pointerId !== joy.id) return;
  const dx = (e.clientX - joy.ox) / (scale * 14), dy = (e.clientY - joy.oy) / (scale * 14), l = Math.hypot(dx, dy);
  joy.x = l > 1 ? dx / l : dx; joy.y = l > 1 ? dy / l : dy;
});
const endJoy = e => { if (e.pointerId === joy.id) { joy.on = false; joy.x = joy.y = 0; } };
stage.addEventListener('pointerup', endJoy);
stage.addEventListener('pointercancel', endJoy);
$('btn-whistle').addEventListener('pointerdown', e => { e.stopPropagation(); audioInit(); whistle(); });
$('btn-mute').addEventListener('pointerdown', e => { e.stopPropagation(); toggleMute(); });
$('btn-again').addEventListener('click', restart);

// Debug hook for automated tests and tuning in the console.
window.__nn = { get G() { return G; }, get sh() { return sh; }, get sheep() { return sheep; }, get wolves() { return wolves; },
  get S() { return S; }, get mode() { return mode; }, get jory() { return jory; }, addXP, spawnJory };

// ---------------------------------------------------------------- boot
buildWorld();
newGame();
resize();
requestAnimationFrame(frame);
})();
