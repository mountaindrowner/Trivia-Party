/* Signal Divide: the game engine, run by the room server (relay.js) rather than by anyone's phone.

   6 to 20 people (best with 12 to 15), two physical zones (A and B), two secret teams. Signal protects the Beacon,
   Static has the Jammer. Three timed rounds (3, 2, 1 minutes, or the host's pick of pace); at the end of each, each
   zone's leader sends 2, then 1, then 1 people to the other zone (1, 1, 1 with 10 or fewer). At the end: Beacon and Jammer in the same zone, Static wins; apart, Signal wins. At 13 or 15 players a
   neutral Forecaster predicts the winner before the reveal. Nobody is knocked out, and role cards never move: only
   people do.

   The server owns everything secret: the cards, the zones, the clock, the votes, the exchanges and the result. Every
   phone (the host's too) only ever gets its own view: its own card, its own zone's people, leader, votes and picks,
   and whether the other zone's leader has locked in. The other zone's picks and everyone's cards stay on the server
   until the reveal. The host's console sees head counts, arrivals and controls, never cards.

   Pure functions over a plain state object (stored by the room), so the rules can be tested without a server:
     create() -> state
     sync(state, players)                        the room's people (joins, leaves, rejoins)
     command(state, id, data, ctx) -> { ok, error? }   a player's tap (id "@host" for a host who plays)
     hostCommand(state, data, ctx) -> { ok, error? }   the host's console
     tick(state, ctx) -> changed?                deadlines (the round ends, a leader's grace runs out, ...)
     nextDeadline(state) -> ms | null            when tick needs to run next
     playerView(state, id, now), hostView(state, now)   what each screen may know
   ctx = { now, rng? } (rng only in tests; otherwise crypto randomness). */

export const HOST_ID = "@host";
export const MIN_PLAYERS = 6, MAX_PLAYERS = 20, BEST = [12, 15];
/* The host's presets: how long each round's talk is (seconds), and who's sent at the end of each. */
export const PACES = { quick: [120, 90, 60], standard: [180, 120, 60], long: [240, 180, 120] };
export const outbound = (n) => (n <= 10 ? [1, 1, 1] : [2, 1, 1]);
export const ROUNDS = PACES.standard.map((secs, i) => ({ secs, out: outbound(12)[i] })); // the classic 12-to-15 game
export const GRACE_MS = 20000, PREDICT_MS = 20000, START_MS = 5000;
export const ROLE_FACTION = { beacon: "signal", jammer: "static", signal: "signal", static: "static", forecaster: "neutral" };
const ZONES = ["A", "B"];
const other = (z) => (z === "A" ? "B" : "A");

/* ---------- Randomness: crypto, unbiased (tests may pass their own) ---------- */
function randInt(n, rng) {
  if (rng) return Math.floor(rng() * n);
  const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  do crypto.getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}
function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1, rng); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- State ---------- */
/** opts.fast: every clock 30 times quicker, for local tests only (the DIVIDE_FAST variable, never set on the real site). */
export function create(opts = {}) {
  return { phase: "lobby", rev: 0, match: 0, host: { plays: false, name: "Host", avatar: "moon" }, roster: {}, log: [], fast: !!opts.fast,
    opts: { zones: { A: "", B: "" }, pace: "standard", voice: true }, ...fresh() };
}
/** A zone's name the host typed ("Kitchen"), kept short and plain. */
const cleanName = (x) => String(x || "").replace(/[^\p{L}\p{N} '&.,-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 18);
const ms = (s, x) => (s.fast ? Math.round(x / 30) : x);
/** Everything about one match, cleared for the next. */
function fresh() {
  return {
    order: [], role: {}, zone: {}, arrived: {}, leader: { A: null, B: null }, votes: { A: {}, B: {} }, offer: { A: null, B: null },
    sel: { A: [], B: [] }, locked: { A: false, B: false }, round: 0, final: false, deadline: null, graceUntil: null, startAt: null,
    paused: null, moves: [], prediction: null, result: null, auto: { A: false, B: false },
    plan: { secs: PACES.standard.slice(), out: outbound(12) }, exchangeAt: null, revealAt: null,
  };
}
const log = (s, now, text) => { s.log.push({ at: now, text }); if (s.log.length > 30) s.log.splice(0, s.log.length - 30); };
const inGame = (s) => ["arrival", "round", "lock", "moving", "predict"].includes(s.phase);
const members = (s, z) => s.order.filter((id) => s.zone[id] === z);
const nameOf = (s, id) => (s.roster[id] && s.roster[id].name) || "Someone";
const need = (s) => s.plan.out[s.round];
const majority = (n) => Math.floor(n / 2) + 1;
const forecaster = (s) => s.order.find((id) => s.role[id] === "forecaster") || null;

/** The room's people: [{ id, name, avatar, connected }] (phones), plus the host when they play. Before the deal they
    are the lobby; after it, the people dealt in stay in the game whatever happens to their connection. */
export function sync(s, players) {
  const want = players.map((p) => ({ ...p }));
  if (s.host.plays) want.unshift({ id: HOST_ID, name: s.host.name, avatar: s.host.avatar, connected: true });
  if (s.phase === "lobby") {
    const next = {};
    for (const p of want) next[p.id] = { id: p.id, name: p.name, avatar: p.avatar, connected: p.connected !== false, ready: p.id === HOST_ID ? true : !!(s.roster[p.id] && s.roster[p.id].ready) };
    s.roster = next;
  } else {
    for (const p of want) if (s.roster[p.id]) Object.assign(s.roster[p.id], { name: p.name, avatar: p.avatar, connected: p.connected !== false });
    // Someone dealt in who has gone from the room entirely stays in the game, shown as away.
    for (const id of Object.keys(s.roster)) if (!want.some((p) => p.id === id)) s.roster[id].connected = false;
  }
  s.rev++;
}

/* ---------- The deal ---------- */
/** The cards for n players: equal Signal and Static (each with its one special card), and a Forecaster when n is odd. */
export function deck(n) {
  const side = Math.floor(n / 2);
  return ["beacon", "jammer", ...Array(side - 1).fill("signal"), ...Array(side - 1).fill("static"), ...(n % 2 ? ["forecaster"] : [])];
}
function deal(s, ctx) {
  const ids = Object.keys(s.roster), n = ids.length;
  Object.assign(s, fresh());
  const cards = shuffle(deck(n), ctx.rng), byCard = shuffle(ids, ctx.rng), byZone = shuffle(ids, ctx.rng);
  byCard.forEach((id, i) => { s.role[id] = cards[i]; });
  byZone.forEach((id, i) => { s.zone[id] = i < Math.ceil(n / 2) ? "A" : "B"; });
  s.order = ids;
  s.plan = { secs: (PACES[s.opts.pace] || PACES.standard).slice(), out: outbound(n) };
  for (const z of ZONES) { const m = members(s, z); s.leader[z] = m[randInt(m.length, ctx.rng)]; }
  s.phase = "arrival"; s.match++;
  for (const id of ids) s.arrived[id] = false;
  log(s, ctx.now, `Match ${s.match}: cards dealt to ${n} players.`);
}

/* ---------- The round: leaders, votes, picks ---------- */
function startRound(s, ctx) {
  s.phase = "round"; s.startAt = null; s.graceUntil = null;
  const secs = s.plan.secs[s.round];
  s.deadline = ctx.now + ms(s, secs * 1000);
  s.offer = { A: null, B: null }; s.auto = { A: false, B: false };
  log(s, ctx.now, `Round ${s.round + 1} started: ${secs % 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : `${secs / 60} minute${secs > 60 ? "s" : ""}`}, then ${need(s)} from each zone move.`);
}
function setLeader(s, z, id, now, why) {
  if (s.leader[z] === id) return;
  s.leader[z] = id; s.votes[z] = {}; s.offer[z] = null;
  if (!s.locked[z]) s.sel[z] = []; // a new leader makes their own picks
  log(s, now, `${nameOf(s, id)} is now Zone ${z}'s leader${why ? ` (${why})` : ""}.`);
}
function enterLock(s, ctx) {
  s.phase = "lock"; s.deadline = null; s.offer = { A: null, B: null };
  if (s.locked.A && s.locked.B) return exchange(s, ctx);
  s.graceUntil = ctx.now + ms(s, GRACE_MS);
}
/** Both zones' picks, swapped in one go. A leader who didn't lock in time has the rest picked at random (and everyone
    is told). */
function exchange(s, ctx) {
  for (const z of ZONES) {
    if (s.locked[z]) continue;
    const pool = members(s, z).filter((id) => id !== s.leader[z] && !s.sel[z].includes(id));
    while (s.sel[z].length < need(s) && pool.length) s.sel[z].push(pool.splice(randInt(pool.length, ctx.rng), 1)[0]);
    s.locked[z] = true; s.auto[z] = true;
    log(s, ctx.now, `Zone ${z}'s leader didn't lock in time, so the server finished the picks at random.`);
  }
  const moves = [...s.sel.A.map((id) => ({ id, from: "A", to: "B" })), ...s.sel.B.map((id) => ({ id, from: "B", to: "A" }))];
  for (const m of moves) s.zone[m.id] = m.to;
  s.moves = moves;
  s.exchangeAt = ctx.now;
  for (const id of s.order) s.arrived[id] = !moves.some((m) => m.id === id);
  s.votes = { A: {}, B: {} }; s.sel = { A: [], B: [] }; s.locked = { A: false, B: false }; s.offer = { A: null, B: null };
  s.graceUntil = null; s.deadline = null;
  log(s, ctx.now, `Exchange ${s.round + 1}: ${moves.length / 2} moved each way.`);
  s.final = s.round === s.plan.secs.length - 1;
  if (!s.final) s.round++;
  s.phase = "moving";
  settled(s, ctx);
}
/** Everyone who has to move has arrived: the next round starts in a few seconds, or the game ends. */
function settled(s, ctx) {
  if (s.paused || !s.order.every((id) => s.arrived[id])) return;
  if (s.phase === "arrival" || (s.phase === "moving" && !s.final)) { if (!s.startAt) s.startAt = ctx.now + ms(s, START_MS); return; }
  if (s.phase === "moving" && s.final) return finish(s, ctx);
}
function finish(s, ctx) {
  s.startAt = null;
  if (forecaster(s) && !s.prediction) { s.phase = "predict"; s.deadline = ctx.now + ms(s, PREDICT_MS); return; }
  reveal(s, ctx);
}
function reveal(s, ctx) {
  s.phase = "result"; s.deadline = null; s.revealAt = ctx.now; // every phone plays the reveal from this moment, together
  const beacon = s.order.find((id) => s.role[id] === "beacon"), jammer = s.order.find((id) => s.role[id] === "jammer");
  const together = s.zone[beacon] === s.zone[jammer], winner = together ? "static" : "signal", f = forecaster(s);
  s.result = { winner, together, beacon, jammer, zone: { beacon: s.zone[beacon], jammer: s.zone[jammer] },
    forecaster: f ? { id: f, pick: s.prediction && s.prediction !== "none" ? s.prediction : null, won: s.prediction === winner } : null };
  log(s, ctx.now, `${winner === "signal" ? "Signal" : "Static"} wins match ${s.match}.`);
}

/* ---------- Taps from players ---------- */
export function command(s, id, d, ctx) {
  if (!d || typeof d !== "object") return { ok: false, error: "bad" };
  const no = (error) => ({ ok: false, error });
  if (s.phase === "lobby") {
    if (d.type !== "ready" || !s.roster[id]) return no("phase");
    s.roster[id].ready = d.on !== false;
    s.rev++;
    return { ok: true };
  }
  if (!s.order.includes(id)) return no("not-playing");
  const z = s.zone[id];
  if (d.type === "here") {
    if (!["arrival", "moving"].includes(s.phase) || s.arrived[id]) return no("phase");
    s.arrived[id] = true;
    settled(s, ctx);
    s.rev++;
    return { ok: true };
  }
  if (d.type === "vote") {
    if (s.phase !== "round" || s.locked[z]) return no("phase");
    if (d.for == null) { delete s.votes[z][id]; s.rev++; return { ok: true }; }
    if (s.zone[d.for] !== z) return no("zone");
    s.votes[z][id] = d.for;
    const n = Object.values(s.votes[z]).filter((c) => c === d.for).length;
    if (n >= majority(members(s, z).length) && s.leader[z] !== d.for) setLeader(s, z, d.for, ctx.now, "voted in");
    s.rev++;
    return { ok: true };
  }
  if (d.type === "offer") {
    if (s.phase !== "round" || s.leader[z] !== id || s.locked[z]) return no("leader");
    if (d.to == null) { s.offer[z] = null; s.rev++; return { ok: true }; }
    if (s.zone[d.to] !== z || d.to === id) return no("zone");
    s.offer[z] = { from: id, to: d.to };
    s.rev++;
    return { ok: true };
  }
  if (d.type === "accept" || d.type === "decline") {
    const o = s.offer[z];
    if (s.phase !== "round" || !o || o.to !== id || s.leader[z] !== o.from || s.locked[z]) return no("offer");
    if (d.type === "accept") setLeader(s, z, id, ctx.now, `handed over by ${nameOf(s, o.from)}`);
    else s.offer[z] = null;
    s.rev++;
    return { ok: true };
  }
  if (d.type === "select") {
    if (!["round", "lock"].includes(s.phase) || s.leader[z] !== id || s.locked[z]) return no("leader");
    const ids = [...new Set([].concat(d.ids || []).map(String))];
    if (ids.length > need(s) || ids.some((x) => x === id || s.zone[x] !== z)) return no("pick");
    s.sel[z] = ids;
    s.rev++;
    return { ok: true };
  }
  if (d.type === "lock") {
    if (!["round", "lock"].includes(s.phase) || s.leader[z] !== id || s.locked[z]) return no("leader");
    if (s.sel[z].length !== need(s)) return no("count");
    s.locked[z] = true; s.offer[z] = null;
    log(s, ctx.now, `Zone ${z}'s leader locked in their picks.`);
    if (s.phase === "lock" && s.locked.A && s.locked.B && !s.paused) exchange(s, ctx);
    s.rev++;
    return { ok: true };
  }
  if (d.type === "predict") {
    if (s.phase !== "predict" || s.role[id] !== "forecaster" || s.prediction) return no("phase");
    if (!["signal", "static"].includes(d.pick)) return no("pick");
    s.prediction = d.pick;
    if (!s.paused) reveal(s, ctx);
    s.rev++;
    return { ok: true };
  }
  return no("unknown");
}

/* ---------- The host's console ---------- */
export function hostCommand(s, d, ctx) {
  if (!d || typeof d !== "object") return { ok: false, error: "bad" };
  const no = (error) => ({ ok: false, error });
  const t = d.type;
  if (t === "options") {
    // The presets, before the deal: the zones' names, the pace, and whether leaders' phones announce.
    if (s.phase !== "lobby") return no("phase");
    if (d.zones && typeof d.zones === "object") s.opts.zones = { A: cleanName(d.zones.A), B: cleanName(d.zones.B) };
    if (PACES[d.pace]) s.opts.pace = d.pace;
    if (typeof d.voice === "boolean") s.opts.voice = d.voice;
    s.rev++;
    return { ok: true };
  }
  if (t === "play") {
    if (s.phase !== "lobby") return no("phase");
    s.host.plays = !!d.on;
    if (typeof d.name === "string" && d.name.trim()) s.host.name = d.name.trim().slice(0, 12);
    if (!s.host.plays) delete s.roster[HOST_ID];
    s.rev++;
    return { ok: true, resync: true };
  }
  if (t === "deal") {
    if (s.phase !== "lobby") return no("phase");
    const ids = Object.keys(s.roster);
    if (ids.length < MIN_PLAYERS || ids.length > MAX_PLAYERS) return no("count");
    if (ids.some((id) => !s.roster[id].ready)) return no("ready");
    deal(s, ctx);
    s.rev++;
    return { ok: true };
  }
  if (t === "start") {
    // Start the round (or end the game) now, even if someone hasn't tapped "I'm here".
    if (!["arrival", "moving"].includes(s.phase) || s.paused) return no("phase");
    const missing = s.order.filter((id) => !s.arrived[id]);
    if (missing.length) log(s, ctx.now, `The host went on without ${missing.map((id) => nameOf(s, id)).join(", ")} tapping "I'm here".`);
    for (const id of s.order) s.arrived[id] = true;
    if (s.phase === "moving" && s.final) finish(s, ctx); else startRound(s, ctx);
    s.rev++;
    return { ok: true };
  }
  if (t === "pause") {
    if (!inGame(s) || s.paused) return no("phase");
    const left = (x) => (x == null ? null : Math.max(0, x - ctx.now));
    s.paused = { deadline: left(s.deadline), graceUntil: left(s.graceUntil), startAt: left(s.startAt) };
    s.deadline = s.graceUntil = s.startAt = null;
    log(s, ctx.now, "The host paused the game.");
    s.rev++;
    return { ok: true };
  }
  if (t === "resume") {
    if (!s.paused) return no("phase");
    const back = (x) => (x == null ? null : ctx.now + x);
    s.deadline = back(s.paused.deadline); s.graceUntil = back(s.paused.graceUntil); s.startAt = back(s.paused.startAt);
    s.paused = null;
    log(s, ctx.now, "The host resumed the game.");
    // Anything that finished while paused carries on now.
    if (s.phase === "lock" && s.locked.A && s.locked.B) exchange(s, ctx);
    else if (s.phase === "predict" && s.prediction) reveal(s, ctx);
    else settled(s, ctx);
    s.rev++;
    return { ok: true };
  }
  if (t === "fixZone") {
    // Only while paused: put someone where they really are. Logged for everyone.
    if (!inGame(s) || !s.paused || !s.order.includes(d.id) || !ZONES.includes(d.zone) || s.zone[d.id] === d.zone) return no("fix");
    const from = s.zone[d.id];
    s.zone[d.id] = d.zone;
    for (const z of ZONES) { s.sel[z] = s.sel[z].filter((x) => x !== d.id); delete s.votes[z][d.id]; for (const k of Object.keys(s.votes[z])) if (s.votes[z][k] === d.id) delete s.votes[z][k]; }
    if (s.leader[from] === d.id) { const m = members(s, from); s.leader[from] = m.length ? m[randInt(m.length, ctx.rng)] : null; s.locked[from] = false; s.sel[from] = []; }
    s.arrived[d.id] = true;
    log(s, ctx.now, `Host correction: ${nameOf(s, d.id)} is in Zone ${d.zone}.`);
    s.rev++;
    return { ok: true };
  }
  if (t === "fixLeader") {
    if (!inGame(s) || !s.paused || !ZONES.includes(d.zone) || s.zone[d.id] !== d.zone || s.locked[d.zone]) return no("fix");
    setLeader(s, d.zone, d.id, ctx.now, "set by the host");
    s.rev++;
    return { ok: true };
  }
  if (t === "abort") {
    if (!inGame(s)) return no("phase");
    s.phase = "aborted"; s.deadline = s.graceUntil = s.startAt = null; s.paused = null;
    log(s, ctx.now, `The host stopped match ${s.match}. No winner.`);
    s.rev++;
    return { ok: true };
  }
  if (t === "rematch") {
    // Back to the lobby: the same people, new cards and zones once the host deals again.
    if (!["result", "aborted"].includes(s.phase)) return no("phase");
    Object.assign(s, fresh());
    s.phase = "lobby";
    for (const p of Object.values(s.roster)) p.ready = p.id === HOST_ID;
    s.rev++;
    return { ok: true, resync: true };
  }
  return no("unknown");
}

/* ---------- The clock ---------- */
export function tick(s, ctx) {
  if (s.paused) return false;
  const now = ctx.now, before = s.rev;
  if (s.startAt != null && now >= s.startAt && (s.phase === "arrival" || s.phase === "moving")) startRound(s, ctx);
  else if (s.phase === "round" && s.deadline != null && now >= s.deadline) enterLock(s, ctx);
  else if (s.phase === "lock" && s.graceUntil != null && now >= s.graceUntil) exchange(s, ctx);
  else if (s.phase === "predict" && s.deadline != null && now >= s.deadline) { s.prediction = "none"; reveal(s, ctx); }
  else return false;
  s.rev = before + 1;
  return true;
}
export function nextDeadline(s) {
  if (s.paused) return null;
  const ds = [s.startAt, s.phase === "round" || s.phase === "predict" ? s.deadline : null, s.phase === "lock" ? s.graceUntil : null].filter((x) => x != null);
  return ds.length ? Math.min(...ds) : null;
}

/* ---------- What each screen may know ---------- */
function timer(s, now) {
  const p = s.paused;
  if (p) { const left = p.deadline ?? p.graceUntil ?? p.startAt; return left == null ? null : { kind: p.deadline != null ? s.phase : p.graceUntil != null ? "grace" : "start", left, paused: true }; }
  if (s.startAt != null) return { kind: "start", until: s.startAt, left: s.startAt - now };
  if (s.phase === "lock" && s.graceUntil != null) return { kind: "grace", until: s.graceUntil, left: s.graceUntil - now };
  if (s.deadline != null) return { kind: s.phase, until: s.deadline, left: s.deadline - now };
  return null;
}
const person = (s, id) => ({ id, name: nameOf(s, id), avatar: (s.roster[id] || {}).avatar, connected: !!(s.roster[id] && s.roster[id].connected) });
/** What the presets mean for this many players: the talk times and who's sent each round. */
function planFor(s, n) { return { secs: (PACES[s.opts.pace] || PACES.standard).slice(), out: outbound(Math.max(MIN_PLAYERS, n)) }; }
function lobbyView(s) {
  const list = Object.values(s.roster);
  return { count: list.length, ready: list.filter((p) => p.ready).length, min: MIN_PLAYERS, max: MAX_PLAYERS, best: BEST, plan: planFor(s, list.length),
    people: list.map((p) => ({ ...person(s, p.id), ready: p.ready, host: p.id === HOST_ID })) };
}
function resultView(s) {
  const r = s.result;
  return { ...r, beacon: person(s, r.beacon), jammer: person(s, r.jammer), forecaster: r.forecaster ? { ...r.forecaster, ...person(s, r.forecaster.id) } : null,
    everyone: s.order.map((id) => ({ ...person(s, id), role: s.role[id], zone: s.zone[id] })) };
}
/** One player's screen: their own card and zone, and only their own zone's people, leader, votes and picks. */
export function playerView(s, id, now) {
  const base = { phase: s.phase, match: s.match, rev: s.rev, now, paused: !!s.paused, log: s.log.slice(-4).map((l) => l.text), opts: s.opts };
  if (s.phase === "lobby") return { ...base, lobby: lobbyView(s), me: { id, ready: !!(s.roster[id] && s.roster[id].ready) } };
  if (!s.order.includes(id)) return { ...base, phase: s.phase === "result" ? "result" : "watch", result: s.phase === "result" ? resultView(s) : null };
  const z = s.zone[id], m = members(s, z), lead = s.leader[z];
  const tally = {};
  for (const c of Object.values(s.votes[z])) tally[c] = (tally[c] || 0) + 1;
  const view = {
    ...base,
    me: { id, zone: z, arrived: !!s.arrived[id], leader: lead === id, role: s.role[id] },
    round: s.round + 1, rounds: s.plan.secs.length, need: need(s), final: s.final, timer: timer(s, now), plan: s.plan,
    sizes: { A: members(s, "A").length, B: members(s, "B").length },
    zone: {
      name: z, leader: lead ? person(s, lead) : null, majority: majority(m.length),
      people: m.map((x) => ({ ...person(s, x), leader: x === lead, arrived: !!s.arrived[x], picked: s.sel[z].includes(x), votes: tally[x] || 0 })),
      myVote: s.votes[z][id] || null, picks: s.sel[z].slice(), locked: s.locked[z], auto: s.auto[z],
      offer: s.offer[z] && (s.offer[z].to === id || s.offer[z].from === id) ? { from: person(s, s.offer[z].from), to: person(s, s.offer[z].to) } : null,
    },
    otherLocked: s.locked[other(z)],
  };
  if (s.phase === "moving" || s.phase === "arrival") {
    const mine = s.moves.find((x) => x.id === id);
    // After an exchange, who went where is public: everyone saw them walk.
    view.move = s.phase === "arrival" ? { first: true, to: z } : { moving: !!mine, from: mine ? mine.from : z, to: z, at: s.exchangeAt,
      coming: s.moves.filter((x) => x.to === z && x.id !== id).map((x) => nameOf(s, x.id)),
      leaving: s.moves.filter((x) => x.from === z && x.id !== id).map((x) => nameOf(s, x.id)), waiting: s.order.filter((x) => !s.arrived[x]).length };
  }
  if (s.phase === "predict") view.predict = s.role[id] === "forecaster" ? { asked: true, pick: s.prediction } : { asked: false };
  if (s.phase === "result") {
    const r = s.result, f = s.role[id] === "forecaster";
    view.result = resultView(s);
    view.result.at = s.revealAt;
    view.result.youWon = f ? r.forecaster.won : ROLE_FACTION[s.role[id]] === r.winner;
  }
  return view;
}
/** The host's console: head counts, arrivals, who leads and whether they've locked, and the controls. Never cards. */
export function hostView(s, now) {
  const base = { phase: s.phase, match: s.match, rev: s.rev, now, paused: !!s.paused, plays: s.host.plays, hostName: s.host.name, log: s.log.slice(-8).map((l) => l.text), opts: s.opts };
  if (s.phase === "lobby") return { ...base, lobby: lobbyView(s) };
  const zones = {};
  for (const z of ZONES) {
    const m = members(s, z);
    zones[z] = { count: m.length, leader: s.leader[z] ? person(s, s.leader[z]) : null, locked: s.locked[z],
      people: m.map((x) => ({ ...person(s, x), arrived: !!s.arrived[x], leader: x === s.leader[z] })) };
  }
  return { ...base, round: s.round + 1, rounds: s.plan.secs.length, need: need(s), final: s.final, timer: timer(s, now), zones, plan: s.plan,
    moves: s.phase === "moving" ? s.moves.map((m) => ({ name: nameOf(s, m.id), from: m.from, to: m.to })) : [],
    waiting: s.order.filter((x) => !s.arrived[x]).map((x) => nameOf(s, x)), predicting: s.phase === "predict",
    result: s.phase === "result" ? { ...resultView(s), at: s.revealAt } : null };
}
