/* Daily Challenge: 5 questions and 1 minigame, the same for everyone on a given day (per age level), with a day streak.
   Questions come from a seeded shuffle of the level's pool, dealt 5 a day, so they don't repeat until the whole pool
   has been used. Finishing once a day counts toward the streak and earns XP; replays that day are just practice. */
window.THP = window.THP || {};

THP.Daily = (function () {
  const { el, $, show, say, waitButton, setMood, stamp, confetti } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  const G = () => THP.game;
  const KEY = "thp-daily";
  const PER_DAY = 5;
  const LEVELS = [1, 2, 3];

  const load = () => Object.assign({ lvl: 1, streak: 0, best: 0, last: null, days: {} }, G().store.get(KEY, {}));
  const save = (d) => {
    // Keep only the last 60 days of history.
    const keys = Object.keys(d.days).sort();
    keys.slice(0, Math.max(0, keys.length - 60)).forEach((k) => delete d.days[k]);
    G().store.set(KEY, d);
  };

  /* ---------- Dates (local time, so "today" matches the kid's own clock) ---------- */
  const keyOf = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const today = () => keyOf(new Date());
  const shift = (key, days) => { const [y, m, d] = key.split("-").map(Number); return keyOf(new Date(y, m - 1, d + days)); };
  const dayNumber = (key) => { const [y, m, d] = key.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 864e5); };
  const pretty = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); };

  /* ---------- Seeded picks: everyone gets the same challenge on the same day ---------- */
  function rng(seedText) {
    let h = 1779033703 ^ seedText.length;
    for (let i = 0; i < seedText.length; i++) { h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  const seededShuffle = (list, seed) => { const r = rng(seed), a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /** Today's questions for a level: a fresh shuffle of the pool each "lap", dealt PER_DAY at a time. */
  function questionsFor(key, lvl) {
    const pool = THP.QUESTIONS.filter((q) => q.lvl === lvl);
    const perLap = Math.floor(pool.length / PER_DAY);
    const n = dayNumber(key), lap = Math.floor(n / perLap), slot = ((n % perLap) + perLap) % perLap;
    return seededShuffle(pool, `lap-${lvl}-${lap}`).slice(slot * PER_DAY, slot * PER_DAY + PER_DAY);
  }
  const gameFor = (key) => seededShuffle(THP.MINIGAMES, `game-${key}`)[0];

  /* ---------- Streak ---------- */
  /** The streak as of today: it survives until the end of the day after the last completed challenge. */
  function liveStreak(d) {
    if (!d.last) return 0;
    return d.last === today() || d.last === shift(today(), -1) ? d.streak : 0;
  }
  function weekRow(d) {
    const t = today();
    return el("div", { class: "daily-week", "aria-label": "Last 7 days" }, ...Array.from({ length: 7 }, (_, i) => {
      const k = shift(t, i - 6);
      const [y, m, dd] = k.split("-").map(Number);
      const label = new Date(y, m - 1, dd).toLocaleDateString(undefined, { weekday: "narrow" });
      return el("span", { class: "daily-day" + (d.days[k] != null ? " done" : "") + (k === t ? " today" : "") },
        el("small", {}, label), el("b", {}, d.days[k] != null ? "✓" : k === t ? "•" : ""));
    }));
  }
  const timeToTomorrow = () => {
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const mins = Math.round((next - now) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  /* ---------- Screens ---------- */
  function screen() {
    S("tap");
    $("#hud").hidden = true;
    setMood("happy");
    const d = load();
    const t = today();
    const doneToday = d.days[t] != null;
    const streak = liveStreak(d);
    let lvl = d.lvl;
    const seg = el("div", { class: "seg", role: "group", "aria-label": "Level" }, ...LEVELS.map((l) => el("button", {
      class: "seg-btn", "aria-pressed": l === lvl ? "true" : "false",
      onclick: (e) => { S("tap"); lvl = l; seg.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-pressed", b === e.currentTarget ? "true" : "false")); },
    }, G().LEVELS[l].name.replace(/^(Little|Mighty) /, ""))));
    const node = el("section", { class: "daily-screen" },
      el("p", { class: "eyebrow" }, pretty(t)),
      el("h2", { class: "screen-title" }, "Daily Challenge"),
      el("p", { class: "daily-streak" + (streak ? " lit" : "") }, streak ? `🔥 ${streak}-day streak` : "🔥 Start a streak today!"),
      weekRow(d),
      el("p", { class: "section-help" }, `${PER_DAY} questions and 1 minigame. Everyone gets the same challenge today, so compare scores with your friends!`),
      el("div", { class: "seg-group" }, el("p", { class: "seg-label" }, "Level"), seg),
      doneToday
        ? el("p", { class: "daily-done" }, `✓ Done today: ${d.days[t].toLocaleString()} pts. New challenge in ${timeToTomorrow()}.`)
        : el("p", { class: "daily-done" }, `Keep your streak going: +${Math.min(streak + 1, 10) * 20} streak bonus XP today.`),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", "data-primary": true, "data-autofocus": true, onclick: () => run(lvl, doneToday) }, doneToday ? "Practice again" : "Start today's challenge"),
        el("button", { class: "btn btn-ghost", onclick: () => G().titleScreen() }, "Back")),
      d.best ? el("p", { class: "fine" }, `Best daily score: ${d.best.toLocaleString()}`) : null);
    show(node, { scene: "title" });
    say(doneToday ? "Nice! You already did today's. Come back tomorrow for a new one!" : streak ? `Day ${streak + 1} incoming! Don't break the streak!` : "A new challenge every day! Five questions and one trial.");
  }

  async function run(lvl, practice) {
    S("tap");
    const d = load();
    d.lvl = lvl; save(d);
    const key = today();
    const qs = questionsFor(key, lvl);
    const game = gameFor(key);
    THP.state = {
      mode: "daily", hudLabel: `1 / ${PER_DAY}`, name: G().store.get("thp-name", "") || "Pilgrim", lvl, cfg: G().LEVELS[lvl],
      oil: 3, lost: false, score: 0, streak: 0, bestStreak: 0, correct: 0, qi: 0, phase: "daily", history: [],
    };
    G().renderHud();
    const intro = el("section", { class: "interstitial" },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, "🌅"),
      el("h2", { class: "screen-title" }, practice ? "Practice Run" : "Today's Challenge"),
      el("p", { class: "sub" }, `${G().LEVELS[lvl].name} · ${PER_DAY} questions · then ${game.icon} ${game.name}`));
    show(intro, { scene: "intro" });
    await say(practice ? "Practice round! This one won't change your streak." : "Here we go. Five questions, then a trial. Make it count!", { mood: "happy" });
    await waitButton(intro, "Let's go!");
    for (let i = 0; i < qs.length; i++) {
      THP.state.qi = i;
      THP.state.hudLabel = `${i + 1} / ${PER_DAY}`;
      G().renderHud();
      await G().askQuestion(qs[i]);
    }
    THP.state.hudLabel = "TRIAL";
    G().renderHud();
    const node = el("section", { class: "trial-intro" },
      el("p", { class: "eyebrow" }, "Daily Trial"),
      el("h2", { class: "trial-title" }, game.icon + " " + game.name));
    show(node, { scene: "trial" });
    const won = await G().runMinigame(game, Math.min(lvl, 2), node);
    THP.state.score += THP.mgScore(won);
    S(won ? "win" : "lose");
    await results(lvl, won, practice);
  }

  async function results(lvl, won, practice) {
    const st = THP.state;
    const d = load();
    const t = today();
    let gains = [], streak = liveStreak(d), newBest = false;
    if (!practice) {
      streak = d.last === shift(t, -1) ? d.streak + 1 : d.last === t ? d.streak : 1;
      d.streak = streak; d.last = t; d.days[t] = st.score;
      newBest = st.score > d.best; if (newBest) d.best = st.score;
      save(d);
      gains = [
        ["Daily challenge", 50],
        [`${st.correct} right answer${st.correct === 1 ? "" : "s"}`, st.correct * 40],
        won ? ["Trial passed", 75] : null,
        [`${streak}-day streak bonus`, Math.min(streak, 10) * 20],
      ].filter((g) => g && g[1] > 0);
    }
    const earned = gains.reduce((n, g) => n + g[1], 0);
    const xpBefore = G().store.get("thp-xp", 0);
    const before = G().levelOf(xpBefore), after = G().levelOf(xpBefore + earned);
    if (earned) G().store.set("thp-xp", xpBefore + earned);
    const leveled = after.lvl > before.lvl;
    const newScenes = THP.Scenes.newlyUnlocked();
    const next = THP.Scenes.nextMilestone();
    confetti(practice ? 40 : 120); S("fanfare");
    const node = el("section", { class: "results won daily-results" },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, "🌅"),
      el("h2", { class: "screen-title" }, practice ? "Practice Done!" : "Daily Complete!"),
      el("p", { class: "final-score" }, st.score.toLocaleString(), el("small", {}, " pts"), newBest ? el("em", { class: "new-best" }, "Best daily yet!") : null),
      el("p", { class: "daily-streak lit" }, practice ? `🔥 ${streak}-day streak (practice doesn't count)` : `🔥 ${streak}-day streak!`),
      weekRow(load()),
      el("div", { class: "stats" },
        el("div", { class: "stat" }, el("strong", {}, `${st.correct}/${PER_DAY}`), el("span", {}, "answered right")),
        el("div", { class: "stat" }, el("strong", {}, won ? "✓" : "✗"), el("span", {}, "daily trial"))),
      earned ? el("div", { class: "xp-earned" },
        el("p", { class: "xp-gain" }, `+${earned.toLocaleString()} XP`, leveled ? el("em", {}, `LEVEL UP! LVL ${after.lvl}`) : null),
        el("ul", { class: "xp-list" }, ...gains.map(([label, n]) => el("li", {}, el("span", {}, label), el("b", {}, "+" + n)))),
        G().xpCard(xpBefore + earned, leveled ? 0 : Math.round((before.into / before.need) * 100)),
        next ? el("p", { class: "scene-next" }, `🎬 Next Story Scene: ${next.text}`) : null) : null,
      ...newScenes.map((sc) => el("div", { class: "scene-banner" },
        el("p", { class: "eyebrow" }, "New Story Scene unlocked"),
        el("strong", {}, `🎬 ${sc.title}`),
        el("button", { class: "btn btn-go", onclick: () => THP.Scenes.play(sc.id) }, "▶ Watch now"))),
      el("p", { class: "fine" }, `Come back tomorrow for a new challenge (in ${timeToTomorrow()}).`),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", "data-primary": true, "data-autofocus": true, onclick: () => G().titleScreen() }, "Title screen"),
        el("button", { class: "btn btn-ghost", id: "review-btn", onclick: () => G().review(st.history, node) }, "Review answers")));
    show(node, { scene: "found" });
    if (newScenes.length) setTimeout(() => { stamp("NEW SCENE!", "good rarity-epic"); confetti(120); }, 900);
    else if (leveled) setTimeout(() => stamp("LEVEL UP!", "good rarity-legendary"), 900);
    else if (!practice && streak >= 2) setTimeout(() => stamp(`🔥 ${streak} DAYS`, "good"), 700);
    await say(practice ? "Good practice! The real one resets tomorrow." : streak >= 3 ? `${streak} days in a row! You're on fire!` : "Daily done! See you tomorrow!", { mood: "happy" });
  }

  /** For the title screen: is today's challenge still waiting, and what's the streak? */
  const status = () => { const d = load(); return { done: d.days[today()] != null, streak: liveStreak(d) }; };

  return { screen, status, questionsFor, gameFor, today };
})();
