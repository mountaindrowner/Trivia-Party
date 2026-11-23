/* NINETY-NINE · game.js
   The simulation: the Shepherd and his kit, the flock (needs, personalities, trust, jobs), the farm (buildings,
   resources, the daily tally), pickups, wolves, frights, storms, people, and the day/night calendar.
   Story beats live in story.js and talk to this file through NN.STORY.emit(event, data). */
(() => {
'use strict';
const NN = window.NN;
const { rand, irand, clamp, dist, pick, shuffle } = NN.U;
const W = NN.WORLD, TAU = NN.TAU;
const SCRIPT = () => NN.SCRIPT || {};
const barks = (path, fallback = ['…']) => { let o = SCRIPT().barks; for (const k of path.split('.')) o = o && o[k]; return Array.isArray(o) && o.length ? o : fallback; };
const emit = (ev, data) => { if (NN.STORY && NN.STORY.emit) NN.STORY.emit(ev, data); };
const ui = () => NN.UI;

// ---------------------------------------------------------------- definitions
const RES = ['timber', 'stone', 'hay', 'water', 'wool', 'herbs', 'oil', 'blanket'];
const RES_NAME = { timber: 'Timber', stone: 'Stone', hay: 'Hay', water: 'Water', wool: 'Wool', herbs: 'Herbs', oil: 'Oil', blanket: 'Blankets' };
const TRAITS = ['brave', 'dramatic', 'sleepy', 'nerdy', 'chatty', 'hungry'];
const LOOKS = ['', '', '', 'shades', 'bow', 'beanie', 'bandana', 'specs', 'scarf'];
const JOBS = {
  lookout: { name: 'Lookout', mod: 'bell', likes: ['brave', 'nerdy'], desc: 'Watches for wolves and rings the bell.' },
  doc: { name: 'Doc', mod: 'doc', likes: ['nerdy'], desc: 'Patches up hurt sheep in the fold.' },
  lamp: { name: 'Lamplighter', mod: 'candle', likes: ['dramatic', 'brave'], desc: 'Keeps the fire big. Wolves hate a big fire.' },
  wrangler: { name: 'Water Wrangler', mod: 'bucket', likes: ['brave', 'chatty'], desc: 'Brings in water every day.' },
  hauler: { name: 'Hay Hauler', mod: 'strawhat', likes: ['hungry', 'brave'], desc: 'Brings in hay every day.' },
  gardener: { name: 'Gardener', mod: 'flowercrown', likes: ['nerdy', 'sleepy'], desc: 'Grows herbs for the Doc.' },
  knitter: { name: 'Knitter', mod: 'yarn', likes: ['chatty', 'sleepy'], desc: 'Turns wool into blankets for cold nights.' },
  gatherer: { name: 'Gatherer', mod: 'twig', likes: ['hungry', 'chatty'], desc: 'Brings in timber and stone every day.' },
  runner: { name: 'Treadmill Crew', mod: 'sweatband', likes: ['brave', 'hungry'], desc: 'Runs the wheel. Speeds up every job on the farm.' },
  singer: { name: 'Choir', mod: 'choir', likes: ['dramatic', 'chatty'], desc: 'Sings at night. Scared sheep calm down faster.' },
  guard: { name: 'Guard', mod: 'collar', likes: [], desc: 'Chases wolves off the fold at night.' },
};
const BUILD = {
  feeder: { name: 'Feeder', w: 2, h: 1, cost: { timber: 4 }, ch: 1, desc: 'Feeds 10 sheep a day. Put it near the fold.' },
  trough: { name: 'Trough', w: 2, h: 1, cost: { timber: 3 }, ch: 1, desc: 'Waters 10 sheep a day. Put it near the fold.' },
  lean: { name: 'Shelter', w: 4, h: 2, cost: { timber: 6, stone: 2 }, ch: 1, desc: 'Room for 8 more sheep to sleep. Cramped sheep don\'t rest.' },
  workshop: { name: 'Workshop', w: 3, h: 2, cost: { timber: 6 }, ch: 1, jobs: { gatherer: 2 }, desc: 'Two Gatherers bring in timber and stone.' },
  hayBarn: { name: 'Hay Barn', w: 4, h: 3, cost: { timber: 10, stone: 2 }, ch: 1, jobs: { hauler: 2 }, desc: 'Two Hay Haulers bring in hay.' },
  well: { name: 'Well', w: 2, h: 2, cost: { stone: 6, timber: 2 }, ch: 2, jobs: { wrangler: 1 }, desc: 'A Water Wrangler draws plenty of water.' },
  watchtower: { name: 'Watchtower', w: 2, h: 2, cost: { timber: 8, stone: 4 }, ch: 2, jobs: { lookout: 1 }, desc: 'A Lookout up here spots wolves early. Wolves near it get nervous.' },
  lampPost: { name: 'Lamp Post', w: 1, h: 1, cost: { timber: 2, stone: 1 }, ch: 3, desc: 'Light in the dark. Frights fade in it and wolves keep away.' },
  herbGarden: { name: 'Herb Garden', w: 3, h: 2, cost: { timber: 3 }, ch: 3, jobs: { gardener: 1 }, desc: 'A Gardener grows herbs. Docs heal faster with herbs.' },
  infirmary: { name: 'Infirmary', w: 4, h: 3, cost: { timber: 8, wool: 2, herbs: 2 }, ch: 3, jobs: { doc: 2 }, desc: 'Two more Docs. Hurt sheep heal much faster here.' },
  loom: { name: 'Loom', w: 2, h: 2, cost: { timber: 5 }, ch: 4, jobs: { knitter: 2 }, desc: 'Knitters turn 2 wool into a blanket.' },
  treadmill: { name: 'Treadmill', w: 2, h: 2, cost: { timber: 6 }, ch: 4, jobs: { runner: 2 }, desc: 'Each runner makes every job on the farm 20% faster. They insist.' },
  choirStage: { name: 'Choir Stage', w: 3, h: 2, cost: { timber: 6, wool: 2 }, ch: 6, jobs: { singer: 4 }, desc: 'Singers at night: scared sheep calm down and wolves lose heart.' },
  olivePress: { name: 'Olive Press', w: 2, h: 2, cost: { stone: 6 }, ch: 6, desc: 'Makes 2 oil a day for lamps and healing.' },
};
NN.DEFS = { RES, RES_NAME, TRAITS, JOBS, BUILD };

// ---------------------------------------------------------------- state
const G = NN.G = {};
let uid = 1;
const newId = () => uid++;
NN.GAME = {};
const GM = NN.GAME;

GM.newGame = () => {
  uid = 1;
  for (const k of Object.keys(G)) delete G[k];
  Object.assign(G, {
    day: 1, chapter: 1, phase: 'day', t: 0, len: 150, sabbath: false, night: null, spawns: [],
    res: { timber: 10, stone: 3, hay: 30, water: 30, wool: 0, herbs: 0, oil: 0, blanket: 0 },
    sheep: [], wolves: [], frights: [], npcs: [], dogs: [], pickups: [], buildings: [], hearts: [], fx: [], shots: [], interact: [],
    xp: 0, lv: 1, lvPending: 0, S: null, flags: {}, codex: [], helpers: [], storm: false, prowler: null, form: 'shepherd',
    stats: { found: 0, joined: 0, turned: 0, forgiven: 0, scattered: 0, built: 0, lambs: 0, faded: 0, days: 0 },
    shake: 0, smokeT: 0, report: null, nameI: 0, cold: false, flash: 0, gateLock: null, bellT: 0,
  });
  resetKnacks();
  G.sh = { x: W.GX, y: W.FOLD.y + W.FOLD.h + 30, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, dir: 'down', anim: 0, stun: 0, staffT: 0, slingT: 0,
    harpT: 4, rodT: 3, breadT: 10, whistleT: 0, moving: false, swing: 0, trail: [], slowT: 0 };
  // the fold starts with two feeders and two troughs
  placeBuilding('feeder', (W.FOLD.x + 176) / 16, (W.FOLD.y + 16) / 16, true);
  placeBuilding('trough', (W.FOLD.x + 224) / 16, (W.FOLD.y + 16) / 16, true);
  placeBuilding('feeder', (W.FOLD.x + 176) / 16, (W.FOLD.y + 128) / 16, true);
  placeBuilding('trough', (W.FOLD.x + 224) / 16, (W.FOLD.y + 128) / 16, true);
};
function resetKnacks() {
  G.S = { speed: 74, staffRange: 26, staffCd: 1.0, lantern: 48, lanternLvl: 1, callR: 40, trustRate: 0.55, sling: 0, harp: 0, rod: 0, oil: 0, bread: 0, taken: {}, evo: {} };
  G.xp = 0; G.lv = 1; G.lvPending = 0;
}
GM.resetKnacks = resetKnacks;

// ---------------------------------------------------------------- resources
GM.has = cost => Object.entries(cost).every(([k, v]) => (G.res[k] || 0) >= v);
GM.spend = cost => { for (const [k, v] of Object.entries(cost)) G.res[k] -= v; };
GM.give = (gift, x, y, silent) => {
  const parts = [];
  for (const [k, v] of Object.entries(gift)) { if (!v) continue; G.res[k] = (G.res[k] || 0) + v; parts.push(`+${v} ${RES_NAME[k] || k}`); }
  if (!silent && x !== undefined) pop(x, y - 20, parts.join(' '), '#f5c542', 1.4);
  return parts.join(', ');
};
GM.costText = cost => Object.entries(cost).map(([k, v]) => `${v} ${RES_NAME[k]}`).join(', ');

// ---------------------------------------------------------------- effects
function pop(x, y, text, col = '#fff7e0', life = 1.1) { G.fx.push({ kind: 'text', x, y, text: String(text), col, t: 0, life }); }
function ring(x, y, r, col, life = 0.45) { G.fx.push({ kind: 'ring', x, y, r, col, t: 0, life }); }
GM.pop = pop; GM.ring = ring;
function dropHearts(x, y, n) { for (let i = 0; i < n; i++) G.hearts.push({ x: x + rand(-4, 4), y: y + rand(-4, 2), vx: rand(-30, 30), vy: rand(-40, -10), t: 0 }); }
GM.dropHearts = dropHearts;
const sfx = (name) => { if (NN.sfx && NN.sfx[name]) try { NN.sfx[name](); } catch (e) { /* audio is optional */ } };
GM.sfx = sfx;
const needXP = lv => 2 + lv * 2;
GM.needXP = needXP;
function addXP(n) { G.xp += n; while (G.xp >= needXP(G.lv)) { G.xp -= needXP(G.lv); G.lv++; G.lvPending++; } }
GM.addXP = addXP;
function knock(e, from, force) { const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1; e.kx = dx / d * force; e.ky = dy / d * force; }

// ---------------------------------------------------------------- movement
function steer(e, tx, ty, speed, dt, arrive = 8) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  let vx = 0, vy = 0;
  if (d > 0.5) { const sp = d < arrive ? speed * d / arrive : speed; vx = dx / d * sp; vy = dy / d * sp; }
  const k = Math.min(1, dt * 7);
  e.vx += (vx - e.vx) * k; e.vy += (vy - e.vy) * k;
}
function move(e, dt, r = 4, ghost) {
  const px = e.x, py = e.y;
  e.x += (e.vx + (e.kx || 0)) * dt; e.y += (e.vy + (e.ky || 0)) * dt;
  if (e.kx) { e.kx -= e.kx * Math.min(1, dt * 6); e.ky -= e.ky * Math.min(1, dt * 6); }
  if (Math.abs(e.vx) > 4) e.face = e.vx > 0 ? 1 : -1;
  if (Math.hypot(e.vx, e.vy) > 6) e.dir = Math.abs(e.vy) > Math.abs(e.vx) * 1.2 ? (e.vy < 0 ? 'up' : 'down') : 'side';
  e.anim = (e.anim || 0) + Math.hypot(e.vx, e.vy) * dt;
  if (!ghost) W.collide(e, r, px, py);
}
GM.steer = steer; GM.move = move; GM.knock = knock;
// Does a straight line cross a closed barrier or the river? Used to keep wolves from spawning on the wrong side.
function crossesWall(x1, y1, x2, y2) {
  const inter = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (!d) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };
  const R = W.RIVER;
  for (let i = 1; i < R.length; i++) if (inter(x1, y1, x2, y2, R[i - 1][0], R[i - 1][1], R[i][0], R[i][1])) {
    if (!(W.doors.bridge && Math.abs((y1 + y2) / 2 - W.SITES.bridge.y) < 120)) return true;
  }
  for (const [ax, ay, bx, by, , kind, door] of NN.WORLD_BARRIERS || []) {
    if (door && W.doors[door]) continue;
    if (kind === 'maze') continue;
    if (inter(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}
GM.crossesWall = crossesWall;

// ---------------------------------------------------------------- buildings
GM.bid = () => newId();
GM.setUid = n => { uid = n; };
function placeBuilding(type, tx, ty, free) {
  const d = BUILD[type];
  const b = { id: newId(), type, tx, ty, x: tx * 16, y: ty * 16, w: d.w * 16, h: d.h * 16, fx: tx * 16 + d.w * 8, fy: ty * 16 + d.h * 16, anim: 0 };
  G.buildings.push(b);
  if (!free) { GM.spend(d.cost); G.stats.built++; sfx('build'); ring(b.fx, b.fy - 8, 30, '#f5c542', 0.8); emit('built', b); }
  return b;
}
GM.placeBuilding = placeBuilding;
GM.buildingRects = () => G.buildings.filter(b => b.type !== 'lampPost').map(b => [b.x + 1, b.y + (b.type === 'watchtower' ? 4 : 2), b.w - 2, b.h - 3]);
W.dynamicRects = () => W.rects.concat(GM.buildingRects()).concat(G.buildings.filter(b => b.type === 'lampPost').map(b => [b.fx - 2, b.fy - 4, 4, 4]));
GM.canPlace = (type, tx, ty) => {
  const d = BUILD[type];
  return W.canPlace(tx * 16, ty * 16, d.w * 16, d.h * 16, G.buildings.map(b => [b.x - 2, b.y - 2, b.w + 4, b.h + 4]));
};
GM.count = type => G.buildings.filter(b => b.type === type).length;
GM.capacity = () => ({
  beds: 12 + 8 * GM.count('lean'),
  food: 10 * G.buildings.filter(b => b.type === 'feeder' && near(b, W.FOLD, 300)).length,
  drink: 10 * G.buildings.filter(b => b.type === 'trough' && near(b, W.FOLD, 300)).length,
});
const near = (b, F, d) => Math.hypot(b.fx - (F.x + F.w / 2), b.fy - (F.y + F.h / 2)) < d;

// Job slots: [type, station {x,y}, building id or null]. The fold, fire and pond give a few slots before any buildings.
GM.jobSlots = () => {
  const F = W.FOLD, slots = [];
  slots.push(['lookout', { x: F.x + 16, y: F.y + 20 }, 'fold']);
  slots.push(['doc', { x: F.x + 120, y: F.y + 120 }, 'fold']);
  slots.push(['lamp', { x: W.FIRE.x + 14, y: W.FIRE.y + 6 }, 'fire']);
  slots.push(['wrangler', { x: W.POND.x + 44, y: W.POND.y - 20 }, 'pond']);
  for (const b of G.buildings) {
    const d = BUILD[b.type];
    if (!d.jobs) continue;
    for (const [job, n] of Object.entries(d.jobs)) for (let i = 0; i < n; i++) slots.push([job, { x: b.fx - 10 + i * 12, y: b.fy + 10 }, b.id]);
  }
  for (const s of G.sheep) if (s.special === 'guard') slots.push(['guard', { x: W.GX, y: F.y + F.h - 22 }, 'guard:' + s.id]);
  return slots;
};
const slotKey = sl => sl[0] + '@' + sl[2] + '#' + sl[1].x;
GM.slotKey = slotKey;
function freeSlots() {
  const taken = new Set(G.sheep.filter(s => s.job).map(s => s.job.key));
  return GM.jobSlots().filter(sl => !taken.has(slotKey(sl)));
}
GM.freeSlots = freeSlots;
GM.canWork = s => s.state === 'home' && !s.hurt && s.fed && s.watered && s.energy > 0.3 && s.kind !== 'lamb';
GM.assignJob = (s, sl, quiet) => {
  s.job = { type: sl[0], key: slotKey(sl), station: sl[1] };
  if (!quiet) {
    pop(s.x, s.y - 18, JOBS[sl[0]].name.toUpperCase().slice(0, 12), '#f5c542', 1.6);
    emit('jobStart', { sheep: s, job: sl[0] });
  }
};
GM.clearJob = s => { s.job = null; };
// Healthy, rested sheep volunteer for open jobs; they prefer jobs that match their personality.
function volunteer() {
  const open = freeSlots().filter(sl => sl[0] !== 'guard');
  if (!open.length) return;
  const free = shuffle(G.sheep.filter(s => GM.canWork(s) && !s.job && !s.noJob && !s.special && W.insideFold(s)));
  for (const sl of open) {
    if (!free.length) break;
    let i = free.findIndex(s => JOBS[sl[0]].likes.includes(s.trait));
    if (i < 0) i = 0;
    const s = free.splice(i, 1)[0];
    GM.assignJob(s, sl);
  }
}
GM.volunteer = volunteer;
// The player asks a sheep to take a job or to rest. Sheep say yes when they're able, and no (kindly) when they're not.
GM.ask = (s, job) => {
  const tb = SCRIPT().barks && SCRIPT().barks.traits && SCRIPT().barks.traits[s.trait] || {};
  if (job === 'rest') { s.job = null; s.noJob = true; return { ok: true, line: pick(tb.nap || ['Nap time. Love that for me.']) }; }
  s.noJob = false;
  if (!GM.canWork(s)) return { ok: false, line: pick(tb.decline || ['Not today, boss.']) };
  const sl = freeSlots().find(x => x[0] === job);
  if (!sl) return { ok: false, line: 'That job is full right now.' };
  GM.assignJob(s, sl);
  return { ok: true, line: pick(tb.accept || ['On it!']) };
};

// ---------------------------------------------------------------- sheep
function nextName() {
  const names = SCRIPT().names || ['Clover', 'Biscuit', 'Pepper', 'Nugget', 'Barley', 'Sprout', 'Velvet', 'Flapjack', 'Ziggy', 'Pebble', 'Juniper', 'Cosmo', 'Waffles'];
  const used = new Set(G.sheep.map(s => s.name));
  for (let k = 0; k < names.length; k++) { const n = names[(G.nameI + k) % names.length]; if (!used.has(n)) { G.nameI += k + 1; return n; } }
  return names[G.nameI++ % names.length] + ' ' + irand(2, 9);
}
GM.addSheep = (o = {}) => {
  const s = Object.assign({
    id: newId(), name: null, key: null, look: pick(LOOKS), trait: pick(TRAITS), kind: 'sheep', swap: null,
    x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0, face: Math.random() < 0.5 ? 1 : -1, anim: 0,
    state: 'wild', trust: 0, trustMode: 'walk', lost: false, hurt: false, heal: 0, energy: 1, fed: true, watered: true, joy: 0.7,
    blanket: false, job: null, workT: 0, napT: 0, ax: 0, ay: 0, tx: 0, ty: 0, wt: 0, scaredT: 0, baaT: rand(4, 14), bite: 0,
    special: null, owner: null, cold: false, whistled: 0, noJob: false,
  }, o);
  if (!s.name) s.name = nextName();
  s.ax = s.ax || s.x; s.ay = s.ay || s.y; s.tx = s.x; s.ty = s.y;
  G.sheep.push(s);
  return s;
};
GM.sheepByKey = key => G.sheep.find(s => s.key === key);
GM.sheepById = id => G.sheep.find(s => s.id === id);
GM.flock = () => G.sheep.filter(s => ['follow', 'home', 'feast', 'nap'].includes(s.state) && !s.owner);
GM.homeCount = () => G.sheep.filter(s => s.state === 'home' || s.state === 'feast' || s.state === 'nap').length;
// Scatter n wild sheep in a region. opts: trust mode mix, swap, etc.
GM.spawnWild = (region, n, o = {}) => {
  const R = W.REGIONS[region], out = [];
  for (let k = 0; k < n; k++) {
    for (let tries = 0; tries < 120; tries++) {
      const x = R.col * W.RW + rand(40, W.RW - 40), y = R.row * W.RH + rand(50, W.RH - 30);
      if (W.inFold(x, y) || Math.hypot(x - W.FOLD.x - W.FOLD.w / 2, y - W.FOLD.y - W.FOLD.h / 2) < 200) continue;
      const probe = { x, y };
      W.collide(probe, 6);
      if (Math.hypot(probe.x - x, probe.y - y) > 0.5) continue;
      if (W.riverDist(x, y) < 40) continue;
      const modes = o.modes || ['walk', 'walk', 'walk', 'still', 'patient', 'whistle', 'stubborn'];
      out.push(GM.addSheep(Object.assign({ x, y, trustMode: pick(modes), origin: region }, o.extra || {})));
      break;
    }
  }
  return out;
};
function joinFlock(s) {
  const was = s.lost;
  s.state = 'follow'; s.trust = 0; s.owner = null;
  if (was) { s.lost = false; G.stats.found++; pop(s.x, s.y - 18, 'FOUND', '#f5c542'); ui().toast(`${s.name} knew your voice.`); emit('found', s); }
  else {
    G.stats.joined++; pop(s.x, s.y - 18, '♥', '#ef9aa0');
    const line = pick(barks('join', ['joined the flock!']));
    ui().toast(`${s.name}: ${line}`);
    emit('joined', s);
  }
  dropHearts(s.x, s.y, 2); sfx('join');
}
GM.joinFlock = joinFlock;
function goHome(s) { s.state = 'home'; s.wt = 0; emit('home', s); }
function scare(s, by) {
  if (['chomp', 'scene', 'penned', 'special'].includes(s.state) || s.immune) return;
  const wasOut = !W.insideFold(s);
  s.from = { x: by.x, y: by.y }; s.scaredT = wasOut ? 2.4 : 1.4; s.state = 'scared'; s.hurt = true; s.joy = Math.max(0, s.joy - 0.15);
  if (s.job && wasOut) s.job = null;
  pop(s.x, s.y - 18, '!', '#d8574f'); sfx('hurt');
  if (wasOut) { G.stats.scattered++; emit('scattered', s); }
}
GM.scare = scare;

const trailPoint = i => {
  const tr = G.sh.trail, idx = tr.length - 1 - (8 + (i >> 1) * 4);
  if (idx < 0) return { x: G.sh.x - G.sh.face * 14, y: G.sh.y + 4 };
  return tr[idx];
};
function updSheep(s, dt) {
  const sp = (s.hurt ? 0.65 : 1) * (s.cold ? 0.85 : 1) * (s.kind === 'lamb' ? 1.05 : 1);
  s.baaT -= dt; s.whistled = Math.max(0, s.whistled - dt);
  if (s.baaT <= 0) {
    s.baaT = rand(7, 18);
    if (Math.abs(s.x - G.sh.x) < 190 && Math.abs(s.y - G.sh.y) < 110 && !['scared', 'scene'].includes(s.state)) {
      const kind = s.state === 'wild' ? (s.lost ? 'lost' : 'wild') : s.joy > 0.8 ? 'happy' : 'idle';
      let txt = pick(barks('pop.' + kind, ['BAA', 'MEH']));
      if (s.state === 'home' && !s.fed) txt = 'HUNGRY';
      else if (s.state === 'home' && !s.watered) txt = 'THIRSTY';
      else if (s.cold) txt = 'BRR';
      pop(s.x, s.y - 18, txt.slice(0, 8), '#fff7e0', 0.9);
      if (Math.random() < 0.4) sfx('baa');
    }
  }
  const ai = s.aiKey && NN.STORY && NN.STORY.AI[s.aiKey];
  if (ai && ai(s, dt) !== false) { move(s, dt, 5); return; }
  switch (s.state) {
    case 'wild': updWild(s, dt, sp); break;
    case 'follow': {
      const p = trailPoint(s.fi || 0), side = (s.fi & 1 ? 6 : -6);
      const d = dist(s, G.sh);
      if (d > 320 && !NN.onScreen(s.x, s.y, 20)) { // catch up out of sight
        const q = trailPoint(s.fi || 0); s.x = q.x + rand(-6, 6); s.y = q.y + rand(-4, 4);
      }
      const [tx, ty] = W.insideFold(G.sh) || W.insideFold(s) ? W.nav(s, p.x + side, p.y) : [p.x + side, p.y];
      steer(s, tx, ty, (d > 90 ? 90 : 66) * (s.hurt ? 0.85 : 1), dt, 12);
      if (W.insideFold(s)) goHome(s);
      break;
    }
    case 'home': updHome(s, dt, sp); break;
    case 'nap': {
      steer(s, s.x, s.y, 0, dt); s.napT -= dt; s.energy = Math.min(1, s.energy + dt * 0.02);
      if (Math.random() < dt * 0.8) pop(s.x + 4, s.y - 16, 'Z', '#cfe3ff', 1.2);
      if (s.napT <= 0) s.state = 'home';
      break;
    }
    case 'feast': {
      const t = G.feastSpot ? { x: G.feastSpot.x + (s.id % 11 - 5) * 9, y: G.feastSpot.y + 22 + ((s.id >> 3) % 3) * 9 } : { x: s.x, y: s.y };
      steer(s, t.x, t.y, 40, dt, 6);
      break;
    }
    case 'scared': {
      s.scaredT -= dt * (G.choirOn ? 1.6 : 1);
      const dx = s.x - s.from.x, dy = s.y - s.from.y, d = Math.hypot(dx, dy) || 1;
      steer(s, s.x + dx / d * 40, s.y + dy / d * 40, 76 * sp, dt, 1);
      if (s.scaredT <= 0) {
        if (W.insideFold(s)) s.state = 'home';
        else { s.state = 'wild'; s.lost = true; s.trust = 0; s.trustMode = 'walk'; s.ax = s.x; s.ay = s.y; s.wt = 0; }
      }
      break;
    }
    case 'stolen': {
      const L = s.leader;
      if (!L) { s.state = 'follow'; break; }
      const i = s.fi || 0;
      const [tx, ty] = W.nav(s, L.x - (L.face || 1) * 12 + (i % 2) * 7, L.y + i * 6 - 4);
      steer(s, tx, ty, 60, dt, 10);
      break;
    }
    case 'penned': {
      s.wt -= dt;
      if (s.wt <= 0) { s.tx = s.ax + rand(-28, 28); s.ty = s.ay + rand(-18, 18); s.wt = rand(2, 5); }
      steer(s, s.tx, s.ty, 14, dt, 6);
      break;
    }
    case 'scene': steer(s, s.x, s.y, 0, dt); break;
  }
  move(s, dt, 5);
}
function updWild(s, dt, sp) {
  const d = dist(s, G.sh), S = G.S;
  const wander = speed => {
    s.wt -= dt;
    if (s.wt <= 0) { s.tx = s.ax + rand(-30, 30); s.ty = s.ay + rand(-22, 22); s.wt = rand(2, 5); }
    steer(s, s.tx, s.ty, speed * sp, dt, 6);
  };
  const flee = (speed, from = G.sh) => { const dx = s.x - from.x, dy = s.y - from.y, n = Math.hypot(dx, dy) || 1; steer(s, s.x + dx / n * 30, s.y + dy / n * 30, speed, dt, 1); };
  const gain = r => { s.trust += dt * r * S.trustRate * (s.lost ? 2 : 1); if (s.trust >= 1) GM.joinFlock(s); };
  const shepherd = G.form === 'shepherd';
  switch (s.trustMode) {
    case 'still': {
      if (d < 76 && shepherd) {
        if (G.sh.moving) {
          flee(34); s.trust = Math.max(0, s.trust - dt * 0.3);
          if (s.bites && d < 14 && s.bite <= 0) {
            s.bite = 2.2; G.sh.stun = 0.7; knock(G.sh, s, 120); G.shake = 0.25; sfx('hurt'); pop(s.x, s.y - 18, 'CHOMP!', '#d8574f');
            emit('bitten', s);
          }
        } else { steer(s, G.sh.x + (s.x < G.sh.x ? -16 : 16), G.sh.y, 12, dt, 6); gain(0.45); }
        emit('near', s);
      } else wander(14);
      s.bite -= dt;
      break;
    }
    case 'patient': { // hides if you rush in; comes to you if you give it space
      if (d < 44 && shepherd) { flee(48); s.trust = Math.max(0, s.trust - dt * 0.4); }
      else if (d < 100 && shepherd && !(G.sh.moving && approaching(s))) { steer(s, G.sh.x, G.sh.y, 10, dt, 40); gain(0.5); }
      else wander(14);
      if (d < 100) emit('near', s);
      break;
    }
    case 'whistle': {
      if (d < 90 && s.whistled > 0 && shepherd) gain(1.6);
      else if (d < 30 && shepherd) flee(30);
      else wander(12);
      if (d < 100) emit('near', s);
      break;
    }
    case 'gift': {
      if (d < 26 && shepherd) steer(s, s.x, s.y, 0, dt); else wander(10);
      if (d < 100) emit('near', s);
      break;
    }
    case 'stubborn': {
      if (d < 70 && shepherd) flee(52); else wander(16);
      for (const g of G.dogs) if (dist(g, s) < 44) { s.trust += dt * 0.35; if (s.trust >= 1) GM.joinFlock(s); }
      if (d < 100) emit('near', s);
      break;
    }
    case 'none': wander(12); break;
    default: {
      wander(14);
      if (d < S.callR) gain(shepherd ? 1 : 1.4); else s.trust = Math.max(0, s.trust - dt * 0.12);
    }
  }
}
const approaching = s => { const dx = s.x - G.sh.x, dy = s.y - G.sh.y; return dx * G.sh.vx + dy * G.sh.vy > 0; };
function updHome(s, dt, sp) {
  const night = G.phase === 'night', F = W.FOLD;
  let tx = s.tx, ty = s.ty;
  // work by day; lookouts and lamplighters also by night; everyone else comes home at dusk
  const working = s.job && (!night || ['lookout', 'lamp', 'guard', 'singer'].includes(s.job.type)) && GM.canWork(s);
  if (s.job && !GM.canWork(s) && s.energy <= 0.3) { s.job = null; }
  if (working) {
    const st = s.job.station;
    if (s.job.type === 'guard' && night) {
      let best = null, bd = 120;
      for (const w of G.wolves) if (!w.flee && dist(w, W.FIRE) < 150) { const d = dist(w, s); if (d < bd) { bd = d; best = w; } }
      if (best) {
        [tx, ty] = W.nav(s, best.x, best.y);
        s.bite -= dt;
        if (bd < 12 && s.bite <= 0) { s.bite = 1.1; best.fear += 1; knock(best, s, 110); pop(best.x, best.y - 14, 'CHOMP', '#f5c542'); sfx('bark'); }
        steer(s, tx, ty, 66, dt, 6);
        return;
      }
    }
    if (s.job.type === 'doc') {
      const p = G.sheep.find(q => q.hurt && q.state === 'home' && W.insideFold(q));
      [tx, ty] = p ? [p.x + 11, p.y] : W.nav(s, st.x, st.y);
    } else [tx, ty] = W.nav(s, st.x, st.y);
    const at = Math.hypot(s.x - st.x, s.y - st.y) < 16 || s.job.type === 'doc';
    if (at) { s.workT += dt; s.energy -= dt * (s.trait === 'sleepy' ? 0.006 : 0.0045); if (Math.random() < dt * 0.25) s.anim += 3; }
    if (s.energy < 0.2) { s.state = 'nap'; s.napT = rand(14, 22); s.job = null; pop(s.x, s.y - 18, 'NAP', '#cfe3ff', 1.2); return; }
  } else {
    // wander home: inside the fold, or out to the meadow by day if the gate is open and it's nice out
    s.wt -= dt;
    if (s.wt <= 0 || !W.inFold(s.tx, s.ty)) { s.tx = rand(F.x + 16, F.x + F.w - 16); s.ty = rand(F.y + 20, F.y + F.h - 20); s.wt = rand(3, 8); }
    [tx, ty] = W.nav(s, s.tx, s.ty);
    if (s.trait === 'sleepy' && !night && Math.random() < dt * 0.004 && s.energy < 0.9) { s.state = 'nap'; s.napT = rand(8, 14); return; }
  }
  steer(s, tx, ty, (working ? 34 : 22) * sp, dt, 6);
  // healing
  if (s.hurt && W.insideFold(s) || s.hurt && G.buildings.some(b => b.type === 'infirmary' && Math.hypot(b.fx - s.x, b.fy - s.y) < 50)) {
    const docs = G.sheep.filter(q => q.job && q.job.type === 'doc' && q.state === 'home').length;
    const infirm = G.buildings.some(b => b.type === 'infirmary');
    const rate = docs ? (1 + docs * 0.5) * (infirm ? 1.6 : 1) * (G.res.herbs > 0 ? 1.5 : 1) / 10 : 0;
    s.heal += dt * rate;
    if (s.heal >= 1) {
      s.hurt = false; s.heal = 0; pop(s.x, s.y - 18, '+', '#f5c542'); dropHearts(s.x, s.y, 1);
      if (G.res.herbs > 0 && Math.random() < 0.5) G.res.herbs--;
      emit('healed', s);
    }
  }
}

// ---------------------------------------------------------------- people (story NPCs and redeemed helpers)
GM.addNPC = o => { const n = Object.assign({ id: o.id, look: o.look || o.id, x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, dir: 'down', anim: 0, state: 'idle', home: null, wt: 0, tx: 0, ty: 0 }, o); n.home = n.home || { x: n.x, y: n.y }; n.tx = n.x; n.ty = n.y; G.npcs = G.npcs.filter(q => q.id !== n.id); G.npcs.push(n); return n; };
GM.npc = id => G.npcs.find(n => n.id === id);
GM.removeNPC = id => { G.npcs = G.npcs.filter(n => n.id !== id); };
function updNPC(n, dt) {
  const ai = n.aiKey && NN.STORY && NN.STORY.AI[n.aiKey];
  if (ai && ai(n, dt) !== false) { move(n, dt, 4, n.ghost); return; }
  if (n.state === 'scene' || n.state === 'still') { steer(n, n.x, n.y, 0, dt); move(n, dt, 4); return; }
  if (n.state === 'follow') { const p = trailPoint(3); steer(n, p.x + 10, p.y, dist(n, G.sh) > 80 ? 90 : 60, dt, 12); move(n, dt, 4); return; }
  // wander near home
  n.wt -= dt;
  if (n.wt <= 0) { n.tx = n.home.x + rand(-40, 40); n.ty = n.home.y + rand(-26, 26); n.wt = rand(3, 7); }
  steer(n, n.tx, n.ty, n.speed || 24, dt, 6);
  move(n, dt, 4);
  if (Math.hypot(n.vx, n.vy) < 4 && dist(n, G.sh) < 60) { n.dir = 'side'; n.face = G.sh.x < n.x ? -1 : 1; }
}

// ---------------------------------------------------------------- pickups
const PICKUP = { branchPile: { timber: [2, 3] }, rockPile: { stone: [1, 2] }, herbPlant: { herbs: [1, 2] }, oilJar: { oil: [1, 2] } };
GM.spawnPickups = () => {
  for (const id of Object.keys(W.REGIONS)) {
    if (!W.isRevealed(id)) continue;
    const R = W.REGIONS[id], have = G.pickups.filter(p => p.region === id).length;
    const want = id === 'meadow' ? 10 : 8;
    for (let k = have; k < want; k++) {
      const kinds = ['branchPile', 'branchPile', 'rockPile'];
      if (['thorns', 'river', 'marsh'].includes(W.regionId(id))) kinds.push('herbPlant', 'herbPlant');
      if (id === 'highlands') kinds.push('oilJar', 'oilJar');
      const kind = pick(kinds);
      for (let tries = 0; tries < 40; tries++) {
        const x = R.col * W.RW + rand(30, W.RW - 30), y = R.row * W.RH + rand(40, W.RH - 20);
        const probe = { x, y }; W.collide(probe, 6);
        if (Math.hypot(probe.x - x, probe.y - y) > 0.5 || W.inFold(x, y) || W.riverDist(x, y) < 36) continue;
        G.pickups.push({ kind, x, y, region: id }); break;
      }
    }
  }
};
function updPickups() {
  if (G.form !== 'shepherd' && G.form !== 'sheep') return;
  for (const p of G.pickups) {
    if (Math.hypot(p.x - G.sh.x, p.y - G.sh.y) < 12) {
      p.got = true;
      const gift = {};
      for (const [k, [a, b]] of Object.entries(PICKUP[p.kind])) gift[k] = irand(a, b);
      GM.give(gift, p.x, p.y); sfx('collect');
      emit('pickup', p);
    }
  }
  G.pickups = G.pickups.filter(p => !p.got);
}

// ---------------------------------------------------------------- foes
GM.spawnWolf = (o = {}) => {
  const center = o.near || (G.sh && dist(G.sh, W.FIRE) < 500 ? W.FIRE : G.sh);
  for (let tries = 0; tries < 40; tries++) {
    const a = rand(0, TAU), R = rand(250, 320);
    const x = clamp(center.x + Math.cos(a) * R, 20, W.WW - 20), y = clamp(center.y + Math.sin(a) * R, 30, W.WH - 10);
    if (!W.isRevealed(W.regionAt(x, y)) && !o.anywhere) continue;
    if (crossesWall(x, y, center.x, center.y)) continue;
    const probe = { x, y }; W.collide(probe, 6);
    if (Math.hypot(probe.x - x, probe.y - y) > 1) continue;
    const alpha = !!o.alpha;
    const w = { x, y, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, anim: 0, fear: 0, fearMax: (G.night ? G.night.fear : 3) + (alpha ? 3 : 0), alpha, flee: 0, rest: 0, root: 0, speed: alpha ? 56 : 48, target: o.target || null };
    G.wolves.push(w);
    const lookouts = G.sheep.filter(s => s.job && s.job.type === 'lookout' && s.state === 'home');
    if (lookouts.length) { sfx('bell'); pop(lookouts[0].x, lookouts[0].y - 20, 'DING', '#f5c542', 0.8); }
    emit('wolfSpawn', w);
    return w;
  }
  return null;
};
function turnWolf(w) { w.flee = 2.8; G.stats.turned++; dropHearts(w.x, w.y, w.alpha ? 3 : 1); sfx('yelp'); pop(w.x, w.y - 14, pick(['YIPE', 'NOPE', '!', 'BYE']), '#d4d5e0', 0.8); emit('wolfTurned', w); }
GM.lights = () => {
  const L = [], flick = Math.sin(performance.now() / 90) * 1.5;
  if (G.form === 'shepherd') L.push([G.sh.x, G.sh.y - 14, G.S.lantern + flick]);
  else L.push([G.sh.x, G.sh.y - 8, 26]);
  L.push([W.FIRE.x, W.FIRE.y - 4, fireR() + flick]);
  L.push([W.HUT.x + 16, W.HUT.y - 18, 22]);
  for (const b of G.buildings) {
    if (b.type === 'lampPost') L.push([b.fx, b.fy - 20, 62 + flick]);
    if (b.type === 'watchtower') L.push([b.fx, b.fy - 40, 26]);
    if (b.type === 'infirmary') L.push([b.fx, b.fy - 20, 22]);
  }
  for (const n of G.npcs) if (n.lantern) L.push([n.x, n.y - 12, 34 + flick]);
  return L;
};
const fireR = () => (58 + (G.sheep.some(s => s.job && s.job.type === 'lamp' && s.state === 'home') ? 26 : 0) + (G.helpers.includes('jory') ? 8 : 0)) * (G.S.evo.city ? 1.5 : 1);
GM.fireR = fireR;
function inLight(x, y, scale = 1) {
  for (const [lx, ly, r] of GM.lights()) if (Math.hypot(x - lx, y - ly) < r * scale) return true;
  return false;
}
function updWolf(w, dt) {
  if (w.flee > 0) {
    const dx = w.x - G.sh.x, dy = w.y - G.sh.y, d = Math.hypot(dx, dy) || 1;
    w.vx = dx / d * 100; w.vy = dy / d * 100; w.flee -= dt;
    w.x += w.vx * dt; w.y += w.vy * dt; w.face = w.vx > 0 ? 1 : -1; w.anim += 100 * dt;
    if (w.flee <= 0 || w.x < -20 || w.x > W.WW + 20 || w.y < -20 || w.y > W.WH + 20) w.gone = true;
    return;
  }
  if (w.root > 0) { w.root -= dt; w.vx *= 0.8; w.vy *= 0.8; move(w, dt, 5); return; }
  let slow = 1;
  const S = G.S, dsh = dist(w, G.sh);
  if (G.form === 'shepherd' && dsh < S.lantern) { w.fear += dt * 0.25 * S.lanternLvl; slow = 0.62; }
  if (dist(w, W.FIRE) < fireR() * 0.8) { w.fear += dt * (G.sheep.some(s => s.job && s.job.type === 'lamp') ? 0.45 : 0.15); slow *= 0.75; }
  for (const b of G.buildings) {
    if (b.type === 'lampPost' && Math.hypot(w.x - b.fx, w.y - b.fy) < 56) { w.fear += dt * 0.3; slow *= 0.8; }
    if (b.type === 'watchtower' && Math.hypot(w.x - b.fx, w.y - b.fy) < 90 && G.sheep.some(s => s.job && s.job.key && s.job.key.includes('@' + b.id + '#'))) { w.fear += dt * 0.2; }
  }
  if (G.choirOn && dist(w, W.FIRE) < 220) w.fear += dt * 0.12;
  if (w.fear >= w.fearMax) { turnWolf(w); return; }
  if (w.rest > 0) {
    w.rest -= dt;
    const dx = w.x - w.rx, dy = w.y - w.ry, d = Math.hypot(dx, dy) || 1;
    steer(w, w.x + dx / d * 30, w.y + dy / d * 30, 40, dt, 1);
  } else {
    let best = w.target && !w.target.gone && ['wild', 'follow', 'home', 'penned', 'nap'].includes(w.target.state) ? w.target : null, bd = 1e9;
    if (!best) for (const s of G.sheep) {
      if (['scared', 'chomp', 'scene', 'special'].includes(s.state) || (s.job && s.job.type === 'guard') || s.immune) continue;
      const d = dist(w, s) + (W.insideFold(s) ? 90 : 0);
      if (d < bd && d < 520) { bd = d; best = s; }
    }
    if (best) {
      const [tx, ty] = W.nav(w, best.x, best.y);
      steer(w, tx, ty, w.speed * slow, dt, 1);
      if (dist(w, best) < 9) { scare(best, w); w.rest = 1.7; w.rx = best.x; w.ry = best.y; }
    } else steer(w, G.sh.x, G.sh.y, 40 * slow, dt, 1);
    if (dsh < 10 && G.sh.stun <= 0) { G.sh.stun = 0.4; knock(G.sh, w, 110); w.rest = 1; w.rx = G.sh.x; w.ry = G.sh.y; G.shake = 0.2; sfx('hurt'); }
  }
  move(w, dt, 5);
}
GM.spawnFright = (o = {}) => {
  const center = o.near || G.sh;
  const a = rand(0, TAU), R = rand(200, 260);
  const f = { x: clamp(center.x + Math.cos(a) * R, 20, W.WW - 20), y: clamp(center.y + Math.sin(a) * R, 30, W.WH - 10), vx: 0, vy: 0, hp: 1, anim: 0, face: 1, t: rand(0, 5) };
  G.frights.push(f);
  return f;
};
function updFright(f, dt) {
  f.t += dt; f.anim += dt * 6;
  let lit = false;
  for (const [lx, ly, r] of GM.lights()) if (Math.hypot(f.x - lx, f.y - ly) < r) { lit = true; break; }
  if (lit) { f.hp -= dt * (G.S.evo.songs ? 1.4 : 0.8); if (Math.random() < dt * 4) G.fx.push({ kind: 'spark', x: f.x + rand(-5, 5), y: f.y - rand(4, 14), t: 0, life: 0.5 }); }
  if (f.hp <= 0) { f.gone = true; G.stats.faded++; dropHearts(f.x, f.y, 1); pop(f.x, f.y - 14, 'POOF', '#cfe3ff', 0.8); emit('frightFaded', f); return; }
  let best = null, bd = 1e9;
  for (const s of G.sheep) {
    if (['scared', 'scene', 'special'].includes(s.state) || s.immune) continue;
    const d = dist(f, s);
    if (d < bd && d < 400) { bd = d; best = s; }
  }
  const tx = best ? best.x : G.sh.x, ty = best ? best.y - 4 : G.sh.y;
  const speed = lit ? 14 : 30;
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
  f.vx += ((dx / d) * speed + Math.sin(f.t * 2) * 10 - f.vx) * Math.min(1, dt * 3);
  f.vy += ((dy / d) * speed + Math.cos(f.t * 1.7) * 8 - f.vy) * Math.min(1, dt * 3);
  f.x += f.vx * dt; f.y += f.vy * dt; f.face = f.vx > 0 ? 1 : -1;
  if (best && bd < 10) { scare(best, f); f.hp -= 0.25; f.x -= dx / d * 20; f.y -= dy / d * 20; }
}

// ---------------------------------------------------------------- the Shepherd and his kit
const KNACKS = [
  { id: 'staff', name: 'Longer Staff', desc: 'Reach the ones just out of reach.', max: 4, apply() { G.S.staffRange += 6; } },
  { id: 'quick', name: 'Quick Hands', desc: 'Swing the staff more often.', max: 4, apply() { G.S.staffCd *= 0.8; } },
  { id: 'lantern', name: 'Brighter Lantern', desc: 'The dark has to back off a little more.', max: 4, apply() { G.S.lantern += 11; G.S.lanternLvl += 0.6; } },
  { id: 'sandals', name: 'Swift Sandals', desc: 'Shepherding is a cardio sport.', max: 3, apply() { G.S.speed += 10; } },
  { id: 'voice', name: 'Kind Voice', desc: 'Wild sheep trust you faster, from farther off.', max: 3, apply() { G.S.callR += 10; G.S.trustRate *= 1.3; } },
  { id: 'sling', name: 'Sling', desc: 'Pebbles that say "not today." A shepherd boy made this famous.', max: 4, apply() { G.S.sling++; } },
  { id: 'harp', name: 'Harp Song', desc: 'A tune that makes wolves rethink their choices.', max: 3, apply() { G.S.harp++; } },
  { id: 'rod', name: 'The Rod', desc: 'Thump the ground. Wolves nearby freeze in place.', max: 3, apply() { G.S.rod++; } },
  { id: 'oil', name: 'Oil', desc: 'Hurt sheep near you heal. A little goes a long way.', max: 3, apply() { G.S.oil++; } },
  { id: 'bread', name: 'Bread & Fish', desc: 'Every so often, everyone near you gets a snack. There is always enough.', max: 3, apply() { G.S.bread++; } },
  { id: 'goodness', name: 'Goodness', desc: 'A very good dog. Follows you everywhere. Stays for good.', max: 1, once: true, apply() { addDog('goodness'); } },
  { id: 'mercy', name: 'Mercy', desc: 'Goodness has a sister. She follows you too.', max: 1, once: true, req: 'goodness', apply() { addDog('mercy'); } },
];
const EVOS = [
  { id: 'city', name: 'City on a Hill', needs: ['lantern', 'voice'], desc: 'The fire and your lantern burn half again as bright. Wolves give the fold a wide berth.' },
  { id: 'rodstaff', name: 'Rod and Staff', needs: ['staff', 'rod'], desc: 'Every staff swing also freezes the wolves it hits.' },
  { id: 'stones', name: 'Five Smooth Stones', needs: ['sling', 'quick'], desc: 'Your sling throws five stones at once.' },
  { id: 'songs', name: 'Songs in the Night', needs: ['harp', 'lantern'], desc: 'Harp Song chases frights away and calms the whole flock.' },
];
GM.KNACKS = KNACKS; GM.EVOS = EVOS;
GM.knackChoices = () => {
  const S = G.S, out = [];
  for (const e of EVOS) if (!S.evo[e.id] && e.needs.every(n => (S.taken[n] || 0) >= KNACKS.find(k => k.id === n).max)) out.push(Object.assign({ evo: true, max: 1 }, e));
  const pool = KNACKS.filter(k => (S.taken[k.id] || 0) < k.max && (!k.req || G.dogs.some(d => d.kind === k.req)) && !(k.once && G.dogs.some(d => d.kind === k.id)));
  return out.concat(shuffle(pool.slice())).slice(0, 3);
};
GM.takeKnack = k => {
  if (k.evo) { G.S.evo[k.id] = true; emit('evolution', k); return; }
  G.S.taken[k.id] = (G.S.taken[k.id] || 0) + 1; k.apply();
};
function addDog(kind) {
  G.dogs.push({ kind, x: G.sh.x, y: G.sh.y + 6, vx: 0, vy: 0, kx: 0, ky: 0, face: 1, anim: 0, cd: 0, dash: null });
  sfx('bark'); emit('dog', kind);
}
GM.addDog = addDog;

GM.whistle = () => {
  const sh = G.sh;
  if (sh.whistleT > 0) return;
  sh.whistleT = 3; sfx(G.form === 'sheep' ? 'baa' : 'whistle'); ring(sh.x, sh.y - 12, 90, '#f5c542', 0.6);
  for (const s of G.sheep) {
    if (dist(s, sh) > 90) continue;
    if (s.state === 'wild') {
      s.whistled = 4;
      if (s.trustMode === 'walk') s.trust = Math.min(0.99, s.trust + (s.lost ? 0.6 : 0.3));
      if (s.trustMode === 'stubborn') { s.trust += 0.34; if (s.trust >= 1) GM.joinFlock(s); }
      if (s.trustMode === 'still') { s.trust = Math.max(0, s.trust - 0.3); pop(s.x, s.y - 18, '!', '#d8574f'); }
    }
    if (s.state === 'scared') s.scaredT = Math.min(s.scaredT, 0.4);
  }
  if (G.form === 'sheep') for (const w of G.wolves) if (!w.flee && dist(w, sh) < 50) { w.fear += 0.5; knock(w, sh, 80); }
  emit('whistle');
};
function updShepherd(dt, input) {
  const sh = G.sh, S = G.S;
  let ix = input.x, iy = input.y;
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  if (sh.stun > 0) { sh.stun -= dt; ix = iy = 0; }
  sh.slowT = Math.max(0, sh.slowT - dt);
  const speed = (G.form === 'sheep' ? 66 : S.speed) * (sh.slowT > 0 ? 0.5 : 1);
  sh.vx = ix * speed; sh.vy = iy * speed; sh.moving = Math.hypot(ix, iy) > 0.15;
  const f = sh.face, dr = sh.dir;
  move(sh, dt, 4);
  if (G.gateLock) { // the final night: the Shepherd stands in the gate
    const L = G.gateLock, dx = sh.x - L.x, dy = sh.y - L.y, d = Math.hypot(dx, dy);
    if (d > L.r) { sh.x = L.x + dx / d * L.r; sh.y = L.y + dy / d * L.r; }
  }
  sh.face = Math.abs(ix) > 0.2 ? (ix > 0 ? 1 : -1) : f;
  sh.dir = sh.moving ? (Math.abs(iy) > Math.abs(ix) * 1.2 ? (iy < 0 ? 'up' : 'down') : 'side') : dr;
  sh.whistleT = Math.max(0, sh.whistleT - dt); sh.swing = Math.max(0, sh.swing - dt);
  const last = sh.trail[sh.trail.length - 1];
  if (!last || Math.hypot(last.x - sh.x, last.y - sh.y) > 5) { sh.trail.push({ x: sh.x, y: sh.y }); if (sh.trail.length > 420) sh.trail.shift(); }
  // thorns scratch and slow
  for (const o of W.query(sh.x - 16, sh.y - 16, sh.x + 16, sh.y + 16)) if (o.thorn && !o.door && Math.hypot(o.x - sh.x, o.y - 4 - sh.y) < 11) { if (sh.slowT <= 0) pop(sh.x, sh.y - 38, 'OW', '#d8574f', 0.6); sh.slowT = 0.6; }

  if (G.form === 'sheep') { // Woolsworth's headbutt
    sh.staffT -= dt;
    if (sh.staffT <= 0) {
      const hit = G.wolves.filter(w => !w.flee && dist(w, sh) < 18);
      if (hit.length) { for (const w of hit) { w.fear += 1; knock(w, sh, 100); } sh.staffT = 1.1; sfx('swing'); pop(sh.x, sh.y - 20, 'BONK', '#fff7e0', 0.6); }
      else sh.staffT = 0.1;
    }
    return;
  }
  // staff
  sh.staffT -= dt;
  if (sh.staffT <= 0) {
    const hit = G.wolves.filter(w => !w.flee && dist(w, sh) < S.staffRange);
    if (hit.length) {
      for (const w of hit) { w.fear += 1; knock(w, sh, 120); if (S.evo.rodstaff) w.root = 1; }
      sh.swing = 0.25; sh.staffT = S.staffCd; sfx('swing');
      G.fx.push({ kind: 'arc', x: sh.x, y: sh.y - 12, r: S.staffRange, t: 0, life: 0.25, a: Math.atan2(hit[0].y - sh.y, hit[0].x - sh.x) });
    } else sh.staffT = 0.08;
  }
  const night = G.phase === 'night';
  if (S.sling && (night || G.wolves.length)) {
    sh.slingT -= dt;
    if (sh.slingT <= 0) {
      let best = null, bd = 140;
      for (const w of G.wolves) if (!w.flee) { const d = dist(w, sh); if (d < bd) { bd = d; best = w; } }
      if (best) {
        const n = S.evo.stones ? 5 : 1;
        for (let i = 0; i < n; i++) G.shots.push({ x: sh.x, y: sh.y - 20, tgt: i === 0 ? best : pick(G.wolves.filter(w => !w.flee && dist(w, sh) < 160)) || best, delay: i * 0.08 });
        sh.slingT = 2.0 / (1 + 0.35 * (S.sling - 1));
      } else sh.slingT = 0.2;
    }
  }
  if (S.harp && (night || G.wolves.length || G.frights.length)) {
    sh.harpT -= dt;
    if (sh.harpT <= 0) {
      sh.harpT = 8 - S.harp * 1.4;
      const R = 52 + S.harp * 12;
      ring(sh.x, sh.y - 12, R, '#9fb4ff', 0.8);
      if (NN.sfxOk && NN.sfxOk()) { const t = NN.audio.ctx.currentTime; [69, 72, 76, 81].forEach((m, i) => NN.note(t + i * 0.05, NN.mf(m), 0.4, 'triangle', 0.06)); }
      for (const w of G.wolves) if (!w.flee && dist(w, sh) < R) { w.fear += 1; knock(w, sh, 150); }
      if (S.evo.songs) { for (const f of G.frights) if (dist(f, sh) < R * 1.5) f.hp -= 0.6; for (const s of G.sheep) if (s.state === 'scared') s.scaredT = 0.2; }
    }
  }
  if (S.rod && (night || G.wolves.length)) {
    sh.rodT -= dt;
    if (sh.rodT <= 0) {
      const near = G.wolves.filter(w => !w.flee && dist(w, sh) < 44);
      if (near.length) { sh.rodT = 6 - S.rod; for (const w of near) { w.root = 1 + S.rod * 0.4; w.fear += 0.5; } ring(sh.x, sh.y, 44, '#c58d55', 0.4); G.shake = 0.15; sfx('swing'); }
      else sh.rodT = 0.3;
    }
  }
  if (S.oil) for (const s of G.sheep) if (s.hurt && dist(s, sh) < 30 + S.oil * 10) { s.heal += dt * (0.08 + S.oil * 0.06); if (s.heal >= 1) { s.hurt = false; s.heal = 0; pop(s.x, s.y - 18, '+', '#f5c542'); emit('healed', s); } }
  if (S.bread) {
    sh.breadT -= dt;
    if (sh.breadT <= 0) {
      sh.breadT = 26 - S.bread * 5;
      let n = 0;
      for (const s of G.sheep) if (dist(s, sh) < 70 && ['follow', 'home', 'wild'].includes(s.state)) { s.joy = Math.min(1, s.joy + 0.15); s.energy = Math.min(1, s.energy + 0.2); if (s.state === 'wild') s.trust += 0.15; n++; }
      if (n) { ring(sh.x, sh.y - 8, 70, '#f5dd8a', 0.7); pop(sh.x, sh.y - 40, 'SNACKS', '#f5dd8a', 1); sfx('munch'); }
    }
  }
}
function updDog(g, i, dt) {
  g.cd -= dt;
  if (g.dash && (g.dash.gone || g.dash.flee > 0)) g.dash = null;
  if ((G.phase === 'night' || G.wolves.length) && !g.dash && g.cd <= 0) {
    let best = null, bd = 88;
    for (const w of G.wolves) if (!w.flee) { const d = dist(w, G.sh); if (d < bd) { bd = d; best = w; } }
    g.dash = best;
  }
  if (g.dash) {
    steer(g, g.dash.x, g.dash.y, 120, dt, 1);
    if (dist(g, g.dash) < 10) { g.dash.fear += 1; knock(g.dash, g, 120); pop(g.x, g.y - 12, 'WOOF', '#fff7e0', 0.6); sfx('bark'); g.dash = null; g.cd = 1.5; }
  } else {
    const p = trailPoint(i * 2);
    steer(g, p.x + (i === 0 ? -12 : 12), p.y + 4, dist(g, G.sh) > 60 ? 106 : 80, dt, 10);
    if (dist(g, G.sh) > 300 && !NN.onScreen(g.x, g.y, 20)) { g.x = p.x; g.y = p.y; }
    if (G.phase === 'day') for (const s of G.sheep) if (s.state === 'wild' && dist(s, g) < 44 && s.trustMode !== 'stubborn') s.trust += dt * 0.1;
  }
  move(g, dt, 4);
}

// ---------------------------------------------------------------- the calendar
// Night settings come from the story (NN.STORY.nightFor(day)); defaults keep the game safe without it.
GM.dayLength = () => (G.sabbath ? 110 : 160);
GM.startNight = () => {
  const cfg = (NN.STORY && NN.STORY.nightFor && NN.STORY.nightFor(G.day)) || { len: 60, wolves: 6, fear: 3 };
  G.night = cfg; G.phase = 'night'; G.t = 0; G.len = cfg.len; G.spawns = [];
  const n = cfg.wolves || 0;
  for (let i = 0; i < n; i++) G.spawns.push({ at: 3 + (cfg.len * 0.75) * i / Math.max(1, n) + rand(0, 2), kind: i < (cfg.alphas || 0) ? 'alpha' : 'wolf' });
  for (let i = 0; i < (cfg.frights || 0); i++) G.spawns.push({ at: 5 + (cfg.len * 0.7) * i / cfg.frights + rand(0, 2), kind: 'fright' });
  G.spawns.sort((a, b) => a.at - b.at);
  G.storm = !!cfg.storm; G.cold = !!cfg.cold;
  G.choirOn = G.sheep.filter(s => s.job && s.job.type === 'singer').length >= 2;
  if (NN.audio) NN.audio.choir = G.choirOn;
  // workers come home; blankets go on in the cold
  for (const s of G.sheep) {
    if (s.state === 'nap' && !W.insideFold(s)) s.state = 'home';
    if (G.cold && !s.blanket && G.res.blanket > 0 && (s.state === 'home' || s.state === 'follow')) { s.blanket = true; G.res.blanket--; }
    s.cold = G.cold && !s.blanket;
  }
  emit('night', G.day);
};
GM.startDay = () => {
  for (const w of G.wolves) if (!w.flee) w.flee = 2.5;
  for (const f of G.frights) f.hp = Math.min(f.hp, 0.3);
  G.storm = false;
  const prevDay = G.day;
  G.day++; G.stats.days++;
  G.sabbath = G.day % 7 === 0;
  G.phase = 'day'; G.t = 0; G.len = GM.dayLength();
  for (const s of G.sheep) s.cold = false;
  dawnTally();
  GM.spawnPickups();
  emit('dawn', { day: G.day, prev: prevDay });
};
// The morning: production from yesterday's work, then breakfast, water, beds and joy for everyone at home.
function dawnTally() {
  const rep = { made: {}, fed: 0, hungry: 0, watered: 0, thirsty: 0, cramped: 0, happy: 0, born: [], wool: 0, lines: [] };
  const runners = G.sheep.filter(s => s.job && s.job.type === 'runner' && s.workT > 20).length;
  const boost = (1 + runners * 0.2) * (G.helpers.includes('hank') ? 1.25 : 1);
  const add = (k, v) => { v = Math.round(v); if (v > 0) { rep.made[k] = (rep.made[k] || 0) + v; G.res[k] += v; } };
  const dayLen = 160;
  for (const s of G.sheep) {
    if (!s.job) { s.workT = 0; continue; }
    const share = Math.min(1, s.workT / (dayLen * 0.45));
    switch (s.job.type) {
      case 'hauler': add('hay', 7 * share * boost); break;
      case 'wrangler': add('water', (s.job.key.includes('@pond') ? 8 : 12) * share * boost); break;
      case 'gardener': add('herbs', 3 * share * boost); break;
      case 'gatherer': add('timber', 3 * share * boost); add('stone', 1.4 * share * boost); break;
      case 'knitter': { const n = Math.min(Math.floor(G.res.wool / 2), Math.round(1.5 * share * boost)); if (n > 0) { G.res.wool -= n * 2; add('blanket', n); } break; }
    }
    s.workT = 0;
  }
  if (GM.count('olivePress')) add('oil', 2 * GM.count('olivePress'));
  if (G.helpers.includes('zeb')) { add('timber', 2); add('stone', 1); add('hay', 2); add('water', 2); }
  const home = G.sheep.filter(s => ['home', 'nap', 'feast'].includes(s.state) || (s.state === 'follow' && !s.owner));
  const cap = GM.capacity();
  shuffle(home);
  // sheep graze the meadow too, so the stores cover half a portion each
  let food = Math.min(Math.floor(G.res.hay * 2), cap.food), drink = Math.min(Math.floor(G.res.water * 2), cap.drink);
  let ate = 0, drank = 0;
  home.forEach((s, i) => {
    s.fed = food > 0; if (s.fed) { food--; ate++; rep.fed++; } else rep.hungry++;
    s.watered = drink > 0; if (s.watered) { drink--; drank++; rep.watered++; } else rep.thirsty++;
    const bed = i < cap.beds;
    if (!bed) rep.cramped++;
    s.energy = Math.min(1, s.energy + (bed ? 0.8 : 0.35));
    if (s.state === 'nap') s.state = 'home';
    let dj = 0.04;
    if (!s.fed) dj -= 0.18; if (!s.watered) dj -= 0.18; if (!bed) dj -= 0.1; if (s.cold) dj -= 0.1; if (s.hurt) dj -= 0.05;
    if (s.job) dj += 0.03;
    s.joy = clamp(s.joy + dj, 0, 1);
    if (s.joy > 0.75) rep.happy++;
  });
  G.res.hay = Math.max(0, G.res.hay - Math.ceil(ate / 2)); G.res.water = Math.max(0, G.res.water - Math.ceil(drank / 2));
  // happy sheep leave hearts by the fire
  for (let i = 0; i < Math.min(12, Math.floor(rep.happy / 3)); i++) dropHearts(W.FIRE.x + rand(-30, 30), W.FIRE.y + rand(-10, 20), 1);
  G.report = rep;
  // fill open jobs
  for (const s of G.sheep) if (s.job && !GM.canWork(s)) s.job = null;
  volunteer();
}
GM.sabbathFeast = spot => {
  // shearing (good for the sheep), new lambs, and everybody at one table
  const rep = G.report || {};
  let wool = 0;
  for (const s of G.sheep) if (!s.hurt && s.kind === 'sheep' && ['home', 'nap', 'follow'].includes(s.state)) { wool++; s.joy = Math.min(1, s.joy + 0.2); }
  G.res.wool += wool; rep.wool = wool;
  const happy = G.sheep.filter(s => s.joy > 0.7 && s.kind === 'sheep').length;
  const born = Math.min(4, Math.floor(happy / 8));
  rep.born = [];
  for (let i = 0; i < born; i++) {
    const l = GM.addSheep({ kind: 'lamb', x: W.GX + rand(-40, 40), y: W.FOLD.y + 80 + rand(-20, 20), state: 'home', look: '', trait: pick(TRAITS) });
    G.stats.lambs++; rep.born.push(l.name);
  }
  G.feastSpot = spot;
  for (const s of G.sheep) if (s.state === 'home' || s.state === 'nap') { s.state = 'feast'; s.job = null; }
  return rep;
};
GM.endFeast = () => { G.feastSpot = null; for (const s of G.sheep) if (s.state === 'feast') s.state = 'home'; };

// ---------------------------------------------------------------- interactables (story registers them)
GM.addInteract = it => { GM.removeInteract(it.id); G.interact.push(Object.assign({ r: 22, hold: 0, prog: 0 }, it)); };
GM.removeInteract = id => { G.interact = G.interact.filter(i => i.id !== id); };
GM.nearestInteract = () => {
  let best = null, bd = 1e9;
  for (const it of G.interact) {
    if (it.when && !it.when()) continue;
    const p = typeof it.at === 'function' ? it.at() : it.at;
    if (!p) continue;
    const d = Math.hypot(p.x - G.sh.x, p.y - G.sh.y);
    if (d < it.r && d < bd) { bd = d; best = it; }
  }
  // talk to nearby people and sheep
  if (!best) for (const q of G.sheep) if (q.state === 'wild' && q.trustMode === 'gift' && dist(q, G.sh) < 26) return { id: 'gift:' + q.id, label: q.gift ? `Give ${q.name} ${q.gift.amt} ${RES_NAME[q.gift.res]}` : 'Offer a snack', gift: q };
  if (!best) {
    let n = null, nd = 22;
    for (const q of G.npcs) { const d = dist(q, G.sh); if (d < nd && q.talk !== false) { nd = d; n = q; } }
    if (n) return { id: 'npc:' + n.id, label: 'Talk', npc: n };
    let s = null, sd = 18;
    for (const q of G.sheep) { const d = dist(q, G.sh); if (d < sd && (['home', 'nap', 'feast'].includes(q.state) || (q.state === 'follow' && !G.sh.moving))) { sd = d; s = q; } }
    if (s) return { id: 'sheep:' + s.id, label: 'Talk to ' + s.name, sheep: s };
  }
  return best;
};
GM.useInteract = it => {
  if (it.npc) { emit('talk', it.npc); return; }
  if (it.sheep) { emit('talkSheep', it.sheep); return; }
  if (it.gift) {
    const s = it.gift, g = s.gift || { res: 'hay', amt: 1 };
    if ((G.res[g.res] || 0) >= g.amt) { G.res[g.res] -= g.amt; s.trust = 1; GM.joinFlock(s); emit('gift', s); }
    else ui().toast(`You need ${g.amt} ${RES_NAME[g.res]} for ${s.name}.`);
    return;
  }
  if (it.act) it.act(it);
};

// ---------------------------------------------------------------- update
GM.update = (dt, input) => {
  G.smokeT -= dt;
  if (G.smokeT <= 0) { G.smokeT = 0.5; G.fx.push({ kind: 'smoke', x: W.HUT.x + 16 + rand(-1, 1), y: W.HUT.y - 63, t: 0, life: 3.2, dx: rand(4, 9) }); }
  G.t += dt;
  if (G.phase === 'day' && G.t >= G.len) { GM.startNight(); if (NN.mode !== 'play' && NN.mode !== 'build') return; }
  else if (G.phase === 'night' && G.t >= G.len && !G.holdNight) { GM.startDay(); if (NN.mode !== 'play' && NN.mode !== 'build') return; }
  if (G.phase === 'night') {
    while (G.spawns.length && G.t >= G.spawns[0].at) {
      const sp = G.spawns.shift();
      if (sp.kind === 'fright') GM.spawnFright(); else GM.spawnWolf({ alpha: sp.kind === 'alpha' });
    }
    if (G.storm) {
      G.stormT = (G.stormT || 4) - dt;
      if (G.stormT <= 0) {
        G.stormT = rand(6, 12); G.flash = 0.25; sfx('thunder');
        const out = G.sheep.filter(s => ['follow', 'wild'].includes(s.state) && dist(s, G.sh) < 200 && !s.immune);
        if (out.length && Math.random() < 0.6) scare(pick(out), { x: G.sh.x + rand(-40, 40), y: G.sh.y + rand(-40, 40) });
      }
    }
  }
  G.flash = Math.max(0, G.flash - dt);
  updShepherd(dt, input);
  // shots
  for (const p of G.shots) {
    if (p.delay > 0) { p.delay -= dt; continue; }
    if (!p.tgt || p.tgt.gone || p.tgt.flee) { p.dead = true; continue; }
    const dx = p.tgt.x - p.x, dy = p.tgt.y - 6 - p.y, d = Math.hypot(dx, dy);
    if (d < 5) { p.dead = true; p.tgt.fear += 1; knock(p.tgt, G.sh, 70); pop(p.tgt.x, p.tgt.y - 14, 'BONK', '#fff7e0', 0.5); continue; }
    p.x += dx / d * 180 * dt; p.y += dy / d * 180 * dt;
  }
  G.shots = G.shots.filter(p => !p.dead);
  let fi = 0, si = 0;
  for (const s of G.sheep) { if (s.state === 'follow') s.fi = fi++; if (s.state === 'stolen') s.fi = si++; }
  for (const s of G.sheep) updSheep(s, dt);
  // keep sheep from stacking up
  const arr = G.sheep;
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    const a = arr[i], b = arr[j], dx = b.x - a.x, dy = b.y - a.y;
    if (dx > 11 || dx < -11 || dy > 11 || dy < -11) continue;
    const d = Math.hypot(dx, dy), m = (a.kind === 'lamb' || b.kind === 'lamb') ? 8 : 11;
    if (d < m && d > 0) { const p = (m - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
  }
  for (const w of G.wolves) updWolf(w, dt);
  G.wolves = G.wolves.filter(w => !w.gone);
  for (const f of G.frights) updFright(f, dt);
  G.frights = G.frights.filter(f => !f.gone);
  G.dogs.forEach((g, i) => updDog(g, i, dt));
  for (const n of G.npcs) updNPC(n, dt);
  if (G.prowler && NN.STORY && NN.STORY.AI.prowler) NN.STORY.AI.prowler(G.prowler, dt);
  updPickups();
  for (const b of G.buildings) b.anim += dt;
  // a new job opens up when a sheep heals or a building finishes; check now and then
  G.volT = (G.volT || 0) - dt;
  if (G.volT <= 0) { G.volT = 3; if (G.phase === 'day' && !G.sabbath) volunteer(); }
  // hearts
  for (const h of G.hearts) {
    h.t += dt;
    const d = dist(h, G.sh);
    if (h.t > 0.35 && d < 64) { const k = 240 / Math.max(d, 1); h.x += (G.sh.x - h.x) * Math.min(1, k * dt); h.y += (G.sh.y - 6 - h.y) * Math.min(1, k * dt); }
    else if (h.t < 0.35) { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 160 * dt; }
    if (d < 8 && h.t > 0.35) { h.got = true; addXP(1); sfx('heart'); }
  }
  G.hearts = G.hearts.filter(h => !h.got && h.t < 60);
  for (const e of G.fx) e.t += dt;
  G.fx = G.fx.filter(e => e.t < e.life);
  if (G.shake > 0) G.shake -= dt;
  emit('tick', dt);
};
GM.updateIdle = dt => { // the title screen and scenes: keep the world gently alive
  for (const s of G.sheep) if (['home', 'wild', 'penned', 'feast'].includes(s.state)) updSheep(s, dt);
  for (const e of G.fx) e.t += dt;
  G.fx = G.fx.filter(e => e.t < e.life);
  G.smokeT -= dt;
  if (G.smokeT <= 0) { G.smokeT = 0.5; G.fx.push({ kind: 'smoke', x: W.HUT.x + 16 + rand(-1, 1), y: W.HUT.y - 63, t: 0, life: 3.2, dx: rand(4, 9) }); }
};
GM.inLight = inLight;
})();
