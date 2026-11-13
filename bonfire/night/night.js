/* Lights Out on the host's phone: one night of wolves at camp, for 3 to 12 players. A Bonfire mode with no TV: the
   host opens bonfire.thecrossroads.workers.dev/night, everyone scans the QR code on the host's phone, and the host
   deals. The host can play too (their own card is on this phone, face down like everyone's).

   A round: the deal (everyone peeks at their card), the night (everyone taps at once: a card's job, or a hunch, so
   nobody can tell who's doing what; the jobs are carried out in order afterwards, rules.js), the morning (what you
   learned is on the back of your card, and the camp gets a few minutes to talk), the vote, and the reveal (who's
   out, everyone's real card, and what really happened). Nobody is knocked out: everyone plays every round.

   This page runs the game; the phones only draw the screens it sends (huddle/phone, with card.js). The voice is the
   phone's own speech, so it can say names. Messages are in huddle/PROTOCOL.md. */
window.LIGHTS_OUT = (() => {
  "use strict";
  const R = window.LIGHTS_OUT_RULES;
  const HOME = "https://bonfire.thecrossroads.workers.dev";
  const BASE = /bonfire|localhost|127\.0\.0\.1/.test(location.host) && location.protocol.startsWith("http") ? location.origin : HOME;
  const MAX = 12, MIN = 3, HOST = "@host";
  const ICONS = {
    tent: "⛺", moon: "🌙", star: "⭐", pine: "🌲", mountain: "🏔️", canoe: "🛶", lantern: "🏮", bear: "🐻", raccoon: "🦝", deer: "🦌", hedgehog: "🦔",
    butterfly: "🦋", mushroom: "🍄", coffee: "☕", dango: "🍡", compass: "🧭", map: "🗺️", sparkles: "✨", snail: "🐌", beaver: "🦫", fox: "🦊", owl: "🦉", guitar: "🎸",
  };
  const PREFS = "lightsout-prefs", SAVE = "lightsout-host";
  const prefs = (() => {
    const d = { play: true, name: "", talk: 300, easy: false, voice: true, sound: true };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) { return d; }
  })();
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {} };

  /* ---------- Small helpers ---------- */
  const app = document.getElementById("app");
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
  /** Put a screen up. The same screen drawn again (someone joined, a count changed) doesn't rise in again. */
  let shownKey = "";
  const show = (...nodes) => {
    const key = phase + ":" + G.round, same = key === shownKey;
    shownKey = key;
    const box = el("div", { class: "screen" + (same ? " still" : "") }, ...nodes);
    const y = scrollY;
    app.replaceChildren(box);
    scrollTo(0, same ? y : 0);
    return box;
  };
  const seenFaces = new Set();
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

  /* ---------- Sound: the campfire guitar (bonfire/music.js), crickets, a howl ---------- */
  let actx = null;
  const ctx = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return actx; };
  const music = BONFIRE_MUSIC(ctx);
  const sounds = (() => {
    let crick = 0, out = null;
    const dest = () => { const c = ctx(); if (!c) return null; if (!out) { out = c.createGain(); out.gain.value = 0.5; out.connect(c.destination); } return out; };
    /** One cricket: a few fast chirps of a high tone. */
    function chirp(when, pan) {
      const c = ctx(), d = dest();
      if (!c || !d) return;
      const o = c.createOscillator(), g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null;
      o.frequency.value = 4200 + Math.random() * 600;
      g.gain.value = 0;
      for (let i = 0; i < 3; i++) { const t = when + i * 0.06; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.012); g.gain.linearRampToValueAtTime(0, t + 0.04); }
      o.connect(g);
      if (p) { p.pan.value = pan; g.connect(p).connect(d); } else g.connect(d);
      o.start(when); o.stop(when + 0.25);
    }
    return {
      crickets(on) {
        clearInterval(crick);
        if (!on || !prefs.sound) return;
        crick = setInterval(() => { const c = ctx(); if (c && c.state === "running") { chirp(c.currentTime + Math.random() * 0.3, -0.7); if (Math.random() < 0.6) chirp(c.currentTime + 0.4 + Math.random() * 0.4, 0.6); } }, 900);
      },
      /** A distant wolf: a sliding, wavering tone, with an echo. */
      howl() {
        const c = ctx(), d = dest();
        if (!c || !d || !prefs.sound) return;
        const t = c.currentTime + 0.05;
        for (const [delay, vol] of [[0, 0.16], [0.35, 0.05]]) {
          const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(330, t + delay); o.frequency.exponentialRampToValueAtTime(620, t + delay + 0.7); o.frequency.setValueAtTime(620, t + delay + 1.6); o.frequency.exponentialRampToValueAtTime(380, t + delay + 2.6);
          lfo.frequency.value = 5.5; lg.gain.value = 9; lfo.connect(lg).connect(o.frequency);
          g.gain.setValueAtTime(0.0001, t + delay); g.gain.exponentialRampToValueAtTime(vol, t + delay + 0.5); g.gain.setValueAtTime(vol, t + delay + 1.8); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2.8);
          o.connect(g).connect(d);
          o.start(t + delay); lfo.start(t + delay); o.stop(t + delay + 2.9); lfo.stop(t + delay + 2.9);
        }
      },
      /** Morning birds. */
      birds() {
        const c = ctx(), d = dest();
        if (!c || !d || !prefs.sound) return;
        for (let i = 0; i < 6; i++) {
          const t = c.currentTime + 0.1 + i * 0.22 + Math.random() * 0.1, o = c.createOscillator(), g = c.createGain();
          o.frequency.setValueAtTime(2400 + Math.random() * 900, t); o.frequency.exponentialRampToValueAtTime(3600 + Math.random() * 800, t + 0.08);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.linearRampToValueAtTime(0, t + 0.1);
          o.connect(g).connect(d); o.start(t); o.stop(t + 0.12);
        }
      },
    };
  })();
  const sfx = (name) => { if (prefs.sound) music.sfx(name); };
  function moodFor(phase) {
    if (!prefs.sound) { music.stop(); sounds.crickets(false); return; }
    music.start();
    music.mood({ night: "night", deal: "night", vote: "night", day: "day", reveal: "report" }[phase] || "title");
    sounds.crickets(phase === "night" || phase === "deal");
  }
  /* iPhones only start sound from a tap; let it play with the ringer switch on silent, and keep the screen on. */
  let voiceWoken = false, wakeLock = null;
  const wakeSound = () => {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    try { const c = ctx(); if (c && c.state !== "running") c.resume(); } catch (e) {}
    if (!voiceWoken && "speechSynthesis" in window) { voiceWoken = true; try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch (e) {} }
    keepAwake();
  };
  addEventListener("pointerdown", wakeSound, true);
  async function keepAwake() {
    try { if (!wakeLock && navigator.wakeLock && document.visibilityState === "visible") { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { keepAwake(); if (room && (!ws || ws.readyState > 1)) connect(); } });

  /* ---------- The voice: the phone's own speech, a sentence at a time, with captions ---------- */
  const voice = (() => {
    let v = null, gen = 0, chain = Promise.resolve();
    const LIKE = ["Ava Online (Natural)", "Andrew Online (Natural)", "Emma Online (Natural)", "Jenny Online (Natural)", "Guy Online (Natural)",
      "Ava (Premium)", "Zoe (Premium)", "Evan (Premium)", "Ava (Enhanced)", "Samantha (Enhanced)", "Google US English", "Samantha", "Alex", "Daniel"];
    const pick = () => {
      try {
        const all = speechSynthesis.getVoices().filter((x) => /^en(-|_|$)/i.test(x.lang));
        v = LIKE.map((n) => all.find((x) => x.name.includes(n))).find(Boolean) || all.find((x) => /en-US/i.test(x.lang)) || all[0] || null;
      } catch (e) {}
    };
    if ("speechSynthesis" in window) { pick(); speechSynthesis.addEventListener("voiceschanged", pick); }
    const cap = document.getElementById("caption");
    const sentences = (t) => (t.match(/[^.!?]+[.!?]*["”]?\s*/g) || [t]).map((x) => x.trim()).filter(Boolean);
    function one(text) {
      text = text.replace(/\p{Extended_Pictographic}\uFE0F?/gu, "").replace(/\s+/g, " ").replace(/\(\s*\)/g, "").trim(); // emoji are for the eyes
      return new Promise((resolve) => {
        const quiet = Math.min(5000, 900 + text.length * 55);
        if (!prefs.voice || !("speechSynthesis" in window)) return setTimeout(resolve, quiet);
        try {
          const u = new SpeechSynthesisUtterance(text);
          if (v) { u.voice = v; u.lang = v.lang; }
          u.rate = v && /natural|premium|enhanced/i.test(v.name) ? 0.94 : 0.86;
          const guard = setTimeout(resolve, 3000 + text.length * 110);
          u.onend = u.onerror = () => { clearTimeout(guard); resolve(); };
          speechSynthesis.speak(u);
        } catch (e) { setTimeout(resolve, quiet); }
      });
    }
    return {
      /** Say a line (sentence by sentence, a breath between). Resolves when it's said. */
      say(text) {
        const mine = gen;
        chain = chain.then(async () => {
          if (mine !== gen) return;
          const parts = sentences(text);
          cap.replaceChildren(...parts.map((p) => el("span", {}, p)));
          cap.hidden = false;
          music.duck(true);
          for (let k = 0; k < parts.length; k++) {
            if (mine !== gen) return;
            [...cap.children].forEach((s, j) => s.classList.toggle("on", j === k));
            await one(parts[k]);
            if (k < parts.length - 1) await new Promise((r) => setTimeout(r, 380));
          }
          if (mine === gen) { if (phase !== "day") music.duck(false); setTimeout(() => { if (mine === gen) cap.hidden = true; }, 1200); }
        });
        return chain;
      },
      quiet() { gen++; chain = Promise.resolve(); try { speechSynthesis.cancel(); } catch (e) {} cap.hidden = true; },
    };
  })();

  /* ---------- The room ---------- */
  let ws = null, room = null, people = [], retry = 0, phase = "title", token = 0;
  const timers = new Set();
  const shown = {}; // the last screen each phone was sent, to send again when it comes back
  // The game: who's in this round, the deal, the night's taps, what happened, the votes, and wins across rounds.
  let G = { round: 0, ids: [], start: null, center: null, actions: {}, ready: {}, night: null, votes: {}, result: null, deadline: 0, wins: {}, rounds: 0, firstDone: false };
  const sendTo = (to, data) => { try { ws.send(JSON.stringify({ t: "to", to, data })); } catch (e) {} };
  const hostSend = (m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  function step() { for (const t of timers) { clearTimeout(t); clearInterval(t); } timers.clear(); return ++token; }
  const wait = (ms, t = token) => new Promise((r) => { const h = setTimeout(() => { timers.delete(h); r(t === token); }, ms); timers.add(h); });
  const every = (ms, fn) => { const h = setInterval(fn, ms); timers.add(h); return h; };
  const save = () => { try { if (room) sessionStorage.setItem(SAVE, JSON.stringify({ code: room.code, hostKey: room.hostKey, G, phase })); } catch (e) {} };
  const loadSaved = () => { try { return JSON.parse(sessionStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };

  /** Everyone at the table: the phones, and the host when they play. */
  const hostPlayer = () => ({ id: HOST, name: (prefs.name || "Host").slice(0, 12), avatar: "moon", connected: true, joinedAt: 0 });
  const everyone = () => [...(prefs.play ? [hostPlayer()] : []), ...people];
  const byId = (id) => everyone().find((p) => p.id === id) || (id === HOST ? hostPlayer() : null);
  // Names and faces are kept at the deal, so someone who leaves mid-round still has one.
  const nameOf = (id) => (G.names && G.names[id]) || (byId(id) || {}).name || "Someone";
  const faceOf = (id) => (G.faces && G.faces[id]) || ICONS[(byId(id) || {}).avatar] || "🌙";
  const names = () => Object.fromEntries(G.ids.map((id) => [id, nameOf(id)]));

  /** Send a screen to a phone (or the host's own card on this page); it's kept for when they come back. */
  function put(id, screen) {
    shown[id] = screen;
    if (id === HOST) return drawMine();
    const p = people.find((x) => x.id === id);
    if (p && p.connected) sendTo([id], screen);
  }
  const roleCard = (r) => { const x = R.ROLES[r]; return { icon: x.icon, name: x.name, team: x.team, teamName: R.TEAM_NAME[x.team], goal: x.goal, night: x.night }; };
  function deckList(n) {
    const d = R.deck(n, prefs.easy), out = [];
    for (const r of d) { const have = out.find((x) => x.key === r); if (have) have.n++; else out.push({ key: r, icon: R.ROLES[r].icon, name: R.ROLES[r].name, team: R.ROLES[r].team, n: 1 }); }
    return out;
  }
  const waitScreen = (title, text) => ({ screen: "secret", stage: "wait", title, text });

  async function makeRoom() {
    const r = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game: "lights-out" }) }).catch(() => null);
    if (!r || !r.ok) return null;
    return r.json();
  }
  function connect() {
    if (!room) return;
    const line = new WebSocket(`${BASE.replace(/^http/, "ws")}/ws/${room.code}?role=host&key=${encodeURIComponent(room.hostKey)}`);
    ws = line;
    line.onopen = () => { retry = 0; setBar(null); };
    line.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onMessage(m); };
    line.onclose = () => {
      if (ws !== line || !room) return;
      setBar("Reconnecting...");
      retry++;
      setTimeout(connect, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
    };
  }
  function setBar(text) { const b = document.getElementById("bar"); b.hidden = !text; b.textContent = text || ""; }
  function onMessage(m) {
    if (m.t === "replaced") { room = null; save(); return titleScreen("This game moved to another phone or tab."); }
    if (m.t === "room") {
      const before = new Set(people.map((p) => p.id));
      people = m.room.players.filter((p) => !p.audience);
      const ev = m.event || {};
      if (ev.kind === "host-connected") for (const p of people) if (p.connected) sendTo([p.id], screenFor(p.id));
      if (ev.kind === "join" && !before.has(ev.id)) {
        put(ev.id, screenFor(ev.id));
        if (phase === "lobby") { sfx("join"); voice.say(pickOne([`Welcome, ${nameOf(ev.id)}.`, `${nameOf(ev.id)} is here.`, `Hey, ${nameOf(ev.id)}.`])); }
      }
      if (ev.kind === "back") sendTo([ev.id], screenFor(ev.id));
      fitLock();
      if (phase === "lobby") drawLobby();
      else if (phase !== "title") drawPhase();
      return;
    }
    if (m.t === "input") return input(m.id, m.data || {});
  }
  /** A full table turns new phones away; a free seat lets them in again. */
  let lockedNow = false;
  function fitLock() {
    const full = everyone().length >= MAX;
    if (full !== lockedNow) { lockedNow = full; hostSend({ t: "lock", locked: full }); }
  }
  function screenFor(id) {
    if (shown[id] && (G.ids.includes(id) || phase === "lobby")) return shown[id];
    if (phase === "lobby" || phase === "title") return lobbyWait();
    return waitScreen("A round is going 🌙", "You'll get a card in the next round. Watch, and try to work out who the wolves are!");
  }
  const lobbyWait = () => waitScreen("You're in! 🌙", "Wait for the host to deal the cards. When you get yours, keep it to yourself.");

  /* ---------- Inputs from phones (and from the host's own card) ---------- */
  function input(id, d) {
    if (!G.ids.includes(id) || d.round !== G.round) return;
    if (d.type === "ready" && phase === "deal") {
      G.ready[id] = true;
      shown[id] = { ...shown[id], ready: true };
      save(); drawPhase();
      if (G.ids.every((x) => G.ready[x]) && !G.talking) toNight();
    } else if (d.type === "night" && phase === "night" && !G.actions[id]) {
      G.actions[id] = { players: [].concat(d.players || []).map(String).slice(0, 2), center: [].concat(d.center || []).map(Number).slice(0, 2) };
      shown[id] = { ...shown[id], action: { ...shown[id].action, done: true } };
      save(); drawPhase();
      if (G.ids.every((x) => G.actions[x]) && Date.now() >= G.minNight) toDay();
    } else if (d.type === "vote" && phase === "vote" && !G.votes[id] && G.ids.includes(d.target) && d.target !== id) {
      G.votes[id] = d.target;
      shown[id] = { ...shown[id], action: { ...shown[id].action, done: true, doneText: `✔ You voted for ${nameOf(d.target)}. Wait for everyone...` } };
      save(); drawPhase();
      if (G.ids.every((x) => G.votes[x])) toReveal();
    }
  }
  /** The host's own card goes through the same input as everyone's. */
  const mine = { send: (data) => { setTimeout(() => input(HOST, data), 0); return true; } };

  /* ---------- Title ---------- */
  function titleScreen(note) {
    step(); phase = "title"; voice.quiet(); moodFor("title");
    const name = el("input", { id: "hostname", maxlength: 12, placeholder: "Your name", value: prefs.name, autocomplete: "nickname", "aria-label": "Your name" });
    const play = el("input", { type: "checkbox", id: "play", checked: prefs.play });
    const err = el("p", { class: "err", role: "alert" }, note || "");
    const go = el("button", { class: "big-btn", onclick: async () => {
      prefs.play = play.checked; prefs.name = name.value.trim().slice(0, 12); savePrefs();
      if (prefs.play && !prefs.name) { err.textContent = "Type your name, so everyone knows who's who."; return name.focus(); }
      go.disabled = true; err.textContent = ""; go.textContent = "Lighting the lantern...";
      const made = await makeRoom();
      go.disabled = false; go.textContent = "Start a game";
      if (!made) { err.textContent = "Couldn't start a game. Check your internet and try again."; return; }
      room = made; people = []; G = { ...G, round: 0, ids: [], wins: {}, rounds: 0, firstDone: false };
      for (const k in shown) delete shown[k];
      connect(); save(); lobby();
    } }, "Start a game");
    play.addEventListener("change", () => { name.closest("label").hidden = !play.checked; });
    show(el("section", { class: "title" },
      el("div", { class: "moonrise", "aria-hidden": "true" }, el("i", { class: "moon" }), el("i", { class: "eyes" })),
      el("h1", { class: "logo" }, "Lights Out"),
      el("p", { class: "tag" }, "One night. One vote. Somebody here is a wolf."),
      el("p", { class: "sub" }, "For 3 to 12 people, each on their own phone. Everyone scans the code on this phone to join."),
      el("label", { class: "check" }, play, " I'm playing too"),
      el("label", { class: "field", hidden: !prefs.play }, "Your name", name),
      err, go,
      el("a", { class: "back", href: "/tv" }, "🔥 Bonfire Ice Breaker (for a TV)")));
  }

  /* ---------- Lobby: the QR code, who's in, the cards in play ---------- */
  function lobby() {
    step(); phase = "lobby"; voice.quiet(); moodFor("lobby");
    for (const p of people) put(p.id, lobbyWait());
    if (prefs.play) shown[HOST] = null;
    fitLock(); save(); drawLobby();
    if (!G.rounds) voice.say("Lights Out! Everybody, scan the code on this phone to join.");
  }
  function qrSvg(text) {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text); qr.make();
      const n = qr.getModuleCount(), cells = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) cells.push(`M${x + 2} ${y + 2}h1v1h-1z`);
      const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${cells.join("")}" fill="#0a0f2c"/></svg>`, "image/svg+xml").documentElement;
      svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "QR code to join");
      return svg;
    } catch (e) { return el("div", { class: "noqr" }, "Scan not available"); }
  }
  function drawLobby() {
    if (phase !== "lobby" || !room) return;
    const all = everyone(), n = all.length, url = `${BASE}/?room=${room.code}`;
    const deal = el("button", { class: "big-btn", disabled: n < MIN || n > MAX, onclick: () => startRound() }, n < MIN ? `Need ${MIN - n} more to play` : n > MAX ? `Too many (${MAX} at most)` : `Deal the cards (${n} players)`);
    const opt = (label, value, cur, set) => el("button", { class: "opt", "aria-pressed": String(value === cur), onclick: () => { set(value); savePrefs(); drawLobby(); } }, label);
    setTimeout(() => all.forEach((p) => seenFaces.add(p.id)), 0);
    show(el("section", { class: "lobby" },
      el("div", { class: "joinbox" },
        el("div", { class: "qr" }, qrSvg(url)),
        el("div", { class: "codeline" }, el("small", {}, "Scan to join, or go to"), el("b", {}, BASE.replace(/^https?:\/\//, "")), el("small", {}, "and type"), el("span", { class: "code" }, room.code))),
      el("h2", {}, `Around the campfire: ${n}`, el("small", {}, `${MIN} to ${MAX} players`)),
      el("ul", { class: "people" }, ...all.map((p) => el("li", { class: (p.connected ? "" : "away") + (seenFaces.has(p.id) ? "" : " new") },
        el("span", { class: "face" }, ICONS[p.avatar] || "🌙"), el("span", { class: "nm" }, p.name, p.id === HOST ? el("small", {}, " (you)") : null),
        G.wins[p.id] ? el("span", { class: "wins" }, `🏆 ${G.wins[p.id]}`) : null,
        p.id === HOST ? null : el("button", { class: "x", "aria-label": `Remove ${p.name}`, onclick: () => { if (confirm(`Remove ${p.name} from the game?`)) hostSend({ t: "kick", id: p.id }); } }, "✕")))),
      n >= MIN ? el("div", { class: "lo" }, el("div", { class: "lo-deck" }, el("small", {}, `The cards for ${n} (3 go in the middle)`),
        el("div", {}, ...deckList(n).map((d) => el("span", { class: "lo-chip", "data-team": d.team === "wolf" ? "wolf" : d.team === "self" ? "self" : "camp" }, `${d.icon} ${d.name}${d.n > 1 ? " ×" + d.n : ""}`))))) : null,
      el("div", { class: "settings" },
        el("div", { class: "row" }, el("span", {}, "Talk time"), opt("3 min", 180, prefs.talk, (v) => { prefs.talk = v; }), opt("5 min", 300, prefs.talk, (v) => { prefs.talk = v; }), opt("7 min", 420, prefs.talk, (v) => { prefs.talk = v; })),
        el("div", { class: "row" }, el("span", {}, "Cards"), opt("Full", false, prefs.easy, (v) => { prefs.easy = v; }), opt("Easy", true, prefs.easy, (v) => { prefs.easy = v; })),
        el("div", { class: "row" }, el("span", {}, "Sound"), opt("🗣 Voice", true, prefs.voice, () => { prefs.voice = !prefs.voice; if (!prefs.voice) voice.quiet(); }), opt("🎸 Music", true, prefs.sound, () => { prefs.sound = !prefs.sound; moodFor("lobby"); }))),
      el("button", { class: "ghost", onclick: () => voice.say(HOW) }, "📖 Read the rules out loud"),
      deal,
      el("button", { class: "ghost small", onclick: () => { if (confirm("End this game for everyone?")) endRoom(); } }, "End the game")));
  }
  const HOW = "Here's how Lights Out works. Everyone gets a secret card. Most of you are campers, but some of you are wolves. "
    + "Tonight, some cards have a job: like peeking at a card, or swapping two. "
    + "In the morning, you get a few minutes to talk, and then everyone votes. "
    + "Vote out a wolf, and the camp wins. If no wolf gets voted out, the wolves win. "
    + "One twist: cards can get swapped in the night. You're whatever card you end up with... even if you don't know it!";
  function endRoom() {
    hostSend({ t: "end" });
    room = null; ws = null;
    try { sessionStorage.removeItem(SAVE); } catch (e) {}
    titleScreen();
  }

  /* ---------- A round ---------- */
  function startRound() {
    const ids = everyone().map((p) => p.id);
    if (ids.length < MIN || ids.length > MAX) return;
    step(); voice.quiet();
    const d = R.deal(ids, R.deck(ids.length, prefs.easy));
    G = { ...G, round: G.round + 1, ids, start: d.start, center: d.center, actions: {}, ready: {}, night: null, votes: {}, result: null, deck: deckList(ids.length),
      names: Object.fromEntries(ids.map((id) => [id, (byId(id) || {}).name || "Someone"])), faces: Object.fromEntries(ids.map((id) => [id, ICONS[(byId(id) || {}).avatar] || "🌙"])) };
    for (const id of ids) put(id, dealScreen(id));
    for (const p of people) if (!ids.includes(p.id)) put(p.id, screenFor(p.id));
    phase = "deal"; moodFor("deal"); save(); drawPhase();
    sfx("reveal");
    const t = token;
    // The rules the first time (the night waits for them), then the deal.
    G.talking = true;
    (async () => {
      if (!G.firstDone) { await voice.say(HOW); G.firstDone = true; save(); }
      if (t !== token) return;
      await voice.say("Look at your card. Hold your thumb on it to peek... and keep it to yourself. Tap Got it when you're ready.");
      if (t !== token) return;
      G.talking = false;
      if (G.ids.every((x) => G.ready[x])) toNight();
    })();
    // Nobody waits forever for someone who wandered off.
    wait(150000, t).then((ok) => { if (ok && phase === "deal") toNight(); });
  }
  const dealScreen = (id) => ({ screen: "secret", stage: "deal", round: G.round, title: "Your card 🌙", text: "Hold your thumb on the card to peek. Don't let anyone see!",
    card: roleCard(G.start[id]), deck: G.deck, button: "Got it", ready: !!G.ready[id] });
  /** What a role does tonight, on its phone. Everyone taps something, so nobody can tell who has a job. */
  function nightAction(id) {
    const r = G.start[id], others = G.ids.filter((x) => x !== id).map((x) => ({ id: x, name: nameOf(x), face: faceOf(x) }));
    const wolves = G.ids.filter((x) => G.start[x] === "wolf");
    const hunch = { kind: "hunch", prompt: "Tap who you think a wolf is. It's just a hunch: nobody else sees it.", skip: "No idea yet", players: others };
    if (r === "wolf" && wolves.length === 1) return { kind: "center", prompt: "You're the only wolf! Tap a card in the middle to peek at it.", skip: "Don't peek", players: others };
    if (r === "counselor") return { kind: "counselor", prompt: "Shine your flashlight: tap one player to see their card, or two cards in the middle.", skip: "Don't look", players: others };
    if (r === "sneak") return { kind: "player", prompt: "Tap someone to swap cards with. You'll see your new card in the morning.", skip: "Don't swap", players: others };
    if (r === "prankster") return { kind: "two", prompt: "Tap two players to swap their cards.", skip: "No prank tonight", players: others };
    if (r === "sleepwalker") return { kind: "center", prompt: "Sleepwalk! Tap a card in the middle to swap with yours. You won't see it.", players: others };
    return hunch;
  }
  async function toNight() {
    if (phase !== "deal") return;
    const t = step(); phase = "night"; voice.quiet();
    G.minNight = Date.now() + 20000; G.deadline = Date.now() + 75000;
    for (const id of G.ids) put(id, nightScreen(id));
    moodFor("night"); save(); drawPhase();
    sounds.howl();
    nightClock(t);
    await voice.say("Lights out, camp. Everybody, keep your phone close. If your card has a job tonight, do it now. If it doesn't, tap who you think a wolf is. Nobody will see it.");
  }
  /** The night on a phone. What the wolves, the Raccoon and the Bunkmates know from the start is on the back of their card. */
  function nightScreen(id) {
    const r = G.start[id], many = G.ids.filter((x) => G.start[x] === "wolf").length > 1;
    const lines = r === "raccoon" || r === "bunkmate" || (r === "wolf" && many) ? R.resolve({ start: G.start, center: G.center }, {}, names()).learned[id] : null;
    const action = nightAction(id);
    if (G.actions[id]) action.done = true;
    return { screen: "secret", stage: "night", round: G.round, title: "Lights out 🌙", text: "Hold your card to see it again. Then do your part, below.", card: roleCard(r), lines, linesTitle: "Tonight", action };
  }
  function nightClock(t) {
    every(1000, () => {
      if (t !== token) return;
      drawPhase();
      if (Date.now() >= G.deadline || (Date.now() >= G.minNight && G.ids.every((x) => G.actions[x]))) toDay();
    });
  }
  async function toDay() {
    if (phase !== "night") return;
    const t = step(); phase = "day"; voice.quiet();
    G.night = R.resolve({ start: G.start, center: G.center }, G.actions, names());
    G.deadline = Date.now() + prefs.talk * 1000;
    for (const id of G.ids) put(id, dayScreen(id));
    sounds.birds(); moodFor("day"); music.duck(true); save(); drawPhase();
    await voice.say(`Good morning, camp! What you learned last night is on the back of your card. You've got ${Math.round(prefs.talk / 60)} minutes to find the wolves. Say anything you want: the truth... or not.`);
    dayClock(t);
  }
  const dayScreen = (id) => ({ screen: "secret", stage: "day", round: G.round, title: "Good morning! ☀️", text: "Talk it out: who's a wolf? Hold your card to see what you learned.",
    seconds: Math.max(1, Math.round((G.deadline - Date.now()) / 1000)), card: roleCard(G.start[id]), lines: G.night.learned[id] || [], deck: G.deck });
  function dayClock(t) {
    let said60 = G.deadline - Date.now() < 60000, said10 = G.deadline - Date.now() < 10000;
    every(1000, () => {
      if (t !== token) return;
      const left = G.deadline - Date.now();
      const clock = document.querySelector(".clock b");
      if (clock) clock.textContent = mmss(Math.ceil(left / 1000));
      if (!said60 && left < 60000) { said60 = true; voice.say("One minute left!"); }
      if (!said10 && left < 10000) { said10 = true; voice.say("Ten seconds!"); sfx("tick"); }
      if (left <= 0) toVote();
    });
  }
  function moreTime() {
    G.deadline += 60000; save();
    for (const id of G.ids) put(id, dayScreen(id));
    voice.say("One more minute!");
    step(); dayClock(token); drawPhase();
  }
  async function toVote() {
    if (phase !== "day") return;
    const t = step(); phase = "vote"; voice.quiet();
    G.deadline = Date.now() + 45000;
    for (const id of G.ids) put(id, voteScreen(id));
    moodFor("vote"); music.duck(false); save(); drawPhase();
    sfx("go");
    voteClock(t);
    await voice.say("Time's up! Everybody, vote now. Tap the person you think is a wolf.");
  }
  function voteScreen(id) {
    const action = { kind: "vote", prompt: "Who's a wolf? Tap your vote.", players: G.ids.filter((x) => x !== id).map((x) => ({ id: x, name: nameOf(x), face: faceOf(x) })) };
    if (G.votes[id]) Object.assign(action, { done: true, doneText: `✔ You voted for ${nameOf(G.votes[id])}. Wait for everyone...` });
    return { screen: "secret", stage: "vote", round: G.round, title: "Vote! 🗳️", text: "Hold your card to check it. Then tap who you think is a wolf.",
      seconds: Math.max(1, Math.round((G.deadline - Date.now()) / 1000)), card: roleCard(G.start[id]), lines: G.night.learned[id] || [], action };
  }
  function voteClock(t) { every(1000, () => { if (t !== token) return; drawPhase(); if (Date.now() >= G.deadline) toReveal(); }); }
  async function toReveal() {
    if (phase !== "vote") return;
    const t = step(); phase = "reveal"; voice.quiet();
    const nm = names(), v = R.tally(G.votes, G.ids), o = R.outcome(G.night.final, v.out, nm);
    G.result = { count: v.count, out: v.out, winners: o.winners, headline: o.headline, kind: o.kind };
    for (const id of o.winners) G.wins[id] = (G.wins[id] || 0) + 1;
    G.rounds++;
    for (const id of G.ids) put(id, waitScreen("The votes are in... 🥁", "Listen up!"));
    moodFor("reveal"); save();
    G.revealStep = 0; drawPhase();
    const article = (id) => (/^[AEIOU]/.test(R.ROLES[G.night.final[id]].name) ? "an" : "a");
    await voice.say("The votes are in.");
    if (t !== token) return;
    if (!v.out.length) await voice.say("Nobody got more than one vote... so nobody is out.");
    else if (v.out.length === 1) await voice.say(`With ${v.top} votes, the camp votes out... ${nameOf(v.out[0])}!`);
    else await voice.say(`It's a tie! ${R.list(v.out.map(nameOf))} are all out.`);
    if (t !== token) return;
    G.revealStep = 1; drawPhase();
    for (const id of v.out) {
      sfx("reveal");
      await voice.say(`${nameOf(id)} was... ${article(id)} ${R.ROLES[G.night.final[id]].name}!`);
      if (t !== token) return;
    }
    G.revealStep = 2; drawPhase();
    sfx(o.kind === "wolf" ? "wrong" : "big");
    if (o.kind === "wolf") sounds.howl();
    for (const id of G.ids) put(id, revealScreen(id));
    await voice.say(o.headline);
    if (t !== token) return;
    await voice.say("Here's what really happened last night. " + G.night.story.join(" "));
  }
  /** Everyone's view of the reveal (the host's page shows the same, without "you"). */
  function revealData(id) {
    const nm = names(), res = G.result, team = (r) => R.ROLES[r].team;
    const ppl = G.ids.map((x) => ({ name: nm[x], face: faceOf(x), start: { ...roleCard(G.start[x]) }, end: { ...roleCard(G.night.final[x]) }, votes: res.count[x], out: res.out.includes(x), won: res.winners.includes(x) }))
      .sort((a, b) => b.out - a.out || b.votes - a.votes);
    const hunches = Object.values(G.night.hunch || {}), most = hunches.length ? Object.entries(hunches.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1])[0] : null;
    const story = G.night.story.slice();
    if (most && most[1] >= 2) story.push(`Most of the hunches last night pointed at ${nm[most[0]]} (${most[1]}).`);
    const you = id && G.ids.includes(id) ? {
      won: res.winners.includes(id),
      line: G.start[id] === G.night.final[id] ? `You were ${R.card(G.start[id])} all night.` : `You started as ${R.card(G.start[id])} and ended the night as ${R.card(G.night.final[id])}.`
        + (team(G.night.final[id]) !== team(G.start[id]) ? " You switched sides!" : ""),
    } : null;
    return { headline: res.headline, you, people: ppl, center: G.night.center.map((r) => ({ icon: R.ROLES[r].icon, name: R.ROLES[r].name })), story,
      outLine: res.out.length ? `Voted out: ${res.out.map((x) => `${nm[x]} (${R.card(G.night.final[x])})`).join(", ")}` : "Nobody was voted out." };
  }
  const revealScreen = (id) => ({ screen: "secret", stage: "reveal", round: G.round, reveal: revealData(id) });

  /* ---------- What this page shows during a round ---------- */
  const kit = () => ({ el, send: mine.send, buzz, face: "🌙", name: prefs.name });
  function drawMine() {
    const box = document.querySelector(".mine");
    if (!box || !prefs.play || !shown[HOST] || phase === "reveal") return;
    box.replaceChildren(LO_CARD.view(shown[HOST], kit()));
  }
  let drawn = "";
  function drawPhase() {
    if (phase === "lobby") return drawLobby();
    const done = (o) => G.ids.filter((x) => o[x]).length;
    const n = G.ids.length;
    const status = phase === "deal" ? `Ready: ${done(G.ready)} of ${n}` : phase === "night" ? `Done: ${done(G.actions)} of ${n}` : phase === "vote" ? `Votes in: ${done(G.votes)} of ${n}` : "";
    const statusNode = document.querySelector(".status");
    // Only the counts changed: update them in place, so the host's card (maybe held down) isn't redrawn.
    const key = `${phase}:${G.round}:${phase === "reveal" ? G.revealStep : ""}:${shown[HOST] && shown[HOST].action && shown[HOST].action.done}:${shown[HOST] && shown[HOST].ready}`;
    if (key === drawn && statusNode) { statusNode.textContent = status; const c = document.querySelector(".clock b"); if (c && phase !== "day") c.textContent = mmss(Math.ceil((G.deadline - Date.now()) / 1000)); return; }
    drawn = key;
    const head = el("header", { class: "phase " + phase },
      el("div", { class: "sky", "aria-hidden": "true" }, el("i", { class: phase === "day" ? "sun" : "moon" })),
      el("h1", {}, { deal: "The deal", night: "Night", day: "Morning", vote: "The vote", reveal: "The reveal" }[phase]),
      status ? el("p", { class: "status" }, status) : null,
      phase === "day" || phase === "vote" || phase === "night" ? el("p", { class: "clock" }, el("b", {}, mmss(Math.ceil((G.deadline - Date.now()) / 1000)))) : null);
    const controls = el("div", { class: "controls" },
      phase === "deal" ? el("button", { class: "ghost", onclick: () => toNight() }, "Everyone's ready: lights out") : null,
      phase === "day" ? el("button", { class: "ghost", onclick: () => moreTime() }, "+1 minute") : null,
      phase === "day" ? el("button", { class: "ghost", onclick: () => toVote() }, "Vote now") : null,
      phase === "vote" ? el("button", { class: "ghost", onclick: () => toReveal() }, "Count the votes now") : null);
    if (phase === "reveal") {
      const outs = G.result.out;
      show(head,
        G.revealStep < 2 ? el("div", { class: "suspense" },
          el("p", { class: "drum" }, G.revealStep === 0 ? "🥁" : outs.length ? "🔦" : "🤷"),
          G.revealStep >= 1 ? el("p", { class: "outname" }, outs.length ? outs.map(nameOf).join(" & ") : "Nobody is out") : el("p", { class: "outname soft" }, "The votes are in...")) : null,
        G.revealStep >= 2 ? LO_CARD.view(revealScreen(prefs.play ? HOST : null), kit()) : null,
        G.revealStep >= 2 ? el("div", { class: "controls" },
          el("button", { class: "big-btn", onclick: () => startRound() }, "Play again"),
          el("button", { class: "ghost", onclick: () => lobby() }, "Back to the lobby (let more people in)")) : null);
      return;
    }
    show(head, controls, prefs.play && shown[HOST] ? el("div", { class: "mine" }) : el("p", { class: "watch" }, phase === "night" ? "Everyone's doing their part in secret..." : phase === "day" ? "Let them talk! You're the host tonight." : ""));
    drawMine();
  }

  /* ---------- Start: pick up a game this tab was running (a reload), or the title ---------- */
  function boot() {
    const s = loadSaved();
    if (s && s.code && s.hostKey && s.G) {
      room = { code: s.code, hostKey: s.hostKey };
      G = s.G; phase = s.phase; G.talking = false;
      connect();
      // Carry on where it was (without saying it all again); the phones get their screens when the line opens.
      const build = { deal: dealScreen, night: nightScreen, day: dayScreen, vote: voteScreen, reveal: revealScreen }[phase];
      if (!build || !G.start || (phase === "reveal" && !G.result)) return lobby();
      for (const id of G.ids) shown[id] = build(id);
      const t = step();
      moodFor(phase);
      if (phase === "reveal") G.revealStep = 2;
      if (phase === "day") { music.duck(true); dayClock(t); }
      if (phase === "night") nightClock(t);
      if (phase === "vote") voteClock(t);
      drawPhase();
      return;
    }
    titleScreen();
  }
  return { boot, _state: () => ({ phase, G, people, room }) };
})();
