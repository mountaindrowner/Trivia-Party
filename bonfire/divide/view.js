/* Signal Divide: a player's screen. One view for every player's phone (huddle/phone draws it for a "divide" screen)
   and for the host's own phone when the host plays (divide.js). The server (huddle/server/src/divide.js) sends each
   phone only what it may know; this draws it, and makes the moments land.

   Made for two rooms full of people standing around:
   - The everyday screen is neutral: the zone letter (and the name the host gave it), the clock, your room's people.
     No team colours anywhere, so a glance over your shoulder gives nothing away. Room A/B is where you stand.
   - Your card shows only on purpose: hold "My card" to peek (let go and it's gone), or "Show team" / "Show card"
     to turn your phone toward someone you trust (8 seconds, or "Hide now"). Switching apps hides it.
   - The host's phone can only be heard in one room, so every phone carries the moments itself: a sweep across the
     screen and a sound when a round starts, the last ten seconds counted down huge, "TIME'S UP", the exchange (who's
     leaving, who's coming), a crown when you become leader, and the reveal, played on every phone at the same
     moment (the server stamps it). And one phone in each room, picked by the server, is that room's announcer: it
     buzzes until its owner turns the volume up and taps, then says the time, the moves and the result out loud.
   - Redraws never land under a finger, and an unchanged view isn't redrawn, so no tap is lost.

   SD_VIEW.render(root, view, kit, toast)   kit = { el, send(data) -> bool, buzz(ms|pattern), host (bool: drawn on
   the host's phone) }   Also: ROLES, FACTIONS, ICONS, sign(el, faction), cinematic(el, result, at, offset). */
window.SD_VIEW = (() => {
  "use strict";
  const ICONS = {
    tent: "⛺", moon: "🌙", star: "⭐", pine: "🌲", mountain: "🏔️", canoe: "🛶", lantern: "🏮", bear: "🐻", raccoon: "🦝", deer: "🦌", hedgehog: "🦔",
    butterfly: "🦋", mushroom: "🍄", coffee: "☕", dango: "🍡", compass: "🧭", map: "🗺️", sparkles: "✨", snail: "🐌", beaver: "🦫", fox: "🦊", owl: "🦉", guitar: "🎸",
  };
  const FACTIONS = {
    signal: { name: "Signal", short: "SIGNAL", goal: "Keep the Beacon and the Jammer apart." },
    static: { name: "Static", short: "STATIC", goal: "Get the Jammer and the Beacon into the same room." },
    neutral: { name: "Forecaster", short: "NO TEAM", goal: "Predict which team wins." },
  };
  const ROLES = {
    beacon: { name: "Beacon", faction: "signal", text: "You're the one Static is hunting. Signal wins if you finish in a different room from the Jammer." },
    jammer: { name: "Jammer", faction: "static", text: "You're Static's special card. Static wins if you finish in the same room as the Beacon." },
    signal: { name: "Signal member", faction: "signal", text: "Find the Beacon, find the Jammer, and keep them apart." },
    static: { name: "Static member", faction: "static", text: "Find the Beacon, find the Jammer, and bring them together." },
    forecaster: { name: "Forecaster", faction: "neutral", text: "You're on no team. Watch, listen, and at the very end predict which team wins. You win if you're right." },
  };
  const ROLE_OF = (r) => ROLES[r] || ROLES.signal;
  /* Each team's mark, drawn (so it looks the same on every phone): Signal's broadcast rings, Static's zigzag, the
     Forecaster's question mark. Always with the team's name too, never colour alone. */
  const SVG = {
    signal: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="5" fill="currentColor"/><circle class="w1" cx="24" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="3.5"/><circle class="w2" cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3.5" opacity=".6"/></svg>',
    static: '<svg viewBox="0 0 48 48" aria-hidden="true"><polyline points="3,30 11,14 19,34 27,12 35,32 45,16" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    neutral: '<svg viewBox="0 0 48 48" aria-hidden="true"><text x="24" y="36" text-anchor="middle" font-size="34" font-weight="700" font-family="system-ui, sans-serif" fill="currentColor">?</text><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  };
  const sign = (el, faction, cls) => { const n = el("span", { class: "sd-sign " + (cls || ""), "data-faction": faction }); n.innerHTML = SVG[faction]; return n; };
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const face = (p) => ICONS[p.avatar] || "🙂";
  const zoneFull = (v, z) => `Room ${z}`;
  const list = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
  const NUM = ["zero", "one", "two", "three", "four"];
  const timeWords = (secs) => (secs % 60 ? `${Math.floor(secs / 60) ? `${Math.floor(secs / 60)} and a half minutes` : `${secs} seconds`}` : `${NUM[secs / 60] || secs / 60} minute${secs > 60 ? "s" : ""}`);

  /* ---------- Sound on every phone: short radio-ish tones, made on the spot (no files) ----------
     iPhones only allow sound after a tap, so the first tap anywhere wakes it (joining is a tap). 🔈 turns it off. */
  const sound = (() => {
    let c = null, on = true;
    try { on = localStorage.getItem("sd-sound") !== "off"; } catch (e) {}
    const ctx = () => { try { c = c || new (window.AudioContext || window.webkitAudioContext)(); if (c.state !== "running") c.resume(); } catch (e) {} return c; };
    addEventListener("pointerdown", () => { try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {} ctx(); }, true);
    function beep(f, t, dur, vol, type, to) {
      const a = ctx(); if (!a) return;
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, a.currentTime + t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, a.currentTime + t + dur);
      g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(vol, a.currentTime + t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + dur);
      o.connect(g).connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + dur + 0.05);
    }
    function hiss(t, dur, vol) {
      const a = ctx(); if (!a) return;
      const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = b; f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 0.7; g.gain.value = vol;
      s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + t);
    }
    const CUES = {
      start: () => { hiss(0, 0.25, 0.25); beep(660, 0.2, 0.12, 0.2); beep(880, 0.34, 0.12, 0.2); beep(1320, 0.48, 0.22, 0.22); },
      tick: () => beep(1200, 0, 0.06, 0.18, "square"),
      up: () => { beep(440, 0, 0.35, 0.25, "sawtooth", 220); hiss(0.05, 0.4, 0.2); },
      move: () => { for (let i = 0; i < 3; i++) { beep(880, i * 0.32, 0.14, 0.25, "square"); beep(660, i * 0.32 + 0.15, 0.14, 0.25, "square"); } },
      crown: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.09, 0.25, 0.2, "triangle")); },
      lock: () => { beep(300, 0, 0.08, 0.25, "square"); beep(600, 0.09, 0.12, 0.2, "square"); },
      arrive: () => { beep(784, 0, 0.1, 0.18); beep(1047, 0.1, 0.18, 0.18); },
      static: () => hiss(0, 0.6, 0.3),
      reveal: () => { hiss(0, 0.2, 0.2); beep(220, 0.15, 0.6, 0.25, "triangle", 440); },
      win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, i * 0.1, 0.35, 0.2, "triangle")); },
      lose: () => { beep(330, 0, 0.3, 0.2, "triangle", 300); beep(262, 0.3, 0.5, 0.2, "triangle", 220); },
    };
    return {
      play(name) { if (on && CUES[name]) try { CUES[name](); } catch (e) {} },
      get on() { return on; },
      toggle() { on = !on; try { localStorage.setItem("sd-sound", on ? "on" : "off"); } catch (e) {} return on; },
    };
  })();

  /* ---------- The announcer: each room's leader's phone speaks for that zone ---------- */
  const voice = (() => {
    let v = null, woke = false;
    const pick = () => { try { const all = speechSynthesis.getVoices().filter((x) => /^en(-|_|$)/i.test(x.lang)); v = all.find((x) => /natural|premium|enhanced/i.test(x.name)) || all.find((x) => /Google US English|Samantha|Daniel/.test(x.name)) || all[0] || null; } catch (e) {} };
    if ("speechSynthesis" in window) { pick(); speechSynthesis.addEventListener("voiceschanged", pick); }
    addEventListener("pointerdown", () => { if (!woke && "speechSynthesis" in window) { woke = true; try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch (e) {} } }, true);
    return {
      say(text, now) {
        if (!("speechSynthesis" in window) || !sound.on) return;
        try {
          if (now) speechSynthesis.cancel();
          for (const part of text.match(/[^.!?]+[.!?]*/g) || [text]) {
            const u = new SpeechSynthesisUtterance(part.trim());
            if (v) { u.voice = v; u.lang = v.lang; }
            u.rate = v && /natural|premium|enhanced/i.test(v.name) ? 1 : 0.95;
            speechSynthesis.speak(u);
          }
        } catch (e) {}
      },
    };
  })();

  /* ---------- The clock, and the moments it brings: counted from the server's deadline ---------- */
  let clockAt = null, clockLeft = 0, clockPaused = false, clockKind = "", offset = 0, lastSec = -1, cur = null;
  const big = document.createElement("div");
  big.className = "sd-ten"; big.setAttribute("aria-hidden", "true");
  setInterval(() => {
    const left = clockPaused ? clockLeft : clockAt == null ? null : clockAt - (Date.now() + offset);
    for (const n of document.querySelectorAll(".sd-clock")) n.textContent = left == null ? "–" : mmss(left);
    // The last ten seconds of a round: counted huge across the screen, a tick for each of the last five.
    const sec = left == null ? -1 : Math.ceil(left / 1000);
    const ten = clockKind === "round" && !clockPaused && sec > 0 && sec <= 10;
    if (ten) { if (!big.isConnected) document.body.append(big); if (sec !== lastSec) { big.textContent = sec; big.classList.remove("go"); void big.offsetWidth; big.classList.add("go"); if (sec <= 5) sound.play("tick"); } }
    else if (big.isConnected) big.remove();
    // The leader's phone says the time as it runs down.
    if (cur && cur.announce && clockKind === "round" && !clockPaused && sec !== lastSec) {
      const total = cur.plan ? cur.plan.secs[cur.round - 1] : 0;
      if (sec === 60 && total > 90) voice.say("One minute left.");
      if (sec === 30) voice.say(`Thirty seconds. ${cur.leaderName}, pick ${NUM[cur.need]} to send to Room ${cur.other}.`);
      if (sec === 10) voice.say("Ten seconds!");
    }
    lastSec = sec;
  }, 200);

  /* ---------- A sweep across the screen when something happens (on the page itself, so a redraw can't stop it) ---------- */
  /* (Two at once, like "cards dealt" and "you're the leader", play one after the other.) */
  let curtainFree = 0;
  function curtain(el, cls, icon, title, lines, ms = 2600) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 1400;
    const n = el("div", { class: "sd-curtain " + cls, "aria-hidden": "true" }, el("div", { class: "sd-cicon" }, icon), el("b", {}, title), ...(lines || []).map((l) => el("p", {}, l)));
    const start = Math.max(Date.now(), curtainFree);
    curtainFree = start + ms - 300;
    setTimeout(() => { document.body.append(n); setTimeout(() => n.remove(), ms); }, start - Date.now());
  }

  /* ---------- The card: overlays on the page itself, hidden on any app switch ---------- */
  let overlay = null, hideTimer = 0, myRole = null;
  const hide = () => { clearTimeout(hideTimer); if (overlay) { overlay.remove(); overlay = null; } };
  document.addEventListener("visibilitychange", hide);
  addEventListener("pagehide", hide);
  addEventListener("blur", hide);
  function cardFace(el, role, mode) {
    const r = ROLE_OF(role), f = FACTIONS[r.faction];
    return el("div", { class: "sd-face", "data-faction": r.faction },
      sign(el, r.faction),
      el("div", { class: "sd-team" }, f.short),
      mode === "team" ? el("p", { class: "sd-sub" }, "This shows my team only, not my card.") : null,
      mode !== "team" ? el("div", { class: "sd-role" }, r.name) : null,
      mode !== "team" ? el("p", { class: "sd-sub" }, r.text) : null,
      mode !== "team" ? el("p", { class: "sd-goal" }, el("b", {}, f.name === "Forecaster" ? "To win: " : `${f.name} wins if: `), f.goal) : null);
  }
  /** Show your team or your whole card to someone nearby: on your own screen, for 8 seconds or until "Hide now". */
  function showOff(kit, mode) {
    hide();
    const { el } = kit;
    let left = 8;
    const count = el("span", {}, `${left}`);
    overlay = el("div", { class: "sd-overlay sd-show", role: "dialog", "aria-label": mode === "team" ? "My team" : "My card" },
      el("p", { class: "sd-tip" }, mode === "team" ? "Turn your phone to show your team" : "Turn your phone to show your card"),
      cardFace(el, myRole, mode),
      el("button", { type: "button", class: "sd-hide", onclick: hide }, "Hide now (", count, ")"));
    document.body.append(overlay);
    kit.buzz(20);
    const step = () => { left--; count.textContent = `${left}`; if (left <= 0) hide(); else hideTimer = setTimeout(step, 1000); };
    hideTimer = setTimeout(step, 1000);
  }
  /** Hold to peek: the card shows only while your finger is down. */
  function peekButton(kit) {
    const { el } = kit;
    const b = el("button", { type: "button", class: "sd-peek", "aria-label": "My card: press and hold to see it" }, el("span", { class: "sd-peek-icon" }), el("span", {}, el("b", {}, "My card"), el("small", {}, "Hold to peek")));
    const on = (e) => {
      e.preventDefault();
      if (overlay) return;
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      overlay = el("div", { class: "sd-overlay sd-peeking", "aria-live": "polite" }, el("p", { class: "sd-tip" }, "Let go to hide"), cardFace(el, myRole, "full"));
      document.body.append(overlay);
      kit.buzz(12);
    };
    b.addEventListener("pointerdown", on);
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, hide);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    b.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !overlay) { e.preventDefault(); overlay = el("div", { class: "sd-overlay sd-peeking" }, cardFace(el, myRole, "full")); document.body.append(overlay); } });
    b.addEventListener("keyup", hide);
    return b;
  }
  function cardBar(kit) {
    const { el } = kit;
    return el("div", { class: "sd-cardbar" }, peekButton(kit),
      el("button", { type: "button", class: "sd-ghost", onclick: () => showOff(kit, "team") }, "Show team"),
      el("button", { type: "button", class: "sd-ghost", onclick: () => showOff(kit, "full") }, "Show card"));
  }

  /* ---------- The announcer's prompt ----------
     The server picks one phone in each room to read out the time and the moves. That phone buzzes (and keeps buzzing)
     until its owner turns the volume up and taps; the tap is also what lets a phone speak at all (iPhones insist). */
  let askBox = null, askBuzz = 0;
  const closeAsk = () => { if (askBox) { askBox.remove(); askBox = null; } clearInterval(askBuzz); };
  function askAnnouncer(v, kit) {
    const want = v.me && v.me.announcer && !v.me.annOk && !["result", "aborted", "lobby", "watch"].includes(v.phase);
    if (!want) return closeAsk();
    if (askBox) return;
    const { el, send } = kit, z = v.me.zone;
    askBox = el("div", { class: "sd-ask", role: "dialog", "aria-label": "You're the announcer" },
      el("div", { class: "sd-ask-icon", "aria-hidden": "true" }, "📣"),
      el("h2", {}, `You're Room ${z}'s announcer`),
      el("p", {}, "Your phone will read out the time and the moves for everyone in your room."),
      el("p", { class: "sd-ask-big" }, "🔊 Turn your volume all the way up"),
      el("p", { class: "sd-fine" }, "Then keep this page open. (The ringer switch on silent is fine.)"),
      el("button", { type: "button", class: "sd-main", onclick: () => {
        voice.say(`Hi, Room ${z}! I'm your announcer. I'll tell you the time, and who's moving.`, true);
        if (send({ type: "announce-ok" })) { closeAsk(); kit.buzz(40); }
      } }, "My volume's up!"),
      el("button", { type: "button", class: "sd-ghost", onclick: () => { if (send({ type: "announce-no" })) closeAsk(); } }, "My phone can't (pick someone else)"));
    document.body.append(askBox);
    kit.buzz([300, 150, 300, 150, 300]);
    sound.play("crown");
    askBuzz = setInterval(() => { kit.buzz([300, 150, 300]); sound.play("tick"); }, 4000);
  }

  /* ---------- The moments: worked out from what changed between one view and the next ---------- */
  let seen = { key: "", leader: null, move: null, locked: null, arrived: null, reveal: null };
  function moments(v, kit) {
    const { el } = kit, me = v.me || {}, z = me.zone, other = z === "A" ? "B" : "A";
    const key = `${v.match}:${v.phase}:${v.round}`, fresh = key !== seen.key;
    const announce = !!(me.announcer && me.annOk);
    cur = v.round ? { announce, plan: v.plan, round: v.round, need: v.need, other, leaderName: v.zone && v.zone.leader ? v.zone.leader.name : "Leader" } : null;
    if (fresh && seen.key) {
      if (v.phase === "arrival") {
        curtain(el, "sd-c-deal", "📡", "CARDS DEALT", [`Go to ${zoneFull(v, z)}`, "Your card is secret until you choose to show it."]);
        sound.play("start"); kit.buzz([100, 60, 100]);
      }
      if (v.phase === "round") {
        const secs = v.plan.secs[v.round - 1];
        curtain(el, "sd-c-round", `${v.round}`, `ROUND ${v.round}`, [`${mmss(secs * 1000)} to talk`, `Then ${v.need} from each room move`]);
        sound.play("start"); kit.buzz([80, 60, 80]);
        if (announce) voice.say(`Round ${NUM[v.round]}. ${timeWords(secs)}. Room ${z}, your leader is ${v.zone.leader.name}. At the end, ${NUM[v.need]} of you go to Room ${other}. Talk it out.`, true);
      }
      if (v.phase === "lock") {
        curtain(el, "sd-c-up", "⏱", "TIME'S UP", [me.leader ? (v.zone.locked ? "You're locked in." : `Lock in your ${v.need} now!`) : "Leaders are locking in..."]);
        sound.play("up"); kit.buzz(me.leader ? [200, 100, 200, 100, 200] : [150]);
        if (announce && !v.zone.locked) voice.say(`Time's up! ${v.zone.leader.name}, lock in who you're sending. Twenty seconds, or the server picks.`, true);
      }
      if (v.phase === "moving" && v.move) {
        // Who goes where, said from where you'll be standing.
        const m = v.move, out = [];
        if (m.moving) {
          out.push(`You're going to ${zoneFull(v, z)}`);
          if (m.coming && m.coming.length) out.push(`Also coming to ${z}: ${list(m.coming)}`);
          if (m.leaving && m.leaving.length) out.push(`Swapping places with ${list(m.leaving)}`);
        } else {
          if (m.leaving && m.leaving.length) out.push(`Leaving ${z}: ${list(m.leaving)}`);
          if (m.coming && m.coming.length) out.push(`Coming to ${z}: ${list(m.coming)}`);
        }
        curtain(el, "sd-c-swap", "⇄", v.final ? "FINAL EXCHANGE" : "EXCHANGE", out, 3200);
        sound.play(m.moving ? "move" : "static"); kit.buzz(m.moving ? [300, 120, 300, 120, 300] : [100]);
        if (announce) voice.say(`Exchange! ${m.leaving && m.leaving.length ? `${list(m.leaving)}, go to Room ${other}.` : ""} ${m.coming && m.coming.length ? `${list(m.coming)} ${m.coming.length > 1 ? "are" : "is"} coming here.` : ""}${v.final ? " That's the last move." : ""}`, true);
      }
      if (v.phase === "predict") { sound.play("static"); kit.buzz([60, 40, 60]); }
    }
    // You were made leader (voted in, handed over, or chosen at the start).
    if (seen.leader === false && me.leader && v.phase !== "lobby") {
      curtain(el, "sd-c-crown", "👑", "YOU'RE THE LEADER", [`of ${zoneFull(v, z)}`, `At the end of the round, you pick who's sent away.`], 3000);
      sound.play("crown"); kit.buzz([60, 40, 60, 40, 160]);
    }
    if (seen.locked === false && v.zone && v.zone.locked) sound.play("lock");
    if (seen.arrived === false && me.arrived) sound.play("arrive");
    seen = { key, leader: v.phase === "lobby" ? false : !!me.leader, locked: v.zone ? !!v.zone.locked : null, arrived: v.me ? !!me.arrived : null, reveal: seen.reveal };
  }

  /* ---------- The screen ----------
     Redrawn whenever the server says anything changed (with 15 people voting, that's often). A redraw never lands
     under a finger: while one is down, it waits until it lifts. An unchanged view isn't redrawn at all. */
  let pressing = false, waiting = null, drawn = "", lastArgs = null, cineTimer = 0;
  addEventListener("pointerdown", () => { pressing = true; }, true);
  const lift = () => { pressing = false; if (waiting) { const w = waiting; waiting = null; setTimeout(() => render(...w), 0); } };
  addEventListener("pointerup", lift, true);
  addEventListener("pointercancel", lift, true);
  function render(root, v, kit, toast) {
    lastArgs = [root, v, kit, toast];
    if (pressing && root.firstChild) { waiting = lastArgs; return; }
    offset = (v.now || Date.now()) - Date.now();
    const cine = v.phase === "result" && v.result && v.result.at && Date.now() + offset < v.result.at + CINE_MS;
    const same = JSON.stringify([v.rev, v.phase, v.me, v.zone, v.paused, v.timer && [v.timer.kind, v.timer.until, v.timer.paused], v.move, v.predict, v.result, v.lobby, toast, kit.host, cine, sound.on]);
    if (same === drawn && root.querySelector(".sd")) return;
    drawn = same;
    const { el } = kit;
    myRole = v.me && v.me.role;
    const t = v.timer;
    clockPaused = !!(t && t.paused); clockLeft = t ? t.left : 0; clockAt = t && !t.paused ? t.until : null; clockKind = t ? t.kind : "";
    if (v.phase !== "lobby") moments(v, kit); else { seen.key = `${v.match}:lobby`; seen.leader = false; cur = null; }
    askAnnouncer(v, kit);
    const parts = [];
    if (v.paused) parts.push(el("div", { class: "sd-paused" }, "⏸ The host paused the game"));
    if (toast) parts.push(el("div", { class: "sd-toast", role: "alert" }, TOASTS[toast] || "That didn't work. Try again."));
    const ph = v.phase;
    if (ph === "lobby") parts.push(...lobby(v, kit));
    else if (ph === "watch") parts.push(el("div", { class: "sd-big-msg" }, el("h2", {}, "A match is on"), el("p", {}, "You'll be dealt into the next one. Watch, and listen!")));
    else if (ph === "aborted") parts.push(el("div", { class: "sd-big-msg" }, el("h2", {}, "Match stopped"), el("p", {}, "The host stopped this match, so nobody wins it. Wait for the next one.")));
    else if (ph === "result") {
      if (cine) { parts.push(cinematic(el, v.result, v.result.at, offset, v)); clearTimeout(cineTimer); cineTimer = setTimeout(() => { drawn = ""; render(...lastArgs); }, Math.max(50, v.result.at + CINE_MS - (Date.now() + offset))); }
      else parts.push(...result(v, kit));
    } else if ((ph === "arrival" || ph === "moving") && v.move && (v.move.first || v.move.moving) && !v.me.arrived) parts.push(...moveScreen(v, kit));
    else parts.push(...play(v, kit));
    if (v.log && v.log.length && ph !== "lobby" && !cine) parts.push(el("ul", { class: "sd-log", "aria-label": "What's happened" }, ...v.log.slice(-3).map((l) => el("li", {}, l))));
    if (ph !== "lobby" && !cine) parts.push(el("button", { type: "button", class: "sd-sound", "aria-pressed": String(sound.on), onclick: () => { sound.toggle(); drawn = ""; render(...lastArgs); } }, sound.on ? "🔊 Sound on" : "🔈 Sound off"));
    root.replaceChildren(el("div", { class: "sd sd-" + ph }, ...parts));
  }
  const TOASTS = { count: "Pick exactly the number you need first.", leader: "Only your room's leader can do that.", phase: "Not right now.", zone: "They're not in your room.", pick: "You can't pick that.", offer: "That offer is gone." };

  function lobby(v, kit) {
    const { el, send } = kit, L = v.lobby, ready = v.me && v.me.ready;
    const out = L.plan.out, secs = L.plan.secs;
    return [
      el("div", { class: "sd-hero" }, el("div", { class: "sd-radar", "aria-hidden": "true" }, el("i"), el("i"), el("i"), el("b")),
        el("div", { class: "sd-logo" }, "SIGNAL", el("span", {}, "DIVIDE")), el("p", { class: "sd-tag" }, "Two rooms. Hidden teams. One last move.")),
      el("p", { class: "sd-count" }, el("b", {}, `${L.count}`), ` joined · ${L.ready} ready`),
      kit.host ? el("p", { class: "sd-line" }, "You're playing too: you're ready. Deal from the Host tab.")
        : el("button", { type: "button", class: "sd-main" + (ready ? " on" : ""), "aria-pressed": String(!!ready), onclick: () => { if (send({ type: "ready", on: !ready })) { kit.buzz(30); sound.play(ready ? "tick" : "arrive"); } } }, ready ? "✔ Ready! (tap to undo)" : "I'm ready"),
      el("ol", { class: "sd-how" },
        el("li", {}, el("b", {}, "Two secret teams. "), "Signal wants the Beacon and the Jammer to finish apart. Static wants them together."),
        el("li", {}, el("b", {}, "Your phone gives you a card and a room. "), "Your room (A or B) is where you stand, not your team."),
        el("li", {}, el("b", {}, "Talk to the people in your room. "), "Show your team or your card to anyone you trust, or don't. Lying is part of the game."),
        el("li", {}, el("b", {}, "Each room has a leader. "), `After each round (${secs.map((x) => mmss(x * 1000)).join(", ")}) the leader sends ${out[0]}, then ${out[1]}, then ${out[2]} to the other room.`),
        el("li", {}, el("b", {}, "Your card never changes. "), "Only people move. At the end, where the Beacon and the Jammer stand decides it.")),
      el("p", { class: "sd-fine" }, "Turn your sound on: your phone beeps and buzzes when it's time to move, and one phone in each room is picked to read out the time. Bluff about your card, never about anyone's real life."),
      el("ul", { class: "sd-people" }, ...L.people.map((p) => el("li", { class: p.ready ? "ready" : "" }, el("span", { class: "sd-av" }, face(p)), el("span", { class: "sd-nm" }, p.name), el("span", { class: "sd-st" }, p.ready ? "✔" : "…")))),
    ];
  }

  function moveScreen(v, kit) {
    const { el, send } = kit, m = v.move, z = v.me.zone;
    return [el("div", { class: "sd-move" + (m.first ? " first" : "") },
      el("p", { class: "sd-move-top" }, m.first ? "Your room" : "Move now"),
      el("div", { class: "sd-move-big" }, el("span", { class: "sd-move-arrow", "aria-hidden": "true" }, m.first ? "📍" : "➜"), el("b", {}, z)),
      el("h2", {}, m.first ? "GO TO ROOM " + z : "MOVE TO ROOM " + z),
      el("p", {}, m.first ? "This is where you stand, not your team. Your card is secret until you choose to show it." : "Take your phone with you. Your card stays exactly the same."),
      el("button", { type: "button", class: "sd-main", onclick: () => { if (send({ type: "here" })) kit.buzz(40); } }, `I'm in Room ${z}`))];
  }

  function header(v, el) {
    const t = v.timer;
    const label = !t ? "" : t.kind === "start" ? "Starts in" : t.kind === "grace" ? "Leaders lock in" : t.kind === "predict" ? "Prediction" : "Time left";
    return el("div", { class: "sd-top" },
      el("div", { class: "sd-zone", "aria-label": `You're in ${zoneFull(v, v.me.zone)}` }, el("small", {}, "ROOM"), el("b", {}, v.me.zone), el("i", { class: "sd-bars", "aria-hidden": "true" }, el("i"), el("i"), el("i"), el("i"))),
      el("div", { class: "sd-round" }, el("small", {}, v.phase === "predict" || (v.phase === "moving" && v.final) ? "Final" : `Round ${v.round} of ${v.rounds}`),
        el("b", { class: "sd-clock" + (t && t.kind === "round" && t.left < 30000 ? " low" : "") }, t ? (t.paused ? mmss(t.left) : mmss(t.until - (Date.now() + offset))) : "–"), el("small", {}, label),
        el("div", { class: "sd-dots", "aria-hidden": "true" }, ...Array.from({ length: v.rounds }, (_, i) => el("i", { class: i < v.round - 1 || (i === v.round - 1 && v.phase === "moving" && v.final) ? "done" : i === v.round - 1 ? "now" : "" })))));
  }

  /** The one sentence on top: what to do now. */
  function nextStep(v) {
    const lead = v.zone.leader, me = v.me, need = v.need, other = me.zone === "A" ? "B" : "A";
    if (v.phase === "arrival") return "Waiting for everyone to reach their room. The round starts when they're all there.";
    if (v.phase === "moving") {
      if (v.final) return "The last moves are happening. Then the reveal.";
      return v.move && v.move.coming && v.move.coming.length ? `Coming to Room ${me.zone}: ${list(v.move.coming)}. Round ${v.round} starts when they're here.` : `Round ${v.round} starts when everyone has moved.`;
    }
    if (v.phase === "predict") return "Waiting for the Forecaster's prediction...";
    if (v.phase === "lock") return me.leader ? (v.zone.locked ? "Locked! Waiting for the other leader." : `Time's up! Lock in ${need} to send, now.`) : `Time's up! ${lead ? lead.name : "The leader"} is locking in who moves.`;
    if (me.leader) return v.zone.locked ? "You've locked in. They move when the time's up." : `You lead Room ${me.zone}. Before time's up, pick ${need} to send to Room ${other}.`;
    return `Talk to Room ${me.zone}. ${lead ? lead.name : "The leader"} leads, and sends ${need} to Room ${other} when time's up. Not happy? Vote for someone else.`;
  }

  function play(v, kit) {
    const { el, send } = kit, me = v.me, Z = v.zone, live = v.phase === "round" || v.phase === "lock";
    const parts = [header(v, el), el("p", { class: "sd-next" }, nextStep(v)), cardBar(kit)];
    if (Z.offer && Z.offer.to.id === me.id) parts.push(el("div", { class: "sd-offer" }, el("p", {}, `${Z.offer.from.name} wants to make you Room ${me.zone}'s leader.`),
      el("div", { class: "sd-row" }, el("button", { type: "button", class: "sd-main", onclick: () => send({ type: "accept" }) }, "Accept"), el("button", { type: "button", class: "sd-ghost", onclick: () => send({ type: "decline" }) }, "No thanks"))));
    if (v.phase === "predict" && v.predict && v.predict.asked) parts.push(predict(v, kit));
    // After an exchange (for those who stayed): who left, who's coming.
    if (v.phase === "moving" && v.move && !v.move.moving) parts.push(el("div", { class: "sd-swap" },
      el("div", {}, el("small", {}, `Left Room ${me.zone}`), el("b", {}, v.move.leaving.length ? list(v.move.leaving) : "–")),
      el("div", { class: "sd-swap-arrows", "aria-hidden": "true" }, "⇄"),
      el("div", {}, el("small", {}, `Coming to Room ${me.zone}`), el("b", {}, v.move.coming.length ? list(v.move.coming) : "–"))));
    if (me.leader && live) {
      const picks = Z.picks, full = picks.length === v.need;
      parts.push(el("div", { class: "sd-lead" + (v.phase === "lock" && !Z.locked ? " urgent" : "") },
        el("h3", {}, `👑 Send ${v.need} to Room ${me.zone === "A" ? "B" : "A"}`),
        Z.locked ? el("p", { class: "sd-done" }, `✔ Locked in: ${Z.people.filter((p) => p.picked).map((p) => p.name).join(", ")}`) : el("div", { class: "sd-picks" }, ...Z.people.filter((p) => p.id !== me.id).map((p) => {
          const on = picks.includes(p.id);
          return el("button", { type: "button", class: "sd-pick", "aria-pressed": String(on), onclick: () => {
            const next = on ? picks.filter((x) => x !== p.id) : picks.length < v.need ? [...picks, p.id] : [...picks.slice(1), p.id];
            if (send({ type: "select", ids: next })) kit.buzz(10);
          } }, el("span", { class: "sd-av" }, face(p)), el("span", { class: "sd-nm" }, p.name), el("span", { class: "sd-box" }, on ? "✔" : ""));
        })),
        Z.locked ? null : el("button", { type: "button", class: "sd-main", disabled: !full, onclick: () => { if (confirm(`Send ${Z.people.filter((p) => p.picked).map((p) => p.name).join(" and ")} to the other room? You can't change it after this.`)) send({ type: "lock" }); } },
          full ? "Lock it in" : `Pick ${v.need - picks.length} more`),
        el("p", { class: "sd-fine" }, v.otherLocked ? "The other room's leader has locked in." : "The other room's leader is still choosing.",
          " Nobody moves until the time's up.", Z.locked ? "" : " You can't pick yourself.")));
    } else if (live && Z.picks.length) {
      parts.push(el("p", { class: "sd-fine sd-center" }, `${Z.locked ? "Locked in" : "The leader is picking"}: ${Z.people.filter((p) => p.picked).map((p) => p.name).join(", ")}`));
    }
    const canVote = v.phase === "round" && !Z.locked;
    parts.push(el("div", { class: "sd-zonebox" },
      el("h3", {}, `Room ${me.zone}: ${Z.people.length} here`, el("small", {}, canVote ? ` · tap a name to vote them leader (${Z.majority} votes needed)` : "")),
      el("ul", { class: "sd-people" }, ...Z.people.map((p) => {
        const mine = Z.myVote === p.id;
        const row = el("li", { class: [p.leader ? "leader" : "", p.picked ? "picked" : "", mine ? "voted" : "", p.connected ? "" : "away"].join(" ") },
          el("span", { class: "sd-av" }, face(p)),
          el("span", { class: "sd-nm" }, p.name, p.id === me.id ? el("small", {}, " (you)") : null),
          el("span", { class: "sd-st" }, p.leader ? "👑 leader" : "", p.picked ? " 📤 moving" : "", !p.arrived && (v.phase === "moving" || v.phase === "arrival") ? " 🚶 on the way" : "", p.votes && canVote ? ` · ${p.votes}🗳️` : ""),
          p.votes && canVote ? el("i", { class: "sd-votebar", style: `--w:${Math.min(100, (p.votes / Z.majority) * 100)}%` }) : null);
        if (canVote) {
          row.classList.add("tap");
          row.setAttribute("role", "button");
          row.tabIndex = 0;
          const vote = () => { if (send({ type: "vote", for: mine ? null : p.id })) kit.buzz(15); };
          row.addEventListener("click", vote);
          row.addEventListener("keydown", (e) => { if (e.key === "Enter") vote(); });
        }
        return row;
      })),
      Z.myVote && canVote ? el("p", { class: "sd-fine" }, `You voted for ${(Z.people.find((p) => p.id === Z.myVote) || {}).name || "someone"}. Tap them again to take it back.`) : null,
      me.leader && canVote ? handover(v, kit) : null));
    parts.push(el("p", { class: "sd-fine sd-center" }, `${zoneFull(v, "A")}: ${v.sizes.A} · ${zoneFull(v, "B")}: ${v.sizes.B}`));
    return parts;
  }
  function handover(v, kit) {
    const { el, send } = kit, Z = v.zone, me = v.me;
    if (Z.offer && Z.offer.from.id === me.id) return el("p", { class: "sd-fine" }, `You offered the leadership to ${Z.offer.to.name}. `, el("button", { type: "button", class: "sd-link", onclick: () => send({ type: "offer", to: null }) }, "Take it back"));
    const pickOne = el("select", { class: "sd-select", "aria-label": "Hand over leadership to" }, el("option", { value: "" }, "Hand over leadership to..."), ...Z.people.filter((p) => p.id !== me.id).map((p) => el("option", { value: p.id }, p.name)));
    pickOne.addEventListener("change", () => { if (pickOne.value) send({ type: "offer", to: pickOne.value }); });
    return pickOne;
  }
  function predict(v, kit) {
    const { el, send } = kit, done = v.predict.pick;
    return el("div", { class: "sd-predict" }, el("h3", {}, "🔮 You're the Forecaster"), el("p", {}, done ? "Prediction in. The reveal is coming..." : "Before the reveal: which team won?"),
      done ? null : el("div", { class: "sd-row" },
        el("button", { type: "button", class: "sd-main sd-sig", onclick: () => send({ type: "predict", pick: "signal" }) }, sign(el, "signal", "mini"), " Signal"),
        el("button", { type: "button", class: "sd-main sd-sta", onclick: () => send({ type: "predict", pick: "static" }) }, sign(el, "static", "mini"), " Static")));
  }

  /* ---------- The reveal: played on every phone together, from the moment the server stamped ----------
     0s static; 1.5s "The Beacon ended in..."; 3s its room; 4.5s "The Jammer ended in..."; 6s its room; 7.5s who won. */
  const CINE_MS = 9000, played = new Set();
  function cinematic(el, r, at, off, v) {
    const t = Date.now() + off - at, z = (x) => (v ? zoneFull(v, x) : `Room ${x}`);
    // Each beat's sound plays once per reveal, however often the screen is redrawn meanwhile.
    const beat = (ms, fn, once) => { if (t < ms) setTimeout(() => { if (once) { const k = at + ":" + ms; if (played.has(k)) return; played.add(k); } fn(); }, ms - t); };
    const box = el("div", { class: "sd-cine" + (r.together ? " together" : " apart") });
    const line = (ms, cls, ...kids) => { const n = el("div", { class: "sd-cline " + cls + (t >= ms ? " in" : "") }, ...kids); beat(ms, () => n.classList.add("in")); return n; };
    box.append(
      el("div", { class: "sd-noise", "aria-hidden": "true" }),
      el("p", { class: "sd-cine-top" }, "The last broadcast..."),
      line(1500, "q", sign(el, "signal", "mini"), "The Beacon ended in..."),
      line(3000, "a sig", el("b", {}, z(r.zone.beacon)), el("span", {}, r.beacon.name)),
      line(4500, "q", sign(el, "static", "mini"), "The Jammer ended in..."),
      line(6000, "a sta", el("b", {}, z(r.zone.jammer)), el("span", {}, r.jammer.name)),
      line(7400, "w", el("b", {}, r.together ? "TOGETHER" : "APART")));
    beat(1, () => sound.play("static"), true);
    beat(3000, () => sound.play("reveal"), true);
    beat(6000, () => sound.play("reveal"), true);
    beat(7400, () => sound.play(v && v.result && v.result.youWon != null ? (v.result.youWon ? "win" : "lose") : "win"), true);
    // The zone's announcer reads it out too.
    if (v && v.me && v.me.announcer && v.me.annOk && t < 1500 && !played.has(at + ":voice")) {
      played.add(at + ":voice");
      voice.say(`The last broadcast. The Beacon ended in Room ${r.zone.beacon}. The Jammer ended in Room ${r.zone.jammer}. ${r.together ? "Together. Static wins!" : "Apart. Signal wins!"}`, true);
    }
    return box;
  }

  function result(v, kit) {
    const { el } = kit, r = v.result, W = FACTIONS[r.winner];
    const why = r.together ? `The Beacon (${r.beacon.name}) and the Jammer (${r.jammer.name}) ended up together in ${zoneFull(v, r.zone.beacon)}.`
      : `The Beacon (${r.beacon.name}) ended in ${zoneFull(v, r.zone.beacon)}, and the Jammer (${r.jammer.name}) in ${zoneFull(v, r.zone.jammer)}: apart.`;
    const rn = v.me ? ROLE_OF(v.me.role).name : "";
    const you = r.youWon == null ? null : el("div", { class: "sd-you " + (r.youWon ? "won" : "lost") }, el("b", {}, r.youWon ? "You win! 🎉" : "You lose"),
      el("span", {}, v.me ? `You were ${rn === "Forecaster" ? "the Forecaster" : `${/^[AEIOU]/.test(rn) ? "an" : "a"} ${rn}`}.` : ""));
    const order = ["beacon", "jammer", "forecaster"];
    const sorted = r.everyone.slice().sort((a, b) => ((order.indexOf(b.role) + 1 || 0) - (order.indexOf(a.role) + 1 || 0)) || a.zone.localeCompare(b.zone));
    return [
      el("div", { class: "sd-win", "data-faction": r.winner }, sign(el, r.winner), el("h2", {}, `${W.short} WINS`), el("p", {}, why)),
      you,
      r.forecaster ? el("p", { class: "sd-fine sd-center" }, `🔮 ${r.forecaster.name}, the Forecaster, ${r.forecaster.pick ? `predicted ${FACTIONS[r.forecaster.pick].name}: ${r.forecaster.won ? "right! They win too." : "wrong."}` : "didn't predict in time."}`) : null,
      el("ul", { class: "sd-reveal" }, ...sorted.map((p, i) => el("li", { "data-faction": ROLE_OF(p.role).faction, style: `--i:${i}`, class: p.role === "beacon" || p.role === "jammer" ? "key" : "" },
        el("span", { class: "sd-av" }, face(p)), el("span", { class: "sd-nm" }, p.name), el("span", { class: "sd-rl" }, sign(el, ROLE_OF(p.role).faction, "mini"), ROLE_OF(p.role).name), el("span", { class: "sd-zn" }, p.zone)))),
      el("p", { class: "sd-fine sd-center" }, kit.host ? "Rematch from the Host tab: new cards, new rooms." : "The host can start a rematch: new cards, new rooms."),
    ];
  }
  return { render, ROLES, FACTIONS, ICONS, hide, sign, cinematic, CINE_MS, sound };
})();
