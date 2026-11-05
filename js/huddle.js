/* Holy Huddle on the TV: makes a room on the Holy Huddle server, shows the code and a QR code, and fills the lobby
   as phones join. Phase 2 plays one warm-up question so every phone can be tested end to end; the full party game
   comes in phase 3. The server and the phone page live in huddle/; messages are in huddle/PROTOCOL.md. */
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
  const ROUND_SECONDS = 20;

  let ws = null, room = null, players = [], offset = 0, scores = {}, phase = "lobby", round = null, ending = false, retry = 0, node = null;

  const face = (p) => AVATAR_EMOJI[p.avatar] || "🐑";
  const sendTo = (to, data) => { try { ws.send(JSON.stringify({ t: "to", to, data })); } catch (e) {} };
  const hostSend = (m) => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(SAVE) || "null"); } catch (e) { return null; } };
  const save = (v) => { try { v ? sessionStorage.setItem(SAVE, JSON.stringify(v)) : sessionStorage.removeItem(SAVE); } catch (e) {} };
  const serverNow = () => Date.now() + offset;

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
    players = []; scores = {}; phase = "lobby"; round = null;
    connect();
    lobby();
    say(`Grab your phones! Go to ${JOIN_TEXT} and type ${r.code.split("").join(" ")}.`);
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
  function onMessage(m) {
    if (m.t === "room") {
      if (m.now) offset = m.now - Date.now();
      retry = 0;
      setStatus("");
      const before = new Set(players.map((p) => p.id));
      players = m.room.players;
      room.vip = m.room.vip;
      room.locked = m.room.locked;
      const ev = m.event || {}, p = players.find((x) => x.id === ev.id);
      if (ev.kind === "join" && p) { S("correct"); say(pick(GREET).replace("{name}", p.name)); scores[p.id] = scores[p.id] || 0; }
      if (ev.kind === "back" && p) resendScreen(p.id);
      if (ev.kind === "kick") say(`${ev.name} has left the huddle.`);
      if (ev.kind === "host-connected" && before.size) players.forEach((x) => x.connected && resendScreen(x.id));
      refresh();
      return;
    }
    if (m.t === "input") return onInput(m);
    if (m.t === "replaced") { ending = true; save(null); setStatus("This room opened on another screen."); }
  }
  const GREET = ["Welcome to the huddle, {name}!", "{name} is in the house!", "Ayy, {name}! Let's go!", "{name} just walked in. Love to see it.", "Look who's here: {name}!"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function onInput(m) {
    const d = m.data || {};
    if (d.type === "start" && m.id === room.vip && phase === "lobby") return startRound();
    if (d.type === "pick" && round && round.open && d.round === round.n && !(m.id in round.picks)) {
      round.picks[m.id] = { pick: d.pick, ms: Math.max(0, m.at - round.startedAt) };
      S("tick");
      refresh();
      const waiting = players.filter((p) => p.connected && !(p.id in round.picks));
      if (!waiting.length) closeRound();
    }
  }

  /* ---------- What each phone should show (resent when a phone rejoins) ---------- */
  function screenFor(id) {
    if (phase === "question" && round) {
      if (id in round.picks) return { screen: "wait", title: "Locked in!", text: "Waiting for everyone else..." };
      return round.screen;
    }
    if (phase === "reveal" && round && round.results[id]) return round.results[id];
    return { screen: "lobby" };
  }
  function resendScreen(id) { sendTo([id], screenFor(id)); }

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
    const link = `${BASE}/?room=${room.code}`;
    const qr = el("div", { class: "huddle-qr", role: "img", "aria-label": `QR code to join room ${room.code}` });
    qr.innerHTML = qrSvg(link);
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
        el("div", { class: "btn-row" },
          el("button", { class: "btn btn-go huddle-start", onclick: () => startRound() }, "▶ Warm-up question"),
          el("button", { class: "btn btn-ghost huddle-lock", onclick: () => { S("tap"); hostSend({ t: "lock", locked: !room.locked }); } }, "🔒 Lock room"),
          el("button", { class: "btn btn-ghost", onclick: () => { S("tap"); leave(); } }, "End"))));
    show(node, { scene: "huddle" });
    sendTo("all", { screen: "lobby" });
    refresh();
  }

  function refresh() {
    if (!node || !node.isConnected) return;
    if (phase === "lobby") {
      const list = node.querySelector(".huddle-players");
      const cast = players.filter((p) => !p.audience);
      list.replaceChildren(...cast.map((p) => tile(p)), ...Array.from({ length: Math.max(0, 8 - cast.length) }, () => el("div", { class: "huddle-tile empty", "aria-hidden": "true" }, el("span", { class: "face" }, "?"))));
      const aud = players.filter((p) => p.audience);
      node.querySelector(".huddle-aud").textContent = aud.length ? `+ ${aud.length} in the audience` : "";
      const vip = players.find((p) => p.id === room.vip);
      node.querySelector(".huddle-hint").textContent = cast.length
        ? (vip ? `${vip.name} is the VIP 👑 and can start from their phone. Click a player to remove them.` : "")
        : "Waiting for players... (up to 8, then the audience)";
      node.querySelector(".huddle-start").disabled = !cast.length;
      node.querySelector(".huddle-lock").textContent = room.locked ? "🔓 Unlock room" : "🔒 Lock room";
    }
    if (phase === "question" && round) {
      const got = node.querySelector(".huddle-answered");
      if (got) got.replaceChildren(...players.filter((p) => p.id in round.picks).map((p) => el("span", { class: "huddle-chip", title: p.name }, face(p), " ", p.name)));
    }
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
      el("span", { class: "pts" }, p.id === room.vip ? "👑 VIP" : p.connected ? `${scores[p.id] || 0} pts` : "away"));
    return t;
  }

  /* ---------- The warm-up question ---------- */
  function startRound() {
    if (phase !== "lobby" || !players.some((p) => !p.audience)) return;
    S("fanfare");
    THP.Music.play("jericho");
    const pool = THP.QUESTIONS.filter((q) => q.lvl === 1);
    const q = pool[Math.floor(Math.random() * pool.length)];
    const options = shuffle(q.a.slice());
    const n = (round ? round.n : 0) + 1;
    round = { n, q, options, right: options.indexOf(q.a[0]), picks: {}, results: {}, open: true, startedAt: serverNow() };
    round.screen = { screen: "choices", round: n, prompt: q.q, options, seconds: ROUND_SECONDS };
    phase = "question";
    sendTo("all", round.screen);
    const keys = ["◆", "●", "▲", "★"];
    const bar = el("div", { class: "huddle-timer" }, el("i"));
    node = el("section", { class: "huddle-screen huddle-question" },
      el("p", { class: "eyebrow" }, "Warm-up question"),
      el("h2", { class: "huddle-q" }, q.q),
      bar,
      el("div", { class: "huddle-options" }, ...options.map((o, i) => el("div", { class: `huddle-opt gem-${i}` }, el("b", { "aria-hidden": "true" }, keys[i]), o))),
      el("p", { class: "huddle-sub" }, "Answer on your phone!"),
      el("div", { class: "huddle-answered", "aria-live": "polite" }));
    show(node, { scene: "huddle" });
    say(pick(["Phones out! Lock it in!", "Clock's ticking, huddle!", "Fastest right answer wins the most points!"]));
    const fill = bar.firstChild, end = Date.now() + ROUND_SECONDS * 1000;
    const tick = () => {
      if (!round || !round.open || round.n !== n) return;
      const left = end - Date.now();
      fill.style.transform = `scaleX(${Math.max(0, left) / (ROUND_SECONDS * 1000)})`;
      if (left <= 0) return closeRound();
      requestAnimationFrame(tick);
    };
    tick();
  }

  function closeRound() {
    if (!round || !round.open) return;
    round.open = false;
    phase = "reveal";
    const right = round.right;
    const winners = players.filter((p) => round.picks[p.id] && round.picks[p.id].pick === right).sort((a, b) => round.picks[a.id].ms - round.picks[b.id].ms);
    players.forEach((p) => {
      const got = round.picks[p.id];
      const good = !!got && got.pick === right;
      // 500 for a right answer, up to 500 more for speed.
      const pts = good ? 500 + Math.round(500 * Math.max(0, 1 - got.ms / (ROUND_SECONDS * 1000))) : 0;
      scores[p.id] = (scores[p.id] || 0) + pts;
      round.results[p.id] = { screen: "result", good, points: pts, title: good ? "Correct!" : got ? "Not quite" : "Too slow!", text: `It was: ${round.options[right]}` };
      sendTo([p.id], round.results[p.id]);
    });
    node.querySelectorAll(".huddle-opt").forEach((o, i) => o.classList.add(i === right ? "right" : "wrong"));
    const list = el("ol", { class: "huddle-winners" }, ...winners.slice(0, 8).map((p) => el("li", {}, face(p), " ", p.name, el("small", {}, ` ${(round.picks[p.id].ms / 1000).toFixed(1)}s`))));
    node.querySelector(".huddle-sub").replaceWith(el("p", { class: "huddle-sub" }, winners.length ? "Got it right, fastest first:" : "Nobody got that one!"));
    node.querySelector(".huddle-answered").replaceWith(list);
    node.querySelector(".huddle-timer").remove();
    if (winners.length) { S("win"); confetti(70); say(`${winners[0].name} was fastest! ${round.q.fact || ""}`.trim()); }
    else { S("wrong"); say("Oof. Nobody? We'll get the next one.", { mood: "worried" }); }
    node.append(el("div", { class: "btn-row" }, el("button", { class: "btn btn-go", onclick: () => { S("tap"); THP.Music.play("manna"); lobby(); } }, "Back to the lobby")));
  }

  /* ---------- Leaving ---------- */
  function leave() {
    ending = true;
    if (ws) { hostSend({ t: "end" }); setTimeout(() => { try { ws.close(); } catch (e) {} }, 300); }
    save(null);
    room = null; players = []; round = null; node = null;
    THP.game.titleScreen();
  }

  return { screen, base: BASE };
})();
