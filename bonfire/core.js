/* Bonfire Ice Breaker on the TV: the core. A get-to-know-you night for up to 40 people, each on their own phone.

   The TV makes a room on the Bonfire server (the same relay as Holy Huddle and Spark Wars: huddle/server), shows the
   code and a QR code, and while people join, every phone gets a few quick questions about its player (from
   data/questions.js): a handful the whole room answers, the rest picked at random. When the leader starts, the show
   runs the mini-games in order (games.js, each registered with BF.game), each one built from those answers, then
   ends on the Campfire Report. The host is a voice only (the device's own speech), with captions on the TV.

   The TV runs everything. Phones only draw the screens it sends (huddle/phone) and send back taps and typing.
   Messages are in huddle/PROTOCOL.md. Answers live only in this tab and the room: nothing is kept after the night. */
window.BF = (() => {
  "use strict";
  const HOME = "https://bonfire.thecrossroads.workers.dev";
  // On the Bonfire site itself (or a local test server) talk to this site; anywhere else, to the real one.
  const BASE = /bonfire|localhost|127\.0\.0\.1/.test(location.host) && location.protocol.startsWith("http") ? location.origin : HOME;
  const JOIN_TEXT = BASE.replace(/^https?:\/\//, "");
  const MAX_PLAYERS = 40;
  const ICONS = {
    tent: "⛺", moon: "🌙", star: "⭐", pine: "🌲", mountain: "🏔️", canoe: "🛶", lantern: "🏮", bear: "🐻", raccoon: "🦝", deer: "🦌", hedgehog: "🦔",
    butterfly: "🦋", mushroom: "🍄", coffee: "☕", dango: "🍡", compass: "🧭", map: "🗺️", sparkles: "✨", snail: "🐌", beaver: "🦫", fox: "🦊", owl: "🦉",
    wolf: "🐺", guitar: "🎸",
  };
  const Q = BONFIRE.QUESTIONS, CATS = BONFIRE.CATS;
  const SAVE = "bonfire-tv", PREFS = "bonfire-prefs";
  const prefs = (() => {
    const d = { games: {}, faith: true, kindle: 10, voice: true, muted: false, music: true };
    try { return Object.assign(d, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) { return d; }
  })();
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {} };

  /* ---------- Small helpers ---------- */
  const stage = document.getElementById("stage");
  const box = document.querySelector(".stagebox");
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
  /** Put a screen on the stage. The old one fades and blurs away behind the new one, which comes up into focus. */
  const show = (node) => {
    for (const old of [...stage.children]) {
      if (old.classList.contains("leaving")) { old.remove(); continue; }
      old.classList.add("leaving");
      setTimeout(() => old.remove(), 550);
    }
    stage.prepend(node);
    node.classList.add("enter");
    return node;
  };
  /** Count a number up in an element (fmt'd), easing out. */
  const countUp = (node, to, from = 0, ms = 1100) => {
    if (!node) return;
    const t0 = performance.now();
    const go = (t) => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); node.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  };
  /** Each letter in its own span (with --i), so it can drop in or wave. */
  const lettered = (text) => [...text].map((ch, i) => (ch === " " ? " " : el("span", { class: "ch", style: `--i:${i}` }, ch)));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const fmt = (n) => Math.round(n).toLocaleString();
  const nth = (n) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const face = (p) => ICONS[p && p.avatar] || "🔥";
  /** "Ava", "Ava and Sam", "Ava, Sam and Liam", "Ava, Sam, Liam and 4 more". */
  const names = (ids) => { const n = ids.map((id) => (byId(id) || {}).name).filter(Boolean); return n.length < 2 ? n.join("") : n.length > 4 ? `${n.slice(0, 3).join(", ")} and ${n.length - 3} more` : `${n.slice(0, -1).join(", ")} and ${n.at(-1)}`; };
  /** An answer in words: "Tacos", "Yes", or what they typed. */
  const said = (qi, v) => { const q = Q[qi]; return q.t === "yes" ? (v ? "Yes" : "No") : q.t === "text" ? v : q.a[v]; };
  const catIcon = (qi) => (CATS[Q[qi].c] || "🔥").split(" ")[0];
  /** An answer that makes sense on its own ("Night owl", "has been on a plane"), or null (a bare "No" or "Off" doesn't). */
  const blurb = (qi, v) => {
    const q = Q[qi];
    if (q.t === "yes") return v ? q.find : null;
    if (q.t === "text") return null;
    const a = q.a[v];
    return /^(yes|no|on|off|never|always|deal|no deal|first|last)$/i.test(a) ? null : a;
  };

  /* The music's mood follows the scene on the stage (data-scene on the stage box). */
  const MOOD = { title: "title", lobby: "lobby", report: "report", end: "report" };
  new MutationObserver(() => { try { music.mood(MOOD[box.dataset.scene] || "game"); } catch (e) {} }).observe(box, { attributes: true, attributeFilter: ["data-scene"] });

  // The stage is 1280×720; it scales to fit the screen.
  function fit() { box.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / 1280, innerHeight / 720)})`; }
  addEventListener("resize", fit);
  fit();

  /* ---------- Sound: blips, and a crackling fire (made on the spot, no files) ---------- */
  let actx = null;
  const ctx = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return actx; };
  /* The campfire guitar (music.js): it plays under everything, and the game's little sounds are guitar too. */
  const music = BONFIRE_MUSIC(ctx);
  function S(name) {
    if (["big", "right", "found", "go"].includes(name)) flare(name === "big" || name === "go");
    if (!prefs.muted) try { music.sfx(name); } catch (e) {}
  }
  /** The fire leaps up for a moment; on the biggest moments the stage flashes warm and gives a little jolt. */
  function flare(big) {
    const f = box.querySelector(".fire");
    f.classList.remove("flare"); void f.offsetWidth; f.classList.add("flare");
    if (!big) return;
    const fl = el("div", { class: "flash" });
    box.append(fl);
    setTimeout(() => fl.remove(), 700);
    box.classList.remove("jolt"); void box.offsetWidth; box.classList.add("jolt");
  }
  /** The fire: a low rumble and random little pops. */
  const crackle = (() => {
    let gain = null, timer = 0;
    function pop() {
      const c = ctx();
      if (!c || !gain) return;
      const len = Math.floor(c.sampleRate * (0.004 + Math.random() * 0.02)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      const s = c.createBufferSource(), g = c.createGain();
      s.buffer = buf; g.gain.value = 0.15 + Math.random() * 0.5;
      s.connect(g).connect(gain); s.start();
      timer = setTimeout(pop, 40 + Math.random() * (Math.random() < 0.2 ? 900 : 260));
    }
    return {
      start() {
        const c = ctx();
        if (!c || gain || prefs.muted) return;
        gain = c.createGain(); gain.gain.value = 0.12; gain.connect(c.destination);
        const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } // brown noise
        const rumble = c.createBufferSource(), lp = c.createBiquadFilter();
        rumble.buffer = buf; rumble.loop = true; lp.type = "lowpass"; lp.frequency.value = 500;
        rumble.connect(lp).connect(gain); rumble.start();
        pop();
      },
      stop() { clearTimeout(timer); if (gain) { try { gain.disconnect(); } catch (e) {} gain = null; } },
    };
  })();
  /* iPhones and iPads only start sound from a tap: every tap makes sure it's on, wakes the device's voice once, and
     lets the game play with the ringer switch on silent (Safari 16.4+). */
  let voiceWoken = false;
  const wakeSound = () => {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    try { const c = ctx(); if (c && c.state !== "running") c.resume(); } catch (e) {}
    if (!voiceWoken && "speechSynthesis" in window) { voiceWoken = true; try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch (e) {} }
    if (room) keepAwake();
  };
  addEventListener("pointerdown", wakeSound, true);
  addEventListener("keydown", wakeSound, true);
  document.addEventListener("visibilitychange", () => { const c = actx; if (!c) return; if (document.hidden) c.suspend(); else c.resume(); if (room) keepAwake(); });
  /* A phone running the TV page (mirrored to a TV) must not go to sleep mid-game: that stops the mirroring. */
  let wakeLock = null;
  async function keepAwake() {
    try { if (!wakeLock && navigator.wakeLock && document.visibilityState === "visible") { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } } catch (e) {}
  }

  /* ---------- The host: a voice and captions, no face ----------
     The device's own speech. The best voice it has is picked (Edge's "Natural" voices and the iPhone's "Enhanced" and
     "Premium" voices sound almost human); it reads names, so the host can greet people and call them out. */
  const host = (() => {
    const cap = box.querySelector(".caption"), capText = cap.querySelector(".text");
    let voice = null, gen = 0, chain = Promise.resolve(), hide = 0, busy = 0;
    const LIKE = ["Ava Online (Natural)", "Andrew Online (Natural)", "Emma Online (Natural)", "Jenny Online (Natural)", "Aria Online (Natural)", "Guy Online (Natural)",
      "Ava (Premium)", "Zoe (Premium)", "Evan (Premium)", "Ava (Enhanced)", "Samantha (Enhanced)", "Google US English", "Samantha", "Alex", "Daniel"];
    const pick = () => {
      try {
        const all = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
        voice = LIKE.map((n) => all.find((v) => v.name.includes(n))).find(Boolean) || all.find((v) => /natural|premium|enhanced/i.test(v.name) && /en-US/i.test(v.lang))
          || all.find((v) => /en-US/i.test(v.lang)) || all[0] || null;
      } catch (e) {}
    };
    if ("speechSynthesis" in window) { pick(); speechSynthesis.addEventListener("voiceschanged", pick); }
    /* The caption shows the whole line, one sentence lit at a time as it's spoken. */
    function caption(parts) {
      clearTimeout(hide);
      capText.replaceChildren(...parts.map((p) => el("span", {}, p)));
      cap.hidden = false; cap.classList.remove("in"); void cap.offsetWidth; cap.classList.add("in");
    }
    const sentences = (text) => (text.match(/[^.!?]+[.!?]*["”]?\s*/g) || [text]).map((x) => x.trim()).filter(Boolean);
    /** One sentence out loud. Natural voices at almost their own pace; the robotic ones a little slower. */
    function speakOne(text) {
      return new Promise((resolve) => {
        const quietTime = Math.min(5000, 900 + text.length * 55);
        if (!prefs.voice || prefs.muted || !("speechSynthesis" in window)) return setTimeout(resolve, quietTime);
        try {
          const u = new SpeechSynthesisUtterance(text);
          if (voice) { u.voice = voice; u.lang = voice.lang; }
          u.rate = voice && /natural|premium|enhanced/i.test(voice.name) ? 0.94 : 0.86;
          u.pitch = 1;
          const guard = setTimeout(resolve, 3000 + text.length * 110); // some browsers never say they're done
          u.onend = u.onerror = () => { clearTimeout(guard); resolve(); };
          speechSynthesis.speak(u);
        } catch (e) { setTimeout(resolve, quietTime); }
      });
    }
    /** A line, sentence by sentence, with a breath between them, the music dipped underneath. */
    async function speak(parts, mine) {
      music.duck(true);
      try {
        for (let k = 0; k < parts.length; k++) {
          if (mine !== gen) return;
          const spans = capText.children;
          for (let j = 0; j < spans.length; j++) spans[j].classList.toggle("on", j === k);
          await speakOne(parts[k]);
          if (k < parts.length - 1) await new Promise((r) => setTimeout(r, 380));
        }
      } finally { if (mine === gen) music.duck(false); }
    }
    return {
      /** Say a line (or one of a list, at random). Lines wait their turn; { now } cuts in. Resolves when it's said. */
      say(text, o = {}) {
        if (Array.isArray(text)) text = pickOne(text);
        if (o.now) { gen++; chain = Promise.resolve(); try { speechSynthesis.cancel(); } catch (e) {} }
        else if (o.minor && busy) return chain;
        const mine = gen;
        busy++;
        chain = chain.then(async () => {
          if (mine !== gen) return;
          const parts = sentences(text);
          caption(parts);
          await speak(parts, mine);
          if (mine === gen) hide = setTimeout(() => { cap.hidden = true; }, 900);
        }).finally(() => { busy = Math.max(0, busy - 1); });
        return chain;
      },
      quiet() { gen++; chain = Promise.resolve(); busy = 0; try { speechSynthesis.cancel(); } catch (e) {} cap.hidden = true; music.duck(false); },
    };
  })();

  /* ---------- Things to watch: embers rising from the fire, bursts and confetti in front ---------- */
  const fx = (() => {
    const back = box.querySelector(".embers").getContext("2d"), front = box.querySelector(".burst").getContext("2d");
    const embers = [], bits = [];
    let heat = 0.4;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const COLORS = ["#ffb23e", "#ff6b3d", "#ffd27a", "#ff8a3d", "#fff3e0"];
    function loop() {
      back.clearRect(0, 0, 1280, 720);
      const want = Math.round(20 + heat * 70);
      while (embers.length < want) embers.push({ x: rnd(560, 720), y: rnd(640, 700), vx: rnd(-0.6, 0.6), vy: rnd(0.8, 2.2), r: rnd(0.8, 2.6), life: rnd(160, 420), ph: rnd(0, 6) });
      if (embers.length > want) embers.length = want;
      for (const e of embers) {
        e.y -= e.vy * (0.6 + heat); e.x += e.vx + Math.sin((e.y + e.ph * 40) / 50) * 0.5; e.life--; e.ph += 0.15;
        if (e.life <= 0 || e.y < -10) Object.assign(e, { x: rnd(560, 720), y: rnd(640, 700), life: rnd(160, 420) });
        back.globalAlpha = Math.max(0, Math.min(1, e.life / 120)) * (0.5 + 0.5 * Math.abs(Math.sin(e.ph)));
        back.fillStyle = e.r > 2 ? "#ffd27a" : "#ff8a3d";
        back.beginPath(); back.arc(e.x, e.y, e.r, 0, 7); back.fill();
      }
      back.globalAlpha = 1;
      front.clearRect(0, 0, 1280, 720);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy += b.g; b.x += b.vx; b.y += b.vy; b.rot += b.vr; b.life--;
        if (b.life <= 0 || b.y > 760) { bits.splice(i, 1); continue; }
        front.save(); front.globalAlpha = Math.min(1, b.life / 30); front.translate(b.x, b.y); front.rotate(b.rot); front.fillStyle = b.c;
        if (b.dot) { front.beginPath(); front.arc(0, 0, b.s / 2, 0, 7); front.fill(); } else front.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        front.restore();
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return {
      heat(v) { heat = v; },
      burst(x, y, n = 36, colors) { if (reduced) return; for (let i = 0; i < n; i++) { const a = rnd(0, 6.3), v = rnd(2, 9); bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: 0.16, s: rnd(5, 10), rot: 0, vr: 0, c: pickOne(colors || COLORS), life: rnd(40, 70), dot: true }); } },
      burstAt(node, n, colors) {
        if (!node) return;
        const r = node.getBoundingClientRect(), s = box.getBoundingClientRect(), k = 1280 / s.width;
        this.burst((r.left + r.width / 2 - s.left) * k, (r.top + r.height / 2 - s.top) * k, n, colors);
      },
      confetti(n = 160, colors) { if (reduced) return; for (let i = 0; i < n; i++) bits.push({ x: rnd(0, 1280), y: rnd(-80, -10), vx: rnd(-1.5, 1.5), vy: rnd(1, 4), g: 0.05, s: rnd(8, 14), rot: rnd(0, 6), vr: rnd(-0.2, 0.2), c: pickOne(colors || COLORS), life: 280 }); },
    };
  })();

  /* ---------- The room ---------- */
  let ws = null, room = null, players = [], ending = false, retry = 0;
  let phase = "title", lobbyNode = null, cur = null, token = 0, round = 0;
  const timers = new Set();
  const shown = {}; // the last screen each phone was sent, to send again when it rejoins
  const sendTo = (to, data) => { try { ws.send(JSON.stringify({ t: "to", to, data })); } catch (e) {} };
  const hostSend = (m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
  const save = (v) => { try { v ? sessionStorage.setItem(SAVE, JSON.stringify(v)) : sessionStorage.removeItem(SAVE); } catch (e) {} };
  const byId = (id) => players.find((p) => p.id === id);
  const cast = () => players.filter((p) => !p.audience);
  /** Starting a new step cancels every timer of the old one. */
  function step() { for (const t of timers) { clearTimeout(t); clearInterval(t); } timers.clear(); return ++token; }
  const live = (t) => t === token;
  const wait = (ms, t = token) => new Promise((r) => { const h = setTimeout(() => { timers.delete(h); r(live(t)); }, ms); timers.add(h); });
  const every = (ms, fn) => { const h = setInterval(fn, ms); timers.add(h); return h; };
  const later = (ms, fn) => { const h = setTimeout(() => { timers.delete(h); fn(); }, ms); timers.add(h); return h; };

  /** Send a phone (or "players", or a list of ids) a screen; it's kept for a rejoin. */
  function put(to, screen) {
    const ids = to === "players" ? cast().map((p) => p.id) : [].concat(to);
    for (const id of ids) {
      shown[id] = screen;
      const p = byId(id);
      if (p && p.connected) sendTo([id], screen);
    }
  }
  function screenFor(id) {
    const p = byId(id);
    if (p && p.audience) return { screen: "wait", title: "You're in the audience", text: "The fire is full (40 people). Watch the big screen!" };
    if (shown[id]) return shown[id];
    if (phase === "lobby") return doneScreen();
    return { screen: "wait", title: "Pull up a log! 🔥", text: "You're in from the next round." };
  }

  /* Everyone's answers are kept in this tab (sessionStorage) too, so reloading the TV page doesn't lose them. */
  const KEEP = "bonfire-answers";
  function keep() { try { if (room) sessionStorage.setItem(KEEP, JSON.stringify({ code: room.code, coreQs, prof })); } catch (e) {} }
  function restore(code) {
    try {
      const k = JSON.parse(sessionStorage.getItem(KEEP) || "null");
      if (!k || k.code !== code) return false;
      coreQs = k.coreQs;
      for (const [id, p] of Object.entries(k.prof)) prof[id] = Object.assign(p, { round: -1 });
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Kindling: questions while everyone joins ---------- */
  const prof = {};   // id -> { queue: [question index], at, round, answers: { index: answer }, done }
  let coreQs = [];   // the questions everyone answers tonight
  const allowed = (i) => prefs.faith || Q[i].c !== "faith";
  function chooseCore() {
    const pool = shuffle(Q.map((q, i) => i).filter((i) => Q[i].core && allowed(i)));
    const twoWay = pool.filter((i) => Q[i].t === "pair" || Q[i].t === "yes");
    // Two of the silly social experiments every night (the best ones for "What percent of us...?"), then two more.
    const tests = twoWay.filter((i) => Q[i].c === "experiment").slice(0, 2), others = twoWay.filter((i) => !tests.includes(i));
    coreQs = [...tests, ...others.slice(0, 1), ...pool.filter((i) => !tests.includes(i) && i !== others[0]).slice(0, 1)];
  }
  function makeQueue(n, skip) {
    const not = new Set([...coreQs, ...(skip || [])]);
    const texts = shuffle(Q.map((q, i) => i).filter((i) => Q[i].t === "text" && allowed(i) && !not.has(i))).slice(0, 2);
    const rest = shuffle(Q.map((q, i) => i).filter((i) => Q[i].t !== "text" && allowed(i) && !not.has(i))).slice(0, Math.max(0, n - coreQs.length - texts.length));
    return [...coreQs.slice(0, 2), ...shuffle([...coreQs.slice(2), ...rest, ...texts])];
  }
  /** A few more questions for another round: new ones, none of the core. */
  function more(n, skip) {
    const not = new Set([...coreQs, ...skip]);
    const text = shuffle(Q.map((q, i) => i).filter((i) => Q[i].t === "text" && allowed(i) && !not.has(i))).slice(0, 1);
    return shuffle([...text, ...shuffle(Q.map((q, i) => i).filter((i) => Q[i].t !== "text" && allowed(i) && !not.has(i))).slice(0, n - 1)]);
  }
  /** The leader changed a setting: questions not asked yet follow it. (The core ones only change if nobody has
      answered anything yet, so the room can still be compared.) */
  function replan() {
    const anyone = Object.values(prof).some((p) => Object.keys(p.answers).length);
    if (!anyone) chooseCore();
    for (const [id, p] of Object.entries(prof)) {
      const asked = p.queue.slice(0, p.at + (p.done ? 0 : 1));
      const want = anyone ? p.queue.filter((qi) => coreQs.includes(qi) && !asked.includes(qi) && allowed(qi)) : [];
      const fresh = (anyone ? more(Math.max(0, prefs.kindle - asked.length - want.length), asked) : makeQueue(prefs.kindle).filter((qi) => !asked.includes(qi)))
        .slice(0, Math.max(0, prefs.kindle - asked.length - want.length));
      p.queue = [...asked, ...want, ...fresh];
      if (p.done && p.at < p.queue.length) { p.done = false; askNext(id); }
    }
    keep();
    refresh();
  }
  function startKindling(id) {
    if (!prof[id]) prof[id] = { queue: makeQueue(prefs.kindle), at: 0, round: -1, answers: {}, done: false };
    askNext(id);
  }
  function askNext(id) {
    const p = prof[id];
    if (!p || phase !== "lobby") return;
    if (p.at >= p.queue.length) { p.done = true; return put(id, doneScreen()); }
    const qi = p.queue[p.at], q = Q[qi], header = `${CATS[q.c]} · ${p.at + 1} of ${p.queue.length}`;
    p.round = ++round;
    if (q.t === "text") put(id, { screen: "write", round: p.round, prompt: q.q, placeholder: q.hint, max: 30, button: "Send", auto: "Skip this one", header,
      hint: "Answers can show up on the big screen with your name.", locked: "Got it!" });
    else put(id, { screen: "choices", round: p.round, prompt: q.q, options: q.t === "yes" ? ["Yes", "No"] : q.a, look: q.t === "pick" ? null : "two",
      skip: "Skip this one", header, hint: "", locked: "Got it!" });
  }
  const doneScreen = () => ({ screen: "wait", title: "You're all set! 🔥", text: "Watch the fire. The games start when everyone's in.", vip: [{ label: "Start the games", action: "start" }] });
  function kindle(id, d) {
    const p = prof[id];
    if (!p || p.done || d.round !== p.round) return;
    const qi = p.queue[p.at], q = Q[qi];
    if (d.type === "pick" && q.t !== "text") {
      const k = d.pick | 0;
      if (k < 0 || k >= (q.t === "yes" ? 2 : q.a.length)) return;
      p.answers[qi] = q.t === "yes" ? k === 0 : k;
    } else if (d.type === "write" && q.t === "text") {
      const t = d.auto ? "" : String(d.text || "").trim().slice(0, 40);
      if (t) p.answers[qi] = t;
    } else if (d.type !== "skip") return;
    p.at++;
    p.round = -1;
    keep();
    if (lobbyNode) { refresh(); const chip = stage.querySelector(`.log[data-key="${id}"]`); if (chip && p.at === p.queue.length) { fx.burstAt(chip, 18); S("found"); } }
    setTimeout(() => askNext(id), 250);
  }
  /** A player's answers: [{ qi, q, v }] (choice answers, or the typed ones with { text: true }). */
  function answersOf(id, text) {
    const p = prof[id];
    if (!p) return [];
    return Object.keys(p.answers).map(Number).filter((qi) => (Q[qi].t === "text") === !!text).map((qi) => ({ qi, q: Q[qi], v: p.answers[qi] }));
  }
  /** "How many of us...?": for each option, who picked it. */
  function split(qi) {
    const q = Q[qi], opts = q.t === "yes" ? ["Yes", "No"] : q.a, who = opts.map(() => []);
    for (const p of cast()) { const a = prof[p.id] && prof[p.id].answers[qi]; if (a === undefined) continue; who[q.t === "yes" ? (a ? 0 : 1) : a].push(p.id); }
    return { opts, who, total: who.reduce((n, w) => n + w.length, 0) };
  }

  /* ---------- Title screen, the room, the lobby ---------- */
  function titleScreen(note) {
    phase = "title";
    fx.heat(0.4);
    box.dataset.scene = "title";
    show(el("section", { class: "title" },
      el("h1", { class: "logo" }, "Bonfire"),
      el("p", { class: "tag" }, "The ice breaker for up to 40 people. Answer a few questions about yourself, then play games made out of everyone's answers."),
      note ? el("p", { class: "warn" }, note) : null,
      el("div", { class: "row" }, el("button", { class: "btn go", onclick: openRoom }, "🔥 Light the fire"),
        el("button", { class: "btn ghost", onclick: () => { try { const d = document.documentElement; document.fullscreenElement ? document.exitFullscreen() : (d.requestFullscreen || d.webkitRequestFullscreen).call(d); } catch (e) {} } }, "⛶ Full screen")),
      el("p", { class: "fine" }, `Players join on their phones at ${JOIN_TEXT}`)));
  }
  async function openRoom() {
    keepAwake();
    crackle.start();
    if (!prefs.muted && prefs.music) music.start();
    host.say("Welcome to the fire! Grab your phone, scan the code, and answer a few questions while everyone gets here.", { now: true });
    show(el("section", { class: "title" }, el("h1", { class: "logo" }, "Bonfire"), el("p", { class: "tag" }, "Lighting the fire...")));
    let r = saved();
    if (r) { const still = await fetch(`${BASE}/api/rooms/${r.code}`).then((x) => x.ok).catch(() => false); if (!still) r = null; }
    if (!r) r = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game: "bonfire" }) }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
    if (!r || !r.code) return titleScreen("Can't reach the Bonfire server. Check the internet and try again.");
    save({ code: r.code, hostKey: r.hostKey });
    room = { code: r.code, hostKey: r.hostKey, vip: null, locked: false };
    players = []; ending = false;
    if (!restore(r.code)) chooseCore();
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
      setTimeout(() => { if (!ending && ws === line) connect(); }, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
    };
  }
  let joinTimer = 0, joinCount = 0;
  function onMessage(m) {
    if (m.t === "room") {
      retry = 0;
      players = m.room.players;
      room.vip = m.room.vip;
      room.locked = m.room.locked;
      const ev = m.event || {}, p = byId(ev.id);
      if (ev.kind === "join" && p) {
        if (phase === "lobby" && !p.audience) {
          S("join");
          // Greet one person by name; a crowd gets counted.
          joinCount++;
          clearTimeout(joinTimer);
          joinTimer = setTimeout(() => {
            if (phase === "lobby") host.say(joinCount > 1 ? [`${joinCount} more around the fire!`, `${joinCount} more just pulled up a log.`] : [`Welcome, ${p.name}!`, `Hey, ${p.name}. Pull up a log.`, `${p.name} is here!`], { minor: true });
            joinCount = 0;
          }, 1800);
          setTimeout(() => fx.burstAt(stage.querySelector(`.log[data-key="${p.id}"]`), 20), 60);
        }
        if (phase === "lobby" && !p.audience) startKindling(p.id); // sends the first question
        else sendTo([p.id], screenFor(p.id));
      }
      if (ev.kind === "back" && p) sendTo([p.id], screenFor(p.id));
      // The TV (re)connected, after a blip or a reload: every phone gets its screen again (in the lobby, its question).
      if (ev.kind === "host-connected") players.forEach((x) => { if (!x.connected) return; if (phase === "lobby" && !x.audience) startKindling(x.id); else sendTo([x.id], screenFor(x.id)); });
      refresh();
      return;
    }
    if (m.t === "input") return onInput(m);
    if (m.t === "replaced") { ending = true; save(null); step(); titleScreen("This fire was opened on another screen."); }
  }
  function onInput(m) {
    const d = m.data || {}, p = byId(m.id);
    if (!p || p.audience) return;
    if (d.type === "vip" && m.id === room.vip) {
      if (d.action === "start" && phase === "lobby") return startShow();
      if (d.action === "again" && phase === "end") return startShow();
      if (d.action === "lobby" && phase === "end") return backToFire();
      return;
    }
    if (phase === "lobby") return kindle(m.id, d);
    if (cur && cur.input) cur.input(m.id, d, m.at);
  }

  function qrSvg(text) {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount(), cells = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) cells.push(`M${x + 2} ${y + 2}h1v1h-1z`);
      const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${cells.join("")}" fill="#0c1030"/></svg>`, "image/svg+xml").documentElement;
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "QR code to join");
      return svg;
    } catch (e) { return el("div", { class: "noqr" }, "Scan not available"); }
  }

  const GAMES = [];
  /** A mini-game registers itself: { key, name, icon, color, tagline, steps (3 short ones for the TV), how (for the
      phones), intro (what the host says), run(api) }. */
  function game(def) { GAMES.push(def); }

  let tickerTimer = 0;
  function lobby() {
    step();
    phase = "lobby";
    cur = null;
    box.dataset.scene = "lobby";
    fx.heat(0.45);
    const url = `${BASE}/?room=${room.code}`;
    lobbyNode = el("section", { class: "lobby" },
      el("aside", { class: "join" },
        el("h1", { class: "logo small" }, "Bonfire"),
        el("p", { class: "label" }, "Join on your phone"),
        el("div", { class: "qr" }, qrSvg(url)),
        el("p", { class: "url" }, JOIN_TEXT),
        el("div", { class: "code", "aria-label": "Room code" }, ...room.code.split("").map((c) => el("span", {}, c)))),
      el("div", { class: "right" },
        el("div", { class: "who" }, el("h2", {}, "Around the fire"), el("span", { class: "count" }), el("p", { class: "ticker" })),
        el("div", { class: "logs" }),
        el("div", { class: "settings" })));
    show(lobbyNode);
    drawSettings();
    refresh();
    for (const p of cast()) if (!prof[p.id] || !prof[p.id].done) startKindling(p.id); else put(p.id, doneScreen());
    clearInterval(tickerTimer);
    let n = 0;
    tickerTimer = setInterval(() => { if (phase === "lobby") ticker(n++); }, 6000);
  }
  /** A live fact about the room so far: "9 of 14 of you would rather fly". */
  function ticker(n) {
    const t = lobbyNode && lobbyNode.querySelector(".ticker");
    if (!t) return;
    const facts = coreQs.map((qi) => ({ qi, s: split(qi) })).filter((f) => f.s.total >= 3);
    if (!facts.length) { t.textContent = "Answer the questions on your phone while everyone joins."; return; }
    const f = facts[n % facts.length], top = f.s.who.map((w, k) => [w.length, k]).sort((a, b) => b[0] - a[0])[0];
    t.textContent = `${catIcon(f.qi)} ${Q[f.qi].q}  ${top[0]} of ${f.s.total} said ${f.s.opts[top[1]]}`;
    t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
  }
  function refresh() {
    if (phase !== "lobby" || !lobbyNode) return;
    const list = cast();
    lobbyNode.querySelector(".count").textContent = `${list.length} / ${MAX_PLAYERS}`;
    const logs = lobbyNode.querySelector(".logs");
    logs.replaceChildren(...list.map((p) => {
      const pr = prof[p.id], k = pr ? pr.at / pr.queue.length : 0;
      const chip = el("button", { class: "log" + (p.connected ? "" : " away") + (pr && pr.done ? " done" : ""), "data-key": p.id, style: `--k:${k}`, title: "Click twice to remove", onclick: () => {
        if (chip.classList.contains("confirm")) return hostSend({ t: "kick", id: p.id });
        chip.classList.add("confirm");
        setTimeout(() => chip.classList.remove("confirm"), 3000);
      } }, el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name), p.id === room.vip ? el("span", { class: "crown", title: "VIP: can start from their phone" }, "👑") : null);
      return chip;
    }));
    const go = lobbyNode.querySelector(".start");
    if (go) go.disabled = list.filter((p) => answersOf(p.id).length >= 2).length < 3;
    const lock = lobbyNode.querySelector(".lock");
    if (lock) lock.textContent = room.locked ? "🔓" : "🔒";
  }
  function chips(label, options, current, onPick) {
    const i = Math.max(0, options.findIndex(([v]) => v === current)), next = options[(i + 1) % options.length];
    return el("button", { class: "pill", title: `${label}: click to change`, onclick: () => { onPick(next[0]); savePrefs(); drawSettings(); refresh(); S("tick"); } }, el("small", {}, label), el("strong", {}, options[i][1]));
  }
  function drawSettings() {
    const s = lobbyNode && lobbyNode.querySelector(".settings");
    if (!s) return;
    s.replaceChildren(
      el("div", { class: "lineup" }, el("small", {}, "Tonight's games (click to leave one out)"),
        el("div", { class: "games" }, ...GAMES.map((g) => el("button", { class: "game" + (prefs.games[g.key] === false ? " off" : ""), style: `--c:${g.color}`, onclick: () => { prefs.games[g.key] = prefs.games[g.key] === false; if (!GAMES.some((x) => prefs.games[x.key] !== false)) prefs.games[g.key] = true; savePrefs(); drawSettings(); S("tick"); } },
          el("span", { class: "icon" }, g.icon), el("strong", {}, g.name))))),
      el("div", { class: "opts" },
        chips("Questions each", [[8, "8"], [10, "10"], [12, "12"]], prefs.kindle, (v) => { prefs.kindle = v; replan(); }),
        chips("Faith questions", [[true, "On"], [false, "Off"]], prefs.faith, (v) => { prefs.faith = v; replan(); }),
        el("button", { class: "btn go start", onclick: startShow }, "🔥 Start the games"),
        el("button", { class: "icon-btn lock", title: "Lock the room (no new players)", onclick: () => hostSend({ t: "lock", locked: !room.locked }) }, room.locked ? "🔓" : "🔒"),
        el("button", { class: "icon-btn" + (prefs.voice ? "" : " off"), title: "The host's voice", onclick: () => { prefs.voice = !prefs.voice; savePrefs(); drawSettings(); if (prefs.voice) host.say("I'm back.", { now: true }); else host.quiet(); } }, "🗣"),
        el("button", { class: "icon-btn" + (prefs.music && !prefs.muted ? "" : " off"), title: "The campfire guitar", onclick: () => { prefs.music = !prefs.music; savePrefs(); drawSettings(); if (prefs.music && !prefs.muted) music.start(); else music.stop(); } }, "🎸"),
        el("button", { class: "icon-btn" + (prefs.muted ? " off" : ""), title: "All sound", onclick: () => { prefs.muted = !prefs.muted; savePrefs(); drawSettings(); if (prefs.muted) { crackle.stop(); music.stop(); host.quiet(); } else { crackle.start(); if (prefs.music) music.start(); } } }, prefs.muted ? "🔇" : "🔊"),
        el("button", { class: "icon-btn", title: "Put the fire out (end the room)", onclick: endRoom }, "✕")));
    refresh();
  }
  function endRoom() {
    ending = true;
    step();
    clearInterval(tickerTimer);
    host.quiet();
    if (ws) { hostSend({ t: "end" }); setTimeout(() => { try { ws.close(); } catch (e) {} }, 300); }
    save(null);
    room = null; players = []; cur = null; lobbyNode = null;
    for (const k in prof) delete prof[k];
    try { sessionStorage.removeItem(KEEP); } catch (e) {}
    for (const k in shown) delete shown[k];
    titleScreen();
  }

  /* ---------- The show: the mini-games in order, then the Campfire Report ---------- */
  const scores = {};
  const stats = { fooled: {}, read: {}, guessed: {}, foundAt: [], alike: null };
  const add = (id, n) => { scores[id] = (scores[id] || 0) + n; };
  async function startShow() {
    if (phase !== "lobby" && phase !== "end") return;
    const ready = cast().filter((p) => answersOf(p.id).length >= 2);
    if (ready.length < 3) { host.say("Not quite yet! Give everyone a minute to answer a few questions first.", { now: true }); return; }
    let t = step();
    clearInterval(tickerTimer);
    lobbyNode = null;
    phase = "show";
    for (const k in scores) delete scores[k];
    Object.assign(stats, { fooled: {}, read: {}, guessed: {}, foundAt: [], alike: null });
    for (const k in shown) delete shown[k];
    host.quiet();
    S("go");
    fx.heat(0.7);
    const list = GAMES.filter((g) => prefs.games[g.key] !== false);
    put("players", { screen: "wait", title: "Here we go! 🔥", text: "Keep your phone handy. The first game is about to start." });
    await host.say(["Alright, everybody. Keep your phones handy... let's play!", "The fire's going. Phones out... let's play!"], { now: true });
    for (let i = 0; i < list.length; i++) {
      if (!live(t)) return;
      const g = list[i];
      if (!(await titleCard(g, i, list.length, t))) return;
      cur = { def: g, input: null };
      t = step(); // the game's own step: its timers end with it
      try { await g.run(api(t)); } catch (e) { console.error(e); }
      if (!live(t)) return;
      cur = null;
      if (i < list.length - 1 && !(await standings(list[i + 1], t))) return;
    }
    if (live(token)) report(token);
  }
  /** Each game's title card: its name in its own colour, one line on how to play, read out loud. */
  async function titleCard(g, i, n, t) {
    box.dataset.scene = g.key;
    show(el("section", { class: `card g-${g.key}`, style: `--c:${g.color}` },
      el("p", { class: "eyebrow" }, `Game ${i + 1} of ${n}`),
      el("div", { class: "big-icon" }, g.icon),
      el("h1", { "aria-label": g.name }, lettered(g.name)),
      el("p", { class: "tagline" }, g.tagline),
      g.steps ? el("ol", { class: "steps" }, ...g.steps.map((x, i) => el("li", { style: `--i:${i}` }, x))) : el("p", { class: "how" }, g.how)));
    put("players", { screen: "wait", title: `${g.icon} ${g.name}`, text: g.how });
    S("big");
    fx.burst(640, 260, 50, [g.color, "#fff3e0", "#ffb23e"]);
    await Promise.all([host.say(g.intro, { now: true }), wait(4500, t)]);
    return live(t);
  }
  /** The top 10 between games, and what's next. */
  async function standings(next, t) {
    box.dataset.scene = "standings";
    const order = cast().filter((p) => p.id in scores).sort((a, b) => scores[b.id] - scores[a.id]).slice(0, 10);
    show(el("section", { class: "standings" },
      el("h2", {}, "Around the fire so far"),
      el("ol", { class: "board" }, ...order.map((p, i) => el("li", { class: i < 3 ? "top" : "", style: `--i:${i}` }, el("span", { class: "rank" }, i + 1), el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name), el("span", { class: "pts", "data-to": scores[p.id] }, "0")))),
      el("p", { class: "next" }, `Next up: ${next.icon} ${next.name}`)));
    stage.querySelectorAll(".standings:not(.leaving) .pts[data-to]").forEach((n, i) => setTimeout(() => countUp(n, Number(n.dataset.to)), 250 + i * 90));
    if (order[0]) host.say([`${order[0].name} is out in front!`, `So far, ${order[0].name} leads the way.`], { now: true });
    for (const p of cast()) {
      const place = order.findIndex((x) => x.id === p.id) + 1;
      put(p.id, { screen: "wait", title: place ? `You're ${nth(place)}!` : "Keep going!", text: `${fmt(scores[p.id] || 0)} points. Next up: ${next.icon} ${next.name}` });
    }
    return wait(5500, t);
  }

  /* The Campfire Report: who this group is, kind awards, the podium, and each player's own card. */
  async function report(t) {
    phase = "report";
    box.dataset.scene = "report";
    fx.heat(0.6);
    put("players", { screen: "wait", title: "The Campfire Report 🔥", text: "Look at the big screen." });
    // 1. Who we are: the room's own answers.
    const facts = coreQs.map((qi) => ({ qi, s: split(qi) })).filter((f) => f.s.total >= 3);
    show(el("section", { class: "report" },
      el("p", { class: "eyebrow" }, "The Campfire Report"),
      el("h1", {}, "This is us"),
      el("div", { class: "facts" }, ...facts.map((f) => el("div", { class: "fact" },
        el("p", { class: "q" }, `${catIcon(f.qi)} ${Q[f.qi].q}`),
        el("div", { class: "split" }, ...f.s.opts.map((o, k) => {
          const pc = Math.round((100 * f.s.who[k].length) / f.s.total);
          return el("div", { class: "part", style: `--w:${Math.max(pc, 4)}%` }, el("b", {}, `${pc}%`), el("span", {}, o));
        })))))));
    const lead = facts.map((f) => { const k = f.s.who.map((w, i) => [w.length, i]).sort((a, b) => b[0] - a[0])[0]; return { f, k: k[1], pc: Math.round((100 * k[0]) / f.s.total) }; });
    const said1 = lead.slice(0, 2).map((x) => `${Q[x.f.qi].q} ${x.pc} percent of us said: ${x.f.s.opts[x.k]}`).join(". ");
    await Promise.all([host.say(facts.length ? `Here's who we are, as a group. ${said1}.` : "Here's who we are, as a group.", { now: true }), wait(9000, t)]);
    if (!live(t)) return;
    // 2. Awards, always kind.
    const ids = cast().map((p) => p.id), best = (o) => ids.filter((id) => o[id]).sort((a, b) => o[b] - o[a])[0];
    const adventurous = ids.map((id) => [id, answersOf(id).filter((a) => a.q.t === "yes" && a.v).length]).sort((a, b) => b[1] - a[1])[0];
    const awards = [
      best(stats.fooled) && ["🃏 Best poker face", byId(best(stats.fooled)).name, `fooled ${stats.fooled[best(stats.fooled)]} people`],
      best(stats.read) && ["🔮 Reads the room", byId(best(stats.read)).name, "closest guesses"],
      best(stats.guessed) && ["🕵️ Knows everybody", byId(best(stats.guessed)).name, `${stats.guessed[best(stats.guessed)]} right guesses`],
      stats.alike && byId(stats.alike.a) && byId(stats.alike.b) && ["🤝 Twin flames", `${byId(stats.alike.a).name} & ${byId(stats.alike.b).name}`, `${stats.alike.same} of ${stats.alike.of} the same`],
      adventurous && adventurous[1] >= 3 && byId(adventurous[0]) && ["🧗 Most adventurous", byId(adventurous[0]).name, `${adventurous[1]} "have you ever"s`],
      stats.foundAt[0] && ["⚡ Found their match first", names(stats.foundAt[0]), ""],
    ].filter(Boolean);
    if (awards.length) {
      show(el("section", { class: "report" }, el("p", { class: "eyebrow" }, "The Campfire Report"), el("h1", {}, "Tonight's awards"),
        el("div", { class: "awards" }, ...awards.map(([a, who, why], i) => el("div", { class: "award", style: `--i:${i}` }, el("small", {}, a), el("strong", {}, who), why ? el("span", {}, why) : null)))));
      S("big");
      fx.confetti(140);
      await Promise.all([host.say(`And now, tonight's awards. ${awards.slice(0, 2).map(([a, who]) => `${a.replace(/^\S+\s/, "")}: ${who}!`).join(" ")}`, { now: true }), wait(9000, t)]);
      if (!live(t)) return;
    }
    // 3. The podium, and everyone's card on their phone.
    phase = "end";
    box.dataset.scene = "end";
    const order = cast().filter((p) => p.id in scores).sort((a, b) => scores[b.id] - scores[a.id]);
    show(el("section", { class: "results" },
      el("h1", {}, order[0] ? [face(order[0]), " ", ...lettered(`${order[0].name} wins the night!`)] : "What a night!"),
      el("div", { class: "podium" }, ...[1, 0, 2].map((i) => order[i] ? el("div", { class: `step p${i + 1}` }, el("span", { class: "face" }, face(order[i])), el("span", { class: "name" }, order[i].name),
        el("span", { class: "pts" }, el("b", { "data-to": scores[order[i].id] }, "0"), " points"), el("span", { class: "block" }, ["🥇", "🥈", "🥉"][i])) : el("div", { class: "step empty" }))),
      el("p", { class: "thanks" }, "Go talk to someone you learned something about tonight."),
      el("div", { class: "buttons" }, el("button", { class: "btn go", onclick: startShow }, "↻ Play again"), el("button", { class: "btn ghost", onclick: backToFire }, "🔥 More questions"))));
    S("big");
    fx.confetti(220);
    stage.querySelectorAll(".results:not(.leaving) .podium b[data-to]").forEach((n) => setTimeout(() => countUp(n, Number(n.dataset.to), 0, 1600), 1300));
    if (order[0]) host.say(`And the winner of the night is... ${order[0].name}! Thanks for playing, everybody. Now go find someone you learned something about tonight, and say hi.`, { now: true });
    for (const p of cast()) {
      const place = order.findIndex((x) => x.id === p.id) + 1;
      const mine = shuffle(answersOf(p.id)).map((a) => [a.qi, blurb(a.qi, a.v)]).filter((x) => x[1]).slice(0, 3).map(([qi, b]) => `${catIcon(qi)} ${b[0].toUpperCase()}${b.slice(1)}`);
      put(p.id, { screen: "final", place: place || null, of: order.length, points: scores[p.id] || 0, text: mine.length ? `Your card: ${mine.join(" · ")}` : "",
        vip: [{ label: "Play again", action: "again" }, { label: "More questions", action: "lobby" }] });
    }
  }
  /** Back to the lobby, where everyone gets a few more questions (new ones), for another round of games. */
  function backToFire() {
    for (const p of cast()) {
      const pr = prof[p.id];
      if (pr) { pr.queue = pr.queue.slice(0, pr.at).concat(more(5, pr.queue)); pr.done = false; }
    }
    lobby();
  }

  /** Everything a mini-game can use. `t` is its step: when the room ends or the show moves on, live() turns false. */
  function api(t) {
    return {
      el, show, shuffle, pickOne, fmt, nth, face, names, said, blurb, catIcon, Q, CATS, S, fx, prof, scores, stats, add, split, answersOf, countUp, lettered,
      put, byId, cast, host, say: (text, o) => host.say(text, o),
      wait: (ms) => wait(ms, t), every, later, live: () => live(t),
      round: () => ++round,
      /** The game's own input handler: input(id, data). */
      on(h) { if (cur) cur.input = h.input; },
      /** Where the game is (for tests): "ask", "reveal"... */
      state(s) { if (cur) cur.state = s; },
      /** Players who answered at least `n` choice questions (and `text` typed ones). */
      ready: (n = 1, text = 0) => cast().filter((p) => answersOf(p.id).length >= n && answersOf(p.id, true).length >= text),
      scene: (s) => { box.dataset.scene = s; },
    };
  }

  function boot() {
    // For tests and recordings.
    window.BONFIRE_TV = { get phase() { return cur && cur.state ? cur.state : phase; }, get prof() { return prof; }, get scores() { return scores; }, say: (t) => host.say(t), base: BASE };
    titleScreen();
  }
  return { game, boot };
})();
