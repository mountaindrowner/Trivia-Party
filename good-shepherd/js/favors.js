/* NINETY-NINE · favors.js
   Depth beyond the main story: favors (side quests) from the people you meet, each with a reward that changes how
   you play; twelve lost bells hidden across the land; signpost travel; milestones that persist across playthroughs;
   and the post-game chapter, Goodness and Mercy, where the goal is a flock of ninety-nine. */
(() => {
'use strict';
const NN = window.NN;
const { rand, dist, pick, mk, rect, disc, outline } = NN.U;
const G = NN.G, W = NN.WORLD, GM = NN.GAME, ST = NN.STORY;
const FV = NN.FAV = {};
const ui = () => NN.UI;
const scene = (k, o) => ui().scene(k, o);
const SCR = () => NN.SCRIPT || {};
const helper = id => G.helpers.includes(id);
const keyed = k => GM.sheepByKey(k);
const homeN = () => G.sheep.filter(s => ['home', 'nap', 'feast'].includes(s.state)).length;
const perk = id => !!(G.perks && G.perks[id]);
FV.perk = perk;

// ---------------------------------------------------------------- little props for favor items
const art = (w, h, f, out = '#3e2416') => () => { const c = mk(w, h), x = c.getContext('2d'); f(x); return outline(c, out); };
Object.assign(NN.PROPS, {
  lostBell: { make: art(7, 8, x => { rect(x, '#f5c542', 1, 1, 5, 5); rect(x, '#ffe680', 2, 1, 2, 2); rect(x, '#c99a2e', 1, 5, 5, 1); rect(x, '#8a5a33', 3, 0, 1, 1); rect(x, '#7a4a24', 3, 6, 1, 1); }), ox: 4, oy: 9 },
  kite: { make: art(11, 15, x => { for (let i = 0; i < 5; i++) { rect(x, '#d8574f', 5 - i, 1 + i, 1 + i * 2, 1); rect(x, '#d8574f', 5 - i, 9 - i, 1 + i * 2, 1); } rect(x, '#f5c542', 5, 1, 1, 9); rect(x, '#f5c542', 1, 5, 9, 1); rect(x, '#fff7e0', 5, 10, 1, 4); rect(x, '#6a7fd8', 4, 12, 3, 1); }), ox: 6, oy: 16 },
  luckyHat: { make: art(13, 7, x => { rect(x, '#e3c35a', 0, 4, 13, 2); rect(x, '#e3c35a', 3, 1, 7, 4); rect(x, '#c9a03e', 3, 3, 7, 1); rect(x, '#d8574f', 8, 0, 1, 3); rect(x, '#f5dd8a', 4, 1, 3, 1); }), ox: 7, oy: 8 },
  woolSack: { make: art(12, 11, x => { rect(x, '#b08d57', 1, 2, 10, 9); rect(x, '#8e6d3e', 1, 8, 10, 3); rect(x, '#5a4030', 5, 0, 2, 3); rect(x, '#fdf8ee', 3, 3, 3, 3); rect(x, '#fdf8ee', 7, 4, 2, 2); }), ox: 6, oy: 12 },
  echoStone: { make: art(16, 18, x => { disc(x, 8, 12, 6, '#6e6c80'); rect(x, '#6e6c80', 3, 4, 10, 9); disc(x, 8, 5, 5, '#8f8da0'); rect(x, '#aeadbd', 5, 2, 3, 2); rect(x, '#3d3b4a', 7, 7, 2, 6); }), ox: 8, oy: 18 },
  echoStoneLit: { make: art(16, 18, x => { disc(x, 8, 12, 6, '#6e6c80'); rect(x, '#6e6c80', 3, 4, 10, 9); disc(x, 8, 5, 5, '#8f8da0'); rect(x, '#aeadbd', 5, 2, 3, 2); rect(x, '#ffe680', 7, 7, 2, 6); rect(x, '#fff7e0', 7, 9, 2, 2); }), ox: 8, oy: 18 },
});

// a walkable spot near (x, y)
function spotNear(x, y) {
  for (let r = 0; r < 160; r += 8) for (let a = 0; a < 12; a++) {
    const px = x + Math.cos(a / 12 * NN.TAU) * r, py = y + Math.sin(a / 12 * NN.TAU) * r, e = { x: px, y: py };
    W.collide(e, 6, px, py);
    if (Math.hypot(e.x - px, e.y - py) < 0.5 && W.riverDist(px, py) > 30 && !W.inFold(px, py)) return { x: px, y: py };
  }
  return { x, y };
}

// ---------------------------------------------------------------- favors
// state: G.fav[id] = 'active' | 'done'; G.favItems: items lying in the world; G.perks: rewards in effect
const FAVORS = {
  nell: { giver: 'nell', when: () => W.doors.bridge, need: () => G.res.timber >= 8, needText: 'Bring Nell 8 timber', pay: () => { G.res.timber -= 8; }, reward: () => { G.perks.travel = true; } },
  tobi: { giver: 'tobi', when: () => W.doors.bridge, item: { kind: 'kite', at: [2330, 1430] }, needText: "Find Tobi's kite in the Marsh", reward: () => { G.perks.farWhistle = true; } },
  abe: { giver: 'abe', when: () => !!keyed('minnow') && keyed('minnow').state !== 'wild', need: () => { const m = keyed('minnow'); return m && (m.state === 'follow' || dist(m, G.sh) < 80); }, needText: 'Bring Minnow along to meet Abe', reward: () => { G.perks.patience = true; } },
  zeb: { giver: 'zeb', when: () => helper('zeb') && G.day >= 5, need: () => ['nell', 'abe', 'tobi'].every(k => G.flags['zebPaid_' + k]), needText: "Carry Zeb's purse to Nell, Abe and Tobi", reward: () => { G.perks.zebDouble = true; } },
  doc: { giver: '@doc', when: () => GM.count('infirmary') > 0, need: () => G.res.herbs >= 6, needText: 'Bring the Doc 6 herbs', pay: () => { G.res.herbs -= 6; }, reward: () => { G.perks.herbChest = true; } },
  hank: { giver: 'hank', when: () => helper('hank'), item: { kind: 'luckyHat', at: [330, 250] }, needText: "Find Hank's lucky hat in the Pine Woods", reward: () => { G.perks.pitchfork = true; } },
  echo: { giver: 'jory', when: () => W.doors.canyon && helper('jory'), need: () => (G.flags.echoRung || 0) >= 3, needText: 'Ring the three echo stones in Shadow Canyon', reward: () => { G.perks.echo = true; } },
  ludo: { giver: 'ludo', when: () => helper('ludo'), item: { kind: 'woolSack', at: [520, 1880] }, needText: "Find Ludo's hidden sack in the canyon", reward: () => { GM.give({ wool: 12, blanket: 4 }, G.sh.x, G.sh.y); } },
  bram: { giver: 'bram', when: () => helper('bram'), need: () => !!G.flags.barnOpen, needText: "Open Bram's old barn in the Highlands", reward: () => { GM.give({ hay: 30, water: 20, blanket: 8 }, G.sh.x, G.sh.y); } },
  bells: { giver: 'woolsworth', when: () => G.day >= 2, need: () => (G.flags.bells || 0) >= 12, needText: 'Find the twelve lost bells', progress: () => `${G.flags.bells || 0}/12`, reward: () => { G.perks.goldenBell = true; } },
};
FV.FAVORS = FAVORS;
const teach = id => NN.HELP && NN.HELP.teach(id);
if (NN.HELP) NN.HELP.LESSONS.push(
  { id: 'favors', title: 'Favors', art: { icon: 'heart' }, text: 'Someone asked you for help. Favors are optional, and each one has a reward that makes the farm stronger. Press [Q] to see the favors you have going.' },
  { id: 'bells', title: 'Lost bells', art: { prop: 'lostBell' }, text: 'Twelve little bells are hidden around the land, one or two in every region. Walk over one to pick it up. Somebody back home will want to hear about it.' },
  { id: 'travel', title: 'Travel with Nell', art: { prop: 'signpost' }, text: 'Nell knows the shortcuts now. Press [E] at any signpost, or beside the fold gate, to travel by day. Sheep following you come along.' },
  { id: 'milestones', title: 'Milestones', art: { prop: 'lostBell' }, text: 'You earned a milestone. They stay on this device across every playthrough. See them all from the pause menu ([Esc]).' },
);
const ECHO = [[260, 1520], [880, 1700], [1500, 1880]];
const BELLS = [[1050, 760], [1650, 1250], [2050, 820], [2500, 1150], [2300, 1800], [1100, 420], [1650, 120], [200, 820], [520, 120], [400, 1500], [1100, 1880], [2450, 480]];
FV.ECHO = ECHO; FV.BELLS = BELLS;

FV.setup = () => {
  G.fav = G.fav || {}; G.favItems = G.favItems || []; G.perks = G.perks || {};
  if (!G.flags.bellsPlaced) {
    G.flags.bellsPlaced = true;
    BELLS.forEach(([x, y], i) => { const p = spotNear(x, y); G.favItems.push({ id: 'bell' + i, kind: 'lostBell', x: p.x, y: p.y }); });
  }
};
const startFavor = id => {
  G.fav[id] = 'active';
  const f = FAVORS[id];
  if (f.item && !G.favItems.some(i => i.id === id)) { const p = spotNear(f.item.at[0], f.item.at[1]); G.favItems.push({ id, kind: f.item.kind, x: p.x, y: p.y }); }
  ST.refresh();
};
const finishFavor = id => {
  const f = FAVORS[id];
  if (G.fav[id] === 'done') return;
  if (f.pay) f.pay();
  G.fav[id] = 'done';
  scene('fav_' + id + '_done', { done: () => { f.reward(); GM.sfx('level'); ui().objectiveDone('Favor: ' + f.needText); ST.refresh(); if (id === 'nell') teach('travel'); } });
};
// talking to a giver: offer the favor, nudge, or finish it
const TALKS7 = ['jory', 'zeb', 'hank', 'ludo', 'bram', 'thistle', 'chomp', 'baabara', 'woolsworth'];
FV.onTalk = (id, sheep) => {
  if (G.form !== 'shepherd' || !id) return false;
  if (G.chapter === 7 && TALKS7.includes(id) && !G.flags['talk7_' + id]) return false; // goodbyes come first
  if (['nell', 'abe', 'tobi', 'hank', 'bram'].includes(id) && !G.flags['met_' + id]) return false; // and hellos
  // Zeb's purse: paying back the river folk
  if (G.fav.zeb === 'active' && ['nell', 'abe', 'tobi'].includes(id) && !G.flags['zebPaid_' + id]) { G.flags['zebPaid_' + id] = true; scene('fav_zeb_' + id); return true; }
  for (const [fid, f] of Object.entries(FAVORS)) {
    const giverMatch = f.giver === id || (f.giver === '@doc' && sheep && sheep.job && sheep.job.type === 'doc');
    if (!giverMatch || G.fav[fid] === 'done') continue;
    if (!f.when()) continue;
    if (!G.fav[fid]) { startFavor(fid); scene('fav_' + fid + '_ask', { done: () => teach('favors') }); return true; }
    if (f.need && f.need()) { finishFavor(fid); return true; }
    if (f.item && G.flags['got_' + fid]) { finishFavor(fid); return true; }
    const B = SCR().barks && SCR().barks.favors && SCR().barks.favors[fid];
    if (B && B.length) { scene([[sheep ? { sheep } : f.giver, pick(B) + (f.progress ? ` (${f.progress()})` : '')]]); return true; }
  }
  return false;
};
// favors are offered through the normal "talk" events; this sits in front of the story's handler
const origEmit = ST.emit;
ST.emit = (ev, d) => {
  try {
    if (ev === 'talk' && FV.onTalk(d.id, null)) return;
    if (ev === 'talkSheep' && FV.onTalk(d.key || (d.job && d.job.type === 'doc' ? '@doc' : ''), d)) return;
  } catch (e) { console.warn(e); }
  origEmit(ev, d);
  try { FV.on(ev, d); } catch (e) { console.warn(e); }
};

// ---------------------------------------------------------------- the world side: items, bells, stones, the barn
FV.on = (ev, d) => {
  if (ev === 'tick') tick(d || 1 / 60);
  if (ev === 'dawn') dawn(d);
  if (ev === 'night') { G.flags.scatterAtDusk = G.stats.scattered; G.flags.nightHadWolves = (G.night && G.night.wolves) > 0; }
};
let msT = 0;
function tick(dt) {
  if (NN.mode !== 'play' && NN.mode !== 'build') return;
  FV.setup();
  const sh = G.sh;
  for (const it of G.favItems) {
    if (it.got || !W.isRevealed(W.region(it))) continue;
    if (Math.hypot(it.x - sh.x, it.y - sh.y) < 12 && G.form === 'shepherd') {
      it.got = true; GM.sfx('sparkle'); NN.FX && NN.FX.emit('spark', it.x, it.y - 6, 12);
      if (it.kind === 'lostBell') {
        G.flags.bells = (G.flags.bells || 0) + 1; GM.sfx('bell');
        const B = SCR().barks && SCR().barks.bellFound;
        ui().toast(`Bell ${G.flags.bells} of 12! ` + (B && B.length ? pick(B) : ''), 4);
        GM.dropHearts(it.x, it.y, 2); ui().then(() => teach('bells'));
        if (G.flags.bells >= 12) { if (!G.fav.bells) G.fav.bells = 'active'; finishFavor('bells'); }
      } else {
        const fid = it.id; G.flags['got_' + fid] = true;
        ui().toast({ kite: "Found Tobi's kite! Take it back to him.", luckyHat: "Found Hank's lucky hat! It has a feather and a dent.", woolSack: "Found Ludo's sack of 'borrowed' wool. Take it back to him." }[it.kind] || 'Found it!', 4);
      }
    }
  }
  if (G.favItems.some(i => i.got)) G.favItems = G.favItems.filter(i => !i.got);
  // the Bramble Bunch together again
  if (!G.fav.bramble && G.chapter >= 3 && ['chomp', 'nettle', 'briar', 'sorrel', 'tansy', 'bracken'].every(k => { const s = keyed(k); return s && s.state === 'home' && W.insideFold(s); })) {
    G.fav.bramble = 'done';
    scene('fav_bramble_done', { done: () => { for (const s of G.sheep) s.joy = Math.min(1, s.joy + 0.2); ui().objectiveDone('Favor: the Bramble Bunch, together again'); } });
  }
  // the Golden Bell: wolves near the fold lose heart
  if (perk('goldenBell') && G.phase === 'night') for (const w of G.wolves) if (!w.flee && dist(w, W.FIRE) < 170) { w.fear += 0.3 * dt; if (!w.chimed) { w.chimed = true; if (Math.random() < 0.3) GM.sfx('bell'); } }
  msT -= dt;
  if (msT <= 0) { msT = 2; checkMilestones(); }
  if (G.chapter === 8) postgameTick();
}
function dawn(d) {
  // a night with wolves and nobody scattered
  if (G.flags.nightHadWolves && G.chapter >= 2 && G.stats.scattered === G.flags.scatterAtDusk) G.flags.msNoLost = true;
  if (!G.sheep.some(s => s.lost && s.state === 'wild') && GM.flock().length > 10 && GM.flock().every(s => s.state !== 'follow')) G.flags.msAllHome = true;
  if (G.sabbath) G.flags.sabbaths = (G.flags.sabbaths || 0) + 1;
  if (G.chapter === 8) {
    const total = G.sheep.filter(s => !s.owner).length;
    if (total < 112) { const regs = Object.keys(W.REGIONS).filter(r => W.isRevealed(r) && r !== 'meadow'); for (let i = 0; i < 4; i++) GM.spawnWild(pick(regs), 1); ui().toast('Word came at dawn: a few more sheep have been seen out there.', 4); }
  }
}
// interactables (rebuilt whenever the story refreshes them)
const origRefresh = ST.refresh;
ST.refresh = () => {
  origRefresh();
  FV.setup();
  if (G.fav.echo === 'active') ECHO.forEach(([x, y], i) => {
    if (G.flags['echo' + i]) return;
    const p = spotNear(x, y);
    GM.addInteract({ id: 'echo' + i, at: { x: p.x, y: p.y + 4 }, r: 24, label: 'Ring the echo stone', act: () => {
      G.flags['echo' + i] = true; G.flags.echoRung = (G.flags.echoRung || 0) + 1; GM.sfx('bell'); GM.ring(p.x, p.y - 8, 60, '#ffe680', 1);
      scene('fav_echo_stone'); GM.removeInteract('echo' + i);
      if (G.flags.echoRung >= 3) ui().toast('All three stones are ringing. Tell Jory.', 4);
    } });
  });
  if (G.fav.bram === 'active' && !G.flags.barnOpen) GM.addInteract({ id: 'barn', at: { x: W.SITES.bramFarm.x, y: W.SITES.bramFarm.y + 6 }, r: 30, label: "Open Bram's barn", act: () => { G.flags.barnOpen = true; GM.sfx('door'); finishFavor('bram'); } });
  if (perk('travel')) GM.addInteract({ id: 'signs', at: () => ST.nearestSign(), label: 'Read the sign · travel', act: () => travelMenu(true) });
  if (perk('travel')) GM.addInteract({ id: 'travelHome', at: { x: W.SITES.gate.x - 30, y: W.SITES.gate.y + 10 }, r: 18, label: 'Travel with Nell', when: () => G.phase === 'day' && G.form === 'shepherd', act: () => travelMenu() });
};
// drawn by main.js: items in the world
FV.items = () => [].concat((G.favItems || []).filter(i => W.isRevealed(W.region(i))), (G.fav && G.fav.echo === 'active' ? ECHO.map(([x, y], i) => ({ kind: G.flags['echo' + i] ? 'echoStoneLit' : 'echoStone', ...spotCache(i, x, y) })) : []));
const sc = {};
const spotCache = (i, x, y) => sc[i] || (sc[i] = spotNear(x, y));

// ---------------------------------------------------------------- travel
const STOPS = [
  ['Home: the fold gate', () => true, () => ({ x: W.GX, y: W.FOLD.y + W.FOLD.h + 26 })],
  ['The river bridge', () => W.doors.bridge, () => ({ x: W.SITES.bridge.x - 60, y: W.SITES.bridge.y + 24 })],
  ['The river village', () => W.doors.bridge, () => ({ x: W.SITES.village.x, y: W.SITES.village.y + 30 })],
  ['The thorn gap', () => W.doors.thorns, () => ({ x: W.SITES.thornGap.x, y: W.SITES.thornGap.y - 40 })],
  ["Hank's old camp", () => W.doors.rockslide, () => ({ x: W.SITES.hankCamp.x + 20, y: W.SITES.hankCamp.y + 50 })],
  ['The canyon path', () => W.doors.canyon, () => ({ x: W.SITES.canyonGate.x, y: W.SITES.canyonGate.y + 50 })],
  ['The Highlands ridge', () => W.doors.ridge, () => ({ x: W.SITES.ridgeGate.x, y: W.SITES.ridgeGate.y - 50 })],
];
function travelMenu(sign) {
  const opts = [];
  if (sign) opts.push({ label: 'Read the sign', act: () => ST.readSign() });
  const canGo = G.phase === 'day' && G.form === 'shepherd';
  if (!canGo && !sign) { ui().toast('Nell only guides by daylight.'); return; }
  if (canGo) for (const [label, ok, to] of STOPS) if (ok()) opts.push({ label: 'Go to ' + label, act: () => travelTo(to()) });
  ui().menu('Travel with Nell', G.phase === 'day' ? 'Nell knows every shortcut. Your followers come too.' : 'Nell only guides by daylight.', opts);
}
function travelTo(p) {
  const spot = spotNear(p.x, p.y);
  ui().fade(true, 0.35, () => {
    const dx = spot.x - G.sh.x, dy = spot.y - G.sh.y;
    for (const s of G.sheep) if (s.state === 'follow') { s.x += dx; s.y += dy; W.collide(s, 5); }
    for (const g of G.dogs) { g.x = spot.x + rand(-10, 10); g.y = spot.y + 6; }
    G.sh.x = spot.x; G.sh.y = spot.y; G.sh.trail = [];
    if (NN.FX) NN.FX.snap();
    ui().fade(false, 0.35);
  });
}

// ---------------------------------------------------------------- milestones (kept on this device across playthroughs)
const MS = [
  ['first_friend', 'A Friend Found', 'Win over your first wild sheep.', () => G.stats.joined >= 1],
  ['home10', 'Full Fold', 'Have 10 sheep home at once.', () => homeN() >= 10],
  ['home50', 'Fifty Strong', 'Have 50 sheep home at once.', () => homeN() >= 50],
  ['home99', 'The Ninety-Nine', 'Have 99 sheep home at once.', () => homeN() >= 99],
  ['found10', 'Known by Name', 'Find 10 lost sheep again.', () => G.stats.found >= 10],
  ['wolves50', 'Not Today', 'Turn away 50 wolves.', () => G.stats.turned >= 50],
  ['wolves200', 'Night Watch', 'Turn away 200 wolves.', () => G.stats.turned >= 200],
  ['frights25', 'Lights On', 'Fade 25 Night Frights.', () => G.stats.faded >= 25],
  ['built10', 'Builder', 'Raise 10 buildings.', () => G.stats.built >= 10],
  ['builtAll', 'One of Everything', 'Build every kind of building.', () => Object.keys(NN.DEFS.BUILD).every(t => GM.count(t) > 0)],
  ['lamb', 'New Life', 'Welcome a lamb born on the Sabbath.', () => G.stats.lambs >= 1],
  ['lambs6', 'Springtime', 'Welcome 6 lambs.', () => G.stats.lambs >= 6],
  ['dogs', 'Goodness and Mercy', 'Have both dogs at your side.', () => G.dogs.length >= 2],
  ['evo', 'Something More', 'Take your first evolution.', () => Object.keys(G.S.evo || {}).length > 0],
  ['lv10', 'Seasoned', 'Reach level 10 in a single chapter.', () => G.lv >= 10],
  ['forgive7', 'Seventy Times Seven', 'Offer forgiveness seven times.', () => G.stats.forgiven >= 7],
  ['fav5', 'Good Neighbor', 'Finish 5 favors.', () => Object.values(G.fav || {}).filter(v => v === 'done').length >= 5],
  ['favAll', "Everyone's Friend", 'Finish every favor.', () => Object.keys(FAVORS).concat(['bramble']).every(k => (G.fav || {})[k] === 'done')],
  ['bells', 'Ring Them Home', 'Find all twelve lost bells.', () => (G.flags.bells || 0) >= 12],
  ['notes40', 'Well Read', "Fill 40 pages of the Shepherd's Notes.", () => G.codex.length >= 40],
  ['noLost', 'Not One Lost', 'Get through a night with wolves without a single sheep scattered (chapter 2 on).', () => !!G.flags.msNoLost],
  ['allHome', 'Everyone Home', 'Wake up with every sheep in your flock safe in the fold and none lost.', () => !!G.flags.msAllHome],
  ['sabbath3', 'Rest', 'Keep three Sabbaths.', () => (G.flags.sabbaths || 0) >= 3],
  ['story', 'Ugh. Cardio.', 'See the story through to the end.', () => !!G.flags.storyDone],
];
FV.MS = MS;
let unlocked = new Set();
try { unlocked = new Set(JSON.parse(localStorage.getItem('nn-milestones') || '[]')); } catch (e) { /* */ }
FV.milestones = () => MS.map(([id, name, desc]) => ({ id, name, desc, got: unlocked.has(id) }));
function checkMilestones() {
  for (const [id, name, , test] of MS) {
    if (unlocked.has(id)) continue;
    let ok = false; try { ok = test(); } catch (e) { /* */ }
    if (ok) { unlocked.add(id); try { localStorage.setItem('nn-milestones', JSON.stringify([...unlocked])); } catch (e) { /* */ } ui().milestone(name); if (G.day >= 3) ui().then(() => teach('milestones')); }
  }
}
FV.checkMilestones = checkMilestones;

// ---------------------------------------------------------------- the post-game: Goodness and Mercy
const OBJ8 = [
  { id: 'pg99', text: 'Bring the flock to ninety-nine', prog: () => [homeN(), 99], key: true },
  { id: 'pgBells', text: 'Find the twelve lost bells', prog: () => [G.flags.bells || 0, 12] },
  { id: 'pgFav', text: 'Finish every favor', prog: () => [Object.values(G.fav || {}).filter(v => v === 'done').length, Object.keys(FAVORS).length + 1] },
  { id: 'pgMs', text: 'Milestones', prog: () => [unlocked.size, MS.length] },
];
if (ST.OBJ) ST.OBJ[8] = OBJ8;
ST.CH[8] = { n: 8, first: 27, last: 1e9, reveal: [], track: 'home', verse: null };
if (NN.HELP && NN.HELP.CHAPTERS) NN.HELP.CHAPTERS[8] = [
  [{ spr: 'sheep' }, 'Every region is open, and more sheep wander in every morning.'],
  [{ prop: 'lostBell' }, 'Twelve lost bells are hidden across the land. Favors still wait to be finished.'],
  [{ icon: 'heart' }, 'The goal: a flock of ninety-nine. Take your time. Nights still come.'],
];
const baseNight = ST.nightFor;
ST.nightFor = day => {
  if (G.chapter !== 8) return baseNight(day);
  const k = Math.max(0, Math.min(1, (homeN() - 40) / 60));
  return { len: 65, wolves: Math.round(8 + k * 8), fear: 4 + Math.round(k), alphas: 1 + Math.round(k * 2), frights: 3 + Math.round(k * 4) };
};
// Called by the end screen once the story is over: the save becomes the morning after, so "Continue" picks it up.
FV.prepPostgame = () => {
  if (G.chapter === 8) return;
  G.flags.storyDone = true; checkMilestones();
  G.chapter = 8; G.form = 'shepherd'; G.shepLook = 'shepherdScarred';
  G.wolves = []; G.frights = []; G.prowler = null; G.gateLock = null; G.holdNight = false; G.spawns = [];
  for (const r of Object.keys(W.REGIONS)) W.reveal(r);
  for (const d of Object.keys(W.doors)) if (!W.doors[d]) W.openDoor(d);
  G.day = Math.max(G.day, 26) + 1; G.phase = 'day'; G.t = 0; G.sabbath = G.day % 7 === 0; G.len = GM.dayLength();
  for (const s of G.sheep) if (s.state === 'follow' || s.state === 'feast') { s.state = 'home'; s.x = W.GX + rand(-90, 90); s.y = W.FOLD.y + rand(30, W.FOLD.h - 30); }
  G.sh.x = W.GX; G.sh.y = W.FOLD.y + W.FOLD.h + 20; G.sh.trail = [];
  G.flags.pgFresh = true;
  NN.save();
};
// "Keep shepherding": the chapter card, then the morning after.
FV.beginPostgame = () => {
  FV.prepPostgame();
  for (const id of ['end', 'credits']) document.getElementById(id).hidden = true;
  document.getElementById('hud').hidden = false;
  NN.FX && NN.FX.snap();
  GM.resetKnacks();
  ST.codex('goodness_mercy');
  NN.audio.track('home');
  NN.mode = 'play';
  ui().then(() => ui().chapterCard(8, () => { ST.refresh(); if (G.flags.pgFresh) { G.flags.pgFresh = false; scene('pg_start'); } }));
};
// a save made at the end screen starts the post-game properly when it's continued
FV.onLoad = () => { if (G.chapter === 8 && G.flags.pgFresh) { GM.resetKnacks(); ST.codex('goodness_mercy'); ui().then(() => ui().chapterCard(8, () => { G.flags.pgFresh = false; ST.refresh(); scene('pg_start'); })); } };
function postgameTick() {
  if (!G.flags.pg99 && homeN() >= 99) {
    G.flags.pg99 = true;
    ST.codex && ST.codex('ninety_nine');
    scene('pg_ninetynine', { done: () => ui().endScreen('ninetynine') });
  }
}
})();
