/* The Trial Room — minigames you play after a wrong answer.
 * Each game: { id, name, icon, verse, howto(level), play(body, level) => Promise<boolean> }
 * `level` is 1 (Little Lambs) or 2 (Mighty Warriors). Every game cleans up its own listeners.
 * Games report partial progress with prog(0..1); THP.mgScore(won) turns a finished game into points
 * so Versus mode can compare two players on the same kind of game.
 */
window.THP = window.THP || {};

(function () {
  const { el, $, $$, sleep, pick, rand, shuffle, barTimer } = THP.ui;
  const S = (n) => THP.Sound.play(n);

  // The game currently being played: its timer and how far the player got.
  let cur = { t: null, progress: 0 };
  const prog = (v) => { cur.progress = Math.max(0, Math.min(1, v)); };

  /** Points for the game that just ended: a win earns 1000 plus up to 500 for time left; a loss earns up to 700 for progress. */
  THP.mgScore = (won) => {
    const left = cur.t ? Math.max(0, 1 - cur.t.elapsed() / cur.t.seconds) : 0;
    return won ? 1000 + Math.round(500 * left) : Math.round(700 * cur.progress);
  };

  /** Standard minigame header: short instruction + bar timer. */
  function frame(body, text, seconds) {
    const t = barTimer(seconds);
    cur = { t, progress: 0 };
    body.append(el("div", { class: "mg-head" }, el("p", { class: "mg-instr" }, text), t.node));
    const area = el("div", { class: "mg-area" });
    body.append(area);
    return { area, t };
  }

  /* ---------------- 1. Loaves & Fishes — quick counting / multiplying ---------------- */
  const loaves = {
    id: "loaves", name: "Loaves & Fishes", icon: "🍞",
    verse: "John 6:11",
    howto: (lvl) => (lvl === 1 ? "Count the bread and fish! Get 3 right before time runs out." : "Count all the loaves in the baskets! Get 3 right before time runs out."),
    async play(body, lvl) {
      const { area, t } = frame(body, "How much food in all?", lvl === 1 ? 16 : 14);
      let solved = 0;
      return new Promise((resolve) => {
        let over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); resolve(ok); };
        t.done.then(() => end(false));
        function round() {
          let answer, picture;
          if (lvl === 1) {
            const a = rand(1, 5), b = rand(1, 4);
            answer = a + b;
            picture = el("div", { class: "food-row" }, el("span", {}, "🍞".repeat(a)), el("b", {}, "+"), el("span", {}, "🐟".repeat(b)));
          } else {
            const baskets = rand(2, 4), each = rand(2, 5);
            answer = baskets * each;
            picture = el("div", { class: "food-row baskets" },
              ...Array.from({ length: baskets }, () => el("span", { class: "basket" }, "🍞".repeat(each), el("small", {}, "🧺"))));
          }
          const opts = new Set([answer]);
          while (opts.size < 3) { const d = answer + pick([-2, -1, 1, 2, 3]); if (d > 0) opts.add(d); }
          const row = el("div", { class: "mg-choices" });
          shuffle([...opts]).forEach((n) => {
            row.append(el("button", { class: "btn chip-btn", onclick: (e) => {
              if (over) return;
              if (n === answer) {
                S("correct"); solved++; prog(solved / 3);
                THP.ui.popText("+1", "good", e.currentTarget);
                if (solved >= 3) end(true); else round();
              } else { S("wrong"); e.currentTarget.classList.add("nope"); e.currentTarget.disabled = true; end(false); }
            } }, String(n)));
          });
          area.replaceChildren(el("p", { class: "mg-count" }, `${solved} / 3`), picture, row);
          THP.ui.focusFirst(row);
        }
        round();
      });
    },
  };

  /* ---------------- 2. Noah's Pairs — memory match ---------------- */
  const pairs = {
    id: "pairs", name: "Noah's Pairs", icon: "🦒",
    verse: "Genesis 7:9",
    howto: (lvl) => `The animals came two by two! Peek at the cards, then match every pair. You can miss ${lvl === 1 ? 4 : 5} times.`,
    async play(body, lvl) {
      const animals = shuffle(["🦁", "🐘", "🦒", "🐒", "🐪", "🦓", "🐑", "🐻", "🦉", "🐢"]).slice(0, lvl === 1 ? 4 : 6);
      const deck = shuffle([...animals, ...animals]);
      let misses = lvl === 1 ? 4 : 5;
      const { area, t } = frame(body, "Match the pairs!", lvl === 1 ? 35 : 40);
      t.stop(); // start after peek
      const status = el("p", { class: "mg-count" }, `Misses left: ${misses}`);
      const grid = el("div", { class: "card-grid", style: { "--cols": lvl === 1 ? 4 : 4 } });
      const cards = deck.map((a, i) =>
        el("button", { class: "flip up", "data-a": a, "aria-label": "Card " + (i + 1) }, el("span", { class: "face" }, a), el("span", { class: "back" }, "✦")));
      grid.append(...cards);
      area.append(status, grid);
      cards.forEach((c) => (c.disabled = true));
      await sleep(lvl === 1 ? 2600 : 2200);
      cards.forEach((c) => { c.classList.remove("up"); c.disabled = false; });
      S("flip");
      THP.ui.focusFirst(grid);
      const t2 = barTimer(lvl === 1 ? 35 : 40);
      t.node.replaceWith(t2.node);
      cur.t = t2;

      return new Promise((resolve) => {
        let open = [], matched = 0, over = false, busy = false;
        const end = (ok) => { if (over) return; over = true; t2.stop(); cards.forEach((c) => (c.disabled = true)); resolve(ok); };
        t2.done.then(() => end(false));
        cards.forEach((c) => c.addEventListener("click", async () => {
          if (over || busy || c.classList.contains("up")) return;
          S("flip"); c.classList.add("up"); open.push(c);
          if (open.length < 2) return;
          const [a, b] = open; open = [];
          if (a.dataset.a === b.dataset.a) {
            a.classList.add("got"); b.classList.add("got"); a.disabled = b.disabled = true;
            S("correct"); matched++; prog(matched / animals.length);
            if (matched === animals.length) end(true);
          } else {
            busy = true; misses--; status.textContent = `Misses left: ${misses}`;
            S("wrong");
            await sleep(650);
            a.classList.remove("up"); b.classList.remove("up"); busy = false;
            if (misses < 0) end(false);
          }
        }));
      });
    },
  };

  /* ---------------- 3. Walls of Jericho — tap as fast as you can ---------------- */
  const jericho = {
    id: "jericho", name: "Walls of Jericho", icon: "🎺",
    verse: "Joshua 6:20",
    howto: (lvl) => `Blow the trumpet! Tap it ${lvl === 1 ? 25 : 35} times super fast to bring the walls down.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 25 : 35;
      const { area, t } = frame(body, "TAP TAP TAP!", 7);
      const ROWS = 5, COLS = 7;
      const wall = el("div", { class: "wall" }, ...Array.from({ length: ROWS * COLS }, () => el("i")));
      const bricks = $$("i", wall);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const horn = el("button", { class: "btn horn", "data-primary": true, "aria-label": "Blow the trumpet" }, "🎺");
      area.append(count, wall, horn);
      horn.focus();
      return new Promise((resolve) => {
        let taps = 0, over = false;
        const end = (ok) => {
          if (over) return; over = true; t.stop(); horn.disabled = true;
          document.removeEventListener("keydown", key);
          if (ok) { wall.classList.add("fallen"); S("crumble"); }
          setTimeout(() => resolve(ok), ok ? 900 : 300);
        };
        const hit = () => {
          if (over) return;
          taps++; S("tap"); prog(taps / need);
          count.textContent = `${taps} / ${need}`;
          horn.classList.remove("blow"); void horn.offsetWidth; horn.classList.add("blow");
          const gone = Math.floor((taps / need) * bricks.length);
          bricks.forEach((b, i) => b.classList.toggle("gone", i >= bricks.length - gone));
          if (taps >= need) end(true);
        };
        const key = (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); hit(); } };
        horn.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(); });
        document.addEventListener("keydown", key);
        t.done.then(() => end(false));
      });
    },
  };

  /* ---------------- 4. David's Sling — timing ---------------- */
  const sling = {
    id: "sling", name: "David's Sling", icon: "🪨",
    verse: "1 Samuel 17:49",
    howto: (lvl) => `The stone swings back and forth. Tap SLING when it lines up with the gold target! You have ${lvl === 1 ? 3 : 2} stones.`,
    async play(body, lvl) {
      let stones = lvl === 1 ? 3 : 2;
      const zone = lvl === 1 ? 0.2 : 0.13;
      const speed = lvl === 1 ? 0.75 : 1.1; // sweeps per second
      const { area, t } = frame(body, "Wait for it...", 15);
      const zoneStart = 0.5 + (Math.random() * 0.5 - 0.25) - zone / 2;
      const track = el("div", { class: "sling-track" },
        el("div", { class: "sling-zone", style: { left: zoneStart * 100 + "%", width: zone * 100 + "%" } }),
        el("div", { class: "sling-stone" }));
      const giant = el("div", { class: "giant", "aria-hidden": "true" }, "🛡️");
      const left = el("p", { class: "mg-count" }, "Stones: " + "🪨".repeat(stones));
      const btn = el("button", { class: "btn btn-go", "data-primary": true }, "SLING!");
      area.append(left, giant, track, btn);
      btn.focus();
      const stone = $(".sling-stone", track);
      return new Promise((resolve) => {
        let over = false, pos = 0, raf;
        const t0 = performance.now();
        const loop = (now) => {
          const ph = ((now - t0) / 1000) * speed;
          pos = Math.abs((ph % 2) - 1); // ping-pong 0..1
          pos = 1 - pos;
          stone.style.left = `calc(${pos * 100}% - ${pos * 2.2}rem)`;
          if (!over) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const end = (ok) => { if (over) return; over = true; t.stop(); cancelAnimationFrame(raf); btn.disabled = true; setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        btn.addEventListener("click", () => {
          if (over) return;
          const hit = pos >= zoneStart - 0.02 && pos <= zoneStart + zone + 0.02;
          if (hit) { S("crumble"); giant.classList.add("down"); THP.ui.popText("BULLSEYE!", "good", track); end(true); return; }
          stones--; S("wrong");
          track.classList.remove("miss"); void track.offsetWidth; track.classList.add("miss");
          left.textContent = "Stones: " + ("🪨".repeat(stones) || "none!");
          if (stones <= 0) end(false);
        });
      });
    },
  };

  /* ---------------- 5. Gideon's Fleece — a lucky pick ---------------- */
  const fleece = {
    id: "fleece", name: "Gideon's Fleece", icon: "🐏",
    verse: "Judges 6:38",
    howto: () => "Two fleeces are soaked with morning dew. One is bone dry. Pick a wet one!",
    async play(body) {
      const { area, t } = frame(body, "Pick a fleece!", 10);
      const dry = rand(0, 2);
      const row = el("div", { class: "fleece-row" });
      const btns = [0, 1, 2].map((i) => el("button", { class: "fleece", "aria-label": "Fleece " + (i + 1) }, el("span", {}, "☁"), el("small", {}, String(i + 1))));
      row.append(...btns);
      area.append(row);
      btns[0].focus();
      return new Promise((resolve) => {
        let over = false;
        const reveal = async (chosen) => {
          if (over) return; over = true; t.stop();
          btns.forEach((b) => (b.disabled = true));
          if (chosen >= 0) btns[chosen].classList.add("chosen");
          S("tick"); await sleep(500); S("tick"); await sleep(500);
          btns.forEach((b, i) => b.classList.add(i === dry ? "dry" : "wet"));
          const ok = chosen >= 0 && chosen !== dry;
          S(ok ? "correct" : "wrong");
          setTimeout(() => resolve(ok), 900);
        };
        btns.forEach((b, i) => b.addEventListener("click", () => reveal(i)));
        t.done.then(() => reveal(-1));
      });
    },
  };

  /* ---------------- 6. Scroll Scramble — unscramble a Bible name ---------------- */
  const NAMES = {
    1: [["NOAH", "Built the ark"], ["ADAM", "The first man"], ["RUTH", "Loyal to Naomi"], ["MARY", "Mother of Jesus"], ["JONAH", "Swallowed by a fish"], ["DAVID", "Beat Goliath"], ["MOSES", "Led Israel out of Egypt"], ["PETER", "Walked on water"],
      ["JESUS", "Son of God"], ["EVE", "The first woman"], ["PAUL", "Wrote lots of letters"], ["JOHN", "Baptized Jesus"], ["ISAAC", "Abraham's son"], ["SARAH", "Abraham's wife"], ["JACOB", "Had twelve sons"], ["CAIN", "Adam's first son"]],
    2: [["ABRAHAM", "Father of many nations"], ["ESTHER", "A brave queen"], ["SAMSON", "Super strong"], ["ELIJAH", "Rode a whirlwind"], ["DANIEL", "Lions' den survivor"], ["GOLIATH", "A giant"], ["SOLOMON", "Wisest king"], ["JOSHUA", "Marched around Jericho"],
      ["GIDEON", "Tested God with a fleece"], ["DEBORAH", "A judge under a palm tree"], ["SAMUEL", "Heard God at night"], ["NEHEMIAH", "Rebuilt the walls"], ["MATTHEW", "Tax collector turned disciple"], ["BARNABAS", "Son of encouragement"], ["ISAIAH", "A major prophet"], ["REBEKAH", "Isaac's wife"]],
  };
  const scroll = {
    id: "scroll", name: "Scroll Scramble", icon: "📜",
    verse: "Psalm 119:105",
    howto: () => "The letters on the scroll got mixed up! Tap them in the right order to spell the name. 3 mistakes and you're out.",
    async play(body, lvl) {
      const [word, hint] = pick(NAMES[lvl]);
      let letters = shuffle(word.split(""));
      while (letters.join("") === word) letters = shuffle(word.split(""));
      const { area, t } = frame(body, "Hint: " + hint, lvl === 1 ? 22 : 20);
      let mistakes = 3;
      const status = el("p", { class: "mg-count" }, "Mistakes left: 3");
      const slots = el("div", { class: "slots" }, ...word.split("").map(() => el("span")));
      const tiles = el("div", { class: "tiles" });
      letters.forEach((L) => tiles.append(el("button", { class: "tile" }, L)));
      area.append(status, el("div", { class: "scroll-paper" }, slots), tiles);
      THP.ui.focusFirst(tiles);
      return new Promise((resolve) => {
        let at = 0, over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); $$("button", tiles).forEach((b) => (b.disabled = true)); setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        $$("button", tiles).forEach((b) => b.addEventListener("click", () => {
          if (over) return;
          if (b.textContent === word[at]) {
            S("step"); slots.children[at].textContent = b.textContent; slots.children[at].classList.add("in");
            b.disabled = true; b.classList.add("used"); at++; prog(at / word.length);
            const nextBtn = $("button:not([disabled])", tiles); if (nextBtn) nextBtn.focus();
            if (at === word.length) { S("correct"); end(true); }
          } else {
            S("wrong"); mistakes--; status.textContent = `Mistakes left: ${Math.max(0, mistakes)}`;
            b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope");
            if (mistakes <= 0) end(false);
          }
        }));
      });
    },
  };

  /* ---------------- 7. Find the Lost Sheep — spot it among the goats ---------------- */
  const lostSheep = {
    id: "sheep", name: "Find the Lost Sheep", icon: "🐑",
    verse: "Luke 15:4",
    howto: () => "One little sheep wandered into a herd of goats! Find it and tap it before time runs out.",
    async play(body, lvl) {
      const cols = lvl === 1 ? 5 : 6, rows = lvl === 1 ? 5 : 7;
      const n = cols * rows;
      const { area, t } = frame(body, "Where is the sheep?", lvl === 1 ? 10 : 8);
      const target = rand(0, n - 1);
      const grid = el("div", { class: "herd", style: { "--cols": cols } });
      const cells = Array.from({ length: n }, (_, i) =>
        el("button", { class: "critter", "aria-label": i === target ? "sheep" : "goat", style: { "--tilt": rand(-12, 12) + "deg" } }, i === target ? "🐑" : "🐐"));
      grid.append(...cells);
      area.append(grid);
      cells[0].focus();
      return new Promise((resolve) => {
        let over = false, wrong = 0;
        const end = (ok) => { if (over) return; over = true; t.stop(); cells[target].classList.add("found"); setTimeout(() => resolve(ok), 900); };
        t.done.then(() => end(false));
        cells.forEach((c, i) => c.addEventListener("click", () => {
          if (over) return;
          if (i === target) { S("correct"); end(true); }
          else { S("wrong"); c.classList.add("nope"); c.disabled = true; if (++wrong >= 3) end(false); }
        }));
      });
    },
  };

  /** Capture keys for a minigame so arrow keys don't move focus. Returns an unbind function. */
  function keys(map) {
    const fn = (e) => {
      const f = map[e.key];
      if (!f) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) f(e);
    };
    window.addEventListener("keydown", fn, true);
    return () => window.removeEventListener("keydown", fn, true);
  }

  /** Left/right control buttons shared by the lane and catch games. */
  function steerButtons(onLeft, onRight) {
    const l = el("button", { class: "btn steer", "aria-label": "Move left", onclick: onLeft }, "◀");
    const r = el("button", { class: "btn steer", "aria-label": "Move right", onclick: onRight }, "▶");
    return el("div", { class: "steer-row" }, l, r);
  }

  /* ---------------- 8. Manna Catch — catch the falling manna, skip the wormy bits ---------------- */
  const manna = {
    id: "manna", name: "Manna Catch", icon: "🧺",
    verse: "Exodus 16:14–20",
    howto: (lvl) => `Slide the basket to catch ${lvl === 1 ? 8 : 12} pieces of manna. Skip the wormy leftovers 🐛, they cost you one!`,
    async play(body, lvl) {
      const need = lvl === 1 ? 8 : 12;
      const { area, t } = frame(body, "Catch the manna!", 15);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const field = el("div", { class: "field" });
      const basket = el("div", { class: "basket-catch" }, "🧺");
      field.append(basket);
      let bx = 50;
      const move = (d) => { bx = Math.max(6, Math.min(94, bx + d)); basket.style.left = bx + "%"; };
      area.append(count, field, steerButtons(() => move(-14), () => move(14)));
      move(0);
      field.addEventListener("pointermove", (e) => { const r = field.getBoundingClientRect(); bx = 0; move(((e.clientX - r.left) / r.width) * 100); });
      field.addEventListener("pointerdown", (e) => { const r = field.getBoundingClientRect(); bx = 0; move(((e.clientX - r.left) / r.width) * 100); });
      const unbind = keys({ ArrowLeft: () => move(-14), ArrowRight: () => move(14) });
      return new Promise((resolve) => {
        let got = 0, over = false, last = performance.now(), spawnAt = 0, raf;
        const items = [];
        const end = (ok) => { if (over) return; over = true; t.stop(); unbind(); cancelAnimationFrame(raf); setTimeout(() => resolve(ok), 600); };
        t.done.then(() => end(false));
        const loop = (now) => {
          if (over) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now > spawnAt) {
            spawnAt = now + (lvl === 1 ? 650 : 520);
            const bad = Math.random() < (lvl === 1 ? 0.15 : 0.25);
            const n = el("i", { class: "drop-item" + (bad ? " bad" : "") }, bad ? "🐛" : "⚪");
            const it = { n, bad, x: 8 + Math.random() * 84, y: -6, v: (lvl === 1 ? 32 : 42) + Math.random() * 14 };
            field.append(n); items.push(it);
          }
          for (let i = items.length - 1; i >= 0; i--) {
            const it = items[i];
            it.y += it.v * dt;
            it.n.style.left = it.x + "%"; it.n.style.top = it.y + "%";
            if (it.y >= 80 && it.y <= 94 && Math.abs(it.x - bx) < 11) {
              it.n.remove(); items.splice(i, 1);
              if (it.bad) { got = Math.max(0, got - 1); S("wrong"); field.classList.remove("ouch"); void field.offsetWidth; field.classList.add("ouch"); }
              else { got++; S("step"); }
              count.textContent = `${got} / ${need}`; prog(got / need); prog(got / need);
              if (got >= need) { S("correct"); end(true); return; }
            } else if (it.y > 104) { it.n.remove(); items.splice(i, 1); }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    },
  };

  /* ---------------- 9. Red Sea Run — dodge the walls of water ---------------- */
  const redSea = {
    id: "redsea", name: "Red Sea Run", icon: "🌊",
    verse: "Exodus 14:21–22",
    howto: (lvl) => `Run the dry path! Switch lanes to dodge the waves for 12 seconds. You can get splashed ${lvl === 1 ? "twice" : "once"}.`,
    async play(body, lvl) {
      let lives = lvl === 1 ? 3 : 2;
      const { area, t } = frame(body, "Dodge the waves!", 12);
      const status = el("p", { class: "mg-count" }, "Splashes left: " + (lives - 1));
      const field = el("div", { class: "field lanes" }, el("span", { class: "lane-line" }), el("span", { class: "lane-line" }));
      const runner = el("div", { class: "runner" }, "🏃");
      field.append(runner);
      let lane = 1;
      const setLane = (l) => { lane = Math.max(0, Math.min(2, l)); runner.style.left = (lane * 33.33 + 16.67) + "%"; };
      setLane(1);
      field.addEventListener("pointerdown", (e) => { const r = field.getBoundingClientRect(); setLane(Math.floor(((e.clientX - r.left) / r.width) * 3)); S("tap"); });
      area.append(status, field, steerButtons(() => setLane(lane - 1), () => setLane(lane + 1)));
      const unbind = keys({ ArrowLeft: () => setLane(lane - 1), ArrowRight: () => setLane(lane + 1) });
      return new Promise((resolve) => {
        let over = false, last = performance.now(), waveAt = performance.now() + 500, raf;
        const waves = [];
        const end = (ok) => { if (over) return; over = true; t.stop(); unbind(); cancelAnimationFrame(raf); if (ok) S("correct"); setTimeout(() => resolve(ok), 600); };
        t.done.then(() => end(true)); // surviving the clock is the win
        const loop = (now) => {
          if (over) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now > waveAt) {
            waveAt = now + (lvl === 1 ? 950 : 720);
            const count = lvl === 1 ? 1 : (Math.random() < 0.5 ? 1 : 2);
            shuffle([0, 1, 2]).slice(0, count).forEach((l) => {
              const n = el("i", { class: "wave" }, "🌊");
              n.style.left = (l * 33.33 + 16.67) + "%";
              field.append(n);
              waves.push({ n, l, y: -10, hit: false });
            });
          }
          const v = lvl === 1 ? 55 : 72;
          for (let i = waves.length - 1; i >= 0; i--) {
            const w = waves[i];
            w.y += v * dt;
            w.n.style.top = w.y + "%";
            if (!w.hit && w.y >= 74 && w.y <= 92 && w.l === lane) {
              w.hit = true; lives--; S("wrong");
              field.classList.remove("ouch"); void field.offsetWidth; field.classList.add("ouch");
              status.textContent = "Splashes left: " + Math.max(0, lives - 1);
              if (lives <= 0) { prog(t.elapsed() / 12); end(false); return; }
            }
            if (w.y > 110) { w.n.remove(); waves.splice(i, 1); }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    },
  };

  /* ---------------- 10. Build the Ark — stack the beams ---------------- */
  const ark = {
    id: "ark", name: "Build the Ark", icon: "🪵",
    verse: "Genesis 6:14–16",
    howto: (lvl) => `A beam slides back and forth. Tap DROP to stack it on the ark. Overhanging wood gets cut off! Stack ${lvl === 1 ? 6 : 8} beams.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 6 : 8;
      const { area, t } = frame(body, "Stack it straight!", 25);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const field = el("div", { class: "field ark-field" });
      const H = 100 / (need + 2.5); // layer height in % of field
      const layer = (left, width, i, cls) => {
        const n = el("div", { class: "beam " + (cls || "") });
        Object.assign(n.style, { left: left + "%", width: width + "%", bottom: i * H + "%", height: H + "%" });
        field.append(n);
        return n;
      };
      let top = { left: 22, width: 56 };
      layer(top.left, top.width, 0, "base");
      const drop = el("button", { class: "btn btn-go", "data-primary": true }, "DROP!");
      area.append(count, field, drop);
      drop.focus();
      return new Promise((resolve) => {
        let placed = 0, over = false, speed = lvl === 1 ? 45 : 60, x = 0, dir = 1, last = performance.now(), raf;
        let moving = layer(0, top.width, 1, "moving");
        const end = (ok) => { if (over) return; over = true; t.stop(); cancelAnimationFrame(raf); drop.disabled = true; setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        const loop = (now) => {
          if (over) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          x += dir * speed * dt;
          const max = 100 - top.width;
          if (x > max) { x = max; dir = -1; } else if (x < 0) { x = 0; dir = 1; }
          moving.style.left = x + "%";
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        const place = () => {
          if (over) return;
          const l = Math.max(x, top.left), r = Math.min(x + top.width, top.left + top.width);
          const w = r - l;
          if (w < 3) { S("wrong"); moving.classList.add("fall"); end(false); return; }
          placed++;
          moving.classList.remove("moving");
          moving.style.left = l + "%"; moving.style.width = w + "%";
          S(w > top.width - 1.5 ? "correct" : "step");
          if (w > top.width - 1.5) THP.ui.popText("PERFECT", "good", moving);
          top = { left: l, width: w };
          count.textContent = `${placed} / ${need}`; prog(placed / need);
          if (placed >= need) { S("crumble"); end(true); return; }
          speed *= 1.1; x = 0; dir = 1;
          moving = layer(0, top.width, placed + 1, "moving");
        };
        drop.addEventListener("click", place);
        field.addEventListener("pointerdown", place);
      });
    },
  };

  /* ---------------- 11. Lions' Den Tiptoe — red light, green light ---------------- */
  const lions = {
    id: "lions", name: "Lions' Den Tiptoe", icon: "🦁",
    verse: "Daniel 6:22",
    howto: (lvl) => `Tap STEP to tiptoe across the den while the lion sleeps. When it opens an eye 👀, FREEZE! Take ${lvl === 1 ? 12 : 16} steps.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 12 : 16;
      let chances = lvl === 1 ? 2 : 1;
      const { area, t } = frame(body, "Shhh...", 15);
      const lion = el("div", { class: "lion sleep" }, el("span", { class: "lion-face" }, "🦁"), el("span", { class: "lion-state" }, "💤"));
      const path = el("div", { class: "tiptoe" }, el("span", { class: "tiptoe-goal" }, "🚪"), el("span", { class: "tiptoe-me" }, "🧎"));
      const me = path.lastChild;
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const step = el("button", { class: "btn btn-go", "data-primary": true }, "STEP");
      area.append(lion, count, path, step);
      step.focus();
      return new Promise((resolve) => {
        let steps = 0, over = false, state = "sleep", timer, lastStep = 0;
        const gap = lvl === 1 ? 200 : 230; // tiptoe, don't sprint: taps faster than this are ignored
        const set = (st) => { state = st; lion.className = "lion " + st; lion.lastChild.textContent = st === "sleep" ? "💤" : st === "peek" ? "👀" : "❗"; };
        const cycle = () => {
          if (over) return;
          set("sleep");
          timer = setTimeout(() => {
            if (over) return;
            set("peek"); S("tick");
            timer = setTimeout(() => {
              if (over) return;
              set("awake"); S("bray");
              timer = setTimeout(cycle, 1100);
            }, lvl === 1 ? 700 : 450);
          }, (lvl === 1 ? 1400 : 1000) + Math.random() * 1400);
        };
        cycle();
        const end = (ok) => { if (over) return; over = true; t.stop(); clearTimeout(timer); step.disabled = true; setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        step.addEventListener("click", () => {
          if (over) return;
          if (state === "awake") {
            chances--; S("wrong");
            lion.classList.add("roar");
            if (chances <= 0) { end(false); return; }
            THP.ui.popText("SPOTTED!", "bad", step);
            return;
          }
          const now = performance.now();
          if (now - lastStep < gap) return;
          lastStep = now;
          steps++; S("tap");
          count.textContent = `${steps} / ${need}`; prog(steps / need);
          me.style.left = (steps / need) * 88 + "%";
          if (steps >= need) { S("correct"); end(true); }
        });
      });
    },
  };

  /* ---------------- 12. Fishers of People — whack-a-fish ---------------- */
  const fishers = {
    id: "fishers", name: "Fishers of People", icon: "🐟",
    verse: "John 21:6",
    howto: (lvl) => `Cast your net! Tap ${lvl === 1 ? 8 : 12} fish when they jump. Old boots 👢 cost you a fish.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 8 : 12;
      const { area, t } = frame(body, "Tap the fish!", 14);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const grid = el("div", { class: "pond" });
      const cells = Array.from({ length: 9 }, (_, i) => el("button", { class: "pond-cell", "aria-label": "Water " + (i + 1) }, el("span")));
      grid.append(...cells);
      area.append(count, grid);
      cells[4].focus();
      return new Promise((resolve) => {
        let got = 0, over = false;
        const timers = [];
        const end = (ok) => { if (over) return; over = true; t.stop(); clearInterval(iv); timers.forEach(clearTimeout); setTimeout(() => resolve(ok), 600); };
        t.done.then(() => end(false));
        const spawn = () => {
          const empty = cells.filter((c) => !c.dataset.kind);
          if (!empty.length) return;
          const c = pick(empty);
          const kind = Math.random() < (lvl === 1 ? 0.15 : 0.22) ? "boot" : "fish";
          c.dataset.kind = kind;
          c.firstChild.textContent = kind === "fish" ? "🐟" : "👢";
          c.classList.add("up");
          timers.push(setTimeout(() => { if (c.dataset.kind === kind) { delete c.dataset.kind; c.classList.remove("up"); } }, lvl === 1 ? 1300 : 950));
        };
        const iv = setInterval(() => { if (!over) spawn(); }, lvl === 1 ? 600 : 450);
        spawn();
        cells.forEach((c) => c.addEventListener("click", () => {
          if (over || !c.dataset.kind) return;
          const kind = c.dataset.kind;
          delete c.dataset.kind; c.classList.remove("up");
          if (kind === "fish") { got++; S("step"); THP.ui.popText("+1", "good", c); }
          else { got = Math.max(0, got - 1); S("wrong"); c.classList.remove("nope"); void c.offsetWidth; c.classList.add("nope"); }
          count.textContent = `${got} / ${need}`; prog(got / need);
          if (got >= need) { S("correct"); end(true); }
        }));
      });
    },
  };

  /* ---------------- 13. Verse Builder — put the memory verse in order ---------------- */
  const VERSES = {
    1: [["God is love", "1 John 4:8"], ["The LORD is my shepherd", "Psalm 23:1"], ["Rejoice in the Lord always", "Philippians 4:4"], ["Be kind to one another", "Ephesians 4:32"], ["Love one another", "John 13:34"], ["Let your light shine", "Matthew 5:16"]],
    2: [["Trust in the LORD with all your heart", "Proverbs 3:5"], ["Your word is a lamp for my feet", "Psalm 119:105"], ["Be strong and courageous. Do not be afraid", "Joshua 1:9"], ["This is the day the LORD has made", "Psalm 118:24"], ["I can do all this through him who gives me strength", "Philippians 4:13"], ["The LORD is my light and my salvation", "Psalm 27:1"]],
  };
  const verseBuilder = {
    id: "verse", name: "Verse Builder", icon: "🧱",
    verse: "Psalm 119:11",
    howto: () => "A memory verse got scrambled! Tap the words in the right order. 3 mistakes and you're out.",
    async play(body, lvl) {
      const [text, ref] = pick(VERSES[lvl]);
      const words = text.split(" ");
      let order = shuffle(words.map((w, i) => i));
      while (order.every((v, i) => v === i)) order = shuffle(order);
      const { area, t } = frame(body, ref, lvl === 1 ? 25 : 22);
      let mistakes = 3;
      const status = el("p", { class: "mg-count" }, "Mistakes left: 3");
      const built = el("div", { class: "verse-built" }, ...words.map(() => el("span", { class: "verse-slot" })));
      const bank = el("div", { class: "word-bank" });
      order.forEach((i) => bank.append(el("button", { class: "word-tile" }, words[i])));
      area.append(status, el("div", { class: "scroll-paper" }, built), bank);
      THP.ui.focusFirst(bank);
      return new Promise((resolve) => {
        let at = 0, over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); $$("button", bank).forEach((b) => (b.disabled = true)); setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        $$("button", bank).forEach((b) => b.addEventListener("click", () => {
          if (over) return;
          if (b.textContent === words[at]) {
            S("step");
            built.children[at].textContent = b.textContent; built.children[at].classList.add("in");
            b.disabled = true; b.classList.add("used"); at++; prog(at / words.length);
            const nextBtn = $("button:not([disabled])", bank); if (nextBtn) nextBtn.focus();
            if (at === words.length) { S("correct"); end(true); }
          } else {
            S("wrong"); mistakes--; status.textContent = `Mistakes left: ${Math.max(0, mistakes)}`;
            b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope");
            if (mistakes <= 0) end(false);
          }
        }));
      });
    },
  };

  /* ---------------- 14. Joseph's Dreams — repeat the pattern ---------------- */
  const dreams = {
    id: "dreams", name: "Joseph's Dreams", icon: "🌙",
    verse: "Genesis 37:7–9",
    howto: (lvl) => `Watch Joseph's dream light up, then repeat the pattern. It gets longer each round, up to ${lvl === 1 ? 4 : 6}!`,
    async play(body, lvl) {
      const target = lvl === 1 ? 4 : 6;
      const flashMs = lvl === 1 ? 600 : 420;
      const { area, t } = frame(body, "Watch closely...", 40);
      const status = el("p", { class: "mg-count" }, "Round 1");
      const symbols = ["☀️", "🌙", "⭐", "🌾"];
      const pads = symbols.map((sym, i) => el("button", { class: "dream-pad pad-" + i, "aria-label": ["Sun", "Moon", "Star", "Wheat"][i] }, sym));
      const board = el("div", { class: "dream-board" }, ...pads);
      area.append(status, board);
      const instr = $(".mg-instr", body);
      return new Promise((resolve) => {
        let over = false, seq = [], input = 0, accepting = false, retries = lvl === 1 ? 1 : 0;
        const end = (ok) => { if (over) return; over = true; t.stop(); pads.forEach((p) => (p.disabled = true)); setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        const show = async () => {
          accepting = false; input = 0;
          pads.forEach((p) => (p.disabled = true));
          instr.textContent = "Watch closely...";
          status.textContent = `Round ${seq.length - 2} · ${seq.length} dreams`;
          await sleep(500);
          for (const i of seq) {
            if (over) return;
            pads[i].classList.add("lit"); S("flip");
            await sleep(flashMs);
            pads[i].classList.remove("lit");
            await sleep(180);
          }
          if (over) return;
          instr.textContent = "Your turn!";
          pads.forEach((p) => (p.disabled = false));
          pads[0].focus();
          accepting = true;
        };
        seq = Array.from({ length: 3 }, () => rand(0, 3));
        show();
        pads.forEach((p, i) => p.addEventListener("click", async () => {
          if (over || !accepting) return;
          p.classList.add("lit"); setTimeout(() => p.classList.remove("lit"), 180);
          if (i !== seq[input]) {
            S("wrong");
            if (retries > 0) { retries--; THP.ui.popText("TRY AGAIN", "bad", board); await sleep(500); show(); return; }
            end(false); return;
          }
          S("step"); input++;
          if (input === seq.length) {
            accepting = false;
            if (seq.length >= target) { S("correct"); end(true); return; }
            prog((seq.length - 2) / (target - 2));
            seq.push(rand(0, 3));
            await sleep(400);
            show();
          }
        }));
      });
    },
  };

  /* ---------------- 15. Soak the Altar — hold to pour, release on the line ---------------- */
  const altar = {
    id: "altar", name: "Soak the Altar", icon: "🏺",
    verse: "1 Kings 18:33–35",
    howto: (lvl) => `Elijah wants the altar soaked! HOLD the button to pour, and let go when the water is in the gold band. Fill 3 jars${lvl === 1 ? " (one miss allowed)" : ""}. Don't overflow!`,
    async play(body, lvl) {
      const band = lvl === 1 ? 20 : 12, rate = lvl === 1 ? 38 : 55;
      let misses = lvl === 1 ? 1 : 0, filled = 0;
      const { area, t } = frame(body, "Hold to pour...", 22);
      const count = el("p", { class: "mg-count" }, "Jars: 0 / 3");
      const water = el("div", { class: "jar-water" });
      const target = el("div", { class: "jar-band" });
      const jar = el("div", { class: "jar" }, target, water);
      const pour = el("button", { class: "btn btn-go pour-btn", "data-primary": true }, "HOLD TO POUR");
      area.append(count, jar, pour);
      pour.focus();
      return new Promise((resolve) => {
        let level = 0, lo = 0, holding = false, over = false, last = 0, raf;
        const newJar = () => {
          level = 0; lo = rand(35, 85 - band);
          target.style.bottom = lo + "%"; target.style.height = band + "%";
          water.style.height = "0%"; jar.classList.remove("good", "bad");
        };
        newJar();
        const end = (ok) => {
          if (over) return; over = true; t.stop(); cancelAnimationFrame(raf); pour.disabled = true;
          window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true);
          setTimeout(() => resolve(ok), 700);
        };
        t.done.then(() => end(false));
        const judge = () => {
          const ok = level >= lo && level <= lo + band;
          jar.classList.add(ok ? "good" : "bad");
          if (ok) { filled++; S("correct"); count.textContent = `Jars: ${filled} / 3`; prog(filled / 3); }
          else { S("wrong"); misses--; THP.ui.popText(level > lo + band ? "TOO MUCH" : "NOT ENOUGH", "bad", jar); }
          if (filled >= 3) return end(true);
          if (misses < 0) return end(false);
          setTimeout(() => { if (!over) newJar(); }, 550);
        };
        const loop = (now) => {
          if (over || !holding) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          level += rate * dt;
          water.style.height = Math.min(level, 100) + "%";
          if (level >= 100) { holding = false; pour.classList.remove("held"); judge(); return; }
          raf = requestAnimationFrame(loop);
        };
        const down = () => {
          if (over || holding || jar.classList.contains("good") || jar.classList.contains("bad")) return;
          holding = true; pour.classList.add("held"); S("whoosh"); last = performance.now(); raf = requestAnimationFrame(loop);
        };
        const up = () => { if (!holding) return; holding = false; pour.classList.remove("held"); cancelAnimationFrame(raf); judge(); };
        pour.addEventListener("pointerdown", (e) => { e.preventDefault(); pour.setPointerCapture && pour.setPointerCapture(e.pointerId); down(); });
        pour.addEventListener("pointerup", up);
        pour.addEventListener("pointercancel", up);
        pour.addEventListener("contextmenu", (e) => e.preventDefault());
        const kd = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!e.repeat) down(); } };
        const ku = (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); up(); } };
        window.addEventListener("keydown", kd, true);
        window.addEventListener("keyup", ku, true);
      });
    },
  };

  /* ---------------- 16. Jacob's Ladder — alternate hands to climb ---------------- */
  const ladder = {
    id: "ladder", name: "Jacob's Ladder", icon: "🪜",
    verse: "Genesis 28:12",
    howto: (lvl) => `Climb by tapping LEFT, RIGHT, LEFT, RIGHT. Same hand twice and you slip! Reach rung ${lvl === 1 ? 20 : 30} before time runs out.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 20 : 30;
      const { area, t } = frame(body, "Left, right, left, right!", 10);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const climber = el("span", { class: "climber" }, "🧗");
      const rail = el("div", { class: "ladder" }, el("span", { class: "ladder-top" }, "👼"), climber);
      const L = el("button", { class: "btn hand", "aria-label": "Left hand" }, "✋ L");
      const R = el("button", { class: "btn hand", "aria-label": "Right hand" }, "R 🤚");
      area.append(count, rail, el("div", { class: "steer-row" }, L, R));
      L.focus();
      return new Promise((resolve) => {
        let rung = 0, lastHand = null, over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); unbind(); L.disabled = R.disabled = true; setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        const grab = (hand) => {
          if (over) return;
          if (hand === lastHand) {
            rung = Math.max(0, rung - 2); S("wrong");
            rail.classList.remove("slip"); void rail.offsetWidth; rail.classList.add("slip");
          } else { rung++; S("step"); }
          lastHand = hand;
          count.textContent = `${rung} / ${need}`; prog(rung / need);
          climber.style.bottom = (rung / need) * 82 + "%";
          if (rung >= need) { S("correct"); end(true); }
        };
        L.addEventListener("pointerdown", (e) => { e.preventDefault(); grab("L"); });
        R.addEventListener("pointerdown", (e) => { e.preventDefault(); grab("R"); });
        const unbind = keys({ ArrowLeft: () => grab("L"), ArrowRight: () => grab("R"), Enter: () => grab(document.activeElement === R ? "R" : "L") });
      });
    },
  };

  /* ---------------- 17. Scroll Sorter — Old Testament or New? ---------------- */
  const OT = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi"];
  const NT = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
  const OT_EASY = ["Genesis", "Exodus", "Joshua", "Ruth", "Esther", "Psalms", "Proverbs", "Isaiah", "Daniel", "Jonah", "1 Samuel", "Job"];
  const NT_EASY = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "James", "Revelation", "1 Peter", "Hebrews"];
  const sorter = {
    id: "sorter", name: "Scroll Sorter", icon: "📚",
    verse: "2 Timothy 3:16",
    howto: (lvl) => `A book of the Bible pops up. Is it in the OLD Testament or the NEW? Sort ${lvl === 1 ? 8 : 12} fast. Three wrong and you're out.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 8 : 12;
      const pool = shuffle((lvl === 1 ? OT_EASY : OT).map((b) => [b, "old"]).concat((lvl === 1 ? NT_EASY : NT).map((b) => [b, "new"])));
      const { area, t } = frame(body, "Old or New?", lvl === 1 ? 20 : 18);
      let mistakes = 3;
      const count = el("p", { class: "mg-count" }, `0 / ${need} · Mistakes left: 3`);
      const card = el("div", { class: "book-card" });
      const oldB = el("button", { class: "btn sort-btn sort-old" }, "◀ OLD");
      const newB = el("button", { class: "btn sort-btn sort-new" }, "NEW ▶");
      area.append(count, card, el("div", { class: "steer-row" }, oldB, newB));
      oldB.focus();
      return new Promise((resolve) => {
        let i = 0, done = 0, over = false;
        const show = () => { card.textContent = pool[i % pool.length][0]; card.classList.remove("in"); void card.offsetWidth; card.classList.add("in"); };
        show();
        const end = (ok) => { if (over) return; over = true; t.stop(); unbind(); oldB.disabled = newB.disabled = true; setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        const answer = (side) => {
          if (over) return;
          const right = pool[i % pool.length][1] === side;
          if (right) { done++; S("step"); prog(done / need); }
          else { mistakes--; S("wrong"); THP.ui.popText(pool[i % pool.length][1] === "old" ? "OLD!" : "NEW!", "bad", card); }
          count.textContent = `${done} / ${need} · Mistakes left: ${Math.max(0, mistakes)}`;
          if (done >= need) { S("correct"); return end(true); }
          if (mistakes <= 0) return end(false);
          i++; show();
        };
        oldB.addEventListener("click", () => answer("old"));
        newB.addEventListener("click", () => answer("new"));
        const unbind = keys({ ArrowLeft: () => answer("old"), ArrowRight: () => answer("new") });
      });
    },
  };

  /* ---------------- 18. Abraham's Stars — count the flash ---------------- */
  const stars = {
    id: "stars", name: "Abraham's Stars", icon: "✨",
    verse: "Genesis 15:5",
    howto: (lvl) => `Stars flash in the night sky for just a moment. How many were there? Get 3 right${lvl === 1 ? " (one miss allowed)" : ""}.`,
    async play(body, lvl) {
      const { area, t } = frame(body, "Count the stars!", 30);
      let misses = lvl === 1 ? 1 : 0, right = 0;
      const count = el("p", { class: "mg-count" }, "0 / 3");
      const sky = el("div", { class: "night-sky" });
      const row = el("div", { class: "mg-choices" });
      area.append(count, sky, row);
      return new Promise((resolve) => {
        let over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); $$("button", row).forEach((b) => (b.disabled = true)); setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        const round = async () => {
          row.replaceChildren();
          const n = lvl === 1 ? rand(3, 8) : rand(7, 14);
          // Spread stars on a jittered grid so they never overlap.
          const cells = shuffle(Array.from({ length: 24 }, (_, i) => i)).slice(0, n);
          sky.replaceChildren(...cells.map((c) => {
            const s = el("i", { class: "star" }, "⭐");
            s.style.left = (c % 6) * 16 + 4 + Math.random() * 8 + "%";
            s.style.top = Math.floor(c / 6) * 24 + 4 + Math.random() * 10 + "%";
            return s;
          }));
          sky.classList.add("lit"); S("flip");
          await sleep(lvl === 1 ? 1700 : 1300);
          if (over) return;
          sky.classList.remove("lit");
          const opts = new Set([n]);
          while (opts.size < 3) { const d = n + pick([-2, -1, 1, 2]); if (d > 0) opts.add(d); }
          shuffle([...opts]).forEach((v) => row.append(el("button", { class: "btn chip-btn", onclick: (e) => {
            if (over) return;
            $$("button", row).forEach((b) => (b.disabled = true));
            sky.classList.add("lit");
            if (v === n) { right++; S("correct"); prog(right / 3); count.textContent = `${right} / 3`; if (right >= 3) return end(true); }
            else { misses--; S("wrong"); e.currentTarget.classList.add("nope"); THP.ui.popText(`It was ${n}`, "bad", sky); if (misses < 0) return end(false); }
            setTimeout(() => { if (!over) round(); }, 900);
          } }, String(v))));
          THP.ui.focusFirst(row);
        };
        round();
      });
    },
  };

  /* ---------------- 19. The Lost Coin — sweep with hot / cold clues ---------------- */
  const coin = {
    id: "coin", name: "The Lost Coin", icon: "🪙",
    verse: "Luke 15:8–9",
    howto: (lvl) => `A coin is hidden somewhere in the house. Each tile you sweep tells you how many steps away it is. Find it in ${lvl === 1 ? 7 : 6} sweeps!`,
    async play(body, lvl) {
      const N = lvl === 1 ? 5 : 6;
      let sweeps = lvl === 1 ? 7 : 6;
      const { area, t } = frame(body, "Sweep the house!", 30);
      const count = el("p", { class: "mg-count" }, `Sweeps left: ${sweeps}`);
      const goal = rand(0, N * N - 1);
      const gx = goal % N, gy = Math.floor(goal / N);
      const maxD = 2 * (N - 1);
      const grid = el("div", { class: "floor", style: { "--cols": N } });
      const tiles = Array.from({ length: N * N }, (_, i) => el("button", { class: "floor-tile", "aria-label": `Tile ${i + 1}` }, ""));
      grid.append(...tiles);
      area.append(count, grid, el("p", { class: "fine" }, "🔥 1 step · 🌡️ 2–3 steps · ❄️ far away"));
      tiles[Math.floor(N * N / 2)].focus();
      return new Promise((resolve) => {
        let over = false, best = maxD;
        const end = (ok) => { if (over) return; over = true; t.stop(); tiles[goal].textContent = "🪙"; tiles[goal].classList.add("found"); tiles.forEach((b) => (b.disabled = true)); setTimeout(() => resolve(ok), 900); };
        t.done.then(() => end(false));
        tiles.forEach((b, i) => b.addEventListener("click", () => {
          if (over || b.disabled) return;
          b.disabled = true;
          if (i === goal) { S("correct"); prog(1); return end(true); }
          const d = Math.abs((i % N) - gx) + Math.abs(Math.floor(i / N) - gy);
          best = Math.min(best, d); prog(0.9 * (1 - (best - 1) / maxD));
          b.textContent = d === 1 ? "🔥" : d <= 3 ? "🌡️" : "❄️";
          b.dataset.d = d;
          b.classList.add(d === 1 ? "hot" : d <= 3 ? "warm" : "cold");
          b.append(el("small", {}, String(d)));
          S(d === 1 ? "step" : "tap");
          sweeps--; count.textContent = `Sweeps left: ${sweeps}`;
          if (sweeps <= 0) { S("wrong"); end(false); }
        }));
      });
    },
  };

  /* ---------------- 20. Hide the Spies — follow the bundle ---------------- */
  const spies = {
    id: "spies", name: "Hide the Spies", icon: "🌾",
    verse: "Joshua 2:6",
    howto: (lvl) => `Rahab hid the spies under bundles of flax. Watch which bundle the spy is under while they shuffle ${lvl === 1 ? "" : "fast "}— then pick it!`,
    async play(body, lvl) {
      const n = lvl === 1 ? 3 : 4, swaps = lvl === 1 ? 5 : 8, speed = lvl === 1 ? 520 : 360;
      const { area, t } = frame(body, "Keep your eyes on the spy!", 25);
      const stagebox = el("div", { class: "shell-row", style: { "--n": n } });
      let slots = Array.from({ length: n }, (_, i) => i); // slots[bundle] = position
      const spy = rand(0, n - 1);
      const bundles = slots.map((_, b) => el("button", { class: "shell", "aria-label": "Bundle " + (b + 1) }, el("span", { class: "shell-spy" }, b === spy ? "🕵️" : ""), el("span", { class: "shell-cover" }, "🌾")));
      const place = () => bundles.forEach((b, i) => { b.style.left = `calc(${slots[i]} * (100% / ${n}))`; });
      place();
      stagebox.append(...bundles);
      area.append(stagebox);
      bundles.forEach((b) => (b.disabled = true));
      return new Promise(async (resolve) => {
        let over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); bundles.forEach((b) => { b.disabled = true; b.classList.add("open"); }); setTimeout(() => resolve(ok), 1000); };
        t.done.then(() => end(false));
        bundles[spy].classList.add("open");
        await sleep(1100);
        bundles[spy].classList.remove("open");
        await sleep(400);
        stagebox.style.setProperty("--speed", speed + "ms");
        for (let k = 0; k < swaps && !over; k++) {
          let a = rand(0, n - 1), b = rand(0, n - 1);
          while (b === a) b = rand(0, n - 1);
          [slots[a], slots[b]] = [slots[b], slots[a]];
          place(); S("whoosh");
          await sleep(speed + 60);
        }
        if (over) return;
        $(".mg-instr", body).textContent = "Where's the spy?";
        // Keyboard order should follow screen order after the shuffle.
        bundles.slice().sort((x, y) => slots[bundles.indexOf(x)] - slots[bundles.indexOf(y)]).forEach((b) => stagebox.append(b));
        bundles.forEach((b, i) => {
          b.disabled = false;
          b.addEventListener("click", () => { if (over) return; const ok = i === spy; S(ok ? "correct" : "wrong"); if (ok) prog(1); end(ok); });
        });
        THP.ui.focusFirst(stagebox);
      });
    },
  };

  /* ---------------- 21. Paul's Shipwreck — keep the boat level ---------------- */
  const ship = {
    id: "ship", name: "Paul's Shipwreck", icon: "⛵",
    verse: "Acts 27:41–44",
    howto: () => "The storm is rocking the ship! Tap ◀ and ▶ to lean against the waves and keep it from tipping over for 12 seconds.",
    async play(body, lvl) {
      const { area, t } = frame(body, "Keep it level!", 12);
      const boat = el("div", { class: "boat" }, "⛵");
      const meter = el("div", { class: "tilt-meter" }, el("span", { class: "tilt-safe" }), el("i", { class: "tilt-needle" }));
      const needle = meter.lastChild;
      const sea = el("div", { class: "sea" }, boat);
      let v = 0;
      const push = (d) => { v += d * (lvl === 1 ? 70 : 80); S("tap"); };
      area.append(sea, meter, steerButtons(() => push(-1), () => push(1)));
      const unbind = keys({ ArrowLeft: () => push(-1), ArrowRight: () => push(1) });
      return new Promise((resolve) => {
        let tilt = 0, force = 0, nextGust = 0, over = false, last = performance.now(), raf;
        const end = (ok) => { if (over) return; over = true; t.stop(); unbind(); cancelAnimationFrame(raf); if (ok) S("correct"); setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(true));
        const loop = (now) => {
          if (over) return;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now > nextGust) {
            const strength = (lvl === 1 ? 55 : 80) + t.elapsed() * (lvl === 1 ? 4 : 7);
            force = (Math.random() < 0.5 ? -1 : 1) * strength * (0.6 + Math.random() * 0.6);
            nextGust = now + 700 + Math.random() * 700;
          }
          v += (force + tilt * 0.9) * dt;   // waves plus gravity pulling a leaning boat further over
          v *= Math.pow(0.35, dt);          // water drag
          tilt += v * dt;
          boat.style.rotate = tilt * 0.45 + "deg";
          needle.style.left = 50 + tilt / 2 + "%";
          meter.classList.toggle("danger", Math.abs(tilt) > 70);
          if (Math.abs(tilt) >= 100) { S("crumble"); boat.classList.add("sunk"); prog(t.elapsed() / 12); end(false); return; }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });
    },
  };

  /* ---------------- 22. Naaman's Seven Dips — tap on the beat ---------------- */
  const naaman = {
    id: "naaman", name: "Naaman's Seven Dips", icon: "💧",
    verse: "2 Kings 5:14",
    howto: (lvl) => `Dip in the Jordan seven times! Tap DIP right when the ring closes onto the circle. You can miss ${lvl === 1 ? 3 : 2} beats.`,
    async play(body, lvl) {
      const period = lvl === 1 ? 1150 : 880, win = lvl === 1 ? 190 : 130;
      let misses = lvl === 1 ? 3 : 2;
      const { area, t } = frame(body, "Tap on the beat!", 18);
      const count = el("p", { class: "mg-count" }, `Dips: 0 / 7 · Misses left: ${misses}`);
      const ring = el("i", { class: "beat-ring" });
      const pad = el("div", { class: "beat-pad" }, el("span", { class: "beat-core" }, "🧔"), ring);
      const dip = el("button", { class: "btn btn-go", "data-primary": true }, "DIP!");
      area.append(count, pad, dip);
      dip.focus();
      return new Promise((resolve) => {
        let dips = 0, over = false, raf, handled = -1;
        const t0 = performance.now() + 600;
        const end = (ok) => { if (over) return; over = true; t.stop(); cancelAnimationFrame(raf); dip.disabled = true; setTimeout(() => resolve(ok), 700); };
        t.done.then(() => end(false));
        const status = () => { count.textContent = `Dips: ${dips} / 7 · Misses left: ${Math.max(0, misses)}`; };
        const miss = () => { misses--; S("wrong"); pad.classList.remove("good"); pad.classList.add("bad"); setTimeout(() => pad.classList.remove("bad"), 250); status(); if (misses < 0) end(false); };
        const loop = (now) => {
          if (over) return;
          const k = Math.max(1, Math.ceil((now - t0) / period)); // index of the next beat
          const phase = 1 - (k * period + t0 - now) / period; // 0 → 1 as the ring closes
          ring.style.scale = String(1 + 0.75 * (1 - Math.max(0, phase)));
          // A beat that passed without a tap counts as a miss.
          if (k - 1 > handled && k - 1 >= 1 && now - ((k - 1) * period + t0) > win) { handled = k - 1; miss(); }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        dip.addEventListener("click", () => {
          if (over) return;
          const now = performance.now();
          const nearest = Math.round((now - t0) / period);
          const off = Math.abs(now - (nearest * period + t0));
          if (nearest >= 1 && off <= win && nearest > handled) {
            handled = nearest; dips++; S("step"); prog(dips / 7);
            pad.classList.add("good"); setTimeout(() => pad.classList.remove("good"), 200);
            status();
            if (dips >= 7) { S("correct"); end(true); }
          } else if (nearest > handled) { handled = nearest; miss(); }
        });
      });
    },
  };

  /* ---------------- 23. In Order! — creation days, books of the Law, the Gospels ---------------- */
  const ORDERS = {
    1: [["Creation week", ["☀️ Light", "☁️ Sky", "🌱 Land, seas & plants", "🌙 Sun, moon & stars", "🐟 Fish & birds", "🦁 Animals & people"], "Genesis 1"]],
    2: [
      ["Creation week", ["☀️ Light", "☁️ Sky", "🌱 Land, seas & plants", "🌙 Sun, moon & stars", "🐟 Fish & birds", "🦁 Animals & people"], "Genesis 1"],
      ["Books of the Law", ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"], "Genesis–Deuteronomy"],
      ["New Testament start", ["Matthew", "Mark", "Luke", "John", "Acts", "Romans"], "Matthew–Romans"],
      ["First plagues of Egypt", ["🌊 Water to blood", "🐸 Frogs", "🦟 Gnats", "🪰 Flies", "🐄 Livestock", "🤕 Boils"], "Exodus 7–9"],
    ],
  };
  const inOrder = {
    id: "order", name: "In Order!", icon: "🔢",
    verse: "Genesis 1:31",
    howto: () => "Tap the cards in the right order, first to last. Two mistakes allowed.",
    async play(body, lvl) {
      const [title, items, ref] = pick(ORDERS[lvl]);
      const { area, t } = frame(body, `${title} · ${ref}`, lvl === 1 ? 25 : 18);
      let mistakes = 3;
      const count = el("p", { class: "mg-count" }, "Mistakes left: 2");
      const grid = el("div", { class: "order-grid" });
      shuffle(items.map((x, i) => [x, i])).forEach(([x, i]) => grid.append(el("button", { class: "order-card", "data-i": i }, el("b", {}, ""), el("span", {}, x))));
      area.append(count, grid);
      THP.ui.focusFirst(grid);
      return new Promise((resolve) => {
        let at = 0, over = false;
        const end = (ok) => { if (over) return; over = true; t.stop(); $$("button", grid).forEach((b) => (b.disabled = true)); setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        $$("button", grid).forEach((b) => b.addEventListener("click", () => {
          if (over) return;
          if (+b.dataset.i === at) {
            at++; S("step"); prog(at / items.length);
            b.disabled = true; b.classList.add("done"); b.firstChild.textContent = String(at);
            const nextBtn = $("button:not([disabled])", grid); if (nextBtn) nextBtn.focus();
            if (at === items.length) { S("correct"); end(true); }
          } else {
            mistakes--; S("wrong"); count.textContent = `Mistakes left: ${Math.max(0, mistakes - 1)}`;
            b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope");
            if (mistakes <= 0) end(false);
          }
        }));
      });
    },
  };

  /* ---------------- 24. Don't Look Back — tap RUN, never LOOK ---------------- */
  const lookBack = {
    id: "lookback", name: "Don't Look Back", icon: "🏃",
    verse: "Genesis 19:17, 26",
    howto: (lvl) => `The angels told Lot's family: run and don't look back! Tap RUN wherever it pops up, ${lvl === 1 ? 10 : 14} times. Never tap LOOK BACK${lvl === 1 ? " (you get one warning)" : ""}.`,
    async play(body, lvl) {
      const need = lvl === 1 ? 10 : 14;
      let warnings = lvl === 1 ? 1 : 0;
      const { area, t } = frame(body, "RUN! Don't look back!", 13);
      const count = el("p", { class: "mg-count" }, `0 / ${need}`);
      const grid = el("div", { class: "run-grid" });
      const cells = Array.from({ length: 9 }, () => el("button", { class: "run-cell", tabindex: "-1" }, ""));
      grid.append(...cells);
      area.append(count, grid);
      return new Promise((resolve) => {
        let steps = 0, over = false, iv;
        const end = (ok) => { if (over) return; over = true; t.stop(); clearInterval(iv); cells.forEach((c) => (c.disabled = true)); setTimeout(() => resolve(ok), 800); };
        t.done.then(() => end(false));
        const deal = () => {
          const order = shuffle(cells.map((_, i) => i));
          const temptations = lvl === 1 ? rand(1, 2) : rand(2, 4);
          cells.forEach((c) => { c.className = "run-cell"; c.textContent = ""; c.dataset.kind = ""; c.tabIndex = -1; });
          const go = cells[order[0]];
          go.dataset.kind = "go"; go.textContent = "RUN ▶"; go.classList.add("go"); go.tabIndex = 0;
          order.slice(1, 1 + temptations).forEach((i) => { const c = cells[i]; c.dataset.kind = "look"; c.textContent = "👀 LOOK BACK"; c.classList.add("look"); c.tabIndex = 0; });
          if (document.activeElement && grid.contains(document.activeElement) && !document.activeElement.dataset.kind) go.focus();
        };
        deal();
        cells[0].focus();
        iv = setInterval(() => { if (!over) deal(); }, lvl === 1 ? 1500 : 1050);
        cells.forEach((c) => c.addEventListener("click", () => {
          if (over) return;
          if (c.dataset.kind === "go") {
            steps++; S("step"); prog(steps / need);
            count.textContent = `${steps} / ${need}`;
            if (steps >= need) { S("correct"); return end(true); }
            deal();
          } else if (c.dataset.kind === "look") {
            if (warnings > 0) { warnings--; S("wrong"); THP.ui.popText("DON'T LOOK!", "bad", c); deal(); return; }
            S("wrong"); c.textContent = "OOPS! YOU LOOKED"; c.classList.add("salt"); end(false);
          }
        }));
      });
    },
  };

  THP.MINIGAMES = [
    loaves, pairs, jericho, sling, fleece, scroll, lostSheep, manna, redSea, ark, lions, fishers, verseBuilder, dreams,
    altar, ladder, sorter, stars, coin, spies, ship, naaman, inOrder, lookBack,
  ];
})();
