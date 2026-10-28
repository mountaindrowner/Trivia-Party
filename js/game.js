/* Trivia Holy Party — game flow: title → 8 questions (+ Trial Room on misses) → The Narrow Gate → results. */
window.THP = window.THP || {};

(function () {
  const { $, el, sleep, pick, shuffle, show, say, setMood, waitButton, ringTimer, confetti, popText, flash, stamp, crack } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  // Host lines: Legends get the hype-announcer set; with Neon City or Victory Lobby on, everyone else gets that skin's voice.
  // Any key a set doesn't have falls back to the default lines.
  const L = new Proxy({}, {
    get: (_, k) => {
      if (k === "intro" && THP.state && THP.MODE_INTROS[THP.state.lvl]) return THP.MODE_INTROS[THP.state.lvl];
      if (THP.state && THP.state.lvl === 3 && THP.LINES_TEEN[k]) return THP.LINES_TEEN[k];
      if (THP.ui.skin() === "cyber" && THP.LINES_CYBER[k]) return THP.LINES_CYBER[k];
      if (THP.ui.skin() === "loot" && THP.LINES_LOOT[k]) return THP.LINES_LOOT[k];
      return THP.LINES[k];
    },
  });

  const QUESTIONS_PER_GAME = 8;
  const MAX_OIL = 3;
  const GATE = 10;
  const streakMult = (n) => (n >= 3 ? 2 : n === 2 ? 1.5 : 1);
  // Modes. 1–3 are the age levels; 4–6 are Challenge Modes with harder kinds of questions (longer timers for longer
  // questions); 7 is the secret mode, unlocked by beating 1–6. `near` lists pools that lend a couple of questions for variety.
  const LEVELS = {
    1: { name: "Little Lambs", ages: "Ages 5–8", icon: "🐑", qTime: 20, fTime: 16, goatJump: 0.25, near: [2],
      desc: "Easy questions about favorite Bible stories, with extra time to answer." },
    2: { name: "Mighty Warriors", ages: "Ages 9–12", icon: "🛡️", qTime: 15, fTime: 12, goatJump: 0.5, near: [1, 3],
      desc: "Trickier questions about people, places and big moments in the Bible." },
    3: { name: "Legends", ages: "Ages 13+", icon: "⚡", qTime: 12, fTime: 10, goatJump: 0.6, near: [2],
      desc: "The toughest solo level: deep-cut questions and a faster timer." },
    4: { name: "Parable Pros", ages: "Ages 10+", icon: "🌱", qTime: 22, fTime: 14, goatJump: 0.5, near: [], challenge: true,
      blurb: "Not just who or what, but what it means. Parables, the Sermon on the Mount and Jesus' \"I am\" sayings." },
    5: { name: "Prophecy Hunters", ages: "Ages 12+", icon: "📜", qTime: 22, fTime: 13, goatJump: 0.55, near: [], challenge: true,
      blurb: "Connect Old Testament promises to their New Testament fulfillment, and find Jesus all through the Bible." },
    6: { name: "Scholars", ages: "Ages 14+", icon: "🧭", qTime: 18, fTime: 12, goatJump: 0.6, near: [], challenge: true,
      blurb: "Bible languages, maps, empires, feasts, the temple, and how the Bible was written and kept." },
    7: { name: "Holy of Holies", ages: "Secret mode", icon: "✨", qTime: 15, fTime: 10, goatJump: 0.7, near: [], challenge: true, secret: true,
      blurb: "The hardest questions in the game: kings, numbers, name meanings, the early church and deep doctrine." },
  };
  const UNLOCK_NEEDS = [1, 2, 3, 4, 5, 6];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- Progress: modes beaten, questions learned (saved on this device) ---------- */
  const beatenSet = () => new Set(store.get("thp-beaten", []));
  const isUnlocked = () => { const b = beatenSet(); return UNLOCK_NEEDS.every((l) => b.has(l)); };
  const learnedSet = () => new Set(store.get("thp-learned", []));
  function learnedCount(lvl) {
    const known = learnedSet();
    const pool = THP.QUESTIONS.filter((q) => q.lvl === lvl);
    return [pool.filter((q) => known.has(q.q)).length, pool.length];
  }

  /* ---------- XP & rank (solo games, saved on this device) ---------- */
  const RANKS = [[30, "Champion", "🏆"], [20, "Diamond", "💎"], [15, "Platinum", "💠"], [10, "Gold", "🥇"], [5, "Silver", "🥈"], [1, "Bronze", "🥉"]];
  const xpNeed = (lvl) => 500 + (lvl - 1) * 100;
  function levelOf(xp) {
    let lvl = 1, into = xp;
    while (into >= xpNeed(lvl)) { into -= xpNeed(lvl); lvl++; }
    const [, rank, icon] = RANKS.find(([min]) => lvl >= min);
    return { lvl, into, need: xpNeed(lvl), rank, icon };
  }
  /** Player card: rank badge, level and XP bar. `fromPct` lets the bar animate up from an old value. */
  function xpCard(xp, fromPct) {
    const L = levelOf(xp);
    const pct = Math.round((L.into / L.need) * 100);
    const fill = el("i", { class: "xp-fill", style: { width: (fromPct != null ? fromPct : pct) + "%" } });
    const card = el("div", { class: "xp-card rank-" + L.rank.toLowerCase() },
      el("span", { class: "xp-badge", "aria-hidden": "true" }, L.icon),
      el("div", { class: "xp-info" },
        el("p", { class: "xp-top" }, el("strong", {}, `LVL ${L.lvl}`), el("span", {}, L.rank)),
        el("div", { class: "xp-bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": L.need, "aria-valuenow": L.into, "aria-label": "XP to next level" }, fill),
        el("p", { class: "xp-num" }, `${L.into.toLocaleString()} / ${L.need.toLocaleString()} XP`)));
    if (fromPct != null) setTimeout(() => (fill.style.width = pct + "%"), 350);
    return card;
  }
  /** Loot-style rarity for how fast a right answer came in (fraction of the timer used). */
  const rarityFor = (frac) => frac < 0.25 ? ["LEGENDARY", "legendary"] : frac < 0.45 ? ["EPIC", "epic"] : frac < 0.7 ? ["RARE", "rare"] : ["UNCOMMON", "uncommon"];

  /* ---------- HUD ---------- */
  const LAMP_SVG =
    '<svg viewBox="0 0 48 40" aria-hidden="true"><path class="lamp-flame" d="M34 4c3 4 4 7 1 10-2 2-5 1-5-2 0-3 3-4 4-8z"/>' +
    '<path class="lamp-body" d="M4 22c0-3 4-5 12-5h14l8-4 6 1-8 8c-2 6-8 9-16 9-9 0-16-3-16-9z"/>' +
    '<rect class="lamp-body" x="14" y="31" width="18" height="5" rx="2"/></svg>';

  function renderHud() {
    const st = THP.state;
    const hud = $("#hud");
    hud.hidden = false;
    const lamps = $("#lamps");
    lamps.replaceChildren(...Array.from({ length: MAX_OIL }, (_, i) =>
      el("span", { class: "lamp" + (i < st.oil ? " lit" : ""), html: LAMP_SVG })));
    lamps.setAttribute("aria-label", `Lamp oil: ${st.oil} of ${MAX_OIL}`);
    $("#lost-badge").hidden = !st.lost;
    $("#score").textContent = st.score.toLocaleString();
    const streak = $("#streak");
    streak.hidden = st.streak < 2;
    streak.textContent = `x${streakMult(st.streak)} ${st.streak >= 3 ? "ON FIRE" : "STREAK"}`;
    streak.classList.toggle("hot", st.streak >= 3);
    $("#lamps").hidden = st.mode === "versus";
    $("#progress").textContent = st.mode === "versus" ? st.hudLabel
      : st.phase === "final" ? "FINAL" : `${Math.min(st.qi + 1, QUESTIONS_PER_GAME)} / ${QUESTIONS_PER_GAME}`;
  }

  function addScore(n, anchor) {
    THP.state.score += n;
    popText((n > 0 ? "+" : "") + n.toLocaleString(), "coin", anchor || $("#score"));
    renderHud();
  }

  /* ---------- Title ---------- */
  /** One row in the Game Modes menu: icon, name, age line and a plain one-line description of what it is. */
  function modeRow(cls, onclick, icon, name, sub, desc) {
    return el("button", { class: cls + " mode-row", onclick },
      el("span", { class: "level-icon", "aria-hidden": "true" }, icon),
      el("span", { class: "row-text" },
        el("span", { class: "row-head" }, el("strong", {}, name), el("small", {}, sub)),
        el("span", { class: "card-desc" }, desc)));
  }
  function titleScreen() {
    $("#hud").hidden = true;
    setMood("happy");
    const best = store.get("thp-best", 0);
    const nameInput = el("input", { id: "player-name", maxlength: 14, placeholder: "Nickname or first name", value: store.get("thp-name", ""), autocomplete: "off", "aria-label": "Your name" });
    const done = beatenSet();
    const levelBtn = (lvl) => {
      const cfg = LEVELS[lvl];
      return modeRow("level-card lvl-" + lvl, () => start(lvl, nameInput.value.trim()), cfg.icon, cfg.name,
        cfg.ages + (done.has(lvl) ? " · ✓ Beaten" : ""), cfg.desc);
    };
    const beatenCount = UNLOCK_NEEDS.filter((l) => done.has(l)).length;
    // Two groups so big screens can lay the title out side by side: brand on the left, play options on the right.
    const node = el("section", { class: "title-screen" },
      el("div", { class: "title-brand" },
      el("h1", { class: "logo", "aria-label": "Trivia Holy Party" },
        el("span", { class: "logo-1" }, "TRIVIA"),
        el("span", { class: "logo-2" }, ...[..."HOLY"].map((c, i) => el("b", { style: { "--i": i } }, c))),
        el("span", { class: "logo-3" }, "PARTY")),
      el("p", { class: "tagline" }, ({
        cyber: "8 questions. 24 trials. 1 gate. Survive the Bible trivia gauntlet.",
        loot: "8 questions · 24 trials · 1 gate · Get the Victory",
      })[THP.ui.skin()] || "Eight questions. Twenty-four trials. One gate. Survive the Bible trivia gauntlet."),
      xpCard(store.get("thp-xp", 0)),
      el("div", { class: "name-row" }, nameInput)),
      el("div", { class: "title-play" },
      el("h2", { class: "section-label" }, "Game Modes"),
      el("p", { class: "section-help" }, "Every game: 8 Bible questions, a minigame when you miss, and a final race. Pick one:"),
      el("div", { class: "mode-list" }, levelBtn(3), levelBtn(2), levelBtn(1),
        modeRow("versus-card challenge-card", () => modesScreen(nameInput.value.trim()), isUnlocked() ? "✨" : "🎯", "Challenge Modes",
          isUnlocked() ? "Holy of Holies unlocked!" : `Ages 10+ · secret mode ${beatenCount}/6 🔒`,
          "Harder kinds of questions: what Jesus taught, prophecy and Bible history."),
        modeRow("versus-card", () => THP.versus.setup(), "⚔️", "Versus", "2–4 players · one device",
          "Take turns on the same challenge with your friends. Highest score wins.")),
      el("div", { class: "title-foot" },
        el("button", { class: "btn btn-ghost", onclick: howTo }, "How to play"),
        el("button", { class: "btn btn-ghost skin-btn", id: "skin-btn", "aria-label": "Switch look", onclick: () => {
          S("tap");
          THP.ui.applySkin(THP.ui.nextSkin());
          THP.state = null; // title lines follow the skin, not the last game's level
          titleScreen();
          $("#skin-btn").focus();
        } }, "Skin: " + THP.ui.skinName()),
        best ? el("span", { class: "best" }, `Best: ${best.toLocaleString()} talents`) : null)));
    show(node, { scene: "title" });
    $(".level-card", node).setAttribute("data-autofocus", "");
    THP.ui.focusFirst(node);
    say(pick(L.title));
  }

  async function howTo() {
    S("tap");
    const steps = [
      ["🪔", "Keep your lamp lit", "You start with 3 drops of lamp oil. Answer Bible questions before the candle burns down."],
      ["⚖️", "Survive the Trial Room", "Miss a question and you face a Trial minigame. Lose it and a drop of oil spills."],
      ["🐑", "Lost, then found", "If your lamp goes out you become a Lost Sheep. The Good Shepherd comes looking for you. Answer the next one to get back in the game!"],
      ["🚪", "Race to the Narrow Gate", "Tap every answer that fits to move forward. Beat Grumbles the Goat to the gate to win!"],
      ["🎯", "Challenge Modes", "Harder questions about what Jesus taught, prophecy and Bible history. Win in all six modes to unlock a secret one."],
      ["📖", "Learn as you go", "Every answer comes with a verse and a lesson. After each game, review what you missed."],
    ];
    const node = el("section", { class: "howto" },
      el("h2", { class: "screen-title" }, "How to Play"),
      el("ol", { class: "howto-list" }, ...steps.map(([i, t, d]) => el("li", {}, el("span", { class: "howto-icon", "aria-hidden": "true" }, i), el("div", {}, el("strong", {}, t), el("p", {}, d))))),
      el("p", { class: "fine" }, "On a TV or keyboard: arrow keys to move, Enter to choose, 1–4 to answer."));
    show(node);
    say("Easy as manna from heaven!");
    await waitButton(node, "Got it!");
    titleScreen();
  }

  /* ---------- Challenge Modes ---------- */
  function modesScreen(name) {
    S("tap");
    $("#hud").hidden = true;
    setMood("happy");
    const done = beatenSet();
    const open = isUnlocked();
    const card = (lvl) => {
      const cfg = LEVELS[lvl];
      const [got, total] = learnedCount(lvl);
      const locked = cfg.secret && !open;
      return el("button", {
        class: "mode-card mode-" + lvl + (locked ? " locked" : "") + (done.has(lvl) ? " beaten" : ""),
        "aria-disabled": locked ? "true" : null,
        onclick: () => {
          if (!locked) return start(lvl, name);
          S("wrong");
          say(`Locked! Win the Narrow Gate in all six modes to open it. You've beaten ${UNLOCK_NEEDS.filter((l) => done.has(l)).length} of 6.`, { mood: "worried" });
        },
      },
        el("span", { class: "mode-icon", "aria-hidden": "true" }, locked ? "🔒" : cfg.icon),
        el("span", { class: "mode-body" },
          el("strong", {}, locked ? "??? Secret Mode" : cfg.name),
          el("small", {}, locked ? "Locked" : cfg.ages),
          el("span", { class: "mode-blurb" }, locked ? "Win the Narrow Gate in all six modes to unlock it." : cfg.blurb),
          locked
            ? el("span", { class: "mode-progress" }, ...UNLOCK_NEEDS.map((l) => el("i", { class: done.has(l) ? "on" : "" }, (done.has(l) ? "✓ " : "") + LEVELS[l].name)))
            : el("span", { class: "mode-meta" },
                el("span", {}, `📖 Learned ${got}/${total}`),
                done.has(lvl) ? el("span", { class: "mode-beaten" }, "✓ Beaten") : null)));
    };
    const node = el("section", { class: "modes-screen" },
      el("p", { class: "eyebrow" }, "Harder questions · more to learn"),
      el("h2", { class: "screen-title" }, "Challenge Modes"),
      el("div", { class: "mode-grid" }, card(4), card(5), card(6), card(7)),
      el("div", { class: "btn-row" }, el("button", { class: "btn btn-ghost", onclick: titleScreen }, "Back")));
    show(node, { scene: "title" });
    THP.ui.focusFirst($(".mode-grid", node));
    say(open
      ? "The Holy of Holies is open. Only the bravest scholars go in there."
      : pick(["These modes are tough, but every answer teaches you something new.", "Read the lessons after each answer. That's how you get good at these."]));
  }

  /* ---------- Game ---------- */
  function pickQuestions(lvl) {
    const known = learnedSet();
    // Questions you haven't gotten right yet come first, so repeat players keep seeing new material.
    const mine = shuffle(THP.QUESTIONS.filter((q) => q.lvl === lvl)).sort((a, b) => known.has(a.q) - known.has(b.q));
    const other = shuffle(THP.QUESTIONS.filter((q) => LEVELS[lvl].near.includes(q.lvl)));
    // Mostly your level, with a couple from a neighboring pool for variety (Challenge Modes stay pure).
    const borrow = Math.min(2, other.length);
    const mix = mine.slice(0, QUESTIONS_PER_GAME - borrow).concat(other.slice(0, borrow));
    // Warriors get the harder questions last; Lambs get an easy warm-up first.
    return lvl === 1 ? mix.slice(0, 2).concat(shuffle(mix.slice(2))) : shuffle(mix);
  }

  async function start(lvl, name) {
    S("fanfare");
    THP.Sound.unlock();
    store.set("thp-name", name);
    THP.state = {
      name: name || "Pilgrim", lvl, cfg: LEVELS[lvl], oil: MAX_OIL, lost: false, score: 0,
      correct: 0, trialsWon: 0, trialsPlayed: 0, qi: 0, phase: "questions", streak: 0, bestStreak: 0, history: [],
      questions: pickQuestions(lvl), recentGames: [],
    };
    renderHud();
    const intro = el("section", { class: "interstitial" },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, "🪔"),
      el("h2", { class: "screen-title" }, `Welcome, ${THP.state.name}!`),
      el("p", { class: "sub" }, `${LEVELS[lvl].name} · ${QUESTIONS_PER_GAME} questions · 1 race`));
    show(intro, { scene: "intro" });
    for (const line of L.intro) await say(line, { wait: true, mood: "happy" });

    const st = THP.state;
    for (st.qi = 0; st.qi < QUESTIONS_PER_GAME; st.qi++) {
      renderHud();
      const right = await askQuestion(st.questions[st.qi]);
      if (right) {
        if (st.lost) await getFound();
      } else {
        await trialRoom();
      }
    }
    await finalRound();
  }

  async function askQuestion(q) {
    const st = THP.state;
    const seconds = st.cfg.qTime;
    const answers = shuffle(q.a.map((text, i) => ({ text, right: i === 0 })));
    const shapes = ["◆", "●", "▲", "★"];
    const buttons = answers.map((ans, i) =>
      el("button", { class: `answer gem-${i}`, "data-key": i + 1 },
        el("span", { class: "answer-key", "aria-hidden": "true" }, shapes[i]),
        el("span", { class: "answer-text" }, ans.text)));
    const node = el("section", { class: "question-screen" },
      el("div", { class: "q-top" },
        el("span", { class: "cat-chip" }, q.cat),
        el("span", { class: "q-num" }, `Question ${st.qi + 1}`)),
      el("div", { class: "q-card" }, el("h2", { class: "q-text" }, q.q)),
      el("div", { class: "answers" }, ...buttons),
      el("div", { class: "q-reveal", hidden: true }));
    show(node, { scene: "question" });
    buttons.forEach((b) => (b.disabled = true));
    setMood("happy");
    say(pick(L.category).replace("{cat}", q.cat), { hold: 0 });
    await sleep(700);
    const live = ringTimer(seconds);
    $(".q-top", node).append(live.node);
    buttons.forEach((b) => (b.disabled = false));
    THP.ui.focusFirst($(".answers", node));

    const chosen = await new Promise((resolve) => {
      buttons.forEach((b, i) => b.addEventListener("click", () => resolve(i), { once: true }));
      live.done.then(() => resolve(-1));
    });
    live.stop();
    const elapsed = live.elapsed();
    buttons.forEach((b) => (b.disabled = true));
    const right = chosen >= 0 && answers[chosen].right;
    if (st.history) st.history.push({ q, right, picked: chosen >= 0 ? answers[chosen].text : null });
    if (right) { const known = learnedSet(); known.add(q.q); store.set("thp-learned", [...known]); }
    buttons.forEach((b, i) => {
      if (answers[i].right) b.classList.add("is-right");
      else if (i === chosen) b.classList.add("is-wrong");
      else b.classList.add("is-dim");
    });

    if (right) {
      S("correct"); flash("flash-good"); confetti(40);
      st.correct++;
      st.streak++;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
      const pts = Math.round((500 + 500 * Math.max(0, 1 - elapsed / seconds)) * streakMult(st.streak));
      addScore(pts, buttons[chosen]);
      if (THP.ui.skin() === "loot") {
        const [word, tier] = rarityFor(elapsed / seconds);
        stamp(st.streak >= 3 ? `${word}! x${streakMult(st.streak)}` : word + "!", "good rarity-" + tier);
      } else stamp(st.streak >= 3 ? "ON FIRE" : elapsed < seconds * 0.3 ? "CLUTCH" : pick(["NAILED IT", "LOCKED IN", "CLEAN"]), "good");
      setMood("happy");
    } else {
      S("wrong"); flash("shake");
      if (st.streak >= 2) popText("STREAK LOST", "bad", $("#streak"));
      st.streak = 0;
      renderHud();
      stamp(chosen < 0 ? "TIME'S UP" : "MISS", "bad");
      setMood("worried");
    }

    const reveal = $(".q-reveal", node);
    reveal.hidden = false;
    reveal.append(
      el("div", { class: "scripture" + (LEVELS[st.lvl] && LEVELS[st.lvl].challenge ? " lesson" : "") },
        el("span", { class: "ref" }, q.ref), el("span", {}, q.fact)));
    const line = right ? q.host || pick(L.correct) : chosen < 0 ? pick(L.timeout) : pick(L.wrong);
    await say(line, { hold: 300 });
    await waitButton(reveal, right ? "Next question" : "Uh oh...", right ? "btn-go" : "btn-warn");
    return right;
  }

  async function getFound() {
    const st = THP.state;
    st.lost = false;
    st.oil = 1;
    S("win"); confetti(90);
    renderHud();
    const node = el("section", { class: "interstitial found" },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, "🐑"),
      el("h2", { class: "screen-title" }, "FOUND!"),
      el("p", { class: "verse" }, "“Rejoice with me; I have found my lost sheep.”", el("cite", {}, "Luke 15:6")));
    show(node, { scene: "found" });
    await say(pick(L.found), { mood: "happy" });
    await waitButton(node, "Keep going!");
  }

  /* ---------- Trial Room ---------- */
  async function trialRoom() {
    const st = THP.state;
    S("trial");
    setMood("worried");
    const pool = THP.MINIGAMES.filter((g) => !st.recentGames.includes(g.id));
    const game = pick(pool);
    st.recentGames = [game.id, ...st.recentGames].slice(0, 3);

    // Roulette reveal.
    const reel = el("div", { class: "reel" }, el("span", { class: "reel-icon" }, "?"), el("span", { class: "reel-name" }, "..."));
    const node = el("section", { class: "trial-intro" },
      el("p", { class: "eyebrow" }, "James 1:2–3"),
      el("h2", { class: "trial-title" }, "THE TRIAL ROOM"),
      reel);
    show(node, { scene: "trial" });
    say(pick(L.trial), { mood: "worried", hold: 0 });
    const order = shuffle(THP.MINIGAMES);
    for (let i = 0; i < 14; i++) {
      const g = i === 13 ? game : order[i % order.length];
      reel.firstChild.textContent = g.icon;
      reel.lastChild.textContent = g.name;
      S("tick");
      await sleep(60 + i * 18);
    }
    reel.classList.add("landed");
    S("fanfare");
    await sleep(500);
    const won = await runMinigame(game, st.lvl, node);
    st.trialsPlayed++;

    let msg;
    if (won) {
      st.trialsWon++;
      S("win"); confetti(50);
      addScore(250);
      if (st.lost) { await resultCard(true, "Trial passed!"); await getFound(); return; }
      msg = pick(L.trialWin);
    } else {
      S("lose");
      if (!st.lost) {
        crack();
        st.oil--;
        if (st.oil <= 0) { st.oil = 0; st.lost = true; msg = pick(L.lost); }
        else msg = pick(L.trialLose);
      } else msg = "Still wandering... the Shepherd is on the way. Answer the next one to get back in!";
      renderHud();
    }
    await resultCard(won, won ? "Trial passed!" : st.lost ? "Lamp out!" : "Oil spilled!", msg);
  }

  /** Show a minigame's instructions inside `node`, count down, play it. Resolves true on a win. */
  async function runMinigame(game, lvl, node) {
    node.append(
      el("p", { class: "howto-line" }, game.howto(Math.min(lvl, 2))),
      el("p", { class: "eyebrow small" }, "Read about it: " + game.verse));
    await waitButton(node, "I'm ready!");

    // 3-2-1
    for (const n of ["3", "2", "1"]) {
      show(el("section", { class: "countdown" }, el("span", {}, n)), { scene: "trial" });
      S("tick");
      await sleep(550);
    }

    const body = el("section", { class: "minigame mg-" + game.id }, el("h2", { class: "mg-title" }, game.icon + " " + game.name));
    show(body, { scene: "trial" });
    return game.play(body, Math.min(lvl, 2));
  }

  async function resultCard(won, title, line) {
    const node = el("section", { class: "interstitial " + (won ? "won" : "lost-card") },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, won ? "🏆" : THP.state.lost ? "🐑" : "💧"),
      el("h2", { class: "screen-title" }, title));
    show(node, { scene: won ? "found" : "trial" });
    if (line) await say(line, { mood: won ? "happy" : "worried" });
    await waitButton(node, "Continue");
  }

  /* ---------- Final round: The Narrow Gate ---------- */
  function trackNode() {
    const tiles = Array.from({ length: GATE + 1 }, (_, i) =>
      el("div", { class: "tile-step" + (i === GATE ? " gate" : "") }, i === GATE ? el("span", { class: "gate-arch", "aria-hidden": "true" }) : null));
    return el("div", { class: "track", style: { "--n": GATE + 1 } },
      ...tiles,
      el("div", { class: "token goat", "aria-label": "Grumbles the Goat" }, "🐐"),
      el("div", { class: "token you", "aria-label": "You" }, "🐑"));
  }

  function placeTokens(track, you, goat) {
    track.querySelector(".you").style.setProperty("--pos", Math.min(you, GATE));
    track.querySelector(".goat").style.setProperty("--pos", Math.min(goat, GATE));
  }

  async function finalRound() {
    const st = THP.state;
    st.phase = "final";
    renderHud();
    S("fanfare");
    const head = el("section", { class: "interstitial final-intro" },
      el("p", { class: "eyebrow" }, "Matthew 7:14"),
      el("h2", { class: "trial-title gold" }, "THE NARROW GATE"),
      el("p", { class: "sub" }, st.lost ? "Lost sheep start at the very back, but you can still win!" : `Your ${st.oil} drop${st.oil === 1 ? "" : "s"} of oil = ${st.oil} step head start!`));
    show(head, { scene: "final" });
    for (const line of L.finalIntro) await say(line, { wait: true, mood: "happy" });

    let you = st.lost ? 0 : st.oil;
    let goat = 0;
    const pool = THP.FINAL_PROMPTS.filter((f) => st.lvl > 1 || !f.hard);
    let prompts = shuffle(pool);
    let turn = 0;
    const track = trackNode();
    const prompt = el("h2", { class: "final-prompt" });
    const choiceRow = el("div", { class: "final-choices" });
    const lock = el("button", { class: "btn btn-go", "data-primary": true }, "Lock it in!");
    const timerSlot = el("div", { class: "final-timer" });
    const node = el("section", { class: "final-screen" }, track, el("div", { class: "final-panel" }, el("div", { class: "final-top" }, prompt, timerSlot), choiceRow, lock));
    show(node, { scene: "final" });
    placeTokens(track, you, goat);
    await sleep(400);

    while (you < GATE && goat < GATE) {
      if (turn >= prompts.length) { prompts = prompts.concat(shuffle(pool)); }
      const fp = prompts[turn++];
      prompt.textContent = fp.p + "!";
      const opts = shuffle(fp.opts);
      const picked = new Set();
      const btns = opts.map(([label], i) => {
        const b = el("button", { class: "pick gem-" + i, "aria-pressed": "false" }, label);
        b.addEventListener("click", () => {
          S("tap");
          picked.has(i) ? picked.delete(i) : picked.add(i);
          b.setAttribute("aria-pressed", picked.has(i) ? "true" : "false");
        });
        return b;
      });
      choiceRow.replaceChildren(...btns);
      lock.disabled = false;
      lock.hidden = false;
      const t = ringTimer(st.cfg.fTime);
      timerSlot.replaceChildren(t.node);
      btns[0].focus();
      await Promise.race([t.done, new Promise((r) => lock.addEventListener("click", r, { once: true }))]);
      t.stop();
      lock.disabled = true;
      btns.forEach((b) => (b.disabled = true));

      let delta = 0;
      opts.forEach(([, ok], i) => {
        const chose = picked.has(i);
        if (ok && chose) { delta++; btns[i].classList.add("is-right"); }
        else if (!ok && chose) { delta--; btns[i].classList.add("is-wrong"); }
        else if (ok && !chose) btns[i].classList.add("is-missed");
        else btns[i].classList.add("is-dim");
      });
      await sleep(700);
      const target = Math.max(0, you + delta);
      if (delta > 0) {
        for (let s = you + 1; s <= Math.min(target, GATE); s++) { you = s; placeTokens(track, you, goat); S("step"); await sleep(260); }
        addScore(delta * 100, track.querySelector(".you"));
        say(delta >= 3 ? "PERFECT! Look at that lamb go!" : pick(L.correct), { hold: 0, mood: "happy" });
      } else {
        you = target; placeTokens(track, you, goat);
        S("wrong");
        say(delta < 0 ? "Oops! A wrong tap sends you back." : "No steps that time. Shake it off!", { hold: 0, mood: "worried" });
      }
      await sleep(700);
      if (you >= GATE) break;

      const jump = Math.random() < st.cfg.goatJump ? 2 : 1;
      for (let s = 0; s < jump; s++) { goat++; placeTokens(track, you, goat); S("bray"); await sleep(300); }
      if (Math.random() < 0.5) say(pick(L.goat), { hold: 0 });
      await sleep(900);
    }

    const won = you >= GATE;
    if (won) { addScore(2000); stamp("VICTORY", "good"); } else stamp("SO CLOSE!", "bad");
    await sleep(900);
    await results(won);
  }

  /* ---------- Results ---------- */
  async function results(won) {
    const st = THP.state;
    const best = store.get("thp-best", 0);
    const newBest = st.score > best;
    if (newBest) store.set("thp-best", st.score);
    // XP: every right answer, trial win and streak counts, plus a bonus for beating Grumbles.
    const gains = [
      ["Match played", 50],
      [`${st.correct} right answer${st.correct === 1 ? "" : "s"}`, st.correct * 100],
      [`${st.trialsWon} trial${st.trialsWon === 1 ? "" : "s"} passed`, st.trialsWon * 75],
      [`Best streak x${st.bestStreak}`, st.bestStreak * 25],
      won ? ["Victory bonus", 300] : null,
    ].filter((g) => g && g[1] > 0);
    const earned = gains.reduce((n, g) => n + g[1], 0);
    const xpBefore = store.get("thp-xp", 0);
    const before = levelOf(xpBefore);
    store.set("thp-xp", xpBefore + earned);
    const after = levelOf(xpBefore + earned);
    const leveled = after.lvl > before.lvl;
    // Beating a mode counts toward the secret Holy of Holies.
    const wasOpen = isUnlocked();
    const beatenBefore = beatenSet();
    const firstBeat = won && !beatenBefore.has(st.lvl);
    if (won) { beatenBefore.add(st.lvl); store.set("thp-beaten", [...beatenBefore]); }
    const justUnlocked = !wasOpen && isUnlocked();
    const beatenNow = UNLOCK_NEEDS.filter((l) => beatenBefore.has(l)).length;
    won ? (S("win"), confetti(160)) : S("lose");
    const [verse, ref] = pick(THP.VERSES);
    const stat = (n, label) => el("div", { class: "stat" }, el("strong", {}, n), el("span", {}, label));
    const node = el("section", { class: "results " + (won ? "won" : "lost-card") },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, won ? "👑" : "🐐"),
      el("h2", { class: "screen-title" }, won ? "Through the Gate!" : "Grumbles Wins!"),
      el("p", { class: "final-score" }, st.score.toLocaleString(), el("small", {}, " talents"), newBest ? el("em", { class: "new-best" }, "New best!") : null),
      el("div", { class: "stats" },
        stat(`${st.correct}/${QUESTIONS_PER_GAME}`, "answered right"),
        stat(`${st.trialsWon}/${st.trialsPlayed}`, "trials passed"),
        stat(st.oil + (st.lost ? " 🐑" : ""), "oil left"),
        stat(`x${st.bestStreak}`, "best streak")),
      el("div", { class: "xp-earned" },
        el("p", { class: "xp-gain" }, `+${earned.toLocaleString()} XP`, leveled ? el("em", {}, `LEVEL UP! LVL ${after.lvl}`) : null),
        el("ul", { class: "xp-list" }, ...gains.map(([label, n]) => el("li", {}, el("span", {}, label), el("b", {}, "+" + n)))),
        xpCard(xpBefore + earned, leveled ? 0 : Math.round((before.into / before.need) * 100))),
      justUnlocked
        ? el("div", { class: "unlock-banner" },
            el("p", { class: "eyebrow" }, "New mode unlocked"),
            el("strong", {}, "✨ Holy of Holies ✨"),
            el("span", {}, "You beat all six modes, so the secret mode is open. It's named after the Most Holy Place, which Jesus opened for everyone (Hebrews 10:19–20)."),
            el("button", { class: "btn btn-go", onclick: () => start(7, st.name === "Pilgrim" ? "" : st.name) }, "Enter now"))
        : firstBeat && UNLOCK_NEEDS.includes(st.lvl)
          ? el("p", { class: "beat-note" }, `✓ ${LEVELS[st.lvl].name} beaten! ${isUnlocked() ? "" : `${beatenNow}/6 toward the secret mode.`}`)
          : null,
      el("p", { class: "verse" }, `“${verse}”`, el("cite", {}, ref)),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", "data-primary": true, "data-autofocus": true, onclick: () => start(st.lvl, st.name === "Pilgrim" ? "" : st.name) }, "Play again"),
        el("button", { class: "btn btn-ghost", id: "review-btn", onclick: () => review(st.history, node) }, "Review answers"),
        el("button", { class: "btn btn-ghost", onclick: titleScreen }, "Title screen")));
    show(node, { scene: won ? "found" : "trial" });
    if (leveled) setTimeout(() => { stamp(after.rank !== before.rank ? after.rank.toUpperCase() + "!" : "LEVEL UP!", "good rarity-legendary"); confetti(80); }, 900);
    if (justUnlocked) setTimeout(() => { S("fanfare"); stamp("UNLOCKED!", "good rarity-legendary"); confetti(200); }, leveled ? 2200 : 900);
    await say(pick(won ? L.win : L.lose), { mood: won ? "happy" : "worried" });
  }

  /* ---------- Answer review: every question from the game, misses first, with the answer, verse and lesson ---------- */
  function review(history, backNode) {
    S("tap");
    const items = history.slice().sort((a, b) => a.right - b.right);
    const missed = items.filter((h) => !h.right).length;
    const node = el("section", { class: "review-screen" },
      el("p", { class: "eyebrow" }, missed ? `${missed} to study` : "Perfect game"),
      el("h2", { class: "screen-title" }, "Answer Review"),
      el("ol", { class: "review-list" }, ...items.map((h) => el("li", { class: h.right ? "ok" : "miss" },
        el("p", { class: "review-q" }, el("b", { "aria-label": h.right ? "Right" : "Missed" }, h.right ? "✓" : "✗"), h.q.q),
        el("p", { class: "review-a" }, "Answer: ", el("strong", {}, h.q.a[0]),
          h.right ? null : el("span", { class: "review-yours" }, h.picked ? ` · You said: ${h.picked}` : " · Time ran out")),
        el("p", { class: "review-fact" }, el("span", { class: "ref" }, h.q.ref), " ", h.q.fact)))),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", "data-primary": true, "data-autofocus": true, onclick: () => { S("tap"); show(backNode, { scene: "found" }); } }, "Back to results")));
    show(node, { scene: "found" });
    say(missed ? pick(["Read these once more and they'll stick.", "Every miss is a lesson. Check these out.", "Study these and you'll nail them next time."]) : "Perfect! You nailed every single one.", { hold: 0 });
  }

  // Shared with Versus mode (js/versus.js).
  THP.game = { LEVELS, L, store, renderHud, askQuestion, runMinigame, titleScreen, streakMult, levelOf, isUnlocked };

  /* ---------- Boot ---------- */
  function boot() {
    const mute = $("#mute");
    const sync = () => { mute.textContent = THP.Sound.isMuted() ? "🔇" : "🔊"; mute.setAttribute("aria-label", THP.Sound.isMuted() ? "Unmute" : "Mute"); };
    mute.addEventListener("click", () => { THP.Sound.toggle(); sync(); });
    sync();
    document.addEventListener("pointerdown", () => THP.Sound.unlock(), { once: true });
    THP.ui.applySkin(THP.ui.skin());
    THP.ui.embers();
    THP.ui.cityscape();
    THP.ui.lobby();
    titleScreen();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
