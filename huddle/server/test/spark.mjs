// Spark Wars site test: its own pages, its own rooms, 30 players (then the audience), and a TV busy talking to all
// of them. The relay itself is covered by test/bots.mjs (run against the Holy Huddle site).
// Usage: node test/spark.mjs [base-url]
//   local:  npx wrangler dev --env spark --port 8788 --var "ALLOWED_ORIGINS:http://localhost:*,http://127.0.0.1:*"
//           node test/spark.mjs http://127.0.0.1:8788
//   live:   node test/spark.mjs https://sparkwars.thecrossroads.workers.dev
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}
const BASE = process.argv[2] || "http://127.0.0.1:8788";
const WS_BASE = BASE.replace(/^http/, "ws");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
const check = (ok, what, extra) => { ok ? passed++ : failed++; console.log((ok ? "  ok   " : "  FAIL ") + what + (ok || extra === undefined ? "" : "  " + JSON.stringify(extra))); };

/** A live line that keeps every message, so a test can wait for one. */
function line(url) {
  const ws = new WebSocket(url), got = [], l = { ws, got, closed: null };
  l.opened = new Promise((r) => { ws.onopen = () => r(true); ws.onerror = () => r(false); });
  ws.onmessage = (e) => got.push(JSON.parse(e.data));
  ws.onclose = (e) => { l.closed = e.code; };
  l.send = (m) => ws.send(JSON.stringify(m));
  l.next = async (test, ms = 5000) => {
    for (let i = 0; i < ms / 25; i++) { const k = got.findIndex(test); if (k >= 0) return got.splice(k, 1)[0]; await sleep(25); }
    return null;
  };
  return l;
}
const api = (path, opts = {}) => fetch(BASE + path, { ...opts, headers: { "content-type": "application/json" } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

console.log(`Spark Wars site test → ${BASE}`);
const phonePage = await fetch(BASE + "/").then((r) => r.text());
check(phonePage.includes('data-game="spark"') && phonePage.includes("<title>Spark Wars</title>"), "the Spark Wars join page is served at /");
const tvPage = await fetch(BASE + "/tv").then((r) => r.text());
check(tvPage.includes("window.SPARK") && !tvPage.includes("THP.Huddle"), "the Spark Wars game (not Trivia Holy Party) is served at /tv");

const made = await api("/api/rooms", { method: "POST", body: JSON.stringify({ game: "holy-trivia" }) });
check(made.status === 201 && made.body.game === "spark-wars", "this site only makes Spark Wars rooms, whatever it's asked for", made.body);
const code = made.body.code;
const info = await api(`/api/rooms/${code}`);
check(info.body.maxPlayers === 30 && info.body.avatars.includes("bolt") && !info.body.avatars.includes("sheep"), "rooms hold 30 players, with Spark Wars icons", info.body);

const tv = line(`${WS_BASE}/ws/${code}?role=host&key=${made.body.hostKey}`);
check(await tv.opened, "the TV connects");
await tv.next((m) => m.t === "room");

// 34 phones at once: 30 players, then 4 in the audience.
const phones = await Promise.all(Array.from({ length: 34 }, async (_, i) => {
  const p = line(`${WS_BASE}/ws/${code}?role=player`);
  await p.opened;
  await p.next((m) => m.t === "hello");
  p.send({ t: "join", name: "Kid" + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? "x" : ""), avatar: i === 0 ? "sheep" : info.body.avatars[i % 24] });
  p.joined = await p.next((m) => m.t === "joined" || m.t === "error", 10000);
  return p;
}));
const joined = phones.map((p) => p.joined);
check(joined.every((j) => j && j.t === "joined"), "all 34 phones got in", joined.filter((j) => !j || j.t !== "joined"));
check(joined.filter((j) => j && !j.audience).length === 30 && joined.filter((j) => j && j.audience).length === 4, "30 players and 4 in the audience");
check(joined.filter((j) => j && j.vip).length === 1, "exactly one VIP");
check(joined[0].avatar === "bolt", "an icon from the other game becomes a Spark Wars one");

// The TV sends each of the 30 players their own screen, three times over, as fast as it can (like the start of a game).
const players = joined.filter((j) => !j.audience).map((j) => j.id);
for (let k = 0; k < 3; k++) for (const id of players) tv.send({ t: "to", to: [id], data: { screen: "choices", round: k, prompt: "Q" + k } });
await sleep(1500);
const counts = phones.filter((p) => !p.joined.audience).map((p) => p.got.filter((m) => m.t === "msg").length);
check(counts.every((n) => n === 3), "90 screens in a burst all arrive, three per player", counts);
check(tv.closed === null, "the TV isn't cut off for talking to 30 phones at once");

// Every player answers at once.
phones.forEach((p, i) => !p.joined.audience && p.send({ t: "input", data: { type: "pick", round: 2, pick: i % 4 } }));
await sleep(1500);
const inputs = tv.got.filter((m) => m.t === "input");
check(inputs.length === 30 && new Set(inputs.map((m) => m.id)).size === 30, "30 answers at once all reach the TV", inputs.length);

// Typing is checked by the server: a bad word comes back as an error and never reaches the TV; a clean one goes through.
const writer = phones.find((p) => !p.joined.audience);
tv.got.length = 0;
writer.send({ t: "input", data: { type: "write", round: 7, text: "sh1t" } });
const refused = await writer.next((m) => m.t === "error" && /^text-/.test(m.code), 3000);
writer.send({ t: "input", data: { type: "write", round: 7, text: "  A   third-story window  " } });
await sleep(800);
const typed = tv.got.filter((m) => m.t === "input");
check(refused && refused.code === "text-word" && refused.round === 7, "a bad word typed on a phone is refused, with its round", refused);
check(typed.length === 1 && typed[0].data.text === "A third-story window", "only the clean answer reaches the TV, tidied up", typed.map((m) => m.data));
writer.send({ t: "input", data: { type: "write", round: 7, text: "🍆" } });
const emoji = await writer.next((m) => m.t === "error", 3000);
check(emoji && emoji.code === "text-chars", "emoji can't be typed", emoji);

tv.send({ t: "end" });
await sleep(800);
check(phones.every((p) => p.got.some((m) => m.t === "ended")), "ending the room tells every phone");
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
