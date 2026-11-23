/* NINETY-NINE · core.js
   Shared helpers every module uses. Everything lives on the global NN namespace; files load in the order listed in
   index.html (core → art → audio → script → world → game → story → ui → main). See ARCHITECTURE.md. */
(() => {
'use strict';
const NN = window.NN = window.NN || {};

NN.W = 384; NN.H = 216; NN.TAU = Math.PI * 2;

const U = NN.U = {};
U.rand = (a, b) => a + Math.random() * (b - a);
U.irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
U.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
U.pick = a => a[Math.floor(Math.random() * a.length)];
U.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
U.lerp = (a, b, t) => a + (b - a) * t;
U.mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
// Seeded random, so the world map is the same every game and in every save.
U.seeded = seed => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

// ---------------------------------------------------------------- pixel drawing
U.disc = (c, cx, cy, r, col) => {
  if (col) c.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
};
U.oval = (c, cx, cy, rx, ry, col) => {
  if (col) c.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.floor(rx * Math.sqrt(1 - (dy * dy) / (ry * ry || 1)) + 0.3);
    c.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
};
U.rect = (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
U.hexRGB = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
// Adds a 1px colored outline around everything opaque (the warm outlines of the style).
U.outline = (src, col, pad = true) => {
  const p = pad ? 1 : 0, w = src.width + 2 * p, h = src.height + 2 * p, c = U.mk(w, h);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, p, p);
  const id = x.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d), [r, g, b] = U.hexRGB(col);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (d[k + 3]) continue;
    if ((i > 0 && d[k - 1]) || (i < w - 1 && d[k + 7]) || (j > 0 && d[k - w * 4 + 3]) || (j < h - 1 && d[k + w * 4 + 3])) {
      o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = 255;
    }
  }
  id.data.set(o); x.putImageData(id, 0, 0);
  return c;
};
U.mirror = src => { const c = U.mk(src.width, src.height), x = c.getContext('2d'); x.scale(-1, 1); x.drawImage(src, -src.width, 0); return c; };
U.shadow = (c, x, y, w) => {
  c.fillStyle = 'rgba(38,52,24,.32)';
  c.fillRect(Math.round(x - w / 2) + 1, Math.round(y) - 1, w - 2, 1);
  c.fillRect(Math.round(x - w / 2), Math.round(y), w, 1);
  c.fillRect(Math.round(x - w / 2) + 1, Math.round(y) + 1, w - 2, 1);
};

// ---------------------------------------------------------------- sprite registry (filled by art.js)
// NN.SPR[name] = { frames: [[row strings]], out?: outline color }. Characters map to colors through NN.PAL ('.' is clear).
// NN.MODS[name] = rows => { ... } edits a frame's rows before rendering (hats, bandages, bells).
// NN.SWAPS[name] = { char: color } palette swaps.
NN.PAL = {}; NN.SPR = {}; NN.MODS = {}; NN.SWAPS = {};
const cache = NN.spriteCache = new Map();
NN.setPx = (r, x, y, c) => { if (r[y] && r[y][x] !== undefined) r[y][x] = c; };
NN.spr = (name, fr, flip, mods, swap) => {
  const key = `${name}|${fr}|${flip ? 1 : 0}|${mods || ''}|${swap || ''}`;
  let c = cache.get(key);
  if (c) return c;
  const def = NN.SPR[name];
  if (!def) throw new Error('Unknown sprite ' + name);
  const frames = def.frames, rows = frames[Math.min(fr, frames.length - 1)].map(s => s.split(''));
  if (mods) for (const m of mods.split(',')) if (m && NN.MODS[m]) NN.MODS[m](rows);
  const pal = swap && NN.SWAPS[swap] ? Object.assign({}, NN.PAL, NN.SWAPS[swap]) : NN.PAL;
  c = U.mk(rows[0].length, rows.length);
  const x = c.getContext('2d');
  rows.forEach((row, j) => row.forEach((ch, i) => { if (ch !== '.') U.rect(x, pal[ch] || '#f0f', i, j); }));
  if (def.out) c = U.outline(c, (swap && NN.SWAPS[swap] && NN.SWAPS[swap].out) || def.out);
  if (flip) c = U.mirror(c);
  cache.set(key, c);
  return c;
};

// People: art.js defines NN.HLOOK[look] and NN.buildHuman(look, dir, stride, bob) → canvas 20×36, feet on row 32.
NN.HLOOK = {};
NN.human = (look, dir, st, bob, flip) => {
  const key = `h|${look}|${dir}|${st}|${bob}|${flip ? 1 : 0}`;
  let c = cache.get(key);
  if (c) return c;
  c = NN.buildHuman(look, dir, st, bob);
  if (flip) c = U.mirror(c);
  cache.set(key, c);
  return c;
};

// Props: art.js registers NN.PROPS[name] = { make: () => canvas, ox, oy } (anchor = the prop's foot point).
NN.PROPS = {};
NN.prop = name => {
  const key = 'p|' + name;
  let c = cache.get(key);
  if (c) return c;
  const def = NN.PROPS[name];
  if (!def) throw new Error('Unknown prop ' + name);
  c = { img: def.make(), ox: def.ox, oy: def.oy };
  cache.set(key, c);
  return c;
};

// ---------------------------------------------------------------- 3×5 pixel font for words that float in the world
const GLYPH = {
  A: '75755', B: '65656', C: '74447', D: '65556', E: '74647', F: '74644', G: '74557', H: '55755', I: '72227',
  J: '11157', K: '55655', L: '44447', M: '57755', N: '65555', O: '75557', P: '75744', Q: '75571', R: '65655',
  S: '74717', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
  0: '75557', 1: '26227', 2: '71747', 3: '71317', 4: '55711', 5: '74717', 6: '74757', 7: '71122', 8: '75757',
  9: '75717', '!': '22202', '?': '71302', '+': '02720', '.': '00002', "'": '22000', '♥': '57720', '-': '00700',
  ' ': '00000', '/': '11244', ',': '00024', ':': '02020', 'Z': '71247', '…': '00005', '×': '05250',
};
NN.ptext = (ctx, str, x, y, col = '#fff7e0', out = '#3e2416') => {
  str = String(str).toUpperCase();
  const ox = Math.round(x - (str.length * 4 - 1) / 2), oy = Math.round(y);
  const draw = (dx, dy, c) => {
    ctx.fillStyle = c;
    for (let n = 0; n < str.length; n++) {
      const g = GLYPH[str[n]] || GLYPH[' '];
      for (let row = 0; row < 5; row++) for (let b = 0; b < 3; b++) if (+g[row] & (4 >> b)) ctx.fillRect(ox + n * 4 + b + dx, oy + row + dy, 1, 1);
    }
  };
  if (out) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) draw(dx, dy, out);
  draw(0, 0, col);
};
})();
