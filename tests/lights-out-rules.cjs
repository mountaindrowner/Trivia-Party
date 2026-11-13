// Lights Out's rules (bonfire/night/rules.js): the deck, the night in order, the vote and who wins.
//   node tests/lights-out-rules.cjs
// (rules.js is a plain browser script: loading it sets LIGHTS_OUT_RULES.)
require('../bonfire/night/rules.js');
const R = globalThis.LIGHTS_OUT_RULES;
let ok = 0, bad = 0;
const check = (c, what) => { c ? ok++ : bad++; if (!c) console.log('  FAIL ' + what); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const count = (arr, x) => arr.filter((y) => y === x).length;

// The deck: n + 3 cards, the Bunkmates as a pair, 2 wolves (3 from 10 players), every role real.
for (let n = 3; n <= 12; n++) for (const easy of [false, true]) {
  const d = R.deck(n, easy);
  check(d.length === n + 3, `deck for ${n}${easy ? ' (easy)' : ''} has ${n + 3} cards (${d.length})`);
  check(d.every((r) => R.ROLES[r]), `deck for ${n}: every card is a role`);
  check([0, 2].includes(count(d, 'bunkmate')), `deck for ${n}: Bunkmates come in pairs`);
  check(count(d, 'wolf') === (n >= 10 ? 3 : 2), `deck for ${n}: ${n >= 10 ? 3 : 2} wolves`);
}

const names = { a: 'Ava', b: 'Ben', c: 'Cal', d: 'Dee', e: 'Eli' };
const game = (start, center) => ({ start, center });

// The Counselor looks before the Sneak and the Prankster swap; the Night Owl looks after.
{
  const g = game({ a: 'counselor', b: 'wolf', c: 'sneak', d: 'prankster', e: 'owl' }, ['camper', 'wolf', 'raccoon']);
  const r = R.resolve(g, { a: { players: ['b'] }, c: { players: ['b'] }, d: { players: ['a', 'e'] } }, names);
  check(r.learned.a[0].includes('🐺 Wolf'), 'the Counselor sees the wolf card before the Sneak takes it');
  check(r.final.c === 'wolf' && r.final.b === 'sneak', 'the Sneak swaps with the wolf');
  check(r.learned.c[0].includes('You\'re now: 🐺 Wolf') && r.learned.c[0].includes('wolves\' side'), 'the Sneak learns they are a wolf now');
  check(r.final.a === 'owl' && r.final.e === 'counselor', 'the Prankster swaps two others');
  check(r.learned.e[0].includes('It changed!') && r.learned.e[0].includes('Counselor'), 'the Night Owl sees the card they ended with');
  check(r.learned.b[0].includes('only wolf'), 'a lone wolf is told so');
  check(r.story.length >= 3, 'the story tells what happened');
  // Ben (who started as the wolf) is voted out: he's the Sneak now, so no wolf is out and the wolves (Cal) win.
  const v = R.tally({ a: 'b', c: 'b', d: 'b', e: 'a', b: 'a' }, Object.keys(g.start));
  check(eq(v.out, ['b']), 'the most votes is out');
  const o = R.outcome(r.final, v.out, names);
  check(o.kind === 'wolf' && o.winners.includes('c') && !o.winners.includes('b'), 'voting out the old wolf: the new wolf wins');
}

// The vote: a tie puts both out; nobody with more than one vote means nobody is out; no voting for yourself.
{
  const ids = ['a', 'b', 'c', 'd'];
  check(eq(R.tally({ a: 'b', b: 'a', c: 'b', d: 'a' }, ids).out, ['a', 'b']), 'a tie: both are out');
  check(eq(R.tally({ a: 'b', b: 'c', c: 'd', d: 'a' }, ids).out, []), 'one vote each: nobody is out');
  check(R.tally({ a: 'a', b: 'a' }, ids).count.a === 1, 'a vote for yourself does not count');
}

// Who wins.
{
  const f = { a: 'camper', b: 'wolf', c: 'raccoon', d: 'homesick', e: 'counselor' };
  let o = R.outcome(f, ['b'], names);
  check(o.kind === 'camp' && eq(o.winners.sort(), ['a', 'e']), 'a wolf out: the camp wins (not the Raccoon or Homesick)');
  o = R.outcome(f, ['a'], names);
  check(o.kind === 'wolf' && eq(o.winners.sort(), ['b', 'c']), 'a camper out: the wolves and the Raccoon win');
  check(/No wolf was voted out\. .*the wolf was Ben\./.test(o.why), `the reveal says why: "${o.why}"`);
  check(/Ben was a wolf/.test(R.outcome(f, ['b'], names).why), 'and why the camp won');
  o = R.outcome(f, [], names);
  check(o.kind === 'wolf', 'nobody out with a wolf around: the wolves win');
  o = R.outcome(f, ['d'], names);
  check(o.kind === 'homesick' && eq(o.winners, ['d']), 'Homesick out: only Homesick wins');
  o = R.outcome(f, ['c'], names);
  check(o.kind === 'wolf' && o.winners.includes('c'), 'the Raccoon voted out: the wolves (and the Raccoon) still win');
  o = R.outcome(f, ['b', 'd'], names);
  check(o.kind === 'camp' && o.winners.includes('d') && o.winners.includes('a'), 'a wolf and Homesick out: the camp and Homesick win');
  const nw = { a: 'camper', b: 'raccoon', c: 'counselor' };
  check(R.outcome(nw, [], names).kind === 'camp', 'no wolves and nobody out: the camp wins');
  o = R.outcome(nw, ['a'], names);
  check(o.kind === 'nobody' && eq(o.winners, ['b']), 'no wolves and a camper out: only the Raccoon wins');
}

// The Sleepwalker always swaps (at random if they didn't tap); Bunkmates see each other.
{
  const g = game({ a: 'sleepwalker', b: 'bunkmate', c: 'bunkmate', d: 'camper' }, ['wolf', 'wolf', 'camper']);
  const r = R.resolve(g, { d: { players: ['a'] } }, names, () => 0.1);
  check(r.final.a === 'wolf' && r.center[0] === 'sleepwalker', 'the Sleepwalker swaps with the middle without tapping');
  check(r.learned.b[0].includes('Cal') && r.learned.c[0].includes('Ben'), 'the Bunkmates see each other');
  check(r.hunch.d === 'a' && r.learned.d[0].includes('Ava'), 'a Camper\'s hunch is kept');
}

// A few thousand random nights: the cards are only ever moved, never made up, and everyone hears something.
{
  let good = true, said = true, sane = true;
  for (let k = 0; k < 3000; k++) {
    const n = 3 + (k % 10), ids = Array.from({ length: n }, (_, i) => 'p' + i), nm = Object.fromEntries(ids.map((id) => [id, id.toUpperCase()]));
    const g = R.deal(ids, R.deck(n, k % 7 === 0));
    const acts = {};
    for (const id of ids) acts[id] = { players: R.shuffle(ids).slice(0, 2), center: R.shuffle([0, 1, 2]).slice(0, 2) };
    const r = R.resolve(g, acts, nm);
    const before = [...Object.values(g.start), ...g.center].sort(), after = [...Object.values(r.final), ...r.center].sort();
    if (!eq(before, after)) good = false;
    if (!ids.every((id) => (r.learned[id] || []).length)) said = false;
    const votes = Object.fromEntries(ids.map((id) => [id, ids[(ids.indexOf(id) + 1 + (k % 3)) % n]]));
    const v = R.tally(votes, ids), o = R.outcome(r.final, v.out, nm);
    if (!o.headline || !o.winners.every((id) => ids.includes(id)) || (o.camp && o.wolves)) sane = false;
  }
  check(good, 'random nights: the same cards before and after');
  check(said, 'random nights: every player learns something');
  check(sane, 'random nights: one sensible outcome each time');
}

console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad ? 1 : 0);
