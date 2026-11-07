/* Spark Wars: Lightning Round. This week's lesson, head to head: everyone gets the same question at the same time.
   A right answer scores 500 to 1,000 points (faster is more), plus 100 for each answer in a row after the first (up to
   500). The last question is worth double. After each question the TV shows the answer, how many picked each option
   and who was fastest; then the scoreboard. The game ends on the lesson's Gospel Anchor.
   Questions come from Spark's curriculum (lessons.js); without it, from the Bible Mix.

   At tables (Tables: 2 to 6): the TV scrambles everyone into random tables with a big shuffle, every phone says which
   table to go to, and the room moves. Then each table talks it over and everyone still answers on their own phone. A
   table scores the average of its players' points (so table sizes don't matter), plus 200 when the whole table gets
   it right. The scoreboard, the results and the podium are the tables'. Everyone's own points still count for their
   team in the war. */
(() => {
  const SHAPES = ["◆", "●", "▲", "★"];
  const TABLE_COLORS = ["#ffe14d", "#ff6a3d", "#5ce1ff", "#c77dff", "#ff5c8a", "#5cf59a"];
  const SEATED_SECS = 30;

  SW.game({
    key: "lightning", name: "Lightning Round", icon: "⚡", about: "This week's lesson. Fastest right answers win.",
    settings(chips, prefs, redraw, stepper) {
      return SW.lessons.settings(chips, prefs, stepper).concat([
        chips("Tables", [[0, "Off"], [2, "2"], [3, "3"], [4, "4"], [5, "5"], [6, "6"]], prefs.lqTables || 0, (v) => { prefs.lqTables = v; }),
        chips("Questions", [[8, "8"], [10, "10"], [12, "12"], [15, "15"]], prefs.lqCount || 10, (v) => { prefs.lqCount = v; }),
        chips("Timer", [[15, "15 sec"], [20, "20 sec"], [30, "30 sec"]], prefs.lqTime || 20, (v) => { prefs.lqTime = v; }),
      ]);
    },

    async run(sw) {
      const { el, show, shuffle, fmt, face, nth, S, put, prefs, byId, cast, fx } = sw;
      const spark = SW.lessons.pool(prefs);
      const fallback = () => ((window.THP && THP.QUESTIONS) || []).filter((q) => (q.lvl === 2 || q.lvl === 3) && q.a && q.a.length >= 4);
      // This lesson's questions first (shuffled), then the rest of the mix (shuffled).
      const deck = spark ? shuffle(spark.first).concat(shuffle(spark.then)) : shuffle(fallback());
      const total = Math.min(prefs.lqCount || 10, deck.length);
      const SECS = prefs.lqTime || 20;
      const title = spark ? spark.name : "Bible Mix";
      const g = { scores: {}, right: {}, answered: {}, streak: {}, best: {}, speed: {}, phase: "rules", tables: [], tableOf: {}, sweeps: {} };
      const add = (id) => {
        if (!(id in g.scores)) { g.scores[id] = 0; g.right[id] = 0; g.answered[id] = 0; g.streak[id] = 0; g.best[id] = 0; g.speed[id] = []; }
        if (g.tables.length && !g.tableOf[id]) { const t = g.tables.slice().sort((a, b) => a.ids.length - b.ids.length)[0]; t.ids.push(id); g.tableOf[id] = t; }
      };
      let round = 0, handler = () => {}, vipSeated = null;
      sw.on({
        state: g,
        join(id) { add(id); if (g.tableOf[id] && g.phase !== "rules") put(id, goTo(g.tableOf[id], "You're at")); },
        input(id, d) { if (d.type === "vip" && d.action === "seated" && vipSeated) return vipSeated(); handler(id, d); },
      });

      /* --- tables: scramble everyone, send them off, wait until they're seated --- */
      const nTables = Math.min(prefs.lqTables || 0, Math.max(0, Math.floor(cast().length / 2)));
      if (nTables >= 2) {
        g.tables = Array.from({ length: nTables }, (_, k) => ({ n: k + 1, name: `Table ${k + 1}`, color: TABLE_COLORS[k], ids: [], total: 0 }));
        shuffle(cast()).forEach((p, k) => { const t = g.tables[k % nTables]; t.ids.push(p.id); g.tableOf[p.id] = t; });
        cast().forEach((p) => add(p.id));
        if (!(await scramble())) return null;
      } else cast().forEach((p) => add(p.id));
      const tables = g.tables.length ? g.tables : null;
      const badgeFor = (id) => (g.tableOf[id] ? { text: g.tableOf[id].name, color: g.tableOf[id].color } : undefined);

      const go = await sw.rules({
        icon: "⚡", title: "Lightning Round", sub: `${title}${spark ? " · " + spark.lesson.scripture : ""} · ${total} questions${tables ? ` · ${tables.length} tables` : ""}`,
        steps: tables
          ? [["Talk it over ", el("em", {}, "as a table")], ["Everyone ", el("em", {}, "locks in"), " on their own phone"], ["Your table scores your ", el("em", {}, "average"), ", plus a bonus if everyone's right"]]
          : [["Everyone gets ", el("em", {}, "the same question"), " at the same time"], ["Right answers score. ", el("em", {}, "Fast"), " right answers score more"], ["Answers in a row add a ", el("em", {}, "streak bonus")]],
        extra: el("div", { class: "jars" },
          el("div", { class: "jar wide" }, el("span", {}, "✅"), el("strong", {}, "500 to 1,000"), el("small", {}, "for a right answer, more if you're quick")),
          tables ? el("div", { class: "jar wide" }, el("span", {}, "🤝"), el("strong", {}, "+200 a sweep"), el("small", {}, "when your whole table gets it right"))
            : el("div", { class: "jar wide" }, el("span", {}, "🔥"), el("strong", {}, "+100 a streak"), el("small", {}, "for every right answer in a row")),
          el("div", { class: "jar wide" }, el("span", {}, "⚡"), el("strong", {}, "Double"), el("small", {}, "the last question is worth double"))),
        foot: spark ? `From this week's lesson: ${spark.lesson.title} (${spark.lesson.scripture}).` : "Questions from the Bible Mix.",
        phone: tables ? "Talk it over with your table, then lock in on your phone!" : "Same question for everyone. Fast and right wins!", host: "rules.lightning",
      });
      if (!go) return null;

      for (let i = 0; i < total; i++) if (!(await question(deck[i], i))) return null;

      const ids = Object.keys(g.scores).filter((id) => byId(id));
      const top = (f) => ids.slice().sort((a, b) => f(b) - f(a))[0];
      const accurate = top((id) => g.right[id]), streaky = top((id) => g.best[id]);
      const avg = (id) => g.speed[id].reduce((n, x) => n + x, 0) / g.speed[id].length;
      const quick = ids.filter((id) => g.speed[id].length >= Math.min(3, total)).sort((a, b) => avg(a) - avg(b))[0];
      const sweeper = tables && tables.slice().sort((a, b) => (g.sweeps[b.n] || 0) - (g.sweeps[a.n] || 0))[0];
      return {
        scores: g.scores, unit: "points", finale: "DONE!", anchor: SW.lessons.anchor(spark, prefs),
        tables: tables ? tables.map((t) => ({ n: t.n, name: t.name, color: t.color, total: Math.round(t.total), ids: t.ids.filter((id) => byId(id)) })) : null,
        awards: [
          accurate && g.right[accurate] && ["Most right", `${byId(accurate).name} · ${g.right[accurate]} of ${total}`],
          quick && ["Quickest on average", `${byId(quick).name} · ${(avg(quick) / 1000).toFixed(1)}s`],
          sweeper && g.sweeps[sweeper.n] ? ["Most sweeps", `${sweeper.name} · ${g.sweeps[sweeper.n]}`] : streaky && g.best[streaky] >= 3 && ["Longest streak", `${byId(streaky).name} · ${g.best[streaky]} in a row`],
        ],
      };

      /** "Go to Table 3": the phone turns that table's color. */
      function goTo(t, lead) {
        return { screen: "wait", title: `${lead || "Go to"} ${t.name}!`, text: "Find your table and sit together. You'll play as a team!", badge: { text: t.name, color: t.color },
          banner: { small: "Your table", text: String(t.n), color: t.color },
          header: `🪑 ${t.name}`, vip: { label: "We're all seated ▶", action: "seated" } };
      }

      /** The scramble: every name flies around the screen, then lands at its table. Then everyone moves. */
      async function scramble() {
        g.phase = "scramble";
        sw.music("gate");
        fx.energy(0.9);
        put("players", { screen: "wait", title: "Scrambling the tables...", text: "Watch the big screen!" });
        const cols = g.tables.map((t) => el("div", { class: "table-col", style: `--team:${t.color}` },
          el("h3", {}, el("b", {}, t.n), t.name),
          el("div", { class: "seats" }, ...t.ids.map((id) => { const p = byId(id); return el("span", { class: "seat", "data-key": id }, face(p), " ", p.name); }))));
        const banner = el("h1", { class: "scramble-title" }, "Scrambling the tables...");
        const node = show(el("section", { class: "scramble" }, banner, el("div", { class: "table-grid", style: `--cols:${g.tables.length}` }, ...cols)));
        sw.say("tablesScramble", null, { now: true, mood: "wow" });
        // Fling every name somewhere random on the screen, a few times over.
        const seats = [...node.querySelectorAll(".seat")];
        const box = node.getBoundingClientRect(), k = 1280 / box.width;
        const home = seats.map((s) => { const r = s.getBoundingClientRect(); return { x: (r.left - box.left) * k, y: (r.top - box.top) * k }; });
        const fling = () => seats.forEach((s, i) => {
          const x = 60 + Math.random() * 1060 - home[i].x, y = 110 + Math.random() * 520 - home[i].y;
          s.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 50 - 25}deg) scale(${0.9 + Math.random() * 0.4})`;
        });
        node.classList.add("flying");
        fling();
        for (let n = 0; n < 5; n++) { S("swap"); if (!(await sw.wait(520))) return false; fling(); }
        if (!(await sw.wait(500))) return false;
        // Land: one by one, each name drops into its table.
        node.classList.add("landing");
        const order = shuffle(seats.map((_, i) => i));
        for (const [j, i] of order.entries()) {
          seats[i].style.transitionDelay = `${j * 55}ms`;
          seats[i].style.transform = "none";
          setTimeout(() => S("tick"), j * 55 + 300);
        }
        if (!(await sw.wait(order.length * 55 + 900))) return false;
        cols.forEach((c, i) => setTimeout(() => { c.classList.add("ready"); fx.burstAt(c.querySelector("h3"), 30, [g.tables[i].color, "#ffffff"]); }, i * 120));
        S("big");
        fx.confetti(120, TABLE_COLORS.slice(0, g.tables.length));
        /* Everyone moves. The leader (or the VIP) says when they're seated, or it goes on by itself. */
        g.phase = "seating";
        banner.textContent = "Go find your table!";
        sw.say("tablesGo", null, { mood: "happy" });
        for (const p of cast()) if (g.tableOf[p.id]) put(p.id, goTo(g.tableOf[p.id]));
        const bar = el("div", { class: "qbar" }, el("i"));
        const btn = el("button", { class: "btn go", onclick: () => vipSeated && vipSeated() }, "Everyone's seated ▶");
        node.append(el("div", { class: "seated" }, bar, btn));
        const ok = await new Promise((resolve) => {
          vipSeated = () => { vipSeated = null; resolve(true); };
          const end = Date.now() + SEATED_SECS * 1000;
          const t = sw.every(100, () => {
            const left = end - Date.now();
            bar.firstChild.style.transform = `scaleX(${Math.max(0, left) / (SEATED_SECS * 1000)})`;
            if (!sw.live()) { clearInterval(t); resolve(false); }
            else if (left <= 0) { clearInterval(t); if (vipSeated) vipSeated(); }
          });
        });
        vipSeated = null;
        return ok && sw.live();
      }

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
        const tableRow = tables ? el("div", { class: "table-row" }, ...tables.map((t) => el("span", { class: "tchip", style: `--team:${t.color}`, "data-n": t.n }, el("b", {}, t.n), el("i", {}, "")))) : null;
        const tiles = opts.map((o, k) => el("div", { class: `ans a${k}` }, el("b", {}, SHAPES[k]), el("span", {}, o)));
        show(el("section", { class: "lightning" },
          el("header", {}, el("span", { class: "eyebrow" }, `⚡ ${label}`), count, el("span", { class: "cardno" }, Q.cat || title)),
          el("div", { class: "fact lq" }, Q.q),
          timer,
          el("div", { class: "answers" }, ...tiles),
          tableRow || lockins));
        S("reveal");
        const picks = {}, started = Date.now();
        round++;
        const headerFor = (id) => tables && g.tableOf[id] ? `${label} · ${g.tableOf[id].name}` : `${label} · ${fmt(g.scores[id])} points`;
        for (const id of ids) put(id, { screen: "choices", round, prompt: Q.q, options: opts, seconds: SECS, hint: tables ? "Talk it over, then lock in!" : "Fast and right wins!", locked: "Locked in! Watch the big screen.", header: headerFor(id), badge: badgeFor(id) });
        const drawCount = () => {
          count.textContent = `${Object.keys(picks).length} / ${ids.filter((id) => byId(id)).length} locked in`;
          if (tableRow) for (const t of tables) {
            const here = t.ids.filter((id) => byId(id)), done = here.filter((id) => id in picks).length;
            const chip = tableRow.querySelector(`[data-n="${t.n}"]`);
            chip.querySelector("i").textContent = `${done}/${here.length}`;
            chip.classList.toggle("all", here.length > 0 && done === here.length);
          }
        };
        drawCount();
        let endAsk;
        const asked = new Promise((r) => { endAsk = r; });
        const myRound = round;
        handler = (id, d) => {
          if (d.type !== "pick" || d.round !== myRound || id in picks || !(id in g.scores)) return;
          picks[id] = { k: d.pick | 0, ms: Date.now() - started };
          drawCount();
          if (!tables) lockins.append(el("span", { title: (byId(id) || {}).name }, face(byId(id))));
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
            const pts = (Math.round(500 + 500 * Math.max(0, 1 - p.ms / (SECS * 1000))) + (tables ? 0 : Math.min(500, 100 * (g.streak[id] - 1)))) * mult;
            g.scores[id] += pts; gained[id] = pts; rightIds.push(id);
          } else g.streak[id] = 0;
        }
        // Tables: the average of their players' points, plus a sweep bonus when everyone got it.
        const tableGain = {}, swept = [];
        if (tables) for (const t of tables) {
          const here = t.ids.filter((id) => byId(id));
          if (!here.length) continue;
          let pts = here.reduce((n, id) => n + (gained[id] || 0), 0) / here.length;
          if (here.every((id) => rightIds.includes(id))) { pts += 200 * mult; swept.push(t); g.sweeps[t.n] = (g.sweeps[t.n] || 0) + 1; }
          t.prev = t.total; t.total += pts; tableGain[t.n] = Math.round(pts);
        }
        const counts = [0, 1, 2, 3].map((k) => Object.values(picks).filter((p) => p.k === k).length);
        const most = Math.max(1, ...counts);
        tiles.forEach((t, k) => {
          t.classList.add(k === right ? "right" : "wrong");
          t.append(el("em", { class: "bar", style: `--w:${(counts[k] / most) * 100}%` }), el("i", { class: "n" }, counts[k]));
        });
        const fastest = rightIds.slice().sort((a, b) => picks[a].ms - picks[b].ms)[0];
        const sec = document.querySelector("#stage .lightning");
        if (tableRow) tables.forEach((t) => { const c = tableRow.querySelector(`[data-n="${t.n}"]`); c.querySelector("i").textContent = `+${fmt(tableGain[t.n] || 0)}`; c.classList.toggle("all", swept.includes(t)); });
        if (sec) sec.append(el("div", { class: "verdict-row" },
          el("p", { class: "verdict" }, swept.length ? `${swept.map((t) => t.name).join(", ")} swept it! 🤝` : rightIds.length ? `${rightIds.length} of ${ids.filter((id) => byId(id)).length} got it!` : "Nobody got that one!"),
          fastest ? el("p", { class: "quick" }, `⚡ Fastest: ${face(byId(fastest))} ${byId(fastest).name}${tables && g.tableOf[fastest] ? ` (${g.tableOf[fastest].name})` : ""} · ${(picks[fastest].ms / 1000).toFixed(1)}s`) : null,
          el("p", { class: "ref" }, `${Q.ref}${Q.fact ? " · " + Q.fact : ""}`)));
        S(rightIds.length ? "right" : "wrong");
        fx.burstAt(tiles[right], 50);
        const share = rightIds.length / Math.max(1, ids.filter((id) => byId(id)).length);
        if (!rightIds.length) { fx.shake(true); sw.say("noneRight", null, { minor: true, mood: "worried" }); }
        else if (swept.length) { swept.forEach((t) => fx.burstAt(tableRow.querySelector(`[data-n="${t.n}"]`), 40, [t.color, "#fff"])); sw.say("tableSweep", null, { minor: true }); }
        else if (share >= 0.8) { fx.confetti(90); sw.say("allRight", null, { minor: true }); }
        else if (fastest && picks[fastest].ms < 3000) sw.say("fastest", { name: byId(fastest).name }, { minor: true, mood: "wow" });
        if (!tables) for (const id of rightIds) if ([3, 5, 8].includes(g.streak[id])) fx.callout(`${byId(id).name}: ${g.streak[id]} in a row!`, { icon: "🔥", color: "#ff6a3d", small: true });
        const order = Object.keys(g.scores).filter((id) => byId(id)).sort((a, b) => g.scores[b] - g.scores[a]);
        const torder = tables ? tables.slice().sort((a, b) => b.total - a.total) : null;
        for (const id of ids) {
          if (!byId(id)) continue;
          const ok = rightIds.includes(id), t = g.tableOf[id];
          const place = tables && t ? torder.indexOf(t) + 1 : order.indexOf(id) + 1;
          const where = tables && t ? `${t.name} is ${nth(place)}${swept.includes(t) ? ". Your whole table got it! +200" : "."}` : `You're ${nth(place)}.`;
          put(id, { screen: "result", good: ok, title: ok ? (!tables && g.streak[id] >= 3 ? `🔥 ${g.streak[id]} in a row!` : id === fastest ? "Fastest!" : "Correct!") : id in picks ? "Not quite" : "Too slow!",
            points: ok ? gained[id] : 0, text: ok ? where : `The answer: ${Q.a[0]}. ${where}`, after: Q.ref ? `(${Q.ref})` : "", header: label, badge: badgeFor(id) });
        }
        if (!(await sw.wait(tables ? 5200 : 4500))) return false;

        /* --- scores (not after the last one: the results come next) --- */
        if (!last) {
          g.phase = "scores";
          show(el("section", { class: "between" }, el("h2", {}, `After question ${i + 1} of ${total}`), tables ? tableBoard() : sw.board(g.scores, { gained })));
          if (!(await sw.wait(4800))) return false;
        }
        return true;
      }

      /** The tables' scoreboard: a bar each, growing from the old total to the new one, the leader on top. */
      function tableBoard() {
        const sorted = tables.slice().sort((a, b) => b.total - a.total), max = Math.max(1, sorted[0].total);
        const prevOrder = tables.slice().sort((a, b) => (b.prev || 0) - (a.prev || 0));
        const list = el("ol", { class: "table-board" });
        const rows = (order, val) => order.map((t, i) => el("li", { "data-key": t.n, style: `--team:${t.color};--w:${Math.max(3, (val(t) / max) * 100)}%` },
          el("span", { class: "rank" }, i + 1), el("span", { class: "tname" }, el("b", {}, t.n), t.name),
          el("span", { class: "tbar" }, el("i")), el("span", { class: "talents" }, fmt(val(t)))));
        list.replaceChildren(...rows(prevOrder, (t) => t.prev || 0));
        setTimeout(() => {
          fx.flip(list, rows(sorted, (t) => t.total));
          list.querySelectorAll("li").forEach((li) => { const t = tables.find((x) => String(x.n) === li.dataset.key); fx.count(li.querySelector(".talents"), t.prev || 0, t.total); });
          if (prevOrder[0] !== sorted[0]) { fx.callout(`${sorted[0].name} takes the lead!`, { icon: "🪑", color: sorted[0].color }); S("big"); }
        }, 700);
        return el("div", { class: "scoreboard" }, list);
      }
    },
  });
})();
