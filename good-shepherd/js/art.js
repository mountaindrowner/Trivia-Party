/* NINETY-NINE · art.js
   All sprites, people and scenery props. Original pixel art in the cozy farm-sim tradition: warm colored outlines,
   three-tone shading, tall slender people with tiny heads and big noses. Registers into NN.PAL, NN.SPR, NN.MODS,
   NN.SWAPS, NN.HLOOK, NN.buildHuman and NN.PROPS (see core.js and ARCHITECTURE.md). */
(() => {
'use strict';
const NN = window.NN;
const { mk, rect, disc, oval, outline, mirror, rand, pick } = NN.U;
const TAU = NN.TAU;
const set = NN.setPx;

// ---------------------------------------------------------------- palette and hand-drawn sprites
Object.assign(NN.PAL, {
  o: '#4e3d3f', l: '#4e3d3f', w: '#fdf8ee', W: '#e6dacb', V: '#c7b6a5', f: '#5b4746', F: '#7d6563', e: '#1d1418', y: '#ffffff',
  p: '#ef9aa0', n: '#1d1418', g: '#f5c542', Y: '#ffe680', r: '#d8574f', c: '#3f8f93', k: '#2b2638', L: '#d4d5e0',
  G: '#8e8fa6', D: '#5d5e78', N: '#2e2a3a', d: '#4a4b62', b: '#c07a3e', B: '#7a4a24', s: '#fff2c4',
  // hidden tags (see sheepTop and the wolf's brow)
  1: '#4e3d3f', 2: '#fdf8ee', 3: '#c7b6a5', 4: '#fdf8ee', 5: '#e6dacb', z: '#8e8fa6',
  // gear: horn, straw, leaf, blue, violet yarn, tin, choir robe, water
  h: '#d8b47e', j: '#f3dfb4', H: '#a07a4c', a: '#f2d27a', A: '#c99b3e', m: '#5aa846', M: '#3d7a2e',
  u: '#6a8fe0', U: '#4a5aa8', v: '#a070c8', i: '#c4c3d0', I: '#7d7b90', R: '#b8404e', q: '#7e2438', t: '#9adcf2',
  // night things: the Prowler and the Frights
  K: '#0c0918', Z: '#1a1433', T: '#2c2450', P: '#6d58b0', X: '#352c60', E: '#eceaff', J: '#ffe58a',
});
Object.assign(NN.SWAPS, {
  chomp: { w: '#ddd1be', W: '#c3b4a0', V: '#a69480', e: '#d8574f' },
  mercy: { b: '#4b4552', B: '#2f2a36', s: '#efe6d8' },
  // the Alpha: a darker, older wolf with a scar across one eye
  alpha: { G: '#6c6c86', D: '#3c3c56', L: '#a4a4ba', d: '#2c2c40', N: '#18141f', Y: '#ffb347', z: '#e08a8a', out: '#17121f' },
  // the Bramble Bunch: dingy wool with burrs and thorn twigs caught in it
  bramble: { w: '#ece2cf', W: '#cfc0a8', V: '#a89478', 4: '#8a5a33', 5: '#7a3e5a', y: '#f8f1e2' },
  // Bram's underfed flock: greyer wool, tucked-in fluff and belly
  skinny: { w: '#d9d5cf', W: '#bab4ac', V: '#968e88', y: '#eceae6', F: '#6e5a58', 3: '#4e3d3f' },
});
// A swap that recolors the wool or the wolf's coat recolors the hidden tags too, unless it says otherwise.
const TAG_OF = { 1: 'o', 2: 'w', 4: 'w', 3: 'V', 5: 'W', z: 'G' };
for (const sw of Object.values(NN.SWAPS)) for (const [t, base] of Object.entries(TAG_OF)) if (!(t in sw) && base in sw) sw[t] = sw[base];
// Hidden tags: '1' '2' '3' '4' '5' draw exactly like the outline / wool / belly they sit in, until a swap gives them
// away (skinny tucks the fluff and belly in; bramble shows burrs and thorn twigs snagged in the wool).
const SNAG = { '7,2': '4', '3,4': '4', '7,5': '4', '5,7': '4', '2,7': '5', '6,8': '5' };
const sheepTop = [
  '...ooo.ooo......', '..owwwowwwoo....', '.owwywwwwwwwo...', 'owwwwwwwwwwoooo.', 'owwwwwwwwfoFFFFo',
  'owwwwwwwwwofFefo', 'oWwwwwwwwwoffffo', 'oWWwwwwwwWWoffpo', '.oVWWWWWWWVVooo.', '..oVVVVVVVVo....',
].map((row, y) => row.replace(/./g, (ch, x) => (y === 0 && ch === 'o' ? '1' : y === 1 && ch === 'w' ? '2' :
  y === 9 && ch === 'V' ? '3' : SNAG[x + ',' + y] || ch)));
Object.assign(NN.SPR, {
  sheep: { frames: [
    sheepTop.concat(['..olo...olo.....', '..olo...olo.....', '..oo....oo......']),
    sheepTop.concat(['...olo.olo......', '...olo.olo......', '...oo..oo.......']),
  ] },
  wolf: { out: '#2b2638', frames: [
    ['.............G.G...', '.............GGGz..', 'GG..DDDDDDDDDDGYGG.', '.GDDDDDDDDDDDGzGGGN', '..GGGGGGGGGGGGGGLL.',
      '..GLLLLLLLLLGGGG...', '...GG...GG.GG.GG...', '...GG...GG.GG.GG...', '...dd...dd.dd.dd...'],
    ['.............G.G...', '.............GGGz..', 'GG..DDDDDDDDDDGYGG.', '.GDDDDDDDDDDDGzGGGN', '..GGGGGGGGGGGGGGLL.',
      '..GLLLLLLLLLGGGG...', '....GG.GG....GG.GG.', '....GG.GG....GG.GG.', '....dd.dd....dd.dd.'],
  ] },
  dog: { out: '#3a2418', frames: [
    ['.........b.b.', '.........bbbb', 'b.......bbkbN', '.bbbbbbbbbbb.', '.bssssssbb...', '.b.b...b.b...', '.B.B...B.B...'],
    ['.........b.b.', '.........bbbb', 'b.......bbkbN', '.bbbbbbbbbbb.', '.bssssssbb...', '..b.b.b.b....', '..B.B.B.B....'],
  ] },
  heart: { out: '#5a2430', frames: [['.rr.rr.', 'ryrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']] },
});
Object.assign(NN.MODS, {
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
});

// ---------------------------------------------------------------- more animals, night things and job gear
// Small char grids, so the bigger night sprites can be drawn with shapes. Built lazily on first use.
const grid = (w, h) => Array.from({ length: h }, () => new Array(w).fill('.'));
const gPut = (g, X, Y, ch) => { X = Math.round(X); Y = Math.round(Y); if (g[Y] && g[Y][X] !== undefined) g[Y][X] = ch; };
const gEll = (g, cx, cy, rx, ry, ch) => {
  for (let Y = Math.floor(cy - ry); Y <= Math.ceil(cy + ry); Y++) for (let X = Math.floor(cx - rx); X <= Math.ceil(cx + rx); X++) {
    const dx = (X - cx) / rx, dy = (Y - cy) / ry;
    if (dx * dx + dy * dy <= 1.04) gPut(g, X, Y, ch);
  }
};
const gLine = (g, x0, y0, x1, y1, ch, w = 1) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) for (let d = 0; d < w; d++) gPut(g, x0 + (x1 - x0) * k / n + d, y0 + (y1 - y0) * k / n, ch);
};
const gIn = (g, X, Y) => g[Y] && g[Y][X] !== undefined && g[Y][X] !== '.';
const gRows = g => g.map(r => r.join(''));
const lazy = make => { let f; return { get frames() { return f || (f = make()); } }; };

// The Prowler: a lion made of night. Deep indigo, a faint violet rim where moonlight catches it, two pale eyes.
function prowlerFrame(f) {
  const g = grid(44, 26), s = f ? 1 : -1;
  // far legs first (darkest), then the body over them
  gLine(g, 10 - s, 16, 9 + s * 2, 23, 'K', 3); gLine(g, 31 + s, 16, 30 - s * 2, 23, 'K', 3);
  gLine(g, 2, 17 - f, 1, 20 - f, 'Z', 1);
  // tail: hangs, then curls up into a tuft
  gLine(g, 7, 11, 3, 13, 'Z'); gLine(g, 3, 13, 2, 17, 'Z'); gEll(g, 2.5, 19 - f, 1.6, 2, 'K');
  gEll(g, 19, 13, 12.5, 5.5, 'Z'); gEll(g, 10, 13, 5.5, 5.5, 'Z'); gEll(g, 27, 13.5, 5.5, 6.5, 'Z');
  // near legs: long, with big soft paws
  const legs = [[12 + s, 15, 11 - s * 2, 23], [28 - s, 16, 29 + s * 2, 23]];
  for (const [ax, ay, bx, by] of legs) { gLine(g, ax, ay, bx, by, 'Z', 3); gEll(g, bx + 1.5, 24, 2.2, 1.2, 'Z'); }
  gEll(g, 9 + s * 2 + 1.5, 24, 2, 1, 'K'); gEll(g, 30 - s * 2 + 1.5, 24, 2, 1, 'K');
  // belly shadow
  for (let Y = 16; Y < 20; Y++) for (let X = 6; X < 33; X++) if (g[Y][X] === 'Z' && Y > 15 + Math.abs(X - 19) / 8) g[Y][X] = 'K';
  // the mane: a big shaggy cloud around the face, hanging under the chin; then the face in front of it
  gEll(g, 32, 11, 8, 9.5, 'K');
  for (let k = 0; k < 18; k++) {
    const t = -Math.PI * 0.98 + k * (Math.PI * 1.6 / 17), r = 9 + ((k + f) % 3 === 0 ? 1.4 : 0.4);
    gPut(g, 32 + Math.cos(t) * r * 0.86, 11 + Math.sin(t) * r, 'K');
  }
  for (let k = 0; k < 7; k++) { // strands of the mane
    const t = -Math.PI * 0.9 + k * 0.42;
    gLine(g, 32 + Math.cos(t) * 4, 11 + Math.sin(t) * 5, 32 + Math.cos(t) * 7, 11 + Math.sin(t) * 8.5, 'T');
  }
  gEll(g, 38, 11, 4, 3.8, 'X'); gEll(g, 41, 13, 2.4, 1.8, 'X');
  gPut(g, 35, 7, 'X'); gPut(g, 35, 6, 'X'); gPut(g, 40, 7, 'X'); gPut(g, 40, 6, 'X'); // ears
  gPut(g, 43, 12, 'K'); gPut(g, 42, 12, 'K'); gPut(g, 43, 13, 'K'); // nose
  for (const [X, Y] of [[39, 14], [40, 14], [41, 15], [42, 14]]) gPut(g, X, Y, 'K'); // mouth
  // moonlit rim: pixels whose upper neighbour is empty
  const rim = [];
  for (let Y = 0; Y < 26; Y++) for (let X = 0; X < 44; X++) if (gIn(g, X, Y) && !gIn(g, X, Y - 1) && Y < 22) rim.push([X, Y]);
  for (const [X, Y] of rim) g[Y][X] = 'P';
  for (const [X, Y] of [[15, 9], [22, 10], [12, 11], [26, 9]]) if (g[Y][X] === 'Z') g[Y][X] = 'T';
  for (let X = 9; X < 28; X += 1) if (g[9][X] === 'Z') g[9][X] = 'T';
  // eyes: two, pale, half-lidded
  gPut(g, 36, 10, 'E'); gPut(g, 37, 10, 'E'); gPut(g, 36, 9, 'K'); gPut(g, 37, 9, 'K'); gPut(g, 35, 9, 'K');
  gPut(g, 39, 10, 'E'); gPut(g, 40, 10, 'E'); gPut(g, 39, 9, 'K'); gPut(g, 40, 9, 'K'); gPut(g, 41, 9, 'K');
  // a few stars caught in the dark
  for (const [X, Y] of f ? [[17, 12], [24, 15], [8, 14], [31, 11]] : [[18, 14], [23, 12], [9, 12], [30, 14]]) if (g[Y][X] === 'Z' || g[Y][X] === 'K') g[Y][X] = 'P';
  return gRows(g);
}
// A Night Fright: a wisp of shadow with two glowing eyes. The engine draws it semi-transparent.
function frightFrame(f) {
  const g = grid(14, 14);
  gEll(g, 6.5, 5.5, 5.3, 5.3, 'Z');
  for (let Y = 8; Y <= 13; Y++) {
    const half = Math.max(0, 4.6 - (Y - 8) * 0.95), off = Math.sin(Y * 0.9 + f * 2.1) * 1.6;
    for (let X = Math.round(6.5 + off - half); X <= Math.round(6.5 + off + half); X++) gPut(g, X, Y, 'Z');
  }
  // ragged bottom
  const tips = [[2 + f, 11], [11 - f, 11], [4 - (f % 2), 12], [9 + (f % 2), 12]];
  for (const [X, Y] of tips) gPut(g, X, Y, 'Z');
  gEll(g, 6.5, 7, 3.2, 3.2, 'K');
  for (let Y = 0; Y < 14; Y++) for (let X = 0; X < 14; X++) if (gIn(g, X, Y) && (!gIn(g, X - 1, Y) || !gIn(g, X, Y - 1))) g[Y][X] = 'T';
  const bl = f === 2 ? 1 : 0; // a slow blink
  gPut(g, 4, 5, 'J'); gPut(g, 5, 5, 'J'); gPut(g, 8, 5, 'J'); gPut(g, 9, 5, 'J');
  if (!bl) { gPut(g, 4, 4, 'E'); gPut(g, 9, 4, 'E'); gPut(g, 4, 6, 'J'); gPut(g, 9, 6, 'J'); }
  return gRows(g);
}

Object.assign(NN.SPR, {
  lamb: { frames: [
    ['.ooo.oo.....', 'owwwowwooooo', 'owywwwwfFFFo', 'oww4wwwofefo', 'oWwwwwWoffpo', '.oVVVVVVooo.', '.olo..olo...', '.olo..olo...', '.oo...oo....'],
    ['.ooo.oo.....', 'owwwowwooooo', 'owywwwwfFFFo', 'oww4wwwofefo', 'oWwwwwWoffpo', '.oVVVVVVooo.', '..olo.olo...', '..olo.olo...', '..oo..oo....'],
  ] },
  butterfly: { frames: [
    ['Yg.gY', 'YYBYY', '.gBg.', '..B..'],
    ['.Y.Y.', '.gBg.', '..B..', '..B..'],
  ] },
  fright: lazy(() => [frightFrame(0), frightFrame(1), frightFrame(2)]),
  prowler: Object.assign(lazy(() => [prowlerFrame(0), prowlerFrame(1)]), { out: '#07050f' }),
});

// Job gear. ' ' leaves a pixel alone, '.' clears it.
const stamp = (r, X, Y, rows) => rows.forEach((s, j) => { for (let i = 0; i < s.length; i++) if (s[i] !== ' ') set(r, X + i, Y + j, s[i]); });
Object.assign(NN.MODS, {
  horns: r => stamp(r, 8, 2, [
    ' ooo ',
    'ohjho',
    'hHohH',
    'oHhHo',
    ' ooo ',
  ]),
  strawhat: r => stamp(r, 8, 0, [
    '   oooo ',
    '  oaYaao',
    ' oorrrro',
    'oaaYaaaa',
    ' oAA    ',
  ]),
  bucket: r => stamp(r, 11, 8, [
    '  I  ',
    'oIttI',
    'oiiIo',
    'oiiIo',
    ' ooo ',
  ]),
  flowercrown: r => stamp(r, 10, 1, [
    ' o o o',
    'opoyop',
    'mgmgmm',
  ]),
  yarn: r => stamp(r, 3, 0, [
    'I ovvo I',
    ' ovpvvo ',
    ' oUvvUov',
    '       v',
  ]),
  twig: r => stamp(r, 10, 8, [
    ' Bbbbb',
    '   mM ',
  ]),
  sweatband: r => stamp(r, 9, 3, [
    '      t',
    ' rryrrr',
    'r      ',
  ]),
  choir: r => stamp(r, 1, 3, [
    '         yW',
    'RRRRRRRRWyy',
    'qRRRRRRRRyW',
    'qRRRRRRRRWy',
    'qRRgRRRgRRo',
    'qqqqqqqqqqo',
    ' oqqqqqqqo ',
  ]),
  blanket: r => stamp(r, 2, 1, [
    ' cyccyc ',
    'cycccycc',
    'yyyyyyyy',
    'cycccycc',
    'cyccccyc',
    'y y y y ',
  ]),
  mask: r => stamp(r, 11, 3, [
    'n    ',
    ' nnn ',
    ' ye  ',
  ]),
});

// ---------------------------------------------------------------- people: tall, slender, tiny heads, big noses
// A look is data. Colors: skin skinS cloak cloakS cloakL tunic belt legs legsS shoe beard out. Optional features:
//   nose      1 small, 2 big and round, 3 long and pointy
//   hat       (none) = the hood in cloak colors; 'straw' 'bucket' 'cap' 'scarf' 'bare' (hair only) 'wool' (costume hood)
//   hatC hatS hatL   hat colors (band: hatB);  hair hairS  hair colors (hats other than the hood show some hair)
//   drop      px shorter above the hips (kid 4, Zeb 6; -1 = taller);  robeLen  rows of robe below the shoulders (12)
//   wide      1 = sturdy (one px wider all round);  round  a short round body (Zeb)
//   costume   'sheep' (a wool body with ears; own legs and boots stick out);  earC  costume ear color
//   beardSize 'big' | 'long';  brows  heavy brow color;  grin  big smile;  blush  sheepish cheeks;  messy  scruffy hair
//   sleeve    arm color (else cloakS);  rolled  rolled sleeves (forearms bare);  vest + patch  a patched vest
//   trim      robe hem/edge trim color;  purse  coin purse on the belt;  stalk  chewing a straw
//   staff     holds the crook (drawn by the engine);  stick  carries a plain stick;  lantern;  sack;  hunch
//   scars     a small healed mark on each hand
Object.assign(NN.HLOOK, {
  shepherd: { skin: '#f0c69c', skinS: '#d29b70', cloak: '#3f8f93', cloakS: '#2b676b', cloakL: '#68b8b1', tunic: '#f1e4c6',
    belt: '#9a6a3a', legs: '#8a6a50', legsS: '#6b4f3a', shoe: '#5a3a24', beard: '#7a4a2a', out: '#2a2026', nose: 1, staff: true },
  jory: { skin: '#e6b48c', skinS: '#bf8a62', cloak: '#6b4380', cloakS: '#4a2c5c', cloakL: '#9068a8', tunic: '#a29a88',
    belt: '#5a4030', legs: '#4a4448', legsS: '#353035', shoe: '#2e2626', beard: null, out: '#211a22', nose: 3, sack: true, hunch: 1 },
  // Nell the ferrywoman: sturdy, sleeves rolled up, a headscarf
  nell: { skin: '#d9a27a', skinS: '#b07a55', cloak: '#c0603a', cloakS: '#8e4128', cloakL: '#e08a5a', tunic: '#f0dcb4',
    belt: '#5a3a24', legs: '#6a5040', legsS: '#4e3a2e', shoe: '#3e2a1e', beard: null, out: '#2a1a16', nose: 2, wide: 1,
    hat: 'scarf', hatC: '#3f8f93', hatS: '#2b676b', hatL: '#f5c542', hair: '#5a3020', hairS: '#3e2016', rolled: true },
  // Abe the old fisher: long white beard, bucket hat, a little stooped
  abe: { skin: '#e8b890', skinS: '#c08a64', cloak: '#5a7a9a', cloakS: '#3e5a76', cloakL: '#86a6c2', tunic: '#d8d0bc',
    belt: '#6b4a30', legs: '#6e6658', legsS: '#524c42', shoe: '#3e3228', beard: '#f2eee6', beardSize: 'long', out: '#232028',
    nose: 2, hunch: 1, hat: 'bucket', hatC: '#a8a070', hatS: '#7e784e', hatL: '#c8c090', hair: '#e6e2da', hairS: '#bdb8ae' },
  // Tobi: a kid. Short legs, big grin, a cap
  tobi: { skin: '#c8875a', skinS: '#a0663e', cloak: '#e0b040', cloakS: '#b08420', cloakL: '#f5d070', tunic: '#fff2c4',
    belt: '#8a5a33', legs: '#5a7a9a', legsS: '#44607c', shoe: '#7a3a2a', beard: null, out: '#2a1c16', nose: 1, drop: 4,
    robeLen: 8, hat: 'cap', hatC: '#d8574f', hatS: '#a03a34', hatL: '#ef8a7a', hair: '#2e1e16', hairS: '#1e140e', grin: true },
  // Zeb the Collector: short and round (the only short adult), a fancy gold-trimmed robe, a coin purse
  zeb: { skin: '#e8b48a', skinS: '#c08860', cloak: '#8e3a8a', cloakS: '#642a66', cloakL: '#b864b0', tunic: '#f8ecd0',
    belt: '#4e2050', legs: '#5a4050', legsS: '#40303a', shoe: '#6a3a2a', beard: '#3a2418', out: '#261622', nose: 2,
    drop: 6, robeLen: 11, round: true, trim: '#f5c542', hat: 'bare', hair: '#3a2418', hairS: '#24160e', purse: true },
  // Hank the Hireling: straw hat, patched vest, chewing a stalk
  hank: { skin: '#e0a878', skinS: '#b67e54', cloak: '#8a6a3a', cloakS: '#664c26', cloakL: '#b08a50', tunic: '#e8e0cc',
    belt: '#4a3020', legs: '#5a6478', legsS: '#424a5c', shoe: '#4a3020', beard: '#8a5a30', out: '#2a1e16', nose: 2,
    robeLen: 8, hat: 'straw', hatC: '#e8c060', hatS: '#c09838', hatL: '#f8e0a0', hatB: '#a0442e', hair: '#8a5a30',
    hairS: '#6a4220', sleeve: '#d8d0bc', patch: '#5a8ac0', stalk: true },
  // Ludo, the Wolf in Wool: a lanky man in a very obvious sheep costume
  ludo: { skin: '#e6b48c', skinS: '#bf8a62', cloak: '#fdf8ee', cloakS: '#e6dacb', cloakL: '#ffffff', tunic: '#fdf8ee',
    belt: '#e6dacb', legs: '#6a5a6a', legsS: '#4e424e', shoe: '#3e2a20', beard: null, out: '#3a2c30', nose: 2,
    hat: 'wool', costume: 'sheep', earC: '#5b4746', hair: '#7a4a2a', hairS: '#5a3418', brows: '#3a2418' },
  // Ludo unmasked: scruffy and sheepish
  ludoPlain: { skin: '#e6b48c', skinS: '#bf8a62', cloak: '#8a7a62', cloakS: '#665a46', cloakL: '#aa9a80', tunic: '#d8ccb0',
    belt: '#5a4030', legs: '#6a5a6a', legsS: '#4e424e', shoe: '#3e2a20', beard: null, out: '#2a2024', nose: 2,
    robeLen: 9, hat: 'bare', messy: true, hair: '#7a4a2a', hairS: '#5a3418', blush: true, patch: '#a0603a' },
  // Bram the Bitter Shepherd: tall, a huge black beard, heavy brows, a dark cloak, a stick
  bram: { skin: '#d8a07a', skinS: '#b07a56', cloak: '#3a3640', cloakS: '#26232c', cloakL: '#56525e', tunic: '#6a6258',
    belt: '#2a2020', legs: '#4a4440', legsS: '#36302e', shoe: '#2a201c', beard: '#1e1a1e', beardSize: 'big', out: '#151216',
    nose: 2, drop: -1, robeLen: 13, hat: 'bare', hair: '#1e1a1e', hairS: '#121014', brows: '#121014', stick: true },
  // villagers of the river towns
  villager1: { skin: '#c8875a', skinS: '#a0663e', cloak: '#6a9a4a', cloakS: '#4a7434', cloakL: '#8ebe6a', tunic: '#f1e4c6',
    belt: '#6b4a30', legs: '#6a5040', legsS: '#4e3a2e', shoe: '#3e2a1e', beard: null, out: '#22201a', nose: 1,
    hat: 'scarf', hatC: '#d8574f', hatS: '#a03a34', hatL: '#ffffff', hair: '#2e1e16', hairS: '#1e140e' },
  villager2: { skin: '#f0c69c', skinS: '#d29b70', cloak: '#b07a45', cloakS: '#8a5a33', cloakL: '#d09a60', tunic: '#e6dcc8',
    belt: '#4a3020', legs: '#5a6478', legsS: '#424a5c', shoe: '#3a2a20', beard: '#a0603a', out: '#2a1e16', nose: 3,
    hat: 'cap', hatC: '#4a6a8a', hatS: '#344c66', hatL: '#6a8aaa', hair: '#a0603a', hairS: '#7a4428' },
  villager3: { skin: '#e8b890', skinS: '#c08a64', cloak: '#9a6aa0', cloakS: '#704c78', cloakL: '#bc90c0', tunic: '#f0e6d8',
    belt: '#5a4030', legs: '#6a5a50', legsS: '#4e423a', shoe: '#3e3028', beard: null, out: '#261e24', nose: 2, hunch: 1,
    hat: 'bare', hair: '#d8d4cc', hairS: '#aaa49a', bun: true },
});
NN.HLOOK.joryWatch = Object.assign({}, NN.HLOOK.jory, { sack: false, lantern: true });
NN.HLOOK.bramKind = Object.assign({}, NN.HLOOK.bram, { cloak: '#7a6a58', cloakS: '#5a4c3e', cloakL: '#9a8a74', tunic: '#d8ccb0',
  stick: false, brows: '#3a3036', out: '#221a16' });
NN.HLOOK.shepherdScarred = Object.assign({}, NN.HLOOK.shepherd, { scars: true });
NN.HLOOK.shepherdDawn = Object.assign({}, NN.HLOOK.shepherd, { cloak: '#8fd4cc', cloakS: '#5eaaa2', cloakL: '#d2f4ee',
  tunic: '#fffaf0', belt: '#e8b84a', legs: '#b8957a', legsS: '#94735a', shoe: '#7a5236', skin: '#f6d2aa', out: '#3e3440',
  scars: true });

const SCAR = '#b65a5e', EYE = '#2a1a1a', MOUTH = '#7a2a2a';
const ROUND = [5, 7, 9, 11, 11, 11, 11, 11, 11, 11, 9, 9, 7, 5];
// Canvas 20×36. Feet on rows 31–32; the head is only 5×7 on a body about four and a half heads tall.
NN.buildHuman = (look, dir, st, bob) => {
  const L = NN.HLOOK[look];
  const c = mk(20, 36), x = c.getContext('2d');
  const R = (col, X, Y, w = 1, h = 1) => rect(x, col, X, Y, w, h);
  const u = -bob + (L.drop || 0), hipY = 21 + u, hx = L.hunch || 0;
  const aw = L.wide ? 1 : 0, len = L.robeLen || 12, wool = L.costume === 'sheep', hat = L.hat;
  const sleeve = L.sleeve || L.cloakS, hair = L.hair || L.cloak, hairS = L.hairS || L.cloakS;
  const leg = (fromX, toX, col, lift) => {
    const end = 30 - lift;
    for (let y = hipY; y <= end; y++) { const t = (y - hipY) / Math.max(1, end - hipY); R(col, Math.round(fromX + (toX - fromX) * t), y, 2, 1); }
    return Math.round(toX);
  };
  const span = i => {
    if (L.round) { const w = ROUND[Math.min(i, ROUND.length - 1)]; return [10 - (w >> 1), w]; }
    const wide = i >= 7 ? 1 : 0; return [8 - wide - aw, 5 + wide * 2 + aw * 2];
  };
  const robe = (side) => {
    for (let i = 0; i <= len; i++) {
      const y = 11 + u + i, [l, w] = span(i);
      R(L.cloak, l, y, w, 1);
      R(L.cloakS, l, y, 1, 1);
      if (side) { if (i >= 2) R(L.tunic, l + w - 1, y, 1, 1); } else R(L.cloakS, l + w - 1, y, 1, 1);
      if (dir === 'down' && i >= 1) R(L.tunic, 9, y, 3, 1);
      if (L.round && i >= 2 && i <= 5) R(L.cloakL, l + 1, y, 1, 1);
      if (L.trim) {
        if (i === len) R(L.trim, l, y, w, 1);
        if (dir === 'down' && i >= 1) { R(L.trim, 8, y); R(L.trim, 12, y); }
        if (side && i >= 2) R(L.trim, l + w - 2, y);
      }
      if (i === 6) R(L.belt, l, y, w, 1);
    }
    R(L.cloakL, 9, 11 + u, 2, 1);
    // hips: short tunics show trousers down to where the legs start
    for (let y = 12 + u + len; y < hipY; y++) { R(L.legs, 8, y, 5, 1); R(L.legsS, 8, y, 1, 1); }
    if (L.patch) { const px = dir === 'side' ? 9 : dir === 'down' ? 8 : 11; R(L.patch, px, 14 + u, 2, 2); R(L.cloakS, px + 1, 15 + u); }
    if (L.purse && dir !== 'up') { const px = dir === 'side' ? 13 : 12; R('#a0662e', px, 18 + u, 2, 2); R('#f5c542', px, 18 + u); R('#6a3a1a', px, 20 + u, 2, 1); }
  };
  // the sheep costume: a fluffy wool body, stitched up the front
  const fleece = (side) => {
    const cy = 16 + u;
    oval(x, 10, cy, 5, 7, '#c7b6a5'); oval(x, 10, cy - 1, 5, 6, '#e6dacb'); oval(x, 11, cy - 2, 4, 5, '#fdf8ee');
    for (const [bx, by] of [[5, cy - 4], [15, cy - 4], [5, cy + 2], [15, cy + 2], [7, cy - 7], [13, cy - 7], [10, cy - 7]]) disc(x, bx, by, 1, '#e6dacb');
    R('#ffffff', 9, cy - 5, 2, 1); R('#ffffff', 8, cy - 4);
    if (dir === 'down') { for (let y = cy - 5; y <= cy + 5; y += 2) R('#c7b6a5', 10, y); R('#f5c542', 10, cy - 6); }
    if (dir === 'up') { R('#fdf8ee', 9, cy + 7, 3, 2); R('#e6dacb', 9, cy + 8, 3, 1); } // tail
    if (side) { disc(x, 5, cy + 1, 2, '#e6dacb'); R('#fdf8ee', 4, cy, 2, 1); } // tail
  };
  // a head: hood (default), or hair plus a hat. Faces right in side view.
  const headDown = () => {
    if (!hat) {
      R(L.cloak, 8, 3 + u, 5, 2); R(L.cloakL, 9, 3 + u, 2, 1); R(L.cloak, 8, 5 + u, 1, 5); R(L.cloak, 12, 5 + u, 1, 5);
      R(L.skin, 9, 5 + u, 3, 5); R(L.cloakS, 9, 4 + u, 3, 1);
    } else if (hat === 'wool') {
      R('#fdf8ee', 8, 3 + u, 5, 2); R('#ffffff', 9, 3 + u, 2, 1); R('#e6dacb', 8, 5 + u, 1, 5); R('#e6dacb', 12, 5 + u, 1, 5);
      R('#fdf8ee', 10, 2 + u); R(L.skin, 9, 5 + u, 3, 5); R('#e6dacb', 9, 4 + u, 3, 1);
      R(L.earC, 5, 5 + u, 3, 1); R(L.earC, 13, 5 + u, 3, 1); R('#7d6563', 6, 5 + u); R('#7d6563', 14, 5 + u);
    } else {
      R(L.skin, 9, 5 + u, 3, 5);
      R(hair, 9, 3 + u, 3, 1); R(hair, 8, 4 + u, 5, 1); R(hairS, 8, 5 + u, 1, 2); R(hairS, 12, 5 + u, 1, 2);
      if (L.messy) { R(hair, 8, 2 + u); R(hair, 11, 2 + u); R(hair, 13, 4 + u); R(hairS, 9, 5 + u); }
      if (L.bun) { R(hair, 9, 1 + u, 3, 2); R(hairS, 9, 2 + u, 3, 1); }
      if (L.beardSize === 'big' && !hat.match(/straw|bucket|cap|scarf/)) { R(hair, 7, 4 + u, 1, 3); R(hair, 13, 4 + u, 1, 3); }
    }
    if (hat === 'straw') {
      R(L.hatC, 8, 2 + u, 5, 2); R(L.hatL, 9, 2 + u, 2, 1); R(L.hatB, 8, 3 + u, 5, 1);
      R(L.hatL, 6, 4 + u, 9, 1); R(L.hatC, 6, 5 + u, 2, 1); R(L.hatC, 13, 5 + u, 2, 1); R(L.hatS, 8, 5 + u, 5, 1);
    } else if (hat === 'bucket') {
      R(L.hatC, 8, 2 + u, 5, 3); R(L.hatL, 9, 2 + u, 2, 1); R(L.hatS, 7, 5 + u, 7, 1); R(L.hatC, 8, 5 + u, 5, 1);
    } else if (hat === 'cap') {
      R(L.hatC, 8, 3 + u, 5, 2); R(L.hatL, 9, 3 + u, 2, 1); R(L.hatS, 8, 5 + u, 5, 1);
    } else if (hat === 'scarf') {
      R(L.hatC, 8, 3 + u, 5, 2); R(L.hatS, 8, 5 + u, 1, 2); R(L.hatS, 12, 5 + u, 1, 2); R(L.hatL, 9, 3 + u); R(L.hatL, 11, 4 + u);
      R(L.hatC, 13, 3 + u); R(L.hatS, 14, 2 + u); // the knot
    }
    // face
    R(EYE, 9, 6 + u); R(EYE, 11, 6 + u);
    if (L.brows) R(L.brows, 9, 5 + u, 3, 1);
    if (L.beard) {
      if (L.beardSize === 'big') { R(L.beard, 8, 7 + u, 5, 4); R(L.beard, 9, 11 + u, 3, 2); R(L.beard, 10, 13 + u); }
      else if (L.beardSize === 'long') { R(L.beard, 9, 8 + u, 3, 4); R(L.beard, 10, 12 + u, 1, 2); }
      else R(L.beard, 9, 8 + u, 3, 3);
    }
    if (L.nose === 1 || !L.nose) R(L.skinS, 10, 7 + u);
    else if (L.nose === 2) { R(L.skinS, 10, 7 + u, 1, 2); R(L.skin, 10, 6 + u); R(L.skinS, 9, 8 + u); R(L.skinS, 11, 8 + u); }
    else { R(L.skinS, 10, 7 + u, 1, 3); R(L.skin, 10, 6 + u); }
    if (L.beard && !L.beardSize) R(L.skinS, 10, 7 + u);
    if (L.beard && L.nose === 2) { R(L.skinS, 10, 7 + u, 1, 2); R(L.skin, 10, 6 + u); }
    if (L.grin) { R(MOUTH, 9, 9 + u, 3, 1); R('#ffffff', 10, 9 + u); if (L.beard) { R(MOUTH, 9, 10 + u, 3, 1); R('#ffffff', 10, 10 + u); } }
    if (L.blush) { R('#f08a8a', 9, 7 + u); R('#f08a8a', 11, 7 + u); }
    if (L.stalk) { R('#f2d27a', 11, 9 + u); R('#f2d27a', 12, 10 + u); R('#c99b3e', 13, 11 + u); }
  };
  const headUp = () => {
    if (!hat) {
      R(L.cloak, 8, 3 + u, 5, 8); R(L.cloakL, 9, 3 + u, 2, 1); R(L.cloakS, 8, 6 + u, 1, 5); R(L.cloakS, 12, 6 + u, 1, 5);
      return;
    }
    if (hat === 'wool') {
      R('#fdf8ee', 8, 3 + u, 5, 8); R('#ffffff', 9, 3 + u, 2, 1); R('#e6dacb', 8, 6 + u, 1, 5); R('#e6dacb', 12, 6 + u, 1, 5);
      R('#fdf8ee', 10, 2 + u); R(L.earC, 5, 5 + u, 3, 1); R(L.earC, 13, 5 + u, 3, 1);
      return;
    }
    R(L.skinS, 9, 9 + u, 3, 1);
    R(hair, 9, 3 + u, 3, 1); R(hair, 8, 4 + u, 5, 5); R(hairS, 8, 7 + u, 5, 2); R(L.hair ? hairS : L.cloakS, 8, 4 + u);
    if (L.messy) { R(hair, 8, 2 + u); R(hair, 11, 2 + u); R(hair, 13, 5 + u); R(hairS, 7, 6 + u); }
    if (L.bun) { R(hair, 9, 1 + u, 3, 2); R(hairS, 9, 5 + u, 3, 2); }
    if (L.beardSize === 'big') { R(L.beard, 7, 7 + u, 1, 3); R(L.beard, 13, 7 + u, 1, 3); }
    if (hat === 'straw') {
      R(L.hatC, 8, 2 + u, 5, 2); R(L.hatL, 9, 2 + u, 2, 1); R(L.hatB, 8, 3 + u, 5, 1);
      R(L.hatL, 6, 4 + u, 9, 1); R(L.hatC, 7, 5 + u, 7, 1); R(L.hatS, 7, 5 + u); R(L.hatS, 13, 5 + u);
    } else if (hat === 'bucket') {
      R(L.hatC, 8, 2 + u, 5, 3); R(L.hatL, 9, 2 + u, 2, 1); R(L.hatS, 7, 5 + u, 7, 1);
    } else if (hat === 'cap') {
      R(L.hatC, 8, 3 + u, 5, 3); R(L.hatL, 9, 3 + u, 2, 1); R(L.hatS, 10, 6 + u); R(L.hatS, 8, 5 + u); R(L.hatS, 12, 5 + u);
    } else if (hat === 'scarf') {
      R(L.hatC, 8, 3 + u, 5, 5); R(L.hatS, 8, 6 + u, 5, 2); R(L.hatL, 9, 3 + u); R(L.hatL, 11, 5 + u); R(L.hatL, 9, 6 + u);
      R(L.hatC, 10, 8 + u); R(L.hatS, 9, 9 + u); R(L.hatS, 11, 9 + u); // the knot and its tails
    }
  };
  const headSide = () => {
    const H = hx;
    if (!hat) {
      R(L.cloak, 8 + H, 3 + u, 4, 2); R(L.cloakL, 9 + H, 3 + u, 2, 1); R(L.cloak, 8 + H, 5 + u, 2, 6); R(L.cloakS, 8 + H, 6 + u, 1, 5);
      R(L.skin, 10 + H, 5 + u, 3, 5); R(L.cloak, 10 + H, 4 + u, 3, 1);
    } else if (hat === 'wool') {
      R('#fdf8ee', 8 + H, 3 + u, 4, 2); R('#ffffff', 9 + H, 3 + u, 2, 1); R('#fdf8ee', 8 + H, 5 + u, 2, 6); R('#e6dacb', 8 + H, 6 + u, 1, 5);
      R(L.skin, 10 + H, 5 + u, 3, 5); R('#fdf8ee', 10 + H, 4 + u, 3, 1); R('#fdf8ee', 9 + H, 2 + u);
      R(L.earC, 5 + H, 5 + u, 3, 1); R('#7d6563', 6 + H, 5 + u);
    } else {
      R(L.skin, 10 + H, 5 + u, 3, 5); R(L.skinS, 9 + H, 8 + u, 1, 2);
      R(hair, 9 + H, 3 + u, 3, 1); R(hair, 8 + H, 4 + u, 5, 1); R(hair, 8 + H, 5 + u, 2, 3); R(hairS, 8 + H, 6 + u, 1, 3);
      R(L.skinS, 10 + H, 6 + u); // ear
      if (L.messy) { R(hair, 8 + H, 2 + u); R(hair, 11 + H, 2 + u); R(hair, 7 + H, 5 + u); R(hair, 12 + H, 5 + u); }
      if (L.bun) { R(hair, 7 + H, 3 + u, 2, 3); R(hairS, 7 + H, 5 + u, 2, 1); }
    }
    if (hat === 'straw') {
      R(L.hatC, 8 + H, 2 + u, 5, 2); R(L.hatL, 9 + H, 2 + u, 2, 1); R(L.hatB, 8 + H, 3 + u, 5, 1);
      R(L.hatL, 6 + H, 4 + u, 10, 1); R(L.hatS, 6 + H, 5 + u, 2, 1); R(L.hatS, 13 + H, 5 + u, 3, 1);
    } else if (hat === 'bucket') {
      R(L.hatC, 8 + H, 2 + u, 5, 3); R(L.hatL, 9 + H, 2 + u, 2, 1); R(L.hatS, 7 + H, 5 + u, 7, 1); R(L.hatC, 13 + H, 5 + u);
    } else if (hat === 'cap') {
      R(L.hatC, 8 + H, 3 + u, 5, 2); R(L.hatL, 9 + H, 3 + u, 2, 1); R(L.hatS, 13 + H, 5 + u, 2, 1); R(L.hatS, 12 + H, 5 + u);
    } else if (hat === 'scarf') {
      R(L.hatC, 8 + H, 3 + u, 5, 2); R(L.hatC, 8 + H, 5 + u, 2, 2); R(L.hatS, 8 + H, 6 + u, 1, 2); R(L.hatL, 10 + H, 3 + u); R(L.hatL, 9 + H, 5 + u);
      R(L.hatC, 7 + H, 5 + u); R(L.hatS, 6 + H, 6 + u); R(L.hatS, 7 + H, 7 + u); // knot at the back
    }
    R(EYE, 11 + H, 6 + u);
    if (L.brows) R(L.brows, 11 + H, 5 + u, 2, 1);
    if (L.nose === 1 || !L.nose) R(L.skinS, 13 + H, 7 + u);
    else if (L.nose === 2) { R(L.skin, 13 + H, 6 + u, 1, 3); R(L.skin, 14 + H, 7 + u, 1, 2); R(L.skinS, 14 + H, 8 + u); R(L.skinS, 13 + H, 8 + u); }
    else { R(L.skin, 13 + H, 6 + u); R(L.skin, 14 + H, 7 + u); R(L.skinS, 13 + H, 7 + u); R(L.skinS, 15 + H, 8 + u); }
    if (L.beard) {
      if (L.beardSize === 'big') { R(L.beard, 9 + H, 7 + u, 5, 4); R(L.beard, 10 + H, 11 + u, 4, 2); R(L.beard, 11 + H, 13 + u, 2, 1); R(L.skinS, 13 + H, 7 + u); }
      else if (L.beardSize === 'long') { R(L.beard, 10 + H, 8 + u, 3, 4); R(L.beard, 11 + H, 12 + u, 2, 2); R(L.beard, 12 + H, 14 + u); }
      else { R(L.beard, 10 + H, 8 + u, 3, 2); R(L.beard, 11 + H, 10 + u, 2, 1); }
    } else R(L.skinS, 10 + H, 10 + u, 2, 1);
    if (L.grin) { R(MOUTH, 11 + H, 9 + u, 2, 1); R('#ffffff', 12 + H, 9 + u); }
    if (L.blush) R('#f08a8a', 12 + H, 7 + u);
    if (L.stalk) { R('#f2d27a', 13 + H, 9 + u); R('#f2d27a', 14 + H, 9 + u); R('#c99b3e', 15 + H, 8 + u); R('#f2d27a', 16 + H, 7 + u); }
  };
  const arm = (X, y0, end, col) => { for (let y = y0; y <= end; y++) R(y > end - 2 ? L.skin : L.rolled && y >= 16 ? L.skin : L.rolled && y === 15 ? L.tunic : col, X, y + u); };
  if (dir === 'side') {
    const fb = leg(9, 9 - st * 2, L.legsS, 0); R(L.shoe, fb, 31, 3, 1); R(L.shoe, fb, 32, 4, 1);
    if (L.sack) { R('#b08d57', 4, 12 + u, 4, 8); R('#8e6d3e', 4, 18 + u, 4, 2); R('#5a4030', 6, 11 + u, 1, 1); }
    if (L.stick) { R('#7a5030', 14, 10 + u, 1, 22 - u); R('#9a6a40', 14, 10 + u, 1, 3); }
    if (wool) fleece(true); else robe(true);
    const ff = leg(10, 10 + st * 2, L.legs, 0); R(L.shoe, ff, 31, 3, 1); R(L.shoe, ff, 32, 4, 1);
    if (wool) { R(L.shoe, ff, 30, 3, 1); R(L.shoe, fb, 30, 2, 1); }
    headSide();
    // arm
    if (L.staff || L.lantern || L.stick) {
      R(L.sleeve || L.cloak, 10, 12 + u, 2, 3); R(sleeve, 11, 15 + u, 2, 2); R(L.skin, 12, 17 + u, 2, 2);
      if (L.rolled) { R(L.tunic, 11, 15 + u, 2, 1); R(L.skin, 11, 16 + u, 2, 1); }
      if (L.scars) R(SCAR, 12, 17 + u);
    } else if (wool) {
      for (let y = 12; y <= 19; y++) R(y < 18 ? '#e6dacb' : L.earC, Math.round(10 - st * (y - 12) / 4), y + u, 2, 1);
    } else {
      const ay = L.round ? 13 : 12, ae = L.round ? 18 : 19;
      for (let y = ay; y <= ae; y++) {
        const hand = y > ae - 2, bare = L.rolled && y >= 16;
        R(hand ? L.skin : bare ? L.skin : L.rolled && y === 15 ? L.tunic : sleeve, Math.round(10 - st * (y - ay) / 4), y + u, hand || bare ? 1 : 2, 1);
      }
      if (L.scars) R(SCAR, Math.round(10 - st * (ae - 1 - ay) / 4), ae - 1 + u);
    }
    if (L.lantern) { R('#5a3a24', 13, 19 + u, 3, 1); R('#f5c542', 13, 20 + u, 3, 3); R('#fff2a8', 14, 21 + u); }
  } else {
    const liftL = st > 0 ? 1 : 0, liftR = st < 0 ? 1 : 0;
    leg(8, 8, L.legsS, liftL); R(L.shoe, 8, 31 - liftL, 2, 2);
    leg(11, 11, L.legs, liftR); R(L.shoe, 11, 31 - liftR, 2, 2);
    if (wool) { R(L.shoe, 7, 31 - liftL, 3, 2); R(L.shoe, 11, 31 - liftR, 3, 2); }
    if (L.stick && dir === 'up') R('#7a5030', 14, 10 + u, 1, 21 - u);
    if (wool) fleece(false); else robe(false);
    // arms: one pixel wide, long
    let xl = 7 - aw, xr = 13 + aw, top = 12, armL = 20 + st, armR = 20 - st;
    if (L.round) { xl = 4; xr = 16; top = 14; armL = 19 + st; armR = 19 - st; }
    if (wool) { xl = 4; xr = 16; top = 13; }
    const sc = wool ? '#e6dacb' : sleeve;
    const drawArm = (X, end) => { for (let y = top; y <= end; y++) R(y > end - 2 ? (wool ? L.earC : L.skin) : L.rolled && y >= 16 ? L.skin : L.rolled && y === 15 ? L.tunic : sc, X, y + u); };
    drawArm(xl, armL);
    if (L.scars) R(SCAR, xl, armL - 1 + u);
    if ((L.staff || L.stick) && dir === 'down') {
      R(sc, 13, 12 + u, 1, 5); R(L.skin, 13, 17 + u, 2, 2);
      if (L.stick) { R('#7a5030', 15, 9 + u, 1, 23 - u); R('#9a6a40', 15, 9 + u, 1, 3); R(L.skin, 14, 17 + u, 2, 2); }
      if (L.scars) R(SCAR, 13, 17 + u);
    } else { drawArm(xr, armR); if (L.scars) R(SCAR, xr, armR - 1 + u); }
    if (dir === 'down') {
      headDown();
      if (L.sack) { R('#b08d57', 13, 9 + u, 3, 4); R('#8e6d3e', 13, 12 + u, 3, 1); }
      if (L.lantern) { R('#5a3a24', 6, 20 + u, 2, 1); R('#f5c542', 6, 21 + u, 2, 3); }
    } else {
      headUp();
      if (L.sack) { R('#b08d57', 8, 12 + u, 5, 7); R('#8e6d3e', 8, 17 + u, 5, 2); R('#5a4030', 10, 11 + u); }
    }
  }
  return outline(c, L.out, false);
};

// ---------------------------------------------------------------- scenery props (anchor = foot point)
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


Object.assign(NN.PROPS, {
  oak: { make: () => makeOak(false), ox: 18, oy: 45 },
  blossom: { make: () => makeOak(true), ox: 18, oy: 45 },
  pine: { make: makePine, ox: 14, oy: 47 },
  bush: { make: () => makeBush(null), ox: 11, oy: 15 },
  berry: { make: () => makeBush('#d8574f'), ox: 11, oy: 15 },
  blue: { make: () => makeBush('#6a7fd8'), ox: 11, oy: 15 },
  hutDay: { make: () => makeHut(false), ox: 31, oy: 63 },
  hutNight: { make: () => makeHut(true), ox: 31, oy: 63 },
  shelter: { make: makeShelter, ox: 42, oy: 41 },
  trough: { make: makeTrough, ox: 15, oy: 12 },
  hay: { make: makeHay, ox: 8, oy: 12 },
  stump: { make: makeStump, ox: 7, oy: 9 },
});

// ---------------------------------------------------------------- farm buildings and the wider world
// Buildings are sized to their footprint (W×H tiles × 16 px) plus their height above it; the foot point is the bottom
// center of the footprint, which is the bottom center of the image.
const K = {
  wood: '#c58d55', woodS: '#a8703f', woodL: '#e0aa6c', tim: '#8a5a33', timS: '#6b4226', timL: '#b07a45', timD: '#5a3418',
  stone: '#9a98a8', stoneS: '#76748a', stoneL: '#b9b7c6', stoneD: '#5d5b6e', roof: '#b34f3f', roofS: '#9e4334',
  roofD: '#7a2e26', roofL: '#d06a52', hay: '#e3c35a', hayL: '#f5dd8a', hayS: '#c9a03e', hayD: '#a07c28',
  leaf: '#56983f', leafS: '#3f7a34', leafL: '#74b54d', leafH: '#9bd16a', water: '#4aa3d8', waterL: '#a8dcf5', waterD: '#2f7ab0',
  soil: '#7a5030', soilS: '#5e3a22', soilL: '#946642', cream: '#f1e4c6', red: '#d8574f', gold: '#f5c542', out: '#3e2416',
};
const canvas = (w, h) => { const c = mk(w, h); return [c, c.getContext('2d')]; };
// pixel map: one char per pixel through a little palette; ' ' and '.' are clear
const pix = (x, X, Y, rows, pal) => rows.forEach((s, j) => { for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch !== '.' && ch !== ' ') rect(x, pal[ch] || '#f0f', X + i, Y + j); } });
// vertical planks with seams and a lit top edge
const planks = (x, X, Y, w, h, base, seam, top, step = 6) => {
  rect(x, base, X, Y, w, h);
  for (let i = X + 2; i < X + w; i += step) rect(x, seam, i, Y, 1, h);
  if (top) rect(x, top, X, Y, w, 1);
};
// horizontal boards (fences, decks)
const boards = (x, X, Y, w, h, base, seam, hi, step = 3) => {
  rect(x, base, X, Y, w, h);
  for (let j = Y + step - 1; j < Y + h; j += step) rect(x, seam, X, j, w, 1);
  if (hi) for (let j = Y; j < Y + h; j += step) rect(x, hi, X, j, w, 1);
};
// a shingled roof seen from above: rows narrow toward the top by `slope`
const shingles = (x, X, Y, w, h, slope, a, b, line, spot) => {
  for (let j = 0; j < h; j++) {
    const inset = slope ? Math.round((h - 1 - j) / slope) : 0, l = X + inset, ww = w - inset * 2, row = Math.floor(j / 4);
    rect(x, row % 2 ? a : b, l, Y + j, ww, 1);
    if (j % 4 === 3) rect(x, line, l, Y + j, ww, 1);
    if (j % 4 === 0) for (let i = l + (row % 2 ? 2 : 5); i < l + ww - 1; i += 7) rect(x, spot, i, Y + j, 2, 1);
  }
};
// a stone course
const stones = (x, X, Y, w, h, base = K.stone, dark = K.stoneS, light = K.stoneL) => {
  rect(x, base, X, Y, w, h);
  for (let j = 0; j < h; j += 3) for (let i = X + ((j / 3) % 2 ? 0 : 3); i < X + w - 1; i += 6) { rect(x, dark, i, Y + j + 2, 5, 1); rect(x, dark, i + 5, Y + j, 1, 3); rect(x, light, i, Y + j, 2, 1); }
};
const blob = (x, list, col) => { for (const [cx, cy, r] of list) disc(x, cx, cy, r, col); };
const hayHeap = (x, X, Y, w, h) => {
  oval(x, X + w / 2, Y + h * 0.6, w / 2, Math.ceil(h * 0.5), K.hayS);
  oval(x, X + w / 2 - 1, Y + h * 0.5, w / 2 - 1, Math.ceil(h * 0.45), K.hay);
  oval(x, X + w / 2 - 2, Y + h * 0.4, w / 3, Math.ceil(h * 0.25), K.hayL);
  for (let i = 0; i < w; i += 3) { rect(x, K.hayD, X + i + 1, Y + h - 2, 1, 1); rect(x, K.hayL, X + i, Y + 1 + (i % 2), 1, 2); }
};

function makeFeeder(full) {
  const [c, x] = canvas(32, 26);
  rect(x, K.timS, 3, 15, 2, 10); rect(x, K.timS, 27, 15, 2, 10); rect(x, K.tim, 4, 15, 1, 10); rect(x, K.tim, 28, 15, 1, 10);
  rect(x, K.timD, 2, 7, 28, 10); // inside of the rack
  if (full) { hayHeap(x, 2, 0, 28, 11); for (let i = 4; i < 28; i += 4) rect(x, K.hay, i, 9, 2, 6); }
  for (let i = 3; i < 29; i += 3) { rect(x, K.wood, i, 8, 2, 8); rect(x, K.woodL, i, 8, 1, 8); }
  rect(x, K.tim, 1, 7, 30, 2); rect(x, K.woodL, 1, 7, 30, 1); rect(x, K.tim, 1, 15, 30, 2); rect(x, K.timS, 1, 16, 30, 1);
  if (full) { rect(x, K.hayL, 6, 6, 2, 1); rect(x, K.hay, 14, 5, 1, 3); rect(x, K.hayL, 22, 6, 3, 1); rect(x, K.hay, 11, 16, 1, 2); rect(x, K.hay, 20, 16, 1, 3); }
  return outline(c, K.out, false);
}
function makeTroughEmpty() {
  const c = mk(28, 11), x = c.getContext('2d');
  rect(x, '#8a5a33', 0, 2, 28, 8); rect(x, '#6b4226', 0, 7, 28, 3); rect(x, '#5a3418', 2, 3, 24, 3); rect(x, '#6e4a2c', 3, 5, 22, 1);
  rect(x, '#7a5636', 6, 4, 3, 1); rect(x, '#7a5636', 17, 4, 4, 1);
  rect(x, '#6b4226', 2, 10, 3, 1); rect(x, '#6b4226', 23, 10, 3, 1);
  return outline(c, '#3e2416');
}
function makeLean() {
  const [c, x] = canvas(64, 52);
  // a mono-pitch roof: tall on the left, low on the right, so the slant reads at a glance
  const top = i => Math.round(i * 12 / 63);
  for (let i = 3; i < 61; i++) rect(x, i % 5 ? K.timS : K.timD, i, top(i) + 12, 1, 40 - top(i) - 12); // back wall in shade
  rect(x, K.hayS, 2, 40, 60, 11); rect(x, K.hay, 3, 41, 58, 9);
  for (let i = 4; i < 60; i += 3) rect(x, i % 2 ? K.hayL : K.hayD, i, 42 + (i % 7) % 6, 2, 1);
  hayHeap(x, 6, 31, 16, 12);
  rect(x, K.stoneS, 46, 45, 8, 3); rect(x, K.water, 47, 45, 6, 1); // water bowl
  // side wall on the right under the low eave, posts
  for (let i = 0; i < 4; i++) rect(x, i % 2 ? K.wood : K.woodS, 57 + i, top(60) + 18, 1, 33 - top(60) - 18 + 16);
  rect(x, K.tim, 2, 18, 3, 33); rect(x, K.timS, 4, 18, 1, 33); rect(x, K.tim, 59, top(60) + 18, 3, 51 - top(60) - 18); rect(x, K.timS, 61, top(60) + 18, 1, 51 - top(60) - 18);
  for (let i = 0; i < 64; i++) {
    const t = top(i);
    for (let j = 0; j < 20; j++) {
      const row = Math.floor(j / 3);
      rect(x, j % 3 === 2 ? '#6b4226' : row % 2 ? '#a8703f' : '#94603a', i, t + j, 1, 1);
      if (j % 3 === 0 && (i + row * 4) % 9 < 3) rect(x, '#c48d55', i, t + j, 1, 1);
    }
    rect(x, K.tim, i, t + 20, 1, 1); rect(x, K.timS, i, t + 21, 1, 1);
  }
  rect(x, '#d8a468', 0, 0, 1, 20);
  // a little sign with a heart
  rect(x, K.woodL, 24, 26, 9, 6); rect(x, K.tim, 24, 31, 9, 1); pix(x, 26, 27, ['r.r', 'rrr', '.r.'], { r: K.red });
  return outline(c, K.out, false);
}
function makeWell() {
  const [c, x] = canvas(32, 54);
  // posts and roof
  rect(x, K.tim, 4, 12, 3, 30); rect(x, K.timS, 6, 12, 1, 30); rect(x, K.tim, 25, 12, 3, 30); rect(x, K.timS, 27, 12, 1, 30);
  shingles(x, 1, 1, 30, 14, 1.6, K.roof, K.roofS, K.roofD, K.roofL);
  rect(x, K.roofD, 1, 14, 30, 1);
  rect(x, K.timL, 4, 17, 24, 2); rect(x, K.timS, 4, 18, 24, 1); rect(x, K.timD, 28, 16, 2, 2); rect(x, K.timD, 29, 18, 1, 3); // crank
  rect(x, '#d8c8a0', 16, 19, 1, 8); // rope
  rect(x, K.timS, 13, 27, 7, 6); rect(x, K.tim, 14, 27, 5, 5); rect(x, K.stoneD, 13, 28, 7, 1); rect(x, K.stoneD, 13, 31, 7, 1); rect(x, K.waterL, 15, 26, 3, 1); // bucket
  // stone ring: rim from above, then the round wall
  oval(x, 16, 40, 14, 5, K.stoneS); oval(x, 16, 39, 13, 4, K.stoneL); oval(x, 16, 39, 9, 2, '#22405a'); rect(x, '#3a6a8a', 13, 39, 5, 1);
  stones(x, 2, 41, 28, 11); rect(x, K.stoneD, 2, 51, 28, 1);
  for (const X of [2, 29]) rect(x, K.stoneS, X, 41, 1, 10);
  return outline(c, '#2e1a14', false);
}
function makeHayBarn() {
  const [c, x] = canvas(64, 84);
  // walls
  planks(x, 3, 36, 58, 46, '#b5473a', '#963a30', '#cf6a50', 5);
  rect(x, K.cream, 3, 36, 2, 46); rect(x, K.cream, 59, 36, 2, 46); rect(x, K.cream, 3, 36, 58, 2);
  rect(x, K.stoneS, 3, 80, 58, 3); for (let i = 4; i < 60; i += 6) rect(x, K.stone, i, 80, 4, 2);
  // big doors with white X braces
  rect(x, '#7a2e26', 17, 52, 30, 28); rect(x, '#9a3a30', 18, 53, 13, 27); rect(x, '#9a3a30', 33, 53, 13, 27);
  for (const dx of [18, 33]) for (let k = 0; k < 13; k++) { rect(x, K.cream, dx + k, 53 + Math.round(k * 26 / 12), 1, 1); rect(x, K.cream, dx + 12 - k, 53 + Math.round(k * 26 / 12), 1, 1); }
  rect(x, K.cream, 17, 52, 30, 1); rect(x, K.cream, 31, 52, 2, 28); rect(x, K.cream, 17, 52, 1, 28); rect(x, K.cream, 46, 52, 1, 28);
  // hay loft door, open, hay spilling out
  rect(x, K.cream, 25, 38, 14, 12); rect(x, '#4a2a1e', 26, 39, 12, 10); hayHeap(x, 26, 42, 12, 8);
  rect(x, K.hay, 29, 49, 2, 2); rect(x, K.hayL, 33, 49, 1, 3);
  rect(x, K.timD, 31, 33, 1, 4); rect(x, '#8a8898', 30, 37, 3, 1); // pulley hook
  // gambrel roof seen from above
  shingles(x, 0, 6, 64, 12, 1.2, '#8e4034', '#7e3a30', '#5e261e', '#b05a48');
  shingles(x, 0, 18, 64, 19, 3.5, '#8e4034', '#7e3a30', '#5e261e', '#b05a48');
  rect(x, '#5e261e', 0, 36, 64, 1); rect(x, '#5e261e', 10, 6, 44, 1);
  // weathervane: a little sheep
  rect(x, K.timD, 31, 0, 1, 6); pix(x, 28, 0, ['.ww.', 'wwwk'], { w: '#fdf8ee', k: '#4e3d3f' });
  // a hay pile at the foot of the wall and a pitchfork
  hayHeap(x, 2, 68, 15, 14);
  rect(x, K.timL, 53, 58, 1, 22); pix(x, 51, 55, ['i.i.i', 'i.i.i', 'iiiii'], { i: '#c4c3d0' });
  return outline(c, '#2e1a14', false);
}
function makeInfirmary() {
  const [c, x] = canvas(64, 78);
  const wall = '#f4efe6', wallS = '#d8cfc2', wallD = '#b8ad9e';
  // main house: white walls, soft blue roof
  rect(x, wall, 3, 36, 40, 40); rect(x, wallS, 3, 36, 2, 40); rect(x, wallS, 3, 36, 40, 2);
  for (let j = 40; j < 74; j += 6) rect(x, '#e8e0d2', 6, j, 36, 1);
  rect(x, K.stoneS, 3, 74, 40, 3); for (let i = 4; i < 42; i += 6) rect(x, K.stone, i, 74, 4, 2);
  shingles(x, 0, 8, 46, 29, 2.8, '#6e8eb0', '#5e7c9e', '#455f7e', '#92b0cc');
  rect(x, '#455f7e', 0, 36, 46, 1);
  rect(x, K.stoneS, 32, 2, 6, 12); rect(x, K.stoneL, 33, 4, 2, 1); // chimney
  // door with a heart, window
  rect(x, K.tim, 9, 54, 11, 21); rect(x, K.timS, 14, 54, 1, 21); rect(x, K.timD, 9, 54, 11, 1);
  pix(x, 12, 58, ['r.r', 'rrr', '.r.'], { r: K.red }); rect(x, K.gold, 18, 65, 1, 2);
  rect(x, wallD, 26, 50, 12, 10); rect(x, '#a8d8f0', 27, 51, 10, 8); rect(x, '#d8f0fa', 28, 52, 3, 2); rect(x, wallD, 31, 51, 1, 8); rect(x, wallD, 27, 55, 10, 1);
  rect(x, K.tim, 25, 60, 14, 2); rect(x, '#ef9aa0', 27, 59, 2, 1); rect(x, '#f6e48a', 31, 59, 2, 1); rect(x, '#9bd16a', 35, 59, 2, 1);
  // the red cross banner on a pole over the door
  rect(x, K.timD, 21, 30, 1, 22); rect(x, K.timD, 10, 37, 12, 1);
  rect(x, wall, 11, 38, 10, 13); rect(x, wallS, 11, 49, 10, 2); for (let i = 11; i < 21; i += 2) rect(x, wallS, i, 50, 1, 1);
  rect(x, K.red, 14, 40, 4, 9); rect(x, K.red, 12, 42, 8, 4); rect(x, '#b03a34', 14, 47, 4, 2);
  // porch on the right: striped awning on posts over a cot
  rect(x, K.tim, 45, 46, 2, 30); rect(x, K.tim, 60, 46, 2, 30);
  for (let i = 43; i < 63; i++) { rect(x, Math.floor((i - 43) / 3) % 2 ? '#ffffff' : K.red, i, 40, 1, 7); }
  for (let i = 43; i < 63; i += 3) rect(x, Math.floor((i - 43) / 3) % 2 ? '#ffffff' : K.red, i, 47, 2, 1);
  rect(x, '#e8a8a0', 43, 40, 20, 1);
  rect(x, K.timS, 46, 66, 15, 2); rect(x, K.timS, 47, 68, 1, 5); rect(x, K.timS, 59, 68, 1, 5); // cot frame
  rect(x, '#f8f4ec', 46, 62, 15, 4); rect(x, '#7ab0d8', 50, 62, 11, 5); rect(x, '#5a90b8', 50, 66, 11, 1); rect(x, '#9ccaea', 51, 62, 9, 1);
  rect(x, '#ffffff', 46, 61, 4, 3); // pillow
  rect(x, K.stoneS, 44, 74, 19, 3);
  return outline(c, '#2e2228', false);
}
function makeHerbGarden() {
  const [c, x] = canvas(48, 36);
  rect(x, K.soilS, 2, 5, 44, 28); rect(x, K.soil, 3, 6, 42, 26);
  const herbs = [['#4f9a3c', '#7cc256', '#a070c8'], ['#3f8a55', '#62ad6a', '#ffffff'], ['#6a9a3a', '#9bd16a', '#f5c542']];
  herbs.forEach(([d, l, fl], r) => {
    const Y = 10 + r * 8;
    rect(x, K.soilS, 4, Y + 4, 40, 1);
    for (let i = 5; i < 43; i += 5) {
      disc(x, i + 1, Y + 1, 2, d); rect(x, l, i, Y, 2, 1); rect(x, l, i + 2, Y + 1, 1, 1);
      if ((i + r) % 2) { rect(x, fl, i + 1, Y - 2, 1, 1); rect(x, fl, i - 1, Y - 1, 1, 1); }
    }
  });
  // low picket fence: back rail, sides, front
  const pick = (X, Y, h) => { rect(x, K.woodL, X, Y, 2, h); rect(x, K.woodS, X + 1, Y + 1, 1, h - 1); };
  rect(x, K.woodS, 1, 3, 46, 1); for (let i = 1; i < 47; i += 4) pick(i, 1, 5);
  for (let j = 6; j < 30; j += 4) { pick(0, j, 4); pick(46, j, 4); }
  rect(x, K.woodS, 1, 31, 46, 1); rect(x, K.wood, 1, 30, 46, 1);
  for (let i = 1; i < 47; i += 4) if (i < 20 || i > 26) pick(i, 28, 7);
  // a watering can by the gate gap
  pix(x, 21, 29, ['.iiI.', 'iiiIi', 'iiiI.', '.II..'], { i: '#c4c3d0', I: '#7d7b90' });
  return outline(c, K.out, false);
}
function makeLoom() {
  const [c, x] = canvas(32, 46);
  const yarn = [K.red, K.gold, '#3f8f93', '#ef9aa0', '#a070c8', '#6a8fe0', '#7cc256'];
  for (let i = 0; i < 21; i++) rect(x, yarn[Math.floor(i / 3) % yarn.length], 6 + i, 7, 1, 22); // warp threads
  for (let j = 20; j < 29; j++) for (let i = 6; i < 27; i++) if ((i + j) % 2) rect(x, j % 4 < 2 ? '#fdf8ee' : '#e6dacb', i, j, 1, 1); // the cloth so far
  rect(x, K.red, 6, 23, 21, 1); rect(x, '#3f8f93', 6, 26, 21, 1);
  rect(x, K.timL, 5, 18, 23, 2); rect(x, K.tim, 5, 19, 23, 1); // beater bar
  // frame
  rect(x, K.tim, 2, 2, 4, 40); rect(x, K.timS, 2, 2, 1, 40); rect(x, K.tim, 27, 2, 4, 40); rect(x, K.timS, 30, 2, 1, 40);
  rect(x, K.timL, 1, 3, 31, 4); rect(x, K.tim, 1, 5, 31, 2); rect(x, K.timL, 1, 29, 31, 3); rect(x, K.tim, 1, 31, 31, 1);
  rect(x, K.timS, 0, 41, 8, 3); rect(x, K.timS, 25, 41, 8, 3);
  // shuttle and a basket of yarn balls
  rect(x, K.woodL, 12, 16, 7, 2); rect(x, K.gold, 14, 16, 3, 1);
  rect(x, '#b08d57', 14, 38, 12, 6); rect(x, '#8e6d3e', 14, 42, 12, 2); for (let i = 15; i < 26; i += 3) rect(x, '#8e6d3e', i, 39, 1, 3);
  disc(x, 17, 37, 2, '#a070c8'); disc(x, 22, 37, 2, K.red); disc(x, 20, 35, 2, K.gold);
  rect(x, '#ffffff', 16, 36, 1, 1); rect(x, '#ffffff', 19, 34, 1, 1); rect(x, '#ffffff', 21, 36, 1, 1);
  return outline(c, K.out, false);
}
function makeWorkshop() {
  const [c, x] = canvas(48, 52);
  // floor of sawdust, back posts and tool rack
  rect(x, '#c8a878', 2, 30, 44, 21); for (let i = 4; i < 44; i += 5) rect(x, '#e0c898', i, 32 + (i % 3) * 5, 2, 1);
  rect(x, K.timS, 5, 14, 2, 18); rect(x, K.timS, 41, 14, 2, 18);
  planks(x, 7, 16, 34, 14, '#9a6a40', '#7a5030', null, 6);
  rect(x, K.timD, 9, 19, 30, 1);
  pix(x, 10, 20, [
    '.ii..k.....hh.....i..',
    'iiii.k....hhhh...iii.',
    'iiii.k.....kk.....i..',
    'iiii.k.....kk.....k..',
    '.....k.....kk.....k..',
    '.k...k.....kk.....k..',
  ], { i: '#c4c3d0', k: K.timD, h: '#7d7b90' });
  // sawhorse with a plank, the log pile
  rect(x, K.tim, 8, 38, 16, 2); rect(x, K.woodL, 8, 38, 16, 1);
  for (const X of [9, 21]) { rect(x, K.timS, X, 40, 1, 8); rect(x, K.timS, X + 2, 40, 1, 8); }
  rect(x, '#c4c3d0', 14, 35, 5, 2); rect(x, K.timD, 18, 35, 2, 2); // saw resting on it
  for (const [X, Y] of [[28, 44], [34, 44], [40, 44], [31, 39], [37, 39], [34, 34]]) { disc(x, X, Y, 3, K.tim); disc(x, X, Y, 2, '#e0b97c'); rect(x, '#b08550', X, Y, 1, 1); }
  // posts and roof
  rect(x, K.tim, 1, 16, 3, 35); rect(x, K.timS, 3, 16, 1, 35); rect(x, K.tim, 44, 16, 3, 35); rect(x, K.timS, 46, 16, 1, 35);
  shingles(x, 0, 1, 48, 16, 4, '#a8703f', '#94603a', '#6b4226', '#c48d55');
  rect(x, '#6b4226', 0, 16, 48, 2);
  return outline(c, K.out, false);
}
function makeWatchtower() {
  const [c, x] = canvas(32, 90);
  // back legs, braces, front legs
  rect(x, K.timS, 6, 36, 2, 46); rect(x, K.timS, 24, 36, 2, 46);
  for (let k = 0; k < 2; k++) { const y0 = 42 + k * 22; for (let i = 0; i < 18; i++) { rect(x, K.timS, 7 + i, y0 + Math.round(i * 18 / 17), 1, 2); rect(x, K.timS, 24 - i, y0 + Math.round(i * 18 / 17), 1, 2); } }
  rect(x, K.tim, 2, 36, 3, 52); rect(x, K.timL, 2, 36, 1, 52); rect(x, K.tim, 27, 36, 3, 52); rect(x, K.timS, 29, 36, 1, 52);
  rect(x, K.stoneS, 1, 86, 5, 3); rect(x, K.stoneS, 26, 86, 5, 3);
  // ladder up the front
  rect(x, K.wood, 13, 37, 1, 51); rect(x, K.wood, 18, 37, 1, 51);
  for (let j = 40; j < 88; j += 5) rect(x, K.woodL, 13, j, 6, 1);
  // platform with a railing
  rect(x, K.tim, 0, 30, 32, 7); boards(x, 0, 30, 32, 4, K.wood, K.woodS, K.woodL, 2); rect(x, K.timS, 0, 34, 32, 3);
  rect(x, K.tim, 1, 20, 2, 11); rect(x, K.tim, 29, 20, 2, 11); rect(x, K.woodL, 1, 22, 30, 2); rect(x, K.woodS, 1, 23, 30, 1);
  for (let i = 5; i < 29; i += 4) rect(x, K.tim, i, 24, 1, 6);
  // roof posts, the bell, a little pointed roof with a pennant
  rect(x, K.timS, 4, 10, 2, 12); rect(x, K.timS, 26, 10, 2, 12); rect(x, K.timD, 6, 11, 20, 1);
  pix(x, 13, 12, ['..gg..', '.gYgg.', '.gYgg.', 'gYgggA', 'AAAAAA', '..A...'], { g: K.gold, Y: '#fff2a8', A: '#c08a20' });
  rect(x, '#d8c8a0', 15, 18, 1, 10);
  shingles(x, 1, 1, 30, 10, 0.75, K.roof, K.roofS, K.roofD, K.roofL); rect(x, K.roofD, 1, 10, 30, 1);
  rect(x, K.timD, 15, 0, 1, 2);
  return outline(c, K.out, false);
}
function makeLampPost(lit) {
  const [c, x] = canvas(16, 42);
  rect(x, K.timS, 7, 13, 2, 26); rect(x, K.tim, 7, 13, 1, 26); rect(x, K.timD, 5, 37, 6, 3); rect(x, K.tim, 6, 37, 4, 1);
  rect(x, K.timS, 6, 14, 4, 1);
  rect(x, '#3e3a48', 4, 3, 8, 2); rect(x, '#3e3a48', 6, 1, 4, 2); rect(x, '#5a5668', 7, 1, 2, 1);
  rect(x, '#3e3a48', 4, 5, 8, 8); rect(x, '#3e3a48', 5, 12, 6, 2);
  rect(x, lit ? '#ffd36a' : '#4e5a6e', 5, 5, 6, 7); rect(x, lit ? '#fff6c8' : '#6e7a8e', 6, 6, 2, 3);
  if (lit) { rect(x, '#fff2a8', 7, 8, 2, 3); rect(x, '#f5a742', 5, 11, 6, 1); }
  rect(x, '#3e3a48', 7, 5, 2, 7);
  if (lit) rect(x, '#fff2a8', 7, 7, 2, 3);
  return outline(c, '#241c22', false);
}
function makeTreadmill(f) {
  const [c, x] = canvas(32, 44);
  // support frame behind, the wheel, then the front legs
  rect(x, K.timS, 3, 24, 3, 18); rect(x, K.timS, 26, 24, 3, 18);
  const cx = 16, cy = 20, r = 14;
  disc(x, cx, cy, r, K.tim); disc(x, cx, cy, r - 2, '#4a2a1a'); disc(x, cx, cy, r - 3, '#5a3a24');
  for (let k = 0; k < 8; k++) { // rungs on the rim
    const a = (k / 8) * TAU + (f ? TAU / 16 : 0);
    rect(x, K.woodL, Math.round(cx + Math.cos(a) * (r - 1)), Math.round(cy + Math.sin(a) * (r - 1)), 1, 1);
  }
  for (let k = 0; k < 4; k++) { // spokes
    const a = (k / 4) * TAU + (f ? TAU / 8 : 0);
    for (let t = 2; t < r - 2; t++) rect(x, K.timL, Math.round(cx + Math.cos(a) * t), Math.round(cy + Math.sin(a) * t), 1, 1);
  }
  disc(x, cx, cy, 2, K.timD); rect(x, '#8a8898', cx, cy, 1, 1);
  rect(x, K.timL, 1, 30, 30, 2); rect(x, K.tim, 1, 31, 30, 1); // axle beam
  rect(x, K.tim, 1, 30, 3, 13); rect(x, K.tim, 28, 30, 3, 13); rect(x, K.timS, 3, 30, 1, 13); rect(x, K.timS, 30, 30, 1, 13);
  rect(x, K.timD, 0, 41, 32, 2);
  // the bit the sheep stand on
  rect(x, K.woodL, 6, 33, 20, 1);
  return outline(c, K.out, false);
}
function makeChoirStage() {
  const [c, x] = canvas(48, 46);
  // banner on two poles, with a music note
  rect(x, K.timS, 4, 2, 2, 26); rect(x, K.timS, 42, 2, 2, 26); rect(x, K.gold, 4, 1, 2, 2); rect(x, K.gold, 42, 1, 2, 2);
  rect(x, '#6b4380', 7, 4, 34, 12); rect(x, '#9068a8', 7, 4, 34, 2); rect(x, '#4a2c5c', 7, 15, 34, 1);
  for (let i = 7; i < 41; i += 4) rect(x, '#4a2c5c', i + 2, 16, 2, 1);
  pix(x, 18, 5, ['....gg..gg', '....gGggGg', '....g...g.', '....g...g.', '..ggg.ggg.', '.gggg.ggg.', '..gg...g..'], { g: K.gold, G: '#fff2a8' });
  // bunting along the front of the stage
  // stage: deck seen from above, then the front face
  boards(x, 1, 24, 46, 12, K.wood, K.woodS, K.woodL, 3);
  rect(x, K.tim, 1, 36, 46, 8); for (let i = 3; i < 47; i += 6) rect(x, K.timS, i, 36, 1, 8); rect(x, K.timS, 1, 43, 46, 1);
  for (let i = 1; i < 47; i += 5) { const col = [K.red, K.gold, '#3f8f93', '#ef9aa0'][(i / 5 | 0) % 4]; rect(x, col, i, 36, 4, 1); rect(x, col, i + 1, 37, 2, 1); rect(x, col, i + 1, 38, 1, 1); }
  rect(x, K.woodL, 20, 42, 8, 2); rect(x, K.woodS, 20, 43, 8, 1); // step
  // three little hymn stands
  for (const X of [10, 23, 36]) { rect(x, K.timD, X, 27, 1, 5); rect(x, '#fdf8ee', X - 2, 25, 5, 3); rect(x, '#c7b6a5', X, 25, 1, 3); }
  return outline(c, K.out, false);
}
function makeFeastTable() {
  const [c, x] = canvas(96, 30);
  // back bench, table, front bench
  rect(x, K.tim, 3, 2, 90, 3); rect(x, K.timL, 3, 2, 90, 1);
  rect(x, K.timS, 3, 10, 90, 12); rect(x, K.wood, 2, 7, 92, 10); rect(x, K.woodL, 2, 7, 92, 1);
  for (let i = 12; i < 92; i += 15) rect(x, K.woodS, i, 8, 1, 9);
  rect(x, K.cream, 2, 9, 92, 6); rect(x, '#ffffff', 2, 9, 92, 1); rect(x, '#d8c8a8', 2, 14, 92, 1);
  for (let i = 4; i < 92; i += 4) rect(x, '#e8d8b8', i, 15, 2, 2); // fringe
  rect(x, K.timS, 6, 17, 3, 8); rect(x, K.timS, 87, 17, 3, 8); rect(x, K.timS, 46, 17, 3, 8);
  rect(x, K.tim, 3, 24, 90, 3); rect(x, K.timL, 3, 24, 90, 1); rect(x, K.timS, 6, 27, 2, 2); rect(x, K.timS, 88, 27, 2, 2);
  // the food
  const bread = X => { oval(x, X, 10, 4, 2, '#a8682e'); oval(x, X, 9, 3, 1, '#d8984a'); rect(x, '#f2c27a', X - 2, 8, 1, 1); rect(x, '#8a5020', X - 1, 9, 1, 1); rect(x, '#8a5020', X + 1, 9, 1, 1); };
  const fish = X => { oval(x, X, 11, 5, 1, '#ffffff'); rect(x, '#8eb0c8', X - 3, 10, 6, 2); rect(x, '#c8dce8', X - 2, 10, 4, 1); rect(x, '#5a7a96', X + 3, 9, 2, 1); rect(x, '#5a7a96', X + 3, 12, 2, 1); rect(x, '#2a2026', X - 2, 10, 1, 1); };
  const grapes = X => { for (const [dx, dy] of [[0, 0], [2, 0], [4, 0], [1, 1], [3, 1], [2, 2]]) { rect(x, '#7a3a8a', X + dx, 8 + dy, 2, 2); rect(x, '#b070c0', X + dx, 8 + dy, 1, 1); } rect(x, '#5aa846', X + 3, 7, 2, 1); };
  const cup = X => { rect(x, '#c07a3e', X, 8, 3, 3); rect(x, '#8a2a3a', X, 8, 3, 1); rect(x, '#7a4a24', X + 1, 11, 1, 1); rect(x, '#e0a060', X, 9, 1, 2); };
  bread(9); fish(20); cup(28); grapes(34); bread(44); cup(51); fish(59); grapes(67); cup(75); bread(83); cup(89);
  rect(x, '#c0703a', 40, 4, 4, 6); rect(x, '#e0a060', 40, 5, 1, 4); rect(x, '#8a4a24', 40, 4, 4, 1); // jug
  return outline(c, K.out, false);
}
function makeOlivePress() {
  const [c, x] = canvas(32, 38);
  // basin
  oval(x, 16, 26, 15, 7, K.stoneS); oval(x, 16, 25, 14, 6, K.stone); oval(x, 16, 24, 11, 4, K.stoneD); oval(x, 16, 25, 9, 2, '#8a8a3a');
  rect(x, '#b8b850', 12, 25, 4, 1);
  stones(x, 1, 27, 30, 8); rect(x, K.stoneD, 1, 34, 30, 1);
  // the millstone on edge, and the beam through it
  oval(x, 16, 16, 6, 10, K.stoneD); oval(x, 16, 16, 5, 9, K.stone); oval(x, 15, 14, 3, 6, K.stoneL);
  rect(x, K.stoneS, 15, 16, 2, 2);
  rect(x, K.tim, 0, 15, 32, 3); rect(x, K.timL, 0, 15, 32, 1); rect(x, K.timS, 0, 17, 32, 1);
  rect(x, K.timD, 15, 3, 2, 14);
  // a jar catching the oil
  pix(x, 25, 28, ['.ddd.', '..o..', '.oLoo', 'oLooO', 'oLooO', '.oOO.'], { d: '#8a4a24', o: '#c0703a', O: '#9a5428', L: '#e0a060' });
  rect(x, '#d8c040', 26, 28, 3, 1);
  return outline(c, '#2a2430', false);
}
function makeBridge() {
  const [c, x] = canvas(96, 48);
  // planks across, seen from above (travel runs left–right)
  for (let i = 0; i < 96; i += 4) {
    const k = (i / 4) % 3, base = ['#b8824a', '#a8743f', '#c08c52'][k];
    rect(x, base, i, 5, 4, 38); rect(x, '#7a4a24', i + 3, 5, 1, 38); rect(x, '#d8a468', i, 5, 1, 38);
    rect(x, '#5a3418', i + 1, 8, 1, 1); rect(x, '#5a3418', i + 1, 39, 1, 1);
    if ((i * 7) % 11 < 3) rect(x, '#8a5a33', i + 1, 16 + (i % 9), 1, 3); // knots
  }
  // rope-bound rails and posts
  for (const Y of [1, 42]) { rect(x, K.tim, 0, Y, 96, 5); rect(x, K.timL, 0, Y, 96, 1); rect(x, K.timS, 0, Y + 4, 96, 1); }
  for (let i = 2; i < 96; i += 18) for (const Y of [0, 41]) { rect(x, K.timS, i, Y, 5, 7); rect(x, K.timL, i + 1, Y + 1, 3, 1); rect(x, '#d8c8a0', i, Y + 3, 5, 1); }
  return outline(c, K.out, false);
}
function makeSignpost() {
  const [c, x] = canvas(18, 28);
  rect(x, K.tim, 8, 3, 2, 24); rect(x, K.timS, 9, 3, 1, 24); rect(x, K.timS, 6, 25, 6, 2);
  pix(x, 1, 3, ['wwwwwwwwwwwww.', 'wLLLLLLLLLLLLw', 'wwwwwwwwwwwww.'], { w: K.wood, L: K.woodL });
  pix(x, 3, 9, ['.wwwwwwwwwwwww', 'wLLLLLLLLLLLLw', '.wwwwwwwwwwwww'], { w: K.woodS, L: K.wood });
  for (const [X, Y] of [[3, 4], [6, 4], [9, 4], [5, 10], [8, 10], [11, 10]]) rect(x, K.timD, X, Y, 2, 1);
  return outline(c, K.out, false);
}
function makeGateBell() {
  const [c, x] = canvas(16, 32);
  rect(x, K.tim, 3, 3, 2, 28); rect(x, K.timS, 4, 3, 1, 28); rect(x, K.timS, 1, 29, 6, 2);
  rect(x, K.tim, 3, 3, 10, 2); rect(x, K.timL, 3, 3, 10, 1); rect(x, K.timS, 5, 5, 2, 1); rect(x, K.timS, 6, 6, 1, 1);
  pix(x, 8, 5, ['.gg.', 'gYgg', 'gYgg', 'gggA', 'AAAA'], { g: K.gold, Y: '#fff2a8', A: '#c08a20' });
  rect(x, '#8a6a30', 10, 10, 1, 1); rect(x, '#d8c8a0', 10, 11, 1, 9); rect(x, K.red, 9, 20, 3, 2);
  return outline(c, K.out, false);
}
function makeSycamore() {
  const [c, x] = canvas(76, 96);
  // trunk: pale, patchy sycamore bark; roots
  for (let y = 44; y < 93; y++) { const fl = y > 84 ? Math.round((y - 84) * 0.9) : 0; rect(x, '#9a9078', 31 - fl, y, 15 + fl * 2, 1); rect(x, '#7a705e', 31 - fl, y, 3, 1); }
  for (const [X, Y, w, h, col] of [[36, 52, 4, 5, '#d8d0bc'], [33, 62, 5, 4, '#c8c2a8'], [39, 70, 4, 6, '#e0dac8'], [34, 80, 5, 3, '#d8d0bc'],
    [41, 58, 3, 3, '#b0b890'], [35, 72, 2, 3, '#a8a888'], [40, 84, 4, 3, '#c8c2a8'], [37, 46, 3, 3, '#e0dac8'], [32, 88, 4, 2, '#b0b890']]) rect(x, col, X, Y, w, h);
  for (const [X, Y, w, h] of [[38, 49, 2, 2], [36, 77, 2, 3], [42, 65, 2, 2], [33, 56, 2, 2]]) rect(x, '#6a604e', X, Y, w, h);
  rect(x, '#7a705e', 22, 92, 32, 1); rect(x, '#9a9078', 25, 91, 6, 1); rect(x, '#9a9078', 45, 91, 6, 1);
  // canopy behind the big branch
  blob(x, [[38, 26, 24], [16, 36, 13], [60, 36, 13], [38, 14, 13], [22, 19, 12], [56, 19, 12]], '#3f7a34');
  blob(x, [[36, 22, 20], [18, 32, 9], [58, 32, 10], [36, 12, 10], [24, 16, 9], [54, 17, 9]], '#56983f');
  blob(x, [[30, 15, 10], [16, 28, 5], [50, 13, 6], [40, 9, 4], [62, 28, 4]], '#74b54d');
  blob(x, [[27, 11, 3], [44, 8, 2], [14, 25, 2], [52, 11, 2]], '#9bd16a');
  // the nook: an opening in the leaves with a broad branch to sit on
  oval(x, 22, 41, 11, 6, '#2e5a28'); oval(x, 22, 42, 9, 4, '#34662c');
  for (let i = 0; i < 26; i++) { const t = i / 25; rect(x, '#9a9078', Math.round(10 + t * 24), Math.round(46 - t * 2), 2, 4); }
  rect(x, '#d8d0bc', 12, 45, 20, 1); rect(x, '#7a705e', 10, 49, 24, 1); rect(x, '#c8c2a8', 18, 46, 4, 2);
  for (let i = 0; i < 14; i++) rect(x, '#9a9078', 44 + i, 44 - Math.round(i * 0.6), 2, 3); // a branch to the right
  for (let i = 0; i < 20; i++) { const a = rand(0, TAU), d = rand(4, 22); rect(x, '#35692d', Math.round(38 + Math.cos(a) * d), Math.round(30 + Math.abs(Math.sin(a)) * d * 0.5), 2, 1); }
  // broad leaves at the rim
  for (const [X, Y] of [[4, 36], [70, 34], [14, 10], [62, 12], [38, 1], [8, 44], [66, 44]]) { rect(x, '#56983f', X, Y, 3, 2); rect(x, '#74b54d', X, Y, 1, 1); }
  return outline(c, '#22381f', false);
}
function makeThornBush() {
  const [c, x] = canvas(26, 20);
  blob(x, [[8, 12, 7], [17, 12, 7], [12, 8, 6]], '#5a3442');
  blob(x, [[9, 10, 4], [16, 10, 4], [12, 7, 3]], '#7a4652');
  blob(x, [[10, 7, 2], [15, 8, 1]], '#9a6066');
  for (const [X, Y] of [[3, 9], [5, 5], [20, 6], [23, 11], [12, 2], [8, 16], [18, 17], [2, 14], [22, 15], [15, 3]]) { rect(x, '#e0c8a8', X, Y, 1, 1); rect(x, '#6a3a46', X + (X < 12 ? 1 : -1), Y + 1, 1, 1); }
  for (const [X, Y] of [[7, 9], [14, 13], [18, 9], [10, 14]]) { rect(x, '#3e2230', X, Y, 2, 1); rect(x, '#e0c8a8', X + 1, Y - 1, 1, 1); }
  rect(x, '#d8574f', 11, 11, 1, 1); rect(x, '#d8574f', 17, 14, 1, 1);
  rect(x, '#3e2230', 4, 18, 18, 1);
  return outline(c, '#2a1620', false);
}
function makeThornWall() {
  const [c, x] = canvas(32, 28);
  blob(x, [[5, 18, 6], [14, 16, 8], [24, 18, 7], [9, 10, 6], [21, 10, 6], [15, 7, 5]], '#4e2c3a');
  blob(x, [[6, 15, 3], [14, 12, 5], [24, 15, 4], [10, 8, 3], [21, 8, 3]], '#6e3e4c');
  blob(x, [[13, 9, 2], [22, 7, 1], [8, 13, 1]], '#9a6066');
  // tangled stems
  for (const [x0, y0, x1, y1] of [[1, 22, 12, 12], [8, 24, 22, 8], [18, 25, 30, 12], [4, 12, 16, 20], [20, 6, 30, 20]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) { const X = Math.round(x0 + (x1 - x0) * k / n), Y = Math.round(y0 + (y1 - y0) * k / n); rect(x, '#3a1e2a', X, Y, 1, 1); if (k % 3 === 1) rect(x, '#e0c8a8', X, Y - 1, 1, 1); }
  }
  for (const [X, Y] of [[0, 16], [31, 15], [4, 6], [27, 7], [15, 1], [10, 3]]) rect(x, '#e0c8a8', X, Y, 1, 1);
  rect(x, '#3a1e2a', 1, 26, 30, 1);
  return outline(c, '#22121a', false);
}
function makeBoulder(big) {
  const [c, x] = big ? canvas(30, 24) : canvas(20, 16);
  const w = c.width, h = c.height;
  oval(x, w / 2, h / 2 + 1, w / 2 - 1, h / 2 - 1, '#76748a');
  oval(x, w / 2 - 1, h / 2, w / 2 - 2, h / 2 - 2, '#9a98a8');
  oval(x, w / 2 - 3, h / 2 - 2, w / 4, h / 4, '#b9b7c6');
  rect(x, '#d4d2de', Math.round(w / 2 - 5), Math.round(h / 2 - 4), 3, 1);
  rect(x, '#5d5b6e', Math.round(w / 2 + 2), Math.round(h / 2 - 2), 1, 4); rect(x, '#5d5b6e', Math.round(w / 2 + 3), Math.round(h / 2 + 2), 1, 2);
  if (big) { rect(x, '#5d5b6e', 8, 15, 5, 1); rect(x, '#7cc256', 4, 17, 4, 2); rect(x, '#56983f', 4, 19, 5, 1); }
  rect(x, '#5d5b6e', 2, h - 2, w - 4, 1);
  return outline(c, '#2e2a3a', false);
}
function makeDeadTree() {
  const [c, x] = canvas(34, 46);
  const br = (x0, y0, x1, y1, w) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) rect(x, '#7a6a5a', Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), w, w); };
  rect(x, '#7a6a5a', 15, 18, 4, 26); rect(x, '#5a4c40', 15, 18, 1, 26); rect(x, '#9a8a78', 17, 22, 1, 16);
  rect(x, '#5a4c40', 12, 42, 10, 2);
  br(16, 22, 6, 10, 2); br(7, 11, 3, 4, 1); br(7, 11, 10, 3, 1); br(17, 18, 18, 3, 2); br(18, 6, 22, 1, 1);
  br(18, 20, 29, 12, 2); br(28, 13, 32, 8, 1); br(27, 13, 26, 6, 1); br(16, 30, 9, 26, 1);
  rect(x, '#9a8a78', 7, 9, 1, 2); rect(x, '#9a8a78', 20, 16, 2, 1);
  return outline(c, '#2e2420', false);
}
function makeOliveTree() {
  const [c, x] = canvas(40, 44);
  // gnarled, twisting trunk
  for (let y = 22; y < 42; y++) { const off = Math.round(Math.sin(y * 0.35) * 2); rect(x, '#7a6a52', 17 + off, y, 6, 1); rect(x, '#5a4c3a', 17 + off, y, 2, 1); rect(x, '#9a8a6e', 21 + off, y, 1, 1); }
  rect(x, '#5a4c3a', 18, 28, 2, 3); rect(x, '#5a4c3a', 13, 40, 14, 2);
  rect(x, '#7a6a52', 11, 22, 7, 2); rect(x, '#7a6a52', 23, 20, 7, 2);
  // silvery foliage in clumps
  blob(x, [[10, 16, 8], [29, 15, 9], [20, 9, 9], [19, 19, 7]], '#6e8a6a');
  blob(x, [[9, 14, 6], [28, 13, 7], [19, 8, 7], [17, 17, 4]], '#8ea886');
  blob(x, [[7, 12, 3], [25, 10, 4], [16, 5, 4]], '#b6c8a8');
  for (let i = 0; i < 26; i++) { const a = rand(0, TAU), d = rand(2, 14); rect(x, pick(['#d8e4cc', '#5a7458', '#b6c8a8']), Math.round(20 + Math.cos(a) * d), Math.round(13 + Math.sin(a) * d * 0.6), 2, 1); }
  for (const [X, Y] of [[12, 18], [26, 17], [21, 12], [31, 11], [8, 10]]) { rect(x, '#3e3a4a', X, Y, 1, 2); rect(x, '#6a6478', X, Y, 1, 1); } // olives
  return outline(c, '#2a3424', false);
}
function makeTent() {
  const [c, x] = canvas(44, 34);
  const cv = '#e6dacb', cvS = '#c7b6a5', cvL = '#fdf8ee';
  // A-frame seen from the front-ish: two slopes, an open dark door
  for (let j = 0; j < 26; j++) {
    const half = Math.round(4 + j * 0.75), y = 4 + j;
    rect(x, cvS, 22 - half, y, half, 1); rect(x, cv, 22, y, half, 1); rect(x, cvL, 22, y, Math.max(1, half >> 2), 1);
  }
  for (let j = 8; j < 26; j++) { const hw = Math.round((j - 8) * 0.33); rect(x, '#3a2a24', 22 - hw, 4 + j, hw * 2 + 1, 1); }
  rect(x, cvS, 18, 25, 2, 5); rect(x, cv, 24, 24, 3, 6); // flaps tied back
  // patches, stitched
  for (const [X, Y, w, h, col] of [[8, 22, 5, 4, '#6a8fe0'], [30, 14, 5, 5, '#d8574f'], [12, 12, 4, 3, '#7cc256'], [33, 24, 4, 3, '#f5c542']]) {
    rect(x, col, X, Y, w, h); for (let i = X; i < X + w; i += 2) { rect(x, '#4e3d3f', i, Y - 1, 1, 1); rect(x, '#4e3d3f', i, Y + h, 1, 1); }
  }
  rect(x, K.timS, 21, 0, 2, 6); rect(x, K.red, 23, 0, 4, 2); // pole and a scrap of pennant
  rect(x, '#d8c8a0', 2, 29, 4, 1); rect(x, '#d8c8a0', 38, 29, 4, 1); rect(x, K.timD, 1, 29, 1, 3); rect(x, K.timD, 42, 29, 1, 3);
  rect(x, '#8a7a62', 6, 30, 32, 1);
  return outline(c, '#3a2a24', false);
}
function makeCart() {
  const [c, x] = canvas(40, 30);
  // shafts, bed full of hay, two wheels
  rect(x, K.tim, 30, 17, 10, 2); rect(x, K.timL, 30, 17, 10, 1); rect(x, K.tim, 30, 22, 9, 2);
  hayHeap(x, 3, 0, 28, 14);
  rect(x, K.wood, 2, 11, 30, 10); boards(x, 2, 11, 30, 10, K.wood, K.woodS, K.woodL, 4);
  rect(x, K.tim, 2, 11, 2, 10); rect(x, K.tim, 30, 11, 2, 10); rect(x, K.timS, 2, 20, 30, 1);
  for (const X of [9, 25]) {
    disc(x, X, 22, 6, K.timS); disc(x, X, 22, 4, '#3e2416'); disc(x, X, 22, 4, K.tim); disc(x, X, 22, 3, '#4a2a1a');
    for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; for (let t = 1; t < 4; t++) rect(x, K.timL, Math.round(X + Math.cos(a) * t), Math.round(22 + Math.sin(a) * t), 1, 1); }
    rect(x, '#8a8898', X, 22, 1, 1);
  }
  return outline(c, K.out, false);
}
function makeTollBooth() {
  const [c, x] = canvas(48, 52);
  // the booth
  planks(x, 4, 22, 26, 28, '#8e3a8a', '#642a66', '#b864b0', 5);
  rect(x, K.gold, 4, 22, 26, 1); rect(x, K.gold, 4, 49, 26, 1);
  rect(x, '#3a1e3a', 8, 27, 18, 9); rect(x, K.tim, 6, 36, 22, 3); rect(x, K.timL, 6, 36, 22, 1); // window and counter
  for (const [X, h] of [[10, 3], [13, 5], [16, 2], [22, 4]]) { rect(x, K.gold, X, 36 - h, 2, h); rect(x, '#fff2a8', X, 36 - h, 1, 1); } // coin stacks
  shingles(x, 1, 8, 32, 15, 1.8, '#8e3a8a', '#7a2e78', '#4a1e4a', '#b864b0'); rect(x, K.gold, 1, 22, 32, 1);
  rect(x, K.gold, 16, 5, 2, 4); disc(x, 17, 4, 2, K.gold); rect(x, '#fff2a8', 16, 3, 1, 1);
  // the sign on its post
  rect(x, K.tim, 39, 18, 2, 32); rect(x, K.timS, 40, 18, 1, 32);
  rect(x, K.cream, 31, 8, 17, 11); rect(x, '#d8c8a0', 31, 18, 17, 1); rect(x, K.timS, 31, 8, 17, 1);
  NN.ptext(x, 'TOLL', 40, 10, '#d8574f', null);
  // striped barrier arm
  for (let i = 0; i < 16; i++) rect(x, Math.floor(i / 3) % 2 ? '#ffffff' : '#d8574f', 30 + i, 40, 1, 2);
  rect(x, K.timD, 30, 39, 2, 11);
  return outline(c, '#26161e', false);
}
function makeBramBarn() {
  const [c, x] = canvas(64, 76);
  planks(x, 3, 32, 58, 42, '#6a6a72', '#55555e', '#7e7e88', 5);
  for (const [X, Y] of [[10, 40], [50, 60], [24, 36], [44, 44]]) rect(x, '#4a4a52', X, Y, 3, 1); // weathered boards
  rect(x, '#4a4a52', 3, 72, 58, 3);
  // doors: shut tight, chained and padlocked
  rect(x, '#3e3e46', 16, 46, 32, 27); rect(x, '#55555e', 17, 47, 14, 26); rect(x, '#55555e', 33, 47, 14, 26);
  for (let k = 0; k < 14; k++) { rect(x, '#4a4a52', 17 + k, 47 + Math.round(k * 25 / 13), 1, 1); rect(x, '#4a4a52', 46 - k, 47 + Math.round(k * 25 / 13), 1, 1); }
  for (let i = 18; i < 46; i += 2) rect(x, '#9a98a8', i, 58 + (i % 4 === 0 ? 0 : 1), 1, 1); // chain
  pix(x, 30, 57, ['.III.', 'I...I', 'ggggg', 'gGkgg', 'ggkgg', 'AAAAA'], { I: '#9a98a8', g: '#c0a040', G: '#f0d870', k: '#3a2a14', A: '#8a6a20' });
  rect(x, '#2a2a30', 26, 34, 12, 9); rect(x, '#3e3e46', 27, 35, 10, 7); rect(x, '#2a2a30', 31, 35, 2, 7); rect(x, '#2a2a30', 27, 38, 10, 1); // boarded loft
  // dark roof, a broken shingle or two
  shingles(x, 0, 4, 64, 29, 2.6, '#46424e', '#3e3a46', '#2a2630', '#5a5664');
  rect(x, '#2a2630', 0, 32, 64, 1); rect(x, '#1e1a22', 40, 14, 4, 2); rect(x, '#1e1a22', 18, 22, 3, 2);
  return outline(c, '#151216', false);
}
function makeBranchPile() {
  const [c, x] = canvas(16, 10);
  for (const [x0, y0, x1, y1, col] of [[1, 8, 14, 5, K.tim], [2, 4, 13, 8, K.timL], [4, 6, 15, 7, K.timS], [1, 6, 9, 3, K.tim]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) rect(x, col, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 2);
  }
  rect(x, '#e0b97c', 14, 5, 1, 2); rect(x, '#5aa846', 4, 2, 2, 1); rect(x, '#5aa846', 12, 3, 1, 1);
  return outline(c, K.out);
}
function makeRockPile() {
  const [c, x] = canvas(16, 11);
  for (const [X, Y, r] of [[4, 7, 3], [11, 7, 3], [8, 4, 3]]) { disc(x, X, Y, r, '#76748a'); disc(x, X - 1, Y - 1, r - 1, '#9a98a8'); rect(x, '#b9b7c6', X - 2, Y - 2, 2, 1); }
  rect(x, '#5d5b6e', 2, 10, 12, 1);
  return outline(c, '#2e2a3a');
}
function makeHerbPlant() {
  const [c, x] = canvas(12, 12);
  for (const [x0, y0, x1, y1] of [[6, 11, 6, 3], [6, 9, 2, 5], [6, 8, 10, 4], [6, 10, 3, 8], [6, 10, 9, 7]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) rect(x, '#3d7a2e', Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 1);
  }
  for (const [X, Y] of [[5, 2], [1, 4], [9, 3], [2, 7], [9, 6], [6, 5]]) { rect(x, '#5aa846', X, Y, 2, 2); rect(x, '#9bd16a', X, Y, 1, 1); }
  rect(x, '#ffffff', 6, 1, 1, 1); rect(x, '#f5c542', 7, 1, 1, 1); rect(x, '#a070c8', 1, 3, 1, 1); rect(x, '#a070c8', 10, 2, 1, 1);
  return outline(c, '#22381f');
}
function makeOilJar() {
  const [c, x] = canvas(9, 12);
  pix(x, 0, 0, [
    '..ddd....', '...L.....', '..oLoo...', '.oLooOo..', 'oLoooooOo', 'oLooooOOo', 'oLyyyyyOo', 'oLoooooOo', '.oLooOOo.', '..oOOOo..', '...ddd...', '.........',
  ], { d: '#8a4a24', o: '#c0703a', O: '#9a5428', L: '#e0a060', y: '#e8d870' });
  rect(x, '#d8c040', 3, 0, 3, 1);
  return outline(c, '#3e2416');
}
function makeReeds() {
  const [c, x] = canvas(12, 18);
  for (const [X, top, lean] of [[2, 6, -1], [4, 2, 0], [6, 4, 1], [8, 1, 0], [10, 7, 1], [5, 8, -1]]) {
    for (let y = top; y < 17; y++) rect(x, y < top + 3 ? '#9bd16a' : y > 12 ? '#3d7a2e' : '#5aa846', X + Math.round(lean * (17 - y) / 10), y, 1, 1);
  }
  return outline(c, '#22381f');
}
function makeCattail() {
  const [c, x] = canvas(11, 20);
  for (const [X, top] of [[3, 3], [7, 1]]) { rect(x, '#5aa846', X, top + 4, 1, 15 - top); rect(x, '#9bd16a', X, top, 1, 1); rect(x, '#7a4a24', X - 1 + 1, top + 1, 2, 5); rect(x, '#a0663a', X, top + 1, 1, 3); }
  for (const [x0, y0, x1, y1] of [[5, 19, 1, 9], [5, 19, 9, 10], [5, 19, 5, 11]]) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) rect(x, k > n * 0.6 ? '#7cc256' : '#3d7a2e', Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 1);
  }
  return outline(c, '#22381f');
}
function makeMushrooms() {
  const [c, x] = canvas(11, 8);
  pix(x, 0, 0, ['..rrr......', '.rwrrr.....', 'rrrrwrr.rr.', '..sss..rwrr', '..sSs...s..', '..sss..sSs.', '.......sss.', '...........'],
    { r: '#d8574f', w: '#ffffff', s: '#f1e4c6', S: '#c8b898' });
  return outline(c, '#4a2420');
}
function makeLily() {
  const [c, x] = canvas(13, 8);
  oval(x, 6, 4, 6, 3, '#3d7a2e'); oval(x, 6, 3, 5, 2, '#5aa846'); rect(x, '#2f7ab0', 6, 4, 3, 1); rect(x, '#9bd16a', 3, 2, 2, 1);
  pix(x, 4, 0, ['.p.p.', 'ppyp.', '.ppp.'], { p: '#f6b3c8', y: '#f5dd8a' });
  return outline(c, '#1e3a2a');
}

Object.assign(NN.PROPS, {
  feeder: { make: () => makeFeeder(true), ox: 16, oy: 26 },
  feederEmpty: { make: () => makeFeeder(false), ox: 16, oy: 26 },
  troughEmpty: { make: makeTroughEmpty, ox: 15, oy: 12 },
  lean: { make: makeLean, ox: 32, oy: 52 },
  well: { make: makeWell, ox: 16, oy: 54 },
  hayBarn: { make: makeHayBarn, ox: 32, oy: 84 },
  infirmary: { make: makeInfirmary, ox: 32, oy: 78 },
  herbGarden: { make: makeHerbGarden, ox: 24, oy: 36 },
  loom: { make: makeLoom, ox: 16, oy: 46 },
  workshop: { make: makeWorkshop, ox: 24, oy: 52 },
  watchtower: { make: makeWatchtower, ox: 16, oy: 90 },
  lampPost: { make: () => makeLampPost(false), ox: 8, oy: 42 },
  lampPostLit: { make: () => makeLampPost(true), ox: 8, oy: 42 },
  treadmill0: { make: () => makeTreadmill(0), ox: 16, oy: 44 },
  treadmill1: { make: () => makeTreadmill(1), ox: 16, oy: 44 },
  choirStage: { make: makeChoirStage, ox: 24, oy: 46 },
  feastTable: { make: makeFeastTable, ox: 48, oy: 30 },
  olivePress: { make: makeOlivePress, ox: 16, oy: 38 },
  bridge: { make: makeBridge, ox: 48, oy: 48 },
  signpost: { make: makeSignpost, ox: 9, oy: 28 },
  gateBell: { make: makeGateBell, ox: 4, oy: 32 },
  sycamore: { make: makeSycamore, ox: 38, oy: 93 },
  thornBush: { make: makeThornBush, ox: 13, oy: 19 },
  thornWall: { make: makeThornWall, ox: 16, oy: 28 },
  boulder: { make: () => makeBoulder(false), ox: 10, oy: 15 },
  boulder2: { make: () => makeBoulder(true), ox: 15, oy: 23 },
  deadTree: { make: makeDeadTree, ox: 17, oy: 44 },
  oliveTree: { make: makeOliveTree, ox: 20, oy: 42 },
  tent: { make: makeTent, ox: 22, oy: 31 },
  cart: { make: makeCart, ox: 18, oy: 29 },
  tollBooth: { make: makeTollBooth, ox: 24, oy: 51 },
  bramBarn: { make: makeBramBarn, ox: 32, oy: 76 },
  branchPile: { make: makeBranchPile, ox: 9, oy: 11 },
  rockPile: { make: makeRockPile, ox: 9, oy: 12 },
  herbPlant: { make: makeHerbPlant, ox: 7, oy: 13 },
  oilJar: { make: makeOilJar, ox: 5, oy: 12 },
  reeds: { make: makeReeds, ox: 7, oy: 18 },
  cattail: { make: makeCattail, ox: 6, oy: 21 },
  mushrooms: { make: makeMushrooms, ox: 6, oy: 8 },
  lily: { make: makeLily, ox: 7, oy: 7 },
});

// ---------------------------------------------------------------- item icons (9×9, outlined)
const ICON = (rows, pal, out = '#3e2416') => () => { const c = mk(7, 7); pix(c.getContext('2d'), 0, 0, rows, pal); return outline(c, out); };
NN.ICONS = NN.ICONS || {};
Object.assign(NN.ICONS, {
  timber: ICON(['.......', '3333344', '2222454', '1111144', '3333344', '2222454', '1111144'],
    { 1: '#6b4226', 2: '#8a5a33', 3: '#b07a45', 4: '#e0b97c', 5: '#a8703f' }),
  stone: ICON(['.......', '..332..', '.33222.', '3322224', '3222244', '2224444', '.44444.'],
    { 2: '#9a98a8', 3: '#c8c6d4', 4: '#76748a' }, '#2e2a3a'),
  hay: ICON(['.y.y.y.', 'yhyhhyh', 'hhhhhhh', 'hBhhhBh', 'hBhhhBh', 'hhhhhhh', 'AAAAAAA'],
    { y: '#f5dd8a', h: '#e3c35a', A: '#c9a03e', B: '#8a5a33' }, '#5a3a14'),
  water: ICON(['...1...', '..111..', '.12111.', '1211113', '1121113', '.11113.', '..333..'],
    { 1: '#4aa3d8', 2: '#d8f0fa', 3: '#2f7ab0' }, '#1e3a5a'),
  wool: ICON(['.ww.ww.', 'wwywwww', 'wywwwwW', 'wwwwwWW', 'WwwwwWW', 'VWWWWWV', '.VV.VV.'],
    { w: '#fdf8ee', y: '#ffffff', W: '#e6dacb', V: '#c7b6a5' }, '#4e3d3f'),
  herbs: ICON(['.l...l.', 'lLl.lLl', '.lLlLl.', '..lLl..', 'f..g..f', '.f.g.f.', '..ggg..'],
    { l: '#5aa846', L: '#9bd16a', g: '#3d7a2e', f: '#a070c8' }, '#22381f'),
  oil: ICON(['..ddd..', '...o...', '..oLo..', '.oLyoO.', '.oLyoO.', '.ooooO.', '..OOO..'],
    { d: '#8a4a24', o: '#c0703a', O: '#9a5428', L: '#e0a060', y: '#f0e070' }),
  blanket: ICON(['ccyccyc', 'ccyccyc', 'yyyyyyy', 'ccyccyc', 'CCyCCyC', 'y.y.y.y', '.......'],
    { c: '#3f8f93', C: '#2b676b', y: '#f1e4c6' }, '#1e3a3e'),
  bread: ICON(['.......', '..bbbb.', '.bLbLbb', 'bLbLbLb', 'bbbbbbB', '.BBBBB.', '.......'],
    { b: '#c8843e', L: '#f2c27a', B: '#8a5020' }),
  heart: ICON(['.rr.rr.', 'ryrrrrr', 'rrrrrrr', 'rrrrrrq', '.rrrrq.', '..rrq..', '...q...'],
    { r: '#d8574f', y: '#ffffff', q: '#a83a34' }, '#5a2430'),
});

// ---------------------------------------------------------------- idle poses: grazing, sleeping, lying down; birds
// Pose frames use the same palette chars and hidden tags as their base sprite, so every swap works on them too.
Object.assign(NN.PAL, { O: '#5a3a2a', Q: '#7a5038', C: '#e8843a', S: '#fbe0b0' });
// The hidden tags of the standing sheep (see sheepTop), found again on a pose: top outline '1', top wool '2', the
// lowest belly row '3', and the snags '4' / '5' wherever the wool under them is the same.
const tagSheepPose = (rows, bellyRow) => rows.map((row, y) => row.replace(/./g, (ch, x) => {
  if (y === 0 && ch === 'o') return '1';
  if (y === 1 && ch === 'w') return '2';
  if (y === bellyRow && ch === 'V') return '3';
  const t = SNAG[x + ',' + y];
  return t && ch === (t === '4' ? 'w' : 'W') ? t : ch;
}));
const SHEEP_GRAZE = [
  '...ooo.ooo.......',
  '..owwwowwwoo.....',
  '.owwywwwwwwwo....',
  'owwwwwwwwwwwwo...',
  'owwwwwwwwwwwwwo..',
  'owwwwwwwwwwwwwwo.',
  'oWwwwwwwwwwwwwWo.',
  'oWWwwwwwwWWWoooo.',
  '.oVWWWWWWWfoFFFFo',
  '..oVVVVVVVVofFefo',
  '..olo...olooffffo',
];
const SHEEP_SLEEP = [
  '...ooo.ooo......',
  '..owwwowwwoo....',
  '.owwywwwwwwwo...',
  'owwwwwwwwwwwwo..',
  'owwwwwwwwwwoooo.',
  'oWwwwwwwwfoFFFFo',
  'oWwwwwwwwwofeefo',
  'oWWwwwwwwWoffffo',
  '.oVWWWWWWVVoffpo',
  '..oVVVVVVVVoooo.',
  '...oooooooo.....',
];
const LAMB_GRAZE = [
  '.ooo.oo......',
  'owwwowwwo....',
  'owywwwwwwo...',
  'oww4wwwwwwo..',
  'oWwwwwWWooooo',
  '.oVVVVVVfFFFo',
  '.olo..olofefo',
];
Object.assign(NN.SPR, {
  // head down in the grass, nibbling (frame 1 opens the jaw)
  sheepGraze: { frames: [
    tagSheepPose(SHEEP_GRAZE.concat(['..olo...olo.offpo', '..oo....oo...ooo.']), 9),
    tagSheepPose(SHEEP_GRAZE.concat(['..olo...olo.offfo', '..oo....oo...opo.']), 9),
  ] },
  // lying down, legs tucked, chin on the grass, eyes shut (the engine draws the Z's)
  sheepSleep: { frames: [tagSheepPose(SHEEP_SLEEP, 9)] },
  lambGraze: { frames: [
    LAMB_GRAZE.concat(['.olo..oloffpo', '.oo...oo.ooo.']),
    LAMB_GRAZE.concat(['.olo..olofffo', '.oo...oo.opo.']),
  ] },
  lambSleep: { frames: [
    ['.ooo.oo.....', 'owwwowwwo...', 'owywwwwooooo', 'oww4wwwfFFFo', 'oWwwwwwoeefo', '.oVVVVVoffpo', '..ooooooooo.'],
  ] },
});

// The Alpha lying down with the lamb: head on his paws, eyes shut. Same chars as the wolf, so `alpha` still works.
Object.assign(NN.SPR, {
  wolfLie: { out: '#2b2638', frames: [
    ['.................G.G...', '......DDDDD......GGGz..', '....DDDDDDDDDD..GGGGGG.', '..DDDDDDDDDDDDDDGGddGGN', '.GGGGGGGGGGGGGGGGzGLLL.', 'GGLGGGLLLLLLLGGGGLLLL..', 'LG..ddd.....GGGGGGGGddd'],
    ['................G..G...', '......DDDDD......GGGz..', '....DDDDDDDDDD..GGGGGG.', '..DDDDDDDDDDDDDDGGddGGN', '.GGGGGGGGGGGGGGGGzGLLL.', '.GLGGGLLLLLLLGGGGLLLL..', 'GL..ddd.....GGGGGGGGddd'],
  ] },
  // ambient life: a far-off bird flapping (wings up, wings down) and a little songbird sitting on a fence
  bird: { frames: [
    ['O.....O', 'OO...OO', '.QOOOQ.', '...O...', '.......'],
    ['.......', '.......', '.QOOOQ.', 'OO.O.OO', 'O.....O'],
  ] },
  birdSit: { out: '#3a2418', frames: [
    ['...uu.', '..uueg', 'UUuCC.', '.UCSS.', '..B.B.'],
  ] },
});

// ---------------------------------------------------------------- the title logo and the chapter vignettes
{
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (X, Y) => (BAYER[(Y & 3) * 4 + (X & 3)] + 0.5) / 16;
const LOGO_OUT = '#3e2416';

// "NINETY-NINE" in chunky cream-and-honey wooden letters: the I of NINETY is a shepherd's crook, the hyphen is a
// heart, and a sheep peeks over the last E. 200×52, transparent; foot point at the bottom center.
function makeLogo() {
  const W = 200, H = 52, [c, x] = canvas(W, H), CAP = 26, TOP = 19, DEPTH = 4;
  const kind = new Uint8Array(W * H), rel = new Int8Array(W * H); // kind: 1 letter, 2 heart, 3 crook
  const at = (X, Y) => (X >= 0 && Y >= 0 && X < W && Y < H ? kind[Y * W + X] : 0);
  // glyphs on a local grid, then chamfer every convex corner by one pixel so the letters read soft and chunky
  const glyph = (w, h, draw) => {
    const g = Array.from({ length: h }, () => new Uint8Array(w)), p = (X, Y) => { if (g[Y] && X >= 0 && X < w) g[Y][X] = 1; };
    draw(p);
    const on = (X, Y) => (g[Y] && X >= 0 && X < w ? g[Y][X] : 0), cut = [];
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) if (on(X, Y)) {
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (!on(X + a, Y) && !on(X, Y + b) && !on(X + a, Y + b)) cut.push([X, Y]);
    }
    for (const [X, Y] of cut) g[Y][X] = 0;
    return { w, h, g };
  };
  const GL = {
    N: glyph(19, CAP, p => { for (let Y = 0; Y < CAP; Y++) { for (let i = 0; i < 5; i++) { p(i, Y); p(14 + i, Y); } const x0 = Math.round(Y * 13 / (CAP - 1)); for (let i = 0; i < 6; i++) p(x0 + i, Y); } }),
    I: glyph(6, CAP, p => { for (let Y = 0; Y < CAP; Y++) for (let i = 0; i < 6; i++) p(i, Y); }),
    E: glyph(15, CAP, p => {
      for (let Y = 0; Y < CAP; Y++) for (let i = 0; i < 6; i++) p(i, Y);
      for (let i = 0; i < 15; i++) for (let Y = 0; Y < 5; Y++) { p(i, Y); p(i, CAP - 5 + Y); }
      for (let i = 0; i < 12; i++) for (let Y = 10; Y < 15; Y++) p(i, Y);
    }),
    T: glyph(18, CAP, p => { for (let i = 0; i < 18; i++) for (let Y = 0; Y < 5; Y++) p(i, Y); for (let Y = 0; Y < CAP; Y++) for (let i = 6; i < 12; i++) p(i, Y); }),
    Y: glyph(18, CAP, p => {
      for (let Y = 0; Y < 14; Y++) { const k = Math.round(Y * 6 / 13); for (let i = 0; i < 6; i++) { p(k + i, Y); p(12 - k + i, Y); } }
      for (let Y = 12; Y < CAP; Y++) for (let i = 6; i < 12; i++) p(i, Y);
    }),
    // the crook: a staff for the stem of the I, its hook curling over the top
    '|': glyph(17, CAP + 15, p => {
      for (let Y = 8; Y < CAP + 15; Y++) for (let i = 1; i < 5; i++) p(i, Y);
      for (let Y = 0; Y < 12; Y++) for (let X = 0; X < 17; X++) {
        const dx = X - 8.5, dy = Y - 8, r = Math.hypot(dx, dy);
        if (r >= 4.3 && r <= 7.6 && (dy <= 0 || (dx > 0 && dy < 2))) p(X, Y);
      }
    }),
    '♥': glyph(14, 12, p => {
      const rows = ['.####..####.', '############', '############', '############', '.##########.', '..########..', '...######...', '....####....', '.....##.....'];
      rows.forEach((r, Y) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') p(i + 1, Y + 2); });
      p(2, 1); p(3, 1); p(4, 1); p(7, 1); p(8, 1); p(9, 1);
    }),
  };
  GL['|'].w = 6; // the hook may hang over the next letter
  const word = ['N', '|', 'N', 'E', 'T', 'Y', '♥', 'N', 'I', 'N', 'E'], gap = (a, b) => (a === '♥' || b === '♥' ? 3 : 2);
  let total = 0;
  word.forEach((ch, i) => { total += GL[ch].w + (i ? gap(word[i - 1], ch) : 0); });
  let cx = Math.round((W - total) / 2);
  const slots = [];
  for (const [n, ch] of word.entries()) {
    if (n) cx += gap(word[n - 1], ch);
    const gl = GL[ch], mid = cx + gl.w / 2, arch = -Math.round(2.6 * Math.sin(Math.PI * mid / W));
    const top = ch === '|' ? TOP + arch - 15 : ch === '♥' ? TOP + arch + 6 : TOP + arch;
    const k = ch === '♥' ? 2 : ch === '|' ? 3 : 1;
    gl.g.forEach((row, Y) => row.forEach((v, X) => {
      if (!v) return;
      const XX = cx + X, YY = top + Y;
      if (XX < 0 || YY < 0 || XX >= W || YY >= H) return;
      kind[YY * W + XX] = k; rel[YY * W + XX] = ch === '|' ? Y - 15 : Y;
    }));
    slots.push({ ch, x: cx, w: gl.w, top: ch === '|' ? top + 15 : top });
    cx += gl.w;
  }
  // the extruded wooden sides below every letter, then a 2px warm dark outline around the lot
  const ext = new Uint8Array(W * H), extK = new Uint8Array(W * H);
  for (let Y = H - 1; Y >= 0; Y--) for (let X = 0; X < W; X++) {
    const i = Y * W + X;
    if (kind[i]) continue;
    for (let d = 1; d <= DEPTH; d++) if (at(X, Y - d)) { ext[i] = d; extK[i] = at(X, Y - d); break; }
  }
  const solid = i => kind[i] || ext[i];
  // the sheep behind the last E (drawn first so the letters hide its lower half)
  const lastE = slots[slots.length - 1];
  {
    const sx = lastE.x + 7, sy = lastE.top, [h, hx] = canvas(19, 16);
    blob(hx, [[9, 6, 6], [4, 7, 3], [14, 7, 3], [6, 3, 3], [12, 3, 3], [9, 2, 3]], '#e6dacb');
    blob(hx, [[9, 5, 5], [5, 6, 2], [13, 6, 2], [7, 3, 2], [11, 3, 2], [9, 2, 2]], '#fdf8ee');
    rect(hx, '#ffffff', 6, 2, 2, 1); rect(hx, '#ffffff', 10, 1, 2, 1); rect(hx, '#ffffff', 5, 5, 1, 1);
    oval(hx, 9, 10, 4, 5, '#5b4746'); oval(hx, 9, 9, 3, 3, '#7d6563');
    blob(hx, [[9, 5, 2], [7, 6, 1], [11, 6, 1]], '#fdf8ee'); // the forelock
    rect(hx, '#5b4746', 1, 8, 4, 2); rect(hx, '#7d6563', 2, 8, 2, 1); rect(hx, '#5b4746', 14, 8, 4, 2); rect(hx, '#7d6563', 15, 8, 2, 1); // ears
    rect(hx, '#1d1418', 7, 9, 1, 2); rect(hx, '#1d1418', 11, 9, 1, 2); rect(hx, '#ffffff', 7, 9, 1, 1); rect(hx, '#ffffff', 11, 9, 1, 1);
    rect(hx, '#ef9aa0', 9, 12, 1, 1); rect(hx, '#ef9aa0', 5, 11, 1, 1); rect(hx, '#ef9aa0', 13, 11, 1, 1); // nose and cheeks
    x.drawImage(outline(h, '#4e3d3f'), sx - 10, sy - 17);
    slots.peek = { sx, sy };
  }
  const ring = new Uint8Array(W * H);
  for (let pass = 1; pass <= 2; pass++) {
    const add = [];
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const i = Y * W + X;
      if (solid(i) || ring[i]) continue;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const XX = X + a, YY = Y + b, j = YY * W + XX;
        if (XX < 0 || YY < 0 || XX >= W || YY >= H) continue;
        if (solid(j) || (ring[j] && ring[j] < pass)) { add.push(i); break; }
      }
    }
    for (const i of add) ring[i] = pass;
  }
  // a soft shadow under the whole word
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X, up = (Y - 2) * W + X - 1;
    if (!solid(i) && !ring[i] && Y > 2 && X > 0 && (solid(up) || ring[up]) && bay(X, Y) < 0.5) rect(x, 'rgba(46,26,20,0.35)', X, Y);
  }
  const FACE = ['#fffaf0', '#fff2c4', '#fbe8b4', '#f5dc9c', '#efcc86', '#e8bc72', '#e0aa6c'];
  const SIDE = { 1: ['#c58d55', '#b07a45', '#9a6638', '#7a4a24'], 2: ['#a83a34', '#8e3030', '#7a2430', '#5a2430'], 3: ['#7a4a24', '#6b4226', '#5a3418', '#4a2a14'] };
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const i = Y * W + X;
    if (ring[i]) { rect(x, LOGO_OUT, X, Y); continue; }
    if (ext[i]) { rect(x, SIDE[extK[i]][Math.min(3, ext[i] - 1)], X, Y); if (ext[i] === 1 && !at(X - 1, Y - 1)) rect(x, extK[i] === 1 ? '#d8a468' : extK[i] === 2 ? '#c84a44' : '#8a5a33', X, Y); continue; }
    const k = kind[i];
    if (!k) continue;
    const r = rel[i], edgeL = !at(X - 1, Y), edgeR = !at(X + 1, Y), edgeT = !at(X, Y - 1);
    if (k === 1) {
      const t = r / (CAP - 1) * (FACE.length - 1), b = Math.floor(t), f = t - b;
      let col = FACE[Math.min(FACE.length - 1, b + (f > bay(X, Y) ? 1 : 0))];
      if (edgeT || (edgeL && r < CAP - 6)) col = '#fffaf0';
      else if (edgeR) col = '#d89a5a';
      rect(x, col, X, Y);
    } else if (k === 2) {
      rect(x, edgeR || !at(X, Y + 1) ? '#b8443e' : '#d8574f', X, Y);
    } else {
      rect(x, edgeL || edgeT ? '#e0aa6c' : edgeR ? '#8a5a33' : '#b07a45', X, Y);
    }
  }
  // wood grain: short warm streaks across the letter faces
  const R = NN.U.seeded(99);
  for (let n = 0; n < 70; n++) {
    const X = Math.floor(R() * W), Y = Math.floor(R() * H), len = 2 + Math.floor(R() * 5);
    for (let k = 0; k < len; k++) {
      const i = Y * W + X + k;
      if (kind[i] !== 1 || !at(X + k + 1, Y) || !at(X + k - 1, Y) || !at(X + k, Y - 1) || !at(X + k, Y + 1)) break;
      if (rel[i] > 3) rect(x, rel[i] < 14 ? '#f0d49a' : '#d8a060', X + k, Y);
    }
  }
  // the heart's shine; the crook's grain
  for (const s of slots) {
    if (s.ch === '♥') { rect(x, '#ffffff', s.x + 3, s.top + 3, 2, 1); rect(x, '#ffffff', s.x + 3, s.top + 4, 1, 1); rect(x, '#ef8a7a', s.x + 5, s.top + 3, 1, 2); }
    if (s.ch === '|') for (let Y = s.top + 1; Y < s.top + CAP - 2; Y += 5) rect(x, '#c48d55', s.x + 2, Y, 1, 2);
  }
  // hooves over the top edge of the E
  const { sx } = slots.peek;
  for (const hx of [sx - 6, sx + 3]) { rect(x, LOGO_OUT, hx - 1, lastE.top - 3, 5, 4); rect(x, '#5b4746', hx, lastE.top - 2, 3, 2); rect(x, '#7d6563', hx, lastE.top - 2, 1, 1); rect(x, '#fdf8ee', hx, lastE.top - 3, 3, 1); }
  return c;
}
NN.PROPS.logo = { make: makeLogo, ox: 100, oy: 52 };

// Chapter vignettes: 128×64 little paintings for the chapter title cards, framed in 1px of warm brown. Each is drawn
// back to front: a dithered sky, far hills (pale), middle ground, then a darker foreground. Seeded, so they never change.
const VW = 128, VH = 64;
// sky: bands of color that dither into each other only near the seams
const vSky = (x, cols, y0 = 0, y1 = VH - 1) => {
  const n = cols.length - 1;
  for (let Y = y0; Y <= y1; Y++) {
    const t = (Y - y0) / Math.max(1, y1 - y0) * n, i = Math.min(n - 1, Math.floor(t)), f = NN.U.clamp((t - i - 0.4) / 0.6, 0, 1);
    for (let X = 0; X < VW; X++) rect(x, f > bay(X, Y) ? cols[i + 1] : cols[i], X, Y);
  }
};
// a smooth wobbly line: a sum of seeded sines
const vWave = (R, parts) => { const ph = parts.map(() => R() * TAU); return X => parts.reduce((a, [amp, f], i) => a + amp * Math.sin(X * f + ph[i]), 0); };
// fill everything below a ridge; `lit` colors the ridge's top pixel, `shade` dithers the lower part darker
const vLand = (x, top, col, lit, shade, y1 = VH) => {
  for (let X = 0; X < VW; X++) {
    const t = Math.round(top(X));
    rect(x, col, X, t, 1, y1 - t);
    if (lit) rect(x, lit, X, t, 1, 1);
    if (shade) for (let Y = t + 1; Y < y1; Y++) if ((Y - t) / (y1 - t) > 0.45 + bay(X, Y) * 0.55) rect(x, shade, X, Y);
  }
};
// a soft glow: stacked translucent ovals, brightest in the middle
const vGlow = (x, cx, cy, r, col, k = 1, ry = r) => {
  const [cr, cg, cb] = NN.U.hexRGB(col), steps = Math.max(2, Math.round(r / 2));
  x.fillStyle = `rgba(${cr},${cg},${cb},${(0.55 * k / steps).toFixed(3)})`;
  for (let i = steps; i >= 1; i--) oval(x, cx, cy, Math.max(1, Math.round(r * i / steps)), Math.max(1, Math.round(ry * i / steps)));
};
const vTint = (x, X, Y, col, a) => { const [cr, cg, cb] = NN.U.hexRGB(col); rect(x, `rgba(${cr},${cg},${cb},${a.toFixed(3)})`, X, Y); };
const vCloud = (x, cx, cy, w, col, shade, hi) => {
  const n = Math.max(2, Math.round(w / 5));
  for (let i = 0; i < n; i++) { const X = cx - w / 2 + (i + 0.5) * w / n, r = 2 + ((i * 7 + w) % 3) + (i === n >> 1 ? 1 : 0); disc(x, X, cy - r * 0.4, r, col); }
  rect(x, shade, Math.round(cx - w / 2), Math.round(cy), Math.round(w), 1);
  if (hi) for (let i = 0; i < n; i++) rect(x, hi, Math.round(cx - w / 2 + (i + 0.3) * w / n), Math.round(cy - 3 - (i === n >> 1 ? 1 : 0)), 2, 1);
};
const vPine = (x, X, Y, h, dark, mid, lit) => {
  rect(x, '#5a3418', X, Y - 2, 1, 3);
  for (let j = 0; j < h; j++) {
    const half = Math.round(((j % Math.max(3, h >> 2)) + 1) * 0.45 + j * 0.28), y = Y - 2 - h + j;
    rect(x, dark, X - half, y, half * 2 + 1, 1);
    if (half > 0) rect(x, mid, X - half, y, half, 1);
    if (lit && half > 1 && j % 3 === 1) rect(x, lit, X - half, y, 1, 1);
  }
};
const vTree = (x, X, Y, r, cols, trunk = '#6b4226') => {
  rect(x, trunk, X, Y - r, 1 + (r > 4 ? 1 : 0), r + 1);
  disc(x, X, Y - r * 1.6, r, cols[0]); disc(x, X - 1, Y - r * 1.7 - 1, Math.max(1, r - 1), cols[1]);
  if (r > 2) disc(x, X - 2, Y - r * 1.8 - 2, Math.max(1, r - 3), cols[2]);
};
const vOlive = (x, X, Y, s) => {
  rect(x, '#7a6a52', X, Y - 2 * s, 1, 2 * s + 1); rect(x, '#5a4c3a', X - 1, Y, 3, 1);
  blob(x, [[X - 2 * s, Y - 3 * s, 2 * s], [X + 2 * s, Y - 3 * s, 2 * s], [X, Y - 4 * s, 2 * s]], '#6e8a6a');
  blob(x, [[X - 2 * s, Y - 3 * s - 1, s], [X + 1, Y - 4 * s - 1, s + (s > 1 ? 1 : 0)]], '#8ea886');
  rect(x, '#b6c8a8', X - 2 * s, Y - 4 * s - 1, s + 1, 1); rect(x, '#b6c8a8', X + 1, Y - 5 * s - 1, s, 1);
};
// little sheep: far (4×3) and near (6×4), facing right unless flipped; `rim` is the light catching their backs
const vSheep = (x, X, Y, near, flip, rim) => {
  const rows = near ? ['.www..', 'wwwwwk', 'WWWWW.', '.k..k.'] : ['.ww.', 'wwwk', 'k.k.'];
  pix(x, X, Y, flip ? rows.map(r => r.split('').reverse().join('')) : rows, { w: '#fdf8ee', W: '#d8cbbb', k: '#4e3d3f' });
  if (rim) rect(x, rim, X + (flip ? 2 : 1), Y, near ? 3 : 1, 1);
};
const vFence = (x, x0, x1, Y, h, step, col, colS) => {
  for (let X = x0; X <= x1; X += step) rect(x, colS, X, Y - h, 1, h + 1);
  rect(x, col, x0, Y - h + 1, x1 - x0 + 1, 1); rect(x, col, x0, Y - 1, x1 - x0 + 1, 1);
};
const vHut = (x, X, Y, night) => { // a little hut with a red roof, 17×13, foot at (X, Y)
  rect(x, '#c58d55', X + 2, Y - 7, 13, 7); rect(x, '#a8703f', X + 2, Y - 7, 1, 7); rect(x, '#9a98a8', X + 2, Y - 1, 13, 1);
  rect(x, '#7a4a24', X + 7, Y - 5, 3, 5); rect(x, night ? '#ffd36a' : '#a8d8f0', X + 11, Y - 5, 2, 2);
  for (let j = 0; j < 6; j++) { rect(x, j % 2 ? '#9e4334' : '#b34f3f', X + 5 - j, Y - 13 + j, 7 + j * 2, 1); }
  rect(x, '#7a2e26', X, Y - 8, 17, 1); rect(x, '#d06a52', X + 5, Y - 13, 7, 1);
  rect(x, '#8a8898', X + 12, Y - 15, 2, 4);
};
const vFrame = x => { x.fillStyle = '#3e2416'; x.fillRect(0, 0, VW, 1); x.fillRect(0, VH - 1, VW, 1); x.fillRect(0, 0, 1, VH); x.fillRect(VW - 1, 0, 1, VH); };
const vGrass = (x, R, y0, y1, cols, n) => { for (let k = 0; k < n; k++) { const X = Math.floor(R() * VW), Y = y0 + Math.floor(R() * (y1 - y0)); rect(x, cols[k % cols.length], X, Y, 1, 1); if (R() < 0.5) rect(x, cols[k % cols.length], X + 1, Y - 1, 1, 1); } };
const vFlowers = (x, R, y0, y1, cols, n) => { for (let k = 0; k < n; k++) { const X = 2 + Math.floor(R() * (VW - 4)), Y = y0 + Math.floor(R() * (y1 - y0)); rect(x, cols[k % cols.length], X, Y, 1, 1); } };
const vignette = (seed, paint) => () => { const [c, x] = canvas(VW, VH); paint(x, NN.U.seeded(seed)); vFrame(x); return c; };

// 1 · Green Pastures: a spring morning over the home meadow, the fold and the hut, sheep at their grazing
const vig1 = vignette(23, (x, R) => {
  vSky(x, ['#7ab8e6', '#98caee', '#b8dcf0', '#d8ecee', '#f6efd0'], 0, 36);
  vGlow(x, 96, 14, 18, '#fbf2d0', 0.8); disc(x, 96, 14, 6, '#ffe680'); disc(x, 95, 13, 4, '#fff2c4');
  vCloud(x, 28, 12, 18, '#ffffff', '#d8ecf4', '#ffffff'); vCloud(x, 60, 7, 10, '#f4fafc', '#cfe6f2'); vCloud(x, 118, 22, 10, '#fdf8ee', '#e0ecee');
  const far = vWave(R, [[2.5, 0.05], [1.2, 0.13]]), mid = vWave(R, [[3, 0.04], [1.5, 0.1]]), near = vWave(R, [[1.6, 0.05], [0.8, 0.17]]);
  vLand(x, X => 29 + far(X), '#a9cf9a', '#c6e2b0');
  for (const X of [8, 14, 19, 70, 76, 120]) vTree(x, X, Math.round(30 + far(X)) + 1, 2, ['#7aa872', '#8cba80', '#a4cc92'], '#6a7a5a');
  vLand(x, X => 36 + mid(X) + (X - 64) * (X - 64) / 900, '#7cc256', '#9bd16a', '#6ab04c');
  vTree(x, 34, Math.round(37 + mid(34)), 4, ['#3f7a34', '#56983f', '#74b54d']); vTree(x, 41, Math.round(37 + mid(41)) + 1, 3, ['#3f7a34', '#56983f', '#74b54d']);
  // the fold on the rise, the hut beside it
  const fy = 44;
  rect(x, '#8fcc62', 58, fy - 6, 34, 6); vFence(x, 58, 91, fy - 6, 3, 3, '#c58d55', '#8a5a33');
  for (const [X, Y, f] of [[61, fy - 4, 0], [67, fy - 3, 1], [73, fy - 5, 0], [79, fy - 3, 0], [84, fy - 4, 1]]) vSheep(x, X, Y, false, f);
  vFence(x, 58, 70, fy, 3, 3, '#e0aa6c', '#8a5a33'); vFence(x, 78, 91, fy, 3, 3, '#e0aa6c', '#8a5a33'); // the gate is open
  vHut(x, 96, 43); vGlow(x, 109, 23, 4, '#fdf8ee', 0.6); rect(x, '#fdf8ee', 109, 25, 2, 1);
  vLand(x, X => 47 + near(X), '#56983f', '#74b54d', '#4a8a38');
  // a path down to the gate
  for (let Y = 44; Y < VH; Y++) { const t = (Y - 44) / 20, cx = 74 + Math.sin(t * 2.6) * 6 - t * 18, w = 2 + t * 9; rect(x, '#c8b070', Math.round(cx - w / 2), Y, Math.round(w), 1); rect(x, '#e0c890', Math.round(cx - w / 4), Y, Math.max(1, Math.round(w / 3)), 1); }
  for (const [X, Y, f] of [[22, 50, 0], [40, 54, 1], [96, 52, 1], [108, 57, 0]]) { rect(x, 'rgba(38,52,24,.35)', X, Y + 4, 6, 1); vSheep(x, X, Y, true, f, '#fff6d8'); }
  vLand(x, X => 59 + near(X * 2) * 0.8, '#3f7a34', '#56983f');
  vGrass(x, R, 48, 62, ['#3f7a34', '#74b54d'], 50);
  vFlowers(x, R, 48, 62, ['#ffffff', '#f5c542', '#ef9aa0', '#ffffff'], 26);
  // an oak framing the left edge
  rect(x, '#6b4226', 4, 34, 3, 26); rect(x, '#8a5a33', 5, 34, 1, 26);
  blob(x, [[5, 22, 11], [16, 20, 6], [2, 32, 6]], '#3f7a34'); blob(x, [[4, 19, 8], [14, 18, 4]], '#56983f'); blob(x, [[2, 15, 4], [12, 16, 2]], '#74b54d');
  for (let k = 0; k < 14; k++) rect(x, '#9bd16a', Math.floor(R() * 18), 9 + Math.floor(R() * 16), 1, 1);
});

// 2 · Still Waters: a slow river, a plank bridge across it, reeds, and a great sycamore on the far bank
const vig2 = vignette(7, (x, R) => {
  vSky(x, ['#8ec6ea', '#a8d6f0', '#c8e6f0', '#e8f2e4'], 0, 28);
  vCloud(x, 22, 9, 16, '#ffffff', '#d8ecf4', '#ffffff'); vCloud(x, 70, 14, 12, '#f4fafc', '#d0e6f0');
  const far = vWave(R, [[2, 0.05], [1, 0.15]]);
  vLand(x, X => 23 + far(X), '#9cc4b0', '#b8d8c0');
  vLand(x, X => 28 + Math.sin(X * 0.09) * 0.8, '#74b54d', '#9bd16a', null, 34);
  for (const X of [6, 12, 46, 54, 60]) vTree(x, X, 30, 2 + (X % 3), ['#4f9a3c', '#62ad5a', '#86c46a']);
  // the river: sky in it near the far bank, deeper toward us
  vSky(x, ['#a8dcf5', '#6ab8e0', '#4aa3d8', '#3a8cc4', '#347ab4'], 33, VH - 1);
  rect(x, '#3f7a34', 0, 32, VW, 1); rect(x, '#56983f', 0, 31, VW, 1);
  // the sycamore and its reflection
  const tx = 96;
  for (let Y = 14; Y < 32; Y++) { const w = 4 + (Y > 28 ? Y - 28 : 0); rect(x, '#9a9078', tx - (w >> 1), Y, w, 1); rect(x, '#d8d0bc', tx - (w >> 1) + 1, Y, 1, 1); }
  for (const [X, Y] of [[tx - 1, 18], [tx, 24], [tx - 1, 28]]) rect(x, '#6a604e', X, Y, 2, 1);
  for (let Y = 33; Y < 40; Y++) if (bay(tx, Y) < 0.7) rect(x, '#7a8a8a', tx - 2, Y, 4, 1);
  blob(x, [[tx, 10, 12], [tx - 13, 15, 7], [tx + 13, 15, 7], [tx - 6, 4, 7], [tx + 7, 5, 7]], '#3f7a34');
  blob(x, [[tx - 1, 8, 10], [tx - 12, 13, 5], [tx + 11, 13, 5], [tx - 6, 3, 5], [tx + 6, 4, 5]], '#56983f');
  blob(x, [[tx - 5, 4, 5], [tx - 13, 11, 2], [tx + 8, 2, 3]], '#74b54d'); blob(x, [[tx - 7, 2, 2], [tx + 8, 1, 1]], '#9bd16a');
  for (let k = 0; k < 16; k++) rect(x, '#35692d', tx - 16 + Math.floor(R() * 32), 10 + Math.floor(R() * 10), 2, 1);
  rect(x, '#35692d', tx - 18, 17, 36, 1);
  for (let Y = 34; Y < 47; Y++) { // the tree upside down in the water, broken by ripples
    const half = Math.round(17 - Math.abs(Y - 38) * 1.1 - (Y > 42 ? (Y - 42) * 2 : 0)), wob = Math.round(Math.sin(Y * 1.7) * 1.5);
    if (half > 0) { rect(x, Y % 2 ? '#3a8a7a' : '#4a9a86', tx - half + wob, Y, half * 2, 1); if (Y % 3 === 0) rect(x, '#6ab8a0', tx - half + wob + 3, Y, 4, 1); }
  }
  // still-water glints
  for (let k = 0; k < 22; k++) { const Y = 35 + Math.floor(R() * 14), X = Math.floor(R() * VW); rect(x, Y < 41 ? '#e8f6fc' : '#a8dcf5', X, Y, 2 + Math.floor(R() * 4), 1); }
  // lily pads
  for (const [X, Y] of [[18, 44], [26, 47], [108, 46], [34, 42]]) { oval(x, X, Y, 3, 1, '#3d7a2e'); rect(x, '#5aa846', X - 2, Y - 1, 3, 1); }
  rect(x, '#f6b3c8', 26, 46, 2, 1); rect(x, '#ffffff', 26, 45, 1, 1); rect(x, '#f6b3c8', 108, 45, 1, 1);
  // the plank bridge, coming toward us across the water
  for (let Y = 31; Y < VH; Y++) {
    const t = (Y - 31) / 32, cx = 58 - t * 6, w = 6 + t * 26, l = Math.round(cx - w / 2), r = Math.round(cx + w / 2);
    const plank = Math.floor(Math.pow(t, 0.55) * 22), seam = Math.floor(Math.pow((Y - 30) / 32, 0.55) * 22) !== plank;
    rect(x, seam ? '#8a5a33' : plank % 2 ? '#c08c52' : '#b8824a', l, Y, r - l, 1);
    if (!seam && plank % 4 === 1) rect(x, '#d8a468', l + 2, Y, Math.max(1, (r - l) >> 2), 1);
    rect(x, '#6b4226', l, Y, 1, 1); rect(x, '#6b4226', r - 1, Y, 1, 1);
    if (Y > 34 && Y < 52 && Y % 2) rect(x, '#2f7ab0', l - 1, Y + 1, r - l + 2, 1);
  }
  for (const t of [0.12, 0.3, 0.55, 0.85]) { // posts and their reflections
    const Y = Math.round(31 + t * 32), cx = 58 - t * 6, w = 6 + t * 26, h = 2 + Math.round(t * 6);
    for (const X of [Math.round(cx - w / 2) - 1, Math.round(cx + w / 2)]) { rect(x, '#6b4226', X, Y - h, 1 + (t > 0.5 ? 1 : 0), h + 2); rect(x, '#b07a45', X, Y - h, 1, 1); }
  }
  // the near bank, reeds and cattails
  vLand(x, X => 52 + Math.sin(X * 0.07) * 1.5 + (X > 40 && X < 76 ? 8 : 0), '#56983f', '#74b54d', '#3f7a34');
  for (const [X0, n] of [[2, 9], [100, 11]]) for (let k = 0; k < n; k++) {
    const X = X0 + k * 2 + Math.floor(R() * 2), top = 38 + Math.floor(R() * 10), lean = R() < 0.5 ? -1 : 1;
    for (let Y = top; Y < VH; Y++) rect(x, Y < top + 3 ? '#9bd16a' : Y > 56 ? '#3d7a2e' : '#5aa846', X + Math.round(lean * (VH - Y) / 16), Y, 1, 1);
    if (k % 3 === 1) { rect(x, '#7a4a24', X + Math.round(lean * (VH - top) / 16), top + 1, 2, 4); rect(x, '#a0663a', X + Math.round(lean * (VH - top) / 16), top + 1, 1, 2); }
  }
});

// 3 · He Restores My Soul: thorn hills at sunset, a path cut through them, and one lamb on its way home
const vig3 = vignette(31, (x, R) => {
  vSky(x, ['#3e2e5a', '#5e3a6a', '#8e4a72', '#c8647a', '#ec8e6e', '#f8be72', '#ffe0a0'], 0, 40);
  for (let k = 0; k < 10; k++) rect(x, '#e8d0f0', Math.floor(R() * VW), Math.floor(R() * 7) + 1, 1, 1);
  vGlow(x, 64, 33, 30, '#ffd890', 0.7, 14); disc(x, 64, 33, 9, '#ffd36a'); disc(x, 64, 32, 7, '#ffe8a8'); disc(x, 63, 31, 4, '#fff6d8');
  vCloud(x, 26, 19, 22, '#d8708a', '#a8506e', '#f0a080'); vCloud(x, 104, 15, 18, '#c8607a', '#9a4a6a', '#e8907a'); vCloud(x, 88, 26, 10, '#f0907a', '#c06a70');
  const spikes = (top, col, every) => { for (let X = 1; X < VW - 1; X += every) { const t = Math.round(top(X)); rect(x, col, X, t - 1, 1, 1); if (X % (every * 2) === 0) rect(x, col, X + 1, t - 2, 1, 1); } };
  const a = vWave(R, [[3, 0.06], [1.5, 0.15]]), b = vWave(R, [[4, 0.05], [2, 0.12]]), cc = vWave(R, [[3, 0.07], [1.5, 0.2]]);
  const notch = X => -6 * Math.exp(-((X - 64) * (X - 64)) / 120);
  vLand(x, X => 36 + a(X) + notch(X) * 0.3, '#a86a7a', '#e0907e'); spikes(X => 36 + a(X) + notch(X) * 0.3, '#a86a7a', 3);
  vLand(x, X => 43 + b(X) - notch(X) * 0.6, '#7a4652', '#c0706e', '#6a3a48'); spikes(X => 43 + b(X) - notch(X) * 0.6, '#7a4652', 2);
  // the path, cut through the thorns, lit by the low sun
  const px = Y => 64 + Math.sin((VH - Y) / 7) * 9 * ((VH - Y) / 26), pw = Y => 1 + (Y - 38) * 0.75;
  for (let Y = 39; Y < VH; Y++) {
    const cx = px(Y), w = pw(Y), l = Math.round(cx - w / 2), r = Math.round(cx + w / 2);
    rect(x, '#b88a62', l, Y, r - l + 1, 1); rect(x, '#e8c08a', Math.round(cx - w / 5), Y, Math.max(1, Math.round(w / 3)), 1);
    rect(x, '#8a5a4a', l, Y, 1, 1); rect(x, '#8a5a4a', r, Y, 1, 1);
  }
  // thorn thickets either side of it
  const bush = (X, Y, r, d, m, l) => { blob(x, [[X, Y, r], [X + r, Y + 1, r - 1], [X - r, Y + 1, r - 1]], d); blob(x, [[X - 1, Y - 1, r - 1]], m); rect(x, l, X - 1, Y - r, 2, 1); for (let k = 0; k < r * 3; k++) { const ang = R() * Math.PI, rr = r + 1; rect(x, k % 2 ? '#c08a7a' : '#3e2230', Math.round(X + Math.cos(ang) * rr * 1.4), Math.round(Y - Math.sin(ang) * rr), 1, 1); } };
  for (const [X, Y, r] of [[20, 50, 4], [34, 52, 3], [92, 49, 4], [108, 52, 5], [8, 54, 5]]) bush(X, Y, r, '#5a3442', '#7a4652', '#c0706e');
  const fg = X => 55 + cc(X) - Math.abs(X - 64) / 10 + 16 * Math.exp(-((X - 64) * (X - 64)) / 260);
  vLand(x, fg, '#3e2230', '#7a4652', '#2e1a26');
  for (let X = 1; X < VW - 1; X += 2) { const t = Math.round(fg(X)); if (t < 63) { rect(x, '#3e2230', X, t - 1, 1, 1); if (X % 4 === 1) { rect(x, '#3e2230', X + 1, t - 2, 1, 1); rect(x, '#c08a7a', X + 1, t - 3, 1, 1); } } }
  // the lamb, rim-lit, with a long shadow toward us
  const lx = Math.round(px(50)) - 3, ly = 47;
  for (let k = 0; k < 6; k++) rect(x, '#8a5a4a', lx + 1 + (k >> 1), ly + 4 + k, 3, 1);
  pix(x, lx, ly, ['.ww...', 'wwwwk.', 'wWWWkk', '.k..k.'], { w: '#fdf8ee', W: '#e6c8b0', k: '#4e3d3f' });
  rect(x, '#ffe0a0', lx + 1, ly, 2, 1); rect(x, '#ffd890', lx, ly + 1, 1, 1);
});

// 4 · Paths of Righteousness: an old road winding west past pines, Hank's tent and the hay cart, a storm coming
const vig4 = vignette(41, (x, R) => {
  vSky(x, ['#7a8aa8', '#98a6b8', '#c0c4c0', '#e8dcb8'], 0, 36);
  // the storm on the western horizon: heavy clouds, rain, one far flash
  for (const [cx, cy, w] of [[14, 22, 30], [34, 18, 26], [8, 13, 18], [52, 24, 20]]) vCloud(x, cx, cy, w, '#5d5e78', '#4a4b62', '#7d7e98');
  for (const [cx, cy, w] of [[20, 27, 26], [44, 28, 18]]) vCloud(x, cx, cy, w, '#4a4b62', '#3a3b52');
  for (let k = 0; k < 36; k++) { const X = Math.floor(R() * 56), Y = 28 + Math.floor(R() * 8); rect(x, '#6a6c88', X, Y, 1, 2); rect(x, '#6a6c88', X - 1, Y + 2, 1, 1); }
  pix(x, 30, 26, ['.y.', 'y..', 'yy.', '.y.', 'y..'], { y: '#fff2a8' });
  vCloud(x, 92, 10, 14, '#f4ecd8', '#d0c8c0', '#ffffff'); vCloud(x, 116, 16, 10, '#ece4d0', '#c8c0b8');
  const far = vWave(R, [[1, 0.08], [0.6, 0.2]]);
  vLand(x, X => 36 + far(X), '#8a9a7a', '#a8b890');
  for (let X = 2; X < 60; X += 3) if (R() < 0.7) vPine(x, X, 37, 3 + Math.floor(R() * 3), '#56685a', '#6a7c6a');
  vLand(x, X => 39 + far(X * 1.7) * 0.5, '#b8b46a', '#d0cc80', '#a8a45a');
  vGrass(x, R, 41, 62, ['#a8a45a', '#d8d48a', '#8a9a48'], 80);
  // the road: west into the weather
  const rx = Y => 112 - Math.pow((VH - Y) / 25, 0.8) * 70 + Math.sin((VH - Y) / 4.5) * 7, rw = Y => 1 + (Y - 38) * 0.9;
  for (let Y = 39; Y < VH; Y++) {
    const cx = rx(Y), w = rw(Y), l = Math.round(cx - w / 2), r = Math.round(cx + w / 2);
    rect(x, '#9a7448', l, Y, r - l + 1, 1); rect(x, '#b89062', l + 1, Y, Math.max(1, r - l - 1), 1);
    if (w > 5) { rect(x, '#86643c', Math.round(cx - w / 4), Y, 1, 1); rect(x, '#86643c', Math.round(cx + w / 4), Y, 1, 1); rect(x, '#d0aa78', Math.round(cx), Y, 1, 1); }
    rect(x, '#7a8a40', l - 1, Y, 1, 1); rect(x, '#7a8a40', r + 1, Y, 1, 1);
  }
  // the tent and the cart by the roadside
  const tent = (X, Y) => { for (let j = 0; j < 9; j++) { const h = Math.round(1 + j * 0.8); rect(x, '#c7b6a5', X - h, Y - 9 + j, h, 1); rect(x, '#e6dacb', X, Y - 9 + j, h, 1); rect(x, '#fdf8ee', X, Y - 9 + j, 1, 1); } for (let j = 3; j < 9; j++) rect(x, '#3a2a24', X - Math.round((j - 3) * 0.4), Y - 9 + j, Math.round((j - 3) * 0.8) + 1, 1); rect(x, '#d8574f', X + 3, Y - 4, 2, 2); rect(x, '#6a8fe0', X - 5, Y - 3, 2, 2); rect(x, '#6b4226', X, Y - 11, 1, 2); rect(x, '#d8574f', X + 1, Y - 11, 2, 1); };
  tent(34, 47);
  const cart = (X, Y) => { hayHeap(x, X, Y - 9, 14, 6); boards(x, X, Y - 5, 15, 4, '#c58d55', '#a8703f', '#e0aa6c', 2); rect(x, '#8a5a33', X + 15, Y - 3, 5, 1); for (const W0 of [X + 3, X + 11]) { disc(x, W0, Y - 1, 2, '#6b4226'); rect(x, '#b07a45', W0, Y - 1, 1, 1); } };
  cart(70, 51);
  // pines along the right of the road, near ones big and dark
  for (const [X, Y, h] of [[84, 40, 7], [92, 41, 9], [100, 40, 8], [76, 39, 5], [118, 48, 18], [106, 46, 13]]) vPine(x, X, Y, h, '#2f6b45', '#3f8a55', '#62ad6a');
  vLand(x, X => 58 + Math.sin(X * 0.1) * 1.5 + (X > 70 && X < 124 ? 9 : 0), '#7a8a40', '#a8a45a');
  for (let k = 0; k < 30; k++) { const X = Math.floor(R() * VW), Y = 56 + Math.floor(R() * 7); rect(x, '#d8d48a', X, Y, 1, 2); }
});

// 5 · The Valley of the Shadow: a canyon at night, a line of lamp posts going down into it, one lantern ahead
const vig5 = vignette(53, (x, R) => {
  vSky(x, ['#0c0918', '#1a1433', '#2c2450', '#3a3060', '#3a3060'], 0, VH - 1);
  for (let k = 0; k < 46; k++) { const X = Math.floor(R() * VW), Y = Math.floor(R() * 30); rect(x, R() < 0.3 ? '#ffe58a' : '#eceaff', X, Y, 1, 1); }
  for (const [X, Y] of [[20, 6], [110, 20], [70, 4]]) { rect(x, '#6d58b0', X - 1, Y, 3, 1); rect(x, '#6d58b0', X, Y - 1, 1, 3); rect(x, '#ffffff', X, Y, 1, 1); }
  vGlow(x, 99, 10, 10, '#6d58b0', 0.35);
  for (let Y = 4; Y <= 16; Y++) for (let X = 94; X <= 106; X++) if (Math.hypot(X - 100, Y - 10) <= 5.2 && Math.hypot(X - 102.5, Y - 8.5) > 4.6) rect(x, X < 97 ? '#fff6d8' : '#eceaff', X, Y);
  // canyon walls: far, then middle, then the near cliffs that frame the picture
  const w1 = vWave(R, [[3, 0.08], [2, 0.2]]), w2 = vWave(R, [[3, 0.1], [2, 0.25]]);
  const vee = (X, depth, width) => depth * Math.max(0, 1 - Math.abs(X - 64) / width);
  vLand(x, X => 24 + w1(X) + vee(X, 14, 40), '#2c2450', '#6d58b0', '#241e44');
  vLand(x, X => 30 + w2(X) * 1.5 + vee(X, 22, 46), '#1a1433', '#4a3e80', '#140f28');
  // the path down into the dark
  const px = Y => 64 + Math.sin((VH - Y) / 6) * 5 * ((VH - Y) / 30), pw = Y => 1 + (Y - 40) * 0.6;
  for (let Y = 41; Y < VH; Y++) { const cx = px(Y), w = pw(Y); rect(x, '#3a3060', Math.round(cx - w / 2), Y, Math.round(w) + 1, 1); rect(x, '#4a3e70', Math.round(cx - w / 6), Y, Math.max(1, Math.round(w / 3)), 1); }
  // one lantern far ahead, then the lamp posts, far to near, each with its pool of light
  vGlow(x, 64, 41, 5, '#f5a742', 1); rect(x, '#ffe58a', 64, 41, 1, 1);
  const posts = [[45, 3], [48, 4], [51, 6], [55, 8], [60, 11]];
  posts.forEach(([Y, h], i) => {
    const side = i % 2 ? 1 : -1, X = Math.round(px(Y) + side * (pw(Y) / 2 + 2));
    vGlow(x, X, Y, 3 + h * 1.1, '#f5a742', 0.55, 1 + Math.round(h * 0.3));
    vGlow(x, X, Y - h, 2 + h * 0.9, '#ffd36a', 0.6);
    rect(x, '#0c0918', X, Y - h, h > 6 ? 2 : 1, h + 1);
    rect(x, '#ffd36a', X - (h > 6 ? 1 : 0), Y - h - 1, h > 6 ? 3 : 1, h > 6 ? 2 : 1); rect(x, '#fff2a8', X, Y - h - 1, 1, 1);
    if (h > 6) rect(x, '#0c0918', X - 1, Y - h - 2, 3, 1);
  });
  // near cliffs, black against the sky, a moon-rim on their edges
  const cliff = (X0, dir) => { for (let X = 0; X < 34; X++) { const XX = dir > 0 ? X0 + X : X0 - X, top = Math.round(8 + X * X / 40 + Math.sin(X * 0.7) * 1.5); rect(x, '#0c0918', XX, top, 1, VH - top); rect(x, dir < 0 ? '#352c60' : '#241e44', XX, top, 1, 1); } };
  cliff(0, 1); cliff(VW - 1, -1);
  for (let k = 0; k < 8; k++) { const X = 3 + Math.floor(R() * 20); rect(x, '#1a1433', X, 24 + Math.floor(R() * 34), 3, 1); }
});

// 6 · A Table Before My Enemies: the highlands, olive trees, a long feast table; far off, the wolves watch
const vig6 = vignette(67, (x, R) => {
  vSky(x, ['#78b4e0', '#98c8e8', '#c8e0e4', '#f0e8c4'], 0, 30);
  vCloud(x, 30, 9, 20, '#ffffff', '#dcecf2', '#ffffff'); vCloud(x, 98, 6, 14, '#fdf8ee', '#dce8ee');
  const a = vWave(R, [[4, 0.05], [2, 0.13]]), b = vWave(R, [[3, 0.04], [1.5, 0.11]]);
  vLand(x, X => 24 + a(X), '#a8b8b0', '#c4d4c4');
  vLand(x, X => 31 + b(X), '#8ea886', '#b6c8a8', '#7e9878');
  for (const X of [9, 17, 25]) { const Y = Math.round(31 + b(X)); pix(x, X - 2, Y - 3, ['kk..k', '.kkkk', '.k.k.'], { k: '#4a4b62' }); rect(x, '#ffe680', X + 2, Y - 3, 1, 1); }
  for (const X of [36, 52, 84, 100, 116]) vOlive(x, X, Math.round(31 + b(X)) + 2, 1);
  vLand(x, X => 39 + b(X * 1.5) * 0.4, '#a8bc6a', '#c4d48a', '#98ac5a');
  for (const [X, Y] of [[8, 44], [118, 44], [24, 41]]) vOlive(x, X, Y, 2);
  // the table: a long white cloth, the food, guests on the far side, the host at the end
  const ty = 46, tl = 30, tr = 98;
  const guests = ['#3f8f93', '#d8574f', '#6b4380', '#e0b040', '#5a7a9a', '#c0603a', '#8e3a8a', '#6a9a4a', '#a8a070'];
  guests.forEach((col, i) => { const X = tl + 4 + i * 7; rect(x, col, X, ty - 5, 3, 4); rect(x, '#f0c69c', X + 1, ty - 7, 1, 2); rect(x, '#5a3a24', X + 1, ty - 8, 1, 1); });
  rect(x, '#3f8f93', tr + 3, ty - 8, 3, 9); rect(x, '#68b8b1', tr + 3, ty - 8, 1, 9); rect(x, '#f0c69c', tr + 4, ty - 10, 1, 2); rect(x, '#3f8f93', tr + 3, ty - 11, 3, 1);
  rect(x, '#b07a45', tr + 7, ty - 13, 1, 13); rect(x, '#b07a45', tr + 6, ty - 14, 2, 1); rect(x, '#b07a45', tr + 5, ty - 13, 1, 2);
  rect(x, '#f1e4c6', tl, ty - 2, tr - tl, 3); rect(x, '#ffffff', tl, ty - 2, tr - tl, 1); rect(x, '#d8c8a8', tl, ty + 1, tr - tl, 2);
  for (let X = tl + 1; X < tr; X += 3) rect(x, '#e8d8b8', X, ty + 3, 1, 1);
  for (const X of [tl + 1, tl + 34, tr - 2]) rect(x, '#8a5a33', X, ty + 3, 1, 5);
  for (let X = tl + 3; X < tr - 2; X += 5) { const k = (X >> 2) % 4; rect(x, ['#d8984a', '#7a3a8a', '#c07a3e', '#c8dce8'][k], X, ty - 3, 2, 1); if (k === 1) rect(x, '#b070c0', X, ty - 3, 1, 1); }
  rect(x, '#8a5a33', tl - 1, ty + 5, tr - tl + 2, 1); rect(x, '#b07a45', tl - 1, ty + 4, tr - tl + 2, 1);
  vGlow(x, 64, ty - 2, 40, '#fff6dc', 0.4, 9);
  vLand(x, X => 55 + Math.sin(X * 0.08) * 2, '#7a9a4a', '#98b85a', '#6a8a3e');
  vGrass(x, R, 54, 62, ['#5a7a38', '#a8c46a'], 50); vFlowers(x, R, 55, 62, ['#f5c542', '#ffffff', '#ef9aa0'], 14);
  // bunting strung between two poles above the feast
  rect(x, '#6b4226', tl - 4, ty - 22, 1, 30); rect(x, '#6b4226', tr + 12, ty - 22, 1, 30);
  for (let X = tl - 3; X < tr + 12; X++) { const Y = Math.round(ty - 21 + Math.sin((X - tl + 3) / (tr + 15 - tl) * Math.PI) * 5); rect(x, '#5a3a24', X, Y, 1, 1); if ((X - tl) % 6 === 0) { const col = ['#d8574f', '#f5c542', '#3f8f93', '#ef9aa0'][((X - tl) / 6 & 3)]; rect(x, col, X, Y + 1, 3, 1); rect(x, col, X + 1, Y + 2, 1, 1); } }
});

// 7 · The House of the Lord: the farm at dawn from a little hill. The fold is full, the gate stands open.
const vig7 = vignette(97, (x, R) => {
  vSky(x, ['#2e3a78', '#4e4a90', '#8a5a98', '#c8708a', '#f0987a', '#ffc884', '#fff0c0'], 0, 38);
  for (let k = 0; k < 14; k++) rect(x, '#eceaff', Math.floor(R() * VW), Math.floor(R() * 9), 1, 1);
  const sx = 84, sy = 36;
  for (let Y = 1; Y < sy; Y++) for (let X = 1; X < VW - 1; X++) { // rays of first light
    const ang = Math.atan2(Y - sy, X - sx), d = Math.hypot(X - sx, Y - sy);
    if (Math.sin(ang * 22) > 0.35 && d > 8) vTint(x, X, Y, '#fff4d0', 0.22 * Math.max(0, 1 - d / 95));
  }
  vGlow(x, sx, sy, 34, '#ffe0a0', 0.8, 16); disc(x, sx, sy, 7, '#fff2c4'); disc(x, sx, sy, 5, '#ffffff');
  vCloud(x, 30, 16, 22, '#f0a090', '#b8708a', '#ffd0a0'); vCloud(x, 112, 22, 14, '#ffb890', '#d08080', '#ffe0b0');
  const a = vWave(R, [[2.5, 0.06], [1.2, 0.15]]);
  vLand(x, X => 35 + a(X), '#9a7aa0', '#e0a8a0');
  vLand(x, X => 39 + a(X * 1.3) * 0.5, '#6a9a6a', '#b8c890', '#5e8a60');
  // the farm below: hut with its window lit, the barn, and the fold, full
  const fy = 48;
  vHut(x, 18, 44, true); vGlow(x, 30, 40, 4, '#ffd36a', 0.5);
  rect(x, '#b5473a', 38, 34, 14, 10); rect(x, '#963a30', 38, 34, 1, 10); rect(x, '#7a2e26', 42, 38, 6, 6); rect(x, '#f1e4c6', 42, 38, 6, 1);
  for (let j = 0; j < 4; j++) rect(x, j % 2 ? '#7e3a30' : '#8e4034', 37 + j, 30 + j, 16 - j * 2, 1); rect(x, '#5e261e', 36, 33, 18, 1);
  rect(x, '#8fcc62', 56, fy - 9, 44, 9);
  for (let i = 0; i < 18; i++) vSheep(x, 58 + (i % 9) * 4.6 + ((i / 9 | 0) % 2) * 2, fy - 8 + (i / 9 | 0) * 3 + (i % 2), false, i % 3 === 0, '#ffe0a0');
  vFence(x, 56, 99, fy - 9, 2, 3, '#c58d55', '#8a5a33');
  vFence(x, 56, 72, fy, 3, 3, '#e0aa6c', '#8a5a33'); vFence(x, 82, 99, fy, 3, 3, '#e0aa6c', '#8a5a33');
  rect(x, '#8a5a33', 56, fy - 9, 1, 10); rect(x, '#8a5a33', 99, fy - 9, 1, 10);
  rect(x, '#e0aa6c', 73, fy - 4, 1, 3); rect(x, '#e0aa6c', 74, fy - 5, 1, 3); rect(x, '#e0aa6c', 75, fy - 6, 1, 3); // the gate, swung open
  // the Shepherd at the gate, small, his crook in hand, the light behind him
  vGlow(x, 78, fy - 3, 6, '#fff2c4', 0.7, 4);
  rect(x, '#3f8f93', 77, fy - 5, 3, 5); rect(x, '#68b8b1', 77, fy - 5, 1, 5); rect(x, '#f0c69c', 78, fy - 7, 1, 2); rect(x, '#3f8f93', 77, fy - 7, 1, 2);
  rect(x, '#8a5a33', 80, fy - 9, 1, 9); rect(x, '#8a5a33', 81, fy - 10, 1, 1); rect(x, '#8a5a33', 82, fy - 9, 1, 2);
  // a path from the hill down to the open gate
  for (let Y = fy; Y < VH; Y++) { const t = (Y - fy) / (VH - fy), cx = 78 - t * 14, w = 3 + t * 12; rect(x, '#c8a878', Math.round(cx - w / 2), Y, Math.round(w), 1); rect(x, '#e8c890', Math.round(cx - w / 6), Y, Math.max(1, Math.round(w / 3)), 1); }
  // the little hill we stand on, still in shadow
  vLand(x, X => 52 + (X - 20) * (X - 20) / 400 + Math.sin(X * 0.15), '#3f7a34', '#74b54d', '#2f5a2a');
  for (let X = 2; X < 60; X += 2) { const t = Math.round(52 + (X - 20) * (X - 20) / 400 + Math.sin(X * 0.15)); rect(x, '#56983f', X, t - 1, 1, 1); if (X % 6 === 0) rect(x, '#9bd16a', X, t - 2, 1, 1); }
  vFlowers(x, R, 56, 62, ['#ffffff', '#f5c542', '#ef9aa0'], 12);
  for (const [X, Y] of [[46, 10], [53, 8], [60, 12]]) pix(x, X, Y, ['o.o', '.o.'], { o: '#5a3a5a' });
});
Object.assign(NN.PROPS, {
  vignette1: { make: vig1, ox: 64, oy: 64 }, vignette2: { make: vig2, ox: 64, oy: 64 }, vignette3: { make: vig3, ox: 64, oy: 64 },
  vignette4: { make: vig4, ox: 64, oy: 64 }, vignette5: { make: vig5, ox: 64, oy: 64 }, vignette6: { make: vig6, ox: 64, oy: 64 },
  vignette7: { make: vig7, ox: 64, oy: 64 },
});
}

// ---------------------------------------------------------------- job gear on the idle poses
// Every NN.MODS entry draws on the standing frame at fixed pixels. On a pose frame (recognised by its size, see
// NN.POSES) the mod is first drawn on a blank standing-size grid, then each pixel it set is moved by the offset of the
// part of the body it belongs to: 'head' (hats, glasses), 'chin' (bandana, bell, bucket, twig), 'neck' (scarf, collar)
// or 'body' (bandage, yarn, choir robe, blanket). A mod not listed in MOD_PART is placed by where its pixels fall.
// `mods: { name: [dx, dy] | null }` on a pose overrides one mod (null leaves that gear off the pose).
// The wrapper sits on NN.MODS itself, so mods added later (by any file) work on the poses as well.
NN.POSES = {
  '17x13': { sprite: 'sheepGraze', base: [16, 13], head: [1, 4], chin: [1, 4], neck: [1, 2], body: [0, 0],
    mods: { bucket: [-6, 0], bell: [0, 1] } },
  '16x11': { sprite: 'sheepSleep', base: [16, 13], head: [0, 1], chin: [0, 1], neck: [0, 1], body: [0, 0],
    mods: { bucket: [-8, -2], bell: [-1, -1] } },
  '13x9': { sprite: 'lambGraze', base: [12, 9], head: [1, 3], chin: [1, 3], neck: [1, 2], body: [0, 0] },
  '12x7': { sprite: 'lambSleep', base: [12, 9], head: [0, 1], chin: [0, 1], neck: [0, 1], body: [0, 0] },
};
const MOD_PART = {
  shades: 'head', bow: 'head', beanie: 'head', specs: 'head', doc: 'head', candle: 'head', horns: 'head',
  strawhat: 'head', flowercrown: 'head', sweatband: 'head', mask: 'head',
  bandana: 'chin', bell: 'chin', bucket: 'chin', twig: 'chin', scarf: 'neck', collar: 'neck',
  bandage: 'body', yarn: 'body', choir: 'body', blanket: 'body',
};
const BLANK = '\u0000';
const poseMod = (name, fn) => {
  if (typeof fn !== 'function' || fn.poseAware) return fn;
  const wrapped = rows => {
    const pose = rows.length && NN.POSES[rows[0].length + 'x' + rows.length];
    if (!pose) return fn(rows);
    const [bw, bh] = pose.base, v = Array.from({ length: bh }, () => new Array(bw).fill(BLANK));
    fn(v);
    const px = [];
    v.forEach((row, Y) => row.forEach((ch, X) => { if (ch !== BLANK) px.push([X, Y, ch]); }));
    if (!px.length) return;
    let part = MOD_PART[name];
    if (!part) {
      const cx = px.reduce((a, p) => a + p[0], 0) / px.length, cy = px.reduce((a, p) => a + p[1], 0) / px.length;
      part = cx < bw * 0.62 ? 'body' : cy < bh * 0.6 ? 'head' : 'chin';
    }
    const off = pose.mods && name in pose.mods ? pose.mods[name] : pose[part];
    if (off) for (const [X, Y, ch] of px) set(rows, X + off[0], Y + off[1], ch);
  };
  wrapped.poseAware = true;
  return wrapped;
};
for (const k of Object.keys(NN.MODS)) NN.MODS[k] = poseMod(k, NN.MODS[k]);
NN.MODS = new Proxy(NN.MODS, { set: (t, k, fn) => { t[k] = poseMod(k, fn); return true; } });
})();
