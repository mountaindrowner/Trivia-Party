/* Holy Huddle on the TV: the party game where everyone plays on their own phone.
   The TV makes a room on the Holy Huddle server, shows the code and a QR code, and fills the lobby as phones join.
   Then the game (the same shape as the classic party trivia games):
     1. Barnabas explains the rules (out loud too, with the device's own voice).
     2. 8 questions, answered on phones. Right and fast scores points.
     3. Miss one and you go to the Trial Room: a quick phone challenge with everyone else who missed.
        Lose it and you're a Lost Sheep. Lost Sheep keep answering; nobody sits out.
     4. The finale: a race to the Narrow Gate. "Tap all that apply" rounds move you along a path. Lost Sheep start
        behind and are found again if they catch up to the flock. Only the flock can go through the gate.
   The server and the phone page live in huddle/; messages are in huddle/PROTOCOL.md. */
window.THP = window.THP || {};

THP.Huddle = (function () {
  const { el, $, say, setMood, show, confetti, shuffle } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  const HOME = "https://holyhuddle.thecrossroads.workers.dev";
  // On the Holy Huddle site itself (or a local test server) talk to this site; anywhere else, to the real one.
  const BASE = /holyhuddle|localhost|127\.0\.0\.1/.test(location.host) && location.protocol.startsWith("http") ? location.origin : HOME;
  const JOIN_TEXT = BASE.replace(/^https?:\/\//, "");
  const AVATAR_EMOJI = { sheep: "🐑", donkey: "🫏", lion: "🦁", dove: "🕊️", fish: "🐟", camel: "🐫", whale: "🐋", raven: "🐦", frog: "🐸", ox: "🐂", goat: "🐐", eagle: "🦅" };
  const SAVE = "thp-huddle"; // { code, hostKey } in this tab, so a reloaded TV gets its room back
  const PREFS = "thp-huddle-prefs"; // { level, voice } across visits
  const QUESTIONS = 8;
  const GOAL = 12, MAX_RACE_ROUNDS = 8;
  const LEVELS = {
    1: { name: "Little Lambs", ages: "ages 5–8", seconds: 25, say: "We're playing Little Lambs: nice and easy, with extra time." },
    2: { name: "Mighty Warriors", ages: "ages 9–12", seconds: 20, say: "We're playing Mighty Warriors: trickier questions." },
    3: { name: "Legends", ages: "ages 13+", seconds: 15, say: "We're playing Legends: deep cuts and a fast clock. No pressure." },
  };
  const KEYS = ["◆", "●", "▲", "★"];

  let ws = null, room = null, players = [], offset = 0, ending = false, retry = 0, node = null;
  let phase = "lobby", game = null, timer = 0, stepToken = 0;
  const used = new Set(); // questions already asked this session, so Play again deals new ones
  const prefs = (() => { try { return Object.assign({ level: 2, voice: true }, JSON.parse(localStorage.getItem(PREFS) || "{}")); } catch (e) { return { level: 2, voice: true }; } })();
  const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch (e) {} };

  const face = (p) => AVATAR_EMOJI[p.avatar] || "🐑";
  const sendTo = (to, data) => { try { ws.send(JSON.stringify({ t: "to", to, data })); } catch (e) {} };
  const hostSend = (m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
  const save = (v) => { try { v ? sessionStorage.setItem(SAVE, JSON.stringify(v)) : sessionStorage.removeItem(SAVE); } catch (e) {} };
  const serverNow = () => Date.now() + offset;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const cast = () => players.filter((p) => !p.audience);
  const byId = (id) => players.find((p) => p.id === id);
  const names = (ids) => { const n = ids.map((id) => (byId(id) || {}).name).filter(Boolean); return n.length < 2 ? n.join("") : `${n.slice(0, -1).join(", ")} and ${n.at(-1)}`; };
  const nth = (n) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const isLost = (id) => !!(game && game.lost.has(id));

  /* ---------- Barnabas's voice: the device's own speech, read along with his bubble ---------- */
  let voice = null;
  function chooseVoice() {
    if (!("speechSynthesis" in window)) return;
    const all = speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang));
    const like = ["Google US English", "Samantha", "Aaron", "Microsoft Guy", "Microsoft Aria", "Alex", "Daniel", "Google UK English Male"];
    voice = like.map((n) => all.find((v) => v.name.includes(n))).find(Boolean) || all.find((v) => /en-US/i.test(v.lang)) || all[0] || null;
  }
  if ("speechSynthesis" in window) { chooseVoice(); speechSynthesis.addEventListener("voiceschanged", chooseVoice); }
  /** Barnabas says a line: his bubble types it and, with the voice on, the TV reads it. Resolves when both are done. */
  function host(text, opts) {
    opts = opts || {};
    return Promise.all([say(text, { mood: opts.mood || "happy", hold: 0 }), speak(opts.spoken || text)]);
  }
  function speak(text) {
    if (!prefs.voice || !("speechSynthesis" in window) || THP.Sound.isMuted()) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ""));
        if (voice) u.voice = voice;
        u.rate = 1.04; u.pitch = 1.1;
        const guard = setTimeout(resolve, 1500 + text.length * 90); // some browsers never fire "end"
        u.onend = u.onerror = () => { clearTimeout(guard); resolve(); };
        speechSynthesis.speak(u);
      } catch (e) { resolve(); }
    });
  }
  const hush = () => { try { "speechSynthesis" in window && speechSynthesis.cancel(); } catch (e) {} };

  /* ---------- Steps: every timed part of the game runs as a step; starting a new one cancels the old ---------- */
  function step() { clearTimeout(timer); return ++stepToken; }
  const live = (token) => token === stepToken;
  const wait = (ms, token) => new Promise((r) => { clearTimeout(timer); timer = setTimeout(() => r(live(token)), ms); });
  /** A countdown bar on the TV; resolves when time is up or `until()` says everyone is done. */
  function countdown(bar, secs, token, until) {
    return new Promise((resolve) => {
      const fill = bar && bar.firstChild, end = Date.now() + secs * 1000;
      const tick = () => {
        if (!live(token)) return resolve(false);
        const left = end - Date.now();
        if (fill) fill.style.transform = `scaleX(${Math.max(0, left) / (secs * 1000)})`;
        if (left <= 0 || (until && until())) return resolve(true);
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  /* ---------- Starting ---------- */
  async function screen() {
    S("tap");
    $("#hud").hidden = true;
    ending = false;
    THP.Music.play("manna");
    setMood("happy");
    show(el("section", { class: "huddle-screen" }, el("h2", { class: "screen-title" }, "Holy Huddle"), el("p", { class: "section-help" }, "Setting up a room...")), { scene: "huddle" });
    let r = saved();
    if (r) {
      const still = await fetch(`${BASE}/api/rooms/${r.code}`).then((x) => x.ok).catch(() => false);
      if (!still) r = null;
    }
    if (!r) {
      r = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game: "holy-trivia" }) })
        .then((x) => (x.ok ? x.json() : null)).catch(() => null);
    }
    if (!r || !r.code) return offline();
    save({ code: r.code, hostKey: r.hostKey });
    room = { code: r.code, hostKey: r.hostKey };
    players = []; game = null;
    connect();
    lobby();
    host(`Grab your phones! Scan the code, or go to ${JOIN_TEXT}.`, { spoken: "Grab your phones and scan the code to join the huddle!" });
  }

  function offline() {
    show(el("section", { class: "huddle-screen" },
      el("h2", { class: "screen-title" }, "Holy Huddle"),
      el("p", { class: "section-help" }, "Holy Huddle needs the internet, and this copy of the game can't reach it."),
      el("p", { class: "huddle-tip" }, `Open the game at ${JOIN_TEXT}/tv (or on itch.io) on the TV, then try again.`),
      el("div", { class: "btn-row" }, el("button", { class: "btn btn-go", onclick: screen }, "Try again"), el("button", { class: "btn btn-ghost", onclick: leave }, "Back"))), { scene: "huddle" });
    say("Hmm, I can't reach the Huddle. Check the internet?", { mood: "worried" });
  }

  function connect() {
    const line = new WebSocket(`${BASE.replace(/^http/, "ws")}/ws/${room.code}?role=host&key=${encodeURIComponent(room.hostKey)}`);
    ws = line;
    line.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onMessage(m); };
    line.onclose = () => {
      if (ws !== line || ending) return;
      retry++;
      setStatus("Reconnecting to the Huddle...");
      setTimeout(() => { if (!ending && ws === line) connect(); }, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
    };
  }

  /* ---------- Messages from the server ---------- */
  const GREET = ["Welcome to the huddle, {name}!", "{name} is in the house!", "Ayy, {name}! Let's go!", "{name} just walked in. Love to see it.", "Look who's here: {name}!"];
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
        if (game) { game.scores[p.id] = game.scores[p.id] || 0; if (game.race && !p.audience && !(p.id in game.race.pos)) game.race.pos[p.id] = 0; }
        if (phase === "lobby") { S("correct"); say(pick(GREET).replace("{name}", p.name)); }
        resendScreen(p.id);
      }
      if (ev.kind === "back" && p) resendScreen(p.id);
      if (ev.kind === "kick" && phase === "lobby") say(`${ev.name} has left the huddle.`);
      if (ev.kind === "host-connected" && had) players.forEach((x) => x.connected && resendScreen(x.id));
      refresh();
      return;
    }
    if (m.t === "input") return onInput(m);
    if (m.t === "replaced") { ending = true; save(null); setStatus("This room opened on another screen."); }
  }

  function onInput(m) {
    const d = m.data || {}, isVip = m.id === room.vip;
    if (d.type === "start" && isVip && phase === "lobby") return startGame();
    if (d.type === "vip" && isVip) {
      if (d.action === "skip" && phase === "intro") return skipIntro();
      if (d.action === "next" && phase === "scores") return next();
      if (d.action === "again" && phase === "final") return startGame(true);
      if (d.action === "lobby" && phase === "final") return backToLobby();
      return;
    }
    if (!game || d.round !== game.roundId) return;
    if (game.collect && game.collect(m.id, d, m.at) !== false) { refresh(); sendTo([m.id], screenFor(m.id)); }
  }

  /* ---------- What each phone should show (also resent when a phone rejoins) ---------- */
  function standing(id) {
    const order = ranking();
    const i = order.findIndex((p) => p.id === id);
    return i < 0 ? null : { place: i + 1, of: order.length, points: game.scores[id] || 0 };
  }
  function screenFor(id) {
    const p = byId(id);
    if (!game || phase === "lobby") return { screen: "lobby" };
    const lost = isLost(id);
    const s = baseScreen(id, p) || { screen: "wait", title: "Look at the TV!" };
    return Object.assign({ lost }, s);
  }
  function baseScreen(id, p) {
    const lookTV = { screen: "wait", title: "Look at the TV!" };
    if (phase === "intro") return { screen: "wait", title: "Barnabas is explaining the game", text: "Look at the TV! 👀", vip: { label: "Skip the intro", action: "skip" } };
    if (phase === "card") return { screen: "wait", title: `Question ${game.i + 1} of ${QUESTIONS}`, text: game.q.cat || "" };
    if (phase === "question") return id in game.picks ? { screen: "wait", title: "Locked in!", text: "Waiting for everyone else..." } : game.screen;
    if (phase === "reveal") return game.results[id] || lookTV;
    if (phase === "trial" || phase === "trialIntro" || phase === "trialResult") {
      const t = game.trial;
      if (phase === "trialResult" && t.results[id]) return t.results[id];
      if (!t.ids.includes(id)) return { screen: "wait", title: "Trial Room!", text: `${names(t.ids)} ${t.ids.length > 1 ? "are" : "is"} in the Trial Room. Watch the TV!` };
      if (phase === "trialIntro") return { screen: "wait", title: "You're in the Trial Room!", text: `${t.def.name}: ${t.def.rule} Get ready...` };
      return t.done && t.done[id] ? { screen: "wait", title: "Done!", text: "Look at the TV..." } : t.screen;
    }
    if (phase === "scores") {
      const st = p && !p.audience ? standing(id) : null;
      return { screen: "wait", title: "Scoreboard", text: st ? `You're in ${nth(st.place)} with ${st.points.toLocaleString()} points.` : "Look at the TV!", vip: { label: game.i + 1 < QUESTIONS ? "Next question ▶" : "On to the finale ▶", action: "next" } };
    }
    if (phase === "raceIntro") return { screen: "wait", title: "The Race to the Narrow Gate!", text: isLost(id) ? "You start behind. Catch up to the flock to be found again!" : "Get ready to run!" };
    if (phase === "race") {
      if (!p || p.audience) return lookTV;
      return id in game.race.picks ? { screen: "wait", title: "Locked in!", text: "Waiting for everyone else..." } : game.race.screen;
    }
    if (phase === "raceReveal") return game.race.results[id] || lookTV;
    if (phase === "final") {
      const place = game.finalOrder.findIndex((x) => x.id === id) + 1;
      return { screen: "final", place: place || null, points: place ? game.scores[id] || 0 : null, of: game.finalOrder.length, audience: !place, vip: [{ label: "Play again", action: "again" }, { label: "Back to the lobby", action: "lobby" }] };
    }
    return null;
  }
  const resendScreen = (id) => sendTo([id], screenFor(id));
  const sendAll = () => players.forEach((p) => p.connected && resendScreen(p.id));

  /* ---------- The lobby ---------- */
  function setStatus(text) { const s = node && node.querySelector(".huddle-status"); if (s) s.textContent = text; }
  function qrSvg(text) {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    } catch (e) { return ""; }
  }
  function lobby() {
    phase = "lobby";
    step();
    const link = `${BASE}/?room=${room.code}`;
    const qr = el("div", { class: "huddle-qr", role: "img", "aria-label": `QR code to join room ${room.code}` });
    qr.innerHTML = qrSvg(link);
    const levelBtns = el("div", { class: "huddle-levels", role: "group", "aria-label": "Level" }, ...[1, 2, 3].map((l) =>
      el("button", { class: "huddle-level", "aria-pressed": prefs.level === l ? "true" : "false", onclick: (e) => {
        S("tap"); prefs.level = l; savePrefs();
        levelBtns.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === e.currentTarget ? "true" : "false"));
      } }, el("b", {}, LEVELS[l].name), el("small", {}, LEVELS[l].ages))));
    const voiceBtn = el("button", { class: "btn btn-ghost huddle-voice", onclick: () => {
      S("tap"); prefs.voice = !prefs.voice; savePrefs(); if (!prefs.voice) hush();
      voiceBtn.textContent = prefs.voice ? "🗣 Voice on" : "🔇 Voice off";
    } }, prefs.voice ? "🗣 Voice on" : "🔇 Voice off");
    node = el("section", { class: "huddle-screen huddle-lobby" },
      el("div", { class: "huddle-join" },
        el("p", { class: "eyebrow" }, "Holy Huddle"),
        el("h2", { class: "screen-title" }, "Join on your phone!"),
        qr,
        el("p", { class: "huddle-url" }, "or go to ", el("b", {}, JOIN_TEXT)),
        el("div", { class: "huddle-code", "aria-label": `Room code ${room.code.split("").join(" ")}` }, ...room.code.split("").map((c) => el("span", {}, c))),
        el("p", { class: "huddle-status", "aria-live": "polite" })),
      el("div", { class: "huddle-side" },
        el("div", { class: "huddle-players", "aria-live": "polite" }),
        el("p", { class: "huddle-aud" }),
        el("p", { class: "huddle-hint" }),
        levelBtns,
        el("div", { class: "btn-row" },
          el("button", { class: "btn btn-go huddle-start", onclick: () => startGame() }, "▶ Start the game"),
          voiceBtn,
          el("button", { class: "btn btn-ghost huddle-lock", onclick: () => { S("tap"); hostSend({ t: "lock", locked: !room.locked }); } }, "🔒 Lock"),
          el("button", { class: "btn btn-ghost", onclick: () => { S("tap"); leave(); } }, "End"))));
    show(node, { scene: "huddle" });
    sendAll();
    refresh();
  }

  function refresh() {
    if (!node || !node.isConnected) return;
    if (phase === "lobby") {
      const list = node.querySelector(".huddle-players");
      const c = cast();
      list.replaceChildren(...c.map((p) => tile(p)), ...Array.from({ length: Math.max(0, 8 - c.length) }, () => el("div", { class: "huddle-tile empty", "aria-hidden": "true" }, el("span", { class: "face" }, "?"))));
      const aud = players.filter((p) => p.audience);
      node.querySelector(".huddle-aud").textContent = aud.length ? `+ ${aud.length} in the audience` : "";
      const vip = byId(room.vip);
      node.querySelector(".huddle-hint").textContent = c.length
        ? (vip ? `${vip.name} is the VIP 👑 and can start from their phone. Click a player to remove them.` : "")
        : "Waiting for players... (up to 8, then the audience)";
      node.querySelector(".huddle-start").disabled = !c.length;
      node.querySelector(".huddle-lock").textContent = room.locked ? "🔓 Unlock" : "🔒 Lock";
      return;
    }
    if (game && game.onRefresh) game.onRefresh();
  }
  function tile(p) {
    const t = el("button", { class: "huddle-tile pop-in" + (p.connected ? "" : " away") + (p.id === room.vip ? " vip" : ""), "aria-label": `${p.name}${p.connected ? "" : " (away)"}. Click to remove.`,
      onclick: () => {
        if (t.classList.contains("confirm")) { S("tap"); hostSend({ t: "kick", id: p.id }); return; }
        t.classList.add("confirm");
        t.querySelector(".name").textContent = "Remove?";
        setTimeout(() => { if (t.isConnected) { t.classList.remove("confirm"); t.querySelector(".name").textContent = p.name; } }, 3000);
      } },
      el("span", { class: "face", "aria-hidden": "true" }, face(p)),
      el("span", { class: "name" }, p.name),
      el("span", { class: "pts" }, p.id === room.vip ? "👑 VIP" : !p.connected ? "away" : "ready"));
    return t;
  }
  /** A player's chip on the TV: their animal and name, misted over when they're a Lost Sheep. */
  const chip = (p, extra) => el("span", { class: "huddle-chip pop-in" + (isLost(p.id) ? " lost" : ""), title: p.name }, face(p), " ", p.name, extra || "");

  /* ---------- The game ---------- */
  function dealQuestions(level) {
    let pool = THP.QUESTIONS.filter((q) => q.lvl === level && q.a.length === 4 && !used.has(q.q));
    if (pool.length < QUESTIONS) { used.clear(); pool = THP.QUESTIONS.filter((q) => q.lvl === level && q.a.length === 4); }
    const out = [], cats = new Set();
    // Spread the categories: no two from the same one until the pool runs short.
    for (const q of shuffle(pool.slice())) { if (out.length < QUESTIONS && !cats.has(q.cat)) { out.push(q); cats.add(q.cat); } }
    for (const q of shuffle(pool.slice())) { if (out.length < QUESTIONS && !out.includes(q)) out.push(q); }
    out.forEach((q) => used.add(q.q));
    return out;
  }

  function startGame(again) {
    if (!cast().length || (phase !== "lobby" && phase !== "final")) return;
    S("fanfare");
    hush();
    game = { level: prefs.level, qs: dealQuestions(prefs.level), i: -1, scores: {}, lost: new Set(), roundId: 0, trialsLeft: [], lastRank: {}, gained: {}, picks: {}, results: {} };
    players.forEach((p) => { game.scores[p.id] = 0; });
    if (again) return next();
    intro();
  }

  /* --- Barnabas explains the game --- */
  async function intro() {
    phase = "intro";
    const token = step();
    THP.Music.play("strut");
    const aud = players.filter((p) => p.audience).length;
    const card = el("div", { class: "huddle-introcard" },
      el("p", { class: "eyebrow" }, "Holy Huddle"),
      el("h2", { class: "huddle-big" }, "How to play"),
      el("ol", { class: "huddle-rules" },
        el("li", {}, el("b", {}, "📱"), "Answer each question on your phone. Fast and right scores the most."),
        el("li", {}, el("b", {}, "⚖️"), "Miss one? Off to the Trial Room for a quick challenge."),
        el("li", {}, el("b", {}, "🐑"), "Lose the challenge and you're a Lost Sheep. You still play!"),
        el("li", {}, el("b", {}, "🚪"), "The finale: race to the Narrow Gate. Lost Sheep must catch the flock to be found."),
        el("li", {}, el("b", {}, "👑"), "First one through the gate wins!")));
    node = el("section", { class: "huddle-screen huddle-intro" }, card,
      el("div", { class: "btn-row" }, el("button", { class: "btn btn-ghost", onclick: () => { S("tap"); skipIntro(); } }, "Skip ⏭")));
    show(node, { scene: "huddle" });
    sendAll();
    const rules = [...card.querySelectorAll("li")];
    const lines = [
      [null, "Welcome to the Holy Huddle! I'm Barnabas, your host. Think of me as the dealer: I deal the questions, you bring the brains."],
      [0, `Here's how it works. I ask ${QUESTIONS} Bible questions, and you answer on your phone. Right answers score points, and faster scores more.`],
      [1, "Miss a question? You're headed to the Trial Room, for a quick challenge with everybody else who missed."],
      [2, "Lose the challenge, and you become a Lost Sheep. Don't worry, Lost Sheep keep playing. Nobody sits out!"],
      [3, "At the end, everybody races to the Narrow Gate. Lost Sheep start behind, but if you catch up to the flock, you're found again!"],
      [4, `First one through the gate wins.${aud ? " Audience, play along for bragging rights!" : ""} ${LEVELS[game.level].say}`],
    ];
    for (const [ri, text] of lines) {
      if (!live(token)) return;
      if (ri != null) { rules[ri].classList.add("on"); S("tap"); }
      await Promise.all([host(text), sleep(1800)]);
      await sleep(400);
    }
    if (!live(token)) return;
    await host("Phones ready? Let's huddle up!");
    if (live(token)) next();
  }
  function skipIntro() { if (phase !== "intro") return; hush(); next(); }

  /* --- one question: the card, the question, the reveal, any trial, the scoreboard --- */
  async function next() {
    const token = step();
    hush();
    if (game.i + 1 >= QUESTIONS) return raceIntro();
    game.i++;
    game.q = game.qs[game.i];
    game.picks = {}; game.results = {}; game.collect = null; game.onRefresh = null;
    phase = "card";
    THP.Music.play("jericho");
    node = el("section", { class: "huddle-screen huddle-card" },
      el("p", { class: "eyebrow" }, game.q.cat || "Bible trivia"),
      el("h2", { class: "huddle-big" }, `Question ${game.i + 1}`),
      el("p", { class: "huddle-of" }, `of ${QUESTIONS}`));
    show(node, { scene: "huddle" });
    S("whoosh");
    sendAll();
    if (await wait(1700, token)) ask(token);
  }

  async function ask(token) {
    const q = game.q, secs = LEVELS[game.level].seconds;
    const options = shuffle(q.a.slice());
    game.roundId++;
    game.options = options;
    game.right = options.indexOf(q.a[0]);
    game.screen = { screen: "choices", round: game.roundId, prompt: q.q, options, seconds: secs };
    phase = "question";
    const bar = el("div", { class: "huddle-timer" }, el("i"));
    node = el("section", { class: "huddle-screen huddle-question" },
      el("p", { class: "eyebrow" }, `Question ${game.i + 1} of ${QUESTIONS} · ${q.cat || ""}`),
      el("h2", { class: "huddle-q" }, q.q),
      bar,
      el("div", { class: "huddle-options" }, ...options.map((o, i) => el("div", { class: `huddle-opt gem-${i}` }, el("b", { "aria-hidden": "true" }, KEYS[i]), el("span", {}, o), el("span", { class: "huddle-who" })))),
      el("p", { class: "huddle-sub huddle-count" }),
      el("div", { class: "huddle-answered", "aria-live": "polite" }));
    show(node, { scene: "huddle" });
    game.startedAt = serverNow();
    const everyone = () => players.filter((p) => p.connected);
    game.collect = (id, d, at) => {
      if (d.type !== "pick" || id in game.picks || typeof d.pick !== "number" || d.pick < 0 || d.pick > 3) return false;
      game.picks[id] = { pick: d.pick, ms: Math.max(0, at - game.startedAt) };
      S("tick");
    };
    game.onRefresh = () => {
      const got = node.querySelector(".huddle-answered");
      if (got) got.replaceChildren(...cast().filter((p) => p.id in game.picks).map((p) => chip(p)));
      const count = node.querySelector(".huddle-count");
      if (count) count.textContent = `${Object.keys(game.picks).length} of ${everyone().length} answered`;
    };
    sendAll();
    refresh();
    // Read the question (and the choices for the youngest level) out loud.
    speak(game.level === 1 ? `${q.q} Is it: ${options.slice(0, -1).join(", ")}, or ${options.at(-1)}?` : q.q);
    say(pick(["Phones out! Lock it in!", "Clock's ticking, huddle!", "Think fast!", "Tap tap tap!", "You got this!"]));
    if (await countdown(bar, secs, token, () => everyone().every((p) => p.id in game.picks))) reveal(token);
  }

  function ranking() {
    return cast().slice().sort((a, b) => (game.scores[b.id] || 0) - (game.scores[a.id] || 0) || a.joinedAt - b.joinedAt);
  }

  async function reveal(token) {
    phase = "reveal";
    game.collect = null; game.onRefresh = null;
    const right = game.right, secs = LEVELS[game.level].seconds;
    game.lastRank = Object.fromEntries(ranking().map((p, i) => [p.id, i + 1]));
    game.gained = {};
    players.forEach((p) => {
      const got = game.picks[p.id], good = !!got && got.pick === right;
      // 500 for a right answer, up to 500 more for speed.
      const pts = good ? 500 + Math.round(500 * Math.max(0, 1 - got.ms / (secs * 1000))) : 0;
      if (!p.audience) game.scores[p.id] = (game.scores[p.id] || 0) + pts;
      game.gained[p.id] = pts;
    });
    // Who goes to the Trial Room: players still in the flock who missed (and are here to play).
    const trialIds = cast().filter((p) => p.connected && !game.lost.has(p.id) && !(game.picks[p.id] && game.picks[p.id].pick === right)).map((p) => p.id);
    players.forEach((p) => {
      const got = game.picks[p.id], good = !!got && got.pick === right;
      game.results[p.id] = {
        screen: "result", good, points: p.audience ? null : game.gained[p.id],
        title: good ? pick(["Correct!", "Nailed it!", "Yes!"]) : got ? "Not quite" : "Too slow!",
        text: `It was: ${game.options[right]}` + (trialIds.includes(p.id) ? " · Off to the Trial Room!" : ""),
      };
    });
    sendAll();
    // On the TV: the right answer lights up, and every animal shows on the answer it picked.
    [...node.querySelectorAll(".huddle-opt")].forEach((o, i) => {
      o.classList.add(i === right ? "right" : "wrong");
      o.querySelector(".huddle-who").replaceChildren(...cast().filter((p) => game.picks[p.id] && game.picks[p.id].pick === i).map((p) => el("span", { title: p.name, class: isLost(p.id) ? "lost" : "" }, face(p))));
    });
    node.querySelector(".huddle-timer").remove();
    const winners = cast().filter((p) => game.gained[p.id] > 0).sort((a, b) => game.picks[a.id].ms - game.picks[b.id].ms);
    const audPicks = players.filter((p) => p.audience && game.picks[p.id]);
    const audRight = audPicks.filter((p) => game.picks[p.id].pick === right).length;
    node.querySelector(".huddle-count").textContent = winners.length
      ? `${winners.length} got it! Fastest: ${winners[0].name} (${(game.picks[winners[0].id].ms / 1000).toFixed(1)}s)`
      : "Nobody got that one!";
    node.querySelector(".huddle-answered").replaceChildren(audPicks.length ? el("span", { class: "huddle-chip" }, `Audience: ${Math.round((100 * audRight) / audPicks.length)}% right`) : "");
    S(winners.length ? "correct" : "wrong");
    await host(`The answer is ${game.options[right]}!${game.q.fact ? " " + game.q.fact : ""}`, { mood: winners.length ? "happy" : "worried" });
    if (!(await wait(900, token))) return;
    if (trialIds.length) return trialRoom(trialIds, token);
    scores(token);
  }

  /* ---------- The Trial Room: quick challenges for whoever missed ---------- */
  const TRIALS = {
    jericho: {
      name: "Walls of Jericho", icon: "🎺", rule: "Tap as fast as you can to bring the walls down!",
      say: (solo) => solo ? "Walls of Jericho! Tap your phone as fast as you can. Hit 25 taps to bring the wall down!" : "Walls of Jericho! Tap your phone as fast as you can. The slowest tapper is lost!",
    },
    oil: {
      name: "Who Has Oil?", icon: "🪔", rule: "Pick a lamp. One of them has run out of oil!",
      say: () => "Who has oil? Pick a lamp on your phone. One of these lamps is empty. Choose wisely!",
    },
    order: {
      name: "In Order!", icon: "🔢", rule: "Tap the four in the right order, first to last.",
      say: () => "In order! Tap these four in the right order, first to last. Get it wrong and you're lost!",
    },
    count: {
      name: "Loaves and Fishes", icon: "🐟", rule: "Count the fish on the TV before they swim away!",
      say: () => "Loaves and fishes! Count the FISH on the TV. Quick, before they swim away!",
    },
  };
  const ORDER_SETS = [
    ["David's story", ["Shepherd boy", "Anointed by Samuel", "Beats Goliath", "Becomes king"]],
    ["Jesus' life", ["Born in Bethlehem", "Baptized in the Jordan", "Feeds the 5,000", "Rises again"]],
    ["Creation, days 1 to 4", ["Light", "Sky", "Land and plants", "Sun, moon and stars"]],
    ["Moses' story", ["Basket in the river", "The burning bush", "The plagues", "Crossing the Red Sea"]],
    ["First books of the Bible", ["Genesis", "Exodus", "Leviticus", "Numbers"]],
    ["The Gospels", ["Matthew", "Mark", "Luke", "John"]],
    ["Joseph's story", ["The colorful coat", "Sold by his brothers", "Explains Pharaoh's dreams", "Forgives his brothers"]],
    ["Jonah's story", ["Runs from God", "The great storm", "Inside the fish", "Preaches in Nineveh"]],
  ];

  async function trialRoom(ids, token) {
    if (!game.trialsLeft.length) game.trialsLeft = shuffle(Object.keys(TRIALS));
    // For testing: /tv?trials=jericho,order plays those trials first, in that order.
    const forced = (new URLSearchParams(location.search).get("trials") || "").split(",").filter((k) => TRIALS[k]);
    if (forced.length && !game.forcedDone) { game.trialsLeft = forced.concat(game.trialsLeft.filter((k) => !forced.includes(k))); game.forcedDone = true; }
    const kind = game.trialsLeft.shift(), def = TRIALS[kind], solo = ids.length === 1;
    game.roundId++;
    game.trial = { kind, def, ids, results: {}, done: {}, screen: null };
    phase = "trialIntro";
    THP.Music.play("redsea");
    S("trial");
    node = el("section", { class: "huddle-screen huddle-trial" },
      el("p", { class: "huddle-trialtag" }, "⚖️ TRIAL ROOM"),
      el("h2", { class: "huddle-big" }, `${def.icon} ${def.name}`),
      el("p", { class: "huddle-sub" }, def.rule),
      el("div", { class: "huddle-answered" }, ...ids.map((id) => chip(byId(id)))));
    show(node, { scene: "trial" });
    sendAll();
    await Promise.all([host(`${names(ids)}, welcome to the Trial Room! ${def.say(solo)}`, { mood: "worried" }), sleep(2500)]);
    if (!live(token)) return;
    phase = "trial";
    const lost = await RUN[kind](ids, token, solo);
    if (!live(token) || !lost) return;
    trialResult(ids, lost, token);
  }

  /** Every trial: sends its screen to the players in it, draws on the TV, and resolves with who's lost. */
  const RUN = {
    async jericho(ids, token, solo) {
      const t = game.trial, secs = 7, target = 25;
      const taps = Object.fromEntries(ids.map((id) => [id, 0]));
      t.screen = { screen: "tap", round: game.roundId, title: "Walls of Jericho", text: "TAP as fast as you can!", seconds: secs, label: "🎺 TAP!" };
      const wall = el("div", { class: "huddle-walls" }, ...ids.map((id) => el("div", { class: "huddle-wall", "data-id": id },
        el("div", { class: "bar" }, el("i")), el("span", { class: "n" }, "0"), chip(byId(id)))));
      const bar = el("div", { class: "huddle-timer" }, el("i"));
      node.append(bar, wall);
      game.collect = (id, d) => { if (d.type !== "taps" || !(id in taps)) return false; taps[id] = Math.max(taps[id], Math.min(200, d.n | 0)); refreshWalls(); return false; };
      const best = () => Math.max(target, ...Object.values(taps));
      const refreshWalls = () => wall.querySelectorAll(".huddle-wall").forEach((w) => {
        const n = taps[w.dataset.id];
        w.querySelector(".bar i").style.transform = `scaleY(${Math.min(1, n / best())})`;
        w.querySelector(".n").textContent = n;
      });
      sendAll();
      await countdown(bar, secs, token);
      await sleep(700); // last tap counts arrive
      game.collect = null;
      if (!live(token)) return null;
      if (solo) return taps[ids[0]] < target ? ids : [];
      const low = Math.min(...ids.map((id) => taps[id]));
      const lowest = ids.filter((id) => taps[id] === low);
      return lowest.length === ids.length ? [] : lowest;
    },
    async oil(ids, token) {
      const t = game.trial, secs = 10;
      const chosen = {};
      t.screen = { screen: "choices", round: game.roundId, prompt: "Pick a lamp. One is out of oil!", options: ["🪔 Lamp 1", "🪔 Lamp 2", "🪔 Lamp 3", "🪔 Lamp 4"], seconds: secs };
      const lamps = el("div", { class: "huddle-lamps" }, ...[0, 1, 2, 3].map((i) => el("div", { class: "huddle-lamp" }, el("span", { class: "flame" }, "🪔"), el("b", {}, `Lamp ${i + 1}`), el("div", { class: "huddle-who" }))));
      const bar = el("div", { class: "huddle-timer" }, el("i"));
      node.append(bar, lamps);
      game.collect = (id, d) => { if (d.type !== "pick" || !ids.includes(id) || id in chosen || d.pick < 0 || d.pick > 3) return false; chosen[id] = d.pick; t.done[id] = true; S("tick"); };
      sendAll();
      await countdown(bar, secs, token, () => ids.every((id) => id in chosen));
      game.collect = null;
      if (!live(token)) return null;
      const empty = Math.floor(Math.random() * 4);
      [...lamps.children].forEach((l, i) => {
        l.querySelector(".huddle-who").replaceChildren(...ids.filter((id) => chosen[id] === i).map((id) => el("span", {}, face(byId(id)))));
        l.classList.add(i === empty ? "empty" : "lit");
      });
      bar.remove();
      S("whoosh");
      return ids.filter((id) => !(id in chosen) || chosen[id] === empty);
    },
    async order(ids, token) {
      const t = game.trial, secs = 20;
      const [title, items] = pick(ORDER_SETS);
      const shown = shuffle(items.map((_, i) => i));
      const got = {};
      t.screen = { screen: "order", round: game.roundId, title, items: shown.map((i) => items[i]), seconds: secs };
      const bar = el("div", { class: "huddle-timer" }, el("i"));
      const status = el("div", { class: "huddle-answered" }, ...ids.map((id) => chip(byId(id), " ⏳")));
      node.append(el("p", { class: "huddle-q" }, title), bar, status);
      game.collect = (id, d) => {
        if (d.type !== "order" || !ids.includes(id) || id in got || !Array.isArray(d.seq)) return false;
        got[id] = d.seq.map((k) => shown[k]); t.done[id] = true; S("tick");
        status.replaceChildren(...ids.map((x) => chip(byId(x), x in got ? " ✓" : " ⏳")));
      };
      sendAll();
      await countdown(bar, secs, token, () => ids.every((id) => id in got));
      game.collect = null;
      if (!live(token)) return null;
      bar.remove();
      node.append(el("ol", { class: "huddle-order" }, ...items.map((it) => el("li", {}, it))));
      const ok = (id) => got[id] && got[id].length === items.length && got[id].every((v, i) => v === i);
      return ids.filter((id) => !ok(id));
    },
    async count(ids, token) {
      const t = game.trial, secs = 9;
      const fish = 4 + Math.floor(Math.random() * 6), loaves = 3 + Math.floor(Math.random() * 5);
      const field = el("div", { class: "huddle-field", "aria-label": "Loaves and fish" }, ...shuffle([...Array(fish).fill("🐟"), ...Array(loaves).fill("🍞")]).map((e) =>
        el("span", { style: `transform: rotate(${Math.round(Math.random() * 40 - 20)}deg)` }, e)));
      node.append(el("p", { class: "huddle-q" }, "How many FISH?"), field);
      sendAll(); // phones wait while everyone looks
      if (!(await wait(4500, token))) return null;
      field.classList.add("gone");
      S("whoosh");
      const opts = shuffle([fish, fish - 1, fish + 1, fish + 2].filter((n, i, a) => n > 0 && a.indexOf(n) === i)).slice(0, 4);
      while (opts.length < 4) opts.push(Math.max(...opts) + 1);
      const sorted = opts.slice().sort((a, b) => a - b);
      const chosen = {};
      t.screen = { screen: "choices", round: game.roundId, prompt: "How many fish were there?", options: sorted.map(String), seconds: secs };
      const bar = el("div", { class: "huddle-timer" }, el("i"));
      node.append(bar);
      game.collect = (id, d) => { if (d.type !== "pick" || !ids.includes(id) || id in chosen) return false; chosen[id] = sorted[d.pick]; t.done[id] = true; S("tick"); };
      sendAll();
      await countdown(bar, secs, token, () => ids.every((id) => id in chosen));
      game.collect = null;
      if (!live(token)) return null;
      bar.remove();
      field.classList.remove("gone");
      field.classList.add("show-fish");
      node.querySelector(".huddle-q").textContent = `There were ${fish} fish!`;
      return ids.filter((id) => chosen[id] !== fish);
    },
  };
  // During a trial, phones that aren't in it, and phones that are, get their screens from screenFor (above).

  async function trialResult(ids, lostNow, token) {
    phase = "trialResult";
    lostNow.forEach((id) => game.lost.add(id));
    const safe = ids.filter((id) => !lostNow.includes(id));
    ids.forEach((id) => {
      game.trial.results[id] = lostNow.includes(id)
        ? { screen: "result", good: false, title: "You're a Lost Sheep! 🐑", text: "Keep answering! In the finale, catch up to the flock to be found again." }
        : { screen: "result", good: true, title: "You made it!", text: "Safe for now. Back to the questions!" };
    });
    sendAll();
    node.append(el("div", { class: "huddle-verdict" },
      safe.length ? el("p", { class: "safe" }, "Safe: ", ...safe.map((id) => chip(byId(id)))) : null,
      lostNow.length ? el("p", { class: "lostline" }, "Lost Sheep: ", ...lostNow.map((id) => chip(byId(id)))) : null));
    if (lostNow.length) { S("lose"); await host(`Oh no! ${names(lostNow)} ${lostNow.length > 1 ? "are" : "is"} now a Lost Sheep. Baa! But keep playing, you can still be found!`, { mood: "worried" }); }
    else { S("win"); await host(pick(["Everybody survived! Back to the questions.", "Phew! Nobody lost. Nice work!", "All safe! The flock stays together."])); }
    if (await wait(1500, token)) scores(token);
  }

  async function scores(token) {
    phase = "scores";
    game.collect = null; game.onRefresh = null;
    const order = ranking();
    const lastQ = game.i + 1 >= QUESTIONS;
    const rows = order.map((p, i) => {
      const was = game.lastRank[p.id] || i + 1, move = was - (i + 1), g = game.gained[p.id] || 0;
      return el("li", { class: "huddle-row pop-in" + (i === 0 ? " lead" : "") + (isLost(p.id) ? " lost" : ""), style: `animation-delay:${i * 80}ms` },
        el("span", { class: "rank" }, i + 1),
        el("span", { class: "face", "aria-hidden": "true" }, face(p)),
        el("span", { class: "name" }, p.name, isLost(p.id) ? el("small", {}, " Lost Sheep") : ""),
        el("span", { class: "move " + (move > 0 ? "up" : move < 0 ? "down" : "") }, move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : ""),
        el("span", { class: "gain" }, g ? `+${g.toLocaleString()}` : ""),
        el("span", { class: "total" }, (game.scores[p.id] || 0).toLocaleString()));
    });
    const nextBtn = el("button", { class: "btn btn-go", onclick: () => { S("tap"); next(); } }, lastQ ? "On to the finale ▶" : "Next question ▶");
    const tick = el("span", { class: "huddle-countdown" });
    node = el("section", { class: "huddle-screen huddle-scores" },
      el("p", { class: "eyebrow" }, `After question ${game.i + 1} of ${QUESTIONS}`),
      el("h2", { class: "huddle-big" }, "Scoreboard"),
      el("ol", { class: "huddle-board" }, ...rows),
      el("div", { class: "btn-row" }, nextBtn, tick));
    show(node, { scene: "huddle" });
    THP.Music.play("jericho");
    sendAll();
    const lead = order[0], before = Object.keys(game.lastRank).find((id) => game.lastRank[id] === 1);
    let line;
    if (!lead || !game.scores[lead.id]) line = "Nobody's on the board yet. Plenty of time!";
    else if (order.length === 1) line = `${lead.name}, you've got ${game.scores[lead.id].toLocaleString()} points. Keep it rolling!`;
    else if (before && before !== lead.id && game.i > 0) line = pick([`${lead.name} takes the lead!`, `New leader: ${lead.name}!`, `${lead.name} jumps into first!`]);
    else line = pick([`${lead.name} is still on top!`, `${lead.name} leads the huddle.`, `${lead.name} is out in front.`]);
    if (lastQ) line += " The top scorer gets a head start in the race!";
    host(line);
    // Moves on by itself after a few seconds; the host or the VIP can go sooner.
    for (let s = 8; s > 0; s--) {
      tick.textContent = `Next in ${s}...`;
      if (!(await wait(1000, token))) return;
    }
    next();
  }

  /* ---------- The finale: the Race to the Narrow Gate ---------- */
  async function raceIntro() {
    const token = step();
    phase = "raceIntro";
    THP.Music.play("gate");
    const runners = cast();
    // If everyone is lost, the whole flock is found again for the race.
    if (runners.length && runners.every((p) => game.lost.has(p.id))) game.lost.clear();
    const top = ranking()[0];
    const pos = {};
    runners.forEach((p) => { pos[p.id] = game.lost.has(p.id) ? 0 : 2; });
    if (top && !game.lost.has(top.id) && game.scores[top.id] > 0) pos[top.id] = 3;
    game.race = { pos, round: 0, picks: {}, results: {}, screen: null, winner: null, prompts: shuffle(THP.FINAL_PROMPTS.filter((f) => game.level > 1 || !f.hard)) };
    node = el("section", { class: "huddle-screen huddle-race" },
      el("p", { class: "eyebrow" }, "The finale"),
      el("h2", { class: "huddle-big" }, "🚪 Race to the Narrow Gate"),
      el("ol", { class: "huddle-rules" },
        el("li", { class: "on" }, el("b", {}, "✅"), "Tap ALL the answers that fit. Each right one moves you a step."),
        el("li", { class: "on" }, el("b", {}, "❌"), "Each wrong one costs you a step. Don't just tap everything!"),
        el("li", { class: "on" }, el("b", {}, "🐑"), "Lost Sheep: catch up to the flock and you're found!"),
        el("li", { class: "on" }, el("b", {}, "🚪"), `First one from the flock to step ${GOAL} wins.`)),
      raceTrack());
    show(node, { scene: "final-intro" });
    sendAll();
    const lostNames = runners.filter((p) => game.lost.has(p.id)).map((p) => p.id);
    await host(`It's the final round! The Race to the Narrow Gate. Tap all the answers that fit, but every wrong tap costs you a step.${top && pos[top.id] === 3 ? ` ${top.name} gets a head start for the most points.` : ""}${lostNames.length ? ` ${names(lostNames)}, you're lost, so you start at the back. Catch the flock to be found!` : ""}`);
    if (await wait(1500, token)) raceRound(token);
  }

  function raceTrack() {
    const r = game.race;
    return el("div", { class: "huddle-track" }, ...cast().map((p) => {
      const at = Math.min(GOAL, r.pos[p.id] || 0);
      return el("div", { class: "huddle-lane" + (isLost(p.id) ? " lost" : "") + (r.winner === p.id ? " won" : "") },
        el("span", { class: "lane-name" }, p.name),
        el("div", { class: "lane-path" },
          ...Array.from({ length: GOAL }, (_, i) => el("span", { class: "dot" + (i < at ? " passed" : "") })),
          el("span", { class: "lane-gate", "aria-hidden": "true" }, "🚪"),
          el("span", { class: "lane-runner", style: `left: calc(${(at / GOAL) * 100}% - 1.1rem)`, title: `${p.name}: step ${at}` }, face(p))));
    }));
  }

  async function raceRound(token) {
    const r = game.race;
    const prompt = r.prompts[r.round % r.prompts.length];
    r.round++;
    r.prompt = prompt;
    r.picks = {}; r.results = {};
    game.roundId++;
    const options = shuffle(prompt.opts.map((o, i) => ({ label: o[0], right: o[1], i })));
    r.options = options;
    const secs = game.level === 1 ? 18 : 14;
    r.screen = { screen: "multi", round: game.roundId, prompt: prompt.p, options: options.map((o) => o.label), seconds: secs };
    phase = "race";
    const bar = el("div", { class: "huddle-timer" }, el("i"));
    node = el("section", { class: "huddle-screen huddle-race" },
      el("p", { class: "eyebrow" }, `Race round ${r.round} · tap all that apply`),
      el("h2", { class: "huddle-q" }, prompt.p + (/[!?.]$/.test(prompt.p) ? "" : "!")),
      el("div", { class: "huddle-options three" }, ...options.map((o, i) => el("div", { class: `huddle-opt gem-${i}` }, el("span", {}, o.label), el("span", { class: "huddle-who" })))),
      bar, raceTrack());
    show(node, { scene: "final-screen" });
    const runners = () => cast().filter((p) => p.connected);
    game.collect = (id, d) => {
      const p = byId(id);
      if (d.type !== "multi" || !p || p.audience || id in r.picks || !Array.isArray(d.picks)) return false;
      r.picks[id] = [...new Set(d.picks.filter((k) => Number.isInteger(k) && k >= 0 && k < options.length))];
      S("tick");
    };
    sendAll();
    speak(prompt.p);
    say(pick(["Tap all that fit!", "Careful: wrong taps cost a step!", "Run, flock, run!"]));
    if (await countdown(bar, secs, token, () => runners().every((p) => p.id in r.picks))) raceReveal(token, bar);
  }

  async function raceReveal(token, bar) {
    const r = game.race;
    phase = "raceReveal";
    game.collect = null;
    bar.remove();
    [...node.querySelectorAll(".huddle-opt")].forEach((o, i) => {
      o.classList.add(r.options[i].right ? "right" : "wrong");
      o.querySelector(".huddle-who").replaceChildren(...cast().filter((p) => (r.picks[p.id] || []).includes(i)).map((p) => el("span", { title: p.name }, face(p))));
    });
    const moves = {};
    cast().forEach((p) => {
      const mine = r.picks[p.id] || [];
      const good = mine.filter((k) => r.options[k].right).length, badN = mine.length - good;
      moves[p.id] = good - badN;
      let to = Math.max(0, (r.pos[p.id] || 0) + moves[p.id]);
      if (game.lost.has(p.id)) to = Math.min(GOAL - 1, to); // Lost Sheep can't go through the gate
      r.pos[p.id] = to;
    });
    // Lost Sheep who caught up to the flock are found again.
    const flock = cast().filter((p) => !game.lost.has(p.id));
    const back = flock.length ? Math.min(...flock.map((p) => r.pos[p.id])) : Infinity;
    const found = cast().filter((p) => game.lost.has(p.id) && r.pos[p.id] >= back).map((p) => p.id);
    found.forEach((id) => game.lost.delete(id));
    // Anyone in the flock at the gate? The furthest wins; a tie goes to the higher score.
    const atGate = cast().filter((p) => !game.lost.has(p.id) && r.pos[p.id] >= GOAL).sort((a, b) => r.pos[b.id] - r.pos[a.id] || (game.scores[b.id] || 0) - (game.scores[a.id] || 0));
    if (atGate.length) r.winner = atGate[0].id;
    else if (r.round >= MAX_RACE_ROUNDS) {
      const best = cast().filter((p) => !game.lost.has(p.id)).sort((a, b) => r.pos[b.id] - r.pos[a.id] || (game.scores[b.id] || 0) - (game.scores[a.id] || 0))[0] || ranking()[0];
      if (best) r.winner = best.id;
    }
    cast().forEach((p) => {
      const m = moves[p.id];
      r.results[p.id] = { screen: "result", good: m > 0, title: m > 0 ? `+${m} step${m > 1 ? "s" : ""}!` : m < 0 ? `${m} step${m < -1 ? "s" : ""}` : "No steps", points: null,
        text: found.includes(p.id) ? "You caught the flock! You're found! 🎉" : game.lost.has(p.id) ? "Still lost. Catch the flock!" : `You're on step ${r.pos[p.id]} of ${GOAL}.` };
    });
    sendAll();
    node.querySelector(".huddle-track").replaceWith(raceTrack());
    S("step");
    if (found.length) { S("correct"); await host(`${names(found)} caught up to the flock! Found again!`); }
    if (r.winner) return finale(token);
    const leaders = cast().filter((p) => !game.lost.has(p.id)).sort((a, b) => r.pos[b.id] - r.pos[a.id]);
    const lead = leaders[0];
    if (!found.length) await host(lead ? pick([`${lead.name} is closest to the gate, at step ${r.pos[lead.id]}!`, `${lead.name} leads the race!`, "Keep running, flock!"]) : "Keep running!");
    if (await wait(2200, token)) raceRound(token);
  }

  /* ---------- The end: the podium ---------- */
  async function finale(token) {
    phase = "final";
    THP.Music.play("strut");
    const r = game.race;
    const order = cast().slice().sort((a, b) => (b.id === r.winner) - (a.id === r.winner) || r.pos[b.id] - r.pos[a.id] || (game.scores[b.id] || 0) - (game.scores[a.id] || 0));
    game.finalOrder = order;
    if (!(await wait(1200, token))) return;
    const podium = [order[1], order[0], order[2]];
    const medals = ["🥈", "🥇", "🥉"];
    node = el("section", { class: "huddle-screen huddle-final" },
      el("p", { class: "eyebrow" }, "Through the Narrow Gate"),
      el("h2", { class: "huddle-big" }, "The Huddle Crown"),
      el("div", { class: "huddle-podium" }, ...podium.map((p, i) => p ? el("div", { class: `huddle-step step-${i}` },
        el("span", { class: "face", "aria-hidden": "true" }, face(p)),
        el("span", { class: "medal", "aria-hidden": "true" }, medals[i]),
        el("span", { class: "name" }, p.name),
        el("span", { class: "total" }, i === 1 ? "🚪 Through the gate!" : `Step ${r.pos[p.id]} · ${(game.scores[p.id] || 0).toLocaleString()} pts`)) : el("div", { class: `huddle-step step-${i} empty` }))),
      order.length > 3 ? el("ol", { class: "huddle-board small", start: 4 }, ...order.slice(3).map((p, i) => el("li", { class: "huddle-row" },
        el("span", { class: "rank" }, i + 4), el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name), el("span", { class: "total" }, `Step ${r.pos[p.id]}`)))) : null,
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", onclick: () => { S("tap"); startGame(true); } }, "Play again"),
        el("button", { class: "btn btn-ghost", onclick: () => { S("tap"); backToLobby(); } }, "Back to the lobby")));
    show(node, { scene: "results" });
    sendAll();
    S("fanfare");
    const champ = order[0];
    await host(order.length > 1 ? "And through the Narrow Gate first is..." : "You made it through the gate!", { spoken: order.length > 1 ? "And through the Narrow Gate first is" : "You made it through the gate!" });
    if (!live(token) || !champ) return;
    S("win"); confetti(140);
    const step1 = node.querySelector(".step-1");
    if (step1) step1.classList.add("crowned");
    host(order.length > 1 ? `${champ.name}! The Huddle Champion! Great game, everybody.` : `Great game, ${champ.name}!`);
  }
  function backToLobby() { hush(); game = null; lobby(); host("Back in the lobby. Ready for another round?"); }

  /* ---------- Leaving ---------- */
  function leave() {
    ending = true;
    step(); hush();
    if (ws) { hostSend({ t: "end" }); setTimeout(() => { try { ws.close(); } catch (e) {} }, 300); }
    save(null);
    room = null; players = []; game = null; node = null;
    THP.game.titleScreen();
  }

  return { screen, base: BASE };
})();
