/* Lights Out: your secret card, and everything you do with it. One view for the players' phones (huddle/phone draws
   it for a "secret" screen) and for the host's own phone when the host plays too (night.js).

   Made for personal phones held in a circle of people:
   - The card is face down. Hold your thumb on it to peek; let go (or switch apps) and it flips back over. What you
     learned in the night is on the back of it too.
   - At night every phone looks the same at a glance: the same grid of players, the same three middle cards, the
     same Skip. Only the small line on top says what your card can do, so nobody can read your role off your screen.
   - Each new stage buzzes the phone and sweeps in with its own curtain (lights out, sunrise, the vote), so people
     can talk and look up instead of staring at their screens.
   - Every card in play is a chip you can tap to read what it does, at any time.

   Stages (s.stage):
     wait    a message, with "how it works" steps (the lobby) or the round in progress
     deal    your card, what it does, and the cards in play; "Got it" sends { type: "ready", round }
     night   your card's job (or a hunch); sends { type: "night", round, players: [ids], center: [0..2] }
     day     the card and what you learned, the cards in play, the time left to talk
     vote    pick who's out; sends { type: "vote", round, target }
     reveal-wait  "look up!" while the host's phone reveals who's out
     reveal  what really happened: who's out, why that side won, everyone's cards, the night step by step

   LO_CARD.view(s, kit) -> a node. kit = { el, send(data) -> bool, buzz(ms|pattern), face, name }
   LO_CARD.deck(el, deck, title) -> the cards in play, tappable to read each one. */
window.LO_CARD = (() => {
  "use strict";
  const CENTER = ["1", "2", "3"];
  const team = (c) => (c.team === "wolf" ? "wolf" : c.team === "self" ? "self" : "camp");
  const SIDE = { camp: "Camp's side", wolf: "Wolves' side", self: "On their own" };
  // Switching away from the page turns every card back over.
  document.addEventListener("visibilitychange", () => document.querySelectorAll(".lo-card.peek").forEach((n) => n.classList.remove("peek")));

  /* A sweep across the screen when the stage changes, and a buzz, so phones can stay in pockets and laps. */
  let lastKey = "";
  const CURTAIN = { night: ["🌙", "Lights out"], day: ["☀️", "Good morning"], vote: ["🗳️", "Time to vote"], "reveal-wait": ["🥁", "The votes are in"] };
  const BUZZ = { deal: [60, 60, 60], night: [200], day: [80, 80, 80], vote: [120, 60, 120], "reveal-wait": [40, 40, 40, 40, 40], reveal: [60, 40, 200] };
  function curtain(s, kit) {
    const key = s.stage + ":" + s.round;
    if (key === lastKey) return null;
    lastKey = key;
    if (BUZZ[s.stage]) kit.buzz(BUZZ[s.stage]);
    const c = CURTAIN[s.stage];
    if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    // On the page itself, over everything (not inside the screen, whose animation would hold it in place).
    const n = kit.el("div", { class: "lo lo-curtain lo-curtain-" + s.stage, "aria-hidden": "true" }, kit.el("span", {}, c[0]), kit.el("b", {}, c[1]));
    document.body.append(n);
    setTimeout(() => n.remove(), 2600);
    return null;
  }

  /** Seconds left, as a bar that runs down (the host keeps the real time). */
  const timeBar = (el, seconds) => el("div", { class: "lo-time", "aria-hidden": "true" }, el("i", { style: `animation-duration:${Math.max(1, seconds)}s` }));

  /** The card itself: face down until you hold it. */
  function cardNode(s, kit) {
    const { el } = kit, c = s.card, early = s.stage === "deal" || s.stage === "night";
    const front = el("div", { class: "lo-front", "data-team": team(c) },
      el("small", { class: "lo-was" }, early ? "You are the" : "You started as the"),
      el("div", { class: "lo-icon" }, c.icon),
      el("div", { class: "lo-name" }, c.name),
      el("span", { class: "lo-team" }, c.teamName),
      el("p", { class: "lo-goal" }, c.goal),
      early ? el("p", { class: "lo-job" }, el("b", {}, "Tonight: "), c.night) : el("p", { class: "lo-job" }, el("b", {}, "Careful: "), "your card may have been swapped in the night. You're whatever card you ended up with."),
      s.lines && s.lines.length ? el("div", { class: "lo-learned" }, el("b", {}, s.linesTitle || "Last night"), ...s.lines.map((l) => el("p", {}, l))) : null);
    const back = el("div", { class: "lo-back" }, el("i", { class: "lo-sheen" }), el("div", { class: "lo-moon" }, "🌙"), el("b", {}, "Hold to peek"),
      el("small", {}, s.lines && s.lines.length && !early ? "Your card, and what you learned" : "Tilt it toward you first!"));
    const node = el("div", { class: "lo-card", role: "button", tabindex: "0", "aria-label": "Your card. Press and hold to see it." }, el("div", { class: "lo-flip" }, back, front));
    const on = (e) => { if (e) e.preventDefault(); if (!node.classList.contains("peek")) { node.classList.add("peek"); kit.buzz(12); } };
    const off = () => node.classList.remove("peek");
    node.addEventListener("pointerdown", (e) => { try { node.setPointerCapture(e.pointerId); } catch (err) {} on(e); });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) node.addEventListener(ev, off);
    node.addEventListener("contextmenu", (e) => e.preventDefault());
    node.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") on(e); });
    node.addEventListener("keyup", off);
    return node;
  }

  /** The cards in play, as chips: tap one to read what it does. */
  function deck(el, list, title) {
    if (!list || !list.length) return null;
    const info = el("div", { class: "lo-info", hidden: true });
    let open = null;
    const chips = list.map((d) => {
      const b = el("button", { type: "button", class: "lo-chip", "data-team": team(d), "aria-expanded": "false", onclick: () => {
        if (open === b) { open = null; info.hidden = true; b.setAttribute("aria-expanded", "false"); return; }
        if (open) open.setAttribute("aria-expanded", "false");
        open = b; b.setAttribute("aria-expanded", "true");
        info.dataset.team = team(d);
        info.replaceChildren(el("b", {}, `${d.icon} ${d.name}`, el("span", {}, SIDE[team(d)])), d.night ? el("p", {}, el("i", {}, "At night: "), d.night) : null, d.goal ? el("p", {}, el("i", {}, "To win: "), d.goal) : null);
        info.hidden = false;
      } }, `${d.icon} ${d.name}${d.n > 1 ? " ×" + d.n : ""}`);
      return b;
    });
    return el("div", { class: "lo-deck" }, el("small", {}, title || "Cards in play (3 of them are in the middle). Tap one to see what it does:"), el("div", { class: "lo-chips" }, ...chips), info);
  }

  /** The night's job, or the vote. Every night screen has the same buttons, whatever your card. */
  function actionNode(s, kit) {
    const { el } = kit, a = s.action;
    if (!a) return null;
    const box = el("div", { class: "lo-act" });
    if (a.done) { box.append(el("p", { class: "lo-done" }, a.doneText || "✔ Done! Now wait for morning...")); return box; }
    const note = el("p", { class: "lo-note" }, a.kind === "vote" ? "Most votes is out (a tie: all of them). Nobody with 2+ votes? Nobody's out." : "Everyone taps something, so nobody can tell who has a job.");
    const picked = { players: [], center: [] };
    let sent = false;
    const finish = (skip) => {
      if (sent) return;
      const data = a.kind === "vote" ? { type: "vote", round: s.round, target: picked.players[0] } : { type: "night", round: s.round, players: skip ? [] : picked.players, center: skip ? [] : picked.center };
      if (!kit.send(data)) return;
      sent = true;
      kit.buzz(30);
      box.replaceChildren(el("p", { class: "lo-done" }, a.kind === "vote" ? "✔ Vote in! Wait for everyone..." : "✔ Done! Now wait for morning..."),
        a.kind === "vote" ? null : el("p", { class: "lo-note" }, "Put your phone face down, if you like. It'll buzz in the morning."));
    };
    // What each card may tap: players, middle cards, or (the Counselor) one player or two middle cards.
    const wants = {
      player: { players: 1, center: 0, wrongMid: "Tonight you pick a player, not a middle card." },
      two: { players: 2, center: 0, wrongMid: "Tonight you pick two players, not middle cards." },
      center: { players: 0, center: 1, wrongPlayer: "Tonight you pick one of the three middle cards." },
      counselor: { players: 1, center: 2 },
      hunch: { players: 1, center: 1 },
      vote: { players: 1, center: 0 },
    }[a.kind];
    const either = a.kind === "counselor" || a.kind === "hunch";
    const ready = () => (either ? picked.players.length === 1 || picked.center.length === wants.center
      : picked.players.length >= wants.players && picked.center.length >= wants.center);
    const clear = (which) => { picked[which].length = 0; box.querySelectorAll(which === "players" ? ".lo-people [aria-pressed=true]" : ".lo-middle [aria-pressed=true]").forEach((b) => b.setAttribute("aria-pressed", "false")); };
    const tap = (which, x, btn) => {
      if (sent) return;
      const list = picked[which], max = wants[which];
      if (!max) { note.textContent = which === "center" ? wants.wrongMid : wants.wrongPlayer; note.classList.add("warn"); kit.buzz(80); return; }
      note.classList.remove("warn");
      if (either) clear(which === "players" ? "center" : "players");
      const i = list.indexOf(x);
      if (i >= 0) { list.splice(i, 1); btn.setAttribute("aria-pressed", "false"); return; }
      if (list.length >= max) { const old = list.shift(); const ob = box.querySelector(`[data-k="${which === "center" ? "c" + old : old}"]`); if (ob) ob.setAttribute("aria-pressed", "false"); }
      list.push(x); btn.setAttribute("aria-pressed", "true"); kit.buzz(10);
      if (ready()) { const pause = a.kind === "two" || (a.kind === "counselor" && picked.center.length) ? 350 : 0; setTimeout(() => { if (ready()) finish(false); }, pause); }
      else note.textContent = a.kind === "two" ? "Now tap one more player." : "Now tap one more middle card.";
    };
    box.append(el("p", { class: "lo-prompt" }, a.prompt));
    box.append(el("div", { class: "lo-people" + (a.players.length > 6 ? " many" : "") }, ...a.players.map((p) => {
      const b = el("button", { type: "button", class: "lo-pick", "aria-pressed": "false", "data-k": p.id, onclick: () => tap("players", p.id, b) }, el("span", { class: "lo-face" }, p.face), el("span", { class: "lo-pname" }, p.name));
      return b;
    })));
    if (a.kind !== "vote") box.append(el("small", { class: "lo-midlabel" }, "The 3 cards in the middle:"), el("div", { class: "lo-middle" }, ...CENTER.map((label, i) => {
      const b = el("button", { type: "button", class: "lo-pick", "aria-pressed": "false", "data-k": "c" + i, onclick: () => tap("center", i, b) }, el("span", { class: "lo-mini" }), label);
      return b;
    })));
    box.append(note);
    if (a.skip) box.append(el("button", { type: "button", class: "ghost lo-skip", onclick: () => finish(true) }, a.skip));
    return box;
  }

  /** What really happened. */
  function revealNode(s, kit) {
    const { el } = kit, r = s.reveal;
    return el("div", { class: "lo-reveal" },
      el("h2", { class: "lo-headline" }, r.headline),
      r.why ? el("p", { class: "lo-why" }, r.why) : null,
      r.you ? el("div", { class: "lo-you " + (r.you.won ? "won" : "lost") }, el("div", { class: "lo-big" }, r.you.won ? "You win! 🎉" : "You lose"), el("p", {}, r.you.line)) : null,
      el("p", { class: "lo-outline" }, r.outLine),
      el("ul", { class: "lo-all" }, ...r.people.map((p, i) => el("li", { class: (p.out ? "out " : "") + (p.won ? "won" : ""), "data-team": team(p.end), style: `--i:${i}` },
        el("span", { class: "lo-face" }, p.face),
        el("span", { class: "lo-who" }, el("b", {}, p.name), el("small", {}, p.start.name !== p.end.name ? `${p.start.icon} ${p.start.name} → ${p.end.icon} ${p.end.name}` : p.moved ? `${p.end.icon} ${p.end.name} (swapped away, and back!)` : `${p.end.icon} ${p.end.name} all night`)),
        el("span", { class: "lo-votes" }, p.out ? "OUT" : "", p.votes ? ` ${p.votes}🗳️` : "")))),
      el("p", { class: "lo-mid" }, el("b", {}, "In the middle: "), r.center.map((c) => `${c.icon} ${c.name}`).join(" · ")),
      el("div", { class: "lo-story" }, el("b", {}, "What really happened last night"), el("ol", {}, ...r.story.map((l) => el("li", {}, l)))),
      el("p", { class: "lo-note" }, "🏆 won this round. The host can deal again."));
  }

  function view(s, kit) {
    const { el } = kit;
    const root = el("div", { class: "lo lo-" + (s.stage || "wait") });
    const sweep = curtain(s, kit);
    if (sweep) root.append(sweep);
    if (s.stage === "reveal" && s.reveal) { root.append(revealNode(s, kit)); return root; }
    if (s.title) root.append(el("h2", { class: "lo-title" }, s.title));
    if (s.text) root.append(el("p", { class: "lo-text" }, s.text));
    if (s.how) root.append(el("ol", { class: "lo-how" }, ...s.how.map((h, i) => el("li", { style: `--i:${i}` }, el("span", {}, h[0]), el("p", {}, h[1])))));
    if (s.seconds) root.append(timeBar(el, s.seconds));
    if (s.card) root.append(cardNode(s, kit));
    if (s.action) root.append(actionNode(s, kit));
    if (s.stage === "deal" && s.button) {
      let done = !!s.ready;
      const note = el("p", { class: "lo-note" }, done ? "Waiting for everyone to look at their card..." : "Tap when you know what you are.");
      const b = el("button", { type: "button", class: "lo-ready", disabled: done, onclick: () => {
        if (!done && kit.send({ type: "ready", round: s.round })) { done = true; b.disabled = true; b.textContent = "✔ Got it"; note.textContent = "Waiting for everyone to look at their card..."; kit.buzz(30); }
      } }, done ? "✔ Got it" : s.button);
      root.append(b, note);
    }
    if (s.deck) root.append(deck(el, s.deck));
    return root;
  }
  return { view, deck };
})();
