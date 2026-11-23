/* NINETY-NINE · story.js
   Seven chapters on Psalm 23. Each chapter opens a region, sets objectives, schedules its nights, and plays its scenes
   when the simulation reports events (NN.STORY.emit). Critical beats always have a fallback, so nothing can soft-lock.
   All words come from NN.SCRIPT.scenes; the short fallbacks here only cover a missing scene. */
(() => {
'use strict';
const NN = window.NN;
const { rand, clamp, dist, pick } = NN.U;
const W = NN.WORLD, G = NN.G, GM = NN.GAME;
const ST = NN.STORY = { AI: {} };
const S = W.SITES;

const ui = () => NN.UI;
const scene = (key, opts = {}) => ui().scene(key, opts);
const flag = (k, v) => (v === undefined ? G.flags[k] : (G.flags[k] = v));
const once = (k, fn) => { if (G.flags['once_' + k]) return false; G.flags['once_' + k] = true; fn(); return true; };
const codex = id => { if (!G.codex.includes(id)) { G.codex.push(id); if (ui() && ui().codexToast) ui().codexToast(id); } };
ST.codex = codex;
const helper = id => G.helpers.includes(id);
const music = name => { if (NN.audio) NN.audio.track(name); };

// ---------------------------------------------------------------- chapters
const CH = [null,
  { n: 1, first: 1, last: 3, reveal: ['meadow'], track: 'meadow', verse: 'psalm23_1' },
  { n: 2, first: 4, last: 7, reveal: ['river', 'marsh'], track: 'river', verse: 'psalm23_2' },
  { n: 3, first: 8, last: 11, reveal: ['thorns'], track: 'thorns', verse: 'psalm23_3' },
  { n: 4, first: 12, last: 14, reveal: ['road', 'pines'], track: 'road', verse: null },
  { n: 5, first: 15, last: 18, reveal: ['canyon'], track: 'canyon', verse: 'psalm23_4' },
  { n: 6, first: 19, last: 21, reveal: ['highlands'], track: 'highlands', verse: 'psalm23_5' },
  { n: 7, first: 22, last: 26, reveal: [], track: 'home', verse: 'psalm23_6' },
];
ST.CH = CH;
ST.chapterOf = day => CH.find(c => c && day >= c.first && day <= c.last) || CH[7];
const NIGHTS = {
  1: { len: 50, wolves: 5, fear: 3 }, 2: { len: 60, wolves: 8, fear: 3 }, 3: { len: 75, wolves: 10, fear: 3 },
  4: { len: 60, wolves: 8, fear: 3 }, 5: { len: 65, wolves: 10, fear: 3 }, 6: { len: 70, wolves: 11, fear: 3 }, 7: { len: 30, wolves: 0, fear: 3 },
  8: { len: 60, wolves: 7, fear: 4, frights: 3 }, 9: { len: 65, wolves: 8, fear: 4, frights: 5 }, 10: { len: 70, wolves: 9, fear: 4, frights: 6 }, 11: { len: 70, wolves: 10, fear: 4, frights: 7 },
  12: { len: 65, wolves: 10, fear: 4, alphas: 1, frights: 4 }, 13: { len: 85, wolves: 13, fear: 4, alphas: 2, storm: true }, 14: { len: 30, wolves: 0, fear: 4 },
  15: { len: 75, wolves: 11, fear: 4, alphas: 2, frights: 6, cold: true }, 16: { len: 75, wolves: 12, fear: 4, alphas: 2, frights: 7, cold: true },
  17: { len: 80, wolves: 13, fear: 4, alphas: 3, frights: 8, cold: true }, 18: { len: 95, wolves: 9, fear: 4, alphas: 2, frights: 9, cold: true },
  19: { len: 70, wolves: 12, fear: 5, alphas: 3, frights: 5 }, 20: { len: 80, wolves: 15, fear: 5, alphas: 4 }, 21: { len: 30, wolves: 0, fear: 5 },
  22: { len: 70, wolves: 12, fear: 5, alphas: 3, frights: 6 }, 23: { len: 75, wolves: 14, fear: 5, alphas: 4, frights: 8 },
  24: { len: 120, wolves: 22, fear: 5, alphas: 6, frights: 10 }, 25: { len: 70, wolves: 9, fear: 3 }, 26: { len: 30, wolves: 0, fear: 3 },
};
ST.nightFor = day => Object.assign({}, NIGHTS[day] || { len: 60, wolves: 10, fear: 4 });

// ---------------------------------------------------------------- objectives (what the Quests panel shows)
const cnt = (f) => G.sheep.filter(f).length;
const homeN = () => cnt(s => ['home', 'nap', 'feast'].includes(s.state));
const keyed = k => GM.sheepByKey(k);
const joined = k => { const s = keyed(k); return !!s && !['wild', 'chomp', 'scene', 'penned', 'special'].includes(s.state) && !s.owner; };
const OBJ = {
  1: [
    { id: 'home12', text: 'Bring 12 sheep home to the fold', prog: () => [homeN(), 12] },
    { id: 'feeder', text: 'Build another Feeder (B)', prog: () => [GM.count('feeder') - 2, 1] },
    { id: 'work', text: 'Build a Workshop or a Hay Barn', prog: () => [GM.count('workshop') + GM.count('hayBarn'), 1] },
    { id: 'chomp', text: 'Bring Chomp home', done: () => joined('chomp'), key: true },
    { id: 'jory', text: 'Stop whoever is sneaking around', done: () => helper('jory'), key: true },
  ],
  2: [
    { id: 'bridge', text: 'Build the bridge across the river (10 timber)', done: () => W.doors.bridge, key: true },
    { id: 'folk', text: 'Meet the river folk', prog: () => [['nell', 'abe', 'tobi'].filter(k => flag('met_' + k)).length, 3] },
    { id: 'zeb', text: 'Find the Collector', done: () => helper('zeb'), key: true },
    { id: 'well', text: 'Build a Well', prog: () => [GM.count('well'), 1] },
    { id: 'minnow', text: 'Find the lamb on the lake', done: () => joined('minnow') },
    { id: 'home30', text: 'Bring 30 sheep home', prog: () => [homeN(), 30] },
  ],
  3: [
    { id: 'thorns', text: 'Cut a way through the thorn wall', done: () => W.doors.thorns, key: true },
    { id: 'bramble', text: 'Win over the Bramble Bunch', prog: () => [['nettle', 'briar', 'sorrel', 'tansy', 'bracken'].filter(joined).length, 5] },
    { id: 'infirmary', text: 'Build an Infirmary', prog: () => [GM.count('infirmary'), 1] },
    { id: 'garden', text: 'Build an Herb Garden', prog: () => [GM.count('herbGarden'), 1] },
    { id: 'lamps', text: 'Build 2 Lamp Posts', prog: () => [GM.count('lampPost'), 2] },
    { id: 'burr', text: 'Find Burr in the thorn maze', done: () => joined('burr') },
    { id: 'thistle', text: 'Bring old Thistle home', done: () => joined('thistle'), key: true },
  ],
  4: [
    { id: 'treadmill', text: 'Build a Treadmill', prog: () => [GM.count('treadmill'), 1] },
    { id: 'rockslide', text: 'Clear the rockslide on the Old Road', done: () => W.doors.rockslide, key: true },
    { id: 'hank', text: 'Meet the hired hand on the Old Road', done: () => flag('met_hank'), key: true },
    { id: 'haulers', text: 'Have 2 Hay Haulers working', prog: () => [cnt(s => s.job && s.job.type === 'hauler'), 2] },
    { id: 'hankFlock', text: "Keep Hank's flock safe through the storm", done: () => helper('hank'), key: true },
    { id: 'dot', text: "Find Hank's lost lamb", done: () => joined('dot') },
  ],
  5: [
    { id: 'lamps', text: 'Light the canyon: 4 Lamp Posts in Shadow Canyon', prog: () => [G.buildings.filter(b => b.type === 'lampPost' && W.regionId(W.regionAt(b.fx, b.fy)) === 'canyon').length, 4] },
    { id: 'loom', text: 'Build a Loom', prog: () => [GM.count('loom'), 1] },
    { id: 'blankets', text: 'Give 20 sheep a blanket', prog: () => [cnt(s => s.blanket) , 20] },
    { id: 'ludo', text: 'Find out what is going on with Lou', done: () => helper('ludo'), key: true },
    { id: 'pip', text: 'Bring Pip home', done: () => flag('pipHome'), key: true },
  ],
  6: [
    { id: 'bram', text: 'Meet the shepherd of the Highlands', done: () => flag('met_bram'), key: true },
    { id: 'feedBram', text: "Feed Bram's flock (6 hay, 6 water)", done: () => flag('fedBram'), key: true },
    { id: 'press', text: 'Build an Olive Press', prog: () => [GM.count('olivePress'), 1] },
    { id: 'choir', text: 'Build a Choir Stage', prog: () => [GM.count('choirStage'), 1] },
    { id: 'raid', text: "Defend Bram's flock at night", done: () => flag('raidDone'), key: true },
    { id: 'table', text: 'Set a table and invite everyone', done: () => helper('bram'), key: true },
  ],
  7: [
    { id: 'talks', text: 'Spend time with your friends', prog: () => [TALKS.filter(k => flag('talk7_' + k)).length, TALKS.length] },
    { id: 'ready', text: 'Get the farm ready', prog: () => [Math.min(3, GM.count('lampPost')), 3] },
    { id: 'gate', text: 'Stand in the gate', done: () => flag('fell'), key: true },
  ],
};
const TALKS = ['jory', 'zeb', 'hank', 'ludo', 'bram', 'thistle', 'chomp', 'baabara', 'woolsworth'];
const FLOCK_OBJ = [
  { id: 'fw_fire', text: 'Keep the fire going: bring 4 branches', prog: () => [Math.min(4, flag('branches') || 0), 4] },
  { id: 'fw_lamb', text: 'Find the lamb who wandered off', done: () => flag('fwLamb') },
  { id: 'fw_home', text: 'Get everyone into the fold by dark', prog: () => [homeN(), Math.max(1, cnt(s => !s.owner && !s.hidden && s.state !== 'special'))] },
];
ST.objectives = () => {
  if (G.form === 'sheep') return FLOCK_OBJ;
  return OBJ[G.chapter] || [];
};
ST.objState = o => {
  if (o.done) return { done: !!o.done(), text: o.text };
  const [a, b] = o.prog();
  return { done: a >= b, text: `${o.text} (${Math.min(a, b)}/${b})` };
};
function checkObjectives() {
  for (const o of ST.objectives()) {
    const k = 'obj_' + G.chapter + '_' + o.id + (G.form === 'sheep' ? 's' : '');
    if (!G.flags[k] && ST.objState(o).done) { G.flags[k] = true; ui().objectiveDone(o.text); GM.sfx('level'); }
  }
}

// ---------------------------------------------------------------- helpers (redeemed friends live on the farm)
const HELPER = {
  jory: { look: 'joryWatch', home: () => ({ x: W.HUT.x + 30, y: W.HUT.y + 30 }), night: () => ({ x: W.GX + 26, y: W.FOLD.y + W.FOLD.h + 12 }), lantern: true },
  zeb: { look: 'zeb', home: () => S.quartermaster },
  hank: { look: 'hank', home: () => { const b = G.buildings.find(q => q.type === 'hayBarn'); return b ? { x: b.fx + 20, y: b.fy + 14 } : { x: W.HUT.x + 120, y: W.HUT.y + 90 }; } },
  ludo: { look: 'ludoPlain', home: () => ({ x: W.FOLD.x + W.FOLD.w + 30, y: W.FOLD.y + 60 }) },
  bram: { look: 'bramKind', home: () => ({ x: W.FOLD.x - 40, y: W.FOLD.y + 120 }) },
};
function makeHelper(id) {
  if (!G.helpers.includes(id)) G.helpers.push(id);
  const h = HELPER[id], n = GM.npc(id) || GM.addNPC({ id, x: h.home().x, y: h.home().y });
  n.look = h.look; n.state = 'idle'; n.aiKey = 'helper'; n.lantern = !!h.lantern; n.talk = true;
  codex('friend_' + id);
  return n;
}
ST.AI.helper = (n, dt) => {
  const h = HELPER[n.id]; if (!h) return false;
  const spot = G.phase === 'night' && h.night ? h.night() : (G.sabbath && G.feastSpot ? seatFor(n.id) : h.home());
  if (Math.hypot(n.home.x - spot.x, n.home.y - spot.y) > 4) { n.home = { x: spot.x, y: spot.y }; n.wt = 0; }
  if (G.phase === 'night' && h.night || G.feastSpot) { GM.steer(n, spot.x, spot.y, 40, dt, 6); return true; }
  return false;
};
const SEATS = ['jory', 'zeb', 'hank', 'ludo', 'bram', 'nell', 'abe', 'tobi'];
const seatFor = id => ({ x: S.table.x - 44 + SEATS.indexOf(id) * 13, y: S.table.y - 12 });

// ---------------------------------------------------------------- chapter flow
ST.start = () => {
  G.chapter = 1; G.day = 1; G.phase = 'day'; G.t = 0; G.len = GM.dayLength();
  startChapter(1, true);
};
function startChapter(n, first) {
  G.chapter = n;
  const c = CH[n];
  for (const r of c.reveal) { W.reveal(r); codex('place_' + W.regionId(r)); }
  if (n > 1) GM.resetKnacks();
  music(c.track);
  if (c.verse) codex(c.verse);
  ui().chapterCard(n, () => {
    if (first) beginCh1(); else (CH_START[n] || (() => {}))();
    ST.refresh();
  });
}
// When the dawn passes a chapter's last day, wrap it up and start the next.
function maybeNextChapter(day) {
  const c = CH[G.chapter];
  if (!c || day <= c.last || G.chapter >= 7) return false;
  const n = G.chapter;
  (CH_FALLBACK[n] || (() => {}))();
  ui().chapterEnd(n, OBJ[n].map(o => ST.objState(o)), () => {
    const endKey = 'c' + n + '_end';
    scene(endKey, { done: () => startChapter(n + 1) });
  });
  return true;
}

// Interactables are rebuilt from flags, so they come back after loading a save.
ST.refresh = () => {
  G.interact = [];
  GM.addInteract({ id: 'bell', at: { x: S.gate.x + 26, y: S.gate.y + 6 }, label: 'Ring the bell: call it a day', when: () => G.phase === 'day' && G.form !== 'sheep' && !G.sabbath, act: () => {
    if (G.t < 20) { ui().toast('It is still early. The flock has work to do.'); return; }
    if (G.bellT > 0) { G.t = Math.max(G.t, G.len - 10); ui().toast('The bell rings. Everyone heads home.'); GM.sfx('bell'); G.bellT = 0; }
    else { G.bellT = 3; ui().toast('Ring again to end the day early.'); GM.sfx('bell'); }
  } });
  GM.addInteract({ id: 'signs', at: () => nearestSign(), label: 'Read the sign', act: () => readSign() });
  if (G.chapter >= 2 && !W.doors.bridge) GM.addInteract({ id: 'bridge', at: { x: S.bridge.x - 36, y: S.bridge.y }, r: 28, label: 'Build the bridge (10 timber)', act: () => {
    if (G.res.timber >= 10) { G.res.timber -= 10; buildBridge(); } else ui().toast(`You need 10 timber for the bridge. You have ${G.res.timber}.`);
  } });
  if (G.chapter >= 2 && W.doors.bridge && !helper('zeb')) GM.addInteract({ id: 'sycamore', at: { x: S.sycamore.x, y: S.sycamore.y + 6 }, r: 30, label: 'Call up into the sycamore', act: () => zebScene() });
  if (G.chapter >= 2 && W.doors.bridge) GM.addInteract({ id: 'booth', at: { x: S.tollBooth.x, y: S.tollBooth.y + 8 }, r: 24, label: 'Read the toll sign', act: () => scene('c2_tollBooth') });
  if (G.chapter >= 3 && !W.doors.thorns) GM.addInteract({ id: 'thorns', at: { x: S.thornGap.x, y: S.thornGap.y + 18 }, r: 30, hold: 2.5, label: 'Hold E: cut through the thorns', act: () => cutThorns() });
  if (G.chapter >= 4 && !W.doors.rockslide) GM.addInteract({ id: 'rockslide', at: { x: S.rockslide.x + 24, y: S.rockslide.y }, r: 30, hold: 2, label: GM.count('treadmill') ? 'Hold E: clear the rockslide with the crew' : 'The rocks are too heavy. Build a Treadmill first.', act: () => { if (GM.count('treadmill')) clearRockslide(); else ui().toast('Build a Treadmill. The crew can pull these boulders with ropes.'); } });
  if (G.chapter === 6 && flag('met_bram') && !flag('fedBram')) GM.addInteract({ id: 'feedBram', at: { x: S.bramFarm.x - 40, y: S.bramFarm.y + 70 }, r: 50, label: "Feed Bram's flock (6 hay, 6 water)", act: () => feedBram() });
  if (G.chapter === 6 && G.day === 21 && !helper('bram')) GM.addInteract({ id: 'invite', at: () => GM.npc('bram'), r: 26, label: 'Invite Bram to the table', act: () => inviteBram() });
  if (G.form === 'sheep') GM.addInteract({ id: 'fire', at: { x: W.FIRE.x, y: W.FIRE.y + 10 }, r: 26, label: 'Put branches on the fire', when: () => (G.flags.carry || 0) > 0, act: () => { flag('branches', (flag('branches') || 0) + G.flags.carry); G.flags.carry = 0; GM.sfx('collect'); GM.ring(W.FIRE.x, W.FIRE.y, 40, '#f5a23c', 0.6); } });
};
const SIGNS = {
  bridge: 'East: the Riverlands. "No crossing without a bridge, and no bridge without timber." Somebody added: "duh."',
  thorns: 'North: the Thorn Hills. The sign is mostly thorns.',
  rockslide: 'West: the Old Road. CLOSED. A smaller sign below says "sorry."',
  canyon: 'South: Shadow Canyon. Somebody scratched "bring a lamp" into the wood.',
  ridge: 'North: the Highlands. PRIVATE. Then, smaller: "B. Stone."',
};
const nearestSign = () => { for (const o of W.query(G.sh.x - 30, G.sh.y - 30, G.sh.x + 30, G.sh.y + 30)) if (o.sign && Math.hypot(o.x - G.sh.x, o.y - G.sh.y) < 24) return o; return null; };
const readSign = () => { const o = nearestSign(); if (o) scene([['narrator', SIGNS[o.sign]]]); };

// ---------------------------------------------------------------- events from the simulation
ST.emit = (ev, d) => {
  const h = HANDLERS[ev];
  if (h) h(d);
  const c = CH_EVENTS[G.chapter] && CH_EVENTS[G.chapter][ev];
  if (c) c(d);
};
const HANDLERS = {
  tick() { G.bellT = Math.max(0, (G.bellT || 0) - 1 / 60); checkObjectives(); chapterTick(); },
  joined(s) { if (s.kind === 'lamb') codex('lambs_in_arms'); if (s.key) codex('friend_' + s.key); },
  found() { codex('lost_sheep'); },
  home(s) { if (!flag('firstHome')) { flag('firstHome', true); scene('c1_firstHome'); } },
  built(b) { if (b.type === 'infirmary') once('infirmary', () => scene('c3_infirmary')); if (b.type === 'choirStage') once('choir', () => { scene('c6_choir'); codex('song_in_the_night'); }); if (b.type === 'hayBarn' && G.chapter === 4) once('haybarn4', () => scene('c4_hayBarn')); },
  dog(kind) { scene(kind === 'goodness' ? 'c1_goodness' : 'c1_mercy'); codex('friend_' + kind); },
  evolution(k) { ui().toast(`${k.name}! ${k.desc}`, 5); },
  talk(n) { talkTo(n); },
  talkSheep(s) { talkToSheep(s); },
  wolfSpawn() { if (G.day === 1) once('firstWolf', () => scene('c1_firstWolf')); },
  night(day) { onNight(day); },
  dawn({ day }) { onDawn(day); },
  jobStart({ sheep, job }) {
    if (flag('jobline_' + job)) return;
    flag('jobline_' + job, true);
    if (NN.SCRIPT && NN.SCRIPT.scenes && NN.SCRIPT.scenes['job_' + job]) { scene('job_' + job); return; }
    const L = NN.SCRIPT && NN.SCRIPT.barks && NN.SCRIPT.barks.jobs && NN.SCRIPT.barks.jobs[job];
    if (L && L.length) scene([[{ sheep }, pick(L)]]);
  },
  whistle() { if (G.form === 'sheep') return; },
  pickup(p) { if (G.form === 'sheep' && p.kind === 'branchPile') { G.flags.carry = (G.flags.carry || 0) + 1; ui().toast(`Woolsworth is carrying ${G.flags.carry} branch${G.flags.carry > 1 ? 'es' : ''} in his wool.`); } },
};
function talkTo(n) {
  const id = n.id;
  if (G.chapter === 7 && TALKS.includes(id) && !flag('talk7_' + id)) { flag('talk7_' + id, true); scene('c7_talk_' + id); return; }
  if (id === 'nell' || id === 'abe' || id === 'tobi') { if (!flag('met_' + id)) { flag('met_' + id, true); codex('friend_' + id); scene('c2_' + id); return; } }
  if (id === 'hank' && !flag('met_hank')) { flag('met_hank', true); scene('c4_hankMeet'); return; }
  if (id === 'bram' && !flag('met_bram')) { flag('met_bram', true); codex('bad_shepherds'); scene('c6_bramMeet', { done: () => scene('c6_bramFlock', { done: ST.refresh }) }); return; }
  if (id === 'lou') { scene([['lou', pick(['Baa. That is a normal sheep thing I say.', 'Lovely grass. Very... chewy.', 'I am not a man. I am a sheep. Moo. BAA. Baa.'])]]); return; }
  const L = NN.SCRIPT && NN.SCRIPT.barks && NN.SCRIPT.barks.helpers && NN.SCRIPT.barks.helpers[id];
  scene([[id, L && L.length ? pick(L) : 'Good to see you.']]);
}
function talkToSheep(s) {
  if (G.chapter === 7 && s.key && TALKS.includes(s.key) && !flag('talk7_' + s.key) && G.form === 'shepherd') { flag('talk7_' + s.key, true); scene('c7_talk_' + s.key); return; }
  const B = NN.SCRIPT && NN.SCRIPT.barks;
  let line;
  if (s.key && B && B.helpers && B.helpers[s.key]) line = pick(B.helpers[s.key]);
  else if (!s.fed && B && B.hungry) line = pick(B.hungry);
  else if (!s.watered && B && B.thirsty) line = pick(B.thirsty);
  else if (s.cold && B && B.cold) line = pick(B.cold);
  else { const t = B && B.traits && B.traits[s.trait]; line = t && t.talk ? pick(t.talk) : 'Baa.'; }
  ui().sheepTalk(s, line);
}

// ---------------------------------------------------------------- days and nights
function onDawn(day) {
  if (G.form === 'sheep' && day === 26) { theReturn(); return; }
  if (maybeNextChapter(day)) { afterDawn(day, true); return; }
  afterDawn(day, false);
}
function afterDawn(day, chapterChange) {
  if (!chapterChange) (DAWN[day] || (() => {}))();
  if (G.sabbath) { sabbath(day); ST.refresh(); return; }
  if (!chapterChange) {
    music(G.form === 'sheep' ? 'sorrow' : CH[G.chapter].track);
    ui().banner('Day ' + day, dawnLine());
    ui().report(G.report);
  }
  ST.refresh();
}
const dawnLine = () => {
  const lost = cnt(s => s.lost && s.state === 'wild');
  return `${homeN()} safe in the fold` + (lost ? ` · ${lost} still out there` : '');
};
function onNight(day) {
  const cfg = G.night;
  music(G.sabbath ? 'sabbath' : day === 24 ? 'boss' : cfg.storm ? 'storm' : cfg.frights ? 'frights' : 'night');
  if (G.sabbath) { GM.endFeast(); ui().banner('Night ' + day, 'A quiet night. Even the wolves rest.'); return; }
  ui().banner('Night ' + day, cfg.storm ? 'A storm is rolling in.' : cfg.cold ? 'A cold night. Blankets help.' : 'Keep them close to the light.');
  if (cfg.cold) once('cold', () => scene('c5_cold'));
  (NIGHT[day] || (() => {}))();
}
function sabbath(day) {
  music('sabbath');
  ui().banner('Day ' + day, 'The Sabbath. The farm rests.');
  codex('sabbath');
  const rep = GM.sabbathFeast({ x: S.table.x, y: S.table.y });
  G.tableOut = true;
  ui().report(Object.assign({}, G.report, rep), true);
  const key = day === 21 ? 'c6_tableSet' : 'sabbath';
  scene(key, { done: () => {
    if (day === 7) { if (!helper('zeb')) zebScene(); scene('sabbath_c2'); }
    if (day === 14 && helper('hank') && joined('dot')) scene('sabbath_c4');
    if (day === 21) { ST.refresh(); ui().toast('Bram is watching from the edge of the meadow. Go and invite him.', 6); }
  } });
  if (day === 21) { const b = GM.npc('bram') || GM.addNPC({ id: 'bram', look: 'bram', x: S.bramWatch.x, y: S.bramWatch.y }); b.x = S.bramWatch.x; b.y = S.bramWatch.y; b.home = { x: S.bramWatch.x, y: S.bramWatch.y }; b.aiKey = null; b.state = 'still'; }
}
ST.feastOver = () => { G.tableOut = false; };

// ---------------------------------------------------------------- chapter 1: Green Pastures
function beginCh1() {
  const F = W.FOLD;
  const starters = [['woolsworth', 'Woolsworth', 'shades', 'brave'], ['baabara', 'Baabara', 'bow', 'nerdy'], ['ramsey', 'Ramsey', 'beanie', 'chatty']];
  starters.forEach(([key, name, look, trait], i) => GM.addSheep({ key, name, look, trait, x: G.sh.x - 16 + i * 14, y: G.sh.y + 12, state: 'follow' }));
  GM.spawnWild('meadow', 10, { modes: ['walk', 'walk', 'walk', 'walk', 'whistle', 'patient'] });
  GM.spawnPickups();
  ['woolsworth', 'baabara', 'ramsey'].forEach(k => codex('friend_' + k));
  scene('c1_intro', { done: () => ui().tip('Walk near wild sheep to win their trust, then lead them through the gate. Press B to build, F for your flock, Q for goals.', 7) });
  F && 0;
}
const CH_EVENTS = {
  1: {},
  3: { frightSeen() {} },
};
const DAWN = {
  2: () => {
    GM.spawnWild('meadow', 6, { modes: ['walk', 'walk', 'whistle', 'patient', 'still'] });
    const c = GM.addSheep({ key: 'chomp', name: 'Chomp', look: '', trait: 'brave', swap: 'chomp', x: 1660, y: 730, trustMode: 'still', bites: true, hurt: true });
    c.ax = c.x; c.ay = c.y;
    scene('c1_chompRumor');
  },
  3: () => { GM.spawnWild('meadow', 4); },
  5: () => { if (!W.doors.bridge) { ui().toast('Nell rowed over with a stack of planks. "You looked like you needed a hand."', 6); buildBridge(); } GM.spawnWild('marsh', 4); },
  6: () => GM.spawnWild('river', 4),
  9: () => GM.spawnWild('thorns', 5),
  10: () => { scene('c3_maze'); const b = GM.addSheep({ key: 'burr', name: 'Burr', kind: 'lamb', look: '', trait: 'dramatic', x: W.MAZE.center.x, y: W.MAZE.center.y, trustMode: 'walk' }); b.ax = b.x; b.ay = b.y; },
  13: () => { G.flags.stormDay = true; },
  14: () => { if (!helper('hank')) hankReturns(); },
  16: () => { louArrives(); },
  17: () => {},
  18: () => { if (!helper('ludo')) ludoCaught(true); },
  20: () => {},
  22: () => {},
  23: () => {},
  24: () => scene('c7_lastDay'),
};
const NIGHT = {
  3: () => { G.joryAt = 14; },
  6: () => { if (!keyed('minnow')) { scene('c2_minnow'); GM.addSheep({ key: 'minnow', name: 'Minnow', kind: 'lamb', look: '', trait: 'sleepy', x: S.lakeIslet.x, y: S.lakeIslet.y, trustMode: 'walk' }); } },
  8: () => { G.frightIntro = true; },
  13: () => { G.hankRunAt = 8; },
  17: () => { G.ludoAt = 12; },
  18: () => leaveTheNinetyNine(),
  20: () => bramRaid(),
  24: () => finalNight(),
  25: () => { scene('c7_flockNight'); },
};

function chapterTick() {
  if (NN.mode !== 'play' && NN.mode !== 'build') return;
  // Ch1: the flock asks for a feeder in the afternoon of day 1
  if (G.day === 1 && G.phase === 'day' && G.t > 45) once('buildHint', () => scene('c1_buildHint'));
  if (G.phase === 'night' && G.joryAt && G.t >= G.joryAt) { G.joryAt = 0; joryArrives(); }
  if (G.phase === 'night' && G.prowlerAt && G.t >= G.prowlerAt) { G.prowlerAt = 0; spawnProwler(); }
  if (G.phase === 'night' && G.frightIntro && G.frights.length) { G.frightIntro = false; once('fright', () => { scene('c3_firstFright'); codex('terror_by_night'); }); }
  if (G.phase === 'night' && G.hankRunAt && G.t >= G.hankRunAt) { G.hankRunAt = 0; hankRuns(); }
  if (G.phase === 'night' && G.ludoAt && G.t >= G.ludoAt) { G.ludoAt = 0; ludoStrikes(); }
  if (G.phase === 'day' && G.day === 13 && G.t > G.len - 40) once('stormComing', () => scene('c4_stormComing'));
  if (G.phase === 'day' && G.day === 16 && G.t > 70 && GM.npc('lou')) once('sus', () => scene('c5_lookoutSus'));
  if (G.chapter === 6 && !flag('raidDone') && G.day === 20 && G.phase === 'day' && G.t > 5) { /* waiting for night */ }
  // Ch3: the Bramble Bunch
  if (G.chapter === 3 && W.doors.thorns && !flag('brambleSpawned')) { flag('brambleSpawned', true); spawnBramble(); }
  if (G.chapter >= 3) {
    for (const k of ['nettle', 'briar', 'sorrel', 'tansy', 'bracken', 'thistle', 'burr', 'minnow', 'dot', 'chomp']) {
      const s = keyed(k);
      if (s && s.state === 'follow' && !flag('joinScene_' + k)) { flag('joinScene_' + k, true); joinScene(k); }
    }
    const b = keyed('bracken');
    if (b && b.trustMode === 'none' && GM.count('infirmary')) b.trustMode = 'walk';
    const brambles = ['nettle', 'briar', 'sorrel', 'tansy', 'bracken'].filter(joined).length;
    if (brambles >= 3 && !keyed('thistle')) {
      const t = GM.addSheep({ key: 'thistle', name: 'Thistle', look: '', trait: 'brave', swap: 'bramble', x: S.thistleHill.x, y: S.thistleHill.y, trustMode: 'still', hurt: true });
      t.look = 'horns'; t.ax = t.x; t.ay = t.y;
      ui().toast('An old ram is watching you from the top of the hill.', 5);
    }
  }
  if (G.chapter === 1 || G.chapter >= 1) {
    const c = keyed('chomp');
    if (c && c.state === 'wild' && c.trust >= 1) { /* handled in joinScene */ }
  }
  // Pip on the night of the ninety-nine
  if (G.flags.pipOut) {
    const p = keyed('pip');
    if (p && W.insideFold(p) && !flag('pipHome')) { flag('pipHome', true); G.flags.pipOut = false; G.holdNight = false; scene('c5_pipHome'); }
  }
  // the flock days: a wandering lamb
  if (G.form === 'sheep') {
    const l = G.sheep.find(s => s.fwLamb);
    if (l && l.state !== 'wild' && !flag('fwLamb')) { flag('fwLamb', true); scene('c7_crumbFound', { fallback: [['narrator', 'The lamb is found. Woolsworth lets out a long, shaky breath.']] }); }
  }
}
// Sheep with stories get a scene when they join. Hurt ones need their trust won first.
function joinScene(k) {
  const map = { nettle: 'c3_nettle', briar: 'c3_briar', sorrel: 'c3_sorrel', tansy: 'c3_tansy', bracken: 'c3_bracken', burr: 'c3_burrFound', minnow: 'c2_minnowFound', dot: 'c4_dot' };
  if (map[k]) scene(map[k]);
  codex('friend_' + k);
}
ST.AI.joinGuard = null;
// Chomp and Thistle: the trust bar fills when you stand still; then the forgive scene before they follow.
const forgiveOnTrust = { chomp: 'c1_chomp', thistle: 'c3_thistle' };
HANDLERS.near = s => {
  if (forgiveOnTrust[s.key] && s.trust >= 0.98 && s.state === 'wild') {
    s.state = 'scene'; s.trust = 0;
    scene(forgiveOnTrust[s.key], { onChoice: () => { G.stats.forgiven++; GM.sfx('forgive'); GM.ring(s.x, s.y - 6, 30, '#f5c542', 1.2); }, done: () => {
      GM.joinFlock(s); s.hurt = true; flag('joinScene_' + s.key, true); codex('friend_' + s.key);
      if (s.key === 'thistle') s.special = 'guard';
    } });
  }
  if (s.key === 'chomp' && G.sh.moving && dist(s, G.sh) < 70) once('chompHint', () => ui().tip('Chomp is scared. Stand still and let him come to you.', 5));
};
// keep forgive-on-trust sheep from joining on their own
const _join = GM.joinFlock;
GM.joinFlock = s => {
  if (forgiveOnTrust[s.key] && s.state === 'wild') { s.trust = 0.99; HANDLERS.near(s); return; }
  _join(s);
};
HANDLERS.healed = s => { if (s.key === 'chomp' && !s.special) { s.special = 'guard'; scene([['chomp', "I've been thinking. These teeth. What if I used them... for wolves?"], ['shepherd', 'Guard the fold, Chomp. Just chase them off.'], ['chomp', 'Chasing. Only chasing. Mostly.']]); } };

// Jory, the thief (night 3)
function joryArrives() {
  GM.addNPC({ id: 'jory', look: 'jory', x: W.WW / 2 + 430, y: W.FIRE.y + 80, aiKey: 'thief', nerve: 1, mode: 'sneak', talk: false, face: -1, dir: 'side' });
  scene('c1_jory');
}
ST.AI.thief = (j, dt) => { // also used for Lou in chapter 5
  if (j.mode === 'scene') { GM.steer(j, j.x, j.y, 0, dt); return true; }
  const d = dist(j, G.sh);
  let slow = 1;
  if (d < 20) { j.nerve -= dt / 3.5; slow = 0.55; if (Math.random() < dt * 2) GM.pop(j.x, j.y - 40, pick(['!', '?!', 'UH']), '#f5c542', 0.5); }
  else j.nerve = Math.min(1, j.nerve + dt / 20);
  if (j.nerve <= 0) { j.mode = 'scene'; (j.id === 'jory' ? joryCaught : ludoCaught)(false); return true; }
  if (j.mode === 'sneak') {
    const pool = G.sheep.filter(s => s.state === 'home' && !(s.job && s.job.type === 'guard'));
    let best = null, bd = 1e9;
    for (const s of pool) { const q = dist(j, s); if (q < bd) { bd = q; best = s; } }
    if (best) {
      const [tx, ty] = W.nav(j, best.x, best.y);
      GM.steer(j, tx, ty, 46 * slow, dt, 1);
      if (bd < 12) {
        const grab = pool.filter(s => dist(s, j) < 36).slice(0, j.id === 'jory' ? 3 : 0);
        grab.forEach((s, i) => { s.state = 'stolen'; s.fi = i; s.leader = j; s.job = null; });
        if (grab.length) ui().toast(`Jory is leading ${grab.map(s => s.name).join(', ')} away!`, 4);
        j.mode = 'run'; j.tx = pick([W.FOLD.x - 300, W.FOLD.x + W.FOLD.w + 300]); j.ty = W.FOLD.y + rand(-160, 260);
      }
    } else GM.steer(j, G.sh.x, G.sh.y, 30, dt, 20);
  } else if (d < 54) {
    const dx = j.x - G.sh.x, dy = j.y - G.sh.y, n = d || 1, wob = Math.sin(performance.now() / 260) * 0.8;
    GM.steer(j, j.x + (dx / n - dy / n * wob) * 40, j.y + (dy / n + dx / n * wob) * 40, 54 * slow, dt, 1);
  } else {
    GM.steer(j, j.tx, j.ty, 48 * slow, dt, 4);
    if (Math.hypot(j.x - j.tx, j.y - j.ty) < 24) { j.tx = clamp(W.GX + rand(-380, 380), 900, 1740); j.ty = clamp(W.FOLD.y + rand(-200, 320), 690, 1300); }
  }
  return true;
};
function joryCaught(atDawn) {
  const j = GM.npc('jory'); if (!j) return;
  j.mode = 'scene'; j.dir = 'side'; j.face = G.sh.x < j.x ? -1 : 1;
  scene(atDawn ? 'c1_joryDawn' : 'c1_joryCaught', {
    onChoice: () => { G.stats.forgiven++; GM.sfx('forgive'); GM.ring(j.x, j.y - 14, 34, '#f5c542', 1.2); codex('the_thief'); },
    done: () => { for (const s of G.sheep) if (s.state === 'stolen') { s.state = 'follow'; s.leader = null; } makeHelper('jory'); GM.dropHearts(j.x, j.y, 5); GM.sfx('join'); ui().toast('Jory joined the farm as Night Watch.', 4); },
  });
}

// ---------------------------------------------------------------- chapter 2: Still Waters
function buildBridge() {
  W.openDoor('bridge'); GM.sfx('build'); GM.ring(S.bridge.x, S.bridge.y, 60, '#f5c542', 1);
  scene('c2_bridgeBuilt');
  GM.addNPC({ id: 'nell', look: 'nell', x: S.nellDock.x, y: S.nellDock.y });
  GM.addNPC({ id: 'abe', look: 'abe', x: S.abeSpot.x, y: S.abeSpot.y, speed: 10 });
  GM.addNPC({ id: 'tobi', look: 'tobi', x: S.village.x, y: S.village.y + 20, speed: 46 });
  GM.addNPC({ id: 'zeb', look: 'zeb', x: S.sycamore.x + 4, y: S.sycamore.y - 6, state: 'still', inTree: true, talk: false });
  GM.spawnWild('river', 9, { modes: ['walk', 'walk', 'whistle', 'patient', 'stubborn', 'still'] });
  GM.spawnWild('marsh', 3);
  GM.spawnPickups();
  ST.refresh();
}
function zebScene() {
  const z = GM.npc('zeb');
  if (!z || helper('zeb')) return;
  scene('c2_zeb', {
    onChoice: () => { G.stats.forgiven++; GM.sfx('forgive'); GM.ring(z.x, z.y - 14, 40, '#f5c542', 1.2); codex('zacchaeus'); },
    done: () => {
      z.inTree = false; z.y = S.sycamore.y + 16; z.state = 'idle';
      const gift = GM.give({ timber: 16, stone: 8, hay: 20, water: 20 }, z.x, z.y);
      makeHelper('zeb');
      scene('c2_zebAfter', { done: () => ui().toast(`Zeb paid it all back four times over: ${gift}. He'll bring supplies every morning.`, 6) });
      ST.refresh();
    },
  });
}
HANDLERS.built2 = null;
const _built = HANDLERS.built;
HANDLERS.built = b => { _built(b); if (b.type === 'well') once('well', () => scene('c2_wellBuilt')); };

// ---------------------------------------------------------------- chapter 3: He Restores My Soul
function cutThorns() {
  G.sh.stun = 0.6; GM.pop(G.sh.x, G.sh.y - 40, 'OW', '#d8574f'); GM.sfx('chop'); G.shake = 0.3;
  W.openDoor('thorns');
  scene('c3_thornWall');
  ST.refresh();
}
function spawnBramble() {
  const T = W.REGIONS.thorns, bx = T.col * W.RW, by = T.row * W.RH;
  const bunch = [
    ['nettle', 'Nettle', 'still', { bites: true }], ['briar', 'Briar', 'patient', {}], ['sorrel', 'Sorrel', 'whistle', {}],
    ['tansy', 'Tansy', 'gift', { gift: { res: 'herbs', amt: 2 } }], ['bracken', 'Bracken', 'none', {}],
  ];
  const spots = [[200, 420], [420, 300], [640, 460], [330, 560], [720, 240]];
  bunch.forEach(([key, name, mode, extra], i) => {
    const s = GM.addSheep(Object.assign({ key, name, look: '', trait: pick(NN.DEFS.TRAITS), swap: 'bramble', x: bx + spots[i][0], y: by + spots[i][1], trustMode: mode, hurt: true }, extra));
    s.ax = s.x; s.ay = s.y;
  });
  GM.spawnWild('thorns', 6, { modes: ['walk', 'patient', 'whistle', 'still'] });
  scene('c3_bramble', { done: () => ui().tip('Each of the Bramble Bunch is hurt in a different way. Watch how they act: some need you still, some need space, some need your whistle, one needs herbs.', 8) });
}

// ---------------------------------------------------------------- chapter 4: Paths of Righteousness
function clearRockslide() {
  W.openDoor('rockslide'); GM.sfx('build'); G.shake = 0.4;
  scene('c4_rockslide');
  ST.refresh();
}
function setupHank() {
  const h = GM.addNPC({ id: 'hank', look: 'hank', x: S.hankCamp.x - 30, y: S.hankCamp.y + 30 });
  h.home = { x: S.hankCamp.x - 20, y: S.hankCamp.y + 30 };
  for (let i = 0; i < 8; i++) {
    const s = GM.addSheep({ x: S.hankCamp.x - 90 + (i % 4) * 22, y: S.hankCamp.y + 60 + Math.floor(i / 4) * 20, state: 'penned', owner: 'hank', trustMode: 'walk' });
    s.ax = s.x; s.ay = s.y;
  }
}
function hankRuns() {
  const h = GM.npc('hank');
  if (!h) return;
  scene('c4_hankRuns', { done: () => {
    h.aiKey = 'runAway'; h.talk = false;
    for (const s of G.sheep) if (s.owner === 'hank') { s.state = 'wild'; s.trustMode = 'walk'; s.immune = false; }
    for (let i = 0; i < 5; i++) GM.spawnWolf({ near: S.hankCamp, anywhere: true });
    ui().tip("Hank's flock is alone on the Old Road. Lead them home.", 6);
  } });
  const dot = GM.addSheep({ key: 'dot', name: 'Dot', kind: 'lamb', look: '', trait: 'chatty', x: 360, y: 260, owner: 'hank', trustMode: 'whistle' });
  dot.ax = dot.x; dot.ay = dot.y; dot.state = 'wild';
}
ST.AI.runAway = (n, dt) => { GM.steer(n, -40, n.y - 40, 70, dt, 1); n.ghost = true; if (n.x < 10) { n.hidden = true; n.vx = n.vy = 0; } return true; };
function hankReturns() {
  for (const s of G.sheep) if (s.owner === 'hank' && s.state !== 'wild') s.owner = null;
  const h = GM.npc('hank') || GM.addNPC({ id: 'hank', look: 'hank', x: S.rockslide.x - 60, y: S.rockslide.y });
  h.aiKey = null; h.hidden = false; h.ghost = false; h.x = W.GX - 60; h.y = W.FOLD.y + W.FOLD.h + 50; h.home = { x: h.x, y: h.y }; h.state = 'still'; h.talk = false;
  scene('c4_hankFlockSafe', { done: () => scene('c4_hank', {
    onChoice: () => { G.stats.forgiven++; GM.sfx('forgive'); GM.ring(h.x, h.y - 14, 34, '#f5c542', 1.2); codex('the_hireling'); },
    done: () => {
      for (const s of G.sheep) if (s.owner === 'hank') { s.owner = null; if (s.state === 'wild') s.lost = true; }
      makeHelper('hank'); ui().toast('Hank is the new Foreman. Every job on the farm runs a little better.', 5);
    },
  }) });
}

// ---------------------------------------------------------------- chapter 5: The Valley of the Shadow
function louArrives() {
  const l = GM.addNPC({ id: 'lou', look: 'ludo', x: W.GX + 40, y: W.FOLD.y + W.FOLD.h + 40, aiKey: 'lou', talk: true });
  l.home = { x: W.FOLD.x + 200, y: W.FOLD.y + 80 };
  scene('c5_lou');
}
ST.AI.lou = (n, dt) => { // Lou "grazes" in the fold like a perfectly normal sheep
  n.wt -= dt;
  if (n.wt <= 0) { n.tx = W.FOLD.x + rand(30, W.FOLD.w - 30); n.ty = W.FOLD.y + rand(30, W.FOLD.h - 30); n.wt = rand(3, 7); }
  const [tx, ty] = W.nav(n, n.tx, n.ty);
  GM.steer(n, tx, ty, 22, dt, 6);
  return true;
};
function ludoStrikes() {
  const l = GM.npc('lou'); if (!l) return;
  l.aiKey = 'thief'; l.mode = 'run'; l.nerve = 1; l.talk = false; l.tx = W.GX; l.ty = W.FOLD.y + W.FOLD.h + 140;
  for (let i = 0; i < 4; i++) GM.spawnWolf({ near: W.FIRE });
  scene('c5_ludo_open', { fallback: [['@lookout', 'BOSS! Lou opened the gate! Lou opened the gate and let the wolves in! Get him!']] });
}
function ludoCaught(atDawn) {
  const l = GM.npc('lou'); if (!l || helper('ludo')) return;
  l.mode = 'scene'; l.aiKey = null; l.state = 'still';
  if (atDawn) { l.x = W.GX + 30; l.y = W.FOLD.y + W.FOLD.h + 40; }
  scene('c5_ludo', {
    onChoice: () => { G.stats.forgiven++; GM.sfx('forgive'); GM.ring(l.x, l.y - 14, 34, '#f5c542', 1.2); codex('wolf_in_wool'); },
    done: () => { GM.removeNPC('lou'); const n = makeHelper('ludo'); n.x = l.x; n.y = l.y; ui().toast('Ludo is the farm\'s new Fleece Inspector. Nobody gets past him in a costume again.', 5); },
  });
}
function leaveTheNinetyNine() {
  // the fold is full; one is missing
  for (const s of G.sheep) if (!s.owner && ['follow', 'home', 'nap'].includes(s.state) && s.key !== 'pip') { s.state = 'home'; if (!W.insideFold(s)) { s.x = W.GX + rand(-100, 100); s.y = W.FOLD.y + rand(30, W.FOLD.h - 30); } }
  const p = GM.addSheep({ key: 'pip', name: 'Pip', kind: 'lamb', look: '', trait: 'sleepy', x: S.pipLedge.x, y: S.pipLedge.y, trustMode: 'walk' });
  p.ax = p.x; p.ay = p.y;
  G.flags.pipOut = true; G.holdNight = true;
  scene('c5_ninetynine', { done: () => ui().tip('Pip is somewhere deep in Shadow Canyon. The night will not end until Pip is home.', 7) });
  for (let i = 0; i < 4; i++) GM.spawnWolf({ near: S.pipLedge, anywhere: true });
  HANDLERS.pipFound = () => {};
}
const _joined = HANDLERS.joined;
HANDLERS.joined = s => {
  _joined(s);
  if (s.key === 'pip' && G.flags.pipOut) scene('c5_pipFound');
};

// ---------------------------------------------------------------- chapter 6: A Table Before My Enemies
function setupBram() {
  const b = GM.addNPC({ id: 'bram', look: 'bram', x: S.bramFarm.x - 60, y: S.bramFarm.y + 40 });
  b.home = { x: S.bramFarm.x - 60, y: S.bramFarm.y + 40 };
  for (let i = 0; i < 12; i++) {
    const s = GM.addSheep({ x: S.bramFarm.x - 110 + (i % 4) * 26, y: S.bramFarm.y + 50 + Math.floor(i / 4) * 22, state: 'penned', owner: 'bram', swap: 'skinny', trustMode: 'walk', joy: 0.2 });
    s.ax = s.x; s.ay = s.y;
  }
  const crumb = GM.addSheep({ key: 'crumb', name: 'Crumb', kind: 'lamb', look: '', trait: 'hungry', swap: 'skinny', x: 2560, y: 120, trustMode: 'patient' });
  crumb.ax = crumb.x; crumb.ay = crumb.y;
}
function feedBram() {
  if (G.res.hay < 6 || G.res.water < 6) { ui().toast(`You need 6 hay and 6 water. You have ${G.res.hay} hay and ${G.res.water} water.`); return; }
  G.res.hay -= 6; G.res.water -= 6; flag('fedBram', true);
  for (const s of G.sheep) if (s.owner === 'bram') { s.joy = 0.7; GM.pop(s.x, s.y - 18, pick(['MUNCH', 'THANKS', 'YUM']), '#f5dd8a'); }
  GM.sfx('munch');
  scene('c6_bramAngry');
  ST.refresh();
}
function bramRaid() {
  scene('c6_raid');
  const mine = G.sheep.filter(s => s.owner === 'bram');
  for (let i = 0; i < 6; i++) GM.spawnWolf({ near: S.bramFarm, anywhere: true, target: pick(mine) });
  const b = GM.npc('bram'); if (b) { b.state = 'still'; }
  G.flags.raiding = true;
}
function inviteBram() {
  const b = GM.npc('bram'); if (!b) return;
  scene('c6_bramInvite', {
    onChoice: () => { G.stats.forgiven++; GM.sfx('forgive'); GM.ring(b.x, b.y - 14, 34, '#f5c542', 1.2); },
    done: () => {
      makeHelper('bram'); codex('the_table');
      for (const s of G.sheep) if (s.owner === 'bram') { s.owner = null; s.state = 'feast'; s.x = W.GX + rand(-120, 120); s.y = S.table.y + rand(10, 40); s.swap = 'skinny'; }
      scene('c6_table');
      ST.refresh();
    },
  });
}

// ---------------------------------------------------------------- chapter 7: The House of the Lord
function finalNight() {
  codex('the_gate');
  G.gateLock = { x: W.GX, y: W.FOLD.y + W.FOLD.h + 6, r: 26 };
  for (const s of G.sheep) if (!s.owner && ['follow', 'home', 'nap', 'wild'].includes(s.state) && !s.lost) { s.state = 'home'; if (!W.insideFold(s)) { s.x = W.GX + rand(-100, 100); s.y = W.FOLD.y + rand(30, W.FOLD.h - 30); } }
  G.sh.x = W.GX; G.sh.y = W.FOLD.y + W.FOLD.h + 6;
  G.prowlerAt = 70; G.holdNight = true;
  scene('c7_gate');
}
function spawnProwler() {
  G.prowler = { x: W.GX, y: W.FOLD.y + W.FOLD.h + 260, vx: 0, vy: 0, anim: 0, face: 1 };
  GM.sfx('roar'); G.shake = 0.6;
  codex('prowling_lion');
  for (const w of G.wolves) w.flee = 3;
  scene('c7_prowler');
}
ST.AI.prowler = (p, dt) => {
  if (p.done) return;
  const tx = G.sh.x, ty = G.sh.y + 6, dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
  p.x += dx / d * 16 * dt; p.y += dy / d * 16 * dt; p.anim += dt * 8; p.face = dx > 0 ? 1 : -1;
  for (const w of G.wolves) if (!w.flee && Math.hypot(w.x - p.x, w.y - p.y) < 120) w.flee = 3;
  if (d < 22) { p.done = true; theFall(); }
};
function theFall() {
  flag('fell', true);
  G.wolves = []; G.frights = [];
  music('sorrow');
  ui().fade(true, 2, () => {
    scene('c7_fall', { done: () => {
      G.prowler = null; G.gateLock = null; G.holdNight = false;
      // three days: the flock alone, until the third morning
      const w = keyed('woolsworth');
      G.form = 'sheep'; G.playerSheep = w ? w.id : null;
      if (w) { w.hidden = true; w.state = 'special'; G.sh.x = w.x; G.sh.y = w.y; } else { G.sh.x = W.GX; G.sh.y = W.FOLD.y + 60; }
      for (const n of G.npcs) if (n.id === 'jory') n.lantern = true;
      G.day = 25; G.phase = 'day'; G.t = 0; G.len = 150; G.sabbath = false;
      G.flags.branches = 0;
      const lamb = keyed('crumb') || G.sheep.find(s => s.kind === 'lamb' && !s.owner);
      if (lamb) { lamb.state = 'wild'; lamb.lost = true; lamb.fwLamb = true; lamb.trustMode = 'walk'; lamb.x = 1600; lamb.y = 1240; lamb.ax = lamb.x; lamb.ay = lamb.y; }
      ui().fade(false, 2);
      ui().banner('Day 25', 'The morning after.');
      ST.refresh();
      scene('c7_flockMorning', { done: () => scene('c7_flockTasks', { done: () => ui().tip('You are Woolsworth now. Press E near sheep to talk. Space: a big BAA. You can headbutt wolves, a little.', 7) }) });
    } });
  });
}
function theReturn() {
  music('morning');
  G.form = 'shepherd'; G.shepLook = 'shepherdDawn';
  const w = G.playerSheep && GM.sheepById(G.playerSheep);
  if (w) { w.hidden = false; w.state = 'home'; w.x = G.sh.x; w.y = G.sh.y; }
  G.sh.x = W.GX; G.sh.y = W.FOLD.y + W.FOLD.h + 20; G.sh.dir = 'down';
  G.helpers.forEach(id => { const n = GM.npc(id); if (n) { n.x = W.GX + rand(-60, 60); n.y = W.FOLD.y + W.FOLD.h + rand(40, 70); } });
  ui().banner('Day 26', 'The third morning.');
  codex('third_day');
  scene('c7_return', { done: () => {
    G.shepLook = 'shepherdScarred';
    scene('c7_feedMySheep', { done: () => {
      codex('feed_my_sheep');
      for (let i = 0; i < 6; i++) G.wolves.push({ x: W.GX + rand(-110, 110), y: W.FOLD.y + W.FOLD.h + rand(40, 120), vx: 0, vy: 0, kx: 0, ky: 0, face: Math.random() < 0.5 ? 1 : -1, anim: 0, fear: 0, fearMax: 99, peace: true, flee: 0, rest: 0, root: 99 });
      scene('c7_wolves', { done: () => { codex('wolf_and_lamb'); codex('good_shepherd'); scene('c7_end', { done: () => ui().credits() }); } });
    } });
  } });
}

// ---------------------------------------------------------------- chapter starts and fallbacks
const CH_START = {
  2: () => { scene('c2_intro', { done: () => scene('c2_bridgeNeed') }); ST.refresh(); },
  3: () => { scene('c3_intro'); },
  4: () => { setupHank(); scene('c4_intro'); },
  5: () => { W.openDoor('canyon'); GM.spawnWild('canyon', 6, { modes: ['walk', 'patient', 'whistle', 'still', 'stubborn'] }); GM.spawnWild('canyon2', 4); scene('c5_intro', { done: () => scene('c5_lamps') }); },
  6: () => { W.openDoor('ridge'); setupBram(); GM.spawnWild('highlands', 6, { modes: ['walk', 'walk', 'patient', 'stubborn', 'whistle'] }); scene('c6_intro', { done: () => scene('c6_olives') }); },
  7: () => { scene('c7_intro'); for (let i = 0; i < 5; i++) { const w = GM.spawnWolf({ anywhere: true }); if (w) w.flee = 4; } },
};
const CH_FALLBACK = {
  1: () => { if (!helper('jory')) { const j = GM.npc('jory'); if (j) joryCaught(true); } },
  2: () => { if (!W.doors.bridge) buildBridge(); },
  3: () => {
    if (!W.doors.thorns) W.openDoor('thorns');
    const t = keyed('thistle');
    if (t && t.state !== 'follow' && t.state !== 'home') { t.x = W.GX; t.y = W.FOLD.y + W.FOLD.h + 30; t.trust = 0.99; HANDLERS.near(t); }
  },
  4: () => { if (!W.doors.rockslide) W.openDoor('rockslide'); },
  5: () => {},
  6: () => { if (!helper('bram') && GM.npc('bram')) inviteBram(); },
};
// The night of the raid ends: Bram saw it.
const _dawn = HANDLERS.dawn;
HANDLERS.dawn = d => {
  if (G.flags.raiding) { G.flags.raiding = false; flag('raidDone', true); }
  _dawn(d);
};
ST.load = () => { ST.refresh(); music(G.form === 'sheep' ? 'sorrow' : G.sabbath ? 'sabbath' : G.phase === 'night' ? 'night' : CH[G.chapter].track); };
})();
