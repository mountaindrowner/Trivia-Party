/* Spark Wars: Lightning Round. This week's lesson, head to head: everyone gets the same question at the same time.
   A right answer scores 500 to 1,000 points (faster is more), plus 100 for each answer in a row after the first (up to
   500). The last question is worth double. After each question the TV shows the answer, how many picked each option
   and who was fastest; then the scoreboard. The game ends on the lesson's Gospel Anchor.
   Questions come from Spark's curriculum (lessons.js); without it, from the Bible Mix. */
(() => {
  const SHAPES = ["◆", "●", "▲", "★"];

  SW.game({
    key: "lightning", name: "Lightning Round", icon: "⚡", about: "This week's lesson. Fastest right answers win.",
    settings(chips, prefs, redraw, stepper) {
      return SW.lessons.settings(chips, prefs, stepper).concat([
        chips("Questions", [[8, "8"], [10, "10"], [12, "12"], [15, "15"]], prefs.lqCount || 10, (v) => { prefs.lqCount = v; }),
        chips("Timer", [[15, "15 sec"], [20, "20 sec"], [30, "30 sec"]], prefs.lqTime || 20, (v) => { prefs.lqTime = v; }),
      ]);
    },

    async run(sw) {
      const { el, show, shuffle, fmt, face, names, S, put, prefs, byId, cast, fx } = sw;
      const spark = SW.lessons.pool(prefs);
      const fallback = () => ((window.THP && THP.QUESTIONS) || []).filter((q) => (q.lvl === 2 || q.lvl === 3) && q.a && q.a.length >= 4);
      // This lesson's questions first (shuffled), then the rest of the mix (shuffled).
      const deck = spark ? shuffle(spark.first).concat(shuffle(spark.then)) : shuffle(fallback());
      const total = Math.min(prefs.lqCount || 10, deck.length);
      const SECS = prefs.lqTime || 20;
      const title = spark ? spark.name : "Bible Mix";
      const g = { scores: {}, right: {}, answered: {}, streak: {}, best: {}, speed: {}, phase: "rules" };
      const add = (id) => { if (!(id in g.scores)) { g.scores[id] = 0; g.right[id] = 0; g.answered[id] = 0; g.streak[id] = 0; g.best[id] = 0; g.speed[id] = []; } };
      cast().forEach((p) => add(p.id));
      let round = 0, handler = () => {};
      sw.on({ state: g, join(id) { add(id); }, input(id, d) { handler(id, d); } });

      const go = await sw.rules({
        icon: "⚡", title: "Lightning Round", sub: `${title}${spark ? " · " + spark.lesson.scripture : ""} · ${total} questions`,
        steps: [["Everyone gets ", el("em", {}, "the same question"), " at the same time"], ["Right answers score. ", el("em", {}, "Fast"), " right answers score more"], ["Answers in a row add a ", el("em", {}, "streak bonus")]],
        extra: el("div", { class: "jars" },
          el("div", { class: "jar wide" }, el("span", {}, "✅"), el("strong", {}, "500 to 1,000"), el("small", {}, "for a right answer, more if you're quick")),
          el("div", { class: "jar wide" }, el("span", {}, "🔥"), el("strong", {}, "+100 a streak"), el("small", {}, "for every right answer in a row")),
          el("div", { class: "jar wide" }, el("span", {}, "⚡"), el("strong", {}, "Double"), el("small", {}, "the last question is worth double"))),
        foot: spark ? `From this week's lesson: ${spark.lesson.title} (${spark.lesson.scripture}).` : "Questions from the Bible Mix.",
        phone: "Same question for everyone. Fast and right wins!", host: "rules.lightning",
      });
      if (!go) return null;

      for (let i = 0; i < total; i++) if (!(await question(deck[i], i))) return null;

      const ids = Object.keys(g.scores).filter((id) => byId(id));
      const top = (f) => ids.slice().sort((a, b) => f(b) - f(a))[0];
      const accurate = top((id) => g.right[id]), streaky = top((id) => g.best[id]);
      const avg = (id) => g.speed[id].reduce((n, x) => n + x, 0) / g.speed[id].length;
      const quick = ids.filter((id) => g.speed[id].length >= Math.min(3, total)).sort((a, b) => avg(a) - avg(b))[0];
      return {
        scores: g.scores, unit: "points", finale: "DONE!", anchor: SW.lessons.anchor(spark, prefs),
        awards: [
          accurate && g.right[accurate] && ["Most right", `${byId(accurate).name} · ${g.right[accurate]} of ${total}`],
          quick && ["Quickest on average", `${byId(quick).name} · ${(avg(quick) / 1000).toFixed(1)}s`],
          streaky && g.best[streaky] >= 3 && ["Longest streak", `${byId(streaky).name} · ${g.best[streaky]} in a row`],
        ],
      };

      async function question(Q, i) {
        const ids = cast().map((p) => p.id);
        ids.forEach(add);
        const last = i === total - 1, mult = last ? 2 : 1;
        const opts = shuffle(Q.a.slice(0, 4));
        const right = opts.indexOf(Q.a[0]);
        const label = `Question ${i + 1} of ${total}${last ? " · ⚡ DOUBLE" : ""}`;

        /* --- ask --- */
        g.phase = "ask";
        sw.music("jericho");
        fx.energy(last ? 0.95 : 0.6 + 0.3 * (i / total));
        if (last) { sw.say("lightningFinal", null, { now: true, mood: "wow" }); fx.callout("Last question: double points!", { icon: "⚡" }); }
        const timer = el("div", { class: "qbar" }, el("i"));
        const count = el("span", { class: "count" });
        const lockins = el("div", { class: "lockins" });
        const tiles = opts.map((o, k) => el("div", { class: `ans a${k}` }, el("b", {}, SHAPES[k]), el("span", {}, o)));
        show(el("section", { class: "lightning" },
          el("header", {}, el("span", { class: "eyebrow" }, `⚡ ${label}`), count, el("span", { class: "cardno" }, Q.cat || title)),
          el("div", { class: "fact lq" }, Q.q),
          timer,
          el("div", { class: "answers" }, ...tiles),
          lockins));
        S("reveal");
        const picks = {}, started = Date.now();
        round++;
        for (const id of ids) put(id, { screen: "choices", round, prompt: Q.q, options: opts, seconds: SECS, hint: "Fast and right wins!", locked: "Locked in! Watch the big screen.", header: `${label} · ${fmt(g.scores[id])} points` });
        const drawCount = () => { count.textContent = `${Object.keys(picks).length} / ${ids.filter((id) => byId(id)).length} locked in`; };
        drawCount();
        let endAsk;
        const asked = new Promise((r) => { endAsk = r; });
        const myRound = round;
        handler = (id, d) => {
          if (d.type !== "pick" || d.round !== myRound || id in picks || !(id in g.scores)) return;
          picks[id] = { k: d.pick | 0, ms: Date.now() - started };
          drawCount();
          lockins.append(el("span", { title: (byId(id) || {}).name }, face(byId(id))));
          S("tick");
          if (ids.every((x) => x in picks || !byId(x) || !byId(x).connected)) endAsk();
        };
        const end = Date.now() + SECS * 1000;
        let lastSec = -1;
        const tick = sw.every(100, () => {
          const left = end - Date.now();
          timer.firstChild.style.transform = `scaleX(${Math.max(0, left) / (SECS * 1000)})`;
          const sec = Math.ceil(left / 1000);
          if (sec !== lastSec && sec <= 3 && sec > 0) S("tick");
          lastSec = sec;
          if (left <= 0) endAsk();
        });
        await asked;
        clearInterval(tick);
        handler = () => {};
        if (!sw.live()) return false;

        /* --- the answer --- */
        g.phase = "reveal";
        const gained = {}, rightIds = [];
        for (const id of ids) {
          if (!byId(id)) continue;
          const p = picks[id];
          if (p) g.answered[id]++;
          if (p && p.k === right) {
            g.streak[id]++; g.best[id] = Math.max(g.best[id], g.streak[id]); g.right[id]++; g.speed[id].push(p.ms);
            const pts = (Math.round(500 + 500 * Math.max(0, 1 - p.ms / (SECS * 1000))) + Math.min(500, 100 * (g.streak[id] - 1))) * mult;
            g.scores[id] += pts; gained[id] = pts; rightIds.push(id);
          } else g.streak[id] = 0;
        }
        const counts = [0, 1, 2, 3].map((k) => Object.values(picks).filter((p) => p.k === k).length);
        const most = Math.max(1, ...counts);
        tiles.forEach((t, k) => {
          t.classList.add(k === right ? "right" : "wrong");
          t.append(el("em", { class: "bar", style: `--w:${(counts[k] / most) * 100}%` }), el("i", { class: "n" }, counts[k]));
        });
        const fastest = rightIds.slice().sort((a, b) => picks[a].ms - picks[b].ms)[0];
        const sec = stage().querySelector(".lightning");
        if (sec) sec.append(el("div", { class: "verdict-row" },
          el("p", { class: "verdict" }, rightIds.length ? `${rightIds.length} of ${ids.filter((id) => byId(id)).length} got it!` : "Nobody got that one!"),
          fastest ? el("p", { class: "quick" }, `⚡ Fastest: ${face(byId(fastest))} ${byId(fastest).name} (${(picks[fastest].ms / 1000).toFixed(1)}s)`) : null,
          el("p", { class: "ref" }, `${Q.ref}${Q.fact ? " · " + Q.fact : ""}`)));
        S(rightIds.length ? "right" : "wrong");
        fx.burstAt(tiles[right], 50);
        const share = rightIds.length / Math.max(1, ids.filter((id) => byId(id)).length);
        if (!rightIds.length) { fx.shake(true); sw.say("noneRight", null, { minor: true, mood: "worried" }); }
        else if (share >= 0.8) { fx.confetti(90); sw.say("allRight", null, { minor: true }); }
        else if (fastest && picks[fastest].ms < 3000) sw.say("fastest", { name: byId(fastest).name }, { minor: true, mood: "wow" });
        for (const id of rightIds) if ([3, 5, 8].includes(g.streak[id])) fx.callout(`${byId(id).name}: ${g.streak[id]} in a row!`, { icon: "🔥", color: "#ff6a3d", small: true });
        const order = Object.keys(g.scores).filter((id) => byId(id)).sort((a, b) => g.scores[b] - g.scores[a]);
        for (const id of ids) {
          if (!byId(id)) continue;
          const ok = rightIds.includes(id), place = order.indexOf(id) + 1;
          put(id, { screen: "result", good: ok, title: ok ? (g.streak[id] >= 3 ? `🔥 ${g.streak[id]} in a row!` : id === fastest ? "Fastest!" : "Correct!") : id in picks ? "Not quite" : "Too slow!",
            points: ok ? gained[id] : 0, text: ok ? `You're ${place}${["th", "st", "nd", "rd"][((place % 100) - 20) % 10] || ["th", "st", "nd", "rd"][place % 100] || "th"}.` : `The answer: ${Q.a[0]}.`, after: Q.ref ? `(${Q.ref})` : "", header: label });
        }
        if (!(await sw.wait(4500))) return false;

        /* --- scores (not after the last one: the results come next) --- */
        if (!last) {
          g.phase = "scores";
          show(el("section", { class: "between" }, el("h2", {}, `After question ${i + 1} of ${total}`), sw.board(g.scores, { gained })));
          if (!(await sw.wait(4800))) return false;
        }
        return true;
      }
      function stage() { return document.getElementById("stage"); }
    },
  });
})();
