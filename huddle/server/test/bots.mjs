// Holy Huddle relay test: a fake TV and up to 20 fake phones play through everything the relay must handle.
// Usage: node test/bots.mjs [base-url] [origin]
//   local:  npx wrangler dev --var "ALLOWED_ORIGINS:http://localhost:*" --var "IDLE_MINUTES:0.08" --var "LIMIT_LOOK:40"
//           node test/bots.mjs http://127.0.0.1:8787 http://localhost:3000
//   live:   node test/bots.mjs https://holyhuddle-relay.thecrossroads.workers.dev https://holyhuddle.pages.dev --live
// The --live run skips the tests that need the short idle timer and low lookup limit of the local run.
// Behind a network proxy (HTTPS_PROXY set), route fetch and WebSocket through it.
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}
const BASE = process.argv[2] || "http://127.0.0.1:8787";
const ORIGIN = process.argv[3] || "http://localhost:3000";
const LIVE = process.argv.includes("--live");
const WS_BASE = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0, failed = 0;
function check(ok, what, extra) {
  if (ok) { passed++; console.log("  ok   " + what); }
  else { failed++; console.log("  FAIL " + what + (extra !== undefined ? "  → " + JSON.stringify(extra).slice(0, 300) : "")); }
}
const section = (s) => console.log("\n" + s);

async function api(path, opts = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { origin: opts.origin || ORIGIN, "content-type": "application/json", ...(opts.headers || {}) } });
  let body = null;
  try { body = await r.json(); } catch (e) {}
  return { status: r.status, body };
}

/** A WebSocket with an inbox, so tests can wait for a message. */
class Line {
  constructor(url, origin = ORIGIN) {
    this.inbox = [];
    this.closed = null;
    this.ws = new WebSocket(url, { headers: { origin } });
    this.ws.onmessage = (e) => { const m = JSON.parse(e.data); this.inbox.push(m); this.waiters.forEach((w) => w()); };
    this.ws.onclose = (e) => { this.closed = e.code; this.waiters.forEach((w) => w()); };
    this.waiters = new Set();
    this.opened = new Promise((res) => {
      this.ws.onopen = () => res(true);
      this.ws.onerror = () => res(false);
    });
  }
  send(m) { this.ws.send(typeof m === "string" ? m : JSON.stringify(m)); }
  /** Waits for (and removes) the first message matching `pred`. Resolves null on timeout. */
  next(pred, ms = 3000) {
    return new Promise((resolve) => {
      const look = () => {
        const i = this.inbox.findIndex(pred);
        if (i >= 0) { const [m] = this.inbox.splice(i, 1); done(m); }
      };
      const done = (v) => { clearTimeout(t); this.waiters.delete(look); resolve(v); };
      const t = setTimeout(() => done(null), ms);
      this.waiters.add(look);
      look();
    });
  }
  async waitClosed(ms = 3000) {
    for (let i = 0; i < ms / 50 && this.closed === null; i++) await sleep(50);
    return this.closed;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const AVATARS = ["sheep", "donkey", "lion", "dove", "fish", "camel", "whale", "raven", "frog", "ox", "goat", "eagle"];
const NAMES = ["Joy", "Sam", "Eli", "Ruth", "Noah", "Mia", "Levi", "Grace", "Ben", "Zoe", "Abel", "Lydia", "Asher", "Hope", "Caleb", "Naomi", "Jude", "Faith", "Silas", "Anna"];

async function phone(code, name, avatar) {
  const p = new Line(`${WS_BASE}/ws/${code}?role=player`);
  if (!(await p.opened)) return { p, joined: null };
  await p.next((m) => m.t === "hello");
  p.send({ t: "join", name, avatar });
  const joined = await p.next((m) => m.t === "joined" || m.t === "error");
  return { p, joined };
}

async function main() {
  console.log(`Holy Huddle relay test → ${BASE} (origin ${ORIGIN})${LIVE ? " [live]" : ""}`);

  section("Front door");
  const health = await api("/health");
  check(health.status === 200 && health.body.ok, "health check answers");
  const phonePage = await fetch(BASE + "/").then(async (r) => ({ status: r.status, text: await r.text(), type: r.headers.get("content-type") }));
  check(phonePage.status === 200 && /text\/html/.test(phonePage.type) && phonePage.text.includes("Holy Huddle"), "the join page is served at /");
  const tvPage = await fetch(BASE + "/tv").then(async (r) => ({ status: r.status, text: await r.text() }));
  check(tvPage.status === 200 && tvPage.text.includes("THP.Huddle"), "the game for the TV is served at /tv");
  const own = await fetch(BASE + "/api/rooms/ZZZZ").then((r) => r.status);
  check(own === 404, "a lookup with no Origin (this site's own page) is answered");
  const bad = await api("/api/rooms", { method: "POST", origin: "https://evil.example", body: "{}" });
  check(bad.status === 403, "another website can't make a room", bad);
  const evilLine = new Line(`${WS_BASE}/ws/BCDF?role=player`, "https://evil.example");
  check((await evilLine.opened) === false, "another website can't open a live line");

  section("Making a room");
  const made = await api("/api/rooms", { method: "POST", body: JSON.stringify({ game: "holy-trivia" }) });
  const code = made.body && made.body.code, hostKey = made.body && made.body.hostKey;
  check(made.status === 201 && /^[BCDFGHJKLMNPRSTVWZ]{4}$/.test(code), "room made with a 4-letter, no-vowel code", made.body);
  check(typeof hostKey === "string" && hostKey.length >= 20, "host key handed to the TV only");
  const info = await api(`/api/rooms/${code.toLowerCase()}`);
  check(info.status === 200 && info.body.code === code && info.body.players === 0, "lowercase code finds the room", info.body);
  const none = await api(`/api/rooms/ZZZZ`);
  check(none.status === 404, "a wrong code says no room");

  section("The TV connects");
  const wrongHost = new Line(`${WS_BASE}/ws/${code}?role=host&key=nope`);
  check((await wrongHost.opened) === false, "a wrong host key is refused");
  let tv = new Line(`${WS_BASE}/ws/${code}?role=host&key=${hostKey}`);
  check(await tv.opened, "the TV opens its line with the host key");
  const first = await tv.next((m) => m.t === "room");
  check(first && first.room.code === code && first.room.players.length === 0, "the TV gets the empty room", first);

  section("20 phones join at once (8 players + 12 audience)");
  const joins = await Promise.all(NAMES.map((n, i) => sleep(i * 15).then(() => phone(code, n, AVATARS[i % AVATARS.length]))));
  const phones = joins.map((j) => j.p), joinedMsgs = joins.map((j) => j.joined);
  check(joinedMsgs.every((m) => m && m.t === "joined"), "all 20 phones joined", joinedMsgs.filter((m) => !m || m.t !== "joined"));
  const ids = joinedMsgs.map((m) => m && m.id);
  const playersN = joinedMsgs.filter((m) => m && !m.audience).length, audN = joinedMsgs.filter((m) => m && m.audience).length;
  check(playersN === 8 && audN === 12, `8 players and 12 audience (got ${playersN} + ${audN})`);
  const vipIdx = joinedMsgs.findIndex((m) => m && m.vip);
  check(joinedMsgs.filter((m) => m && m.vip).length === 1 && !joinedMsgs[vipIdx].audience, "exactly one VIP, and it's a player");
  let last = null;
  for (let i = 0; i < 20; i++) { const m = await tv.next((x) => x.t === "room" && x.event.kind === "join", 3000); if (m) last = m; }
  check(last && last.room.players.length === 20, "the TV saw all 20 names arrive", last && last.room.players.length);
  const firstIn = last && last.room.players.filter((p) => !p.audience).sort((x, y) => x.joinedAt - y.joinedAt)[0];
  check(firstIn && last.room.vip === firstIn.id && firstIn.id === ids[vipIdx], "the VIP is the first player who got in");
  check(last && last.room.players.every((p) => !("keyHash" in p) && !("key" in p)), "rejoin keys never reach the TV");

  section("Names are checked");
  for (const [name, why] of [["sh1t", "word"], ["Fuuuuck", "word"], ["f u c k", "word"], ["xXbitchXx", "word"], ["a s s", "word"], ["hell", "word"], ["Bob://x.com", "chars"], ["", "empty"], ["Abcdefghijklm", "long"], ["joy", "taken"]]) {
    const { p, joined } = await phone(code, name, "sheep");
    check(joined && joined.t === "error" && joined.code === "name-" + why, `"${name}" refused (${why})`, joined);
    p.close();
  }
  for (const name of ["Grapes", "Peacock", "Cassie", "Hellen", "Essex Kid", "Marsellus", "José"]) {
    const { p, joined } = await phone(code, name, "dove");
    check(joined && joined.t === "joined", `"${name}" allowed`, joined);
    if (joined && joined.id) tv.send({ t: "kick", id: joined.id });
    p.close();
  }
  await sleep(300);
  tv.inbox.length = 0;

  section("Screens and answers");
  tv.send({ t: "to", to: "all", data: { screen: "choices", q: 1, options: ["A", "B", "C", "D"] } });
  const got = await Promise.all(phones.map((p) => p.next((m) => m.t === "msg" && m.data.q === 1)));
  check(got.every(Boolean), "every phone gets the screen sent to all");
  tv.send({ t: "to", to: [ids[2], ids[5]], data: { screen: "trial", q: 2 } });
  const only = await Promise.all(phones.map((p) => p.next((m) => m.t === "msg" && m.data.q === 2, 600)));
  check(only.filter(Boolean).length === 2 && only[2] && only[5], "a screen for two phones reaches only those two");
  tv.send({ t: "to", to: "audience", data: { q: 3 } });
  const aud = await Promise.all(phones.map((p) => p.next((m) => m.t === "msg" && m.data.q === 3, 600)));
  check(aud.filter(Boolean).length === 12 && joinedMsgs.every((m, i) => !!aud[i] === m.audience), "an audience-only screen reaches the 12 audience phones");
  const t0 = Date.now();
  phones.forEach((p, i) => p.send({ t: "input", data: { answer: i % 4 } }));
  const inputs = [];
  for (let i = 0; i < 20; i++) { const m = await tv.next((x) => x.t === "input"); if (m) inputs.push(m); }
  check(inputs.length === 20 && new Set(inputs.map((m) => m.id)).size === 20, "the TV gets all 20 answers, each with its player");
  check(inputs.every((m) => typeof m.at === "number"), "every answer carries the server's time stamp");
  console.log(`       (20 answers in ${Date.now() - t0} ms)`);
  phones[0].send({ t: "time", c: 123 });
  const tm = await phones[0].next((m) => m.t === "time");
  check(tm && tm.c === 123 && typeof tm.s === "number", "phones can read the server clock");

  section("Phones drop out and come back");
  const drop = [3, 4, 9, 10, 15];
  drop.forEach((i) => phones[i].close());
  const leaves = [];
  for (let i = 0; i < drop.length; i++) { const m = await tv.next((x) => x.t === "room" && x.event.kind === "leave"); if (m) leaves.push(m); }
  check(leaves.length === 5, "the TV hears the 5 phones drop");
  check(leaves.at(-1) && leaves.at(-1).room.players.filter((p) => !p.connected).length === 5, "they show as away, not removed");
  for (const i of drop) {
    const p = new Line(`${WS_BASE}/ws/${code}?role=player`);
    await p.opened; await p.next((m) => m.t === "hello");
    p.send({ t: "rejoin", id: joinedMsgs[i].id, key: joinedMsgs[i].key });
    const r = await p.next((m) => m.t === "joined" || m.t === "error");
    check(r && r.t === "joined" && r.rejoined && r.name === NAMES[i], `${NAMES[i]} rejoins with the same name`, r);
    phones[i] = p;
  }
  const backs = [];
  for (let i = 0; i < drop.length; i++) { const m = await tv.next((x) => x.t === "room" && x.event.kind === "back"); if (m) backs.push(m); }
  check(backs.length === 5, "the TV hears them come back");
  const imp = new Line(`${WS_BASE}/ws/${code}?role=player`);
  await imp.opened; await imp.next((m) => m.t === "hello");
  imp.send({ t: "rejoin", id: joinedMsgs[1].id, key: "guess" });
  const impR = await imp.next((m) => m.t === "joined" || m.t === "error");
  check(impR && impR.t === "error" && impR.code === "rejoin", "nobody can take over a player with a wrong key");
  imp.close();

  section("The host is in charge");
  tv.send({ t: "kick", id: ids[vipIdx] });
  const kickedMsg = await phones[vipIdx].next((m) => m.t === "kicked");
  check(!!kickedMsg && (await phones[vipIdx].waitClosed()) !== null, "a removed player is told and disconnected");
  const vipNow = await Promise.all(phones.map((p, i) => (i === vipIdx ? null : p.next((m) => m.t === "you" && m.vip, 1500))));
  check(vipNow.filter(Boolean).length === 1, "the VIP passes to one other player");
  const back = new Line(`${WS_BASE}/ws/${code}?role=player`);
  await back.opened; await back.next((m) => m.t === "hello");
  back.send({ t: "rejoin", id: joinedMsgs[vipIdx].id, key: joinedMsgs[vipIdx].key });
  const backR = await back.next((m) => m.t === "joined" || m.t === "error");
  check(backR && backR.t === "error", "a removed player can't rejoin with their key");
  back.close();
  const pick = (i) => (i === vipIdx ? 19 : i); // the VIP was removed above
  tv.send({ t: "lock", locked: true });
  await tv.next((m) => m.t === "room" && m.event.kind === "lock");
  const late = await phone(code, "Latecomer", "ox");
  check(late.joined && late.joined.code === "locked", "a locked room turns new phones away");
  late.p.close();
  phones[pick(6)].close();
  await tv.next((m) => m.t === "room" && m.event.kind === "leave");
  const re6 = new Line(`${WS_BASE}/ws/${code}?role=player`);
  await re6.opened; await re6.next((m) => m.t === "hello");
  re6.send({ t: "rejoin", id: joinedMsgs[pick(6)].id, key: joinedMsgs[pick(6)].key });
  check((await re6.next((m) => m.t === "joined" || m.t === "error"))?.t === "joined", "players already in can still rejoin a locked room");
  phones[pick(6)] = re6;

  section("Misbehaving phones");
  const flood = phones[pick(7)];
  for (let i = 0; i < 200; i++) { try { flood.send({ t: "input", data: { i } }); } catch (e) { break; } }
  check((await flood.waitClosed()) === 4029, "a phone flooding messages is cut off");
  const big = phones[pick(8)];
  big.send({ t: "input", data: "x".repeat(5000) });
  check((await big.waitClosed()) === 1009, "an oversized message is refused");

  section("The TV drops and comes back");
  tv.close();
  const off = await phones[pick(11)].next((m) => m.t === "host" && m.on === false);
  check(!!off, "phones hear the TV went away");
  tv = new Line(`${WS_BASE}/ws/${code}?role=host&key=${hostKey}`);
  check(await tv.opened, "the TV reconnects with its key");
  const snap = await tv.next((m) => m.t === "room");
  check(snap && snap.room.players.length === 19, "the room is still there with everyone in it", snap && snap.room.players.length);
  check(!!(await phones[pick(11)].next((m) => m.t === "host" && m.on === true)), "phones hear the TV is back");
  const tv2 = new Line(`${WS_BASE}/ws/${code}?role=host&key=${hostKey}`);
  await tv2.opened;
  check(!!(await tv.next((m) => m.t === "replaced")), "a second TV with the key takes over from the first");
  tv = tv2;
  await tv.next((m) => m.t === "room");

  section("Ending the room");
  tv.send({ t: "end" });
  const ended = await phones[pick(12)].next((m) => m.t === "ended");
  check(!!ended, "phones are told the game ended");
  await sleep(300);
  check((await api(`/api/rooms/${code}`)).status === 404, "the room is gone afterwards");
  phones.forEach((p) => p.close());
  tv.close();

  if (!LIVE) {
    section("Idle rooms clean themselves up (local timer: about 5 seconds)");
    const idle = await api("/api/rooms", { method: "POST", body: "{}" });
    check(idle.status === 201, "made a room to leave idle");
    await sleep(7000);
    check((await api(`/api/rooms/${idle.body.code}`)).status === 404, "the idle room deleted itself");

    section("Code guessing is limited (local limit: 40 lookups)");
    let status = 0;
    for (let i = 0; i < 45 && status !== 429; i++) status = (await api(`/api/rooms/BBBB`)).status;
    check(status === 429, "too many lookups from one address get slowed down");
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
