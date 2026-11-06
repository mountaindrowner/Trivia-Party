/* Spark Wars: Timeline. A set of Bible events, people or books (spark/data/timeline.js). The first card goes on the
   line; then each new card is dealt and everyone taps where it goes. Right: +500, plus up to +500 for speed, and a
   streak bonus. The card then snaps into its real place for everyone, so the line keeps growing. A few sets per game.
   References only show at the reveal, since they'd give the order away. */
(() => {
  const used = new Set(); // sets already played tonight
  const SECS = 15;

  SW.game({
    key: "timeline", name: "Timeline", icon: "🧭", about: "Put the Bible in order, one card at a time.",
    settings(chips, prefs) {
      return [
        chips("Sets", [[2, "2"], [3, "3"], [4, "4"]], prefs.sets, (v) => { prefs.sets = v; }),
        chips("Level", [[0, "Mixed"], [1, "Easy"], [2, "Medium"], [3, "Hard"]], prefs.tlvl || 0, (v) => { prefs.tlvl = v; }),
      ];
    },

    async run(sw) {
      const { el, show, shuffle, fmt, face, names, S, put, prefs, byId, cast, fx } = sw;
      const all = (window.SPARK_DATA && SPARK_DATA.TIMELINE) || [];
      const fits = (s) => !prefs.tlvl || s.lvl === prefs.tlvl;
      let deck = shuffle(all.filter((s) => fits(s) && !used.has(s.title)));
      if (deck.length < (prefs.sets || 3)) { for (const s of all) if (fits(s)) used.delete(s.title); deck = shuffle(all.filter(fits)); }
      // Mixed: easier sets first.
      deck = deck.slice(0, prefs.sets || 3).sort((a, b) => a.lvl - b.lvl);
      const g = { scores: {}, right: {}, tries: {}, fastest: {}, streak: {}, best: {}, perfect: [], phase: "rules" };
      const add = (id) => { if (!(id in g.scores)) { g.scores[id] = 0; g.right[id] = 0; g.tries[id] = 0; g.streak[id] = 0; g.best[id] = 0; } };
      cast().forEach((p) => add(p.id));
      let round = 0, handler = () => {};
      sw.on({ state: g, join(id) { add(id); }, input(id, d, at) { handler(id, d, at); } });

      const go = await sw.rules({
        icon: "🧭", title: "Timeline", sub: `${deck.length} sets · ${deck.map((s) => s.title).join(" · ")}`,
        steps: [["A card is dealt onto the ", el("em", {}, "big screen")], ["Tap ", el("em", {}, "where it goes"), " in the line on your phone"], ["Right and fast scores most. ", el("em", {}, "Streaks"), " score more"]],
        extra: el("div", { class: "jars" },
          el("div", { class: "jar wide" }, el("span", {}, "✅"), el("strong", {}, "+500"), el("small", {}, "for the right spot")),
          el("div", { class: "jar wide" }, el("span", {}, "⚡"), el("strong", {}, "up to +500"), el("small", {}, "for being quick")),
          el("div", { class: "jar wide" }, el("span", {}, "🔥"), el("strong", {}, "+100 a card"), el("small", {}, "for every card in your streak"))),
        foot: `${SECS} seconds a card. The card always lands in its real place, so the line is right for everyone.`,
        phone: "Tap where each card goes in the line!", host: "rules.timeline",
      });
      if (!go) return null;

      for (let si = 0; si < deck.length; si++) {
        used.add(deck[si].title);
        if (!(await playSet(deck[si], si))) return null;
      }
      const ids = Object.keys(g.scores).filter((id) => byId(id));
      const top = (f) => ids.slice().sort((a, b) => f(b) - f(a))[0];
      const mostRight = top((id) => g.right[id]), streaky = top((id) => g.best[id]);
      const quick = ids.filter((id) => g.fastest[id]).sort((a, b) => g.fastest[a] - g.fastest[b])[0];
      return {
        scores: g.scores, unit: "points", finale: "DONE!",
        awards: [
          mostRight && g.right[mostRight] && ["Most right", `${byId(mostRight).name} · ${g.right[mostRight]} of ${g.tries[mostRight]}`],
          streaky && g.best[streaky] >= 3 && ["Longest streak", `${byId(streaky).name} · ${g.best[streaky]} in a row`],
          quick && ["Fastest right answer", `${byId(quick).name} · ${(g.fastest[quick] / 1000).toFixed(1)}s`],
          g.perfect.length && ["Perfect sets", names([...new Set(g.perfect)])],
        ],
      };

      async function playSet(set, si) {
        const items = set.items.map((it, k) => ({ ...it, k }));
        const order = shuffle(items);
        const line = [order[0]]; // placed cards, kept in true order
        const misses = {};
        const label = `Set ${si + 1} of ${deck.length}: ${set.title}`;
        sw.say("set", { set: set.title }, { now: true });
        for (let c = 1; c < order.length; c++) {
          const card = order[c];
          const ids = cast().map((p) => p.id);
          ids.forEach(add);
          const at = line.filter((x) => x.k < card.k).length; // the right gap
          g.phase = "place";
          const picks = {}, rounds = {};
          const started = Date.now();
          const timer = el("div", { class: "qbar" }, el("i"));
          const count = el("span", { class: "count" });
          const lockins = el("div", { class: "lockins" });
          sw.music("gate");
          fx.energy(0.6 + 0.3 * (c / order.length));
          show(el("section", { class: "timeline" },
            el("header", {}, el("span", { class: "eyebrow" }, `🧭 ${label}`), count, el("span", { class: "cardno" }, `Card ${c} of ${order.length - 1}`)),
            el("div", { class: "dealt" }, el("small", {}, "Where does this go?"), el("div", { class: "card new" }, card.t)),
            timer, lineView(line), lockins));
          S("reveal");
          const drawCount = () => { count.textContent = `${Object.keys(picks).length} / ${ids.filter((id) => byId(id)).length} placed`; };
          drawCount();
          for (const id of ids) {
            rounds[id] = ++round;
            put(id, { screen: "slots", round: rounds[id], title: set.title, card: card.t, items: line.map((x) => x.t), seconds: SECS, header: `${label} · ${fmt(g.scores[id])} points` });
          }
          let endPlace;
          const placed = new Promise((r) => { endPlace = r; });
          handler = (id, d) => {
            if (d.type !== "slot" || d.round !== rounds[id] || id in picks) return;
            picks[id] = { at: d.at | 0, ms: Date.now() - started };
            drawCount();
            lockins.append(el("span", { title: (byId(id) || {}).name }, face(byId(id))));
            if (ids.every((x) => x in picks || !byId(x) || !byId(x).connected)) endPlace();
          };
          const end = Date.now() + SECS * 1000;
          const tick = sw.every(100, () => {
            const left = end - Date.now();
            timer.firstChild.style.transform = `scaleX(${Math.max(0, left) / (SECS * 1000)})`;
            if (left <= 0) endPlace();
          });
          await placed;
          clearInterval(tick);
          handler = () => {};
          if (!sw.live()) return false;

          /* --- reveal: the card drops into place --- */
          g.phase = "reveal";
          line.splice(at, 0, card);
          const right = [], gained = {};
          for (const id of ids) {
            if (!byId(id)) continue;
            g.tries[id]++;
            const p = picks[id];
            if (p && p.at === at) {
              g.streak[id]++; g.best[id] = Math.max(g.best[id], g.streak[id]); g.right[id]++;
              const pts = 500 + Math.round(500 * Math.max(0, 1 - p.ms / (SECS * 1000))) + 100 * (g.streak[id] - 1);
              g.scores[id] += pts; gained[id] = pts; right.push(id);
              if (!g.fastest[id] || p.ms < g.fastest[id]) g.fastest[id] = p.ms;
            } else { g.streak[id] = 0; misses[id] = true; }
          }
          const quickest = right.slice().sort((a, b) => picks[a].ms - picks[b].ms)[0];
          show(el("section", { class: "timeline" },
            el("header", {}, el("span", { class: "eyebrow" }, `🧭 ${label}`), el("span", { class: "cardno" }, `Card ${c} of ${order.length - 1}`)),
            el("div", { class: "dealt" }, el("small", {}, `${card.t} goes here:`), el("p", { class: "verdict" }, right.length ? `${right.length} of ${ids.filter((id) => byId(id)).length} got it!` : "Nobody got that one!"),
              quickest ? el("p", { class: "quick" }, `⚡ Fastest: ${face(byId(quickest))} ${byId(quickest).name} (${(picks[quickest].ms / 1000).toFixed(1)}s)`) : null),
            lineView(line, card)));
          S(right.length ? "right" : "wrong");
          later0(() => fx.burstAt(document.querySelector(".timeline .card.landed"), 50));
          const share = right.length / Math.max(1, ids.filter((id) => byId(id)).length);
          if (share >= 0.8) { fx.confetti(90); sw.say("allRight", null, { minor: true }); }
          else if (!right.length) { fx.shake(true); fx.callout("Nobody got that one!", { icon: "😱", color: "#ff4d6d", small: true }); sw.say("noneRight", null, { minor: true, mood: "worried" }); }
          for (const id of right) if ([3, 5, 8].includes(g.streak[id])) fx.callout(`${byId(id).name}: ${g.streak[id]} in a row!`, { icon: "🔥", color: "#ff6a3d", small: true });
          for (const id of ids) {
            if (!byId(id)) continue;
            const ok = right.includes(id);
            put(id, { screen: "result", good: ok, title: ok ? (g.streak[id] >= 3 ? `🔥 ${g.streak[id]} in a row!` : "Right spot!") : id in picks ? "Not quite" : "Too slow!",
              points: ok ? gained[id] : 0, text: ok ? "" : `It goes ${at === 0 ? `before ${line[1].t}` : `after ${line[at - 1].t}`}.`, after: "", header: label });
          }
          if (!(await sw.wait(3200))) return false;
        }

        /* --- the whole line, with where to find each one --- */
        g.phase = "setdone";
        for (const id of Object.keys(g.scores)) if (byId(id) && !misses[id] && g.tries[id]) g.perfect.push(id);
        show(el("section", { class: "timeline" },
          el("header", {}, el("span", { class: "eyebrow" }, `🧭 ${set.title}`), el("span", { class: "cardno" }, "The whole line")),
          lineView(line, null, true),
          el("div", { class: "between" }, sw.board(g.scores, { small: true }))));
        S("big");
        sw.music("strut");
        fx.confetti(120);
        return sw.wait(7000);
      }

      function later0(fn) { requestAnimationFrame(() => requestAnimationFrame(fn)); }
      /** The line of cards on the TV (with references once it's all done). */
      function lineView(line, fresh, refs) {
        return el("div", { class: "line" + (line.length > 6 ? " tight" : "") }, ...line.map((x, i) => el("div", { class: "card" + (x === fresh ? " landed" : "") },
          el("span", { class: "n" }, i + 1), el("span", { class: "t" }, x.t), refs && x.ref ? el("small", {}, x.ref) : null)));
      }
    },
  });
})();
