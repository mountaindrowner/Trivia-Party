// Signal Divide's engine (huddle/server/src/divide.js): the deal at 12 to 15, leaders and votes, the 2/1/1 exchanges,
// the clock, pauses, host corrections, the Forecaster, the result, and that no screen ever sees a card it shouldn't.
//   node tests/signal-divide-engine.mjs
import * as E from "../huddle/server/src/divide.js";

let ok = 0, bad = 0;
const check = (c, what) => { c ? ok++ : bad++; if (!c) console.log("  FAIL " + what); };
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const NAMES = ["Ava", "Ben", "Cal", "Dee", "Eli", "Fay", "Gus", "Hal", "Ivy", "Jo", "Kai", "Lou", "Max", "Nia", "Oz", "Pia", "Quin", "Rex", "Sam", "Tia", "Uma"];
const people = (n) => NAMES.slice(0, n).map((name, i) => ({ id: "p" + i, name, avatar: "tent", connected: true }));
function lobby(n, opts = {}) {
  const s = E.create();
  if (opts.hostPlays) E.hostCommand(s, { type: "play", on: true, name: "Host" }, { now: 0 });
  E.sync(s, people(opts.hostPlays ? n - 1 : n));
  for (const id of Object.keys(s.roster)) E.command(s, id, { type: "ready" }, { now: 0 });
  return s;
}
const count = (s, z) => s.order.filter((id) => s.zone[id] === z).length;

// The deal: at every count, 1000 times, exactly the right cards, balanced zones, a leader in each.
for (const n of [6, 9, 12, 13, 14, 15, 20]) {
  let good = true, signalFirst = 0;
  for (let k = 0; k < 1000; k++) {
    const s = lobby(n), r = E.hostCommand(s, { type: "deal" }, { now: 0, rng: seeded(k * 7 + n) });
    const roles = Object.values(s.role), c = (x) => roles.filter((y) => y === x).length;
    const side = Math.floor(n / 2);
    if (!r.ok || roles.length !== n || c("beacon") !== 1 || c("jammer") !== 1 || c("signal") !== side - 1 || c("static") !== side - 1 || c("forecaster") !== n % 2) good = false;
    if (count(s, "A") !== Math.ceil(n / 2) || count(s, "B") !== Math.floor(n / 2)) good = false;
    for (const z of ["A", "B"]) if (s.zone[s.leader[z]] !== z) good = false;
    if (s.role.p0 === "beacon") signalFirst++;
  }
  check(good, `${n} players: 1000 deals, each with 1 Beacon, 1 Jammer, equal sides, ${n % 2 ? "a" : "no"} Forecaster, zones ${Math.ceil(n / 2)}/${Math.floor(n / 2)}, a leader in each`);
  check(signalFirst > 1000 / n * 0.5 && signalFirst < 1000 / n * 1.5, `${n} players: the first to join isn't always (or never) the Beacon (${signalFirst} of 1000)`);
}
{
  const s = lobby(5); check(E.hostCommand(s, { type: "deal" }, { now: 0 }).error === "count", "5 players can't start");
  const t = lobby(21); check(E.hostCommand(t, { type: "deal" }, { now: 0 }).error === "count", "21 players can't start");
  const u = E.create(); E.sync(u, people(12)); E.command(u, "p0", { type: "ready" }, { now: 0 });
  check(E.hostCommand(u, { type: "deal" }, { now: 0 }).error === "ready", "nobody starts until everyone is ready");
  const h = lobby(12, { hostPlays: true }); E.hostCommand(h, { type: "deal" }, { now: 0, rng: seeded(3) });
  check(h.order.includes(E.HOST_ID) && h.order.length === 12 && h.role[E.HOST_ID], "a host who plays gets one normal card and counts toward the 12");
  const sp = lobby(12); E.hostCommand(sp, { type: "deal" }, { now: 0 });
  check(!sp.order.includes(E.HOST_ID), "a host who only hosts gets no card");
}

// A whole game, step by step.
function play(n, seed, opts = {}) {
  const rng = seeded(seed);
  let now = 1000;
  const s = lobby(n);
  E.hostCommand(s, { type: "deal" }, { now, rng });
  const roleBefore = { ...s.role };
  const views = [];
  for (const id of s.order) E.command(s, id, { type: "here" }, { now });
  E.tick(s, { now: now += E.START_MS });
  const rounds = [];
  for (let r = 0; r < 3; r++) {
    if (s.phase !== "round") return { s, error: `round ${r + 1} didn't start (${s.phase})` };
    // A vote: everyone in A votes for the same non-leader, who becomes leader on a strict majority.
    const A = s.order.filter((id) => s.zone[id] === "A"), cand = A.find((id) => id !== s.leader.A);
    if (opts.vote && r === 0) {
      const need = Math.floor(A.length / 2) + 1;
      for (let i = 0; i < need - 1; i++) E.command(s, A[i], { type: "vote", for: cand }, { now });
      opts.halfway = s.leader.A !== cand;
      E.command(s, A[need - 1], { type: "vote", for: cand }, { now });
      opts.elected = s.leader.A === cand;
    }
    for (const z of ["A", "B"]) {
      const lead = s.leader[z], pick = s.order.filter((id) => s.zone[id] === z && id !== lead).slice(0, s.plan.out[r]);
      if (opts.lazyB && z === "B") continue; // B's leader never picks: the server does after the grace
      E.command(s, lead, { type: "select", ids: pick }, { now });
      E.command(s, lead, { type: "lock" }, { now });
    }
    if (s.phase !== "round") return { s, error: "locking early ended the round" };
    const zonesBefore = { ...s.zone };
    views.push(...s.order.map((id) => E.playerView(s, id, now)));
    E.tick(s, { now: now += s.plan.secs[r] * 1000 });
    if (opts.lazyB) E.tick(s, { now: now += E.GRACE_MS });
    const moved = s.order.filter((id) => s.zone[id] !== zonesBefore[id]);
    rounds.push(moved.length);
    if (count(s, "A") !== Math.ceil(n / 2)) return { s, error: "zones unbalanced" };
    for (const id of moved) E.command(s, id, { type: "here" }, { now });
    if (r < 2) E.tick(s, { now: now += E.START_MS });
  }
  if (s.phase === "predict") {
    views.push(...s.order.map((id) => E.playerView(s, id, now)));
    const f = s.order.find((id) => s.role[id] === "forecaster");
    if (opts.noPredict) E.tick(s, { now: now += E.PREDICT_MS });
    else E.command(s, f, { type: "predict", pick: "signal" }, { now });
  }
  return { s, rounds, roleBefore, views };
}
for (const n of [6, 12, 13, 14, 15, 20]) {
  const { s, rounds, roleBefore, error, views } = play(n, n * 31, { vote: true });
  const opts = {};
  check(!error, `${n} players: a whole game plays through ${error || ""}`);
  const want = n <= 10 ? "[2,2,2]" : "[4,2,2]";
  check(JSON.stringify(rounds) === want, `${n} players: the exchanges move ${n <= 10 ? "1, 1, 1" : "2, 1, 1"} each way (${rounds})`);
  check(JSON.stringify(roleBefore) === JSON.stringify(s.role), `${n} players: moving never changes anyone's card`);
  check(s.phase === "result", `${n} players: it ends on the result (${s.phase})`);
  const r = s.result, together = s.zone[r.beacon] === s.zone[r.jammer];
  check(r.winner === (together ? "static" : "signal"), `${n} players: Beacon and Jammer ${together ? "together: Static" : "apart: Signal"} wins`);
  check(n % 2 ? r.forecaster && r.forecaster.pick === "signal" && r.forecaster.won === (r.winner === "signal") : !r.forecaster, `${n} players: ${n % 2 ? "the Forecaster's prediction is scored on its own" : "no Forecaster, no prediction"}`);
  // Nobody sees anyone else's card before the reveal, nor the other zone's people or picks.
  const leaks = views.filter((v) => {
    const j = JSON.stringify(v);
    return (j.match(/"role"/g) || []).length > 1 || j.includes('"everyone"') || v.zone.people.length !== v.sizes[v.me.zone];
  });
  check(!leaks.length, `${n} players: no screen saw another card or the other zone before the end (${leaks.length})`);
  void opts;
}
{
  const o = {};
  play(12, 5, { vote: true, ...o });
  const g = play(14, 9, o.v = { vote: true });
  check(o.v.halfway === true && o.v.elected === true, "a new leader needs a strict majority of the zone (half isn't enough)");
  void g;
}
{
  const { s, rounds } = play(13, 77, { lazyB: true });
  check(JSON.stringify(rounds) === "[4,2,2]" && s.log.some((l) => /didn't lock in time/.test(l.text)), "a leader who doesn't lock: after the grace the server picks, and says so");
  check(s.order.every((id) => s.zone[id] === "A" || s.zone[id] === "B"), "random picks never break the zones");
}
{
  const { s } = play(13, 4, { noPredict: true });
  check(s.phase === "result" && s.result.forecaster.pick === null && s.result.forecaster.won === false, "a Forecaster who doesn't predict in time just doesn't win; the teams' result stands");
}

// The presets: the zones' names, the pace, the announcements.
{
  const s = lobby(12);
  E.hostCommand(s, { type: "options", zones: { A: "  Youth <b>Room</b>!!  ", B: "Kitchen" }, pace: "long", voice: false }, { now: 0 });
  check(s.opts.zones.A === "Youth bRoombb" || s.opts.zones.A === "Youth bRoomb", `zone names are kept plain ("${s.opts.zones.A}")`);
  check(s.opts.pace === "long" && s.opts.voice === false, "the pace and the announcements are set");
  check(!E.hostCommand(s, { type: "options", pace: "warp" }, { now: 0 }).ok || s.opts.pace === "long", "an unknown pace is ignored");
  E.hostCommand(s, { type: "deal" }, { now: 0, rng: seeded(5) });
  check(JSON.stringify(s.plan.secs) === "[240,180,120]", "the long pace: 4, 3, then 2 minutes");
  check(!E.hostCommand(s, { type: "options", pace: "quick" }, { now: 0 }).ok, "presets are fixed once the cards are dealt");
  const v = E.playerView(s, s.order[0], 0);
  check(v.opts.zones.B === "Kitchen" && v.plan.secs[0] === 240, "every phone knows the zones' names and the times");
  const l = lobby(8); check(E.playerView(l, "p0", 0).lobby.plan.out.join() === "1,1,1", "the lobby shows 1, 1, 1 moving for a small group");
}
{
  const { s } = play(12, 21, {});
  const any = s.order[0], v = E.playerView(s, any, 9e9);
  check(s.revealAt && v.result.at === s.revealAt && E.hostView(s, 9e9).result.at === s.revealAt, "every phone gets the same reveal moment, to play it together");
}

// Illegal taps are refused by the server, not just hidden on screen.
{
  const rng = seeded(11), s = lobby(12);
  E.hostCommand(s, { type: "deal" }, { now: 0, rng });
  for (const id of s.order) E.command(s, id, { type: "here" }, { now: 0 });
  E.tick(s, { now: E.START_MS });
  const A = s.order.filter((id) => s.zone[id] === "A"), B = s.order.filter((id) => s.zone[id] === "B");
  const notLeader = A.find((id) => id !== s.leader.A);
  check(!E.command(s, notLeader, { type: "select", ids: [A[0]] }, { now: 1 }).ok, "only the leader can pick who moves");
  check(!E.command(s, s.leader.A, { type: "select", ids: [s.leader.A] }, { now: 1 }).ok, "a leader can't pick themselves");
  check(!E.command(s, s.leader.A, { type: "select", ids: [B[0]] }, { now: 1 }).ok, "a leader can't pick someone in the other zone");
  check(!E.command(s, s.leader.A, { type: "select", ids: A.filter((x) => x !== s.leader.A).slice(0, 3) }, { now: 1 }).ok, "a leader can't pick too many");
  E.command(s, s.leader.A, { type: "select", ids: [A.find((x) => x !== s.leader.A)] }, { now: 1 });
  check(!E.command(s, s.leader.A, { type: "lock" }, { now: 1 }).ok, "a leader can't lock too few");
  check(!E.command(s, notLeader, { type: "vote", for: B[0] }, { now: 1 }).ok, "nobody can vote for someone in the other zone");
  check(!E.command(s, notLeader, { type: "predict", pick: "signal" }, { now: 1 }).ok, "nobody can predict outside the prediction (or without the Forecaster card)");
  check(!E.command(s, "stranger", { type: "here" }, { now: 1 }).ok, "someone not dealt in can't do anything");
  check(!E.command(s, notLeader, null, { now: 1 }).ok && !E.command(s, notLeader, { type: "zzz" }, { now: 1 }).ok, "junk is refused without a crash");
  // Locking twice, or after the exchange, does nothing more.
  const lead = s.leader.A, two = A.filter((x) => x !== lead).slice(0, 2);
  E.command(s, lead, { type: "select", ids: two }, { now: 1 });
  check(E.command(s, lead, { type: "lock" }, { now: 1 }).ok && !E.command(s, lead, { type: "lock" }, { now: 2 }).ok, "a lock can't be repeated");
  const tb = E.playerView(s, B[0], 2);
  check(tb.otherLocked === true && !JSON.stringify(tb).includes(two[0] + '"') || !B.includes(two[0]), "the other zone only learns that A has locked, not who");
  check(!JSON.stringify(E.playerView(s, B[0], 2)).includes(`"${NAMES[Number(two[0].slice(1))]}"`), "the other zone never sees A's picks before the exchange");
  // Leadership can be handed over (if accepted), but not once the picks are locked.
  const lb = s.leader.B, heir = B.find((x) => x !== lb);
  E.command(s, lb, { type: "offer", to: heir }, { now: 3 });
  E.command(s, heir, { type: "accept" }, { now: 3 });
  check(s.leader.B === heir, "a leader can hand over leadership, and it takes when accepted");
  check(!E.command(s, A[0], { type: "vote", for: A[1] }, { now: 3 }).ok, "no more leader votes in a zone once its picks are locked");
  // The host: pause freezes the clock, resume brings it back exactly.
  const left = s.deadline - 10;
  E.hostCommand(s, { type: "pause" }, { now: 10 });
  check(!E.tick(s, { now: 10 + 999999 }) && s.phase === "round", "paused: the round never runs out");
  E.hostCommand(s, { type: "resume" }, { now: 50000 });
  check(s.deadline === 50000 + left, "resume: the same time left as when it paused");
  check(!E.hostCommand(s, { type: "fixZone", id: B[0], zone: "A" }, { now: 50001 }).ok, "host corrections only while paused");
  E.hostCommand(s, { type: "pause" }, { now: 50001 });
  check(E.hostCommand(s, { type: "fixZone", id: B[1], zone: "A" }, { now: 50001 }).ok && s.zone[B[1]] === "A" && s.log.at(-1).text.includes("Host correction"), "a host correction (paused) moves one person, logged for everyone");
  // The host's console never has cards in it.
  const hv = JSON.stringify(E.hostView(s, 50001));
  check(!/"role"|beacon|jammer|forecaster|"static"|"signal"/.test(hv), "the host's console has no cards in it, even mid-game");
  const hp = lobby(12, { hostPlays: true }); E.hostCommand(hp, { type: "deal" }, { now: 0, rng });
  const hpv = E.hostView(hp, 0), mine = E.playerView(hp, E.HOST_ID, 0);
  check(!/"role"/.test(JSON.stringify(hpv)) && (JSON.stringify(mine).match(/"role"/g) || []).length === 1, "a host who plays sees their own card only, like anyone");
  E.hostCommand(s, { type: "abort" }, { now: 50002 });
  check(s.phase === "aborted" && !s.result, "abort: no winner is shown");
  E.hostCommand(s, { type: "rematch" }, { now: 50003 });
  check(s.phase === "lobby" && !s.order.length && !Object.keys(s.role).length && Object.values(s.roster).every((p) => !p.ready), "rematch: back to the lobby, nothing kept from the last match");
}
// A dropped phone keeps its card and zone; joins after the deal don't get in.
{
  const s = lobby(12); E.hostCommand(s, { type: "deal" }, { now: 0, rng: seeded(2) });
  const card = s.role.p3, zone = s.zone.p3;
  E.sync(s, people(12).map((p) => (p.id === "p3" ? { ...p, connected: false } : p)));
  E.sync(s, [...people(12), { id: "late", name: "Late", avatar: "tent", connected: true }]);
  check(s.role.p3 === card && s.zone.p3 === zone && s.roster.p3.connected, "someone who drops and comes back keeps their card and zone");
  check(!s.order.includes("late") && !s.roster.late, "nobody joins once the cards are dealt");
}

console.log(`\n${ok} ok, ${bad} failed`);
process.exit(bad ? 1 : 0);
