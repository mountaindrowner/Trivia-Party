/* Lights Out: your secret card, and everything you do with it. One view for the players' phones (huddle/phone draws
   it for a "secret" screen) and for the host's own phone when the host plays too (night.js).

   The card is face down. Hold your thumb on it to peek; let go and it turns back over, so nobody next to you sees.
   What you learned in the night is on the back of it too. Stages (s.stage):
     deal    your card, what it does, and the cards in play; "Got it" sends { type: "ready", round }
     night   your card's job: pick a player, two players, a card in the middle (or the Counselor's either-or), or a
             hunch for everyone without one; sends { type: "night", round, players: [ids], center: [0..2] }
     day     the card and what you learned, the cards in play, the time left to talk
     vote    pick who's out; sends { type: "vote", round, target }
     reveal  what really happened: who's out, everyone's cards, the night's story, and whether you won
     wait    a message (joined mid-round, between rounds)

   LO_CARD.view(s, kit) -> a node. kit = { el, send(data) -> bool, buzz(ms), face (your icon), name } */
window.LO_CARD = (() => {
  "use strict";
  const CENTER = ["Left", "Middle", "Right"];
  // Switching away from the page turns every card back over.
  document.addEventListener("visibilitychange", () => document.querySelectorAll(".lo-card.peek").forEach((n) => n.classList.remove("peek")));
  const team = (c) => (c.team === "wolf" ? "wolf" : c.team === "self" ? "self" : "camp");

  /** Seconds left, as a bar that runs down (the host keeps the real time). */
  function timeBar(el, seconds) {
    const bar = el("div", { class: "lo-time", "aria-hidden": "true" }, el("i", { style: `animation-duration:${Math.max(1, seconds)}s` }));
    return bar;
  }
  /** The card itself: face down until you hold it. */
  function cardNode(s, kit) {
    const { el } = kit, c = s.card;
    const front = el("div", { class: "lo-front", "data-team": team(c) },
      el("small", { class: "lo-was" }, s.stage === "deal" || s.stage === "night" ? "You are the" : "You started as the"),
      el("div", { class: "lo-icon" }, c.icon),
      el("div", { class: "lo-name" }, c.name),
      el("span", { class: "lo-team" }, c.teamName),
      el("p", { class: "lo-goal" }, c.goal),
      s.stage === "deal" || s.stage === "night" ? el("p", { class: "lo-job" }, el("b", {}, "Tonight: "), c.night) : null,
      s.lines && s.lines.length ? el("div", { class: "lo-learned" }, el("b", {}, s.linesTitle || "Last night"), ...s.lines.map((l) => el("p", {}, l))) : null);
    const back = el("div", { class: "lo-back" }, el("div", { class: "lo-moon" }, "🌙"), el("b", {}, "Hold to peek"), el("small", {}, "Just for your eyes!"));
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
  const deckNode = (el, deck) => (deck && deck.length ? el("div", { class: "lo-deck" }, el("small", {}, "Cards in play (3 of them are in the middle)"),
    el("div", {}, ...deck.map((d) => el("span", { class: "lo-chip", "data-team": team(d) }, `${d.icon} ${d.name}${d.n > 1 ? " ×" + d.n : ""}`)))) : null);

  /** The night's job, or the vote. Taps are kept until there are enough, then sent once. */
  function actionNode(s, kit) {
    const { el } = kit, a = s.action;
    if (!a) return null;
    const box = el("div", { class: "lo-act" });
    const note = el("p", { class: "lo-note" });
    if (a.done) { box.append(el("p", { class: "lo-done" }, a.doneText || "✔ Done. Now wait for morning...")); return box; }
    const picked = { players: [], center: [] };
    const need = { player: [1, 0], two: [2, 0], center: [0, 1], hunch: [1, 0], vote: [1, 0] }[a.kind];
    let sent = false;
    const finish = (skip) => {
      if (sent) return;
      const data = a.kind === "vote" ? { type: "vote", round: s.round, target: picked.players[0] } : { type: "night", round: s.round, players: skip ? [] : picked.players, center: skip ? [] : picked.center };
      if (!kit.send(data)) return;
      sent = true;
      kit.buzz(30);
      box.classList.add("sent");
      box.replaceChildren(el("p", { class: "lo-done" }, a.kind === "vote" ? "✔ Vote in! Wait for everyone..." : skip ? "✔ Skipped. Now wait for morning..." : "✔ Done. Now wait for morning..."));
    };
    const ready = () => {
      if (a.kind === "counselor") return picked.players.length === 1 || picked.center.length === 2;
      return picked.players.length >= need[0] && picked.center.length >= need[1];
    };
    const toggle = (list, x, btn, max, other) => {
      if (sent) return;
      if (other && other.length) { other.length = 0; box.querySelectorAll("[aria-pressed=true]").forEach((b) => b.setAttribute("aria-pressed", "false")); }
      const i = list.indexOf(x);
      if (i >= 0) { list.splice(i, 1); btn.setAttribute("aria-pressed", "false"); return; }
      if (list.length >= max) { const old = list.shift(); const ob = box.querySelector(`[data-k="${old}"]`); if (ob) ob.setAttribute("aria-pressed", "false"); }
      list.push(x); btn.setAttribute("aria-pressed", "true"); kit.buzz(10);
      if (ready()) { if (a.kind === "two" || (a.kind === "counselor" && picked.center.length === 2)) setTimeout(() => { if (ready()) finish(false); }, 350); else finish(false); }
      else note.textContent = a.kind === "two" ? "Now pick one more." : a.kind === "counselor" ? "Now pick one more middle card." : "";
    };
    box.append(el("p", { class: "lo-prompt" }, a.prompt));
    const showPlayers = a.kind !== "center", showCenter = a.kind === "center" || a.kind === "counselor";
    if (showPlayers) box.append(el("div", { class: "lo-people" + (a.players.length > 6 ? " many" : "") }, ...a.players.map((p) => {
      const b = el("button", { type: "button", class: "lo-pick", "aria-pressed": "false", "data-k": p.id, onclick: () => toggle(picked.players, p.id, b, a.kind === "two" ? 2 : 1, a.kind === "counselor" ? picked.center : null) }, el("span", { class: "lo-face" }, p.face), p.name);
      return b;
    })));
    if (showCenter) box.append(el("div", { class: "lo-middle" }, ...CENTER.map((label, i) => {
      const b = el("button", { type: "button", class: "lo-pick", "aria-pressed": "false", "data-k": "c" + i, onclick: () => toggle(picked.center, i, b, a.kind === "counselor" ? 2 : 1, a.kind === "counselor" ? picked.players : null) }, el("span", { class: "lo-mini" }, "🌙"), label);
      return b;
    })));
    box.append(note);
    if (a.skip) box.append(el("button", { type: "button", class: "ghost lo-skip", onclick: () => finish(true) }, a.skip));
    return box;
  }

  function revealNode(s, kit) {
    const { el } = kit, r = s.reveal;
    return el("div", { class: "lo-reveal" },
      el("h2", { class: "lo-headline" }, r.headline),
      r.you ? el("div", { class: "lo-you " + (r.you.won ? "won" : "lost") }, el("div", { class: "lo-big" }, r.you.won ? "You win! 🎉" : "You lose"), el("p", {}, r.you.line)) : null,
      el("p", { class: "lo-outline" }, r.outLine),
      el("ul", { class: "lo-all" }, ...r.people.map((p) => el("li", { class: (p.out ? "out " : "") + (p.won ? "won" : ""), "data-team": team(p.end) },
        el("span", { class: "lo-face" }, p.face),
        el("span", { class: "lo-who" }, el("b", {}, p.name), el("small", {}, p.start.name === p.end.name ? `${p.end.icon} ${p.end.name} all night` : `${p.start.icon} ${p.start.name} → ${p.end.icon} ${p.end.name}`)),
        el("span", { class: "lo-votes" }, p.out ? "OUT" : "", p.votes ? ` ${p.votes}🗳️` : "")))),
      el("p", { class: "lo-mid" }, el("b", {}, "In the middle: "), r.center.map((c) => `${c.icon} ${c.name}`).join(" · ")),
      el("div", { class: "lo-story" }, el("b", {}, "What really happened"), ...r.story.map((l) => el("p", {}, l))));
  }

  function view(s, kit) {
    const { el } = kit;
    const root = el("div", { class: "lo lo-" + (s.stage || "wait") });
    if (s.stage === "reveal" && s.reveal) { root.append(revealNode(s, kit)); return root; }
    if (s.title) root.append(el("h2", { class: "lo-title" }, s.title));
    if (s.text) root.append(el("p", { class: "lo-text" }, s.text));
    if (s.seconds) root.append(timeBar(el, s.seconds));
    if (s.card) root.append(cardNode(s, kit));
    if (s.action) root.append(actionNode(s, kit));
    if (s.stage === "deal" && s.button) {
      let done = !!s.ready;
      const b = el("button", { type: "button", class: "lo-ready", disabled: done, onclick: () => { if (!done && kit.send({ type: "ready", round: s.round })) { done = true; b.disabled = true; b.textContent = "✔ Got it"; kit.buzz(30); } } }, done ? "✔ Got it" : s.button);
      root.append(b);
    }
    if (s.stage === "deal" || s.stage === "day") root.append(deckNode(el, s.deck));
    return root;
  }
  return { view };
})();
