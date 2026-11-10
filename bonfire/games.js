/* Bonfire's mini-games. Each one is built out of the answers players gave while joining (core.js), and registers
   with BF.game({ key, name, icon, color, tagline, how, intro, run(api) }). They play in this order; the leader can
   leave any out. Every game gives points (scores carry across the night) and feeds the Campfire Report's awards. */
(() => {
  "use strict";

  /** A time bar that drains; calls `done` when it runs out. Returns its interval. */
  function bar(a, node, secs, done) {
    const end = Date.now() + secs * 1000;
    return a.every(100, () => {
      const left = end - Date.now();
      node.firstChild.style.transform = `scaleX(${Math.max(0, left) / (secs * 1000)})`;
      if (left <= 0) done();
    });
  }
  /** Wait for everyone (or the clock). Returns { promise, end }. */
  function gate() { let end; const promise = new Promise((r) => { end = r; }); return { promise, end }; }

  /* ---------- 🗣️ Who Said That? ---------- */
  BF.game({
    key: "who", name: "Who Said That?", icon: "🗣️", color: "#ff8a3d",
    tagline: "Somebody here typed this. Who?",
    how: "An answer goes up on the screen. Guess who wrote it. If it's yours, keep a straight face!",
    intro: ["First up: Who Said That. Someone in this room typed what you're about to see. Your job is to figure out who.", "Who Said That! I'll show you something one of you typed. You guess who."],
    async run(a) {
      const SECS = 20;
      const authors = a.shuffle(a.ready(0, 1));
      const rounds = authors.slice(0, 5).map((p) => { const t = a.pickOne(a.answersOf(p.id, true)); return { id: p.id, qi: t.qi, text: t.v }; });
      if (!rounds.length) { await a.say("Nobody typed anything this time, so we'll skip this one."); return; }
      let handler = () => {};
      a.on({ input: (id, d) => handler(id, d) });
      for (let i = 0; i < rounds.length; i++) {
        const r = rounds[i], author = a.byId(r.id);
        if (!author) continue;
        a.state("ask");
        const ids = a.cast().map((p) => p.id).filter((id) => id !== r.id);
        const timer = a.el("div", { class: "qbar" }, a.el("i")), count = a.el("span", { class: "count" }), lockins = a.el("div", { class: "lockins" });
        a.show(a.el("section", { class: "g-who play" },
          a.el("header", {}, a.el("span", { class: "eyebrow" }, `🗣️ Who said that? · ${i + 1} of ${rounds.length}`), count),
          a.el("p", { class: "q" }, `${a.catIcon(r.qi)} ${a.Q[r.qi].q}`),
          a.el("blockquote", { class: "bubble" }, r.text),
          timer, lockins));
        a.S("reveal");
        a.say(`${a.Q[r.qi].q} Somebody said: ${r.text}.`, { now: true });
        const picks = {}, opts = {}, rnd = {}, started = Date.now();
        for (const id of ids) {
          // The writer and three others (never the guesser), in a random order.
          const decoys = a.shuffle(a.cast().filter((p) => p.id !== r.id && p.id !== id)).slice(0, 3).map((p) => p.id);
          opts[id] = a.shuffle([r.id, ...decoys]);
          rnd[id] = a.round();
          a.put(id, { screen: "choices", round: rnd[id], prompt: `Who said "${r.text}"?`, options: opts[id].map((x) => `${a.face(a.byId(x))} ${a.byId(x).name}`),
            keys: ["", "", "", ""], seconds: SECS, header: a.Q[r.qi].q, hint: "Tap who you think wrote it.", locked: "Locked in! Watch the big screen." });
        }
        a.put(r.id, { screen: "wait", title: "That's yours! 🤫", text: "Keep a straight face. Every person you fool is points for you (25 each)." });
        const g = gate();
        const draw = () => { count.textContent = `${Object.keys(picks).length} / ${ids.length} guessed`; };
        draw();
        handler = (id, d) => {
          if (d.type !== "pick" || !(id in rnd) || d.round !== rnd[id] || id in picks) return;
          const who = opts[id][d.pick | 0];
          if (!who) return;
          picks[id] = { who, ms: Date.now() - started };
          lockins.append(a.el("span", {}, a.face(a.byId(id))));
          a.S("tick");
          draw();
          if (ids.every((x) => x in picks || !a.byId(x) || !a.byId(x).connected)) g.end();
        };
        const tick = bar(a, timer, SECS, g.end);
        await g.promise;
        clearInterval(tick);
        handler = () => {};
        if (!a.live()) return;
        // The reveal: stand up!
        a.state("reveal");
        const right = ids.filter((id) => picks[id] && picks[id].who === r.id), fooled = ids.filter((id) => picks[id] && picks[id].who !== r.id);
        const gained = {};
        for (const id of right) { const pts = 100 + Math.round(50 * Math.max(0, 1 - picks[id].ms / (SECS * 1000))); gained[id] = pts; a.add(id, pts); a.stats.guessed[id] = (a.stats.guessed[id] || 0) + 1; }
        a.add(r.id, Math.min(300, 25 * fooled.length));
        a.stats.fooled[r.id] = (a.stats.fooled[r.id] || 0) + fooled.length;
        const reveal = a.el("div", { class: "reveal" }, a.el("span", { class: "face" }, a.face(author)), a.el("h2", {}, `It was ${author.name}!`),
          a.el("p", {}, right.length ? `${right.length} of ${ids.length} knew it.` : "Nobody guessed it!"), fooled.length ? a.el("p", { class: "fooled" }, `${author.name} fooled ${fooled.length} · +${Math.min(300, 25 * fooled.length)}`) : null);
        document.querySelector("#stage .g-who").append(reveal);
        a.S("big");
        a.fx.burstAt(reveal, 50);
        a.say(right.length > ids.length / 2 ? [`It was ${author.name}! Most of you knew that.`, `${author.name}! Of course it was.`] : [`It was ${author.name}! ${author.name}, stand up and take a bow.`, `It was ${author.name}! Didn't see that coming, did you?`], { now: true });
        for (const id of ids) {
          if (!a.byId(id)) continue;
          const ok = right.includes(id);
          a.put(id, { screen: "result", good: ok, title: ok ? "You knew it!" : picks[id] ? "Nope!" : "Too slow!", points: gained[id] || 0, text: `It was ${author.name}.`, after: "" });
        }
        a.put(r.id, { screen: "result", good: fooled.length > 0, title: fooled.length ? `You fooled ${fooled.length}!` : "They saw right through you!", points: Math.min(300, 25 * fooled.length), text: "", after: "" });
        if (!(await a.wait(5000))) return;
      }
    },
  });

  /* ---------- 🔮 Read the Room ---------- */
  BF.game({
    key: "room", name: "Read the Room", icon: "🔮", color: "#5b7cff",
    tagline: "How well do you know this crowd?",
    how: "Guess what percent of the room picked an answer. Slide, lock it in. Closest wins.",
    intro: ["Read the Room. How well do you know this crowd? I'll ask what percent of you picked something. Closest guess wins.", "Next: Read the Room. Guess the percent. Closest wins."],
    async run(a) {
      const SECS = 20;
      // This-or-that and yes/no questions that enough of the room answered (the core ones first).
      const counts = {};
      for (const p of a.cast()) for (const x of a.answersOf(p.id)) if (x.q.t !== "pick") counts[x.qi] = (counts[x.qi] || 0) + 1;
      const qs = Object.keys(counts).map(Number).filter((qi) => counts[qi] >= 3).sort((x, y) => (a.Q[y].core ? 1 : 0) - (a.Q[x].core ? 1 : 0) || counts[y] - counts[x]).slice(0, 3);
      if (!qs.length) { await a.say("Not enough answers to read the room yet. We'll skip this one."); return; }
      let handler = () => {};
      a.on({ input: (id, d) => handler(id, d) });
      for (let i = 0; i < qs.length; i++) {
        const qi = qs[i], q = a.Q[qi], s = a.split(qi), opt = s.opts[0];
        const actual = Math.round((100 * s.who[0].length) / s.total);
        a.state("ask");
        const ids = a.cast().map((p) => p.id);
        const timer = a.el("div", { class: "qbar" }, a.el("i")), count = a.el("span", { class: "count" }), lockins = a.el("div", { class: "lockins" });
        const meter = a.el("div", { class: "meter" }, a.el("i", { class: "fill" }), a.el("b", { class: "mark" }, "?"));
        a.show(a.el("section", { class: "g-room play" },
          a.el("header", {}, a.el("span", { class: "eyebrow" }, `🔮 Read the Room · ${i + 1} of ${qs.length}`), count),
          a.el("p", { class: "q" }, `${a.catIcon(qi)} ${q.q}`),
          a.el("h2", {}, "What percent of us said ", a.el("em", {}, opt), "?"),
          meter, a.el("div", { class: "ends" }, a.el("span", {}, `0% ${opt}`), a.el("span", {}, `100% ${opt}`)), timer, lockins));
        a.S("reveal");
        a.say(`${q.q} What percent of us said ${opt}?`, { now: true });
        const guesses = {}, rnd = {};
        for (const id of ids) { rnd[id] = a.round(); a.put(id, { screen: "slider", round: rnd[id], prompt: `What percent of us said "${opt}"?`, header: q.q, seconds: SECS, start: 50, hint: "Slide to your guess, then lock it in." }); }
        const g = gate();
        const draw = () => { count.textContent = `${Object.keys(guesses).length} / ${ids.length} guessed`; };
        draw();
        handler = (id, d) => {
          if (d.type !== "slider" || !(id in rnd) || d.round !== rnd[id] || id in guesses) return;
          const v = Math.max(0, Math.min(100, Math.round(Number(d.value) || 0)));
          guesses[id] = v;
          lockins.append(a.el("span", {}, a.face(a.byId(id))));
          a.S("tick");
          draw();
          if (ids.every((x) => x in guesses || !a.byId(x) || !a.byId(x).connected)) g.end();
        };
        const tick = bar(a, timer, SECS, g.end);
        await g.promise;
        clearInterval(tick);
        handler = () => {};
        if (!a.live()) return;
        // The reveal: the meter fills to the real number.
        a.state("reveal");
        const fill = meter.querySelector(".fill"), mark = meter.querySelector(".mark");
        requestAnimationFrame(() => { fill.style.width = `${actual}%`; mark.style.left = `${actual}%`; mark.textContent = `${actual}%`; });
        const gained = {};
        for (const [id, v] of Object.entries(guesses)) { const diff = Math.abs(v - actual), pts = Math.max(0, 100 - 4 * diff) + (diff === 0 ? 50 : 0); gained[id] = pts; a.add(id, pts); a.stats.read[id] = (a.stats.read[id] || 0) + pts; }
        const closest = Object.keys(guesses).sort((x, y) => Math.abs(guesses[x] - actual) - Math.abs(guesses[y] - actual)).slice(0, 3);
        // The rare ones get called out (and asked to wave).
        const small = s.who.map((w, k) => ({ k, w })).filter((x) => x.w.length > 0 && x.w.length <= Math.max(1, Math.min(5, Math.floor(s.total / 4)))).sort((x, y) => x.w.length - y.w.length)[0];
        const sec = document.querySelector("#stage .g-room");
        sec.append(a.el("div", { class: "result-row" },
          a.el("p", { class: "verdict" }, `${actual}% said ${opt} · ${s.who[0].length} of ${s.total}`),
          closest.length ? a.el("p", { class: "closest" }, "Closest: ", ...closest.map((id) => a.el("span", {}, `${a.face(a.byId(id))} ${a.byId(id).name} (${guesses[id]}%)`))) : null,
          small ? a.el("p", { class: "rare" }, `Only ${small.w.length} said ${s.opts[small.k]}: ${a.names(small.w)}. Wave! 👋`) : null));
        a.S("big");
        later(a, 900, () => a.fx.burstAt(mark, 40, ["#5b7cff", "#fff3e0", "#ffb23e"]));
        a.say(`${actual} percent! ${closest[0] ? `${a.byId(closest[0]).name} was closest.` : ""}${small ? ` And only ${small.w.length} of you said ${s.opts[small.k]}: ${a.names(small.w)}. Give us a wave.` : ""}`, { now: true });
        for (const id of ids) {
          if (!a.byId(id)) continue;
          const v = guesses[id];
          a.put(id, { screen: "result", good: v != null && Math.abs(v - actual) <= 10, title: v == null ? "Too slow!" : Math.abs(v - actual) <= 3 ? "Nailed it!" : Math.abs(v - actual) <= 10 ? "So close!" : "Not quite!",
            points: gained[id] || 0, text: `It was ${actual}%.${v != null ? ` You said ${v}%.` : ""}`, after: "" });
        }
        if (!(await a.wait(small ? 7500 : 6000))) return;
      }
    },
  });
  const later = (a, ms, fn) => a.later(ms, fn);

  /* ---------- 🤝 Kindred Spirits ---------- */
  BF.game({
    key: "kindred", name: "Kindred Spirits", icon: "🤝", color: "#2fbf8f",
    tagline: "Somewhere in this room are your people.",
    how: "You're matched with the person most like you. Go find them, ask their secret number, and tap it in.",
    intro: ["Kindred Spirits. I've matched each of you with the person whose answers are most like yours. Go find them, get their secret number, and tap it in. Go!", "Time to move. Kindred Spirits: find the person most like you, and tap in their secret number."],
    async run(a) {
      const SECS = 150;
      const ids = a.shuffle(a.cast().map((p) => p.id));
      const ans = Object.fromEntries(ids.map((id) => [id, Object.fromEntries(a.answersOf(id).map((x) => [x.qi, x.v]))]));
      const alike = (x, y) => { let same = 0, of = 0; for (const qi in ans[x]) if (qi in ans[y]) { of++; if (ans[x][qi] === ans[y][qi]) same++; } return { same, of }; };
      // Pair the most alike first, then whoever's left.
      const all = [];
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const m = alike(ids[i], ids[j]); all.push({ x: ids[i], y: ids[j], ...m, r: m.of ? m.same / m.of : 0 }); }
      all.sort((p, q) => q.same - p.same || q.r - p.r);
      const free = new Set(ids), groups = [];
      for (const p of all) if (free.has(p.x) && free.has(p.y) && p.same > 0) { groups.push([p.x, p.y]); free.delete(p.x); free.delete(p.y); }
      const left = [...free];
      while (left.length >= 2) groups.push([left.pop(), left.pop()]);
      if (left.length && groups.length) { const k = left[0]; const best = groups.map((gr, gi) => [gi, alike(k, gr[0]).same]).sort((p, q) => q[1] - p[1])[0][0]; groups[best].push(k); }
      if (!groups.length) { await a.say("We need a few more people for this one. Skipping it."); return; }
      // Secret numbers, and who each person has to find (round the group).
      const nums = a.shuffle(Array.from({ length: 90 }, (_, k) => k + 10));
      const num = {}, target = {}, group = {}, found = {}, rnd = {};
      ids.forEach((id, k) => { num[id] = nums[k]; });
      groups.forEach((gr, gi) => gr.forEach((id, k) => { target[id] = gr[(k + 1) % gr.length]; group[id] = gi; }));
      const best = all.filter((p) => p.of >= 3).sort((p, q) => q.r - p.r || q.same - p.same)[0];
      if (best) a.stats.alike = { a: best.x, b: best.y, same: best.same, of: best.of };
      // Things in common, to talk about once they've found each other.
      const common = (x, y) => a.shuffle(Object.keys(ans[x]).filter((qi) => qi in ans[y] && ans[x][qi] === ans[y][qi]).map(Number)).slice(0, 3).map((qi) => `${a.catIcon(qi)} ${a.said(qi, ans[x][qi])}`);
      const cards = groups.map((gr, gi) => {
        const m = gr.length === 2 ? alike(gr[0], gr[1]) : null;
        return a.el("div", { class: "match", "data-g": gi }, a.el("div", { class: "faces" }, ...gr.map((id) => a.el("span", {}, a.face(a.byId(id))))),
          a.el("strong", {}, gr.map((id) => a.byId(id).name).join(" & ")), a.el("small", {}, m && m.of ? `${m.same} of ${m.of} alike` : "A trio!"));
      });
      const timer = a.el("div", { class: "qbar" }, a.el("i")), count = a.el("span", { class: "count" });
      a.state("find");
      a.show(a.el("section", { class: "g-kindred play" },
        a.el("header", {}, a.el("span", { class: "eyebrow" }, "🤝 Kindred Spirits"), count),
        a.el("h2", {}, "Find your match. Get their secret number."), timer,
        a.el("div", { class: "matches" + (groups.length > 12 ? " many" : "") }, ...cards)));
      const sent = {}; // the numbers on each phone's buttons, in the order it got them
      const ask = (id, note) => {
        const t = target[id], m = alike(id, t), them = a.byId(t);
        if (!them) return;
        const decoys = a.shuffle(nums.slice(ids.length).filter((n) => n !== num[t])).slice(0, 3);
        rnd[id] = a.round();
        sent[id] = a.shuffle([num[t], ...decoys]);
        a.put(id, { screen: "choices", round: rnd[id], prompt: `Your match: ${a.face(them)} ${them.name}. ${m.of ? `You agree on ${m.same} of ${m.of}!` : ""} Find them and tap their secret number.`,
          options: sent[id].map(String), keys: ["#", "#", "#", "#"], header: `Your secret number: ${num[id]}`, note, hint: "Ask them for it. (Yours is at the top.)", locked: "Checking..." });
      };
      const g = gate();
      let done = 0, order = 0;
      const draw = () => { count.textContent = `${done} of ${groups.length} found each other`; };
      draw();
      a.on({ input: (id, d) => {
        if (d.type !== "pick" || !(id in rnd) || d.round !== rnd[id] || found[id]) return;
        const pick = sent[id] ? sent[id][d.pick | 0] : NaN;
        if (pick !== num[target[id]]) { a.S("wrong"); return ask(id, "Not their number! Ask again."); }
        found[id] = true;
        const gi = group[id], gr = groups[gi], them = a.byId(target[id]);
        a.S("found");
        a.add(id, 150);
        a.put(id, { screen: "result", good: true, title: `You found ${them.name}!`, points: 150, text: common(id, target[id]).length ? `You both: ${common(id, target[id]).join(" · ")}` : "Now find out what you have in common!", after: "Talk about it while the others find each other." });
        if (gr.every((x) => found[x])) {
          order++; done++;
          const card = document.querySelector(`#stage .match[data-g="${gi}"]`);
          if (card) { card.classList.add("found"); card.append(a.el("b", { class: "order" }, `#${order}`)); a.fx.burstAt(card, 30, ["#2fbf8f", "#fff3e0", "#ffb23e"]); }
          if (order <= 3) gr.forEach((x) => a.add(x, 100 * (4 - order)));
          if (order === 1) { a.stats.foundAt.push(gr); a.say(`${gr.map((x) => a.byId(x).name).join(" and ")} found each other first!`, { now: true }); }
          draw();
          if (done === groups.length) g.end();
        }
      } });
      ids.forEach((id) => ask(id));
      const tick = bar(a, timer, SECS, g.end);
      await g.promise;
      clearInterval(tick);
      a.on({ input: () => {} });
      if (!a.live()) return;
      a.state("reveal");
      for (const id of ids) if (!found[id] && a.byId(id)) a.put(id, { screen: "result", good: false, title: "Time!", points: 0, text: `Your match was ${a.byId(target[id]) ? a.byId(target[id]).name : "someone"}. Go say hi anyway!`, after: "" });
      const h = document.querySelector("#stage .g-kindred h2");
      if (h) h.textContent = best ? `Most alike tonight: ${a.byId(best.x).name} & ${a.byId(best.y).name}, ${best.same} of ${best.of} the same!` : "Time!";
      a.S("big");
      await Promise.all([a.say(best ? `Time! The most alike pair tonight: ${a.byId(best.x).name} and ${a.byId(best.y).name}. ${best.same} out of ${best.of} the same.` : "Time!", { now: true }), a.wait(6000)]);
    },
  });

  /* ---------- 🃏 Two Truths & a Lie ---------- */
  BF.game({
    key: "truths", name: "Two Truths & a Lie", icon: "🃏", color: "#c05bd6",
    tagline: "We made one of these up. Spot it.",
    how: "Three things about one person. Two are true, and we made one up. Guess the lie!",
    intro: ["Two Truths and a Lie. I'll pick someone and show three things about them. I made one of them up. You find it.", "Last one: Two Truths and a Lie. Three facts about one of you. One is fake. Find it."],
    async run(a) {
      const SECS = 20;
      const spot = a.shuffle(a.ready(3)).slice(0, 5);
      if (!spot.length) { await a.say("Not enough answers for this one yet. Skipping it."); return; }
      let handler = () => {};
      a.on({ input: (id, d) => handler(id, d) });
      for (let i = 0; i < spot.length; i++) {
        const who = spot[i];
        if (!a.byId(who.id)) continue;
        a.state("ask");
        const facts = a.shuffle(a.answersOf(who.id)).slice(0, 3), lieK = Math.floor(Math.random() * 3);
        // The lie: one real answer, flipped to another option.
        const lie = facts[lieK], q = lie.q;
        const fake = q.t === "yes" ? !lie.v : q.t === "pair" ? 1 - lie.v : a.pickOne(q.a.map((x, k) => k).filter((k) => k !== lie.v));
        const shownV = facts.map((f, k) => (k === lieK ? fake : f.v));
        const L = ["A", "B", "C"];
        const cardsEl = facts.map((f, k) => a.el("div", { class: "tcard", "data-k": k }, a.el("b", {}, L[k]), a.el("small", {}, `${a.catIcon(f.qi)} ${f.q.q}`), a.el("strong", {}, a.said(f.qi, shownV[k]))));
        const timer = a.el("div", { class: "qbar" }, a.el("i")), count = a.el("span", { class: "count" }), lockins = a.el("div", { class: "lockins" });
        a.show(a.el("section", { class: "g-truths play" },
          a.el("header", {}, a.el("span", { class: "eyebrow" }, `🃏 Two Truths & a Lie · ${i + 1} of ${spot.length}`), count),
          a.el("h2", {}, a.el("span", { class: "face" }, a.face(who)), ` ${who.name}`),
          a.el("div", { class: "tcards" }, ...cardsEl), timer, lockins));
        a.S("reveal");
        a.say(`Three things about ${who.name}. One of them is a lie.`, { now: true });
        const ids = a.cast().map((p) => p.id).filter((id) => id !== who.id), picks = {}, rnd = {};
        for (const id of ids) {
          rnd[id] = a.round();
          a.put(id, { screen: "choices", round: rnd[id], prompt: `Which one about ${who.name} is the lie?`, options: facts.map((f, k) => `${a.said(f.qi, shownV[k])} (${f.q.q})`), keys: L, seconds: SECS, header: `${a.face(who)} ${who.name}`, locked: "Locked in! Watch the big screen." });
        }
        a.put(who.id, { screen: "wait", title: "It's you! 😐", text: "Poker face. One of those is made up. Every person you fool is points for you (25 each)." });
        const g = gate();
        const draw = () => { count.textContent = `${Object.keys(picks).length} / ${ids.length} guessed`; };
        draw();
        handler = (id, d) => {
          if (d.type !== "pick" || !(id in rnd) || d.round !== rnd[id] || id in picks) return;
          const k = d.pick | 0;
          if (k < 0 || k > 2) return;
          picks[id] = k;
          lockins.append(a.el("span", {}, a.face(a.byId(id))));
          a.S("tick");
          draw();
          if (ids.every((x) => x in picks || !a.byId(x) || !a.byId(x).connected)) g.end();
        };
        const tick = bar(a, timer, SECS, g.end);
        await g.promise;
        clearInterval(tick);
        handler = () => {};
        if (!a.live()) return;
        a.state("reveal");
        const right = ids.filter((id) => picks[id] === lieK), fooled = ids.filter((id) => id in picks && picks[id] !== lieK);
        right.forEach((id) => { a.add(id, 100); a.stats.guessed[id] = (a.stats.guessed[id] || 0) + 1; });
        a.add(who.id, Math.min(300, 25 * fooled.length));
        a.stats.fooled[who.id] = (a.stats.fooled[who.id] || 0) + fooled.length;
        cardsEl.forEach((c, k) => {
          c.classList.add(k === lieK ? "lie" : "true");
          c.append(a.el("em", {}, k === lieK ? `LIE · really: ${a.said(lie.qi, lie.v)}` : "TRUE"));
        });
        a.S(right.length ? "right" : "wrong");
        a.fx.burstAt(cardsEl[lieK], 40, ["#c05bd6", "#fff3e0", "#ffb23e"]);
        a.say(`The lie was ${L[lieK]}. ${who.name} actually said ${a.said(lie.qi, lie.v)}. ${right.length} of you caught it.`, { now: true });
        for (const id of ids) {
          if (!a.byId(id)) continue;
          const ok = picks[id] === lieK;
          a.put(id, { screen: "result", good: ok, title: ok ? "You caught it!" : id in picks ? "Fooled!" : "Too slow!", points: ok ? 100 : 0, text: `The lie was ${L[lieK]}. ${who.name} really said ${a.said(lie.qi, lie.v)}.`, after: "" });
        }
        a.put(who.id, { screen: "result", good: fooled.length > 0, title: fooled.length ? `You fooled ${fooled.length}!` : "They know you too well!", points: Math.min(300, 25 * fooled.length), text: "", after: "" });
        if (!(await a.wait(6000))) return;
      }
    },
  });
})();
