/* Spark Wars: Talents (Matthew 25:14–30). Everyone answers at their own pace for the whole time. A right answer opens
   one of three jars: talents, a double, a dud, a gift, or (if steals are on) taking from or swapping with a player on
   another team. The last minute is Double Time. Most talents wins; with teams, the team with the most. */
(() => {
  const PACKS = [
    { key: "mix", name: "Bible Mix", lvls: [2, 3], about: "People, places and big moments" },
    { key: "basics", name: "Bible Basics", lvls: [2], about: "A warm-up for newer kids" },
    { key: "legends", name: "Legends", lvls: [3], about: "Deep cuts" },
    { key: "parables", name: "Jesus' Teaching", lvls: [4], about: "Parables and what they mean" },
    { key: "prophecy", name: "Prophecy", lvls: [5], about: "Promises and how they came true" },
    { key: "scholars", name: "Scholars", lvls: [6], about: "Languages, maps and history" },
    { key: "deep", name: "Holy of Holies", lvls: [7], about: "The hardest questions we have" },
  ];
  function poolFor(pack) {
    const seen = new Set();
    return ((window.THP && THP.QUESTIONS) || []).filter((q) => pack.lvls.includes(q.lvl) && q.a && q.a.length >= 2 && !seen.has(q.q) && seen.add(q.q));
  }
  /* Spark's own curriculum, "The Church Is Here" (spark/data/lessons/): 40 lessons, Acts to Revelation, ESV. Pick a
     lesson and how to mix it:
       This week   the lesson first, then earlier lessons from the same book (so it doesn't repeat too soon)
       Whole book  every lesson in that book, up to this one
       All so far  every lesson from 1 to this one */
  const lessons = () => ((window.SPARK_DATA && SPARK_DATA.LESSONS) || []).slice().sort((a, b) => a.n - b.n);
  const MIXES = [["week", "This week"], ["book", "Whole book"], ["sofar", "All so far"]];
  function lessonPool(prefs) {
    const all = lessons();
    if (!all.length) return null;
    const L = all.find((l) => l.n === prefs.lesson) || all[0];
    const qs = (list) => list.flatMap((l) => l.q.map((q) => ({ ...q, lesson: l.n })));
    const earlier = all.filter((l) => l.n < L.n && (prefs.lessonMix === "sofar" || l.book === L.book));
    const name = `Lesson ${L.n}: ${L.title}`;
    if (prefs.lessonMix === "book") return { name: `${L.book} (lessons ${earlier.concat(L).map((l) => l.n).join(", ")})`, sub: L.book, first: qs(earlier.concat(L)), then: [], lesson: L };
    if (prefs.lessonMix === "sofar") return { name: `Lessons 1–${L.n}`, sub: `Everything through ${name}`, first: qs([L]), then: qs(earlier), lesson: L };
    return { name, sub: L.scripture, first: qs([L]), then: qs(earlier), lesson: L };
  }
  /* The jars. Weights are out of about 100; steals only when they're on, and only if there's someone to take from. */
  const JARS = [
    { key: "10", w: 17, gain: 10 }, { key: "20", w: 15, gain: 20 }, { key: "30", w: 12, gain: 30 }, { key: "50", w: 8, gain: 50 }, { key: "100", w: 3, gain: 100 },
    { key: "double", w: 7 }, { key: "buried", w: 6 }, { key: "moths", w: 6 }, { key: "giver", w: 5 }, { key: "tax", w: 7, steal: true }, { key: "swap", w: 3, steal: true },
  ];

  SW.game({
    key: "talents", name: "Talents", icon: "💰", about: "Answer at your own pace. Right answers open jars.",
    settings(chips, prefs, redraw, stepper) {
      const all = lessons();
      const sources = (all.length ? [["spark", "Spark lessons"]] : []).concat(PACKS.map((p) => [p.key, p.name]));
      const out = [
        chips("Time", [3, 5, 7, 10].map((m) => [m, `${m} min`]), prefs.minutes, (v) => { prefs.minutes = v; }),
        chips("Steals", [[true, "On"], [false, "Off"]], prefs.steals, (v) => { prefs.steals = v; }),
        chips("Questions", sources, all.length ? prefs.pack : prefs.pack === "spark" ? "mix" : prefs.pack, (v) => { prefs.pack = v; }),
      ];
      if (prefs.pack === "spark" && all.length) {
        const i = Math.max(0, all.findIndex((l) => l.n === prefs.lesson));
        const L = all[i];
        out.push(stepper("Lesson", `${L.n} · ${L.title}`, () => { prefs.lesson = all[(i + all.length - 1) % all.length].n; }, () => { prefs.lesson = all[(i + 1) % all.length].n; }),
          chips("Mix", MIXES, prefs.lessonMix || "week", (v) => { prefs.lessonMix = v; }));
      }
      return out;
    },

    async run(sw) {
      const { el, show, shuffle, nth, clock, fmt, face, S, put, prefs, byId, cast, teamOf, fx } = sw;
      // The questions: a Spark lesson (its own questions first, then the mix), or one of the Bible packs.
      const spark = prefs.pack === "spark" ? lessonPool(prefs) : null;
      const pack = spark ? { name: spark.name, about: spark.sub } : PACKS.find((p) => p.key === prefs.pack) || PACKS[0];
      const pool = spark ? spark.first.concat(spark.then) : shuffle(poolFor(pack));
      const firstN = spark ? spark.first.length : pool.length;
      const g = { pack, pool, ps: {}, feed: [], steals: !!prefs.steals, minutes: prefs.minutes, answered: 0, right: 0, over: false, endsAt: 0, double: false };
      /** Each player's own order: this lesson's questions first (shuffled), then the rest (shuffled), then again. */
      const deal = () => shuffle([...Array(firstN).keys()]).concat(shuffle([...Array(pool.length - firstN).keys()].map((k) => k + firstN)));
      let finish = null, boardAt = 0, boardTimer = 0;
      const ended = new Promise((r) => { finish = r; });

      const add = (id) => { if (!g.ps[id]) g.ps[id] = { talents: 0, correct: 0, answered: 0, streak: 0, best: 0, given: 0, order: deal(), qi: 0, stage: null, step: 0, timer: 0, news: null }; };
      cast().forEach((p) => add(p.id));
      const scores = () => Object.fromEntries(Object.entries(g.ps).map(([id, s]) => [id, s.talents]));
      const ranking = () => cast().filter((p) => g.ps[p.id]).sort((a, b) => g.ps[b.id].talents - g.ps[a.id].talents || g.ps[b.id].correct - g.ps[a.id].correct);
      const placeOf = (id) => ranking().findIndex((p) => p.id === id) + 1;
      sw.on({
        state: g,
        join(id) { add(id); if (g.endsAt && !g.over) nextQ(id); },
        input(id, d) { if (d.type === "pick") onPick(id, d); },
        stop() { g.over = true; for (const s of Object.values(g.ps)) clearTimeout(s.timer); },
      });

      const jars = [["💰", "+10 to +100", "Talents!"], ["✨", "×2", "\"Well done!\""], ["🕳️", "Buried", "Nothing this time"], ["🦋", "Moths & rust", "Lose 25%"],
        ["🎁", "Cheerful giver", "Give 20, get 40"]].concat(g.steals ? [["🧾", "Tax collector", "Take 25% from someone"], ["🔄", "Swap", "Trade talents with someone"]] : []);
      const go = await sw.rules({
        icon: "💰", title: "Talents", sub: spark ? `${pack.name} · ${spark.lesson.scripture} · ${g.minutes} minutes` : `Matthew 25:14–30 · ${pack.name} · ${g.minutes} minutes`,
        steps: [["Answer questions on your phone, ", el("em", {}, "at your own pace")], ["Get one right? ", el("em", {}, "Pick 1 of 3 jars")], [sw.teams.length ? "Most talents wins it for your team" : "Most talents when time runs out wins"]],
        extra: el("div", { class: "jars" }, ...jars.map(([i, a, b]) => el("div", { class: "jar" }, el("span", {}, i), el("strong", {}, a), el("small", {}, b)))),
        foot: "The last minute is ⚡ Double Time: every jar pays double!",
        phone: "Answer at your own pace. Right answers open jars. Most talents wins!", host: "rules.talents",
      });
      if (!go) return null;

      g.endsAt = Date.now() + g.minutes * 60e3;
      sw.music("jericho");
      show(el("section", { class: "play" },
        el("header", {}, el("div", { class: "name" }, "💰 Talents"), el("div", { class: "timer" }, clock(g.endsAt - Date.now())),
          el("div", { class: "right" }, el("span", { class: "pack" }, pack.name), el("button", { class: "btn ghost small", onclick: () => end() }, "End now"))),
        el("div", { class: "double", hidden: true }, "⚡ DOUBLE TIME! Every jar pays double ⚡"),
        sw.teams.length ? el("div", { class: "bars" }) : null,
        el("div", { class: "main" }, el("ol", { class: "board" }), el("div", { class: "side" }, el("h3", {}, "Live"), el("ul", { class: "feed" }), el("p", { class: "stats" })))));
      for (const p of cast()) if (g.ps[p.id]) nextQ(p.id);
      draw();
      let lastSec = -1;
      sw.every(200, () => {
        if (g.over) return;
        const left = g.endsAt - Date.now();
        const t = document.querySelector(".play .timer");
        if (t) { t.textContent = clock(left); t.classList.toggle("low", left < 10e3); }
        const sec = Math.ceil(left / 1000);
        if (sec !== lastSec && sec <= 5 && sec > 0) { S("tick"); fx.shake(); }
        if (sec !== lastSec && sec === 10) { fx.energy(1, "rgba(255,77,109,0.06)"); fx.callout("10 seconds left!", { icon: "⏱", color: "#ff4d6d", small: true }); sw.say("tenSeconds", null, { now: true, mood: "wow" }); }
        lastSec = sec;
        if (!g.double && left <= 60e3) {
          g.double = true;
          S("warn");
          document.querySelector(".play .double").hidden = false;
          document.querySelector(".play").classList.add("doubled");
          news("⚡ Double Time! Every jar pays double!");
          fx.energy(0.95, "rgba(255,210,63,0.05)"); fx.flash("#ffd23f"); fx.shake(true);
          fx.callout("DOUBLE TIME!", { icon: "⚡" });
          sw.say("double", null, { now: true, mood: "wow" });
          sw.music("gate");
        }
        if (left <= 0) end();
      });

      function end() {
        if (g.over) return;
        g.over = true;
        for (const s of Object.values(g.ps)) clearTimeout(s.timer);
        finish(true);
      }
      await ended;
      const r = ranking();
      const best = (key) => r.slice().sort((a, b) => g.ps[b.id][key] - g.ps[a.id][key])[0];
      const mostRight = best("correct"), streak = best("best"), giver = best("given");
      return {
        scores: scores(), unit: "talents", anchor: spark && prefs.lessonMix !== "sofar" ? { title: `Lesson ${spark.lesson.n}: ${spark.lesson.title}`, text: spark.lesson.anchor } : null,
        awards: [
          mostRight && ["Most right answers", `${mostRight.name} · ${g.ps[mostRight.id].correct}`],
          streak && g.ps[streak.id].best >= 2 && ["Longest streak", `${streak.name} · ${g.ps[streak.id].best} in a row`],
          giver && g.ps[giver.id].given && ["Most generous", `${giver.name} · gave ${g.ps[giver.id].given}`],
          ["The whole group", `${fmt(g.right)} right of ${fmt(g.answered)}`],
        ],
      };

      /* --- one phone at a time --- */
      function send(id, screen) {
        const s = g.ps[id];
        s.step++;
        const place = placeOf(id);
        const note = s.news; s.news = null;
        put(id, Object.assign({ round: s.step, header: `💰 ${fmt(s.talents)} talents${place && s.talents ? ` · ${nth(place)} place` : ""}${g.double ? " · ⚡×2" : ""}`, note }, screen));
      }
      function later(id, ms, fn) {
        const s = g.ps[id];
        clearTimeout(s.timer);
        s.timer = setTimeout(() => { if (!g.over) fn(); }, ms);
      }
      function nextQ(id) {
        const s = g.ps[id];
        if (!s || g.over) return;
        if (s.qi >= s.order.length) { s.order = deal(); s.qi = 0; }
        const Q = g.pool[s.order[s.qi++]];
        const opts = shuffle(Q.a.slice(0, 4));
        s.q = { Q, opts, right: opts.indexOf(Q.a[0]) };
        s.stage = "q";
        send(id, { screen: "choices", prompt: Q.q, options: opts, hint: "Tap your answer.", locked: "Checking..." });
      }
      function onPick(id, d) {
        const s = g.ps[id];
        if (!s || g.over || d.round !== s.step) return;
        const i = d.pick | 0;
        if (s.stage === "q") {
          s.stage = null; s.answered++; g.answered++;
          if (i === s.q.right) {
            s.correct++; s.streak++; s.best = Math.max(s.best, s.streak); g.right++;
            if (s.streak === 5 || s.streak === 10 || s.streak === 20) fx.callout(`${byId(id).name}: ${s.streak} in a row!`, { icon: "🔥", color: "#ff6a3d", small: true });
            s.stage = "jar";
            send(id, { screen: "choices", look: "jars", prompt: s.streak >= 3 ? `🔥 ${s.streak} in a row! Pick a jar.` : "Correct! Pick a jar.", options: ["Jar 1", "Jar 2", "Jar 3"], keys: ["🏺"], hint: "What's inside?", locked: "Opening..." });
          } else {
            s.streak = 0;
            send(id, { screen: "result", good: false, title: "Not quite", text: `The answer: ${s.q.Q.a[0]}`, after: s.q.Q.ref ? `(${s.q.Q.ref})` : "" });
            later(id, 2600, () => nextQ(id));
          }
          draw();
          return;
        }
        if (s.stage === "jar") { s.stage = null; openJar(id); draw(); return; }
        if (s.stage === "target") {
          const t = s.targets[i];
          s.stage = null;
          if (t) doTarget(id, t, s.targetKind);
          draw();
        }
      }
      /** Who you could take from or swap with: the top players not on your team. */
      function targetsFor(id, kind) {
        const mine = g.ps[id], team = teamOf(id);
        return ranking().filter((p) => p.id !== id && (!team || teamOf(p.id) !== team) && g.ps[p.id].talents > (kind === "swap" ? mine.talents : 0)).slice(0, 4);
      }
      function lowest(id) {
        const team = teamOf(id), r = ranking().filter((p) => p.id !== id);
        return r.filter((p) => team && teamOf(p.id) === team).at(-1) || r.at(-1) || null; // a giver helps their own team first
      }
      function rollJar(id) {
        const s = g.ps[id];
        const ok = JARS.filter((j) => (!j.steal || g.steals)
          && (j.key !== "tax" || targetsFor(id, "tax").length) && (j.key !== "swap" || targetsFor(id, "swap").length)
          && (j.key !== "moths" || s.talents >= 20) && (j.key !== "giver" || (s.talents >= 20 && lowest(id))));
        let r = Math.random() * ok.reduce((n, j) => n + j.w, 0);
        return ok.find((j) => (r -= j.w) < 0) || ok[0];
      }
      function openJar(id) {
        const s = g.ps[id], me = byId(id) || { name: "Someone" }, j = rollJar(id), x2 = g.double ? 2 : 1;
        const done = (screen, ms) => { send(id, Object.assign({ screen: "result", after: "" }, screen)); later(id, ms || 1500, () => nextQ(id)); };
        if (j.gain) {
          const n = j.gain * x2;
          s.talents += n;
          if (n >= 100) { news(`💰 ${me.name} found a jar of ${n}!`); S("big"); fx.callout(`${me.name} hit the jackpot! +${n}`, { icon: "💰", small: true }); sw.say("jackpot", { name: me.name }, { minor: true }); }
          return done({ good: true, title: n >= 100 ? "Jackpot!" : "Talents!", points: n });
        }
        if (j.key === "double") {
          const n = Math.max(20, s.talents) * x2;
          s.talents += n;
          news(`✨ ${me.name} doubled up to ${fmt(s.talents)}!`); S("double");
          if (s.talents >= 200) fx.callout(`${me.name} doubled up to ${fmt(s.talents)}!`, { icon: "✨", color: "#c77dff", small: true });
          return done({ good: true, title: g.double ? "Well done! ×4" : "Well done! ×2", points: n, text: "\"Well done, good and faithful servant!\" (Matthew 25:21)" }, 2200);
        }
        if (j.key === "buried") return done({ good: false, title: "Buried", points: 0, text: "Like the servant who hid his bag of gold. Nothing this time. (Matthew 25:25)" }, 2200);
        if (j.key === "moths") {
          const n = Math.round(s.talents * 0.25);
          s.talents -= n;
          return done({ good: false, title: "Moths & rust!", points: -n, text: "Treasure on earth doesn't last. (Matthew 6:19)" }, 2200);
        }
        if (j.key === "giver") {
          const to = lowest(id), gain = 40 * x2;
          g.ps[to.id].talents += 20; s.talents += gain - 20; s.given += 20;
          g.ps[to.id].news = `🎁 ${me.name} gave you 20!`;
          news(`🎁 ${me.name} gave 20 to ${to.name}!`);
          return done({ good: true, title: "Cheerful giver!", points: gain - 20, text: `You gave 20 to ${to.name} and got ${gain} back. (2 Corinthians 9:7)` }, 2400);
        }
        // Tax collector or swap: pick who.
        const targets = targetsFor(id, j.key);
        s.stage = "target"; s.targetKind = j.key; s.targets = targets.map((p) => p.id);
        send(id, { screen: "choices", look: "targets", prompt: j.key === "tax" ? "🧾 Tax collector! Take 25% from:" : "🔄 Swap! Trade all your talents with:",
          options: targets.map((p) => `${face(p)} ${p.name} · ${fmt(g.ps[p.id].talents)}`), keys: [j.key === "tax" ? "🧾" : "🔄"], hint: "Quick! Pick one.", locked: "Done!" });
        later(id, 8000, () => { if (s.stage === "target") { s.stage = null; doTarget(id, s.targets[0], s.targetKind); draw(); } });
      }
      function doTarget(id, tid, kind) {
        const s = g.ps[id], t = g.ps[tid], me = byId(id) || { name: "Someone" }, them = byId(tid) || { name: "someone" };
        if (!t) return nextQ(id);
        if (kind === "tax") {
          const n = Math.max(1, Math.round(t.talents * 0.25));
          t.talents -= n; s.talents += n;
          t.news = `🧾 ${me.name} took ${n} from you!`;
          news(`🧾 ${me.name} took ${n} from ${them.name}!`); S("steal");
          if (n >= 50) { fx.callout(`${me.name} taxed ${them.name}! −${fmt(n)}`, { icon: "🧾", color: "#ff4d6d" }); fx.shake(); sw.say("tax", { name: me.name }, { minor: true }); }
          send(id, { screen: "result", good: true, title: `Took ${fmt(n)}!`, points: n, text: `from ${them.name}`, after: "" });
        } else {
          const mine = s.talents;
          s.talents = t.talents; t.talents = mine;
          t.news = `🔄 ${me.name} swapped with you!`;
          news(`🔄 ${me.name} swapped with ${them.name}!`); S("swap");
          fx.callout(`${me.name} SWAPPED with ${them.name}!`, { icon: "🔄", color: "#2ee6ff" }); fx.shake(t.talents < s.talents / 2);
          sw.say("swap", { name: me.name }, { minor: true, mood: "wow" });
          send(id, { screen: "result", good: true, title: "Swapped!", text: `You have ${fmt(s.talents)} now. ${them.name} has ${fmt(t.talents)}.`, after: "" });
        }
        later(id, 2000, () => nextQ(id));
      }
      function news(text) {
        g.feed.unshift({ text, at: Date.now() });
        g.feed.length = Math.min(g.feed.length, 8);
        const feed = document.querySelector(".play .feed");
        if (feed) feed.replaceChildren(...g.feed.map((f, i) => el("li", { class: i ? "" : "new" }, f.text)));
      }

      /** The live board: team bars and the top 10, a few times a second at most. */
      function draw() {
        const delay = 300 - (Date.now() - boardAt);
        if (delay > 0) { clearTimeout(boardTimer); boardTimer = setTimeout(draw, delay); return; }
        boardAt = Date.now();
        const node = document.querySelector(".play");
        if (!node || g.over) return;
        const bars = node.querySelector(".bars");
        if (bars) {
          const totals = sw.teamTotals(scores()), sum = Math.max(1, totals.reduce((n, t) => n + t.total, 0));
          const lead = totals[0].total > (totals[1] ? totals[1].total : 0) ? totals[0].key : null;
          if (lead && g.teamLead && lead !== g.teamLead) { fx.callout(`Team ${totals[0].name} takes the lead!`, { icon: totals[0].icon, color: totals[0].color }); S("big"); sw.say("lead", { team: totals[0].name }, { minor: true }); }
          if (lead) g.teamLead = lead;
          bars.replaceChildren(...sw.teams.map((t) => {
            const tt = totals.find((x) => x.key === t.key);
            return el("div", { class: "bar" + (t.key === lead ? " lead" : ""), style: `--team:${t.color};--w:${Math.max(4, (tt.total / sum) * 100)}%` },
              el("span", { class: "label" }, `${t.icon} ${t.name}`), el("span", { class: "fill" }), el("span", { class: "total" }, fmt(tt.total)));
          }));
        }
        const r = ranking();
        if (r[0] && g.ps[r[0].id].talents && g.leader && r[0].id !== g.leader && Date.now() - (g.leaderAt || 0) > 4000) { fx.callout(`${r[0].name} is #1!`, { icon: face(r[0]), small: true }); g.leaderAt = Date.now(); }
        if (r[0] && g.ps[r[0].id].talents) g.leader = r[0].id;
        fx.flip(node.querySelector(".board"), r.slice(0, 10).map((p, i) => {
          const s = g.ps[p.id], t = teamOf(p.id);
          return el("li", { class: (i < 3 ? "top" : "") + (p.connected ? "" : " away"), "data-key": p.id, style: t ? `--team:${t.color}` : null },
            el("span", { class: "rank" }, i + 1), el("span", { class: "face" }, face(p)), el("span", { class: "name" }, p.name),
            s.streak >= 3 ? el("span", { class: "streak" }, `🔥${s.streak}`) : null, el("span", { class: "talents" }, fmt(s.talents)));
        }));
        const stats = node.querySelector(".stats");
        if (stats) stats.textContent = `${r.length} playing · ${fmt(g.answered)} answered · ${g.answered ? Math.round((g.right / g.answered) * 100) : 0}% right`;
      }
    },
  });
})();
