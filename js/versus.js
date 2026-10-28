/* Versus mode: pass-and-play for 2–4 players on one device.
 * Each round is one kind of challenge. Everyone plays it on their own turn with fresh randomness:
 * different questions in a Trivia Blitz, a reshuffled run of the same minigame in a Trial round.
 * Highest total after the last round (worth double) is the champion. */
window.THP = window.THP || {};

(function () {
  const { $, $$, el, sleep, pick, shuffle, show, say, setMood, waitButton, confetti, stamp } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  const G = () => THP.game;
  const fill = (line, vars) => line.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ""));
  const skinLines = () => ({ cyber: THP.VS_LINES_CYBER, loot: THP.VS_LINES_LOOT })[THP.ui.skin()] || {};
  const line = (key, vars) => fill(pick(skinLines()[key] || THP.VS_LINES[key]), vars);

  const MAX_PLAYERS = 4;
  const TRIVIA_PER_TURN = 3;
  const PLAYER_ICONS = ["🦁", "🦅", "🐑", "🐟"];

  let match = null;

  /* ---------- Setup ---------- */
  function setup() {
    S("tap");
    $("#hud").hidden = true;
    setMood("happy");
    const saved = G().store.get("thp-vs", null) || { names: ["", ""], lvl: 2, rounds: 5 };
    let names = saved.names.slice(0, MAX_PLAYERS);
    while (names.length < 2) names.push("");
    let lvl = saved.lvl, rounds = saved.rounds;
    if (lvl === 7 && !G().isUnlocked()) lvl = 2;
    const node = el("section", { class: "vs-setup" });

    const readNames = () => { names = $$(".vs-name", node).map((i) => i.value); };
    const seg = (label, options, current, onPick) =>
      el("div", { class: "seg-group" },
        el("p", { class: "seg-label" }, label),
        el("div", { class: "seg", role: "group", "aria-label": label },
          ...options.map(([value, text]) => el("button", {
            class: "seg-btn", "aria-pressed": value === current ? "true" : "false",
            onclick: () => { S("tap"); readNames(); onPick(value); render(); },
          }, text))));

    function render() {
      const focusId = document.activeElement && document.activeElement.id;
      const rows = names.map((n, i) => el("div", { class: "vs-player", style: { "--pc": `var(--p${i})` } },
        el("span", { class: "vs-icon", "aria-hidden": "true" }, PLAYER_ICONS[i]),
        el("input", { class: "vs-name", id: "vs-name-" + i, maxlength: 12, placeholder: `Player ${i + 1}`, value: n, autocomplete: "off", "aria-label": `Player ${i + 1} name` }),
        names.length > 2 ? el("button", { class: "vs-remove", id: "vs-remove-" + i, "aria-label": `Remove player ${i + 1}`, onclick: () => { S("tap"); readNames(); names.splice(i, 1); render(); } }, "✕") : null));
      node.replaceChildren(
        el("p", { class: "eyebrow" }, "Pass & play"),
        el("h2", { class: "screen-title" }, "Versus"),
        el("p", { class: "sub" }, "Everyone plays the same challenge with different questions. Pass the device between turns. Most points wins."),
        el("div", { class: "vs-players" }, ...rows,
          names.length < MAX_PLAYERS ? el("button", { class: "btn btn-ghost vs-add", id: "vs-add", onclick: () => { S("tap"); readNames(); names.push(""); render(); } }, "+ Add player") : null),
        seg("Level", [[1, "Lambs"], [2, "Warriors"], [3, "Legends"], [4, "Parables"], [5, "Prophecy"], [6, "Scholars"]]
          .concat(G().isUnlocked() ? [[7, "Holy of Holies"]] : []), lvl, (v) => (lvl = v)),
        seg("Rounds", [[3, "3"], [5, "5"], [7, "7"]], rounds, (v) => (rounds = v)),
        el("div", { class: "btn-row" },
          el("button", { class: "btn btn-go", id: "vs-start", "data-primary": true, onclick: () => { readNames(); begin(names, lvl, rounds); } }, "Start match"),
          el("button", { class: "btn btn-ghost", id: "vs-back", onclick: () => { readNames(); G().titleScreen(); } }, "Back")));
      const again = focusId && document.getElementById(focusId);
      if (again) again.focus({ preventScroll: true });
    }
    render();
    show(node, { scene: "title" });
    say(line("intro"));
  }

  /* ---------- Match ---------- */
  function begin(rawNames, lvl, rounds) {
    S("fanfare");
    THP.Sound.unlock();
    G().store.set("thp-vs", { names: rawNames, lvl, rounds });
    const seen = {};
    const players = rawNames.map((n, i) => {
      let name = (n || "").trim() || `Player ${i + 1}`;
      if (seen[name]) name = `${name} ${i + 1}`;
      seen[name] = true;
      return { name, idx: i, total: 0, scores: [] };
    });
    match = { players, lvl, rounds, usedQ: new Set(), recentGames: [], names: rawNames };
    runMatch();
  }

  async function runMatch() {
    const m = match;
    for (let r = 1; r <= m.rounds; r++) {
      if (match !== m) return; // a new match or the title screen took over
      const type = r % 2 === 1 ? "trivia" : "trial";
      const final = r === m.rounds;
      const game = type === "trial" ? pickGame(m) : null;
      await roundIntro(m, r, type, game, final);
      // Rotate who goes first each round so nobody always has to set the bar.
      const order = m.players.map((_, i) => m.players[(i + r - 1) % m.players.length]);
      const roundScores = new Map();
      for (let k = 0; k < order.length; k++) {
        const p = order[k];
        await passScreen(m, p, r);
        let score = await playTurn(m, p, type, game, r);
        if (final) score *= 2;
        roundScores.set(p, score);
        p.scores.push(score);
        p.total += score;
        await turnResult(p, score, final, k === order.length - 1);
      }
      if (match !== m) return;
      await scoreboard(m, r, roundScores, final);
    }
    if (match === m) champion(m);
  }

  function pickGame(m) {
    const pool = THP.MINIGAMES.filter((g) => !m.recentGames.includes(g.id));
    const g = pick(pool);
    m.recentGames = [g.id, ...m.recentGames].slice(0, 6);
    return g;
  }

  function drawQuestions(m, n) {
    const near = G().LEVELS[m.lvl].near;
    let pool = shuffle(THP.QUESTIONS.filter((q) => q.lvl === m.lvl && !m.usedQ.has(q)));
    if (pool.length < n) pool = pool.concat(shuffle(THP.QUESTIONS.filter((q) => near.includes(q.lvl) && !m.usedQ.has(q))));
    if (pool.length < n) { m.usedQ.clear(); pool = shuffle(THP.QUESTIONS.filter((q) => q.lvl === m.lvl)); }
    const out = pool.slice(0, n);
    out.forEach((q) => m.usedQ.add(q));
    return out;
  }

  async function roundIntro(m, r, type, game, final) {
    $("#hud").hidden = true;
    const node = el("section", { class: "trial-intro vs-round" },
      el("p", { class: "eyebrow" }, `Round ${r} of ${m.rounds}`),
      el("h2", { class: "trial-title" + (type === "trivia" ? " gold" : "") }, type === "trivia" ? "TRIVIA BLITZ" : "THE TRIAL ROOM"),
      final ? el("p", { class: "vs-double" }, "FINAL ROUND · DOUBLE POINTS") : null);
    show(node, { scene: type === "trivia" ? "final" : "trial" });
    if (final) say(line("finalRound"), { hold: 0 });
    if (type === "trial") {
      S("trial");
      const reel = el("div", { class: "reel" }, el("span", { class: "reel-icon" }, "?"), el("span", { class: "reel-name" }, "..."));
      node.append(reel);
      const order = shuffle(THP.MINIGAMES);
      for (let i = 0; i < 16; i++) {
        const g = i === 15 ? game : order[i % order.length];
        reel.firstChild.textContent = g.icon;
        reel.lastChild.textContent = g.name;
        S("tick");
        await sleep(55 + i * 16);
      }
      reel.classList.add("landed");
      S("fanfare");
      node.append(
        el("p", { class: "howto-line" }, game.howto(Math.min(m.lvl, 2))),
        el("p", { class: "eyebrow small" }, "Clear it for 2,000+ · faster is better · partial credit for progress"));
      if (!final) say(line("roundTrial", { game: game.name }));
    } else {
      S("fanfare");
      node.append(el("p", { class: "howto-line" }, `${TRIVIA_PER_TURN} questions each, all different. Right answers score 500 to 1,000 points, faster is better, and streaks multiply.`));
      if (!final) say(line("roundTrivia"));
    }
    await waitButton(node, "Start round");
  }

  async function passScreen(m, p, r) {
    $("#hud").hidden = true;
    setMood("happy");
    const node = el("section", { class: "vs-pass", style: { "--pc": `var(--p${p.idx})` } },
      el("p", { class: "eyebrow" }, `Round ${r} of ${m.rounds}`),
      el("p", { class: "vs-pass-label" }, "Pass to"),
      el("div", { class: "vs-pass-icon", "aria-hidden": "true" }, PLAYER_ICONS[p.idx]),
      el("h2", { class: "vs-pass-name" }, p.name),
      el("p", { class: "sub" }, "Everyone else, no peeking!"));
    show(node, { scene: "intro" });
    say(line("pass", { name: p.name }), { hold: 0 });
    await waitButton(node, `I'm ${p.name}. Let's go!`);
  }

  async function playTurn(m, p, type, game, r) {
    THP.state = {
      mode: "versus", hudLabel: p.name, name: p.name, lvl: m.lvl, cfg: G().LEVELS[m.lvl],
      oil: 0, lost: false, score: 0, streak: 0, bestStreak: 0, correct: 0, qi: 0, phase: "versus",
    };
    G().renderHud();
    if (type === "trivia") {
      const qs = drawQuestions(m, TRIVIA_PER_TURN);
      for (let i = 0; i < qs.length; i++) {
        THP.state.qi = i;
        await G().askQuestion(qs[i]);
      }
      p.lastDetail = `${THP.state.correct} / ${qs.length} right`;
      return THP.state.score;
    }
    const node = el("section", { class: "trial-intro" },
      el("p", { class: "eyebrow" }, `${p.name}'s turn`),
      el("h2", { class: "trial-title" }, game.icon + " " + game.name));
    show(node, { scene: "trial" });
    const won = await G().runMinigame(game, m.lvl, node);
    // Doubled so a Trial round is worth about as much as a Trivia Blitz (3 questions with streaks).
    const score = THP.mgScore(won) * 2;
    p.lastDetail = won ? "Trial cleared!" : "Trial failed, partial credit";
    THP.state.score = score;
    G().renderHud();
    S(won ? "win" : "lose");
    return score;
  }

  async function turnResult(p, score, final, last) {
    const node = el("section", { class: "interstitial vs-turn", style: { "--pc": `var(--p${p.idx})` } },
      el("p", { class: "eyebrow" }, p.name),
      el("p", { class: "final-score" }, score.toLocaleString(), el("small", {}, " pts")),
      el("p", { class: "sub" }, p.lastDetail + (final ? " · doubled!" : "")));
    show(node, { scene: "found" });
    stamp(score >= 1800 ? "BIG SCORE" : score >= 1000 ? "NICE" : "LOCKED IN", score > 0 ? "good" : "bad");
    await waitButton(node, last ? "See round results" : "Pass it on");
  }

  /** Standard competition ranking over players sorted by total: ties share a rank (1, 1, 3). */
  function ranks(sorted) {
    const map = new Map();
    sorted.forEach((p, i) => map.set(p, i > 0 && p.total === sorted[i - 1].total ? map.get(sorted[i - 1]) : i + 1));
    return (p) => map.get(p);
  }

  async function scoreboard(m, r, roundScores, final) {
    $("#hud").hidden = true;
    const best = Math.max(...roundScores.values());
    const winners = best > 0 ? m.players.filter((p) => roundScores.get(p) === best) : [];
    const ranked = m.players.slice().sort((a, b) => b.total - a.total);
    const top = ranked[0].total || 1;
    const rankOf = ranks(ranked);
    const node = el("section", { class: "vs-board" },
      el("p", { class: "eyebrow" }, final ? "Final round complete" : `Round ${r} of ${m.rounds}`),
      el("h2", { class: "screen-title" }, "Scoreboard"),
      el("ol", { class: "vs-rows" }, ...ranked.map((p) => el("li", { class: "vs-row" + (winners.includes(p) ? " round-win" : ""), style: { "--pc": `var(--p${p.idx})` } },
        el("span", { class: "vs-rank" }, String(rankOf(p))),
        el("span", { class: "vs-icon", "aria-hidden": "true" }, PLAYER_ICONS[p.idx]),
        el("span", { class: "vs-row-name" }, p.name, winners.includes(p) ? el("em", {}, " 👑") : null),
        el("span", { class: "vs-row-delta" }, "+" + roundScores.get(p).toLocaleString()),
        el("span", { class: "vs-row-total" }, p.total.toLocaleString()),
        el("span", { class: "vs-bar", style: { "--w": Math.max(4, (p.total / top) * 100) + "%" } })))));
    show(node, { scene: "final" });
    S("fanfare");
    if (winners.length === 1) stamp(`${winners[0].name.toUpperCase()} WINS`, "good");
    else stamp(winners.length ? "TIE ROUND" : "NO POINTS", winners.length ? "good" : "bad");
    await say(winners.length === 1 ? line("roundWin", { name: winners[0].name }) : line(winners.length ? "roundTie" : "roundNone"), { hold: 200 });
    if (!final && ranked[0].total > (ranked[1] ? ranked[1].total : -1)) say(line("lead", { name: ranked[0].name }), { hold: 0 });
    await waitButton(node, final ? "Crown the champion" : "Next round");
  }

  async function champion(m) {
    $("#hud").hidden = true;
    const ranked = m.players.slice().sort((a, b) => b.total - a.total);
    const champs = ranked.filter((p) => p.total === ranked[0].total);
    const rankOf = ranks(ranked);
    S("win"); confetti(180);
    const node = el("section", { class: "results vs-champ", style: { "--pc": `var(--p${champs[0].idx})` } },
      el("div", { class: "big-emblem", "aria-hidden": "true" }, "👑"),
      el("p", { class: "eyebrow" }, champs.length > 1 ? "Co-champions" : "Champion"),
      el("h2", { class: "vs-pass-name" }, champs.map((p) => p.name).join(" & ")),
      el("p", { class: "final-score" }, ranked[0].total.toLocaleString(), el("small", {}, " pts")),
      el("ol", { class: "vs-rows compact" }, ...ranked.map((p) => el("li", { class: "vs-row", style: { "--pc": `var(--p${p.idx})` } },
        el("span", { class: "vs-rank" }, String(rankOf(p))),
        el("span", { class: "vs-icon", "aria-hidden": "true" }, PLAYER_ICONS[p.idx]),
        el("span", { class: "vs-row-name" }, p.name),
        el("span", { class: "vs-row-total" }, p.total.toLocaleString())))),
      el("div", { class: "btn-row" },
        el("button", { class: "btn btn-go", "data-primary": true, "data-autofocus": true, onclick: () => begin(m.names, m.lvl, m.rounds) }, "Rematch"),
        el("button", { class: "btn btn-ghost", onclick: setup }, "Change players"),
        el("button", { class: "btn btn-ghost", onclick: () => { match = null; G().titleScreen(); } }, "Title screen")));
    show(node, { scene: "found" });
    stamp(champs.length > 1 ? "TIE GAME" : "CHAMPION", "good");
    say(champs.length > 1 ? line("tieChampion") : line("champion", { name: champs[0].name }), { mood: "happy" });
  }

  THP.versus = { setup };
})();
