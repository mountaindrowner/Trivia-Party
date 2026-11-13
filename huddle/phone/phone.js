/* The phone page for our party games (Holy Huddle and Spark Wars; huddle/build.py makes one copy per game and sets
   <html data-game>). A phone joins a room with the code from the TV, then shows whatever screen the TV sends.
   It never runs the game: it draws screens from a small kit (lobby, wait, choices, result, message) and sends taps
   back. If the connection drops (phone locked, Wi-Fi blip) it rejoins on its own with the key it saved.
   Messages are described in huddle/PROTOCOL.md. */
(() => {
  const AVATAR_EMOJI = {
    sheep: "🐑", donkey: "🫏", lion: "🦁", dove: "🕊️", fish: "🐟", camel: "🐫", whale: "🐋", raven: "🐦", frog: "🐸", ox: "🐂", goat: "🐐", eagle: "🦅",
    bolt: "⚡", flame: "🔥", rocket: "🚀", comet: "☄️", fox: "🦊", wolf: "🐺", shark: "🦈", tiger: "🐯", panda: "🐼", owl: "🦉", octopus: "🐙", dino: "🦖",
    dragon: "🐉", robot: "🤖", alien: "👾", ghost: "👻", ball: "🏀", guitar: "🎸", skate: "🛹", pizza: "🍕", crown: "👑", gem: "💎", cactus: "🌵", eagle2: "🦅",
    tent: "⛺", moon: "🌙", star: "⭐", pine: "🌲", mountain: "🏔️", canoe: "🛶", lantern: "🏮", bear: "🐻", raccoon: "🦝", deer: "🦌", hedgehog: "🦔",
    butterfly: "🦋", mushroom: "🍄", coffee: "☕", dango: "🍡", compass: "🧭", map: "🗺️", sparkles: "✨", snail: "🐌", beaver: "🦫",
  };
  const GAME = ["spark", "bonfire"].includes(document.documentElement.dataset.game) ? document.documentElement.dataset.game : "holy";
  let BRAND = {
    spark: { name: "Spark Wars", logo: "⚡", face: "⚡", pick: "Pick your icon:", find: "Find your name on the big screen.", look: "Look at the big screen!" },
    bonfire: { name: "Bonfire", logo: "🔥", face: "🔥", pick: "Pick your campfire icon:", find: "Find your name around the fire.", look: "Look at the big screen!" },
    holy: { name: "Holy Huddle", logo: "🐑", face: "🐑", pick: "Pick your animal:", find: "Find your name on the TV.", look: "Look at the TV!" },
  }[GAME];
  /* Lights Out (a Bonfire room run from the host's phone, no TV): the night look and "the host's phone" for "the TV". */
  const nightMode = () => {
    document.documentElement.dataset.mode = "night";
    BRAND = { ...BRAND, name: "Lights Out", logo: "🌙", face: "🌙", find: "Your name is on the host's phone.", look: "Look up at the host's phone!" };
  };
  const SAVE_KEY = { spark: "sparkwars-session", bonfire: "bonfire-session", holy: "holyhuddle-session" }[GAME];
  const SESSION_HOURS = 3;
  const app = document.getElementById("app");
  const bar = document.getElementById("bar");
  const api = (path) => new URL(path, location.origin).href;
  const wsUrl = (code) => api(`/ws/${code}?role=player`).replace(/^http/, "ws");

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
  const show = (...nodes) => { app.replaceChildren(...nodes.filter(Boolean)); app.firstElementChild && app.firstElementChild.classList.add("pop"); };
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch (e) {} },
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  };
  const cleanCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

  /* ---------- State ---------- */
  let ws = null, me = null, hostOn = true, lastScreen = { screen: "lobby" }, retry = 0, retryTimer = 0, hb = 0, wake = null, leaving = false;

  /* ---------- Join screens ---------- */
  function joinScreen(prefillCode, error, prefillName) {
    const codeIn = el("input", { class: "code", id: "code", maxlength: 4, autocomplete: "off", autocapitalize: "characters", inputmode: "text", placeholder: "ABCD", value: prefillCode || "", "aria-label": "Room code" });
    const nameIn = el("input", { id: "name", maxlength: 12, autocomplete: "nickname", placeholder: "Nickname", value: prefillName != null ? prefillName : (store.get() || {}).name || "", "aria-label": "Nickname" });
    const err = el("p", { class: "err", role: "alert" }, error || "");
    const go = el("button", { type: "submit" }, "Join!");
    codeIn.addEventListener("input", () => { codeIn.value = cleanCode(codeIn.value); });
    const form = el("form", { class: "grid", style: "display:grid;gap:16px", onsubmit: async (e) => {
      e.preventDefault();
      const code = cleanCode(codeIn.value), name = nameIn.value.trim();
      if (code.length !== 4) { err.textContent = "The room code is the 4 letters on the TV."; return codeIn.focus(); }
      if (!name) { err.textContent = "Type a nickname (not your full name)."; return nameIn.focus(); }
      go.disabled = true; err.textContent = "";
      const info = await fetch(api(`/api/rooms/${code}`)).then((r) => (r.ok ? r.json() : r.status === 429 ? { slow: true } : null)).catch(() => ({ offline: true }));
      go.disabled = false;
      if (!info) { err.textContent = "No game with that code. Check the TV."; return codeIn.focus(); }
      if (info.slow) { err.textContent = "Too many tries. Wait a minute and try again."; return; }
      if (info.offline) { err.textContent = "Can't reach the game. Check your internet."; return; }
      if (info.locked) { err.textContent = "That game is locked. Ask the host to unlock it."; return; }
      if (info.game === "lights-out") nightMode();
      avatarScreen(code, name, info);
    } },
      el("label", { for: "code" }, "Room code", codeIn),
      el("label", { for: "name" }, "Nickname", nameIn),
      err, go);
    show(el("div", { class: "logo" }, el("div", { class: "sheep", "aria-hidden": "true" }, BRAND.logo), el("h1", {}, BRAND.name)),
      el("p", { class: "center soft" }, document.documentElement.dataset.mode ? "Pick a nickname to join tonight's game." : "Type the code on the TV and pick a nickname."), form,
      el("p", { class: "foot" }, "Only your nickname is used, and it's gone when the game ends."));
    (error && prefillCode ? nameIn : prefillCode ? nameIn : codeIn).focus();
    if (error && prefillName != null) nameIn.select();
  }

  function avatarScreen(code, name, info, error) {
    const saved = (store.get() || {}).avatar;
    let pick = info.avatars.includes(saved) ? saved : info.avatars[Math.floor(Math.random() * info.avatars.length)];
    const err = el("p", { class: "err", role: "alert" }, error || "");
    const grid = el("div", { class: "avatars", role: "group", "aria-label": BRAND.pick.replace(":", "") }, ...info.avatars.map((a) =>
      el("button", { type: "button", "aria-pressed": a === pick ? "true" : "false", "aria-label": a, onclick: (e) => {
        pick = a;
        grid.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === e.currentTarget ? "true" : "false"));
      } }, AVATAR_EMOJI[a] || BRAND.face)));
    // A refused nickname goes back to the name box; anything else stays here to try again.
    const go = el("button", { onclick: () => { go.disabled = true; connect({ code, join: { name, avatar: pick } }, (e2, nameProblem) => (nameProblem ? joinScreen(code, e2, name) : avatarScreen(code, name, info, e2))); } }, "I'm ready!");
    show(el("h2", {}, `Hi, ${name}!`), el("p", { class: "center soft" }, BRAND.pick), grid, err, go,
      el("button", { class: "ghost", onclick: () => joinScreen(code) }, "Back"));
  }

  /* ---------- The live line ---------- */
  const NAME_ERRORS = {
    "name-word": "Let's pick a different nickname.", "name-taken": "Someone already has that nickname.", "name-chars": "Use letters and numbers only.",
    "name-long": "12 letters at most.", "name-empty": "Type a nickname.", locked: "That game is locked. Ask the host to unlock it.",
    full: "That game is full.", "too-fast": "Whoa, slow down!",
  };

  /** Opens the line. `how` = { code, join: {name, avatar} } for a new player, or { code, rejoin: {id, key} }. */
  function connect(how, onJoinError) {
    clearTimeout(retryTimer);
    leaving = false;
    if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} }
    const line = new WebSocket(wsUrl(how.code));
    ws = line;
    line.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === "hb") return;
      if (m.t === "hello" && m.game === "lights-out") nightMode();
      if (m.t === "hello") return line.send(JSON.stringify(how.join ? { t: "join", ...how.join } : { t: "rejoin", ...how.rejoin }));
      if (m.t === "joined") {
        retry = 0; setBar(null);
        me = { code: how.code, id: m.id, key: m.key || (how.rejoin && how.rejoin.key), name: m.name, avatar: m.avatar, vip: m.vip, audience: m.audience };
        hostOn = m.host !== false;
        store.set({ ...me, at: Date.now() });
        how = { code: me.code, rejoin: { id: me.id, key: me.key } }; // reconnects from now on rejoin
        if (!m.rejoined) { buzz(60); draw({ screen: "lobby" }); } else draw(lastScreen);
        if (!hostOn) setBar("Waiting for the TV", true);
        keepAlive();
        return;
      }
      if (m.t === "you") { Object.assign(me, { vip: m.vip, audience: m.audience }); store.set({ ...me, at: Date.now() }); if (m.vip) buzz(80); return draw(lastScreen); }
      if (m.t === "msg") return draw(m.data || {});
      if (m.t === "host") { hostOn = m.on; return setBar(m.on ? null : "Waiting for the TV", true); }
      if (m.t === "error") {
        if (m.code === "rejoin") { store.clear(); leaving = true; line.close(); return joinScreen(how.code, "Your spot in that game is gone. Join again?"); }
        if (onJoinError && !me) { leaving = true; line.close(); return onJoinError(NAME_ERRORS[m.code] || "Something went wrong. Try again.", /^name-/.test(m.code)); }
        if (/^text-/.test(m.code) && textRefused) textRefused(m.code);
        return;
      }
      if (m.t === "kicked") { store.clear(); leaving = true; return endScreen("The host removed you from this game."); }
      if (m.t === "ended") { store.clear(); leaving = true; return endScreen(m.why === "expired" ? "This game timed out." : "The game is over. Thanks for playing!"); }
    };
    line.onclose = () => {
      if (ws !== line) return;
      stopKeepAlive();
      if (leaving) return;
      if (!me) {
        if (onJoinError) onJoinError("Can't reach the game. Check your internet and try again.");
        return;
      }
      // Dropped: try again quickly, then less often. The saved key brings the same player back.
      setBar("Reconnecting", true);
      retry++;
      retryTimer = setTimeout(async () => {
        // After a few failed tries, check the game still exists before trying again.
        if (retry >= 3) {
          const r = await fetch(api(`/api/rooms/${me.code}`)).catch(() => null);
          if (r && r.status === 404) { store.clear(); leaving = true; return endScreen("That game has ended."); }
        }
        connect({ code: me.code, rejoin: { id: me.id, key: me.key } });
      }, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
    };
  }
  function keepAlive() {
    stopKeepAlive();
    hb = setInterval(() => { try { ws && ws.readyState === 1 && ws.send('{"t":"hb"}'); } catch (e) {} }, 25000);
    keepAwake();
  }
  function stopKeepAlive() { clearInterval(hb); }
  async function keepAwake() {
    try { if (!wake && navigator.wakeLock && document.visibilityState === "visible") { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) {}
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !me || leaving) return;
    keepAwake();
    if (!ws || ws.readyState > 1) { retry = 0; connect({ code: me.code, rejoin: { id: me.id, key: me.key } }); }
  });
  const send = (data) => { try { ws.send(JSON.stringify({ t: "input", data })); return true; } catch (e) { return false; } };
  function setBar(text, dots) {
    bar.hidden = !text;
    bar.textContent = text || "";
    bar.classList.toggle("dots", !!dots);
  }

  /* ---------- Screens the TV sends ---------- */
  let timerRaf = 0;
  function draw(s) {
    lastScreen = s;
    cancelAnimationFrame(timerRaf);
    // Spark Wars: each game has its own look (huddle/phone/themes.css); the lobby has none.
    if (s.theme && /^[a-z-]{1,20}$/.test(s.theme)) document.documentElement.dataset.theme = s.theme;
    else delete document.documentElement.dataset.theme;
    const kind = s.screen || "lobby";
    if (kind === "lobby") return lobbyScreen();
    if (kind === "wait") return show(meCard(), s.banner ? el("div", { class: "banner", style: s.banner.color ? `--team:${s.banner.color}` : null }, el("small", {}, s.banner.small || ""), el("strong", {}, s.banner.text)) : null,
      el("h2", {}, s.title || BRAND.look), s.text ? el("p", { class: "center soft" }, s.text) : null, ...vipButtons(s));
    if (kind === "message") return show(el("h2", {}, s.title || ""), el("p", { class: "center" }, s.text || ""), ...vipButtons(s));
    if (kind === "choices") return choicesScreen(s);
    if (kind === "tap") return tapScreen(s);
    if (kind === "order") return orderScreen(s);
    if (kind === "multi") return multiScreen(s);
    if (kind === "write") return writeScreen(s);
    if (kind === "slots") return slotsScreen(s);
    if (kind === "slider") return sliderScreen(s);
    // Lights Out: your secret card (bonfire/night/card.js, built into the Bonfire phone page).
    if (kind === "secret" && window.LO_CARD) return show(meCard(), window.LO_CARD.view(s, { el, send, buzz, face: AVATAR_EMOJI[me.avatar] || BRAND.face, name: me.name }));
    if (kind === "result") {
      buzz(s.good ? [40, 40, 40] : 200);
      return show(header(s), el("div", { class: "result " + (s.good ? "good" : "bad") },
        el("div", { class: "big" }, s.title || (s.good ? "Correct!" : "Not quite")),
        s.points != null ? el("p", { class: "big", style: "font-size:30px" }, (s.points > 0 ? "+" : "") + s.points.toLocaleString()) : null,
        s.text ? el("p", {}, s.text) : null), s.after === "" ? null : el("p", { class: "center soft" }, s.after || BRAND.look), ...vipButtons(s));
    }
    if (kind === "final") {
      buzz([60, 60, 120]);
      const medal = { 1: "🥇", 2: "🥈", 3: "🥉" }[s.place];
      return show(el("div", { class: "result good" },
        el("div", { class: "big", style: "font-size:64px" }, medal || (s.place ? `#${s.place}` : "🎉")),
        el("div", { class: "big" }, s.audience ? "Thanks for playing!" : s.place === 1 ? "You won!" : `You finished ${ordinal(s.place)}!`),
        s.points != null ? el("p", { class: "big", style: "font-size:30px" }, `${s.points.toLocaleString()} ${s.unit || "points"}`) : null,
        s.text ? el("p", {}, s.text) : null),
        el("p", { class: "center soft" }, BRAND.look), ...vipButtons(s));
    }
    return lobbyScreen();
  }
  const ordinal = (n) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
  /** Screens can carry buttons only the VIP sees: { label, action } or a list of them. */
  function vipButtons(s) {
    if (!s.vip || !me.vip) return [];
    return [].concat(s.vip).map((b, i) => {
      const btn = el("button", { class: i ? "ghost" : "", onclick: () => { if (send({ type: "vip", action: b.action })) { btn.disabled = true; buzz(30); } } }, b.label);
      return btn;
    });
  }
  /** Your face and name. A screen can add a `badge` ({ text, color }), e.g. your team. */
  function meCard() {
    const b = lastScreen.badge;
    return el("div", { class: "me", style: b && b.color ? `--team:${b.color}` : null }, el("div", { class: "face", "aria-hidden": "true" }, AVATAR_EMOJI[me.avatar] || BRAND.face), el("div", { class: "name" }, me.name),
      b ? el("span", { class: "tag team" }, b.text) : null,
      lastScreen.lost ? el("span", { class: "tag lost" }, "☁️ Lost Sheep") : me.vip && !document.documentElement.dataset.mode ? el("span", { class: "tag gold" }, "👑 VIP") : me.audience ? el("span", { class: "tag" }, "Audience") : null);
  }
  /** A thin line above a prompt: your score, your team ({ text, color }). */
  const header = (s) => s.header ? el("p", { class: "header", style: s.badge && s.badge.color ? `--team:${s.badge.color}` : null }, s.header) : null;
  function lobbyScreen() {
    const parts = [meCard(), el("h2", {}, "You're in!"), el("p", { class: "center soft" }, BRAND.find)];
    if (me.audience) parts.push(el("p", { class: "center" }, "The game is full, so you're in the audience. You'll still get to play along."));
    if (me.vip && !document.documentElement.dataset.mode) {
      const btn = el("button", { onclick: () => { if (send({ type: "start" })) { btn.disabled = true; btn.textContent = "Starting..."; } } }, "Everybody's in!");
      parts.push(el("p", { class: "center" }, "You're the VIP. Press this when everyone has joined:"), btn);
    }
    show(...parts);
  }
  function choicesScreen(s) {
    const keys = ["◆", "●", "▲", "★"];
    let done = false;
    const list = el("div", { class: "choices" + (s.look ? " " + s.look : "") + ((s.options || []).length > 6 ? " many" : "") }, ...(s.options || []).map((o, i) =>
      el("button", { onclick: (e) => {
        if (done) return;
        done = true;
        send({ type: "pick", round: s.round, pick: i });
        buzz(30);
        e.currentTarget.setAttribute("aria-pressed", "true");
        list.classList.add("done");
        note.textContent = s.locked || "Locked in! Look at the TV.";
      } }, el("span", { class: "k", "aria-hidden": "true" }, (s.keys || keys)[i % (s.keys || keys).length]), o)));
    const note = el("p", { class: "center soft" }, s.hint || "Tap your answer.");
    const timer = el("div", { class: "timer", "aria-hidden": "true" }, el("i"));
    // An optional way out (Bonfire's questions: "Skip this one").
    const skip = s.skip ? el("button", { class: "ghost", onclick: () => { if (!done && send({ type: "skip", round: s.round })) { done = true; list.classList.add("done"); note.textContent = "Skipped!"; buzz(15); } } }, s.skip) : null;
    show(header(s), s.note ? el("p", { class: "center" }, el("span", { class: "tag gold" }, s.note)) : null, el("p", { class: "prompt" }, s.prompt || ""), s.seconds ? timer : null, list, note, skip);
    if (s.seconds) {
      // The TV keeps the real time; this bar is only a guide, counted from when the question arrived.
      const fill = timer.firstChild, total = s.seconds * 1000, end = Date.now() + total;
      const tick = () => {
        const left = Math.max(0, end - Date.now());
        fill.style.transform = `scaleX(${left / total})`;
        if (left > 0) timerRaf = requestAnimationFrame(tick);
        else if (!done) { done = true; list.classList.add("done"); note.textContent = "Time's up! Look at the TV."; }
      };
      tick();
    }
  }
  /** The time bar under a prompt: only a guide, counted from when the screen arrived (the TV keeps the real time). */
  function timeBar(seconds, onEnd) {
    const bar = el("div", { class: "timer", "aria-hidden": "true" }, el("i"));
    const fill = bar.firstChild, total = seconds * 1000, end = Date.now() + total;
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      fill.style.transform = `scaleX(${left / total})`;
      if (left > 0) timerRaf = requestAnimationFrame(tick);
      else if (onEnd) onEnd();
    };
    timerRaf = requestAnimationFrame(tick);
    return bar;
  }
  /** Tap as fast as you can: the count goes to the TV a few times a second. */
  function tapScreen(s) {
    let n = 0, over = false, sentN = -1;
    const count = el("div", { class: "big center", style: "font-size:56px" }, "0");
    const flush = () => { if (n !== sentN) { sentN = n; send({ type: "taps", round: s.round, n }); } };
    const pump = setInterval(flush, 250);
    const btn = el("button", { class: "tapper", onpointerdown: (e) => { e.preventDefault(); if (over) return; n++; count.textContent = n; if (n % 5 === 0) buzz(10); } }, s.label || "TAP!");
    const bar = timeBar(s.seconds || 7, () => { over = true; clearInterval(pump); flush(); btn.disabled = true; btn.textContent = "Time!"; });
    show(el("h2", {}, s.title || "Tap!"), el("p", { class: "center soft" }, s.text || ""), bar, count, btn);
  }
  /** Tap the items in the right order, first to last. */
  function orderScreen(s) {
    const seq = [];
    const list = el("div", { class: "choices order" }, ...s.items.map((it, k) =>
      el("button", { onclick: (e) => {
        if (seq.includes(k) || seq.length >= s.items.length) return;
        seq.push(k);
        buzz(15);
        const b = e.currentTarget;
        b.setAttribute("aria-pressed", "true");
        b.querySelector(".k").textContent = seq.length;
        if (seq.length === s.items.length) { send({ type: "order", round: s.round, seq }); note.textContent = "Locked in! Look at the TV."; list.classList.add("done"); }
      } }, el("span", { class: "k", "aria-hidden": "true" }, "•"), it)));
    const note = el("p", { class: "center soft" }, "Tap them first to last.");
    const undo = el("button", { class: "ghost", onclick: () => {
      if (!seq.length || seq.length === s.items.length) return;
      const k = seq.pop(), b = list.children[k];
      b.setAttribute("aria-pressed", "false"); b.querySelector(".k").textContent = "•";
    } }, "Undo");
    show(el("p", { class: "prompt" }, s.title || "In order!"), timeBar(s.seconds || 20), list, note, undo);
  }
  /** Tap all that apply, then lock it in. */
  function multiScreen(s) {
    const chosen = new Set();
    let done = false;
    const list = el("div", { class: "choices multi" }, ...s.options.map((o, k) =>
      el("button", { "aria-pressed": "false", onclick: (e) => {
        if (done) return;
        chosen.has(k) ? chosen.delete(k) : chosen.add(k);
        e.currentTarget.setAttribute("aria-pressed", chosen.has(k) ? "true" : "false");
        e.currentTarget.querySelector(".k").textContent = chosen.has(k) ? "✔" : "○";
        buzz(10);
      } }, el("span", { class: "k", "aria-hidden": "true" }, "○"), o)));
    const lock = el("button", { onclick: () => lockIn() }, "Lock it in!");
    const lockIn = () => {
      if (done) return;
      done = true;
      send({ type: "multi", round: s.round, picks: [...chosen] });
      list.classList.add("done");
      lock.disabled = true;
      lock.textContent = "Locked in!";
    };
    show(el("p", { class: "prompt" }, s.prompt || ""), timeBar(s.seconds || 15, lockIn), el("p", { class: "center soft" }, "Tap ALL that fit. Wrong taps cost a step!"), list, lock);
  }
  /** Type a short answer (Bluff the Bible). The server checks the words; a refusal comes back as an error. */
  let textRefused = null;
  function writeScreen(s) {
    const max = s.max || 40;
    const box = el("input", { class: "write", maxlength: max, autocomplete: "off", autocapitalize: "sentences", spellcheck: "false", placeholder: s.placeholder || "Type here", enterkeyhint: "send", "aria-label": "Your answer" });
    const err = el("p", { class: "err", role: "alert" });
    const count = el("span", { class: "count" }, `0/${max}`);
    let done = false;
    const lock = (text) => {
      done = true;
      box.disabled = true; go.disabled = true; if (auto) auto.disabled = true;
      go.textContent = "Sent!";
      note.textContent = s.locked || "Sent! Look at the big screen.";
      if (text) box.value = text;
    };
    const submit = () => {
      if (done) return;
      const text = box.value.trim();
      if (!text) { err.textContent = "Type something first!"; return box.focus(); }
      if (send({ type: "write", round: s.round, text })) { lock(); buzz(30); }
    };
    const go = el("button", { onclick: submit }, s.button || "Send it!");
    const auto = s.auto ? el("button", { class: "ghost", onclick: () => { if (!done && send({ type: "write", round: s.round, auto: true })) { lock(); buzz(30); } } }, s.auto) : null;
    const note = el("p", { class: "center soft" }, s.hint || "");
    box.addEventListener("input", () => { count.textContent = `${[...box.value].length}/${max}`; err.textContent = ""; });
    box.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    const reasons = { "text-word": "Let's keep it clean. Try another!", "text-chars": "Letters, numbers and simple punctuation only (no emoji).", "text-long": `${max} characters at most.`, "text-empty": "Type something first!" };
    textRefused = (code) => {
      if (lastScreen !== s) return;
      done = false; box.disabled = false; go.disabled = false; if (auto) auto.disabled = false; go.textContent = s.button || "Send it!";
      note.textContent = s.hint || ""; err.textContent = reasons[code] || "Try another!"; buzz(200); box.focus(); box.select();
    };
    show(header(s), s.note ? el("p", { class: "center" }, el("span", { class: "tag gold" }, s.note)) : null, el("p", { class: "prompt" }, s.prompt || ""),
      s.seconds ? timeBar(s.seconds) : null, el("div", { class: "writebox" }, box, count), err, go, auto, note);
    setTimeout(() => { try { box.focus(); } catch (e) {} }, 50);
  }
  /** Pick a number on a slider, then lock it in (Bonfire's "What percent of us...?"). Sends { type: "slider", round, value }. */
  function sliderScreen(s) {
    const min = s.min ?? 0, max = s.max ?? 100, unit = s.unit ?? "%";
    let done = false;
    const big = el("div", { class: "big center slider-value" }, `${s.start ?? 50}${unit}`);
    const range = el("input", { type: "range", class: "slider", min, max, step: s.step || 1, value: s.start ?? 50, "aria-label": s.prompt || "Your guess" });
    range.addEventListener("input", () => { big.textContent = `${range.value}${unit}`; if (range.value % 10 === 0) buzz(5); });
    const note = el("p", { class: "center soft" }, s.hint || "Slide, then lock it in.");
    const go = el("button", { onclick: () => {
      if (done || !send({ type: "slider", round: s.round, value: Number(range.value) })) return;
      done = true; range.disabled = true; go.disabled = true; go.textContent = "Locked in!"; note.textContent = s.locked || "Locked in! Look at the big screen."; buzz(30);
    } }, s.button || "Lock it in!");
    show(header(s), el("p", { class: "prompt" }, s.prompt || ""), s.seconds ? timeBar(s.seconds) : null, big, range,
      el("div", { class: "slider-ends" }, el("span", {}, `${min}${unit}`), el("span", {}, `${max}${unit}`)), go, note);
  }
  /** Where does this card go? Tap a gap in the line (Timeline). Sends the gap's index: 0 = before the first card. */
  function slotsScreen(s) {
    let done = false;
    const items = s.items || [];
    const pick = (at, btn) => {
      if (done) return;
      done = true;
      send({ type: "slot", round: s.round, at });
      buzz(30);
      btn.classList.add("picked");
      btn.textContent = "📍 Here!";
      list.classList.add("done");
      note.textContent = s.locked || "Locked in! Look at the big screen.";
    };
    const gap = (at) => { const b = el("button", { class: "gap", onclick: () => pick(at, b) }, at === 0 ? "⬆ Before" : at === items.length ? "⬇ After" : "➕ Here"); return b; };
    const list = el("div", { class: "line" }, gap(0), ...items.flatMap((t, i) => [el("div", { class: "card" }, t), gap(i + 1)]));
    const note = el("p", { class: "center soft" }, s.hint || "Tap where it goes.");
    show(header(s), el("p", { class: "center soft", style: "margin-bottom:-8px" }, s.title || "Where does this go?"), el("div", { class: "newcard" }, s.card || ""),
      s.seconds ? timeBar(s.seconds, () => { if (!done) { done = true; list.classList.add("done"); note.textContent = "Time's up!"; } }) : null, list, note);
  }

  function endScreen(text) {
    setBar(null);
    me = null;
    show(el("div", { class: "logo" }, el("div", { class: "sheep", "aria-hidden": "true" }, BRAND.logo), el("h1", {}, BRAND.name)),
      el("h2", {}, text), el("button", { onclick: () => joinScreen("") }, "Join another game"));
  }

  /* ---------- Start: a QR link carries ?room=CODE; a saved session rejoins ---------- */
  const fromLink = cleanCode(new URLSearchParams(location.search).get("room"));
  const saved = store.get();
  if (saved && saved.id && saved.key && Date.now() - saved.at < SESSION_HOURS * 3600e3 && (!fromLink || fromLink === saved.code)) {
    me = { ...saved };
    show(el("h2", {}, "Getting you back in..."));
    connect({ code: saved.code, rejoin: { id: saved.id, key: saved.key } });
  } else {
    joinScreen(fromLink);
    // A Lights Out code from the host's QR: show the night look from the start.
    if (fromLink && GAME === "bonfire") fetch(api(`/api/rooms/${fromLink}`)).then((r) => (r.ok ? r.json() : null)).then((info) => {
      if (info && info.game === "lights-out" && !me && !document.documentElement.dataset.mode) { const typed = document.getElementById("name"); nightMode(); joinScreen(fromLink, null, typed ? typed.value : undefined); }
    }).catch(() => {});
  }
})();
