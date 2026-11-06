/* Spark Wars: Bluff the Bible. A strange-but-true Bible fact with a blank. Everyone types a fake answer that sounds
   real; then the fakes and the truth are mixed together and everyone picks the one they think is real.
   Find the truth: +1,000. Every player your fake fools: +500 for you. The second half is worth double, the last
   question triple. With more than 10 players, 10 write each question (everyone takes turns) and the rest are
   detectives that round. Typing is checked for bad words by the server, and the leader can hide any answer on the TV. */
(() => {
  const used = new Set(); // facts already played tonight
  const WRITERS = 10;
  const WRITE_SECS = 45, PICK_SECS = 25;
  /** "The third-story window!" → "third story window" */
  const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(a|an|the)\b/g, " ").replace(/\s+/g, " ").trim();

  SW.game({
    key: "bluff", name: "Bluff the Bible", icon: "🎭", about: "Write fake answers. Find the real one.",
    settings(chips, prefs) {
      return [chips("Questions", [[4, "4"], [6, "6"], [8, "8"]], prefs.bluffs, (v) => { prefs.bluffs = v; })];
    },

    async run(sw) {
      const { el, show, shuffle, pickOne, fmt, face, names, S, put, prefs, byId, cast, fx } = sw;
      const all = (window.SPARK_DATA && SPARK_DATA.BLUFF) || [];
      let deck = shuffle(all.filter((q) => !used.has(q.q)));
      if (deck.length < prefs.bluffs) { used.clear(); deck = shuffle(all); }
      const total = Math.min(prefs.bluffs || 6, deck.length);
      const g = { scores: {}, fooled: {}, found: {}, wrote: {}, bestFool: null, q: null, i: 0, phase: "rules" };
      const add = (id) => { if (!(id in g.scores)) { g.scores[id] = 0; g.fooled[id] = 0; g.found[id] = 0; g.wrote[id] = 0; } };
      cast().forEach((p) => add(p.id));
      let round = 0;
      let handler = () => {};
      sw.on({ state: g, join(id) { add(id); }, input(id, d) { handler(id, d); } });

      const go = await sw.rules({
        icon: "🎭", title: "Bluff the Bible", sub: `${total} strange-but-true facts · the second half is worth double · the last one triple`,
        steps: [["A real Bible fact appears with a ", el("em", {}, "blank")], ["Type a ", el("em", {}, "fake answer"), " that sounds real"], ["Find the truth, and ", el("em", {}, "fool your friends")]],
        extra: el("div", { class: "jars" },
          el("div", { class: "jar wide" }, el("span", {}, "🔎"), el("strong", {}, "+1,000"), el("small", {}, "for finding the truth")),
          el("div", { class: "jar wide" }, el("span", {}, "🎭"), el("strong", {}, "+500 each"), el("small", {}, "for everyone your fake fools")),
          el("div", { class: "jar wide" }, el("span", {}, "🧼"), el("strong", {}, "Keep it clean"), el("small", {}, "Typing is checked, and the leader can hide anything"))),
        foot: cast().length > WRITERS ? `With ${cast().length} players, ${WRITERS} write each question and everyone else plays detective. Everyone gets turns.` : "Stuck? Tap 🎲 Lie for me.",
        phone: "Write fake answers that sound real. Find the real one!",
      });
      if (!go) return null;

      for (g.i = 0; g.i < total; g.i++) {
        const Q = deck[g.i];
        used.add(Q.q);
        const mult = g.i === total - 1 ? 3 : g.i >= Math.floor(total / 2) ? 2 : 1;
        if (!(await question(Q, mult))) return null;
      }
      const top = (o) => { const id = Object.keys(o).filter((k) => byId(k)).sort((a, b) => o[b] - o[a])[0]; return id && o[id] ? id : null; };
      const liar = top(g.fooled), detective = top(g.found);
      return {
        scores: g.scores, unit: "points", finale: "DONE!",
        awards: [
          liar && ["Best bluffer", `${byId(liar).name} · fooled ${g.fooled[liar]}`],
          detective && ["Truth detector", `${byId(detective).name} · ${g.found[detective]} of ${total}`],
          g.bestFool && byId(g.bestFool.id) && ["Biggest bluff", `"${g.bestFool.text}" · ${g.bestFool.n} fooled`],
        ],
      };

      /** One fact: write, pick, reveal, scores. */
      async function question(Q, mult) {
        const ids = cast().map((p) => p.id);
        ids.forEach(add);
        // Who writes: everyone, or the 10 who have written least.
        const writers = ids.length <= WRITERS ? ids : shuffle(ids).sort((a, b) => g.wrote[a] - g.wrote[b]).slice(0, WRITERS);
        writers.forEach((id) => g.wrote[id]++);
        const truth = [Q.a, ...(Q.accept || [])].map(norm);
        const lies = []; // { text, authors: [ids], house }
        const houseLeft = shuffle(Q.lies || []);
        const label = `Question ${g.i + 1} of ${total}${mult > 1 ? ` · ×${mult}` : ""}`;

        /* --- write --- */
        g.phase = "write";
        sw.music("redsea");
        fx.energy(0.55);
        const status = el("div", { class: "writers" });
        const timer = el("div", { class: "qbar" }, el("i"));
        show(el("section", { class: "bluff" },
          el("header", {}, el("span", { class: "eyebrow" }, `🎭 ${label}`), el("button", { class: "btn ghost small", onclick: () => endWrite() }, "Skip ▶")),
          el("div", { class: "fact" }, blanked(Q.q)),
          el("p", { class: "do" }, writers.length === ids.length ? "Everyone: type a fake answer that sounds real!" : `${writers.length} writers this time. Everyone else: get ready to spot the truth!`),
          timer, status));
        const drawStatus = () => status.replaceChildren(...writers.map((id) => { const p = byId(id); return p ? el("span", { class: "w" + (lies.some((l) => l.authors.includes(id)) ? " done" : "") }, face(p), " ", p.name) : null; }));
        drawStatus();
        const writeScreen = (id, note) => ({ screen: "write", round: ++round, prompt: Q.q, note, placeholder: "A believable fake", auto: "🎲 Lie for me", seconds: WRITE_SECS, hint: "Make it sound real!", locked: "Sent! Watch the big screen.", header: label });
        const rounds = {};
        writers.forEach((id) => { const s = writeScreen(id); rounds[id] = s.round; put(id, s); });
        ids.filter((id) => !writers.includes(id)).forEach((id) => put(id, { screen: "wait", title: "🔎 You're a detective!", text: "The writers are making up fakes. Get ready to spot the truth.", header: label }));
        let endWrite;
        const written = new Promise((r) => { endWrite = r; });
        handler = (id, d) => {
          if (d.type !== "write" || d.round !== rounds[id] || lies.some((l) => l.authors.includes(id))) return;
          let text = d.auto ? null : String(d.text || "").trim();
          if (d.auto) {
            const pick = houseLeft.find((h) => !lies.some((l) => norm(l.text) === norm(h)));
            text = pick || pickOne(Q.lies || ["I'm not sure"]);
          } else if (truth.includes(norm(text)) || truth.some((t) => t.length > 2 && ` ${norm(text)} `.includes(` ${t} `))) {
            const s = writeScreen(id, "😮 That's actually TRUE! Write a fake one.");
            rounds[id] = s.round;
            return put(id, s);
          }
          const same = lies.find((l) => norm(l.text) === norm(text));
          if (same) same.authors.push(id); else lies.push({ text, authors: [id] });
          put(id, { screen: "wait", title: "Sent!", text: d.auto ? `We wrote one for you: "${text}"` : "Now hope somebody falls for it...", header: label });
          drawStatus();
          S("tick");
          fx.burstAt([...status.children].find((c) => c.textContent.includes((byId(id) || {}).name)), 18);
          if (writers.every((w) => lies.some((l) => l.authors.includes(w)) || !byId(w) || !byId(w).connected)) endWrite();
        };
        const tick = bar(timer, WRITE_SECS, () => endWrite());
        await written;
        clearInterval(tick);
        if (!sw.live()) return false;

        /* --- pick --- */
        g.phase = "pick";
        // At least 3 fakes on the board: the house adds its own if players wrote fewer.
        for (const h of houseLeft) { if (lies.length >= 3) break; if (!lies.some((l) => norm(l.text) === norm(h))) lies.push({ text: h, authors: [], house: true }); }
        const options = shuffle([...lies.map((l) => ({ ...l })), { text: Q.a, truth: true, authors: [] }]);
        options.forEach((o) => { o.pickers = []; o.gone = false; });
        const picks = {}, maps = {}, pickRounds = {};
        const grid = el("div", { class: "options" });
        const ptimer = el("div", { class: "qbar" }, el("i"));
        const count = el("span", { class: "count" });
        const lockins = el("div", { class: "lockins" });
        show(el("section", { class: "bluff" },
          el("header", {}, el("span", { class: "eyebrow" }, `🎭 ${label}`), count, el("button", { class: "btn ghost small", onclick: () => endPick() }, "Skip ▶")),
          el("div", { class: "fact small" }, blanked(Q.q)),
          el("p", { class: "do" }, "Which one is TRUE? Pick on your phone."), ptimer, grid, lockins,
          el("p", { class: "fine" }, "Leader: click an answer twice to hide it.")));
        fx.energy(0.7);
        const drawGrid = () => grid.replaceChildren(...options.flatMap((o, k) => {
          if (o.gone) return [];
          const card = el("button", { class: "opt", onclick: () => {
            if (o.truth) return;
            if (!card.classList.contains("confirm")) { card.classList.add("confirm"); setTimeout(() => card.classList.remove("confirm"), 3000); return; }
            o.gone = true; S("wrong"); drawGrid(); sendPicks(true);
          } }, el("b", {}, String.fromCharCode(65 + k)), o.text);
          return card;
        }));
        const drawCount = () => { count.textContent = `${Object.keys(picks).length} / ${ids.filter((id) => byId(id)).length} picked`; };
        /** Each phone gets the answers minus its own fake. After the leader hides one, phones that picked it (or haven't picked) get a fresh list. */
        function sendPicks(again) {
          for (const id of ids) {
            if (!byId(id)) continue;
            if (again && id in picks && !options[picks[id]].gone) continue;
            if (again) delete picks[id];
            maps[id] = options.map((o, k) => k).filter((k) => !options[k].gone && !options[k].authors.includes(id));
            pickRounds[id] = ++round;
            put(id, { screen: "choices", round: pickRounds[id], prompt: blankText(Q.q), options: maps[id].map((k) => options[k].text), keys: maps[id].map((k) => String.fromCharCode(65 + k)), hint: "Which one is TRUE?", locked: "Locked in! Watch the big screen.", header: label });
          }
          drawCount();
        }
        let endPick;
        const picked = new Promise((r) => { endPick = r; });
        handler = (id, d) => {
          if (d.type !== "pick" || d.round !== pickRounds[id] || id in picks) return;
          const k = maps[id][d.pick | 0];
          if (k == null) return;
          picks[id] = k;
          drawCount();
          lockins.append(el("span", { title: (byId(id) || {}).name }, face(byId(id))));
          S("tick");
          if (ids.every((x) => x in picks || !byId(x) || !byId(x).connected)) endPick();
        };
        drawGrid();
        sendPicks(false);
        const ptick = bar(ptimer, PICK_SECS, () => endPick());
        await picked;
        clearInterval(ptick);
        handler = () => {};
        if (!sw.live()) return false;

        /* --- reveal --- */
        g.phase = "reveal";
        put(ids, { screen: "wait", title: "The reveal!", text: "Watch the big screen...", header: label });
        for (const [id, k] of Object.entries(picks)) options[k].pickers.push(id);
        const gained = {};
        const give = (id, n) => { if (!(id in g.scores)) return; g.scores[id] += n; gained[id] = (gained[id] || 0) + n; };
        const fakes = options.filter((o) => !o.truth && !o.gone && o.pickers.length).sort((a, b) => a.pickers.length - b.pickers.length);
        for (const o of fakes) {
          const big = el("div", { class: "reveal" },
            el("div", { class: "card" }, o.text),
            el("p", { class: "who" }, `${o.pickers.length} fell for it: `, el("span", {}, o.pickers.map((id) => face(byId(id))).join(" ")), " ", names(o.pickers)));
          show(el("section", { class: "bluff" }, el("header", {}, el("span", { class: "eyebrow" }, `🎭 ${label}`)), el("div", { class: "fact small" }, blanked(Q.q)), big));
          S("reveal");
          if (!(await sw.wait(1900))) return false;
          const pts = 500 * mult * o.pickers.length;
          o.authors.forEach((a) => { give(a, pts); g.fooled[a] = (g.fooled[a] || 0) + o.pickers.length; if (!g.bestFool || o.pickers.length > g.bestFool.n) g.bestFool = { id: a, text: o.text, n: o.pickers.length }; });
          big.append(el("div", { class: "stamp lie" }, "FAKE!"),
            el("p", { class: "by" }, o.house ? "That one was ours! 😎" : `Written by ${names(o.authors)} · +${fmt(pts)}`));
          S("fool");
          fx.shake(o.pickers.length >= 5);
          if (!o.house && o.pickers.length >= 5) fx.callout(`${names(o.authors)} fooled ${o.pickers.length} people!`, { icon: "🎭", color: "#c77dff" });
          if (!(await sw.wait(2400))) return false;
        }
        const t = options.find((o) => o.truth);
        t.pickers.forEach((id) => { give(id, 1000 * mult); g.found[id] = (g.found[id] || 0) + 1; });
        show(el("section", { class: "bluff" }, el("header", {}, el("span", { class: "eyebrow" }, `🎭 ${label}`)),
          el("div", { class: "fact" }, blanked(Q.q, Q.a)),
          el("div", { class: "reveal truth" }, el("div", { class: "stamp true" }, "THE TRUTH"),
            el("p", { class: "who" }, t.pickers.length ? `${t.pickers.length} found it: ${names(t.pickers)} · +${fmt(1000 * mult)} each` : "Nobody found it! The fakers win this one."),
            el("p", { class: "ref" }, `${Q.ref}${Q.fact ? " · " + Q.fact : ""}`))));
        S("right");
        fx.flash("#2ee58a");
        if (t.pickers.length) fx.confetti(Math.min(240, 60 + t.pickers.length * 8), ["#2ee58a", "#ffffff", "#ffd23f"]);
        else { fx.shake(true); fx.callout("Nobody found the truth!", { icon: "😱", color: "#ff4d6d" }); }
        for (const id of ids) {
          if (!byId(id)) continue;
          const mine = options.filter((o) => o.authors.includes(id)), fooled = mine.reduce((n, o) => n + o.pickers.length, 0);
          const found = t.pickers.includes(id);
          put(id, { screen: "result", good: found || fooled > 0, title: found ? "You found the truth!" : id in picks ? "Fooled!" : "Too slow!",
            points: gained[id] || 0, text: `The truth: ${Q.a}.${fooled ? ` Your fake fooled ${fooled}!` : ""}`, after: "", header: label });
        }
        if (!(await sw.wait(5000))) return false;

        /* --- scores --- */
        g.phase = "scores";
        sw.music("strut");
        show(el("section", { class: "between" }, el("h2", {}, g.i + 1 < total ? `After question ${g.i + 1} of ${total}` : "Final scores"), sw.board(g.scores, { gained })));
        if (!(await sw.wait(g.i + 1 < total ? 6000 : 3000))) return false;
        return true;
      }

      /** A countdown bar; returns its interval. */
      function bar(node, secs, done) {
        const end = Date.now() + secs * 1000, fill = node.firstChild;
        let fired = false;
        return sw.every(100, () => {
          const left = end - Date.now();
          fill.style.transform = `scaleX(${Math.max(0, left) / (secs * 1000)})`;
          if (left <= 0 && !fired) { fired = true; done(); }
        });
      }
      function blanked(q, fill) {
        const [a, b] = q.split("___");
        return [a, el("span", { class: fill ? "blank filled" : "blank" }, fill || "_____"), b || ""];
      }
      function blankText(q) { return q.replace("___", "_____"); }
    },
  });
})();
