/* Spark Wars on the TV: the core. The game for the whole youth group: up to 30 players, each on their own phone.
   The TV makes a room on the Spark Wars server (the same relay as Holy Huddle: huddle/server), shows the code and a QR
   code, and fills the lobby as phones join. The leader picks a game, the teams, the questions and the length.

   A night of Spark Wars: teams stay together all night. Every game gives War Points to the teams (3 for first, then
   2, 1, 0), so the war goes across games. The games live in their own files (talents.js, bluff.js, timeline.js)
   and register with SW.game({...}); this file runs the room, the lobby, the teams, the rules screens, the results
   and the war.

   The TV runs everything. Phones only draw the screens it sends (huddle/phone) and send back taps and typing.
   Messages are in huddle/PROTOCOL.md. */
window.SW = (() => {
  "use strict";
  const HOME = "https://sparkwars.thecrossroads.workers.dev";
  const qs = new URLSearchParams(location.search);
  // On the Spark Wars site itself (or a local test server) talk to this site; anywhere else, to the real one.
  const BASE = (qs.get("server") || (/sparkwars|localhost|127\.0\.0\.1/.test(location.host) && location.protocol.startsWith("http") ? location.origin : HOME)).replace(/\/$/, "");
  const JOIN_TEXT = BASE.replace(/^https?:\/\//, "");
  const MAX_PLAYERS = 30;
  const ICONS = {
    bolt: "⚡", flame: "🔥", rocket: "🚀", comet: "☄️", fox: "🦊", wolf: "🐺", shark: "🦈", tiger: "🐯", panda: "🐼", owl: "🦉", octopus: "🐙", dino: "🦖",
    dragon: "🐉", robot: "🤖", alien: "👾", ghost: "👻", ball: "🏀", guitar: "🎸", skate: "🛹", pizza: "🍕", crown: "👑", gem: "💎", cactus: "🌵", eagle2: "🦅",
  };
  const TEAMS = [
    { key: "volt", name: "Volt", icon: "⚡", color: "#ffd23f" },
    { key: "blaze", name: "Blaze", icon: "🔥", color: "#ff6a3d" },
    { key: "surge", name: "Surge", icon: "🌊", color: "#2ee6ff" },
    { key: "nova", name: "Nova", icon: "✨", color: "#c77dff" },
  ];
  const WAR_POINTS = [3, 2, 1, 0];
  const SAVE = "sparkwars-tv"; // { code, hostKey } in this tab, so a reloaded TV gets its room back
  const PREFS = "sparkwars-prefs";
  const prefs = (() => {
    const d = { game: "talents", teams: 2, pack: "mix", minutes: 7, steals: true, muted: false, bluffs: 6, sets: 3 };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) { return d; }
  })();
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {} };

  /* ---------- Small helpers ---------- */
  const stage = document.getElementById("stage");
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  };
  const show = (node) => { stage.replaceChildren(node); node.classList.add("enter"); return node; };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const nth = (n) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const fmt = (n) => Math.round(n).toLocaleString();
  const face = (p) => ICONS[p && p.avatar] || "⚡";
  const names = (ids) => { const n = ids.map((id) => (byId(id) || {}).name).filter(Boolean); return n.length < 2 ? n.join("") : n.length > 4 ? `${n.slice(0, 3).join(", ")} and ${n.length - 3} more` : `${n.slice(0, -1).join(", ")} and ${n.at(-1)}`; };

  // The stage is 1280×720; it scales to fit the screen.
  function fit() { const box = document.querySelector(".stagebox") || stage; box.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / 1280, innerHeight / 720)})`; }
  addEventListener("resize", fit);
  fit();

  /* ---------- Sound: a few short blips, made on the spot (no files) ---------- */
  const NOTES = {
    join: [[660, 0.08], [990, 0.12]], start: [[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], tick: [[880, 0.06]], go: [[1046, 0.35]],
    big: [[784, 0.08], [988, 0.08], [1318, 0.2]], steal: [[440, 0.08], [330, 0.08], [220, 0.16]], swap: [[523, 0.07], [784, 0.07], [523, 0.07], [784, 0.12]],
    double: [[659, 0.08], [880, 0.08], [1174, 0.2]], end: [[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.4]], warn: [[300, 0.15], [300, 0.15]],
    reveal: [[523, 0.06], [659, 0.1]], wrong: [[220, 0.12], [196, 0.2]], right: [[659, 0.08], [988, 0.18]], fool: [[392, 0.07], [330, 0.07], [262, 0.14]],
  };
  let actx = null;
  function S(name) {
    if (prefs.muted || !NOTES[name]) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime + 0.01;
      for (const [f, d] of NOTES[name]) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "square"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
        t += d * 0.9;
      }
    } catch (e) {}
  }

  /* ---------- Music: Trivia Holy Party's band (js/music.js), sharing this page's sound ---------- */
  window.THP = window.THP || {};
  THP.Sound = THP.Sound || { context: () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return actx; }, isMuted: () => prefs.muted };
  const music = (id) => { try { THP.Music && THP.Music.play(id); } catch (e) {} };

  /* ---------- Things to watch: sparks, bursts, callouts, shakes, sliding boards, counting numbers ---------- */
  const fx = (() => {
    const back = el("canvas", { class: "fx back", width: 1280, height: 720, "aria-hidden": "true" });
    const front = el("canvas", { class: "fx front", width: 1280, height: 720, "aria-hidden": "true" });
    const calls = el("div", { class: "callouts", "aria-live": "polite" });
    // The canvases sit in the same scaled box as the stage: sparks behind it, confetti and callouts in front.
    const frame = el("div", { class: "stagebox" });
    stage.parentNode.insertBefore(frame, stage);
    frame.append(back, stage, front, calls);
    stage.style.transform = ""; // the box scales now, not the stage
    const bctx = back.getContext("2d"), fctx = front.getContext("2d");
    let energy = 0.4, tint = null;
    const sparks = [], bits = [];
    const COLORS = ["#ffd23f", "#ff6a3d", "#2ee6ff", "#c77dff", "#ff4d6d", "#2ee58a", "#ffffff"];
    const rnd = (a, b) => a + Math.random() * (b - a);
    function frameLoop() {
      // Background: sparks drift up and flicker; more and faster with more energy.
      bctx.clearRect(0, 0, 1280, 720);
      if (tint) { bctx.fillStyle = tint; bctx.fillRect(0, 0, 1280, 720); }
      const want = Math.round(25 + energy * 90);
      while (sparks.length < want) sparks.push({ x: rnd(0, 1280), y: rnd(720, 760), vy: rnd(0.3, 1.2), vx: rnd(-0.3, 0.3), r: rnd(0.8, 2.6), c: pickOne(COLORS.slice(0, 4)), ph: rnd(0, 6) });
      if (sparks.length > want) sparks.length = want;
      for (const p of sparks) {
        p.y -= p.vy * (0.6 + energy * 2.2); p.x += p.vx + Math.sin((p.y + p.ph * 50) / 60) * 0.3; p.ph += 0.1;
        if (p.y < -10) { p.y = rnd(720, 760); p.x = rnd(0, 1280); }
        bctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(p.ph));
        bctx.fillStyle = p.c;
        bctx.beginPath(); bctx.arc(p.x, p.y, p.r, 0, 7); bctx.fill();
      }
      bctx.globalAlpha = 1;
      // Front: confetti and bursts.
      fctx.clearRect(0, 0, 1280, 720);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy += b.g; b.x += b.vx; b.y += b.vy; b.vx *= 0.99; b.rot += b.vr; b.life--;
        if (b.life <= 0 || b.y > 760) { bits.splice(i, 1); continue; }
        fctx.save(); fctx.globalAlpha = Math.min(1, b.life / 30); fctx.translate(b.x, b.y); fctx.rotate(b.rot); fctx.fillStyle = b.c;
        if (b.kind === "dot") { fctx.beginPath(); fctx.arc(0, 0, b.s / 2, 0, 7); fctx.fill(); } else fctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        fctx.restore();
      }
      requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const queue = [];
    let showing = false;
    function nextCall() {
      const item = queue.shift();
      if (!item) { showing = false; return; }
      showing = true;
      const [text, o] = item;
      const c = el("div", { class: "callout" + (o.small ? " small" : ""), style: o.color ? `--c:${o.color}` : null }, o.icon ? el("span", { class: "icon" }, o.icon) : null, el("span", {}, text));
      calls.append(c);
      setTimeout(() => c.classList.add("out"), o.small ? 1300 : 1700);
      setTimeout(() => { c.remove(); nextCall(); }, o.small ? 1650 : 2050);
    }
    return {
      /** 0 = calm (lobby) to 1 = frantic (the last seconds). */
      energy(v, color) { energy = v; tint = color || null; },
      /** Confetti from the top, or a burst from a point. */
      confetti(n = 160, colors) {
        if (reduced) return;
        for (let i = 0; i < n; i++) bits.push({ x: rnd(0, 1280), y: rnd(-80, -10), vx: rnd(-1.5, 1.5), vy: rnd(1, 4), g: 0.06, s: rnd(8, 14), rot: rnd(0, 6), vr: rnd(-0.2, 0.2), c: pickOne(colors || COLORS), life: 260, kind: "paper" });
      },
      burst(x, y, n = 40, colors) {
        if (reduced) return;
        for (let i = 0; i < n; i++) { const a = rnd(0, 6.3), v = rnd(3, 10); bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: 0.18, s: rnd(5, 10), rot: 0, vr: 0, c: pickOne(colors || COLORS), life: rnd(40, 70), kind: "dot" }); }
      },
      /** A burst from the middle of an element on the stage. */
      burstAt(node, n, colors) {
        if (!node) return;
        const r = node.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = 1280 / s.width;
        fx.burst((r.left + r.width / 2 - s.left) * k, (r.top + r.height / 2 - s.top) * k, n, colors);
      },
      shake(big) { if (reduced) return; frame.classList.remove("shake", "shake-big"); void frame.offsetWidth; frame.classList.add(big ? "shake-big" : "shake"); },
      flash(color) { if (reduced) return; const f = el("div", { class: "flash", style: `--c:${color || "#fff"}` }); frame.append(f); setTimeout(() => f.remove(), 600); },
      /** A big line that flies in over everything: { icon, color, small }. Callouts queue up; old ones are dropped. */
      callout(text, o = {}) { queue.push([text, o]); if (queue.length > 3) queue.splice(0, queue.length - 3); if (!showing) nextCall(); },
      /** Drop any callouts still waiting (a new screen is coming). */
      clear() { queue.length = 0; for (const c of calls.children) c.classList.add("out"); },
      /** Count a number up (or down) in an element. */
      count(node, from, to, ms = 900) {
        if (!node) return;
        const t0 = performance.now();
        const go = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); node.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(go); };
        requestAnimationFrame(go);
      },
      /** Swap a list's children for new ones (each with data-key) and slide the ones that moved. */
      flip(list, kids) {
        const before = new Map([...list.children].map((c) => [c.dataset.key, c.getBoundingClientRect()]));
        list.replaceChildren(...kids);
        if (reduced) return;
        const scale = stage.getBoundingClientRect().width / 1280 || 1;
        for (const c of list.children) {
          const was = before.get(c.dataset.key);
          if (!was) { c.classList.add("arrive"); continue; }
          const now = c.getBoundingClientRect(), dx = (was.left - now.left) / scale, dy = (was.top - now.top) / scale;
          if (!dx && !dy) continue;
          c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.2,.8,.2,1.15)" });
          if (dy > 4) c.classList.add("climb");
        }
      },
    };
  })();
  fit();

  /* ---------- The room ---------- */
  let ws = null, room = null, players = [], ending = false, retry = 0;
  let phase = "title", lobbyNode = null, cur = null, stepToken = 0;
  const timers = new Set();
  const shown = {}; // the last screen each phone was sent, to send again when it rejoins
  const sendTo = (to, data) => { try { ws.send(JSON.stringify({ t: "to", to, data })); } catch (e) {} };
  const hostSend = (m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
  const save = (v) => { try { v ? sessionStorage.setItem(SAVE, JSON.stringify(v)) : sessionStorage.removeItem(SAVE); } catch (e) {} };
  const byId = (id) => players.find((p) => p.id === id);
  const cast = () => players.filter((p) => !p.audience);
  /** Starting a new step cancels every timer of the old one. */
  function step() { for (const t of timers) { clearTimeout(t); clearInterval(t); } timers.clear(); return ++stepToken; }
  const live = (token) => token === stepToken;
  const wait = (ms, token) => new Promise((r) => { const t = setTimeout(() => { timers.delete(t); r(live(token)); }, ms); timers.add(t); });
  const every = (ms, fn) => { const t = setInterval(fn, ms); timers.add(t); return t; };
  const later = (ms, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

  /** Send a phone (or "players", or a list of ids) a screen. Its team badge is added, and it's kept for a rejoin. */
  function put(to, screen) {
    const ids = to === "players" ? cast().map((p) => p.id) : to === "all" ? players.map((p) => p.id) : [].concat(to);
    for (const id of ids) {
      const s = screen.badge === undefined && badge(id) ? Object.assign({ badge: badge(id) }, screen) : screen;
      shown[id] = s;
      const p = byId(id);
      if (p && p.connected) sendTo([id], s);
    }
  }
  /** What a phone shows when it (re)joins. */
  function screenFor(id) {
    const p = byId(id);
    if (phase === "lobby" || phase === "title") return { screen: "lobby" };
    if (p && p.audience) return { screen: "wait", title: "You're in the audience", text: "The game is full (30 players). Watch the big screen!" };
    return shown[id] || { screen: "wait", title: "Jump in!", text: "You'll be in from the next question.", badge: badge(id) };
  }

  function titleScreen(note) {
    phase = "title";
    show(el("section", { class: "title" },
      el("div", { class: "logo" }, el("span", { class: "spark", "aria-hidden": "true" }, "⚡"), el("h1", {}, "Spark Wars")),
      el("p", { class: "tag" }, "The game night for the whole youth group. Up to 30 players, one phone each, teams at war."),
      note ? el("p", { class: "warn" }, note) : null,
      el("div", { class: "row" },
        el("button", { class: "btn go", onclick: openRoom }, "▶ Open a room"),
        el("button", { class: "btn ghost", onclick: () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} } }, "⛶ Full screen")),
      el("div", { class: "lineup" }, ...GAMES.map((g) => el("span", {}, `${g.icon} ${g.name}`))),
      el("p", { class: "fine" }, `Players join on their phones at ${JOIN_TEXT}`)));
  }

  async function openRoom() {
    S("join");
    try { THP.Music && THP.Music.unlock(); } catch (e) {}
    show(el("section", { class: "title" }, el("h1", {}, "Spark Wars"), el("p", { class: "tag" }, "Opening a room...")));
    let r = saved();
    if (r) {
      const still = await fetch(`${BASE}/api/rooms/${r.code}`).then((x) => x.ok).catch(() => false);
      if (!still) r = null;
    }
    if (!r) {
      r = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game: "spark-wars" }) })
        .then((x) => (x.ok ? x.json() : null)).catch(() => null);
    }
    if (!r || !r.code) return titleScreen("Can't reach the Spark Wars server. Check the internet and try again.");
    save({ code: r.code, hostKey: r.hostKey });
    room = { code: r.code, hostKey: r.hostKey, vip: null, locked: false };
    players = []; ending = false;
    night = newNight();
    connect();
    lobby();
  }

  function connect() {
    const line = new WebSocket(`${BASE.replace(/^http/, "ws")}/ws/${room.code}?role=host&key=${encodeURIComponent(room.hostKey)}`);
    ws = line;
    line.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onMessage(m); };
    line.onclose = () => {
      if (ws !== line || ending) return;
      retry++;
      setStatus("Reconnecting...");
      setTimeout(() => { if (!ending && ws === line) connect(); }, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
    };
  }

  function onMessage(m) {
    if (m.t === "room") {
      retry = 0;
      setStatus("");
      const had = players.length;
      players = m.room.players;
      room.vip = m.room.vip;
      room.locked = m.room.locked;
      const ev = m.event || {}, p = byId(ev.id);
      if (ev.kind === "join" && p) {
        if (phase === "lobby") { S("join"); setTimeout(() => fx.burstAt(stage.querySelector(`.tile[data-key="${p.id}"]`), 26), 60); }
        if (!p.audience && night.teams.length) placeInTeam(p.id);
        if (cur && cur.join && !p.audience) cur.join(p.id);
        sendTo([p.id], screenFor(p.id));
      }
      if (ev.kind === "back" && p) sendTo([p.id], screenFor(p.id));
      if (ev.kind === "host-connected" && had) players.forEach((x) => x.connected && sendTo([x.id], screenFor(x.id)));
      refresh();
      return;
    }
    if (m.t === "input") return onInput(m);
    if (m.t === "replaced") { ending = true; save(null); step(); titleScreen("This room was opened on another screen."); }
  }

  function onInput(m) {
    const d = m.data || {}, isVip = m.id === room.vip;
    if (d.type === "start" && isVip && phase === "lobby") return startGame(prefs.game);
    if (d.type === "vip" && isVip) {
      if (d.action === "skip" && phase === "rules") return skipRules && skipRules();
      if (d.action === "again" && phase === "results") return startGame(lastGame);
      if (d.action === "lobby" && phase === "results") return backToLobby();
      return;
    }
    if (phase === "game" && cur && cur.input) cur.input(m.id, d, m.at);
  }

  /* ---------- Teams and the war (for the whole night) ---------- */
  let night = null;
  function newNight() { return { teams: [], teamOf: {}, war: {}, games: [] }; }
  const teamOf = (id) => night && night.teamOf[id] ? TEAMS.find((t) => t.key === night.teamOf[id]) : null;
  const badge = (id) => { const t = teamOf(id); return t ? { text: `${t.icon} Team ${t.name}`, color: t.color } : null; };
  function placeInTeam(id) {
    if (night.teamOf[id] || !night.teams.length) return;
    const sizes = night.teams.map((t) => ({ t, n: cast().filter((p) => night.teamOf[p.id] === t.key).length }));
    night.teamOf[id] = sizes.sort((a, b) => a.n - b.n || Math.random() - 0.5)[0].t.key;
  }
  /** Teams for the night: made once, kept across games. A new team count (or Shuffle) makes new teams. */
  function setTeams(reshuffle) {
    const n = prefs.teams ? Math.min(prefs.teams, Math.max(1, cast().length)) : 0;
    if (!n) { night.teams = []; night.teamOf = {}; return; }
    if (reshuffle || night.teams.length !== n) {
      night.teams = TEAMS.slice(0, n);
      night.teamOf = {};
      for (const t of night.teams) night.war[t.key] = night.war[t.key] || 0;
      shuffle(cast()).forEach((p) => placeInTeam(p.id));
    } else cast().forEach((p) => placeInTeam(p.id));
  }
  /** Team scores from player scores. Smaller teams are evened up, so a team of 7 isn't behind a team of 8 just for size. */
  function teamTotals(scores) {
    const list = night.teams.map((t) => {
      const ids = cast().filter((p) => night.teamOf[p.id] === t.key).map((p) => p.id);
      return { ...t, ids, raw: ids.reduce((n, id) => n + (scores[id] || 0), 0) };
    });
    const big = Math.max(1, ...list.map((t) => t.ids.length));
    for (const t of list) t.total = t.ids.length ? Math.round((t.raw * big) / t.ids.length) : 0;
    return list.sort((a, b) => b.total - a.total);
  }
  function warBoard(gained) {
    if (!night.teams.length) return null;
    const order = night.teams.slice().sort((a, b) => (night.war[b.key] || 0) - (night.war[a.key] || 0));
    return el("div", { class: "war" }, el("span", { class: "label" }, "⚔ War Points"),
      ...order.map((t) => el("span", { class: "team", style: `--team:${t.color}` }, `${t.icon} ${t.name}`, el("b", {}, night.war[t.key] || 0),
        gained && gained[t.key] ? el("em", {}, `+${gained[t.key]}`) : null)));
  }

  /* ---------- The lobby ---------- */
  function setStatus(text) { const s = stage.querySelector(".status"); if (s) s.textContent = text; }
  function qrSvg(text) {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount(), cells = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) cells.push(`M${x + 2} ${y + 2}h1v1h-1z`);
      const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${cells.join("")}" fill="#07060f"/></svg>`, "image/svg+xml").documentElement;
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "QR code to join");
      return svg;
    } catch (e) { return el("div", { class: "noqr" }, "Scan not available"); }
  }

  function lobby() {
    step();
    phase = "lobby";
    cur = null;
    for (const k in shown) delete shown[k];
    const url = `${BASE}/?room=${room.code}`;
    lobbyNode = el("section", { class: "lobby" },
      el("aside", { class: "join" },
        el("div", { class: "logo small" }, el("span", { class: "spark", "aria-hidden": "true" }, "⚡"), el("h1", {}, "Spark Wars")),
        el("p", { class: "label" }, "Join on your phone"),
        el("div", { class: "qr" }, qrSvg(url)),
        el("p", { class: "url" }, JOIN_TEXT),
        el("div", { class: "code", "aria-label": "Room code" }, ...room.code.split("").map((c) => el("span", {}, c))),
        el("p", { class: "status" }),
        el("p", { class: "tip" })),
      el("div", { class: "right" },
        el("div", { class: "who" }, el("h2", {}, "Players"), el("span", { class: "count" }), el("span", { class: "aud" }), el("span", { class: "warslot" })),
        el("div", { class: "grid" }),
        el("div", { class: "settings" })));
    show(lobbyNode);
    fx.clear();
    // A rotating tip under the code while everyone joins.
    const TIPS = ["📱 No app needed: just the website", "👑 First one in is the VIP", "⚔ Teams stay together all night", "🏆 Win games to earn War Points",
      "🎭 Bluff the Bible: fool your friends", "💰 Talents: steal, swap, double up", "🧭 Timeline: put the Bible in order"];
    let tip = 0;
    const tipNode = lobbyNode.querySelector(".tip");
    const showTip = () => { tipNode.classList.remove("in"); void tipNode.offsetWidth; tipNode.textContent = TIPS[tip++ % TIPS.length]; tipNode.classList.add("in"); };
    showTip();
    every(4500, showTip);
    music("manna");
    fx.energy(0.3);
    refresh();
    drawSettings();
  }

  function refresh() {
    if (phase !== "lobby" || !lobbyNode) return;
    const list = cast(), aud = players.filter((p) => p.audience).length;
    lobbyNode.querySelector(".count").textContent = `${list.length} / ${MAX_PLAYERS}`;
    lobbyNode.querySelector(".aud").textContent = aud ? `+ ${aud} watching` : "";
    lobbyNode.querySelector(".warslot").replaceChildren(night.games.length ? warBoard() : "");
    const grid = lobbyNode.querySelector(".grid");
    grid.replaceChildren(...Array.from({ length: MAX_PLAYERS }, (_, i) => {
      const p = list[i];
      if (!p) return el("div", { class: "tile empty" }, el("span", { class: "face" }, "·"));
      const t = teamOf(p.id);
      const tile = el("button", { class: "tile" + (p.connected ? "" : " away") + (p.id === room.vip ? " vip" : ""), "data-key": p.id, style: t ? `--team:${t.color}` : null, title: "Click twice to remove", onclick: () => {
        if (tile.classList.contains("confirm")) { hostSend({ t: "kick", id: p.id }); delete night.teamOf[p.id]; return; }
        grid.querySelectorAll(".confirm").forEach((x) => x.classList.remove("confirm"));
        tile.classList.add("confirm");
        setTimeout(() => tile.classList.remove("confirm"), 3000);
      } }, el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name), p.id === room.vip ? el("span", { class: "crown", title: "VIP: can start from their phone" }, "👑") : null);
      return tile;
    }));
    const lock = lobbyNode.querySelector(".lock");
    if (lock) lock.textContent = room.locked ? "🔓 Unlock" : "🔒 Lock";
    const go = lobbyNode.querySelector(".start");
    if (go) go.disabled = !list.length;
  }

  function chips(label, options, current, onPick) {
    return el("div", { class: "setting" }, el("span", { class: "label" }, label),
      el("div", { class: "chips" }, ...options.map(([v, text]) => el("button", { class: "chip" + (v === current ? " on" : ""), "aria-pressed": v === current ? "true" : "false", onclick: () => { onPick(v); savePrefs(); drawSettings(); refresh(); } }, text))));
  }
  function drawSettings() {
    if (!lobbyNode) return;
    const g = GAMES.find((x) => x.key === prefs.game) || GAMES[0];
    const box = lobbyNode.querySelector(".settings");
    box.replaceChildren(
      el("div", { class: "games" }, ...GAMES.map((x) => el("button", { class: "game" + (x.key === g.key ? " on" : ""), "aria-pressed": x.key === g.key ? "true" : "false", onclick: () => { prefs.game = x.key; savePrefs(); drawSettings(); } },
        el("span", { class: "icon" }, x.icon), el("strong", {}, x.name), el("small", {}, x.about)))),
      el("div", { class: "opts" },
        chips("Teams", [[0, "Off"], [2, "2"], [3, "3"], [4, "4"]], prefs.teams, (v) => { prefs.teams = v; if (phase === "lobby") setTeams(); }),
        ...(g.settings ? g.settings(chips, prefs, () => { savePrefs(); drawSettings(); }) : [])),
      el("div", { class: "buttons" },
        el("button", { class: "btn go start", disabled: !cast().length, onclick: () => startGame(g.key) }, `▶ Start ${g.name}`),
        prefs.teams ? el("button", { class: "btn ghost", onclick: () => { setTeams(true); refresh(); S("swap"); fx.shake(); } }, "🔀 Shuffle teams") : null,
        el("button", { class: "btn ghost lock", onclick: () => hostSend({ t: "lock", locked: !room.locked }) }, room.locked ? "🔓 Unlock" : "🔒 Lock"),
        el("button", { class: "btn ghost", title: "Sound and music", onclick: () => { prefs.muted = !prefs.muted; savePrefs(); drawSettings(); try { THP.Music.refresh(); } catch (e) {} } }, prefs.muted ? "🔇" : "🔊"),
        el("button", { class: "btn ghost", onclick: endRoom }, "End")));
  }

  function endRoom() {
    ending = true;
    step();
    if (cur && cur.stop) cur.stop();
    if (ws) { hostSend({ t: "end" }); setTimeout(() => { try { ws.close(); } catch (e) {} }, 300); }
    save(null);
    room = null; players = []; cur = null; lobbyNode = null;
    titleScreen();
  }

  /* ---------- Playing a game ---------- */
  const GAMES = [];
  let lastGame = null, skipRules = null;
  /** A game registers itself: { key, name, icon, about, settings(chips, prefs), run(api) }. */
  function game(def) { GAMES.push(def); }

  async function startGame(key) {
    const def = GAMES.find((g) => g.key === key);
    if (!def || !cast().length) return;
    lastGame = key;
    if (cur && cur.stop) cur.stop();
    setTeams(false);
    lobbyNode = null;
    for (const k in shown) delete shown[k];
    put(players.filter((p) => p.audience).map((p) => p.id), { screen: "wait", title: "You're in the audience", text: "The game is full (30 players). Watch the big screen!" });
    cur = { def };
    const a = api(step());
    try {
      const result = await def.run(a);
      // The game's step moves on when the rules are skipped, so ask the game's own api if it's still current.
      if (result && a.live()) results(def, result);
    } catch (e) {
      console.error(e);
      if (a.live()) backToLobby();
    }
  }

  /** The rules screen: steps, extras, the teams, and a bar that runs out (the VIP can skip it). */
  function rules(token, r) {
    phase = "rules";
    S("start");
    music(r.music || "manna");
    fx.energy(0.5);
    const secs = r.seconds || 16;
    show(el("section", { class: "intro" },
      el("div", { class: "head" }, el("span", { class: "icon" }, r.icon), el("div", {}, el("h1", {}, r.title), el("p", {}, r.sub || ""))),
      el("ol", { class: "steps" }, ...r.steps.map((s, i) => el("li", {}, el("b", {}, i + 1), el("span", {}, s)))),
      r.extra || null,
      night.teams.length ? el("div", { class: "teams" }, ...night.teams.map((t) => el("div", { class: "team", style: `--team:${t.color}` },
        el("h3", {}, `${t.icon} ${t.name}`), el("p", {}, cast().filter((p) => night.teamOf[p.id] === t.key).map((p) => p.name).join(" · "))))) : null,
      r.foot ? el("p", { class: "soon" }, r.foot) : null,
      el("div", { class: "rulebar", style: `--secs:${secs}s` }, el("i"), el("span", {}, "Starting soon · the VIP can skip on their phone"))));
    put("players", { screen: "wait", title: r.title, text: r.phone || "Look at the big screen for the rules!", vip: { label: "Skip the rules", action: "skip" } });
    return new Promise((resolve) => {
      const done = (v) => { skipRules = null; resolve(v); };
      skipRules = () => { step(); countIn(stepToken).then(done); };
      wait(secs * 1000, token).then((ok) => { if (ok) countIn(token).then(done); });
    });
  }
  async function countIn(token) {
    phase = "countin";
    put("players", { screen: "wait", title: "Get ready...", text: "Phones up!" });
    const big = el("div", { class: "count" }, "3");
    show(el("section", { class: "countin" }, el("p", {}, "Phones up!"), big));
    for (const n of ["3", "2", "1"]) {
      big.textContent = n; big.classList.remove("pop"); void big.offsetWidth; big.classList.add("pop"); S("tick"); fx.shake(); fx.flash("#ffd23f");
      if (!(await wait(900, token))) return false;
    }
    S("go");
    fx.burst(640, 360, 90);
    fx.energy(0.7);
    phase = "game";
    return stepToken;
  }

  /** Everything a game can use. `token` is the game's step; rules() hands back a new one if the VIP skips. */
  function api(token) {
    const a = {
      el, show, shuffle, pickOne, nth, clock, fmt, face, names, S, put, prefs, byId, cast, teamOf, badge,
      get players() { return players; },
      get token() { return token; },
      get teams() { return night.teams; },
      teamTotals, warBoard, every, later, fx, music,
      live: () => live(token),
      wait: (ms) => wait(ms, token),
      /** Rules, then 3-2-1. Resolves true when the game should start. */
      async rules(r) { const t = await rules(token, r); if (!t) return false; token = t; return true; },
      /** Call for the current step after a pause the game controls itself (e.g. "End now"). */
      next() { token = step(); phase = "game"; return token; },
      set phase(p) { phase = p; },
      /** The game's own handlers: input(id, data), join(id), stop(). */
      on(h) { Object.assign(cur, h); },
      board(scores, opts) { return board(scores, opts || {}); },
    };
    return a;
  }

  /** A top-10 board (and team bars) for between rounds. With `gained`, it starts from the old scores, then the new
      points count up and the movers slide past each other. */
  function board(scores, o) {
    const gained = o.gained || {};
    const before = Object.fromEntries(Object.keys(scores).map((id) => [id, scores[id] - (gained[id] || 0)]));
    const order = (sc) => cast().filter((p) => p.id in sc).sort((a, b) => sc[b.id] - sc[a.id]);
    const totalsNow = night.teams.length ? teamTotals(scores) : null;
    const bars = totalsNow ? el("div", { class: "bars" }) : null;
    const list = el("ol", { class: "board" + (o.small ? " small" : "") });
    const rows = (sc, fresh) => order(sc).slice(0, 10).map((p, i) => {
      const t = teamOf(p.id), up = fresh && gained[p.id];
      return el("li", { class: (i < 3 ? "top" : ""), "data-key": p.id, style: t ? `--team:${t.color}` : null },
        el("span", { class: "rank" }, i + 1), el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name),
        up ? el("span", { class: "up" }, `+${fmt(up)}`) : null, el("span", { class: "talents" }, fmt(sc[p.id])));
    });
    const drawBars = (sc) => {
      if (!bars) return;
      const totals = teamTotals(sc), sum = Math.max(1, totals.reduce((n, t) => n + t.total, 0));
      bars.replaceChildren(...night.teams.map((t) => { const tt = totals.find((x) => x.key === t.key);
        return el("div", { class: "bar" + (totals[0].key === t.key && tt.total ? " lead" : ""), style: `--team:${t.color};--w:${Math.max(4, (tt.total / sum) * 100)}%` },
          el("span", { class: "label" }, `${t.icon} ${t.name}`), el("span", { class: "fill" }), el("span", { class: "total" }, fmt(tt.total))); }));
    };
    const animate = Object.keys(gained).length && !o.still;
    list.replaceChildren(...rows(animate ? before : scores, !animate));
    drawBars(animate ? before : scores);
    if (animate) {
      later(700, () => {
        const old = order(before)[0], lead = totalsNow && teamTotals(before)[0];
        fx.flip(list, rows(scores, true));
        for (const li of list.children) { const id = li.dataset.key; if (gained[id]) fx.count(li.querySelector(".talents"), before[id], scores[id]); }
        drawBars(scores);
        const now = order(scores)[0];
        if (now && old && now.id !== old.id) { fx.callout(`${now.name} takes 1st!`, { icon: face(now) }); S("big"); }
        if (lead && totalsNow[0].key !== lead.key && totalsNow[0].total !== totalsNow[1].total) { fx.callout(`Team ${totalsNow[0].name} takes the lead!`, { icon: totalsNow[0].icon, color: totalsNow[0].color }); fx.shake(); }
      });
    }
    return el("div", { class: "scoreboard" }, bars, list);
  }

  /* ---------- The end of a game ---------- */
  /** result: { scores: {id: n}, unit, title, awards: [[label, text]] } */
  async function results(def, result) {
    const token = step();
    phase = "timeup";
    S("end");
    fx.clear(); fx.shake(true); fx.flash("#ffffff"); fx.energy(0.3);
    show(el("section", { class: "countin" }, el("div", { class: "count pop" }, result.finale || "TIME!")));
    put("players", { screen: "wait", title: result.finale === "DONE!" ? "That's the game!" : "Time's up!", text: "Look at the big screen!" });
    if (!(await wait(2000, token))) return;
    const scores = result.scores, unit = result.unit || "points";
    const r = cast().filter((p) => p.id in scores).sort((a, b) => scores[b.id] - scores[a.id]);
    const totals = night.teams.length ? teamTotals(scores) : null;
    const gained = {};
    if (totals) {
      totals.forEach((t, i) => { const pts = WAR_POINTS[i] || 0; gained[t.key] = pts; night.war[t.key] = (night.war[t.key] || 0) + pts; });
    }
    night.games.push({ key: def.key, winner: totals ? totals[0].key : r[0] && r[0].id });
    phase = "results";
    music("strut");
    fx.energy(0.6);
    later(400, () => fx.confetti(220, totals ? [totals[0].color, "#ffffff", "#ffd23f"] : null));
    later(2600, () => { const w = stage.querySelector(".results .war"); if (w) { fx.burstAt(w, 60); S("big"); } });
    show(el("section", { class: "results" },
      totals ? el("div", { class: "winner", style: `--team:${totals[0].color}` }, el("h1", {}, `${totals[0].icon} Team ${totals[0].name} wins ${def.name}!`),
        el("div", { class: "totals" }, ...totals.map((t) => el("span", { style: `--team:${t.color}` }, `${t.icon} ${t.name} ${fmt(t.total)}`))))
        : el("div", { class: "winner" }, el("h1", {}, r[0] ? `${face(r[0])} ${r[0].name} wins ${def.name}!` : "Time!")),
      el("div", { class: "podium" }, ...[1, 0, 2].map((i) => r[i] ? el("div", { class: "step p" + (i + 1), style: teamOf(r[i].id) ? `--team:${teamOf(r[i].id).color}` : null },
        el("span", { class: "face" }, face(r[i])), el("span", { class: "name" }, r[i].name), el("span", { class: "talents" }, `${fmt(scores[r[i].id])} ${unit}`),
        el("span", { class: "block" }, ["🥇", "🥈", "🥉"][i])) : el("div", { class: "step empty" }))),
      el("div", { class: "awards" }, ...(result.awards || []).filter(Boolean).map(([a, b]) => el("div", {}, el("small", {}, a), el("strong", {}, b)))),
      totals ? warBoard(gained) : null,
      el("div", { class: "buttons" }, el("button", { class: "btn go", onclick: () => startGame(def.key) }, "↻ Play again"), el("button", { class: "btn ghost", onclick: backToLobby }, "Pick another game"))));
    for (const p of cast()) {
      const place = r.findIndex((x) => x.id === p.id) + 1, t = teamOf(p.id);
      const won = totals && t && totals[0].key === t.key;
      put(p.id, { screen: "final", place: place || null, of: r.length, points: p.id in scores ? scores[p.id] : null, unit,
        text: totals ? (won ? `Team ${t.name} wins! +${gained[t.key]} War Points 🏆` : t ? `Team ${totals[0].name} won this one. Team ${t.name}: +${gained[t.key] || 0} War Points` : "") : "",
        vip: [{ label: "Play again", action: "again" }, { label: "Pick another game", action: "lobby" }] });
    }
  }

  function backToLobby() {
    if (cur && cur.stop) cur.stop();
    lobby();
    put("players", { screen: "lobby" });
  }

  function boot() {
    // For tests and recordings.
    window.SPARK = { get phase() { return cur && cur.state && cur.state.phase ? cur.state.phase : phase; }, get core() { return phase; }, get game() { return cur && cur.state; }, get night() { return night; }, base: BASE };
    titleScreen();
  }
  return { game, boot };
})();
