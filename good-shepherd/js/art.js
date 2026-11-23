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
})();
