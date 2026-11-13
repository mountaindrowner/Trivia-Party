/* Signal Divide: a player's screen. One view for every player's phone (huddle/phone draws it for a "divide" screen)
   and for the host's own phone when the host plays (divide.js). The server (huddle/server/src/divide.js) sends each
   phone only what it may know; this draws it.

   Made for a crowd of people standing in a room:
   - The normal screen is neutral: the zone letter, the clock, your zone's people. No team colours anywhere, so a
     glance over your shoulder gives nothing away. Zone A/B is where you stand, never your team.
   - Your card shows only on purpose: hold "My card" to peek (let go and it's gone), or "Show team" / "Show card"
     to turn your phone toward someone you trust (8 seconds, or "Hide now"). Switching apps hides it.
   - One clear sentence on top says what to do next. Moving between zones is a full screen you can't miss.
   - The card overlays live outside the redrawn screen, so the server's updates never snap them shut mid-peek.

   SD_VIEW.render(root, view, kit, toast)   kit = { el, send(data) -> bool, buzz(ms|pattern), host (bool: drawn on
   the host's phone) }   SD_VIEW.ROLES, SD_VIEW.FACTIONS: the cards' words, for the reveal. */
window.SD_VIEW = (() => {
  "use strict";
  const ICONS = {
    tent: "⛺", moon: "🌙", star: "⭐", pine: "🌲", mountain: "🏔️", canoe: "🛶", lantern: "🏮", bear: "🐻", raccoon: "🦝", deer: "🦌", hedgehog: "🦔",
    butterfly: "🦋", mushroom: "🍄", coffee: "☕", dango: "🍡", compass: "🧭", map: "🗺️", sparkles: "✨", snail: "🐌", beaver: "🦫", fox: "🦊", owl: "🦉", guitar: "🎸",
  };
  const FACTIONS = {
    signal: { name: "Signal", short: "SIGNAL", goal: "Keep the Beacon and the Jammer apart." },
    static: { name: "Static", short: "STATIC", goal: "Get the Jammer and the Beacon into the same zone." },
    neutral: { name: "Forecaster", short: "NO TEAM", goal: "Predict which team wins." },
  };
  const ROLES = {
    beacon: { name: "Beacon", faction: "signal", text: "You're the one Static is hunting. Signal wins if you finish in a different zone from the Jammer." },
    jammer: { name: "Jammer", faction: "static", text: "You're Static's special card. Static wins if you finish in the same zone as the Beacon." },
    signal: { name: "Signal member", faction: "signal", text: "Find the Beacon, find the Jammer, and keep them apart." },
    static: { name: "Static member", faction: "static", text: "Find the Beacon, find the Jammer, and bring them together." },
    forecaster: { name: "Forecaster", faction: "neutral", text: "You're on no team. Watch, listen, and at the very end predict which team wins. You win if you're right." },
  };
  const ROLE_OF = (r) => ROLES[r] || ROLES.signal;
  /* Each team's mark, drawn (not a font character, so it looks the same on every phone): Signal's broadcast rings,
     Static's zigzag, the Forecaster's question mark. Always with the team's name too, never colour alone. */
  const SVG = {
    signal: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="5" fill="currentColor"/><circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3.5" opacity=".6"/></svg>',
    static: '<svg viewBox="0 0 48 48" aria-hidden="true"><polyline points="3,30 11,14 19,34 27,12 35,32 45,16" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    neutral: '<svg viewBox="0 0 48 48" aria-hidden="true"><text x="24" y="36" text-anchor="middle" font-size="34" font-weight="700" font-family="system-ui, sans-serif" fill="currentColor">?</text><circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
  };
  const sign = (el, faction, cls) => { const n = el("span", { class: "sd-sign " + (cls || ""), "data-faction": faction }); n.innerHTML = SVG[faction]; return n; };
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const face = (p) => ICONS[p.avatar] || "🙂";

  /* ---------- The clock: counted from the server's deadline, so a sleeping phone catches up when it wakes ---------- */
  let clockAt = null, clockLeft = 0, clockPaused = false, offset = 0;
  setInterval(() => {
    for (const n of document.querySelectorAll(".sd-clock")) n.textContent = clockPaused ? mmss(clockLeft) : clockAt == null ? "" : mmss(clockAt - (Date.now() + offset));
  }, 250);

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
    const b = el("button", { type: "button", class: "sd-peek", "aria-label": "My card: press and hold to see it" }, el("span", { class: "sd-peek-icon" }, "🂠"), el("span", {}, el("b", {}, "My card"), el("small", {}, "Hold to peek")));
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
    b.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !overlay) { e.preventDefault(); overlay = kit.el("div", { class: "sd-overlay sd-peeking" }, cardFace(kit.el, myRole, "full")); document.body.append(overlay); } });
    b.addEventListener("keyup", hide);
    return b;
  }
  function cardBar(kit) {
    const { el } = kit;
    return el("div", { class: "sd-cardbar" }, peekButton(kit),
      el("button", { type: "button", class: "sd-ghost", onclick: () => showOff(kit, "team") }, "Show team"),
      el("button", { type: "button", class: "sd-ghost", onclick: () => showOff(kit, "full") }, "Show card"));
  }

  /* ---------- The screen ----------
     It's redrawn whenever the server says anything changed (with 15 people voting, that's often). A redraw never
     lands under a finger: while one is down, it waits until it lifts, so no tap is lost; and a view that hasn't
     changed isn't redrawn at all. */
  let lastPhase = "", lastMove = "", pressing = false, waiting = null, drawn = "";
  addEventListener("pointerdown", () => { pressing = true; }, true);
  const lift = () => { pressing = false; if (waiting) { const w = waiting; waiting = null; setTimeout(() => render(...w), 0); } };
  addEventListener("pointerup", lift, true);
  addEventListener("pointercancel", lift, true);
  function render(root, v, kit, toast) {
    if (pressing && root.firstChild) { waiting = [root, v, kit, toast]; return; }
    const same = JSON.stringify([v.rev, v.phase, v.me, v.zone, v.paused, v.timer && [v.timer.kind, v.timer.until, v.timer.paused], v.move, v.predict, v.result, v.lobby, toast, kit.host]);
    if (same === drawn && root.querySelector(".sd")) return;
    drawn = same;
    const { el } = kit;
    offset = (v.now || Date.now()) - Date.now();
    myRole = v.me && v.me.role;
    const t = v.timer;
    clockPaused = !!(t && t.paused); clockLeft = t ? t.left : 0; clockAt = t && !t.paused ? t.until : null;
    // A buzz when something changes that you need to look up for.
    const key = `${v.phase}:${v.round}:${v.match}`;
    if (key !== lastPhase) {
      lastPhase = key;
      if (v.phase === "round") kit.buzz([80, 60, 80]);
      if (v.phase === "lock" && v.me && v.me.leader) kit.buzz([200, 100, 200]);
      if (v.phase === "result" || v.phase === "predict") kit.buzz([60, 40, 60, 40, 200]);
    }
    const moveKey = v.move && v.move.moving ? `${v.match}:${v.round}:${v.move.to}` : "";
    if (moveKey && moveKey !== lastMove) { lastMove = moveKey; kit.buzz([300, 120, 300]); }
    const parts = [];
    if (v.paused) parts.push(el("div", { class: "sd-paused" }, "⏸ The host paused the game"));
    if (toast) parts.push(el("div", { class: "sd-toast", role: "alert" }, TOASTS[toast] || "That didn't work. Try again."));
    const ph = v.phase;
    if (ph === "lobby") parts.push(...lobby(v, kit));
    else if (ph === "watch") parts.push(el("div", { class: "sd-big-msg" }, el("h2", {}, "A match is on"), el("p", {}, "You'll be dealt into the next one. Watch, and listen!")));
    else if (ph === "aborted") parts.push(el("div", { class: "sd-big-msg" }, el("h2", {}, "Match stopped"), el("p", {}, "The host stopped this match, so nobody wins it. Wait for the next one.")));
    else if (ph === "result") parts.push(...result(v, kit));
    else if ((ph === "arrival" || ph === "moving") && v.move && (v.move.first || v.move.moving) && !v.me.arrived) parts.push(...moveScreen(v, kit));
    else parts.push(...play(v, kit));
    if (v.log && v.log.length && ph !== "lobby") parts.push(el("ul", { class: "sd-log", "aria-label": "What's happened" }, ...v.log.slice(-3).map((l) => el("li", {}, l))));
    const screen = el("div", { class: "sd sd-" + ph }, ...parts);
    root.replaceChildren(screen);
  }
  const TOASTS = { count: "Pick exactly the number you need first.", leader: "Only your zone's leader can do that.", phase: "Not right now.", zone: "They're not in your zone.", pick: "You can't pick that.", offer: "That offer is gone." };

  function lobby(v, kit) {
    const { el, send } = kit, L = v.lobby, ready = v.me && v.me.ready;
    return [
      el("div", { class: "sd-hero" }, el("div", { class: "sd-logo" }, "SIGNAL", el("span", {}, "DIVIDE")), el("p", { class: "sd-tag" }, "Two zones. Hidden teams. One last move.")),
      el("p", { class: "sd-count" }, el("b", {}, `${L.count}`), ` joined · ${L.ready} ready · ${L.min}–${L.max} can play`),
      kit.host ? el("p", { class: "sd-line" }, "You're playing too: you're ready. Deal from the Host tab.")
        : el("button", { type: "button", class: "sd-main" + (ready ? " on" : ""), "aria-pressed": String(!!ready), onclick: () => { if (send({ type: "ready", on: !ready })) kit.buzz(30); } }, ready ? "✔ Ready! (tap to undo)" : "I'm ready"),
      el("ol", { class: "sd-how" },
        el("li", {}, el("b", {}, "Two secret teams. "), "Signal wants the Beacon and the Jammer to finish apart. Static wants them together."),
        el("li", {}, el("b", {}, "Your phone gives you a card and a zone. "), "Your zone (A or B) is where you stand, not your team."),
        el("li", {}, el("b", {}, "Talk to the people in your zone. "), "Show your team or your card to anyone you trust, or don't. Lying is part of the game."),
        el("li", {}, el("b", {}, "Each zone has a leader. "), "After each round (3, 2, then 1 minutes) the leader sends 2, then 1, then 1 people to the other zone."),
        el("li", {}, el("b", {}, "Your card never changes. "), "Only people move. At the end, where the Beacon and the Jammer stand decides it.")),
      el("p", { class: "sd-fine" }, "Bluff about your card, never about anyone's real life. Stay in your zone, and no signals across."),
      el("ul", { class: "sd-people" }, ...L.people.map((p) => el("li", { class: p.ready ? "ready" : "" }, el("span", { class: "sd-av" }, face(p)), el("span", { class: "sd-nm" }, p.name), el("span", { class: "sd-st" }, p.ready ? "✔" : "…")))),
    ];
  }

  function moveScreen(v, kit) {
    const { el, send } = kit, m = v.move, z = v.me.zone;
    return [el("div", { class: "sd-move" },
      el("p", { class: "sd-move-top" }, m.first ? "Your zone" : "Move now"),
      el("div", { class: "sd-move-arrow", "aria-hidden": "true" }, m.first ? "📍" : "➜"),
      el("h2", {}, m.first ? "GO TO ZONE " : "MOVE TO ZONE ", el("span", { class: "sd-zl" }, z)),
      el("p", {}, m.first ? "This is where you stand, not your team. Your card is secret until you choose to show it." : "Take your phone with you. Your card stays exactly the same."),
      el("button", { type: "button", class: "sd-main", onclick: () => { if (send({ type: "here" })) kit.buzz(40); } }, `I'm in Zone ${z}`))];
  }

  function header(v, el) {
    const t = v.timer;
    const label = !t ? "" : t.kind === "start" ? "Starts in" : t.kind === "grace" ? "Leaders lock in" : t.kind === "predict" ? "Prediction" : "Time left";
    return el("div", { class: "sd-top" },
      el("div", { class: "sd-zone", "aria-label": `You're in Zone ${v.me.zone}` }, el("small", {}, "ZONE"), el("b", {}, v.me.zone)),
      el("div", { class: "sd-round" }, el("small", {}, v.phase === "predict" || (v.phase === "moving" && v.final) ? "Final" : `Round ${v.round} of ${v.rounds}`),
        el("b", { class: "sd-clock" + (t && t.kind === "round" && t.left < 30000 ? " low" : "") }, t ? (t.paused ? mmss(t.left) : mmss(t.until - (Date.now() + offset))) : "–"), el("small", {}, label)));
  }

  /** The one sentence on top: what to do now. */
  function nextStep(v) {
    const lead = v.zone.leader, me = v.me, need = v.need;
    if (v.phase === "arrival") return "Waiting for everyone to reach their zone. The round starts when they're all there.";
    if (v.phase === "moving") {
      if (v.final) return "The last moves are happening. Then the reveal.";
      return v.move && v.move.coming && v.move.coming.length ? `Coming to Zone ${me.zone}: ${v.move.coming.join(", ")}. Round ${v.round} starts when they're here.` : `Round ${v.round} starts when everyone has moved.`;
    }
    if (v.phase === "predict") return "Waiting for the Forecaster's prediction...";
    if (v.phase === "lock") return me.leader ? (v.zone.locked ? "Locked! Waiting for the other leader." : `Time's up! Lock in ${need} to send, now.`) : `Time's up! ${lead ? lead.name : "The leader"} is locking in who moves.`;
    if (me.leader) return v.zone.locked ? `You've locked in. They move when the time's up.` : `You lead Zone ${me.zone}. Before time's up, pick ${need} to send to the other zone.`;
    return `Talk to Zone ${me.zone}. ${lead ? lead.name : "The leader"} leads, and picks ${need} to send away when time's up. Not happy? Vote for someone else.`;
  }

  function play(v, kit) {
    const { el, send } = kit, me = v.me, Z = v.zone, live = v.phase === "round" || v.phase === "lock";
    const parts = [header(v, el), el("p", { class: "sd-next" }, nextStep(v)), cardBar(kit)];
    // A leader's handover offer, for the one it's offered to.
    if (Z.offer && Z.offer.to.id === me.id) parts.push(el("div", { class: "sd-offer" }, el("p", {}, `${Z.offer.from.name} wants to make you Zone ${me.zone}'s leader.`),
      el("div", { class: "sd-row" }, el("button", { type: "button", class: "sd-main", onclick: () => send({ type: "accept" }) }, "Accept"), el("button", { type: "button", class: "sd-ghost", onclick: () => send({ type: "decline" }) }, "No thanks"))));
    if (v.phase === "predict" && v.predict && v.predict.asked) parts.push(predict(v, kit));
    // The leader's picks.
    if (me.leader && live) {
      const picks = Z.picks, full = picks.length === v.need;
      parts.push(el("div", { class: "sd-lead" },
        el("h3", {}, `👑 Send ${v.need} to Zone ${me.zone === "A" ? "B" : "A"}`),
        Z.locked ? el("p", { class: "sd-done" }, `✔ Locked in: ${Z.people.filter((p) => p.picked).map((p) => p.name).join(", ")}`) : el("div", { class: "sd-picks" }, ...Z.people.filter((p) => p.id !== me.id).map((p) => {
          const on = picks.includes(p.id);
          return el("button", { type: "button", class: "sd-pick", "aria-pressed": String(on), onclick: () => {
            const next = on ? picks.filter((x) => x !== p.id) : picks.length < v.need ? [...picks, p.id] : [...picks.slice(1), p.id];
            if (send({ type: "select", ids: next })) kit.buzz(10);
          } }, el("span", { class: "sd-av" }, face(p)), el("span", { class: "sd-nm" }, p.name), el("span", { class: "sd-box" }, on ? "✔" : ""));
        })),
        Z.locked ? null : el("button", { type: "button", class: "sd-main", disabled: !full, onclick: () => { if (confirm(`Send ${Z.people.filter((p) => p.picked).map((p) => p.name).join(" and ")} to the other zone? You can't change it after this.`)) send({ type: "lock" }); } },
          full ? "Lock it in" : `Pick ${v.need - picks.length} more`),
        el("p", { class: "sd-fine" }, v.otherLocked ? "The other zone's leader has locked in." : "The other zone's leader is still choosing.",
          " Nobody moves until the time's up.", Z.locked ? "" : " You can't pick yourself.")));
    } else if (live && Z.picks.length) {
      parts.push(el("p", { class: "sd-fine sd-center" }, `${Z.locked ? "Locked in" : "The leader is picking"}: ${Z.people.filter((p) => p.picked).map((p) => p.name).join(", ")}`));
    }
    // Your zone's people: leader, votes, picks, and who's still on the way.
    const canVote = v.phase === "round" && !Z.locked;
    parts.push(el("div", { class: "sd-zonebox" },
      el("h3", {}, `Zone ${me.zone}: ${Z.people.length} here`, el("small", {}, canVote ? ` · tap a name to vote them leader (${Z.majority} votes needed)` : "")),
      el("ul", { class: "sd-people" }, ...Z.people.map((p) => {
        const mine = Z.myVote === p.id;
        const row = el("li", { class: [p.leader ? "leader" : "", p.picked ? "picked" : "", mine ? "voted" : "", p.connected ? "" : "away"].join(" ") },
          el("span", { class: "sd-av" }, face(p)),
          el("span", { class: "sd-nm" }, p.name, p.id === me.id ? el("small", {}, " (you)") : null),
          el("span", { class: "sd-st" }, p.leader ? "👑 leader" : "", p.picked ? " 📤 moving" : "", !p.arrived && (v.phase === "moving" || v.phase === "arrival") ? " 🚶 on the way" : "", p.votes && canVote ? ` · ${p.votes}🗳️` : ""));
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
    parts.push(el("p", { class: "sd-fine sd-center" }, `Zone A: ${v.sizes.A} · Zone B: ${v.sizes.B}`));
    return parts;
  }
  /** A leader can hand the job to someone in the zone (it takes when they accept). */
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

  function result(v, kit) {
    const { el } = kit, r = v.result, W = FACTIONS[r.winner];
    const why = r.together ? `The Beacon (${r.beacon.name}) and the Jammer (${r.jammer.name}) ended up together in Zone ${r.zone.beacon}.`
      : `The Beacon (${r.beacon.name}) ended in Zone ${r.zone.beacon}, and the Jammer (${r.jammer.name}) in Zone ${r.zone.jammer}: apart.`;
    const you = r.youWon == null ? null : el("div", { class: "sd-you " + (r.youWon ? "won" : "lost") }, el("b", {}, r.youWon ? "You win! 🎉" : "You lose"),
      el("span", {}, v.me ? `You were ${ROLE_OF(v.me.role).name === "Forecaster" ? "the Forecaster" : `${/^[AEIOU]/.test(ROLE_OF(v.me.role).name) ? "an" : "a"} ${ROLE_OF(v.me.role).name}`}.` : ""));
    const sorted = r.everyone.slice().sort((a, b) => (["beacon", "jammer", "forecaster"].indexOf(b.role) - ["beacon", "jammer", "forecaster"].indexOf(a.role)) || a.zone.localeCompare(b.zone));
    return [
      el("div", { class: "sd-win", "data-faction": r.winner }, sign(el, r.winner), el("h2", {}, `${W.short} WINS`), el("p", {}, why)),
      you,
      r.forecaster ? el("p", { class: "sd-fine sd-center" }, `🔮 ${r.forecaster.name}, the Forecaster, ${r.forecaster.pick ? `predicted ${FACTIONS[r.forecaster.pick].name}: ${r.forecaster.won ? "right! They win too." : "wrong."}` : "didn't predict in time."}`) : null,
      el("ul", { class: "sd-reveal" }, ...sorted.map((p, i) => el("li", { "data-faction": ROLE_OF(p.role).faction, style: `--i:${i}` },
        el("span", { class: "sd-av" }, face(p)), el("span", { class: "sd-nm" }, p.name), el("span", { class: "sd-rl" }, sign(el, ROLE_OF(p.role).faction, "mini"), ROLE_OF(p.role).name), el("span", { class: "sd-zn" }, p.zone)))),
      el("p", { class: "sd-fine sd-center" }, kit.host ? "Rematch from the Host tab: new cards, new zones." : "The host can start a rematch: new cards, new zones."),
    ];
  }
  return { render, ROLES, FACTIONS, ICONS, hide };
})();
