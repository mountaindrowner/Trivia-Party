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

  /** "Nobody caught it!", "Only one of you caught it.", "7 of you caught it.", "Everybody caught it!" */
  function caught(n, of) { return !n ? "Nobody caught it!" : n === of ? "Everybody caught it!" : n === 1 ? "Only one of you caught it." : `${n} of you caught it.`; }

  /* ---------- 🗣️ Who Said That? ---------- */
  BF.game({
    key: "who", name: "Who Said That?", icon: "🗣️", color: "#ff8a3d",
    tagline: "Somebody here wrote it. Can you guess who?",
    steps: ["👀 An answer goes up on the screen", "📱 Guess who wrote it", "🤫 Yours? Keep a straight face"],
    how: "An answer someone typed earlier goes up on the big screen. On your phone, guess who wrote it. If it's yours, keep a straight face!",
    intro: "Who Said That? Here's how it works. I'll show you something one of you typed earlier. On your phone, guess who wrote it. And if it's yours... keep a straight face!",
    async run(a) {
      const SECS = 20;
      const authors = a.shuffle(a.ready(0, 1));
      const rounds = authors.slice(0, 5).map((p) => { const t = a.pickOne(a.answersOf(p.id, true)); return { id: p.id, qi: t.qi, text: t.v }; });
      if (!rounds.length) { await a.say("Nobody typed an answer this time, so let's skip this one."); return; }
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
        a.say(`The question was: ${a.Q[r.qi].q} One of you answered: ${r.text}. Who was it?`, { now: true });
        const picks = {}, opts = {}, rnd = {}, started = Date.now();
        for (const id of ids) {
          // The writer and three others (never the guesser), in a random order.
          const decoys = a.shuffle(a.cast().filter((p) => p.id !== r.id && p.id !== id)).slice(0, 3).map((p) => p.id);
          opts[id] = a.shuffle([r.id, ...decoys]);
          rnd[id] = a.round();
          a.put(id, { screen: "choices", round: rnd[id], prompt: `Who said "${r.text}"?`, options: opts[id].map((x) => `${a.face(a.byId(x))} ${a.byId(x).name}`),
            keys: ["", "", "", ""], seconds: SECS, header: a.Q[r.qi].q, hint: "Who wrote it?", locked: "Locked in!" });
        }
        a.put(r.id, { screen: "wait", title: "That's yours! 🤫", text: "Keep a straight face! You get points for everyone you fool." });
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
        const reveal = a.el("div", { class: "reveal" }, a.el("span", { class: "face" }, a.face(author)), a.el("h2", { "aria-label": `It was ${author.name}!` }, a.lettered(`It was ${author.name}!`)),
          a.el("p", {}, right.length ? `${right.length} of ${ids.length} knew it.` : "Nobody guessed it!"), fooled.length ? a.el("p", { class: "fooled" }, `${author.name} fooled ${fooled.length} · +${Math.min(300, 25 * fooled.length)}`) : null);
        document.querySelector("#stage .g-who").append(reveal);
        a.S("big");
        a.fx.burstAt(reveal, 50);
        a.say(right.length > ids.length / 2 ? [`It was ${author.name}! Most of you knew that one.`, `It was ${author.name}... of course it was.`] : [`It was ${author.name}! ${author.name}, stand up and take a bow.`, `It was ${author.name}! Bet you didn't see that coming.`], { now: true });
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
    steps: ["❓ A question you all answered", "📱 Guess what percent said it", "🎯 The closest guess wins"],
    how: "A question you all answered earlier. Guess what percent of the room picked an answer. The closest guess wins.",
    intro: "Read the Room! I'll bring back a question you all answered earlier. Then you guess: what percent of this room said yes? Slide your guess on your phone. The closest guess wins.",
    async run(a) {
      const SECS = 20;
      // This-or-that and yes/no questions that enough of the room answered (the core ones first).
      const counts = {};
      for (const p of a.cast()) for (const x of a.answersOf(p.id)) if (x.q.t !== "pick") counts[x.qi] = (counts[x.qi] || 0) + 1;
      const qs = Object.keys(counts).map(Number).filter((qi) => counts[qi] >= 3).sort((x, y) => (a.Q[y].core ? 1 : 0) - (a.Q[x].core ? 1 : 0) || counts[y] - counts[x]).slice(0, 3);
      if (!qs.length) { await a.say("We don't have enough answers for this one yet, so let's skip it."); return; }
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
        a.say(`${q.q} What percent of us said: ${opt}?`, { now: true });
        const guesses = {}, rnd = {};
        for (const id of ids) { rnd[id] = a.round(); a.put(id, { screen: "slider", round: rnd[id], prompt: `What % of us said "${opt}"?`, header: q.q, seconds: SECS, start: 50, hint: "Slide to your guess, then tap Lock it in." }); }
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
        requestAnimationFrame(() => { fill.style.width = `${actual}%`; mark.style.left = `${actual}%`; });
        // The number counts up with the fill.
        const t0 = performance.now();
        const roll = (t) => { const k = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - k, 3); mark.textContent = `${Math.round(actual * e)}%`; if (k < 1) requestAnimationFrame(roll); };
        requestAnimationFrame(roll);
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
        a.say(`It's ${actual} percent! ${closest[0] ? (guesses[closest[0]] === actual ? `${a.byId(closest[0]).name} nailed it exactly!` : `${a.byId(closest[0]).name} was closest, with ${guesses[closest[0]]}.`) : ""}${small ? ` And only ${small.w.length} of you said ${s.opts[small.k]}. ${a.names(small.w)}... give us a wave!` : ""}`, { now: true });
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
    steps: ["🤝 You're matched with your most-alike person", "🔎 Find them and ask for their secret number", "📱 Tap it in"],
    how: "You're matched with the person whose answers are most like yours. Your phone shows their name and your secret number. Find them, ask for their number, and tap it in!",
    intro: "Kindred Spirits! I've matched each of you with the person whose answers are most like yours. Your phone shows their name, and your own secret number. Go find them, ask for their number, and tap it in. Ready? Go!",
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
      if (!groups.length) { await a.say("We need a few more people for this one, so let's skip it."); return; }
      // Secret numbers, and who each person has to find (round the group).
      const nums = a.shuffle(Array.from({ length: 90 }, (_, k) => k + 10));
      const num = {}, target = {}, group = {}, found = {}, rnd = {}, lit = {};
      ids.forEach((id, k) => { num[id] = nums[k]; });
      groups.forEach((gr, gi) => gr.forEach((id, k) => { target[id] = gr[(k + 1) % gr.length]; group[id] = gi; }));
      const best = all.filter((p) => p.of >= 3).sort((p, q) => q.r - p.r || q.same - p.same)[0];
      if (best) a.stats.alike = { a: best.x, b: best.y, same: best.same, of: best.of };
      // Things in common, to talk about once they've found each other.
      // What two people share, in words that make sense alone: "Night owl", "Both have been on a plane".
      const common = (x, y) => a.shuffle(Object.keys(ans[x]).filter((qi) => qi in ans[y] && ans[x][qi] === ans[y][qi]).map(Number))
        .map((qi) => { const b = a.blurb(qi, ans[x][qi]); return b && `${a.catIcon(qi)} ${a.Q[qi].t === "yes" ? `Both ${b.replace(/^(has|is|can|was|does|knows|keeps|uses|thinks|would|could|always|waves|made|built|had|gave|lost|learned|visited|started|thanks|reads|collects|plays|likes|beat|talks|speaks)\b/, (w) => ({ has: "have", is: "are", can: "can", was: "were", does: "do", knows: "know", keeps: "keep", uses: "use", thinks: "think", would: "would", could: "could", always: "always", waves: "wave", made: "made", built: "built", had: "had", gave: "gave", lost: "lost", learned: "learned", visited: "visited", started: "started", thanks: "thank", reads: "read", collects: "collect", plays: "play", likes: "like", beat: "beat", talks: "talk", speaks: "speak" })[w] || w)}` : b}`; })
        .filter(Boolean).slice(0, 3);
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
        if (!them) { // their match left: let them off, and count them as found
          found[id] = true;
          a.put(id, { screen: "result", good: true, title: "Your match had to leave!", points: 0, text: "No problem. Find someone you haven't met yet, and ask them one of tonight's questions.", after: "" });
          return checkGroup(id);
        }
        const decoys = a.shuffle(nums.slice(ids.length).filter((n) => n !== num[t])).slice(0, 3);
        rnd[id] = a.round();
        sent[id] = a.shuffle([num[t], ...decoys]);
        a.put(id, { screen: "choices", round: rnd[id], prompt: `Find ${a.face(them)} ${them.name}!`, note: note || (m.of ? `You match on ${m.same} of ${m.of}` : null),
          options: sent[id].map(String), keys: ["#", "#", "#", "#"], header: `Your secret number: ${num[id]}`, hint: `Find ${them.name}, ask for their secret number, and tap it here. (Yours is at the top.)`, locked: "Checking..." });
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
        const them = a.byId(target[id]);
        a.S("found");
        a.add(id, 150);
        a.put(id, { screen: "result", good: true, title: `You found ${them ? them.name : "them"}!`, points: 150, text: common(id, target[id]).length ? `You both said: ${common(id, target[id]).join(" · ")}` : "Now find out what you have in common!", after: "Talk about it while the others find each other." });
        checkGroup(id);
      } });
      /** When everyone in a match has found their person (or left), the match lights up on the TV. */
      function checkGroup(id) {
        const gi = group[id], gr = groups[gi];
        if (lit[gi] || !gr.every((x) => found[x] || !a.byId(x))) return;
        lit[gi] = true;
        order++; done++;
        const card = document.querySelector(`#stage .match[data-g="${gi}"]`);
        if (card) { card.classList.add("found"); card.append(a.el("b", { class: "order" }, `#${order}`)); a.fx.burstAt(card, 30, ["#2fbf8f", "#fff3e0", "#ffb23e"]); }
        if (order <= 3) gr.forEach((x) => a.add(x, 100 * (4 - order)));
        if (order === 1 && gr.filter((x) => a.byId(x)).length > 1) { a.stats.foundAt.push(gr); a.say(`${a.names(gr)} found each other first!`, { now: true }); }
        draw();
        if (done === groups.length) g.end();
      }
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
      await Promise.all([a.say(best ? `Time's up! And the most alike pair tonight is... ${a.byId(best.x).name} and ${a.byId(best.y).name}!` : "Time's up!", { now: true }), a.wait(6000)]);
    },
  });

  /* ---------- 🃏 Two Truths & a Lie ---------- */
  BF.game({
    key: "truths", name: "Two Truths & a Lie", icon: "🃏", color: "#c05bd6",
    tagline: "One of these is made up. Can you spot it?",
    steps: ["🃏 Three things about one person", "🤥 One of them is made up", "📱 Find the lie"],
    how: "Three things about one person, from their answers. Two are true, and one is a lie we made up. Find the lie!",
    intro: "Two Truths and a Lie! I'll show you three things about one of you. Two are true. One is a lie I made up. Find the lie!",
    async run(a) {
      const SECS = 20;
      const spot = a.shuffle(a.ready(3)).slice(0, 5);
      if (!spot.length) { await a.say("We don't have enough answers for this one yet, so let's skip it."); return; }
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
        a.say(`Here are three things about ${who.name}. One of them is a lie.`, { now: true });
        const ids = a.cast().map((p) => p.id).filter((id) => id !== who.id), picks = {}, rnd = {};
        for (const id of ids) {
          rnd[id] = a.round();
          a.put(id, { screen: "choices", round: rnd[id], prompt: `Which is the lie about ${who.name}?`, options: facts.map((f, k) => (f.q.t === "yes" ? `${a.said(f.qi, shownV[k])}: ${f.q.q}` : a.said(f.qi, shownV[k]))), keys: L, seconds: SECS, header: `${a.face(who)} ${who.name}`, locked: "Locked in! Watch the big screen." });
        }
        a.put(who.id, { screen: "wait", title: "It's you! 😐", text: "Poker face! One of those is made up. You get points for everyone you fool." });
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
        // The truth, in words that make sense out loud ("Cal has been on a plane", not "Yes").
        const truth = lie.q.t === "yes" ? (lie.v ? `Truth is, ${who.name} ${lie.q.find}.` : `Truth is, ${who.name} said no to: ${lie.q.q}`) : `${who.name}'s real answer was: ${a.said(lie.qi, lie.v)}.`;
        a.say(`The lie was ${L[lieK]}! ${truth} ${caught(right.length, ids.length)}`, { now: true });
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
