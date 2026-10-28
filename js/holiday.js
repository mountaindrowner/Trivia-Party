/* Holiday Rush: six minigames back to back with three lives, themed for Thanksgiving or Christmas.
   Each event is featured (with double XP) during its season, and playable as practice the rest of the year.
   The four holiday minigames live here, not in THP.MINIGAMES, so the regular Trial Room and Versus stay as they are. */
window.THP = window.THP || {};

THP.Holiday = (function () {
  const { el, $, $$, show, say, waitButton, setMood, stamp, confetti, sleep, pick, rand, shuffle } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  const G = () => THP.game;
  const REDUCED = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Thanksgiving: The One Who Came Back (Luke 17:11–19) ---------- */
  const lepers = {
    id: "lepers", name: "The One Who Came Back", icon: "🙏", verse: "Luke 17:15–16",
    howto: (lvl) => `Jesus healed ten men, but only one came back to say thank you! Watch the crowd walk away. When one turns back with 🙏, tap him fast. Catch ${lvl === 1 ? 3 : 4}.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 3 : 4, win = lvl === 1 ? 1500 : 950;
      let misses = 2;
      const { area, t } = THP.mgFrame(body, "Tap the one who comes back!", lvl === 1 ? 20 : 17);
      const count = el("p", { class: "mg-count" }, `0 / ${need} · Misses left: ${misses}`);
      const crowd = el("div", { class: "leper-crowd" });
      const men = Array.from({ length: 10 }, () => el("button", { class: "leper", "aria-label": "Healed man walking away" }, el("span", { class: "walker" }, "🚶"), el("i", {}, "")));
      crowd.append(...men);
      area.append(el("p", { class: "leper-jesus", "aria-hidden": "true" }, "✝️ Jesus is this way ←"), count, crowd);
      THP.ui.focusFirst(crowd);
      return new Promise((resolve) => {
        let got = 0, over = false, turned = null, tm;
        const end = (ok) => { if (over) return; over = true; t.stop(); clearTimeout(tm); men.forEach((m) => (m.disabled = true)); setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        const update = () => { count.textContent = `${got} / ${need} · Misses left: ${misses}`; };
        const turnBack = () => {
          if (over) return;
          const m = pick(men.filter((x) => x !== turned));
          turned = m; m.classList.add("back"); m.lastChild.textContent = "🙏"; m.setAttribute("aria-label", "Healed man coming back to thank Jesus");
          tm = setTimeout(() => { m.classList.remove("back"); m.lastChild.textContent = ""; m.setAttribute("aria-label", "Healed man walking away"); turned = null; tm = setTimeout(turnBack, rand(500, 1300)); }, win);
        };
        tm = setTimeout(turnBack, 900);
        men.forEach((m) => m.addEventListener("click", () => {
          if (over) return;
          if (m === turned) {
            got++; S("correct"); THP.mgProg(got / need); THP.ui.popText("Thank you!", "good", m);
            clearTimeout(tm); m.classList.remove("back"); m.classList.add("thanked"); m.lastChild.textContent = ""; turned = null; update();
            setTimeout(() => m.classList.remove("thanked"), 600);
            if (got >= need) return end(true);
            tm = setTimeout(turnBack, rand(500, 1100));
          } else {
            misses--; S("wrong"); m.classList.remove("nope"); void m.offsetWidth; m.classList.add("nope"); update();
            if (misses < 0) end(false);
          }
        }));
      });
    },
  };

  /* ---------- Thanksgiving: Goodbye, Grumbles! (Philippians 2:14; 1 Thessalonians 5:18) ---------- */
  const THANKFUL = ["Saying thank you for dinner", "Thanking God for a sunny day", "Writing a thank-you note", "Praying \"Thank you, God!\"", "Sharing your snack", "Singing a praise song", "Cheering when a friend wins", "Thanking your teacher", "Helping clean up with a smile", "Thanking God for your family"];
  const GRUMBLY = ["Whining about chores", "Complaining about dinner", "Pouting when you lose", "Grumbling about the rain", "Rolling your eyes at a grown-up", "Moaning about homework", "Sulking in the car", "Saying \"That's not fair!\" all day", "Huffing when it's bedtime"];
  const grumbles = {
    id: "grumbles", name: "Goodbye, Grumbles!", icon: "🐐", verse: "1 Thessalonians 5:18",
    howto: (lvl) => `Grumbles the Goat loves complaining. Sort each one: THANKFUL or GRUMBLY? Get ${lvl === 1 ? 6 : 8} right. 3 mistakes and Grumbles wins.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 6 : 8;
      const deck = shuffle([...shuffle(THANKFUL).slice(0, Math.ceil(need / 2) + 1).map((x) => [x, true]), ...shuffle(GRUMBLY).slice(0, Math.ceil(need / 2) + 1).map((x) => [x, false])]);
      const { area, t } = THP.mgFrame(body, "Thankful or grumbly?", lvl === 1 ? 24 : 20);
      let mistakes = 3, got = 0, i = 0;
      const count = el("p", { class: "mg-count" }, `0 / ${need} · Mistakes left: 3`);
      const card = el("div", { class: "grumble-card" });
      const yes = el("button", { class: "btn chip-btn thank-btn" }, "🙏 Thankful");
      const no = el("button", { class: "btn chip-btn grumble-btn" }, "😤 Grumbly");
      area.append(count, card, el("div", { class: "mg-choices" }, yes, no));
      THP.ui.focusFirst(area);
      return new Promise((resolve) => {
        let over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); yes.disabled = no.disabled = true; setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        const deal = () => { card.textContent = deck[i % deck.length][0]; card.classList.remove("pop"); void card.offsetWidth; card.classList.add("pop"); };
        const answer = (thankful) => {
          if (over) return;
          const right = deck[i % deck.length][1] === thankful;
          if (right) { got++; S("correct"); THP.mgProg(got / need); if (!thankful) THP.ui.popText("Bye, Grumbles! 🐐", "good", card); }
          else { mistakes--; S("wrong"); card.classList.add("nope"); setTimeout(() => card.classList.remove("nope"), 300); }
          count.textContent = `${got} / ${need} · Mistakes left: ${mistakes}`;
          if (got >= need) return end(true);
          if (mistakes <= 0) return end(false);
          i++; deal();
        };
        yes.addEventListener("click", () => answer(true));
        no.addEventListener("click", () => answer(false));
        deal();
      });
    },
  };

  /* ---------- Christmas: Follow the Star (Matthew 2:9–10) ---------- */
  const star = {
    id: "star", name: "Follow the Star", icon: "⭐", verse: "Matthew 2:9–10",
    howto: () => "The wise men followed the star to Jesus! Keep your camel right under the star with ◀ and ▶. Fill the bar to get there.",
    async play(body, lvl) {
      const { area, t } = THP.mgFrame(body, "Stay under the star!", lvl === 1 ? 20 : 17);
      const sky = el("div", { class: "star-sky" });
      const starEl = el("div", { class: "star-dot", "aria-hidden": "true" }, "⭐");
      const camel = el("div", { class: "star-camel", "aria-hidden": "true" }, "🐫");
      const meter = el("div", { class: "star-meter" }, el("i"));
      sky.append(starEl, camel);
      const left = el("button", { class: "btn chip-btn", "aria-label": "Left" }, "◀");
      const right = el("button", { class: "btn chip-btn", "aria-label": "Right" }, "▶");
      area.append(sky, meter, el("div", { class: "mg-choices" }, left, right));
      THP.ui.focusFirst(area);
      return new Promise((resolve) => {
        let over = false, raf, sx = 50, sv = (lvl === 1 ? 7 : 11) * (Math.random() < 0.5 ? -1 : 1), cx = 30, fill = 0, last = performance.now(), turnAt = 0;
        const end = (ok) => { if (over) return; over = true; t.stop(); cancelAnimationFrame(raf); left.disabled = right.disabled = true; setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        const nudge = (d) => { if (!over) { cx = Math.max(6, Math.min(94, cx + d)); S("tap"); } };
        left.addEventListener("click", () => nudge(-9));
        right.addEventListener("click", () => nudge(9));
        const loop = (now) => {
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          turnAt -= dt;
          if (turnAt <= 0) { turnAt = rand(10, 22) / 10; if (Math.random() < 0.5) sv = -sv; }
          sx += sv * dt;
          if (sx < 8 || sx > 92) { sv = -sv; sx = Math.max(8, Math.min(92, sx)); }
          const under = Math.abs(sx - cx) < (lvl === 1 ? 11 : 8);
          fill = Math.max(0, Math.min(1, fill + (under ? 0.16 : -0.04) * dt * (lvl === 1 ? 1.15 : 1)));
          starEl.style.left = sx + "%"; camel.style.left = cx + "%";
          camel.classList.toggle("on", under);
          meter.firstChild.style.transform = `scaleX(${fill})`;
          THP.mgProg(fill);
          if (fill >= 1) { S("correct"); return end(true); }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    },
  };

  /* ---------- Christmas: Gifts for the King (Matthew 2:11) ---------- */
  const GIFTS = [["🪙", "Gold"], ["🌿", "Frankincense"], ["🏺", "Myrrh"]];
  const DECOYS = [["🧸", "Teddy bear"], ["🎮", "Video game"], ["🍕", "Pizza"], ["⚽", "Soccer ball"], ["🍬", "Candy"], ["📱", "Phone"], ["🚲", "Bike"], ["🧦", "Socks"]];
  const gifts = {
    id: "gifts", name: "Gifts for the King", icon: "🎁", verse: "Matthew 2:11",
    howto: (lvl) => `The wise men brought Jesus three gifts: gold, frankincense and myrrh. Tap only those! Get ${lvl === 1 ? 6 : 9}. ${lvl === 1 ? 3 : 2} wrong taps and you're out.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 6 : 9;
      let wrong = lvl === 1 ? 3 : 2, got = 0;
      const { area, t } = THP.mgFrame(body, "Gold, frankincense and myrrh!", lvl === 1 ? 20 : 17);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const grid = el("div", { class: "gift-grid" });
      const cells = Array.from({ length: 9 }, () => el("button", { class: "gift-cell" }, el("span", {}, ""), el("small", {}, "")));
      grid.append(...cells);
      area.append(count, grid);
      return new Promise((resolve) => {
        let over = false, iv;
        const end = (ok) => { if (over) return; over = true; t.stop(); clearInterval(iv); cells.forEach((c) => (c.disabled = true)); setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        const deal = () => {
          const real = rand(1, 2);
          const items = shuffle([...shuffle(GIFTS).slice(0, real).map((g) => [...g, true]), ...shuffle(DECOYS).slice(0, 9 - real).map((g) => [...g, false])]);
          const hadFocus = grid.contains(document.activeElement);
          cells.forEach((c, i) => { const [icon, name, ok] = items[i]; c.firstChild.textContent = icon; c.lastChild.textContent = name; c.dataset.ok = ok ? "1" : ""; c.classList.remove("got", "nope"); c.setAttribute("aria-label", name); });
          if (!hadFocus) cells[0].focus({ preventScroll: true });
        };
        deal();
        iv = setInterval(() => !over && deal(), lvl === 1 ? 1900 : 1350);
        cells.forEach((c) => c.addEventListener("click", () => {
          if (over || c.classList.contains("got")) return;
          if (c.dataset.ok) {
            got++; S("correct"); THP.mgProg(got / need); c.classList.add("got"); c.dataset.ok = "";
            count.textContent = `${got} / ${need}`;
            if (got >= need) end(true);
          } else {
            wrong--; S("wrong"); c.classList.add("nope"); THP.ui.popText("Not a gift for the King!", "bad", c);
            if (wrong <= 0) end(false);
          }
        }));
      });
    },
  };

  /* ---------- The events ---------- */
  const byId = (id) => [lepers, grumbles, star, gifts].find((g) => g.id === id) || THP.MINIGAMES.find((g) => g.id === id);
  const EVENTS = [
    {
      id: "thanksgiving", name: "Thanksgiving Rush", icon: "🌾", fx: "🍂",
      blurb: "Six thankful trials in a row: the ten healed men, Grumbles the Goat, loaves and fishes, and thank-you verses.",
      inSeason: (d) => d.getMonth() === 10, // November
      opens: "November",
      rounds: [["lepers", 1], ["grumbles", 1], ["loaves", 1], ["verse", 2], ["lepers", 2], ["grumbles", 2]],
      theme: {
        verses: [["Give thanks to the LORD, for he is good", "Psalm 107:1"], ["Give thanks in all circumstances", "1 Thessalonians 5:18"], ["Enter his gates with thanksgiving", "Psalm 100:4"], ["Every good and perfect gift is from above", "James 1:17"]],
      },
      cheer: ["Thankful hearts win! Next one!", "Gobble gobble, that's a W!", "So thankful for that save!"],
    },
    {
      id: "christmas", name: "Christmas Rush", icon: "🎄", fx: "❄️",
      blurb: "Six Christmas trials in a row: follow the star, find the gifts, put the Christmas story in order, and build the angels' words.",
      inSeason: (d) => d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 6), // Dec 1 – Jan 6 (Epiphany)
      opens: "December",
      rounds: [["star", 1], ["gifts", 1], ["order", 1], ["verse", 2], ["star", 2], ["gifts", 2]],
      theme: {
        verses: [["For to us a child is born", "Isaiah 9:6"], ["A Savior has been born to you", "Luke 2:11"], ["Glory to God in the highest heaven", "Luke 2:14"], ["They will call him Immanuel", "Matthew 1:23"]],
        orders: [["The Christmas story", ["😇 Angel visits Mary", "🫏 Trip to Bethlehem", "👶 Jesus is born", "🐑 Shepherds visit", "⭐ Wise men arrive"], "Luke 1–2; Matthew 2"]],
      },
      cheer: ["Ho ho… hosanna! Next one!", "Glory! That's a save!", "Merry W-mas!"],
    },
  ];
  const live = () => EVENTS.find((e) => e.inSeason(new Date())) || null;
  const bestKey = (ev) => "thp-rush-" + ev.id;

  /* Falling leaves or snow while a Rush is running. */
  let fxLayer = null;
  function eventFx(ev) {
    document.body.dataset.event = ev ? ev.id : "";
    if (fxLayer) { fxLayer.remove(); fxLayer = null; }
    if (!ev || REDUCED()) return;
    fxLayer = el("div", { class: "event-fx", "aria-hidden": "true" }, ...Array.from({ length: 18 }, (_, i) =>
      el("i", { style: { left: rand(0, 100) + "%", "--d": rand(70, 140) / 10 + "s", "--delay": -rand(0, 120) / 10 + "s", "--s": rand(7, 14) / 10 } }, ev.fx)));
    document.body.append(fxLayer);
  }

  /* ---------- Screens ---------- */
  function screen() {
    S("tap");
    eventFx(null);
    $("#hud").hidden = true;
    setMood("happy");
    const now = live();
    const card = (ev) => {
      const on = ev === now, best = G().store.get(bestKey(ev), 0);
      return el("button", { class: `rush-card rush-${ev.id}` + (on ? " live" : ""), onclick: () => run(ev) },
        el("span", { class: "rush-icon", "aria-hidden": "true" }, ev.icon),
        el("span", { class: "rush-text" },
          el("small", {}, on ? "🔴 LIVE NOW · Double XP" : `Featured in ${ev.opens} · play anytime`),
          el("strong", {}, ev.name),
          el("span", {}, ev.blurb),
          best ? el("em", {}, `Best: ${best.toLocaleString()}`) : null));
    };
    const node = el("section", { class: "rush-screen" },
      el("p", { class: "eyebrow" }, "Seasonal events"),
      el("h2", { class: "screen-title" }, "Holiday Rush"),
      el("p", { class: "section-help" }, "Six minigames back to back. Three lives. How far can you get?"),
      el("div", { class: "scene-list" }, ...EVENTS.slice().sort((a, b) => (b === now) - (a === now)).map(card)),
      el("div", { class: "btn-row" }, el("button", { class: "btn btn-ghost", onclick: () => G().titleScreen() }, "Back")));
    show(node, { scene: "title" });
    say(now ? `${now.name} is live! Double XP all season!` : "Holiday Rush! Practice now, and get double XP when the holidays come.");
  }

  async function run(ev) {
    S("fanfare");
    const doubled = ev === live();
    THP.mgTheme = ev.theme;
    eventFx(ev);
    THP.state = {
      mode: "rush", hudLabel: `1 / ${ev.rounds.length}`, name: G().store.get("thp-name", "") || "Pilgrim", lvl: 1, cfg: G().LEVELS[1],
      oil: 3, lost: false, score: 0, streak: 0, bestStreak: 0, correct: 0, qi: 0, phase: "rush",
    };
    G().renderHud();
    const intro = el("section", { class: "interstitial rush-intro" },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, ev.icon),
      el("h2", { class: "screen-title" }, ev.name),
      el("p", { class: "sub" }, `${ev.rounds.length} trials · 3 lives${doubled ? " · Double XP!" : ""}`));
    show(intro, { scene: "intro" });
    await say(doubled ? `It's ${ev.name} season! Six trials, three lives, double XP. Let's go!` : "Six trials, three lives. Lose a trial, lose a life. Ready?", { mood: "happy" });
    await waitButton(intro, "Start the rush!");
    let won = 0, played = 0;
    for (let i = 0; i < ev.rounds.length && THP.state.oil > 0; i++) {
      const [id, lvl] = ev.rounds[i];
      const game = byId(id);
      THP.state.hudLabel = `${i + 1} / ${ev.rounds.length}`;
      G().renderHud();
      const node = el("section", { class: "trial-intro rush-round" },
        el("p", { class: "eyebrow" }, `${ev.name} · Trial ${i + 1} of ${ev.rounds.length}`),
        el("h2", { class: "trial-title" }, game.icon + " " + game.name));
      show(node, { scene: "trial" });
      const ok = await G().runMinigame(game, lvl, node);
      played++;
      THP.state.score += THP.mgScore(ok);
      if (ok) { won++; S("win"); stamp("CLEARED!", "good"); }
      else { THP.state.oil--; S("lose"); stamp(THP.state.oil ? "LIFE LOST" : "OUT!", "bad"); }
      G().renderHud();
      await sleep(900);
      if (ok && i < ev.rounds.length - 1) say(pick(ev.cheer), { hold: 0 });
    }
    await results(ev, won, played, doubled);
  }

  async function results(ev, won, played, doubled) {
    const st = THP.state;
    const all = won === ev.rounds.length;
    const best = G().store.get(bestKey(ev), 0), newBest = st.score > best;
    if (newBest) G().store.set(bestKey(ev), st.score);
    const gains = [["Holiday Rush", 60], [`${won} trial${won === 1 ? "" : "s"} cleared`, won * 60], all ? ["Perfect rush", 150] : null].filter(Boolean);
    let earned = gains.reduce((n, g) => n + g[1], 0);
    if (doubled) { gains.push(["Holiday double XP", earned]); earned *= 2; }
    const xpBefore = G().store.get("thp-xp", 0);
    const before = G().levelOf(xpBefore), after = G().levelOf(xpBefore + earned);
    G().store.set("thp-xp", xpBefore + earned);
    const leveled = after.lvl > before.lvl;
    const newScenes = THP.Scenes.newlyUnlocked();
    const next = THP.Scenes.nextMilestone();
    THP.mgTheme = null;
    if (won) { confetti(all ? 200 : 100); S("fanfare"); } else S("lose");
    const node = el("section", { class: "results " + (won >= 3 ? "won" : "lost-card") + " rush-results" },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, all ? "🏆" : ev.icon),
      el("h2", { class: "screen-title" }, all ? "Perfect Rush!" : st.oil > 0 ? "Rush Complete!" : "Out of Lives!"),
      el("p", { class: "final-score" }, st.score.toLocaleString(), el("small", {}, " pts"), newBest ? el("em", { class: "new-best" }, "New best!") : null),
      el("div", { class: "stats" },
        el("div", { class: "stat" }, el("strong", {}, `${won}/${ev.rounds.length}`), el("span", {}, "trials cleared")),
        el("div", { class: "stat" }, el("strong", {}, String(st.oil)), el("span", {}, "lives left"))),
      el("div", { class: "xp-earned" },
        el("p", { class: "xp-gain" }, `+${earned.toLocaleString()} XP`, leveled ? el("em", {}, `LEVEL UP! LVL ${after.lvl}`) : null),
        el("ul", { class: "xp-list" }, ...gains.map(([label, n]) => el("li", {}, el("span", {}, label), el("b", {}, "+" + n)))),
        G().xpCard(xpBefore + earned, leveled ? 0 : Math.round((before.into / before.need) * 100)),
        next ? el("p", { class: "scene-next" }, `🎬 Next Story Scene: ${next.text}`) : null),
      ...newScenes.map((sc) => el("div", { class: "scene-banner" },
        el("p", { class: "eyebrow" }, "New Story Scene unlocked"),
        el("strong", {}, `🎬 ${sc.title}`),
        el("button", { class: "btn btn-go", onclick: () => THP.Scenes.play(sc.id) }, "▶ Watch now"))),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", "data-primary": true, "data-autofocus": true, onclick: () => run(ev) }, "Rush again"),
        el("button", { class: "btn btn-ghost", onclick: () => { eventFx(null); G().titleScreen(); } }, "Title screen")));
    show(node, { scene: won >= 3 ? "found" : "trial" });
    if (newScenes.length) setTimeout(() => { stamp("NEW SCENE!", "good rarity-epic"); confetti(120); }, 900);
    else if (leveled) setTimeout(() => stamp("LEVEL UP!", "good rarity-legendary"), 900);
    await say(all ? "PERFECT! Every single trial! Legendary!" : won >= 4 ? "So close to perfect! Run it back!" : "Good rush! Try again and beat your best!", { mood: won >= 3 ? "happy" : "worried" });
  }

  return { screen, live, EVENTS, games: [lepers, grumbles, star, gifts], clearFx: () => eventFx(null) };
})();
