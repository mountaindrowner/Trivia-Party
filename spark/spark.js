/* Spark Wars on the TV: the youth group game for up to 30 players, each on their own phone.
   The TV makes a room on the Spark Wars server (the same relay as Holy Huddle: huddle/server), shows the code and
   a QR code, and fills the lobby as phones join. The leader picks a game, the teams, a question pack and a time.

   Talents (the first game; Matthew 25:14–30): everyone answers at their own pace. A right answer opens one of three
   jars: talents, a double, a dud, or (if steals are on) taking from or swapping with another player. The TV shows the
   team totals, the top 10 and what just happened. Most talents when time runs out wins; with teams on, the team
   with the most talents wins.

   The TV runs the whole game. Phones only draw the screens it sends (huddle/phone) and send back taps.
   Messages are in huddle/PROTOCOL.md. */
(() => {
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
  // Question packs come from Trivia Holy Party's levels (js/data.js and friends).
  const PACKS = [
    { key: "mix", name: "Bible Mix", lvls: [2, 3], about: "People, places and big moments" },
    { key: "basics", name: "Bible Basics", lvls: [2], about: "A warm-up for newer kids" },
    { key: "legends", name: "Legends", lvls: [3], about: "Deep cuts" },
    { key: "parables", name: "Jesus' Teaching", lvls: [4], about: "Parables and what they mean" },
    { key: "prophecy", name: "Prophecy", lvls: [5], about: "Promises and how they came true" },
    { key: "scholars", name: "Scholars", lvls: [6], about: "Languages, maps and history" },
    { key: "deep", name: "Holy of Holies", lvls: [7], about: "The hardest questions we have" },
  ];
  const LENGTHS = [3, 5, 7, 10];
  const GAMES = [
    { key: "talents", name: "Talents", icon: "💰", about: "Answer at your own pace. Right answers open jars. Most talents wins.", ready: true },
    { key: "bluff", name: "Bluff the Bible", icon: "🎭", about: "Write fake answers. Find the real one.", ready: false },
    { key: "timeline", name: "Timeline", icon: "🧭", about: "Put the Bible in order.", ready: false },
  ];
  const SAVE = "sparkwars-tv"; // { code, hostKey } in this tab, so a reloaded TV gets its room back
  const PREFS = "sparkwars-prefs";
  const prefs = (() => {
    const d = { teams: 2, pack: "mix", minutes: 7, steals: true, muted: false };
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
  const show = (node) => { stage.replaceChildren(node); node.classList.add("enter"); };
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const nth = (n) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const fmt = (n) => Math.round(n).toLocaleString();
  const face = (p) => ICONS[p && p.avatar] || "⚡";

  // The stage is 1280×720; it scales to fit the screen.
  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener("resize", fit);
  fit();

  /* ---------- Sound: a few short blips, made on the spot (no files) ---------- */
  const Sound = (() => {
    let ctx = null;
    const NOTES = {
      join: [[660, 0.08], [990, 0.12]], start: [[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]], tick: [[880, 0.06]], go: [[1046, 0.35]],
      big: [[784, 0.08], [988, 0.08], [1318, 0.2]], steal: [[440, 0.08], [330, 0.08], [220, 0.16]], swap: [[523, 0.07], [784, 0.07], [523, 0.07], [784, 0.12]],
      double: [[659, 0.08], [880, 0.08], [1174, 0.2]], end: [[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.4]], warn: [[300, 0.15], [300, 0.15]],
    };
    function play(name) {
      if (prefs.muted || !NOTES[name]) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        let t = ctx.currentTime + 0.01;
        for (const [f, d] of NOTES[name]) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "square"; o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
          t += d * 0.9;
        }
      } catch (e) {}
    }
    return { play };
  })();
  const S = (n) => Sound.play(n);

  /* ---------- The room ---------- */
  let ws = null, room = null, players = [], offset = 0, ending = false, retry = 0;
  let phase = "title", game = null, tick = 0, stepToken = 0, lobbyNode = null;
  const sendTo = (to, data) => { try { ws.send(JSON.stringify({ t: "to", to, data })); } catch (e) {} };
  const hostSend = (m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
  const save = (v) => { try { v ? sessionStorage.setItem(SAVE, JSON.stringify(v)) : sessionStorage.removeItem(SAVE); } catch (e) {} };
  const byId = (id) => players.find((p) => p.id === id);
  const cast = () => players.filter((p) => !p.audience);
  const step = () => { clearInterval(tick); return ++stepToken; };
  const live = (token) => token === stepToken;
  const wait = (ms, token) => new Promise((r) => setTimeout(() => r(live(token)), ms));

  function titleScreen(note) {
    phase = "title";
    show(el("section", { class: "title" },
      el("div", { class: "logo" }, el("span", { class: "spark", "aria-hidden": "true" }, "⚡"), el("h1", {}, "Spark Wars")),
      el("p", { class: "tag" }, "The game for the whole youth group. Up to 30 players, one phone each."),
      note ? el("p", { class: "warn" }, note) : null,
      el("div", { class: "row" },
        el("button", { class: "btn go", onclick: openRoom }, "▶ Open a room"),
        el("button", { class: "btn ghost", onclick: () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) {} } }, "⛶ Full screen")),
      el("p", { class: "fine" }, `Players join on their phones at ${JOIN_TEXT}`)));
  }

  async function openRoom() {
    S("join");
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
    players = []; game = null; ending = false;
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
      if (m.now) offset = m.now - Date.now();
      retry = 0;
      setStatus("");
      const had = players.length;
      players = m.room.players;
      room.vip = m.room.vip;
      room.locked = m.room.locked;
      const ev = m.event || {}, p = byId(ev.id);
      if (ev.kind === "join" && p) {
        if (phase === "lobby") S("join");
        if (game && !p.audience && !game.ps[p.id] && (phase === "intro" || phase === "play")) addPlayer(p.id, true);
        resendScreen(p.id);
      }
      if (ev.kind === "back" && p) resendScreen(p.id);
      if (ev.kind === "host-connected" && had) players.forEach((x) => x.connected && resendScreen(x.id));
      refresh();
      return;
    }
    if (m.t === "input") return onInput(m);
    if (m.t === "replaced") { ending = true; save(null); titleScreen("This room was opened on another screen."); }
  }

  function onInput(m) {
    const d = m.data || {}, isVip = m.id === room.vip;
    if (d.type === "start" && isVip && phase === "lobby") return startGame();
    if (d.type === "vip" && isVip) {
      if (d.action === "skip" && phase === "intro") return countIn();
      if (d.action === "again" && phase === "results") return startGame(true);
      if (d.action === "lobby" && phase === "results") return backToLobby();
      return;
    }
    if (d.type === "pick" && game && phase === "play") onPick(m.id, d);
  }

  /* ---------- What each phone should show (also resent when a phone rejoins) ---------- */
  function screenFor(id) {
    const p = byId(id);
    if (!game || phase === "lobby" || phase === "title") return { screen: "lobby" };
    if (!p || p.audience) return { screen: "wait", title: "You're in the audience", text: "The game is full (30 players). Watch the big screen!" };
    const s = game.ps[id];
    if (phase === "intro") return { screen: "wait", title: "Talents", text: "Answer at your own pace. Right answers open jars. Most talents wins!", badge: badge(id), vip: { label: "Skip the rules", action: "skip" } };
    if (phase === "countin") return { screen: "wait", title: "Get ready...", text: "Questions are coming to your phone!", badge: badge(id) };
    if (phase === "play") return (s && s.screen) || { screen: "wait", title: "Get ready...", badge: badge(id) };
    if (phase === "results") return finalFor(id);
    return { screen: "wait", title: "Look at the big screen!" };
  }
  const resendScreen = (id) => sendTo([id], screenFor(id));
  const sendAll = () => players.forEach((p) => p.connected && resendScreen(p.id));

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
    const url = `${BASE}/?room=${room.code}`;
    lobbyNode = el("section", { class: "lobby" },
      el("aside", { class: "join" },
        el("div", { class: "logo small" }, el("span", { class: "spark", "aria-hidden": "true" }, "⚡"), el("h1", {}, "Spark Wars")),
        el("p", { class: "label" }, "Join on your phone"),
        el("div", { class: "qr" }, qrSvg(url)),
        el("p", { class: "url" }, JOIN_TEXT),
        el("div", { class: "code", "aria-label": "Room code" }, ...room.code.split("").map((c) => el("span", {}, c))),
        el("p", { class: "status" })),
      el("div", { class: "right" },
        el("div", { class: "who" }, el("h2", {}, "Players"), el("span", { class: "count" }), el("span", { class: "aud" })),
        el("div", { class: "grid" }),
        el("div", { class: "settings" })));
    show(lobbyNode);
    refresh();
    drawSettings();
  }

  function refresh() {
    if (phase === "lobby" && lobbyNode) {
      const list = cast(), aud = players.filter((p) => p.audience).length;
      lobbyNode.querySelector(".count").textContent = `${list.length} / ${MAX_PLAYERS}`;
      lobbyNode.querySelector(".aud").textContent = aud ? `+ ${aud} watching` : "";
      const grid = lobbyNode.querySelector(".grid");
      grid.replaceChildren(...Array.from({ length: MAX_PLAYERS }, (_, i) => {
        const p = list[i];
        if (!p) return el("div", { class: "tile empty" }, el("span", { class: "face" }, "·"));
        const t = el("button", { class: "tile" + (p.connected ? "" : " away") + (p.id === room.vip ? " vip" : ""), title: "Click twice to remove", onclick: () => {
          if (t.classList.contains("confirm")) { hostSend({ t: "kick", id: p.id }); return; }
          grid.querySelectorAll(".confirm").forEach((x) => x.classList.remove("confirm"));
          t.classList.add("confirm");
          setTimeout(() => t.classList.remove("confirm"), 3000);
        } }, el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name), p.id === room.vip ? el("span", { class: "crown", title: "VIP: can start from their phone" }, "👑") : null);
        return t;
      }));
      const lock = lobbyNode.querySelector(".lock");
      if (lock) lock.textContent = room.locked ? "🔓 Unlock" : "🔒 Lock";
      const go = lobbyNode.querySelector(".start");
      if (go) go.disabled = !list.length;
    }
    if (phase === "play") drawBoard();
  }

  function chips(label, options, current, onPick) {
    return el("div", { class: "setting" }, el("span", { class: "label" }, label),
      el("div", { class: "chips" }, ...options.map(([v, text]) => el("button", { class: "chip" + (v === current ? " on" : ""), "aria-pressed": v === current ? "true" : "false", onclick: () => { onPick(v); savePrefs(); drawSettings(); } }, text))));
  }
  function drawSettings() {
    if (!lobbyNode) return;
    const pack = PACKS.find((p) => p.key === prefs.pack) || PACKS[0];
    const box = lobbyNode.querySelector(".settings");
    box.replaceChildren(
      el("div", { class: "games" }, ...GAMES.map((g) => el("div", { class: "game" + (g.ready ? " on" : " soon") },
        el("span", { class: "icon" }, g.icon), el("strong", {}, g.name), el("small", {}, g.ready ? g.about : "Coming soon")))),
      el("div", { class: "opts" },
        chips("Teams", [[0, "Off"], [2, "2"], [3, "3"], [4, "4"]], prefs.teams, (v) => { prefs.teams = v; }),
        chips("Time", LENGTHS.map((m) => [m, `${m} min`]), prefs.minutes, (v) => { prefs.minutes = v; }),
        chips("Steals", [[true, "On"], [false, "Off"]], prefs.steals, (v) => { prefs.steals = v; }),
        el("div", { class: "setting pack" }, el("span", { class: "label" }, "Questions"),
          el("div", { class: "chips" },
            el("button", { class: "chip", "aria-label": "Previous pack", onclick: () => { prefs.pack = PACKS[(PACKS.indexOf(pack) + PACKS.length - 1) % PACKS.length].key; savePrefs(); drawSettings(); } }, "◀"),
            el("span", { class: "packname" }, el("strong", {}, pack.name), el("small", {}, `${pack.about} · ${poolFor(pack).length} questions`)),
            el("button", { class: "chip", "aria-label": "Next pack", onclick: () => { prefs.pack = PACKS[(PACKS.indexOf(pack) + 1) % PACKS.length].key; savePrefs(); drawSettings(); } }, "▶")))),
      el("div", { class: "buttons" },
        el("button", { class: "btn go start", disabled: !cast().length, onclick: () => startGame() }, "▶ Start Talents"),
        el("button", { class: "btn ghost lock", onclick: () => hostSend({ t: "lock", locked: !room.locked }) }, room.locked ? "🔓 Unlock" : "🔒 Lock"),
        el("button", { class: "btn ghost", onclick: () => { prefs.muted = !prefs.muted; savePrefs(); drawSettings(); } }, prefs.muted ? "🔇 Sound off" : "🔊 Sound on"),
        el("button", { class: "btn ghost", onclick: endRoom }, "End")));
  }

  function endRoom() {
    ending = true;
    step();
    if (ws) { hostSend({ t: "end" }); setTimeout(() => { try { ws.close(); } catch (e) {} }, 300); }
    save(null);
    room = null; players = []; game = null; lobbyNode = null;
    titleScreen();
  }

  /* ---------- Talents ---------- */
  function poolFor(pack) {
    const seen = new Set();
    return (window.THP && THP.QUESTIONS || []).filter((q) => pack.lvls.includes(q.lvl) && q.a && q.a.length >= 2 && !seen.has(q.q) && seen.add(q.q));
  }
  const teamOf = (id) => game && game.teamOf[id] ? TEAMS.find((t) => t.key === game.teamOf[id]) : null;
  const badge = (id) => { const t = teamOf(id); return t ? { text: `${t.icon} Team ${t.name}`, color: t.color } : null; };
  /** Everyone still in the room who's playing, best first. */
  function ranking() {
    return cast().filter((p) => game.ps[p.id]).sort((a, b) => game.ps[b.id].talents - game.ps[a.id].talents || game.ps[b.id].correct - game.ps[a.id].correct);
  }
  const placeOf = (id) => ranking().findIndex((p) => p.id === id) + 1;
  function teamTotals() {
    return game.teams.map((t) => ({ ...t, total: cast().filter((p) => game.teamOf[p.id] === t.key && game.ps[p.id]).reduce((n, p) => n + game.ps[p.id].talents, 0),
      size: cast().filter((p) => game.teamOf[p.id] === t.key).length })).sort((a, b) => b.total - a.total);
  }
  function addPlayer(id, late) {
    const order = shuffle(game.pool.map((_, i) => i));
    game.ps[id] = { talents: 0, correct: 0, answered: 0, streak: 0, best: 0, given: 0, step: 0, order, qi: 0, stage: null, q: null, timer: 0, screen: null, news: null };
    if (game.teams.length && !game.teamOf[id]) {
      // Late joiners go to the smallest team.
      const sizes = game.teams.map((t) => ({ t, n: Object.values(game.teamOf).filter((k) => k === t.key).length }));
      game.teamOf[id] = sizes.sort((a, b) => a.n - b.n)[0].t.key;
    }
    if (late && phase === "play") nextQ(id);
  }

  function startGame(again) {
    const list = cast();
    if (!list.length) return;
    const pack = PACKS.find((p) => p.key === prefs.pack) || PACKS[0];
    const nTeams = prefs.teams ? Math.min(prefs.teams, list.length) : 0;
    const keepTeams = again && game && game.teams.length === nTeams ? game.teamOf : null;
    game = { pack, pool: shuffle(poolFor(pack)), ps: {}, teamOf: {}, teams: TEAMS.slice(0, nTeams), feed: [], steals: !!prefs.steals,
      minutes: prefs.minutes, answered: 0, right: 0, over: false, endsAt: 0, doubleAt: 0, double: false };
    if (nTeams) {
      // Same teams for "Play again"; otherwise shuffle everyone into teams of (nearly) equal size.
      if (keepTeams) for (const p of list) if (keepTeams[p.id]) game.teamOf[p.id] = keepTeams[p.id];
      shuffle(list.filter((p) => !game.teamOf[p.id])).forEach((p) => {
        const sizes = game.teams.map((t) => ({ t, n: Object.values(game.teamOf).filter((k) => k === t.key).length }));
        game.teamOf[p.id] = sizes.sort((a, b) => a.n - b.n || Math.random() - 0.5)[0].t.key;
      });
    }
    list.forEach((p) => addPlayer(p.id));
    lobbyNode = null;
    intro();
  }

  async function intro() {
    const token = step();
    phase = "intro";
    S("start");
    const jars = [["💰", "+10 to +100", "Talents!"], ["✨", "×2", "\"Well done!\""], ["🕳️", "Buried", "Nothing this time"], ["🦋", "Moths & rust", "Lose 25%"],
      ["🎁", "Cheerful giver", "Give 20, get 40"]].concat(game.steals ? [["🧾", "Tax collector", "Take 25% from someone"], ["🔄", "Swap", "Trade talents with someone"]] : []);
    show(el("section", { class: "intro" },
      el("div", { class: "head" }, el("span", { class: "icon" }, "💰"), el("div", {}, el("h1", {}, "Talents"), el("p", {}, "Matthew 25:14–30 · " + game.pack.name + " · " + game.minutes + " minutes"))),
      el("ol", { class: "steps" },
        el("li", {}, el("b", {}, "1"), el("span", {}, "Answer questions on your phone, ", el("em", {}, "at your own pace"))),
        el("li", {}, el("b", {}, "2"), el("span", {}, "Get one right? ", el("em", {}, "Pick 1 of 3 jars"))),
        el("li", {}, el("b", {}, "3"), el("span", {}, game.teams.length ? "Most talents wins it for your team" : "Most talents when time runs out wins"))),
      el("div", { class: "jars" }, ...jars.map(([i, a, b]) => el("div", { class: "jar" }, el("span", {}, i), el("strong", {}, a), el("small", {}, b)))),
      game.teams.length ? el("div", { class: "teams" }, ...game.teams.map((t) => el("div", { class: "team", style: `--team:${t.color}` },
        el("h3", {}, `${t.icon} ${t.name}`),
        el("p", {}, cast().filter((p) => game.teamOf[p.id] === t.key).map((p) => p.name).join(" · "))))) : null,
      el("p", { class: "soon" }, "The last minute is ⚡ Double Time: every jar pays double!"),
      el("div", { class: "rulebar" }, el("i"), el("span", {}, "Starting soon · the VIP can skip on their phone"))));
    sendAll();
    if (!(await wait(16000, token))) return;
    countIn();
  }

  async function countIn() {
    const token = step();
    phase = "countin";
    sendAll();
    const big = el("div", { class: "count" }, "3");
    show(el("section", { class: "countin" }, el("p", {}, "Phones up!"), big));
    for (const n of ["3", "2", "1"]) { big.textContent = n; big.classList.remove("pop"); void big.offsetWidth; big.classList.add("pop"); S("tick"); if (!(await wait(900, token))) return; }
    play();
  }

  function play() {
    const token = step();
    phase = "play";
    S("go");
    game.endsAt = Date.now() + game.minutes * 60e3;
    game.doubleAt = game.endsAt - 60e3;
    show(el("section", { class: "play" },
      el("header", {}, el("div", { class: "name" }, "💰 Talents"), el("div", { class: "timer" }, clock(game.endsAt - Date.now())),
        el("div", { class: "right" }, el("span", { class: "pack" }, game.pack.name), el("button", { class: "btn ghost small", onclick: () => finish() }, "End now"))),
      el("div", { class: "double", hidden: true }, "⚡ DOUBLE TIME! Every jar pays double ⚡"),
      game.teams.length ? el("div", { class: "bars" }) : null,
      el("div", { class: "main" }, el("ol", { class: "board" }), el("div", { class: "side" }, el("h3", {}, "Live"), el("ul", { class: "feed" }), el("p", { class: "stats" })))));
    for (const id of Object.keys(game.ps)) if (byId(id) && !byId(id).audience) nextQ(id);
    drawBoard();
    let lastSec = -1;
    tick = setInterval(() => {
      if (!live(token)) return clearInterval(tick);
      const left = game.endsAt - Date.now();
      const t = stage.querySelector(".play .timer");
      if (t) { t.textContent = clock(left); t.classList.toggle("low", left < 10e3); }
      const sec = Math.ceil(left / 1000);
      if (sec !== lastSec && sec <= 5 && sec > 0) S("tick");
      lastSec = sec;
      if (!game.double && Date.now() >= game.doubleAt) {
        game.double = true;
        S("warn");
        stage.querySelector(".play .double").hidden = false;
        stage.querySelector(".play").classList.add("doubled");
        news("⚡ Double Time! Every jar pays double!");
      }
      if (left <= 0) finish();
    }, 200);
  }

  /** One phone: the next question. Each player gets the pack in their own shuffled order. */
  function nextQ(id) {
    const s = game.ps[id];
    if (!s || game.over) return;
    if (s.qi >= s.order.length) { s.order = shuffle(s.order); s.qi = 0; }
    const Q = game.pool[s.order[s.qi++]];
    const opts = shuffle(Q.a.slice(0, 4));
    s.q = { Q, opts, right: opts.indexOf(Q.a[0]) };
    s.stage = "q";
    send(id, { screen: "choices", prompt: Q.q, options: opts, hint: "Tap your answer.", locked: "Checking..." });
  }
  /** Sends a phone its screen, with its talents, place and team on top. */
  function send(id, screen) {
    const s = game.ps[id];
    s.step++;
    const place = placeOf(id);
    const note = s.news; s.news = null;
    s.screen = Object.assign({ round: s.step, badge: badge(id), header: `💰 ${fmt(s.talents)} talents${place && s.talents ? ` · ${nth(place)} place` : ""}${game.double ? " · ⚡×2" : ""}`, note }, screen);
    sendTo([id], s.screen);
  }
  /** Do something for one player a little later, unless the game has moved on. */
  function later(id, ms, fn) {
    const s = game.ps[id], g = game;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => { if (game === g && !g.over && phase === "play") fn(); }, ms);
  }

  function onPick(id, d) {
    const s = game.ps[id];
    if (!s || game.over || d.round !== s.step) return;
    const i = d.pick | 0;
    if (s.stage === "q") {
      s.stage = null; s.answered++; game.answered++;
      if (i === s.q.right) {
        s.correct++; s.streak++; s.best = Math.max(s.best, s.streak); game.right++;
        s.stage = "jar";
        send(id, { screen: "choices", look: "jars", prompt: s.streak >= 3 ? `🔥 ${s.streak} in a row! Pick a jar.` : "Correct! Pick a jar.", options: ["Jar 1", "Jar 2", "Jar 3"], keys: ["🏺"], hint: "What's inside?", locked: "Opening..." });
      } else {
        s.streak = 0;
        send(id, { screen: "result", good: false, title: "Not quite", text: `The answer: ${s.q.Q.a[0]}`, after: s.q.Q.ref ? `(${s.q.Q.ref})` : "" });
        later(id, 2600, () => nextQ(id));
      }
      refresh();
      return;
    }
    if (s.stage === "jar") { s.stage = null; openJar(id); refresh(); return; }
    if (s.stage === "target") {
      const t = s.targets[i];
      s.stage = null;
      if (t) doTarget(id, t, s.targetKind);
      refresh();
    }
  }

  /* The jars. Weights are out of about 100; steals only when they're on, and only if there's someone to take from. */
  const JARS = [
    { key: "10", w: 17, gain: 10 }, { key: "20", w: 15, gain: 20 }, { key: "30", w: 12, gain: 30 }, { key: "50", w: 8, gain: 50 }, { key: "100", w: 3, gain: 100 },
    { key: "double", w: 7 }, { key: "buried", w: 6 }, { key: "moths", w: 6 }, { key: "giver", w: 5 }, { key: "tax", w: 7, steal: true }, { key: "swap", w: 3, steal: true },
  ];
  /** Who you could take from or swap with: the top players not on your team. */
  function targetsFor(id, kind) {
    const mine = game.ps[id], team = game.teamOf[id];
    return ranking().filter((p) => p.id !== id && (!team || game.teamOf[p.id] !== team) && game.ps[p.id].talents > (kind === "swap" ? mine.talents : 0)).slice(0, 4);
  }
  function lowest(id) {
    const team = game.teamOf[id];
    const r = ranking().filter((p) => p.id !== id);
    return r.filter((p) => team && game.teamOf[p.id] === team).at(-1) || r.at(-1) || null; // a giver helps their own team first
  }
  function rollJar(id) {
    const s = game.ps[id];
    const ok = JARS.filter((j) => (!j.steal || game.steals)
      && (j.key !== "tax" || targetsFor(id, "tax").length) && (j.key !== "swap" || targetsFor(id, "swap").length)
      && (j.key !== "moths" || s.talents >= 20) && (j.key !== "giver" || (s.talents >= 20 && lowest(id))));
    let r = Math.random() * ok.reduce((n, j) => n + j.w, 0);
    return ok.find((j) => (r -= j.w) < 0) || ok[0];
  }
  function openJar(id) {
    const s = game.ps[id], me = byId(id) || { name: "Someone" }, j = rollJar(id), x2 = game.double ? 2 : 1;
    const done = (screen, ms) => { send(id, Object.assign({ screen: "result", after: "" }, screen)); later(id, ms || 1500, () => nextQ(id)); };
    if (j.gain) {
      const n = j.gain * x2;
      s.talents += n;
      if (n >= 100) { news(`💰 ${me.name} found a jar of ${n}!`); S("big"); }
      return done({ good: true, title: n >= 100 ? "Jackpot!" : "Talents!", points: n });
    }
    if (j.key === "double") {
      const n = Math.max(20, s.talents) * x2;
      s.talents += n;
      news(`✨ ${me.name} doubled up to ${fmt(s.talents)}!`); S("double");
      return done({ good: true, title: game.double ? "Well done! ×4" : "Well done! ×2", points: n, text: "\"Well done, good and faithful servant!\" (Matthew 25:21)" }, 2200);
    }
    if (j.key === "buried") return done({ good: false, title: "Buried", points: 0, text: "Like the servant who hid his bag of gold. Nothing this time. (Matthew 25:25)" }, 2200);
    if (j.key === "moths") {
      const n = Math.round(s.talents * 0.25);
      s.talents -= n;
      return done({ good: false, title: "Moths & rust!", points: -n, text: "Treasure on earth doesn't last. (Matthew 6:19)" }, 2200);
    }
    if (j.key === "giver") {
      const to = lowest(id), gain = 40 * x2;
      game.ps[to.id].talents += 20; s.talents += gain - 20; s.given += 20;
      game.ps[to.id].news = `🎁 ${me.name} gave you 20!`;
      news(`🎁 ${me.name} gave 20 to ${to.name}!`);
      return done({ good: true, title: "Cheerful giver!", points: gain - 20, text: `You gave 20 to ${to.name} and got ${gain} back. (2 Corinthians 9:7)` }, 2400);
    }
    // Tax collector or swap: pick who.
    const targets = targetsFor(id, j.key);
    s.stage = "target"; s.targetKind = j.key; s.targets = targets.map((p) => p.id);
    send(id, { screen: "choices", look: "targets", prompt: j.key === "tax" ? "🧾 Tax collector! Take 25% from:" : "🔄 Swap! Trade all your talents with:",
      options: targets.map((p) => `${face(p)} ${p.name} · ${fmt(game.ps[p.id].talents)}`), keys: [j.key === "tax" ? "🧾" : "🔄"], hint: "Quick! Pick one.", locked: "Done!" });
    later(id, 8000, () => { if (s.stage === "target") { s.stage = null; doTarget(id, s.targets[0], s.targetKind); refresh(); } });
  }
  function doTarget(id, tid, kind) {
    const s = game.ps[id], t = game.ps[tid], me = byId(id) || { name: "Someone" }, them = byId(tid) || { name: "someone" };
    if (!t) return nextQ(id);
    if (kind === "tax") {
      const n = Math.max(1, Math.round(t.talents * 0.25));
      t.talents -= n; s.talents += n;
      t.news = `🧾 ${me.name} took ${n} from you!`;
      news(`🧾 ${me.name} took ${n} from ${them.name}!`); S("steal");
      send(id, { screen: "result", good: true, title: `Took ${fmt(n)}!`, points: n, text: `from ${them.name}`, after: "" });
    } else {
      const mine = s.talents;
      s.talents = t.talents; t.talents = mine;
      t.news = `🔄 ${me.name} swapped with you!`;
      news(`🔄 ${me.name} swapped with ${them.name}!`); S("swap");
      send(id, { screen: "result", good: true, title: "Swapped!", text: `You have ${fmt(s.talents)} now. ${them.name} has ${fmt(t.talents)}.`, after: "" });
    }
    later(id, 2000, () => nextQ(id));
  }

  /** A line in the live feed on the TV. */
  function news(text) {
    if (!game) return;
    game.feed.unshift({ text, at: Date.now() });
    game.feed.length = Math.min(game.feed.length, 8);
    const feed = stage.querySelector(".play .feed");
    if (feed) feed.replaceChildren(...game.feed.map((f, i) => el("li", { class: i ? "" : "new" }, f.text)));
  }

  let boardAt = 0, boardTimer = 0;
  /** The live board: team bars and the top 10 (at most a few times a second). */
  function drawBoard() {
    const delay = 300 - (Date.now() - boardAt);
    if (delay > 0) { clearTimeout(boardTimer); boardTimer = setTimeout(drawBoard, delay); return; }
    boardAt = Date.now();
    const node = stage.querySelector(".play");
    if (!node || !game) return;
    const bars = node.querySelector(".bars");
    if (bars) {
      const totals = teamTotals(), sum = Math.max(1, totals.reduce((n, t) => n + t.total, 0));
      bars.replaceChildren(...game.teams.map((t) => {
        const tt = totals.find((x) => x.key === t.key);
        return el("div", { class: "bar", style: `--team:${t.color};--w:${Math.max(4, (tt.total / sum) * 100)}%` },
          el("span", { class: "label" }, `${t.icon} ${t.name}`), el("span", { class: "fill" }), el("span", { class: "total" }, fmt(tt.total)));
      }));
    }
    const r = ranking();
    node.querySelector(".board").replaceChildren(...r.slice(0, 10).map((p, i) => {
      const s = game.ps[p.id], t = teamOf(p.id);
      return el("li", { class: (i < 3 ? "top" : "") + (p.connected ? "" : " away"), style: t ? `--team:${t.color}` : null },
        el("span", { class: "rank" }, i + 1), el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name),
        s.streak >= 3 ? el("span", { class: "streak" }, `🔥${s.streak}`) : null, el("span", { class: "talents" }, fmt(s.talents)));
    }));
    const stats = node.querySelector(".stats");
    if (stats) stats.textContent = `${r.length} playing · ${fmt(game.answered)} answered · ${game.answered ? Math.round((game.right / game.answered) * 100) : 0}% right`;
  }

  /* ---------- The end ---------- */
  function finalFor(id) {
    const place = placeOf(id), s = game.ps[id], totals = game.final && game.final.totals;
    const t = teamOf(id), won = totals && totals[0] && t && totals[0].key === t.key;
    return { screen: "final", place: place || null, of: ranking().length, points: s ? s.talents : null, unit: "talents", badge: badge(id),
      text: totals && totals.length ? (won ? `Team ${t.name} wins! 🏆` : `Team ${totals[0].name} won this one.`) : s ? `${s.correct} right answers` : "",
      vip: [{ label: "Play again", action: "again" }, { label: "Back to the lobby", action: "lobby" }] };
  }

  async function finish() {
    if (!game || game.over) return;
    const token = step();
    game.over = true;
    for (const s of Object.values(game.ps)) clearTimeout(s.timer);
    phase = "timeup";
    S("end");
    show(el("section", { class: "countin" }, el("div", { class: "count pop" }, "TIME!")));
    sendTo("players", { screen: "wait", title: "Time's up!", text: "Look at the big screen!" });
    if (!(await wait(2200, token))) return;
    const r = ranking();
    const best = (key) => r.slice().sort((a, b) => game.ps[b.id][key] - game.ps[a.id][key])[0];
    const mostRight = best("correct"), streak = best("best"), giver = best("given");
    game.final = { totals: game.teams.length ? teamTotals() : null };
    phase = "results";
    const totals = game.final.totals;
    show(el("section", { class: "results" },
      totals ? el("div", { class: "winner", style: `--team:${totals[0].color}` }, el("h1", {}, `${totals[0].icon} Team ${totals[0].name} wins!`),
        el("div", { class: "totals" }, ...totals.map((t) => el("span", { style: `--team:${t.color}` }, `${t.icon} ${t.name} ${fmt(t.total)}`)))) : el("div", { class: "winner" }, el("h1", {}, r[0] ? `${face(r[0])} ${r[0].name} wins!` : "Time!")),
      el("div", { class: "podium" }, ...[1, 0, 2].map((i) => r[i] ? el("div", { class: "step p" + (i + 1), style: teamOf(r[i].id) ? `--team:${teamOf(r[i].id).color}` : null },
        el("span", { class: "face" }, face(r[i])), el("span", { class: "name" }, r[i].name), el("span", { class: "talents" }, `💰 ${fmt(game.ps[r[i].id].talents)}`),
        el("span", { class: "block" }, ["🥇", "🥈", "🥉"][i])) : el("div", { class: "step empty" }))),
      el("div", { class: "awards" },
        mostRight ? el("div", {}, el("small", {}, "Most right answers"), el("strong", {}, `${mostRight.name} · ${game.ps[mostRight.id].correct}`)) : null,
        streak && game.ps[streak.id].best >= 2 ? el("div", {}, el("small", {}, "Longest streak"), el("strong", {}, `${streak.name} · ${game.ps[streak.id].best} in a row`)) : null,
        giver && game.ps[giver.id].given ? el("div", {}, el("small", {}, "Most generous"), el("strong", {}, `${giver.name} · gave ${game.ps[giver.id].given}`)) : null,
        el("div", {}, el("small", {}, "The whole group"), el("strong", {}, `${fmt(game.right)} right of ${fmt(game.answered)}`))),
      el("div", { class: "buttons" }, el("button", { class: "btn go", onclick: () => startGame(true) }, "↻ Play again"), el("button", { class: "btn ghost", onclick: backToLobby }, "Back to the lobby"))));
    sendAll();
  }

  function backToLobby() {
    step();
    if (game) for (const s of Object.values(game.ps)) clearTimeout(s.timer);
    game = null;
    lobby();
    sendAll();
  }

  // For tests and recordings.
  window.SPARK = { get phase() { return phase; }, get game() { return game; }, base: BASE };
  titleScreen();
})();
