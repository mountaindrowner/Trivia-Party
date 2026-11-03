/* NINETY-NINE: Chapter 1 slice ("Green Pastures").
   One 320×180 canvas for the world, a DOM layer for text. No build step, no libraries.
   Design rules (see DESIGN.md §1): nothing is killed, no sheep is lost for good, forgiveness has one button. */
(() => {
'use strict';

// ---------------------------------------------------------------- setup
const W = 320, H = 180, WW = 960, WH = 640, TAU = Math.PI * 2;
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

// ---------------------------------------------------------------- palette and sprites
const PAL = {
  k: '#1a1423', w: '#f4efe4', W: '#cbbfb0', f: '#3b2f3a', y: '#ffffff', c: '#2f7f86', C: '#1f4a52',
  h: '#e0a879', H: '#b97a57', b: '#8a5a2b', B: '#5c3a1e', g: '#f2c14e', r: '#e0475a', n: '#0d0b12',
  p: '#f28fad', G: '#7c7f93', D: '#4a4c5e', Y: '#ffd23f', L: '#b5b8c8', o: '#ff8a3d', s: '#b08d57',
};
const SWAPS = {
  jory: { c: '#6b3f7e', C: '#3e2650', g: '#b08d57' },
  chomp: { w: '#d6cbb8', W: '#a89c8a', y: '#e0475a' },
  mercy: { b: '#3d3a45', y: '#f4efe4' },
};
const shepBase = [
  '....kkkk....', '...kcccck...', '..kcccccck..', '..kcchhhhk..', '..kchhhkhk..', '..kchhhhhk..',
  '..kCcHHHck..', '.kcccccccck.', 'kcccccccchk.', 'kCccccccck..', '.kggggggk...', '.kcccccck...',
  '.kCccccCk...', '.kCCCCCCk...',
];
const sheepBase = ['............', '............', '..kkkkkk....', '.kwwwwwwk...', 'kwwwwwwwwkk.',
  'kwwwwwwwkffk', 'kwwwwwwwkfyk', 'kWwwwwwwkffk', '.kWWWWWWWkk.'];
const wolfBase = ['..........k.k.', '.........kGkGk', 'kk......kGGGGk', 'kGkkkkkkGGGYGk',
  '.kGGGGGGGGGGDk', '.kGGGGGGGGGkkk', '.kLLGGGGGLLk..'];
const dogBase = ['.......kk.', 'k.....kbbk', 'kbkkkkbbkk', '.kbbbbbbbk', '.kbyyyybk.'];
const SPR = {
  shep: [
    shepBase.concat(['..kBk.kBk...', '..kkk.kkk...']),
    shepBase.concat(['.kBk...kBk..', '.kkk...kkk..']),
    shepBase.concat(['...kBkkBk...', '...kkkkkk...']),
  ],
  sheep: [sheepBase.concat(['..kfk..kfk..', '..kk...kk...']), sheepBase.concat(['.kfk...kfk..', '.kk....kk...'])],
  wolf: [wolfBase.concat(['.kDk..kDk.kDk.', '.kk...kk..kk..']), wolfBase.concat(['..kDk.kDk..kDk', '..kk..kk...kk.'])],
  dog: [dogBase.concat(['.kbk..kbk.', '.kk...kk..']), dogBase.concat(['..kbk.kbk.', '..kk..kk..'])],
  heart: [['.kk.kk.', 'krrkrrk', 'krrrrrk', '.krrrk.', '..krk..', '...k...']],
};
const set = (r, x, y, c) => { if (r[y] && r[y][x] !== undefined) r[y][x] = c; };
const MODS = {
  shades: r => { set(r, 9, 6, 'n'); set(r, 10, 6, 'n'); set(r, 8, 6, 'n'); },
  bow: r => { set(r, 9, 4, 'p'); set(r, 10, 4, 'p'); set(r, 10, 3, 'p'); set(r, 8, 3, 'p'); },
  beanie: r => { for (const x of [9, 10, 11]) { set(r, x, 4, 'o'); } set(r, 9, 3, 'o'); set(r, 10, 3, 'o'); set(r, 10, 2, 'y'); },
  bandana: r => { set(r, 8, 8, 'r'); set(r, 9, 8, 'r'); set(r, 7, 8, 'r'); },
  specs: r => { set(r, 9, 6, 'g'); set(r, 10, 6, 'y'); set(r, 9, 5, 'g'); },
  scarf: r => { set(r, 7, 7, 'c'); set(r, 8, 7, 'c'); set(r, 8, 8, 'c'); },
  bandage: r => { set(r, 4, 4, 'p'); set(r, 3, 5, 'p'); set(r, 4, 5, 'p'); set(r, 5, 5, 'p'); set(r, 4, 6, 'p'); },
  doc: r => { set(r, 9, 3, 'y'); set(r, 10, 3, 'r'); set(r, 11, 3, 'y'); set(r, 9, 4, 'y'); set(r, 10, 4, 'y'); set(r, 11, 4, 'y'); },
  bell: r => { set(r, 9, 8, 'g'); set(r, 9, 9, 'Y'); },
  candle: r => { set(r, 10, 3, 'y'); set(r, 10, 2, 'y'); set(r, 10, 1, 'o'); set(r, 10, 0, 'g'); },
  collar: r => { set(r, 8, 8, 'D'); set(r, 7, 8, 'D'); set(r, 8, 7, 'L'); },
};
const cache = new Map();
function spr(name, fr, flip, mods, swap) {
  const key = `${name}|${fr}|${flip ? 1 : 0}|${mods || ''}|${swap || ''}`;
  let c = cache.get(key);
  if (c) return c;
  const rows = SPR[name][fr].map(s => s.split(''));
  if (mods) for (const m of mods.split(',')) if (m && MODS[m]) MODS[m](rows);
  const pal = swap ? Object.assign({}, PAL, SWAPS[swap]) : PAL;
  const h = rows.length, w = rows[0].length;
  c = mk(w, h);
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][i];
    if (ch === '.') continue;
    x.fillStyle = pal[ch] || '#f0f';
    x.fillRect(flip ? w - 1 - i : i, j, 1, 1);
  }
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
function ptext(str, x, y, col = PAL.w, outline = PAL.k, center = true) {
  str = String(str).toUpperCase();
  const w = str.length * 4 - 1;
  let ox = Math.round(center ? x - w / 2 : x), oy = Math.round(y);
  const draw = (dx, dy, c) => {
    ctx.fillStyle = c;
    for (let n = 0; n < str.length; n++) {
      const g = GLYPH[str[n]] || GLYPH[' '];
      for (let row = 0; row < 5; row++) {
        const bits = +g[row];
        for (let b = 0; b < 3; b++) if (bits & (4 >> b)) ctx.fillRect(ox + n * 4 + b + dx, oy + row + dy, 1, 1);
      }
    }
  };
  if (outline) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) draw(dx, dy, outline);
  draw(0, 0, col);
}

// Filled pixel disc, drawn in rows so edges stay crisp.
function disc(c, cx, cy, r, col) {
  if (col) c.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

// ---------------------------------------------------------------- the world
const FOLD = { x: 400, y: 250, w: 160, h: 110 };
const GX = FOLD.x + FOLD.w / 2, GATE = 30;
const FIRE = { x: GX, y: FOLD.y + 44 };
const FENCE = [
  [FOLD.x, FOLD.y, FOLD.w, 4],
  [FOLD.x, FOLD.y, 4, FOLD.h],
  [FOLD.x + FOLD.w - 4, FOLD.y, 4, FOLD.h],
  [FOLD.x, FOLD.y + FOLD.h - 4, (FOLD.w - GATE) / 2, 4],
  [FOLD.x + (FOLD.w + GATE) / 2, FOLD.y + FOLD.h - 4, (FOLD.w - GATE) / 2, 4],
];
const POND = { x: 210, y: 480, r: 30 };
const inFold = (x, y) => x > FOLD.x + 5 && x < FOLD.x + FOLD.w - 5 && y > FOLD.y + 5 && y < FOLD.y + FOLD.h - 5;
const insideFold = e => inFold(e.x, e.y);

let ground, treeImg, trees = [], rocks = [];
function buildWorld() {
  ground = mk(WW, WH);
  const g = ground.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#5a9a46'; g.fillRect(0, 0, WW, WH);
  // big soft patches of lighter and darker grass
  for (let i = 0; i < 60; i++) disc(g, rand(0, WW), rand(0, WH), Math.floor(rand(14, 40)), pick(['#549341', '#5fa04b', '#528f40']));
  for (let i = 0; i < 11000; i++) {
    g.fillStyle = pick(['#4b8638', '#4b8638', '#6aab52', '#437c33']);
    g.fillRect(Math.floor(rand(0, WW)), Math.floor(rand(0, WH)), 1, 1);
  }
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(rand(0, WW)), y = Math.floor(rand(0, WH));
    g.fillStyle = '#3d7530'; g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y, 1, 2); g.fillRect(x + 1, y + 1, 1, 2);
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rand(0, WW)), y = Math.floor(rand(0, WH));
    g.fillStyle = pick(['#f4efe4', '#f2c14e', '#f28fad', '#cfe3ff']); g.fillRect(x, y, 1, 1);
    g.fillStyle = '#3d7530'; g.fillRect(x, y + 1, 1, 1);
  }
  // dirt paths out of the gate
  const path = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
      for (let k = 0; k <= n; k++) { const t = k / n; disc(g, ax + (bx - ax) * t, ay + (by - ay) * t, 7, '#8f7448'); }
      for (let k = 0; k <= n; k++) { const t = k / n; disc(g, ax + (bx - ax) * t, ay + (by - ay) * t, 5, '#a98a5a'); }
    }
  };
  path([[GX, FOLD.y + FOLD.h - 2], [GX, 420], [500, 480], [470, 560], [490, WH + 10]]);
  path([[GX, 420], [380, 440], [290, 470], [250, 478]]);
  path([[GX, 420], [610, 410], [720, 380], [840, 300], [WW + 10, 260]]);
  for (let i = 0; i < 400; i++) { // pebbles on the path
    const x = Math.floor(rand(0, WW)), y = Math.floor(rand(0, WH));
    const d = g.getImageData(x, y, 1, 1).data;
    if (d[0] > 160 && d[0] < 175) { g.fillStyle = '#c4a675'; g.fillRect(x, y, 1, 1); }
  }
  // the pond (still waters, a teaser for Chapter 2)
  disc(g, POND.x, POND.y + 2, POND.r + 2, '#3a6b33');
  disc(g, POND.x, POND.y, POND.r + 1, '#2c4f7a');
  disc(g, POND.x, POND.y, POND.r - 1, '#3f7fbf');
  disc(g, POND.x - 6, POND.y - 6, POND.r - 12, '#4f8fcf');
  g.fillStyle = '#9fc8f0';
  for (let i = 0; i < 9; i++) g.fillRect(Math.floor(POND.x + rand(-18, 14)), Math.floor(POND.y + rand(-16, 16)), Math.floor(rand(3, 7)), 1);
  // the fold: hay floor, fence
  g.fillStyle = '#b8964f'; g.fillRect(FOLD.x, FOLD.y, FOLD.w, FOLD.h);
  g.fillStyle = '#c9a860'; g.fillRect(FOLD.x + 2, FOLD.y + 2, FOLD.w - 4, FOLD.h - 4);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = pick(['#b08d4a', '#e0c47a', '#d7b56a']);
    g.fillRect(Math.floor(FOLD.x + rand(3, FOLD.w - 5)), Math.floor(FOLD.y + rand(3, FOLD.h - 5)), Math.random() < 0.5 ? 2 : 1, 1);
  }
  for (const [x, y, w, h] of FENCE) {
    g.fillStyle = '#5c3a1e'; g.fillRect(x, y, w, h);
    g.fillStyle = '#a86f3c';
    if (w > h) { g.fillRect(x, y, w, 1); g.fillRect(x, y + 2, w, 1); } else { g.fillRect(x, y, 1, h); g.fillRect(x + 2, y, 1, h); }
    g.fillStyle = '#7a4e2a';
    if (w > h) for (let px = x; px < x + w; px += 10) g.fillRect(px, y - 2, 3, 6);
    else for (let py = y; py < y + h; py += 10) g.fillRect(x, py, 4, 3);
  }
  // gate posts
  g.fillStyle = '#4a2e18';
  g.fillRect(GX - GATE / 2 - 3, FOLD.y + FOLD.h - 8, 4, 9);
  g.fillRect(GX + GATE / 2 - 1, FOLD.y + FOLD.h - 8, 4, 9);
  // fire ring
  for (let a = 0; a < 8; a++) { g.fillStyle = a % 2 ? '#8b8a9a' : '#6d6c7c'; g.fillRect(Math.round(FIRE.x + Math.cos(a / 8 * TAU) * 6) - 1, Math.round(FIRE.y + Math.sin(a / 8 * TAU) * 4) - 1, 3, 2); }
  // rocks
  rocks = [];
  for (let i = 0; i < 26; i++) {
    const x = rand(20, WW - 20), y = rand(20, WH - 20);
    if (Math.hypot(x - GX, y - (FOLD.y + 55)) < 120 || Math.hypot(x - POND.x, y - POND.y) < 44) continue;
    g.fillStyle = '#3d7530'; g.fillRect(Math.round(x) - 3, Math.round(y) + 1, 7, 2);
    disc(g, x, y, 3, '#5b5a6a'); disc(g, x - 1, y - 1, 2, '#8b8a9a'); g.fillStyle = '#b5b8c8'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 1, 1);
  }
  // tree sprite
  treeImg = mk(20, 24);
  const t = treeImg.getContext('2d');
  t.fillStyle = 'rgba(0,0,0,.25)'; t.fillRect(4, 21, 12, 3);
  t.fillStyle = '#1a1423'; t.fillRect(8, 14, 5, 9); t.fillStyle = '#5c3a1e'; t.fillRect(9, 14, 3, 8);
  disc(t, 10, 9, 9, '#1a1423'); disc(t, 10, 9, 8, '#2b5e30'); disc(t, 9, 8, 6, '#367a3b'); disc(t, 7, 6, 3, '#4b9a4a');
  t.fillStyle = '#6cba5c'; t.fillRect(6, 4, 2, 1); t.fillRect(12, 6, 1, 1); t.fillRect(9, 11, 1, 1);
  trees = [];
  let tries = 0;
  while (trees.length < 46 && tries++ < 2000) {
    const x = rand(14, WW - 14), y = rand(26, WH - 4);
    if (x > FOLD.x - 40 && x < FOLD.x + FOLD.w + 40 && y > FOLD.y - 30 && y < FOLD.y + FOLD.h + 70) continue;
    if (Math.hypot(x - POND.x, y - POND.y) < 50) continue;
    if (trees.some(o => Math.hypot(o.x - x, o.y - y) < 26)) continue;
    const d = g.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    if (d[0] > 130) continue; // not on the path
    trees.push({ x, y, r: 4 });
  }
}

const OBST = () => trees.concat([POND]);
function collide(e, r) {
  e.x = clamp(e.x, 6, WW - 6); e.y = clamp(e.y, 8, WH - 3);
  for (const [x, y, w, h] of FENCE) {
    const cx = clamp(e.x, x, x + w), cy = clamp(e.y, y, y + h);
    const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
    if (d < r) {
      if (d === 0) { e.y += (e.y < y + h / 2 ? -r : r); continue; }
      e.x = cx + dx / d * r; e.y = cy + dy / d * r;
    }
  }
  for (const o of OBST()) {
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
  if (Math.abs(e.x - GX) < 9 && Math.abs(e.y - first) < 13) return [GX, second];
  if (!a && e.y < FOLD.y + FOLD.h && e.y > FOLD.y - 8 && (e.x < FOLD.x || e.x > FOLD.x + FOLD.w)) {
    // beside the fold: walk down past the corner first
    return [e.x < GX ? FOLD.x - 10 : FOLD.x + FOLD.w + 10, outY + 4];
  }
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
const NIGHTS = [null, { day: 95, night: 45, wolves: 5, fear: 3 }, { day: 85, night: 60, wolves: 10, fear: 3 }, { day: 85, night: 75, wolves: 15, fear: 4 }];

let G, sh, sheep, wolves, hearts, fx, shots, dogs, jory;
let S; // shepherd's knacks
let mode = 'title';
function newGame() {
  S = { speed: 70, staffRange: 24, staffCd: 1.0, lantern: 40, lanternLvl: 1, callR: 36, trustRate: 0.55, sling: 0, harp: 0, taken: {} };
  sh = { x: GX, y: FOLD.y + FOLD.h + 26, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, anim: 0, stun: 0, staffT: 0, slingT: 0, harpT: 4, whistleT: 0, moving: false, swing: 0 };
  sheep = []; wolves = []; hearts = []; fx = []; shots = []; dogs = []; jory = null;
  G = {
    day: 1, phase: 'day', t: 0, len: NIGHTS[1].day, xp: 0, lv: 1, spawns: [], shake: 0, nameI: 0,
    roles: { lookout: null, doc: null, lamp: null }, flags: {},
    stats: { found: 0, joined: 0, turned: 0, forgiven: 0, scattered: 0 },
    lvPending: 0,
  };
  const starters = [['Woolsworth', 'shades'], ['Baabara', 'bow'], ['Ramsey', 'beanie']];
  starters.forEach(([n, l], i) => { const s = addSheep(sh.x - 14 + i * 12, sh.y + 10, n, l); s.state = 'follow'; });
  for (let i = 0; i < 12; i++) spawnWild(150, i < 6 ? 330 : 520);
}
function nextName() { return NAMES[G.nameI++ % NAMES.length]; }
function addSheep(x, y, name, look) {
  const s = { x, y, vx: 0, vy: 0, kx: 0, ky: 0, face: Math.random() < 0.5 ? 1 : -1, anim: 0, name, look: look ?? pick(LOOKS),
    state: 'wild', trust: 0, lost: false, hurt: false, heal: 0, role: null, ax: x, ay: y, tx: x, ty: y, wt: 0, scaredT: 0, baaT: rand(3, 12), bite: 0 };
  sheep.push(s);
  return s;
}
function spawnWild(minD, maxD) {
  for (let tries = 0; tries < 60; tries++) {
    const a = rand(0, TAU), d = rand(minD, maxD);
    const x = clamp(GX + Math.cos(a) * d, 20, WW - 20), y = clamp(FOLD.y + 55 + Math.sin(a) * d * 0.8, 24, WH - 12);
    if (Math.hypot(x - POND.x, y - POND.y) < 44 || trees.some(t => Math.hypot(t.x - x, t.y - y) < 10)) continue;
    if (x > FOLD.x - 20 && x < FOLD.x + FOLD.w + 20 && y > FOLD.y - 20 && y < FOLD.y + FOLD.h + 30) continue;
    const n = Math.random() < 0.35 ? 2 : 1;
    for (let k = 0; k < n; k++) addSheep(x + k * 10, y + k * 4, nextName());
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
  day: { bpm: 108,
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
      if (tr.lead[i]) note(t, mf(tr.lead[i]), 0.16, 'square', 0.07, A.mus);
      if (i % 2 === 1) hat(t, tr.kick ? 0.05 : 0.025);
      if (tr.kick && i % 8 === 0) note(t, 120, 0.12, 'sine', 0.5, A.mus, -80);
      if (tr.kick && i % 8 === 4) hat(t, 0.12, 0.09, 1800);
      if (!tr.kick && i % 16 === 0) note(t, 90, 0.3, 'sine', 0.35, A.mus, -40);
    }
    A.next += 60 / tr.bpm / 4; A.step++;
  }
}
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
const sfxOk = () => A.ctx && !A.muted;

// ---------------------------------------------------------------- UI helpers
const ui = $('ui'), stage = $('stage');
let scale = 1;
function resize() {
  const aw = Math.max(100, document.documentElement.clientWidth - 32), ah = Math.max(60, window.innerHeight - 8);
  let s = Math.min(aw / W, ah / H);
  if (s >= 2) s = Math.floor(s);
  scale = s;
  stage.style.width = W * s + 'px'; stage.style.height = H * s + 'px';
  ui.style.transform = `scale(${s})`;
}
addEventListener('resize', resize);

let toastT = 0;
function toast(msg, secs = 3.2) { const el = $('toast'); el.textContent = msg; el.classList.add('on'); toastT = secs; }
function banner(big, small = '') {
  const el = $('banner'); el.classList.remove('on'); void el.offsetWidth;
  el.innerHTML = ''; el.append(big); if (small) { const s = document.createElement('small'); s.textContent = small; el.append(s); }
  el.classList.add('on');
}
function pop(x, y, text, col = PAL.w, life = 1.1) { fx.push({ kind: 'text', x, y, text, col, t: 0, life }); }
function ring(x, y, r, col, life = 0.45) { fx.push({ kind: 'ring', x, y, r, col, t: 0, life }); }

// Dialogue: a queue of scenes. Each scene is lines plus an optional final single choice.
const WHO = {
  shepherd: { name: 'THE SHEPHERD', draw: () => spr('shep', 0, false) },
  jory: { name: 'JORY', draw: () => spr('shep', 0, true, '', 'jory') },
};
function whoFor(key) {
  if (WHO[key]) return WHO[key];
  const s = sheep.find(q => q.name === key);
  return { name: key.toUpperCase(), draw: () => spr('sheep', 0, false, s ? modsFor(s) : '', s && s.isChomp ? 'chomp' : null) };
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
  const w = whoFor(who);
  $('dname').textContent = w.name;
  const pc = $('portrait'), p = pc.getContext('2d'), img = w.draw();
  p.clearRect(0, 0, 16, 16); p.imageSmoothingEnabled = false;
  p.drawImage(img, Math.floor((16 - img.width) / 2), Math.floor((16 - img.height) / 2));
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
    b.className = 'pbtn forgive'; b.type = 'button'; b.textContent = dlg.choice;
    b.addEventListener('pointerdown', e => { e.stopPropagation(); advance(); });
    $('dchoices').append(b); b.focus({ preventScroll: true });
  } else $('dnext').hidden = false;
}
function advance() {
  if (!dlg) return;
  if (dlg.shown < dlg.text.length) { finishLine(); return; }
  if (dlg.i === dlg.lines.length - 1 && dlg.choice) {
    const c = dlg.onChoice; dlg.choice = null; if (c) c();
  }
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
  { id: 'lantern', name: 'Brighter Lantern', desc: 'The dark has to back off a little more.', max: 4, apply() { S.lantern += 10; S.lanternLvl += 0.6; } },
  { id: 'sandals', name: 'Swift Sandals', desc: 'Shepherding is a cardio sport.', max: 3, apply() { S.speed += 10; } },
  { id: 'voice', name: 'Kind Voice', desc: 'Wild sheep trust you faster, from farther off.', max: 3, apply() { S.callR += 9; S.trustRate *= 1.35; } },
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
    b.className = 'card'; b.type = 'button';
    const lvl = (S.taken[k.id] || 0) + 1;
    b.innerHTML = `<b></b><span></span><em>${k.max > 1 ? 'LV ' + lvl + '/' + k.max : 'NEW FRIEND'} · KEY ${i + 1}</em>`;
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
  else say([['Baabara', "There's TWO of them now?"], ['shepherd', 'Goodness and Mercy. They\'ll follow you all your days.']]);
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
    pop(s.x, s.y - 14, 'FOUND', PAL.g);
    toast(`${s.name} knew your voice.`);
  } else {
    G.stats.joined++;
    pop(s.x, s.y - 14, '♥', PAL.p);
    if (!G.flags.firstJoin) { G.flags.firstJoin = true; toast(`${s.name} joined the flock! Walk them through the gate.`, 4); }
    else toast(`${s.name} joined the flock!`);
  }
  dropHearts(s.x, s.y, 2); sfx.join();
}
function goHome(s) {
  s.state = 'home'; s.wt = 0;
  if (!G.flags.firstHome) {
    G.flags.firstHome = true;
    say([['Woolsworth', 'Home sweet home. Smells like hay and victory.'], ['Baabara', "There are so many more of us out there, though."], ['shepherd', "Then I'll keep going out. Every one of them."]]);
  }
}
function scare(s, by) {
  if (s.state === 'chomp') return;
  const wasOut = !insideFold(s);
  s.from = { x: by.x, y: by.y }; s.scaredT = wasOut ? 2.4 : 1.4; s.state = 'scared'; s.hurt = true;
  if (s.role && wasOut) clearRole(s);
  pop(s.x, s.y - 14, '!', PAL.r); sfx.hurt();
  if (wasOut) {
    G.stats.scattered++;
    if (!G.flags.firstScatter) { G.flags.firstScatter = true; toast(`${s.name} got scared and ran off. Go find them.`, 4); }
  }
}
function clearRole(s) { for (const k in G.roles) if (G.roles[k] === s) G.roles[k] = null; s.role = null; }
function dropHearts(x, y, n) { for (let i = 0; i < n; i++) hearts.push({ x: x + rand(-4, 4), y: y + rand(-4, 2), vx: rand(-30, 30), vy: rand(-40, -10), z: 0, t: 0 }); }

const ROLE_LINES = {
  lookout: n => [[n, "I'll be lookout. I brought my own bell."], ['shepherd', "Thank you. Ring it if anything comes."], [n, 'Oh, I will ring it. Constantly.']],
  doc: n => [[n, "Some of us got nicked up out there. I'll be the doc."], ['Woolsworth', 'Where did you get a stethoscope?'], [n, "Nobody asks the doc where the doc gets things."]],
  lamp: n => [[n, "I'll keep the fire going. Fire good. Dark bad. That's the whole job."], ['shepherd', "Wolves don't like a bright fire. Good thinking."]],
};
function checkRoles() {
  const home = sheep.filter(s => s.state === 'home' && insideFold(s));
  const free = home.filter(s => !s.role && !s.hurt && !s.isChomp);
  const assign = (role, need) => {
    if (G.roles[role] || home.length < need || !free.length) return;
    const s = free.shift(); s.role = role; G.roles[role] = s;
    pop(s.x, s.y - 14, role === 'lamp' ? 'LAMPLIGHTER' : role.toUpperCase(), PAL.g, 1.8);
    if (!G.flags['role_' + role]) { G.flags['role_' + role] = true; say(ROLE_LINES[role](s.name)); }
    else toast(`${s.name} took over as ${role === 'lamp' ? 'lamplighter' : role}.`);
  };
  assign('lookout', 3); assign('doc', 5); assign('lamp', 8);
  const c = sheep.find(s => s.isChomp);
  if (c && c.state === 'home' && !c.hurt && c.role !== 'guard') {
    c.role = 'guard';
    say([['Chomp', "I've been thinking. These teeth."], ['Chomp', "What if I used them... for wolves?"], ['shepherd', 'Guard the fold, Chomp. Just chase them off.'], ['Chomp', 'Chasing. Only chasing. Mostly.']]);
  }
}

const fireR = () => 46 + (G.roles.lamp ? 24 : 0) + (jory && jory.state === 'redeemed' ? 8 : 0);
function updSheep(s, dt) {
  const sp = s.hurt ? 0.65 : 1;
  s.baaT -= dt;
  if (s.baaT <= 0) {
    s.baaT = rand(6, 16);
    if (Math.abs(s.x - sh.x) < W / 2 && Math.abs(s.y - sh.y) < H / 2 && s.state !== 'scared') {
      pop(s.x, s.y - 14, s.state === 'wild' ? (s.lost ? 'BAA?' : 'BAA') : pick(['BAA', 'MEH', 'BAA!']), PAL.w, 0.9);
      if (Math.random() < 0.5) sfx.baa();
    }
  }
  switch (s.state) {
    case 'wild': {
      s.wt -= dt;
      if (s.wt <= 0) { s.tx = s.ax + rand(-30, 30); s.ty = s.ay + rand(-22, 22); s.wt = rand(2, 5); }
      steer(s, s.tx, s.ty, 14 * sp, dt, 6);
      const d = dist(s, sh);
      if (d < S.callR) {
        s.trust += dt * S.trustRate * (s.lost ? 2 : 1);
        if (s.trust >= 1) joinFlock(s);
      } else s.trust = Math.max(0, s.trust - dt * 0.12);
      break;
    }
    case 'follow': {
      const i = s.fi || 0, r = 9 * Math.sqrt(i + 1), a = i * 2.4;
      const bx = sh.x - sh.face * 12 + Math.cos(a) * r, by = sh.y + 2 + Math.sin(a) * r * 0.6;
      const [tx, ty] = nav(s, bx, by);
      const d = dist(s, sh);
      steer(s, tx, ty, (d > 90 ? 82 : 60) * (s.hurt ? 0.8 : 1), dt, 14);
      if (insideFold(s)) goHome(s);
      break;
    }
    case 'home': {
      let tx = s.tx, ty = s.ty;
      const night = G.phase === 'night';
      if (s.role === 'lookout' && night) { tx = FOLD.x + 12; ty = FOLD.y + 14; }
      else if (s.role === 'lamp') { tx = FIRE.x + 12; ty = FIRE.y + 4; }
      else if (s.role === 'doc') {
        const p = sheep.find(q => q.hurt && q.state === 'home' && insideFold(q));
        if (p) { tx = p.x + 9; ty = p.y; } else if (s.wt <= 0) { s.tx = rand(FOLD.x + 14, FOLD.x + FOLD.w - 14); s.ty = rand(FOLD.y + 14, FOLD.y + FOLD.h - 18); s.wt = rand(3, 6); }
      } else if (s.role === 'guard' && night) {
        let best = null, bd = 100;
        for (const w of wolves) if (!w.flee && dist(w, FIRE) < 110) { const d = dist(w, s); if (d < bd) { bd = d; best = w; } }
        if (best) {
          [tx, ty] = nav(s, best.x, best.y);
          s.bite -= dt;
          if (bd < 10 && s.bite <= 0) { s.bite = 1.1; best.fear += 1; knock(best, s, 110); pop(best.x, best.y - 12, 'CHOMP', PAL.g); sfx.bark(); }
        } else [tx, ty] = nav(s, GX, FOLD.y + FOLD.h - 22);
      } else {
        s.wt -= dt;
        if (s.wt <= 0 || !inFold(s.tx, s.ty)) { s.tx = rand(FOLD.x + 14, FOLD.x + FOLD.w - 14); s.ty = rand(FOLD.y + 14, FOLD.y + FOLD.h - 18); s.wt = rand(3, 7); }
        [tx, ty] = nav(s, s.tx, s.ty);
      }
      if (s.role === 'doc') s.wt -= dt;
      steer(s, tx, ty, (s.role === 'guard' && night ? 62 : 22) * sp, dt, 6);
      if (s.hurt && G.roles.doc && G.roles.doc !== s && insideFold(s)) {
        s.heal += dt / 6;
        if (s.heal >= 1) { s.hurt = false; s.heal = 0; pop(s.x, s.y - 14, '+', PAL.g); dropHearts(s.x, s.y, 1);
          toast(`Doc ${G.roles.doc.name} patched up ${s.name}.`); }
      }
      break;
    }
    case 'scared': {
      s.scaredT -= dt;
      const dx = s.x - s.from.x, dy = s.y - s.from.y, d = Math.hypot(dx, dy) || 1;
      steer(s, s.x + dx / d * 40, s.y + dy / d * 40, 72 * sp, dt, 1);
      if (s.scaredT <= 0) {
        if (insideFold(s)) { s.state = 'home'; }
        else { s.state = 'wild'; s.lost = true; s.trust = 0; s.ax = s.x; s.ay = s.y; s.wt = 0; }
      }
      break;
    }
    case 'stolen': {
      if (!jory) { s.state = 'follow'; break; }
      const i = s.fi || 0;
      const [tx, ty] = nav(s, jory.x - jory.face * 10 + (i % 2) * 6, jory.y + i * 5 - 4);
      steer(s, tx, ty, 58, dt, 10);
      break;
    }
    case 'chomp': updChomp(s, dt); break;
  }
  move(s, dt, 4);
}

function updChomp(s, dt) {
  const d = dist(s, sh);
  s.bite -= dt;
  if (d < 72) {
    if (!G.flags.chompHint) { G.flags.chompHint = true; toast('Chomp is scared. Stand still and let him come to you.', 5); }
    if (sh.moving) {
      const dx = s.x - sh.x, dy = s.y - sh.y, n = d || 1;
      steer(s, s.x + dx / n * 30, s.y + dy / n * 30, 34, dt, 1);
      s.trust = Math.max(0, s.trust - dt * 0.3);
      if (d < 13 && s.bite <= 0) {
        s.bite = 2.2; sh.stun = 0.7; knock(sh, s, 120); G.shake = 0.25; sfx.hurt();
        pop(s.x, s.y - 14, 'CHOMP!', PAL.r);
        if (!G.flags.bitten) { G.flags.bitten = true; toast('Chomp bit you. Ow. Try being still.', 4); }
      }
    } else {
      steer(s, sh.x + (s.x < sh.x ? -14 : 14), sh.y, 12, dt, 6);
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
    choice: 'FORGIVE',
    onChoice() { G.stats.forgiven++; sfx.forgive(); ring(s.x, s.y - 4, 30, PAL.g, 1.2); },
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
  const a = rand(0, TAU), R = rand(230, 290);
  const w = { x: clamp(FIRE.x + Math.cos(a) * R, 8, WW - 8), y: clamp(FIRE.y + Math.sin(a) * R, 10, WH - 6),
    vx: 0, vy: 0, kx: 0, ky: 0, face: 1, anim: 0, fear: 0, fearMax: NIGHTS[G.day].fear, flee: 0, rest: 0 };
  wolves.push(w);
  if (G.roles.lookout) { sfx.bell(); pop(G.roles.lookout.x, G.roles.lookout.y - 16, 'DING', PAL.g, 0.8); }
  if (!G.flags.wolfTalk && G.day === 1) {
    G.flags.wolfTalk = true;
    say([['Woolsworth', "WOLF. That's a wolf. I'm not being dramatic."], ['shepherd', 'Stay close to the light. I have you.']]);
  }
}
function turnWolf(w) {
  w.flee = 2.6; G.stats.turned++; dropHearts(w.x, w.y, 1); sfx.yelp(); pop(w.x, w.y - 12, pick(['YIPE', 'NOPE', '!']), PAL.L, 0.8);
}
function updWolf(w, dt) {
  if (w.flee > 0) {
    const dx = w.x - sh.x, dy = w.y - sh.y, d = Math.hypot(dx, dy) || 1;
    w.vx = dx / d * 100; w.vy = dy / d * 100;
    w.flee -= dt;
    if (w.flee <= 0) w.gone = true;
    w.x += w.vx * dt; w.y += w.vy * dt; w.face = w.vx > 0 ? 1 : -1; w.anim += 100 * dt;
    if (w.x < -20 || w.x > WW + 20 || w.y < -20 || w.y > WH + 20) w.gone = true;
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
      steer(w, tx, ty, 46 * slow, dt, 1);
      if (dist(w, best) < 8) { scare(best, w); w.rest = 1.7; w.rx = best.x; w.ry = best.y; }
    } else steer(w, sh.x, sh.y, 40 * slow, dt, 1);
    if (dsh < 9 && sh.stun <= 0) {
      sh.stun = 0.4; knock(sh, w, 110); w.rest = 1; w.rx = sh.x; w.ry = sh.y; G.shake = 0.2; sfx.hurt();
    }
  }
  move(w, dt, 4);
}

function spawnJory() {
  jory = { x: WW - 14, y: FIRE.y + 60, vx: 0, vy: 0, kx: 0, ky: 0, face: -1, anim: 0, nerve: 1, state: 'sneak', tx: 0, ty: 0 };
  say([['Woolsworth', 'Boss. There is a guy. A guy guy. With a SACK.'], ['Baabara', "He's sneaking toward the fold!"], ['shepherd', "Stay close to him. He'll run out of places to hide."]]);
}
function updJory(dt) {
  const j = jory;
  if (j.state === 'redeemed') {
    steer(j, GX + 22, FOLD.y + FOLD.h + 8, 40, dt, 8); move(j, dt, 4);
    return;
  }
  if (j.state === 'scene') { j.vx = j.vy = 0; return; }
  const d = dist(j, sh);
  let slow = 1;
  if (d < 18) { j.nerve -= dt / 3.5; slow = 0.55; if (Math.random() < dt * 2) pop(j.x, j.y - 20, pick(['!', '?!', 'UH']), PAL.g, 0.5); }
  else j.nerve = Math.min(1, j.nerve + dt / 20);
  if (j.nerve <= 0) { joryScene(false); return; }
  if (j.state === 'sneak') {
    const targets = sheep.filter(s => s.state === 'home' && s.role !== 'guard');
    const pool = targets.length ? targets : sheep.filter(s => s.state === 'follow');
    let best = null, bd = 1e9;
    for (const s of pool) { const q = dist(j, s); if (q < bd) { bd = q; best = s; } }
    if (best) {
      const [tx, ty] = nav(j, best.x, best.y);
      steer(j, tx, ty, 44 * slow, dt, 1);
      if (bd < 10) {
        const grab = pool.filter(s => dist(s, j) < 34).slice(0, 3);
        grab.forEach((s, i) => { s.state = 'stolen'; s.fi = i; if (s.role) clearRole(s); });
        pop(j.x, j.y - 20, 'HEH', PAL.L);
        toast(`Jory is leading ${grab.map(s => s.name).join(', ')} away!`, 4);
        j.state = 'run'; j.tx = pick([30, WW - 30]); j.ty = pick([30, WH - 30]);
      }
    } else steer(j, sh.x, sh.y, 30, dt, 20);
  } else {
    if (d < 50) { // juke away from the Shepherd
      const dx = j.x - sh.x, dy = j.y - sh.y, n = d || 1, wob = Math.sin(performance.now() / 260) * 0.8;
      steer(j, j.x + (dx / n - dy / n * wob) * 40, j.y + (dy / n + dx / n * wob) * 40, 52 * slow, dt, 1);
    } else {
      steer(j, j.tx, j.ty, 46 * slow, dt, 4);
      if (Math.hypot(j.x - j.tx, j.y - j.ty) < 20) { j.tx = rand(30, WW - 30); j.ty = rand(30, WH - 30); }
    }
  }
  move(j, dt, 4);
}
function joryScene(atDawn) {
  jory.state = 'scene';
  const lines = atDawn
    ? [['jory', "Sun's up. Nowhere left to hide. Fine. You got me."]]
    : [['jory', 'Alright, alright! You got me. Go on, then.']];
  lines.push(['shepherd', 'Go on and what?'], ['jory', 'Do what shepherds do to thieves. I know how this goes.']);
  say(lines, {
    choice: 'FORGIVE',
    onChoice() { G.stats.forgiven++; sfx.forgive(); ring(jory.x, jory.y - 6, 34, PAL.g, 1.2); },
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
        toast('Jory joined the farm as NIGHT WATCH.', 4);
        if (atDawn) endGame();
      } });
    },
  });
}

function updDog(g, i, dt) {
  g.cd -= dt;
  if (g.dash && (g.dash.gone || g.dash.flee > 0)) g.dash = null;
  if (G.phase === 'night' && !g.dash && g.cd <= 0) {
    let best = null, bd = 80;
    for (const w of wolves) if (!w.flee) { const d = dist(w, sh); if (d < bd) { bd = d; best = w; } }
    g.dash = best;
  }
  if (g.dash) {
    steer(g, g.dash.x, g.dash.y, 115, dt, 1);
    if (dist(g, g.dash) < 9) {
      g.dash.fear += 1; knock(g.dash, g, 120); pop(g.x, g.y - 10, 'WOOF', PAL.w, 0.6); sfx.bark();
      g.dash = null; g.cd = 1.5;
    }
  } else {
    const side = i === 0 ? -1 : 1;
    steer(g, sh.x + side * 13, sh.y + 6, dist(g, sh) > 60 ? 100 : 74, dt, 10);
    if (G.phase === 'day') for (const s of sheep) if (s.state === 'wild' && dist(s, g) < 40) s.trust += dt * 0.12;
  }
  move(g, dt, 3);
}

// ---------------------------------------------------------------- phases
function startNight() {
  const cfg = NIGHTS[G.day];
  G.phase = 'night'; G.t = 0; G.len = cfg.night;
  G.spawns = [];
  for (let i = 0; i < cfg.wolves; i++) G.spawns.push(2 + (cfg.night * 0.75) * i / cfg.wolves + rand(0, 2));
  A.track = 'night';
  const out = sheep.filter(s => s.state === 'follow' || s.state === 'wild').length;
  banner('NIGHT ' + G.day, out ? 'Keep them close to the light.' : 'Everyone is home. Guard the gate.');
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
  banner('DAY ' + G.day, `${home} safe in the fold${lost ? ` · ${lost} still out there` : ''}`);
  for (let i = 0; i < 4; i++) spawnWild(260, 560);
  if (G.day === 2) {
    const c = addSheep(880, 90, 'Chomp', ''); c.isChomp = true; c.state = 'chomp';
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
  sh.whistleT = 4; sfx.whistle(); ring(sh.x, sh.y - 6, 80, PAL.g, 0.6);
  for (const s of sheep) {
    const d = dist(s, sh);
    if (d > 80) continue;
    if (s.state === 'wild') s.trust = Math.min(0.99, s.trust + (s.lost ? 0.6 : 0.3));
    if (s.state === 'chomp') { s.trust = Math.max(0, s.trust - 0.3); pop(s.x, s.y - 14, '!', PAL.r); }
  }
}

// ---------------------------------------------------------------- update
const keys = {};
const joy = { on: false, ox: 0, oy: 0, x: 0, y: 0 };
function update(dt) {
  if (mode === 'title') { sheep.forEach(s => { updSheep(s, dt); }); return; }
  if (mode !== 'play') return;

  G.t += dt;
  if (G.phase === 'day' && G.t >= G.len) startNight();
  else if (G.phase === 'night' && G.t >= G.len) startDay();
  if (mode !== 'play') return;
  if (G.phase === 'day' && G.len - G.t < 15 && !G.flags['dusk' + G.day]) {
    G.flags['dusk' + G.day] = true; toast('The sun is getting low. Bring them home.');
  }
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
  if (Math.abs(ix) > 0.2) sh.face = ix > 0 ? 1 : -1;
  const f = sh.face; move(sh, dt, 4); sh.face = Math.abs(ix) > 0.2 ? (ix > 0 ? 1 : -1) : f;
  sh.whistleT = Math.max(0, sh.whistleT - dt); sh.swing = Math.max(0, sh.swing - dt);

  // staff
  sh.staffT -= dt;
  if (sh.staffT <= 0) {
    const hit = wolves.filter(w => !w.flee && dist(w, sh) < S.staffRange);
    if (hit.length) {
      for (const w of hit) { w.fear += 1; knock(w, sh, 120); }
      sh.swing = 0.2; sh.staffT = S.staffCd; sfx.swing();
      ring(sh.x, sh.y - 6, S.staffRange, PAL.w, 0.2);
    } else sh.staffT = 0.08;
  }
  // sling
  if (S.sling && G.phase === 'night') {
    sh.slingT -= dt;
    if (sh.slingT <= 0) {
      let best = null, bd = 120;
      for (const w of wolves) if (!w.flee) { const d = dist(w, sh); if (d < bd) { bd = d; best = w; } }
      if (best) { shots.push({ x: sh.x, y: sh.y - 10, tgt: best, t: 0 }); sh.slingT = 2.0 / (1 + 0.35 * (S.sling - 1)); }
      else sh.slingT = 0.2;
    }
  }
  // harp
  if (S.harp && G.phase === 'night') {
    sh.harpT -= dt;
    if (sh.harpT <= 0) {
      sh.harpT = 8 - S.harp * 1.4;
      const R = 46 + S.harp * 12;
      ring(sh.x, sh.y - 6, R, '#9fb4ff', 0.8);
      if (sfxOk()) { const t = A.ctx.currentTime; [69, 72, 76, 81].forEach((m, i) => note(t + i * 0.05, mf(m), 0.4, 'triangle', 0.06)); }
      for (const w of wolves) if (!w.flee && dist(w, sh) < R) { w.fear += 1; knock(w, sh, 150); }
    }
  }
  for (const p of shots) {
    if (!p.tgt || p.tgt.gone || p.tgt.flee) { p.dead = true; continue; }
    const dx = p.tgt.x - p.x, dy = p.tgt.y - 5 - p.y, d = Math.hypot(dx, dy);
    if (d < 5) { p.dead = true; p.tgt.fear += 1; knock(p.tgt, sh, 70); pop(p.tgt.x, p.tgt.y - 12, 'BONK', PAL.w, 0.5); continue; }
    p.x += dx / d * 170 * dt; p.y += dy / d * 170 * dt;
  }
  shots = shots.filter(p => !p.dead);

  // flock
  let fi = 0, si = 0;
  for (const s of sheep) { if (s.state === 'follow') s.fi = fi++; if (s.state === 'stolen') s.fi = si++; }
  for (const s of sheep) updSheep(s, dt);
  for (let i = 0; i < sheep.length; i++) for (let j = i + 1; j < sheep.length; j++) {
    const a = sheep[i], b = sheep[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 9 && d > 0) { const p = (9 - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
  }
  for (const w of wolves) updWolf(w, dt);
  wolves = wolves.filter(w => !w.gone);
  dogs.forEach((g, i) => updDog(g, i, dt));
  if (jory) updJory(dt);
  checkRoles();

  // hearts
  for (const h of hearts) {
    h.t += dt;
    const d = dist(h, sh);
    if (h.t > 0.35 && d < 60) { const k = 240 / Math.max(d, 1); h.x += (sh.x - h.x) * Math.min(1, k * dt); h.y += (sh.y - 4 - h.y) * Math.min(1, k * dt); }
    else if (h.t < 0.35) { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 160 * dt; }
    if (d < 7 && h.t > 0.35) { h.got = true; addXP(1); sfx.heart(); }
  }
  hearts = hearts.filter(h => !h.got && h.t < 40);
  if (G.lvPending > 0 && mode === 'play') openLevelUp();
}

// ---------------------------------------------------------------- draw
function darkness() {
  if (!G) return 0;
  if (G.phase === 'night') return Math.min(0.82, 0.45 + G.t / 3 * 0.37);
  if (G.day > 1 && G.t < 4) return 0.82 * (1 - G.t / 4);
  const left = G.len - G.t;
  if (left < 14) return 0.45 * (1 - left / 14);
  return 0;
}
function draw() {
  const shake = G.shake > 0 ? (Math.random() - 0.5) * 3 : 0;
  const camX = Math.round(clamp(sh.x - W / 2, 0, WW - W) + shake), camY = Math.round(clamp(sh.y - H / 2 - 8, 0, WH - H));
  ctx.drawImage(ground, camX, camY, W, H, 0, 0, W, H);
  const X = x => Math.round(x - camX), Y = y => Math.round(y - camY);
  const onScreen = (x, y, m = 24) => x > camX - m && x < camX + W + m && y > camY - m && y < camY + H + m;

  // fire
  const fl = Math.floor(performance.now() / 120) % 3;
  ctx.fillStyle = PAL.o; ctx.fillRect(X(FIRE.x) - 2, Y(FIRE.y) - 3 - fl, 5, 4 + fl);
  ctx.fillStyle = PAL.g; ctx.fillRect(X(FIRE.x) - 1, Y(FIRE.y) - 2 - (2 - fl), 3, 3);
  ctx.fillStyle = PAL.y; ctx.fillRect(X(FIRE.x), Y(FIRE.y) - 1, 1, 1);

  // hearts on the ground
  for (const h of hearts) if (onScreen(h.x, h.y)) ctx.drawImage(spr('heart', 0), X(h.x) - 3, Y(h.y) - 6 + Math.round(Math.sin(h.t * 6)));

  // y-sorted world
  const list = [];
  for (const t of trees) if (onScreen(t.x, t.y, 30)) list.push({ y: t.y, d: () => ctx.drawImage(treeImg, X(t.x) - 10, Y(t.y) - 22) });
  for (const s of sheep) if (onScreen(s.x, s.y)) list.push({ y: s.y, d: () => {
    const moving = Math.hypot(s.vx, s.vy) > 4, fr = moving ? Math.floor(s.anim / 5) % 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(X(s.x) - 5, Y(s.y) - 1, 10, 2);
    const hop = s.state === 'scared' ? -Math.abs(Math.round(Math.sin(s.anim / 3) * 2)) : 0;
    ctx.drawImage(spr('sheep', fr, s.face < 0, modsFor(s), s.isChomp ? 'chomp' : null), X(s.x) - 6, Y(s.y) - 11 + hop);
  } });
  for (const w of wolves) if (onScreen(w.x, w.y)) list.push({ y: w.y, d: () => {
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X(w.x) - 6, Y(w.y) - 1, 12, 2);
    ctx.drawImage(spr('wolf', Math.floor(w.anim / 6) % 2, w.face < 0), X(w.x) - 7, Y(w.y) - 9);
  } });
  for (const g of dogs) list.push({ y: g.y, d: () => {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(X(g.x) - 4, Y(g.y) - 1, 8, 2);
    ctx.drawImage(spr('dog', Math.hypot(g.vx, g.vy) > 4 ? Math.floor(g.anim / 5) % 2 : 0, g.face < 0, '', g.kind === 'mercy' ? 'mercy' : null), X(g.x) - 5, Y(g.y) - 7);
  } });
  if (jory) list.push({ y: jory.y, d: () => drawPerson(X(jory.x), Y(jory.y), jory, 'jory') });
  list.push({ y: sh.y, d: () => drawPerson(X(sh.x), Y(sh.y), sh, null) });
  list.sort((a, b) => a.y - b.y).forEach(o => o.d());

  // shots and effects
  ctx.fillStyle = '#b5b8c8';
  for (const p of shots) ctx.fillRect(X(p.x) - 1, Y(p.y) - 1, 2, 2);
  for (const e of fx) if (e.kind === 'ring') {
    const k = e.t / e.life, r = Math.round(e.r * (0.3 + 0.7 * k));
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = e.col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(X(e.x) + 0.5, Y(e.y) + 0.5, r, Math.round(r * 0.7), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  }

  // night
  const dk = darkness();
  if (dk > 0) {
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = `rgba(10,12,40,${dk})`; dctx.fillRect(0, 0, W, H);
    const left = G.phase === 'day' ? G.len - G.t : 99;
    if (left < 14) { dctx.fillStyle = `rgba(255,110,40,${0.16 * (1 - left / 14)})`; dctx.fillRect(0, 0, W, H); }
    dctx.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => {
      const fx_ = X(x), fy = Y(y) - 4;
      dctx.fillStyle = 'rgba(0,0,0,.35)'; disc(dctx, fx_, fy, Math.round(r));
      dctx.fillStyle = 'rgba(0,0,0,.4)'; disc(dctx, fx_, fy, Math.round(r * 0.78));
      dctx.fillStyle = 'rgba(0,0,0,.6)'; disc(dctx, fx_, fy, Math.round(r * 0.55));
    };
    const flick = Math.sin(performance.now() / 90) * 1.2;
    light(sh.x, sh.y, S.lantern + flick);
    light(FIRE.x, FIRE.y + 4, fireR() + flick);
    if (jory && jory.state === 'redeemed') light(jory.x, jory.y, 30 + flick);
    ctx.drawImage(dark, 0, 0);
    // warm glow on top of the fire
    ctx.globalAlpha = 0.12; ctx.fillStyle = PAL.o; disc(ctx, X(FIRE.x), Y(FIRE.y), 18); ctx.globalAlpha = 1;
  }

  // labels above the dark
  for (const s of sheep) {
    if (!onScreen(s.x, s.y)) continue;
    if ((s.state === 'wild' || s.state === 'chomp') && s.trust > 0.02) {
      ctx.fillStyle = PAL.k; ctx.fillRect(X(s.x) - 7, Y(s.y) - 17, 14, 3);
      ctx.fillStyle = s.isChomp ? PAL.r : PAL.p; ctx.fillRect(X(s.x) - 6, Y(s.y) - 16, Math.round(12 * Math.min(1, s.trust)), 1);
    } else if (s.lost && s.state === 'wild' && Math.floor(performance.now() / 400) % 2) ptext('?', X(s.x), Y(s.y) - 19, PAL.g);
    if (s.isChomp && s.state === 'chomp' && dist(s, sh) > 60) ptext('CHOMP', X(s.x), Y(s.y) - 19, PAL.r);
  }
  if (jory && jory.state !== 'redeemed' && jory.state !== 'scene') {
    ctx.fillStyle = PAL.k; ctx.fillRect(X(jory.x) - 9, Y(jory.y) - 23, 18, 3);
    ctx.fillStyle = PAL.g; ctx.fillRect(X(jory.x) - 8, Y(jory.y) - 22, Math.round(16 * jory.nerve), 1);
  }
  for (const e of fx) if (e.kind === 'text') { const k = e.t / e.life; ptext(e.text, X(e.x), Y(e.y) - k * 8, e.col); }

  // edge markers: lost sheep (gold), wild sheep in earshot (white), wolves when there is a lookout (red), Chomp, Jory
  const marks = [];
  const wild = sheep.filter(s => s.state === 'wild' && !s.lost).sort((a, b) => dist(a, sh) - dist(b, sh)).slice(0, 3);
  for (const s of wild) marks.push([s.x, s.y, PAL.w]);
  for (const s of sheep) {
    if (s.state === 'wild' && s.lost) marks.push([s.x, s.y, PAL.g]);
    if (s.state === 'chomp') marks.push([s.x, s.y, PAL.r]);
  }
  if (G.roles.lookout) for (const w of wolves) if (!w.flee) marks.push([w.x, w.y, PAL.r, true]);
  if (jory && jory.state !== 'redeemed') marks.push([jory.x, jory.y, '#c58fe0']);
  for (const [x, y, col, wolf] of marks) {
    const sx = x - camX, sy = y - 6 - camY;
    if (sx >= 0 && sx < W && sy >= 0 && sy < H) continue;
    const cx = clamp(sx, 4, W - 5), cy = clamp(sy, 30, H - 16);
    ctx.fillStyle = PAL.k; ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5);
    ctx.fillStyle = col; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3);
    if (wolf) { ctx.fillStyle = PAL.k; ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1); }
  }

  // touch joystick
  if (joy.on) {
    const r = stage.getBoundingClientRect();
    const ox = (joy.ox - r.left) / scale, oy = (joy.oy - r.top) / scale;
    ctx.globalAlpha = 0.35; ctx.strokeStyle = PAL.w; ctx.beginPath(); ctx.arc(ox, oy, 14, 0, TAU); ctx.stroke();
    ctx.fillStyle = PAL.w; disc(ctx, ox + joy.x * 12, oy + joy.y * 12, 5); ctx.globalAlpha = 1;
  }
}
function drawPerson(x, y, p, swap) {
  const moving = Math.hypot(p.vx, p.vy) > 4, fr = moving ? 1 + Math.floor(p.anim / 6) % 2 : 0, flip = p.face < 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 5, y - 1, 10, 2);
  const ox = x - 6, oy = y - 16;
  ctx.drawImage(spr('shep', fr, flip, '', swap), ox, oy);
  const sx = c => (flip ? ox + 11 - c : ox + c);
  if (!swap) { // the staff (crook) and lantern
    const sw = p.swing > 0 ? 1 : 0;
    ctx.fillStyle = PAL.B; ctx.fillRect(sx(10) + (flip ? -sw : sw), oy - 3, 1, 18);
    ctx.fillStyle = PAL.b; ctx.fillRect(sx(10) + (flip ? -sw : sw), oy - 3, 1, 12);
    ctx.fillRect(sx(11) + (flip ? -sw : sw), oy - 5, 1, 2); ctx.fillRect(sx(12) + (flip ? -sw : sw), oy - 4, 1, 3);
    ctx.fillRect(sx(11) + (flip ? -sw : sw), oy - 5, 1, 1);
    ctx.fillStyle = PAL.k; ctx.fillRect(sx(1), oy + 9, 2, 1);
    ctx.fillStyle = PAL.g; ctx.fillRect(sx(1), oy + 10, 2, 3);
    ctx.fillStyle = PAL.y; ctx.fillRect(sx(1), oy + 11, 1, 1);
  } else { // Jory's sack
    ctx.fillStyle = PAL.k; ctx.fillRect(sx(0) - (flip ? 1 : 0), oy + 6, 4, 6);
    ctx.fillStyle = PAL.s; ctx.fillRect(sx(0) - (flip ? 0 : -1), oy + 7, 2, 4);
    if (p.state === 'redeemed') { ctx.fillStyle = PAL.g; ctx.fillRect(sx(11), oy + 9, 2, 3); }
  }
}

// ---------------------------------------------------------------- HUD
let hudCache = '';
function hud() {
  const night = G.phase === 'night';
  const home = sheep.filter(s => s.state === 'home').length, follow = sheep.filter(s => s.state === 'follow').length;
  const lost = sheep.filter(s => s.lost && s.state === 'wild').length;
  const key = [G.phase, G.day, home, follow, lost, sheep.length, G.lv].join('|');
  if (key !== hudCache) {
    hudCache = key;
    const ph = $('hud-phase'); ph.textContent = (night ? 'NIGHT ' : 'DAY ') + G.day; ph.className = night ? 'night' : '';
    $('hud-count').textContent = `FOLD ${home}/${sheep.length}`;
    $('hud-follow').textContent = [follow ? `${follow} WITH YOU` : '', lost ? `${lost} LOST` : ''].filter(Boolean).join(' · ');
    $('hud-lv').textContent = 'LV ' + G.lv;
  }
  $('hud-bar').style.width = (100 * (1 - G.t / G.len)) + '%';
  $('hud-bar').style.background = night ? '#9fb4ff' : '';
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
  banner('DAY 1', 'Green Pastures');
}
function togglePause() {
  if (mode === 'play') { mode = 'paused'; $('paused').hidden = false; }
  else if (mode === 'paused') { mode = 'play'; $('paused').hidden = true; last = performance.now(); }
}
function toggleMute() { A.muted = !A.muted; $('btn-mute').textContent = A.muted ? 'MUTED' : 'MUSIC ON'; }

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
  if (k === 'n') { G.t = G.len; } // testing shortcut: skip to the next dusk or dawn
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

// ---------------------------------------------------------------- boot
// Debug hook for automated tests and tuning in the console.
window.__nn = { get G() { return G; }, get sh() { return sh; }, get sheep() { return sheep; }, get wolves() { return wolves; },
  get S() { return S; }, get mode() { return mode; }, get jory() { return jory; }, addXP };

buildWorld();
newGame();
resize();
requestAnimationFrame(frame);
})();
