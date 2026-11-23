/* NINETY-NINE · help.js
   Lessons: short cards that pause the game the first time something new happens, plus the "What's new" card for
   each chapter. Text in [brackets] shows as a key. Every lesson is re-readable in How to play (H). */
(() => {
'use strict';
const NN = window.NN;
const G = NN.G, W = NN.WORLD, GM = NN.GAME;
const HELP = NN.HELP = {};

// art: { spr, frame, mods, swap } | { prop } | { human } | { icon }
const L = [
  { id: 'welcome', title: 'You are the Shepherd', art: { human: 'shepherd' }, text: 'Walk with [W][A][S][D] or the arrow keys. On a touch screen, drag anywhere. Your sheep follow you wherever you go.' },
  { id: 'screen', title: 'Reading the screen', art: { icon: 'heart' }, text: 'Top left: your next goal. Press [Q] to see them all. Top right: the day and the time. Bottom left: your supplies and how many sheep are home.' },
  { id: 'trust', title: 'Winning trust', art: { spr: 'sheep' }, text: 'Wild sheep need to trust you first. Stay close to one. When its pink bar fills, it follows you.' },
  { id: 'markers', title: 'Sheep you can\'t see', art: { box: '#fff7e0' }, text: 'Little squares at the edge of the screen point to sheep off-screen. Cream means wild. Gold means lost. Red means someone special.' },
  { id: 'fold', title: 'Bringing them home', art: { prop: 'shelter' }, text: 'Lead your followers through the gate at the bottom of the fold. Sheep inside the fold are home, and safe at night.' },
  { id: 'pickups', title: 'Supplies', art: { prop: 'branchPile' }, text: 'Branches and stones lie all over the map. Walk over them to pick them up. You build with them.' },
  { id: 'build', title: 'Building', art: { prop: 'feeder' }, text: 'Press [B] to build. Pick a building, then place it with the mouse, or walk to the spot and press [Enter]. Feeders and troughs go near the fold.' },
  { id: 'hearts', title: 'Hearts', art: { spr: 'heart' }, text: 'Hearts drop when you care for the flock. Walk over them. When the thin bar at the top fills, you level up and pick a new Knack.' },
  { id: 'dusk', title: 'Night is coming', art: { prop: 'gateBell' }, text: 'The sun is going down. Wolves come at night. Get your followers into the fold before dark.' },
  { id: 'night', title: 'Wolves', art: { spr: 'wolf' }, text: 'Your staff swings by itself when a wolf comes close, and your lantern scares them. Wolves never hurt sheep here. They scatter them, and a scattered sheep is lost until you find it.' },
  { id: 'dawn', title: 'The morning report', art: { prop: 'trough' }, text: 'Each morning the flock eats, drinks and wakes up. Every sheep needs hay, water, room at a feeder and trough, and a bed. The report on the left shows how it went.' },
  { id: 'bell', title: 'Ending the day early', art: { prop: 'gateBell' }, text: 'Finished early? Ring the bell beside the gate with [E] (twice) and the evening comes.' },
  { id: 'jobs', title: 'Jobs', art: { spr: 'sheep', mods: 'bell' }, text: 'Healthy sheep pick up jobs by themselves. Press [F] to see your flock and how each sheep feels. You can ask a sheep to take a job. They can say no if they\'re tired or hungry.' },
  { id: 'lost', title: 'Lost sheep', art: { spr: 'sheep', mods: 'bandage' }, text: 'A gold ? means a sheep got scared and is lost. They know your voice: whistle with [Space] and they trust you twice as fast.' },
  { id: 'still', title: 'Hurt sheep', art: { spr: 'sheep', swap: 'chomp' }, text: 'Hurt sheep bite if you rush them. Stand completely still nearby and let them come to you.' },
  { id: 'whistle', title: 'Frightened sheep', art: { spr: 'sheep' }, text: 'This one is too frightened to come. Whistle with [Space] first, then stay close while it listens.' },
  { id: 'patient', title: 'Shy sheep', art: { spr: 'sheep' }, text: 'This one hides if you walk right up. Stop a little way off and wait. It will come to you.' },
  { id: 'stubborn', title: 'Stubborn sheep', art: { spr: 'sheep' }, text: 'This one runs away from you. Whistle at it three times with [Space], or let your dogs round it up.' },
  { id: 'gift', title: 'A sheep that wants something', art: { icon: 'herbs' }, text: 'This one needs a gift. Walk up and press [E] when you have the supplies it asks for.' },
  { id: 'thief', title: 'Someone is sneaking around', art: { human: 'jory' }, text: 'Stay right next to him. His bar drains while you\'re close. When it runs out, he gives up.' },
  { id: 'hold', title: 'Hard work', art: { prop: 'thornWall' }, text: 'Some jobs take a moment. Hold [E] until the green bar fills.' },
  { id: 'dogs', title: 'Goodness and Mercy', art: { spr: 'dog' }, text: 'Your dogs stay with you for good. They chase wolves at night and help round up stubborn sheep.' },
  { id: 'evolution', title: 'Evolutions', art: { icon: 'heart' }, text: 'Max out two Knacks that go together and a special card appears. Evolutions are the strongest picks in the game.' },
  { id: 'map', title: 'The map', art: { prop: 'signpost' }, text: 'The world is getting bigger. Press [M] for the map. Places you haven\'t reached yet are covered in fog.' },
  { id: 'notes', title: 'The Shepherd\'s Notes', art: { prop: 'signpost' }, text: 'Press [C] to read your notes: the friends you meet, the places you find, and the verse behind each chapter.' },
  { id: 'sabbath', title: 'The Sabbath', art: { prop: 'feastTable' }, text: 'Every seventh day is the Sabbath. No work and no wolves. The sheep are sheared (it\'s good for them), happy sheep may have lambs, and everyone eats together.' },
  { id: 'frights', title: 'Night Frights', art: { spr: 'fright' }, text: 'Frights are shadows. Your staff can\'t touch them. Light fades them: your lantern, the fire, and Lamp Posts.' },
  { id: 'storm', title: 'Storm', art: { spr: 'wolf', swap: 'alpha' }, text: 'Thunder scares any sheep caught outside. Keep them in the fold. Alpha wolves are tougher than the rest.' },
  { id: 'cold', title: 'Cold nights', art: { icon: 'blanket' }, text: 'Sheep without blankets lose joy on cold nights. Knitters at a Loom turn 2 wool into a blanket. Wool comes from shearing on the Sabbath.' },
  { id: 'dark', title: 'Shadow Canyon', art: { prop: 'lampPostLit' }, text: 'It\'s dark down here even at noon. Build Lamp Posts to light the way.' },
  { id: 'woolsworth', title: 'You are Woolsworth', art: { spr: 'sheep', mods: 'shades' }, text: 'You can\'t build or swing a staff. [Space] is a big BAA that pushes wolves back a little, and you headbutt any wolf you bump into. Bring branches to the fire with [E].' },
];
HELP.LESSONS = L;
const byId = id => L.find(l => l.id === id);
HELP.get = byId;
let off = false;
try { off = localStorage.getItem('nn-lessons-off') === '1'; } catch (e) { /* */ }
HELP.enabled = () => !off;
HELP.setEnabled = on => { off = !on; try { localStorage.setItem('nn-lessons-off', on ? '0' : '1'); } catch (e) { /* */ } };
HELP.seen = id => !!(G.flags && G.flags['L_' + id]);
HELP.teach = id => {
  if (!G.flags || G.flags['L_' + id]) return;
  G.flags['L_' + id] = true;
  if (off || !byId(id)) return;
  NN.UI.lesson(byId(id));
};

// ---------------------------------------------------------------- what's new in each chapter
HELP.CHAPTERS = {
  1: [
    [{ spr: 'sheep' }, 'Find the wild sheep in the meadow and bring them home to the fold.'],
    [{ prop: 'feeder' }, 'Feeders, troughs and shelters keep the flock fed, watered and rested. Press [B] to build.'],
    [{ prop: 'workshop' }, 'A Workshop and a Hay Barn give your sheep jobs that bring in supplies.'],
    [{ spr: 'wolf' }, 'Wolves come at night. Keep the flock in the fold and near the light.'],
  ],
  2: [
    [{ prop: 'bridge' }, 'The river blocks the way east. Build a bridge (10 timber) at the crossing to reach the Riverlands.'],
    [{ prop: 'well' }, 'New buildings: the Well brings in lots of water, and a Lookout in the Watchtower spots wolves early.'],
    [{ human: 'nell' }, 'Meet the river folk. Somebody over there is charging for water.'],
    [{ prop: 'feastTable' }, 'Day 7 is the first Sabbath: a day of rest.'],
  ],
  3: [
    [{ prop: 'thornWall' }, 'A thorn wall blocks the north. Hold [E] at the gap to cut through.'],
    [{ spr: 'sheep', swap: 'bramble' }, 'The Bramble Bunch are hurt in different ways. Watch how each one acts before you go close.'],
    [{ prop: 'infirmary' }, 'New buildings: Infirmary, Herb Garden and Lamp Post. Herbs help the Docs heal faster.'],
    [{ spr: 'fright' }, 'Night Frights arrive. Only light chases them away.'],
  ],
  4: [
    [{ prop: 'boulder2' }, 'A rockslide blocks the Old Road. Build a Treadmill, then the crew can pull it clear.'],
    [{ prop: 'treadmill0' }, 'New buildings: Loom and Treadmill. Every Treadmill runner speeds up every job.'],
    [{ human: 'hank' }, 'A hired hand is camped on the road with someone else\'s sheep.'],
    [{ spr: 'wolf', swap: 'alpha' }, 'Alpha wolves are tougher. A storm is on the way.'],
  ],
  5: [
    [{ prop: 'deadTree' }, 'Shadow Canyon is open, and it\'s dark day and night. Light it with Lamp Posts.'],
    [{ icon: 'blanket' }, 'The nights turn cold. Knitters at a Loom make blankets from wool.'],
    [{ spr: 'sheep', mods: 'mask' }, 'Someone new will join the flock. Keep your eyes open.'],
  ],
  6: [
    [{ prop: 'oliveTree' }, 'The Highlands are open. Olive trees drop oil jars.'],
    [{ prop: 'choirStage' }, 'New buildings: Olive Press and Choir Stage. Singers calm the flock at night.'],
    [{ human: 'bram' }, 'A hard shepherd lives up here, and his flock is hungry.'],
    [{ prop: 'feastTable' }, 'Day 21 is the Sabbath. Set a table and invite everyone.'],
  ],
  7: [
    [{ prop: 'hutDay' }, 'Home again. The farm is full of friends.'],
    [{ icon: 'heart' }, 'Spend time with each friend. Walk up and press [E].'],
    [{ prop: 'lampPostLit' }, 'Get the farm ready. Something big is out there.'],
  ],
};

// ---------------------------------------------------------------- when to teach what
const seenMode = {};
const origEmit = NN.STORY.emit;
NN.STORY.emit = (ev, d) => {
  origEmit(ev, d);
  try { onEvent(ev, d); } catch (e) { console.warn(e); }
};
function onEvent(ev, d) {
  const T = HELP.teach;
  switch (ev) {
    case 'joined': if (!d.key || !['woolsworth', 'baabara', 'ramsey'].includes(d.key)) T('fold'); break;
    case 'night': if (!G.sabbath) T('night'); if (G.storm) T('storm'); if (G.cold) T('cold'); break;
    case 'dawn':
      if (G.sabbath) T('sabbath');
      else { T('dawn'); if (d.day >= 2) T('bell'); }
      if (d.day === 4) T('map');
      break;
    case 'jobStart': T('jobs'); break;
    case 'scattered': T('lost'); break;
    case 'near': if (d.trustMode && d.trustMode !== 'walk' && d.trustMode !== 'none' && !seenMode[d.trustMode]) { seenMode[d.trustMode] = true; T(d.trustMode); } break;
    case 'dog': T('dogs'); break;
    case 'evolution': T('evolution'); break;
    case 'tick': tick(); break;
  }
}
function tick() {
  if (NN.mode !== 'play') return;
  const T = HELP.teach, sh = G.sh;
  if (G.form === 'sheep') { T('woolsworth'); return; }
  if (G.sheep.some(s => s.state === 'wild' && s.trust > 0.05 && s.trustMode === 'walk')) T('trust');
  if (G.day === 1 && G.t > 30 && HELP.seen('trust')) T('markers');
  if (G.pickups.some(p => Math.abs(p.x - sh.x) < 80 && Math.abs(p.y - sh.y) < 60)) T('pickups');
  if (G.day === 1 && G.t > 52) T('build');
  if (G.hearts.length) T('hearts');
  if (G.phase === 'day' && !G.sabbath && G.len - G.t < 16) T('dusk');
  if (G.npcs.some(n => n.aiKey === 'thief')) T('thief');
  if (NN.UI.current && NN.UI.current.hold) T('hold');
  if (G.frights.length) T('frights');
  if (G.phase === 'day' && W.darkAt(sh.x, sh.y) > 0) T('dark');
  if (G.codex.length > 8) T('notes');
}
})();
