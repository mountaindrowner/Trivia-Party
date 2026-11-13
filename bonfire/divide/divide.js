/* Signal Divide on the host's phone (/divide): the QR code, the lobby, and the console. The server runs the game
   (huddle/server/src/divide.js); this page only shows what the host may see (head counts, arrivals, who leads and
   whether they've locked in, the clock) and sends the host's controls. It never has anyone's card, not even when the
   host plays: then the host's own screen ("My game") is drawn exactly like everyone else's (view.js).

   The room's code and host key are kept on this phone, so a reload, or the recovery link on another phone, takes
   the console back without changing the game. */
window.SIGNAL_DIVIDE = (() => {
  "use strict";
  const HOME = "https://bonfire.thecrossroads.workers.dev";
  const BASE = /bonfire|localhost|127\.0\.0\.1/.test(location.host) && location.protocol.startsWith("http") ? location.origin : HOME;
  const KEEP = "divide-host", PREFS = "divide-prefs";
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const prefs = Object.assign({ play: false, name: "" }, store.get(PREFS) || {});
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
  const buzz = (ms) => { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {} };
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const face = (p) => SD_VIEW.ICONS[p.avatar] || "🙂";

  let room = null, ws = null, retry = 0, view = null, me = null, tab = "host", toast = "", offset = 0, setPlay = false;
  const cmd = (data) => { try { ws.send(JSON.stringify({ t: "cmd", data })); return true; } catch (e) { return false; } };
  const mine = (data) => { try { ws.send(JSON.stringify({ t: "me", data })); return true; } catch (e) { return false; } };

  /* Keep the screen on (the console's clock and QR code are needed all game). */
  let wake = null;
  async function keepAwake() { try { if (!wake && navigator.wakeLock && document.visibilityState === "visible") { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); } } catch (e) {} }
  addEventListener("pointerdown", keepAwake, true);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { keepAwake(); if (room && (!ws || ws.readyState > 1)) connect(); } });

  /* ---------- The room ---------- */
  async function makeRoom() {
    const r = await fetch(`${BASE}/api/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ game: "signal-divide" }) }).catch(() => null);
    return r && r.ok ? r.json() : null;
  }
  function connect() {
    if (!room) return;
    const line = new WebSocket(`${BASE.replace(/^http/, "ws")}/ws/${room.code}?role=host&key=${encodeURIComponent(room.hostKey)}`);
    ws = line;
    line.onopen = () => {
      retry = 0; bar(null);
      // A new game: tell the server whether the host plays too.
      if (setPlay) { setPlay = false; cmd({ type: "play", on: prefs.play, name: prefs.name || "Host" }); }
    };
    line.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === "view") {
        const was = view && view.phase;
        view = m.data; me = m.me; offset = view.now - Date.now();
        if (was === "lobby" && view.phase === "arrival" && view.plays) tab = "me"; // once dealt, a playing host mostly needs their own screen
        return draw();
      }
      if (m.t === "error") { toast = ERRORS[m.code] || ""; draw(); setTimeout(() => { toast = ""; draw(); }, 4000); return; }
      if (m.t === "replaced") { room = null; store.set(KEEP, null); return title("This game is now being hosted from another phone or tab."); }
    };
    line.onclose = (e) => {
      if (ws !== line || !room) return;
      // The room is gone (ended or timed out): start again. Anything else: reconnect.
      if (e.code === 4000 || e.code === 4004) { room = null; store.set(KEEP, null); return title("That game has ended."); }
      if (retry >= 3) fetch(`${BASE}/api/rooms/${room.code}`).then((r) => { if (r.status === 404 && room) { room = null; store.set(KEEP, null); title("That game has ended."); } }).catch(() => {});
      bar("Reconnecting...");
      retry++;
      setTimeout(connect, Math.min(8000, 500 * 2 ** Math.min(retry, 4)));
    };
  }
  const ERRORS = { "sd-count": "You need 12 to 15 players to deal.", "sd-ready": "Wait until everyone has tapped I'm ready.", "sd-phase": "Not right now.", "sd-fix": "Pause first, then fix it." };
  function bar(text) { const b = document.getElementById("bar"); b.hidden = !text; b.textContent = text || ""; }

  /* ---------- Title ---------- */
  function title(note) {
    view = null;
    const name = el("input", { maxlength: 12, placeholder: "Your name", value: prefs.name, "aria-label": "Your name", autocomplete: "nickname" });
    const play = el("input", { type: "checkbox", checked: prefs.play });
    const nameRow = el("label", { class: "hd-field", hidden: !prefs.play }, "Your name (it shows on everyone's phone)", name);
    play.addEventListener("change", () => { nameRow.hidden = !play.checked; });
    const err = el("p", { class: "hd-err", role: "alert" }, note || "");
    const go = el("button", { class: "hd-big", onclick: async () => {
      prefs.play = play.checked; prefs.name = name.value.trim().slice(0, 12); store.set(PREFS, prefs);
      if (prefs.play && !prefs.name) { err.textContent = "Type your name, so everyone knows who's who."; return name.focus(); }
      go.disabled = true; go.textContent = "Opening the channel...";
      const made = await makeRoom();
      go.disabled = false; go.textContent = "Create game";
      if (!made) { err.textContent = "Couldn't create a game. Check your internet and try again."; return; }
      room = { code: made.code, hostKey: made.hostKey }; store.set(KEEP, room); tab = "host"; setPlay = true;
      connect();
      app.replaceChildren(el("p", { class: "hd-wait" }, "Connecting..."));
    } }, "Create game");
    app.replaceChildren(el("section", { class: "hd-title" },
      el("div", { class: "hd-waves", "aria-hidden": "true" }, el("i"), el("i"), el("i")),
      el("h1", { class: "hd-logo" }, "SIGNAL", el("span", {}, "DIVIDE")),
      el("p", { class: "hd-tag" }, "Two zones. Hidden teams. One last move."),
      el("p", { class: "hd-sub" }, "For 12 to 15 people, each on their own phone, in two rooms (or two far-apart corners). Everyone scans the code on this phone. No TV needed."),
      el("label", { class: "hd-check" }, play, " I'm playing too"),
      nameRow, err, go,
      el("a", { class: "hd-back", href: "/tv" }, "🔥 Bonfire Ice Breaker"), el("a", { class: "hd-back", href: "/night" }, "🌙 Lights Out")));
  }

  /* ---------- What the console shows ---------- */
  function draw() {
    if (!view) return;
    // Redrawn on every change: keep any section the host opened, open.
    const open = new Set([...app.querySelectorAll("details[open] > summary")].map((x) => x.textContent));
    const parts = [];
    if (toast) parts.push(el("div", { class: "hd-toast", role: "alert" }, toast));
    if (view.plays && view.phase !== "lobby") parts.push(el("div", { class: "hd-tabs", role: "tablist" },
      el("button", { role: "tab", "aria-selected": String(tab === "me"), onclick: () => { tab = "me"; draw(); } }, "📱 My game"),
      el("button", { role: "tab", "aria-selected": String(tab === "host"), onclick: () => { tab = "host"; draw(); } }, "🎛 Host")));
    const box = el("div", { class: "hd-body" });
    parts.push(box);
    app.replaceChildren(...parts);
    if (view.plays && view.phase !== "lobby" && tab === "me" && me) return SD_VIEW.render(box, me, { el, send: mine, buzz, host: true });
    box.append(...(view.phase === "lobby" ? lobby() : console_()));
    for (const d of app.querySelectorAll("details")) if (open.has(d.querySelector("summary").textContent)) d.open = true;
  }

  function qrSvg(text) {
    try {
      const qr = qrcode(0, "M");
      qr.addData(text); qr.make();
      const n = qr.getModuleCount(), cells = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) cells.push(`M${x + 2} ${y + 2}h1v1h-1z`);
      const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${cells.join("")}" fill="#0b0d12"/></svg>`, "image/svg+xml").documentElement;
      svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "QR code to join");
      return svg;
    } catch (e) { return el("div", {}, "Scan not available"); }
  }
  const SCRIPT = "There are two secret teams: Signal and Static. Signal needs the Beacon and the Jammer to finish apart. Static wants them to finish together. "
    + "Your phone gives you a secret card and a zone. Your zone is where you stand, not your team. "
    + "Talk with the people in your zone, and decide who to trust. Each zone has a leader, and the leader decides who moves to the other zone at the end of each round. "
    + "We play three rounds: three minutes, two minutes, then one minute. The first time, each leader sends two people. After that, one. "
    + "You can show someone just your team, or your whole card, but nobody has to. Your card never changes when you move. "
    + "If there's an odd number of us, there's also a Forecaster, on no team, who predicts the winner. Bluff about the game, never about anyone's real life.";
  function readAloud() {
    try {
      speechSynthesis.cancel();
      for (const part of SCRIPT.match(/[^.!?]+[.!?]+/g)) { const u = new SpeechSynthesisUtterance(part.trim()); u.rate = 0.95; speechSynthesis.speak(u); }
    } catch (e) {}
  }

  function lobby() {
    const L = view.lobby, url = `${BASE}/?room=${room.code}`, n = L.count, missing = L.people.filter((p) => !p.ready);
    const canDeal = n >= L.min && n <= L.max && !missing.length;
    const why = n < L.min ? `Need ${L.min - n} more to start (${L.min} to ${L.max} players).` : n > L.max ? `Too many: ${L.max} at most.` : missing.length ? `Waiting for ${missing.length} to tap I'm ready: ${missing.map((p) => p.name).join(", ")}.` : "Everyone's ready!";
    const play = el("input", { type: "checkbox", checked: view.plays });
    play.addEventListener("change", () => { prefs.play = play.checked; store.set(PREFS, prefs); cmd({ type: "play", on: play.checked, name: prefs.name || "Host" }); });
    return [
      el("div", { class: "hd-join" },
        el("div", { class: "hd-qr" }, qrSvg(url)),
        el("p", { class: "hd-codeline" }, "Scan to join, or go to ", el("b", {}, BASE.replace(/^https?:\/\//, "")), " and type"),
        el("div", { class: "hd-code", "aria-label": "Room code" }, room.code)),
      el("div", { class: "hd-counts" }, el("b", {}, `${n}`), el("span", {}, `joined · ${L.ready} ready`), el("small", {}, why)),
      el("ul", { class: "hd-people" }, ...L.people.map((p) => el("li", { class: (p.ready ? "ready " : "") + (p.connected ? "" : "away") },
        el("span", { class: "hd-av" }, face(p)), el("span", { class: "hd-nm" }, p.name, p.host ? el("small", {}, " (you)") : null),
        el("span", { class: "hd-st" }, p.ready ? "✔ ready" : "…"),
        p.host ? null : el("button", { class: "hd-x", "aria-label": `Remove ${p.name}`, onclick: () => { if (confirm(`Remove ${p.name}?`)) { try { ws.send(JSON.stringify({ t: "kick", id: p.id })); } catch (e) {} } } }, "✕")))),
      el("label", { class: "hd-check" }, play, ` I'm playing too${prefs.name ? ` (as ${prefs.name})` : ""}`),
      el("details", { class: "hd-teach" }, el("summary", {}, "📣 Teach it in 45 seconds"), el("p", {}, SCRIPT), el("button", { class: "hd-ghost", onclick: readAloud }, "🔊 Read it out loud")),
      el("details", { class: "hd-teach" }, el("summary", {}, "🧭 Before you deal"),
        el("ul", {}, el("li", {}, "Pick two zones that can't overhear each other: two rooms, or far corners. Say which is A and which is B."),
          el("li", {}, "Rules: stay in your zone, no texting or signals across, move only when your phone says."),
          el("li", {}, "Everyone needs internet the whole game (Wi-Fi or data)."),
          el("li", {}, "Can't scan? Type the 4 letters at the address above."))),
      el("button", { class: "hd-big", disabled: !canDeal, onclick: () => { if (confirm(`Lock the room and deal cards to ${n} players? Nobody can join after this.`)) cmd({ type: "deal" }); } }, canDeal ? `🔒 Lock & deal (${n} players)` : "Lock & deal"),
      el("button", { class: "hd-ghost hd-small", onclick: () => { if (confirm("End this game for everyone?")) { try { ws.send(JSON.stringify({ t: "end" })); } catch (e) {} room = null; store.set(KEEP, null); title(); } } }, "End the game"),
    ];
  }

  const PHASE = { arrival: "Everyone to their zones", round: "Round in play", lock: "Leaders locking in", moving: "Moving between zones", predict: "The Forecaster is predicting", result: "Result", aborted: "Match stopped" };
  function console_() {
    const v = view, t = v.timer, parts = [];
    if (v.phase === "result") return result();
    if (v.phase === "aborted") return [el("div", { class: "hd-status" }, el("h2", {}, "Match stopped"), el("p", {}, "Nobody wins this one.")), el("button", { class: "hd-big", onclick: () => cmd({ type: "rematch" }) }, "Back to the lobby")];
    parts.push(el("div", { class: "hd-status" + (v.paused ? " paused" : "") },
      el("small", {}, v.final ? "Final moves" : `Round ${v.round} of ${v.rounds} · ${v.need} move from each zone`),
      el("h2", {}, v.paused ? "⏸ Paused" : PHASE[v.phase] || v.phase),
      t ? el("b", { class: "hd-clock", "data-until": t.paused ? "" : t.until, "data-left": t.left }, mmss(t.paused ? t.left : t.until - (Date.now() + offset))) : null,
      el("small", {}, t ? { start: "until the round starts", grace: "for leaders to lock in, then the server picks", round: "left to talk", predict: "to predict" }[t.kind] || "" : "")));
    parts.push(el("div", { class: "hd-zones" }, ...["A", "B"].map((z) => {
      const Z = v.zones[z], away = Z.people.filter((p) => !p.arrived);
      return el("div", { class: "hd-zone" },
        el("div", { class: "hd-zl" }, z), el("p", { class: "hd-zc" }, `${Z.count} people`),
        el("p", {}, "👑 ", Z.leader ? Z.leader.name : "–"),
        v.phase === "round" || v.phase === "lock" ? el("p", { class: Z.locked ? "ok" : "" }, Z.locked ? "✔ Picks locked" : "Choosing...") : null,
        away.length ? el("p", { class: "warn" }, `🚶 On the way: ${away.map((p) => p.name).join(", ")}`) : el("p", { class: "ok" }, "✔ Everyone's here"));
    })));
    const controls = el("div", { class: "hd-controls" });
    if (v.phase === "arrival" || v.phase === "moving") controls.append(el("button", { class: "hd-ghost", disabled: v.paused, onclick: () => { if (!v.waiting.length || confirm(`Go on without ${v.waiting.join(", ")} tapping "I'm here"? Only if they really are in their zone.`)) cmd({ type: "start" }); } }, v.final ? "Everyone's in place: reveal" : "Start the round now"));
    controls.append(el("button", { class: "hd-ghost", onclick: () => cmd({ type: v.paused ? "resume" : "pause" }) }, v.paused ? "▶ Resume" : "⏸ Pause"));
    controls.append(el("button", { class: "hd-ghost danger", onclick: () => { if (confirm("Stop this match? Nobody wins it, and no cards are shown.")) cmd({ type: "abort" }); } }, "Stop match"));
    parts.push(controls);
    // Corrections, only while paused: put someone where they really are, or set a leader. Logged for everyone.
    if (v.paused) parts.push(el("details", { class: "hd-teach", open: true }, el("summary", {}, "🛠 Fix something (logged for everyone)"),
      el("p", { class: "hd-fine" }, "Someone standing in the wrong zone? Move them on here to match where they really are."),
      ...["A", "B"].map((z) => el("div", { class: "hd-fix" }, el("b", {}, `Zone ${z}`), ...v.zones[z].people.map((p) => el("div", { class: "hd-fixrow" },
        el("span", {}, `${face(p)} ${p.name}${p.leader ? " 👑" : ""}`),
        el("button", { class: "hd-ghost hd-small", onclick: () => { if (confirm(`Move ${p.name} to Zone ${z === "A" ? "B" : "A"}?`)) cmd({ type: "fixZone", id: p.id, zone: z === "A" ? "B" : "A" }); } }, `→ ${z === "A" ? "B" : "A"}`),
        p.leader ? null : el("button", { class: "hd-ghost hd-small", onclick: () => { if (confirm(`Make ${p.name} Zone ${z}'s leader?`)) cmd({ type: "fixLeader", zone: z, id: p.id }); } }, "👑")))))));
    parts.push(el("ul", { class: "hd-log" }, ...v.log.slice().reverse().map((l) => el("li", {}, l))));
    parts.push(el("button", { class: "hd-ghost hd-small", onclick: shareRecovery }, "🔑 Recovery link (to host from another phone)"));
    return parts;
  }
  function result() {
    const r = view.result, F = SD_VIEW.FACTIONS, R = SD_VIEW.ROLES;
    return [
      el("div", { class: "hd-win", "data-faction": r.winner }, el("h2", {}, `${F[r.winner].short} WINS`),
        el("p", {}, r.together ? `Beacon ${r.beacon.name} and Jammer ${r.jammer.name} ended together in Zone ${r.zone.beacon}.` : `Beacon ${r.beacon.name} (Zone ${r.zone.beacon}) and Jammer ${r.jammer.name} (Zone ${r.zone.jammer}) ended apart.`),
        r.forecaster ? el("p", {}, `🔮 Forecaster ${r.forecaster.name}: ${r.forecaster.pick ? `predicted ${F[r.forecaster.pick].name}, ${r.forecaster.won ? "right!" : "wrong."}` : "no prediction."}`) : null),
      el("ul", { class: "hd-people" }, ...r.everyone.map((p) => el("li", { "data-faction": R[p.role].faction }, el("span", { class: "hd-av" }, face(p)), el("span", { class: "hd-nm" }, p.name), el("span", { class: "hd-st" }, `${R[p.role].name} · Zone ${p.zone}`)))),
      el("button", { class: "hd-big", onclick: () => cmd({ type: "rematch" }) }, "Rematch: back to the lobby"),
      el("p", { class: "hd-fine" }, "Everyone keeps their seat; new cards and new zones when you deal again."),
    ];
  }
  async function shareRecovery() {
    const link = `${location.origin}/divide#host=${room.code}.${room.hostKey}`;
    try { if (navigator.share) { await navigator.share({ title: "Signal Divide host link", url: link }); return; } } catch (e) {}
    try { await navigator.clipboard.writeText(link); toast = "Copied. Keep it private: whoever opens it can run the game."; } catch (e) { toast = link; }
    draw();
  }
  // The console's clock.
  setInterval(() => {
    for (const c of document.querySelectorAll(".hd-clock")) if (c.dataset.until) c.textContent = mmss(Number(c.dataset.until) - (Date.now() + offset));
  }, 250);

  function boot() {
    // A recovery link: /divide#host=CODE.KEY takes the console over from another phone.
    const m = /host=([A-Z]{4})\.([A-Za-z0-9_-]+)/.exec(location.hash);
    if (m) { store.set(KEEP, { code: m[1], hostKey: m[2] }); history.replaceState(null, "", location.pathname); }
    const kept = store.get(KEEP);
    if (kept && kept.code && kept.hostKey) { room = kept; connect(); app.replaceChildren(el("p", { class: "hd-wait" }, "Reconnecting to your game...")); return; }
    title();
  }
  return { boot, _state: () => ({ view, me, room, tab }) };
})();
