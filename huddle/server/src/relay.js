/* The room relay shared by our phone party games (Holy Huddle in Trivia Holy Party, Spark Wars and Bonfire): the small
   server between the TV and the phones.
   It knows nothing about any game. It only runs rooms: makes room codes, lets phones join with a nickname, passes
   messages between the TV (the host) and the phones, and lets phones that drop out rejoin. The TV runs the game.

   One room = one Durable Object, named by its 4-letter code. The TV and every phone keep a WebSocket open to it.
   See huddle/PROTOCOL.md for every message. */
import { DurableObject } from "cloudflare:workers";
import { checkName, checkText } from "./names.js";

const CODE_LETTERS = "BCDFGHJKLMNPRSTVWZ"; // no vowels, so a code can't spell a word; no Q, X or Y
/** Each game's room rules. A site only makes rooms for its own games (see holy.js and spark.js). */
export const GAMES = {
  "holy-trivia": { maxPlayers: 8, maxAudience: 40,
    avatars: ["sheep", "donkey", "lion", "dove", "fish", "camel", "whale", "raven", "frog", "ox", "goat", "eagle"] },
  "spark-wars": { maxPlayers: 30, maxAudience: 20,
    avatars: ["bolt", "flame", "rocket", "comet", "fox", "wolf", "shark", "tiger", "panda", "owl", "octopus", "dino",
      "dragon", "robot", "alien", "ghost", "ball", "guitar", "skate", "pizza", "crown", "gem", "cactus", "eagle2"] },
  "bonfire": { maxPlayers: 40, maxAudience: 20,
    avatars: ["tent", "moon", "star", "pine", "mountain", "canoe", "lantern", "bear", "raccoon", "deer", "hedgehog", "butterfly",
      "mushroom", "coffee", "dango", "compass", "map", "sparkles", "snail", "beaver", "fox", "owl", "wolf", "guitar"] },
};
const rules = (game) => GAMES[game] || GAMES["holy-trivia"];
const MAX_LIFETIME_MS = 12 * 3600e3; // a room never lives longer than this, even if it's busy
const HOST_MSG_BYTES = 16384;
const PLAYER_MSG_BYTES = 2048;

/* ---------- Small helpers ---------- */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

function randomKey(bytes = 16) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomCode() {
  const b = crypto.getRandomValues(new Uint8Array(4));
  return [...b].map((x) => CODE_LETTERS[x % CODE_LETTERS.length]).join("");
}
async function hash(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
/** "bk rt" → "BKRT"; anything that can't be a code → null. */
function cleanCode(raw) {
  const c = String(raw || "").toUpperCase().replace(/[^A-Z]/g, "");
  return c.length === 4 && [...c].every((ch) => CODE_LETTERS.includes(ch)) ? c : null;
}
/** The address to count limits by. IPv6 users get a whole /64 (their home or phone network), so one person can't
    dodge the limits by hopping between addresses inside it. */
export function addressKey(ip) {
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const a = head ? head.split(":") : [], b = tail ? tail.split(":") : [];
  const full = ip.includes("::") ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill("0"), ...b] : a;
  return full.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}
const num = (v, d) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : d);

/** Only our own pages (the TV page on itch.io or here, the phone page) may connect from a browser. A browser always
    names the page in an Origin header when it calls another site or opens a live line, so another website is turned
    away. No Origin at all = this site's own page asking for something, or a tool outside a browser.
    Entries: an exact origin, "https://*.example.com" for its subdomains, or "http://localhost:*" for any port. */
function originAllowed(origin, env) {
  if (!origin) return true;
  const list = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.some((rule) => {
    if (rule === origin) return true;
    if (rule.endsWith(":*")) return origin.startsWith(rule.slice(0, -1)) && /^\d+$/.test(origin.slice(rule.length - 1));
    if (rule.includes("://*.")) {
      const [scheme, rest] = rule.split("://*.");
      return origin.startsWith(scheme + "://") && origin.endsWith("." + rest);
    }
    return false;
  });
}
const cors = (origin) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "600",
  vary: "origin",
});

/** The page's own inline scripts, as CSP hashes (worked out once per page). Only these may run: a script slipped in
    any other way, by a bug or a bad add-on, is refused by the browser. */
const scriptHashes = new Map();
async function hashesFor(html) {
  if (!scriptHashes.has(html)) {
    const list = [];
    for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(m[1]));
      list.push(`'sha256-${btoa(String.fromCharCode(...new Uint8Array(d)))}'`);
    }
    scriptHashes.set(html, [...new Set(list)].join(" "));
  }
  return scriptHashes.get(html);
}
/** A page, with headers that keep it to itself: its own scripts, Google Fonts, its own server and nothing else. */
async function page(html, url) {
  const live = (url.protocol === "https:" ? "wss://" : "ws://") + url.host;
  const csp = [
    "default-src 'none'", `script-src ${await hashesFor(html)}`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob:", "media-src 'self' blob:", `connect-src 'self' ${live}`,
    "manifest-src 'self'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'self'", "object-src 'none'",
  ].join("; ");
  return new Response(html, { headers: {
    "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer", "x-frame-options": "SAMEORIGIN", "content-security-policy": csp,
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "cross-origin-opener-policy": "same-origin",
  } });
}

/* ---------- The front door: plain web requests ---------- */
/** One site: its phone page at /, its game at /tv, rooms for its own games, and any files it carries
    (`files`: { "/path": { body, type } }, e.g. Spark Wars' recorded voice lines). */
export function site({ phone, tv, games, files = {} }) {
  return { async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const ip = addressKey(request.headers.get("cf-connecting-ip") || "local");
    if (url.pathname === "/health") return json({ ok: true });
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/tv")) return page(url.pathname === "/" ? phone : tv, url);
    const file = request.method === "GET" && files[url.pathname];
    if (file) return new Response(file.body, { headers: { "content-type": file.type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
    if (!originAllowed(origin, env)) return json({ error: "origin" }, 403);
    const h = origin ? cors(origin) : {};
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

    const gate = env.GATES.get(env.GATES.idFromName(ip));
    const limited = async (kind, max) => !(await gate.hit(kind, num(max, 1e9), num(env.LIMIT_WINDOW_SEC, 600) * 1000));

    // The TV makes a room.
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      if (await limited("create", env.LIMIT_CREATE)) return json({ error: "slow-down" }, 429, h);
      const body = await request.json().catch(() => ({}));
      const game = games.includes(body.game) ? body.game : games[0];
      for (let i = 0; i < 12; i++) {
        const code = randomCode();
        const made = await env.ROOMS.get(env.ROOMS.idFromName(code)).create(code, game);
        if (made.ok) return json({ code, hostKey: made.hostKey, game }, 201, h);
      }
      return json({ error: "busy" }, 503, h);
    }

    // A phone checks a code before showing the name screen.
    const look = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (look && request.method === "GET") {
      if (await limited("look", env.LIMIT_LOOK)) return json({ error: "slow-down" }, 429, h);
      const code = cleanCode(decodeURIComponent(look[1]));
      const info = code ? await env.ROOMS.get(env.ROOMS.idFromName(code)).info() : null;
      return info ? json(info, 200, h) : json({ error: "no-room" }, 404, h);
    }

    // The TV or a phone opens its live line to a room.
    const ws = url.pathname.match(/^\/ws\/([^/]+)$/);
    if (ws) {
      if (request.headers.get("upgrade") !== "websocket") return json({ error: "websocket-only" }, 426, h);
      if (await limited("ws", env.LIMIT_WS)) return json({ error: "slow-down" }, 429, h);
      const code = cleanCode(decodeURIComponent(ws[1]));
      if (!code) return json({ error: "no-room" }, 404, h);
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }
    return json({ error: "not-found" }, 404, h);
  } };
}

/* ---------- Rate limits by address (one small object per address, kept in memory) ---------- */
export class Gate extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.hits = new Map();
  }
  /** Counts one more of `kind`; false once there have been more than `max` in the last `windowMs`. */
  hit(kind, max, windowMs) {
    const now = Date.now();
    const list = (this.hits.get(kind) || []).filter((t) => now - t < windowMs);
    list.push(now);
    this.hits.set(kind, list);
    return list.length <= max;
  }
}

/* ---------- A room ---------- */
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = null;
    this.buckets = new WeakMap(); // per-connection message budget
    this.savedAt = 0;
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get("room")) || null;
    });
    // Keep-alive pings from phones are answered without waking the room.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"hb"}', '{"t":"hb"}'));
  }

  get idleMs() {
    return num(this.env.IDLE_MINUTES, 120) * 60e3;
  }
  async save() {
    this.savedAt = Date.now();
    await this.ctx.storage.put("room", this.room);
  }
  async touch() {
    this.room.lastActive = Date.now();
    // Activity alone is saved at most once a minute; joins, kicks and the like save straight away.
    if (Date.now() - this.savedAt > 60e3) await this.save();
  }
  async armAlarm() {
    await this.ctx.storage.setAlarm(Math.min(this.room.lastActive + this.idleMs, this.room.createdAt + MAX_LIFETIME_MS));
  }

  /** Called by the front door. A code still in use is refused, so the front door picks another. */
  async create(code, game) {
    if (this.room) return { ok: false };
    const hostKey = randomKey();
    this.room = {
      code, game, createdAt: Date.now(), lastActive: Date.now(), hostKeyHash: await hash(hostKey),
      locked: false, vip: null, players: {}, kicked: [],
    };
    await this.save();
    await this.armAlarm();
    return { ok: true, hostKey };
  }

  info() {
    if (!this.room) return null;
    const list = Object.values(this.room.players);
    return {
      code: this.room.code, game: this.room.game, locked: this.room.locked,
      players: list.filter((p) => !p.audience).length, audience: list.filter((p) => p.audience).length,
      maxPlayers: rules(this.room.game).maxPlayers, avatars: rules(this.room.game).avatars,
    };
  }

  /* --- who's connected --- */
  sockets(filter) {
    return this.ctx.getWebSockets().filter((ws) => ws.readyState === 1 && filter(ws.deserializeAttachment() || {}));
  }
  hostSocket() {
    return this.sockets((a) => a.role === "host")[0] || null;
  }
  playerSocket(id) {
    return this.sockets((a) => a.role === "player" && a.id === id)[0] || null;
  }
  send(ws, msg) {
    try { ws.send(JSON.stringify(msg)); } catch (e) { /* closing */ }
  }
  publicPlayer(p) {
    return { id: p.id, name: p.name, avatar: p.avatar, audience: p.audience, connected: p.connected, joinedAt: p.joinedAt };
  }
  snapshot() {
    return {
      code: this.room.code, game: this.room.game, locked: this.room.locked, vip: this.room.vip,
      players: Object.values(this.room.players).sort((a, b) => a.joinedAt - b.joinedAt).map((p) => this.publicPlayer(p)),
    };
  }
  /** Tell the TV the room changed, with what happened. */
  tellHost(event) {
    const host = this.hostSocket();
    if (host) this.send(host, { t: "room", event, room: this.snapshot() });
  }
  tellPlayer(id) {
    const p = this.room.players[id], ws = this.playerSocket(id);
    if (p && ws) this.send(ws, { t: "you", id, name: p.name, avatar: p.avatar, vip: this.room.vip === id, audience: p.audience });
  }
  pickVip() {
    const v = this.room.vip && this.room.players[this.room.vip];
    if (v && !v.audience) return;
    const next = Object.values(this.room.players).filter((p) => !p.audience).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    this.room.vip = next ? next.id : null;
    if (next) this.tellPlayer(next.id);
  }

  /* --- opening a live line --- */
  async fetch(request) {
    if (!this.room) return json({ error: "no-room" }, 404);
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    if (role === "host") {
      const key = url.searchParams.get("key") || "";
      if ((await hash(key)) !== this.room.hostKeyHash) return json({ error: "host-key" }, 403);
      if (this.overBudget(0)) return json({ error: "slow-down" }, 429);
      const old = this.hostSocket();
      if (old) { this.send(old, { t: "replaced" }); try { old.close(4001, "replaced"); } catch (e) {} }
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ role: "host" });
      this.send(server, { t: "room", event: { kind: "host-connected" }, room: this.snapshot(), now: Date.now() });
      for (const ws of this.sockets((a) => a.role === "player" && a.id)) this.send(ws, { t: "host", on: true });
    } else if (role === "player") {
      // A phone has 30 seconds to join or rejoin, and a room only takes so many lines at once.
      const now = Date.now(), lines = [];
      let waiting = 0;
      for (const w of this.sockets((a) => a.role === "player")) {
        const a = w.deserializeAttachment() || {};
        if (!a.id && now - (a.at || 0) > 30e3) { try { w.close(4008, "join-timeout"); } catch (e) {} continue; }
        lines.push(w);
        if (!a.id) waiting++;
      }
      const game = rules(this.room.game);
      // (A whole room may scan the QR code at the same moment, so up to a room's worth may be waiting at once.)
      const size = game.maxPlayers + game.maxAudience;
      if (waiting >= size || lines.length >= size + 20) return json({ error: "busy" }, 429);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ role: "player", id: null, at: now }); // joins or rejoins with its first message
      this.send(server, { t: "hello", code: this.room.code, game: this.room.game, avatars: rules(this.room.game).avatars, now: Date.now() });
    } else {
      return json({ error: "role" }, 400);
    }
    await this.touch();
    await this.armAlarm();
    return new Response(null, { status: 101, webSocket: client });
  }

  /** A simple budget per connection: about `rate` messages a second, with room for a burst. */
  allowed(ws, host) {
    // The TV may talk to 30 phones at once (a burst), but not for long; a phone taps at most 4 times a second.
    const rate = host ? 40 : 8, burst = host ? 400 : 30, now = Date.now();
    const b = this.buckets.get(ws) || { tokens: burst, at: now };
    b.tokens = Math.min(burst, b.tokens + ((now - b.at) / 1000) * rate);
    b.at = now;
    b.tokens -= 1;
    this.buckets.set(ws, b);
    return b.tokens >= 0;
  }

  /** A room's TV gets a fixed number of messages an hour (HOST_PER_HOUR). A whole Spark Wars night with 30 phones
      uses well under half of it; a script left running in a room it made can't use up the site's daily quota. */
  overBudget(add = 1) {
    const hour = Math.floor(Date.now() / 3600e3), b = this.room.budget;
    if (!b || b.hour !== hour) this.room.budget = { hour, n: 0 };
    this.room.budget.n += add;
    return this.room.budget.n > num(this.env.HOST_PER_HOUR, 60000);
  }

  async webSocketMessage(ws, message) {
    if (!this.room) { try { ws.close(4004, "no-room"); } catch (e) {} return; }
    const att = ws.deserializeAttachment() || {};
    const host = att.role === "host";
    if (typeof message !== "string" || message.length > (host ? HOST_MSG_BYTES : PLAYER_MSG_BYTES)) {
      try { ws.close(1009, "too-big"); } catch (e) {}
      return;
    }
    if (!this.allowed(ws, host) || (host && this.overBudget())) {
      this.send(ws, { t: "error", code: "too-fast" });
      try { ws.close(4029, "too-fast"); } catch (e) {}
      return;
    }
    let msg;
    try { msg = JSON.parse(message); } catch (e) { return; }
    if (!msg || typeof msg !== "object") return;
    if (msg.t === "time") return this.send(ws, { t: "time", c: msg.c, s: Date.now() });
    await this.touch();
    if (host) await this.fromHost(ws, msg);
    else await this.fromPlayer(ws, att, msg);
  }

  /* --- the TV --- */
  async fromHost(ws, msg) {
    const r = this.room;
    if (msg.t === "to") {
      // Send something to phones: "all", "players", "audience", or a list of player ids.
      const to = msg.to, data = msg.data;
      const want = (a) => {
        if (!a.id || !r.players[a.id]) return false;
        if (to === "all") return true;
        if (to === "players") return !r.players[a.id].audience;
        if (to === "audience") return r.players[a.id].audience;
        return Array.isArray(to) && to.includes(a.id);
      };
      for (const p of this.sockets((a) => a.role === "player" && want(a))) this.send(p, { t: "msg", data });
      return;
    }
    if (msg.t === "kick" && r.players[msg.id]) {
      const id = msg.id, p = r.players[id];
      delete r.players[id];
      r.kicked.push(id);
      const pws = this.playerSocket(id);
      if (pws) { this.send(pws, { t: "kicked" }); try { pws.close(4003, "kicked"); } catch (e) {} }
      if (r.vip === id) { r.vip = null; this.pickVip(); }
      await this.save();
      this.tellHost({ kind: "kick", id, name: p.name });
      return;
    }
    if (msg.t === "lock") {
      r.locked = !!msg.locked;
      await this.save();
      this.tellHost({ kind: r.locked ? "lock" : "unlock" });
      return;
    }
    if (msg.t === "vip" && r.players[msg.id] && !r.players[msg.id].audience) {
      const old = r.vip;
      r.vip = msg.id;
      await this.save();
      if (old) this.tellPlayer(old);
      this.tellPlayer(msg.id);
      this.tellHost({ kind: "vip", id: msg.id });
      return;
    }
    if (msg.t === "end") return this.endRoom("ended");
  }

  /* --- a phone --- */
  async fromPlayer(ws, att, msg) {
    const r = this.room;
    if (msg.t === "join" && !att.id) {
      const fail = (code) => this.send(ws, { t: "error", code });
      if (r.locked) return fail("locked");
      const name = checkName(msg.name);
      if (!name.ok) return fail("name-" + name.reason);
      if (Object.values(r.players).some((p) => p.name.toLowerCase() === name.name.toLowerCase())) return fail("name-taken");
      const game = rules(r.game);
      const avatar = game.avatars.includes(msg.avatar) ? msg.avatar : game.avatars[0];
      const list = Object.values(r.players);
      const audience = list.filter((p) => !p.audience).length >= game.maxPlayers;
      if (audience && list.filter((p) => p.audience).length >= game.maxAudience) return fail("full");
      const id = randomKey(6), key = randomKey();
      r.players[id] = { id, name: name.name, avatar, audience, connected: true, joinedAt: Date.now(), keyHash: await hash(key) };
      if (!r.vip && !audience) r.vip = id;
      ws.serializeAttachment({ role: "player", id });
      await this.save();
      this.send(ws, { t: "joined", id, key, name: name.name, avatar, audience, vip: r.vip === id, host: !!this.hostSocket() });
      this.tellHost({ kind: "join", id });
      return;
    }
    if (msg.t === "rejoin" && !att.id) {
      const p = r.players[msg.id];
      if (!p || r.kicked.includes(msg.id) || (await hash(String(msg.key || ""))) !== p.keyHash) {
        return this.send(ws, { t: "error", code: "rejoin" });
      }
      const old = this.playerSocket(p.id);
      if (old && old !== ws) { try { old.close(4001, "replaced"); } catch (e) {} }
      ws.serializeAttachment({ role: "player", id: p.id });
      p.connected = true;
      await this.save();
      this.send(ws, { t: "joined", id: p.id, rejoined: true, name: p.name, avatar: p.avatar, audience: p.audience, vip: r.vip === p.id, host: !!this.hostSocket() });
      this.tellHost({ kind: "back", id: p.id });
      return;
    }
    if (msg.t === "input" && att.id && r.players[att.id]) {
      // Anything typed is checked here, before the TV (and the room) can see it.
      const d = msg.data;
      if (d && typeof d === "object" && "text" in d) {
        const c = checkText(d.text);
        if (!c.ok) return this.send(ws, { t: "error", code: "text-" + c.reason, round: d.round });
        d.text = c.text;
      }
      const host = this.hostSocket();
      if (host) this.send(host, { t: "input", id: att.id, data: msg.data, at: Date.now() });
    }
  }

  /* --- leaving --- */
  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) {}
    await this.dropped(ws);
  }
  async webSocketError(ws) {
    await this.dropped(ws);
  }
  async dropped(ws) {
    if (!this.room) return;
    const att = ws.deserializeAttachment() || {};
    if (att.role === "host") {
      if (this.hostSocket()) return; // a newer TV connection already took over
      for (const p of this.sockets((a) => a.role === "player" && a.id)) this.send(p, { t: "host", on: false });
      return;
    }
    const p = att.id && this.room.players[att.id];
    if (!p) return;
    const still = this.sockets((a) => a.role === "player" && a.id === att.id).some((s) => s !== ws);
    if (still) return; // it already rejoined on a new connection
    p.connected = false;
    await this.save();
    this.tellHost({ kind: "leave", id: p.id });
  }

  async endRoom(why) {
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() || {};
      if (att.role === "player") this.send(ws, { t: "ended", why });
      try { ws.close(4000, why); } catch (e) {}
    }
    this.room = null;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  /** Rooms clean themselves up: 2 hours with nothing happening, or 12 hours at most. */
  async alarm() {
    if (!this.room) return;
    const now = Date.now();
    if (now - this.room.lastActive >= this.idleMs || now - this.room.createdAt >= MAX_LIFETIME_MS) return this.endRoom("expired");
    await this.armAlarm();
  }
}
