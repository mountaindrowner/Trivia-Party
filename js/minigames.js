/* The Trial Room — minigames you play after a wrong answer.
 * Each game: { id, name, icon, verse, howto(level), play(body, level) => Promise<boolean> }
 * `level` is 1 (Little Lambs) or 2 (Mighty Warriors). Every game cleans up its own listeners.
 */
window.THP = window.THP || {};

(function () {
  const { el, $, $$, sleep, pick, rand, shuffle, barTimer } = THP.ui;
  const S = (n) => THP.Sound.play(n);

  /** Standard minigame header: short instruction + bar timer. */
  function frame(body, text, seconds) {
    const t = barTimer(seconds);
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
                S("correct"); solved++;
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
            S("correct"); matched++;
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
          taps++; S("tap");
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
    1: [["NOAH", "Built the ark"], ["ADAM", "The first man"], ["RUTH", "Loyal to Naomi"], ["MARY", "Mother of Jesus"], ["JONAH", "Swallowed by a fish"], ["DAVID", "Beat Goliath"], ["MOSES", "Led Israel out of Egypt"], ["PETER", "Walked on water"]],
    2: [["ABRAHAM", "Father of many nations"], ["ESTHER", "A brave queen"], ["SAMSON", "Super strong"], ["ELIJAH", "Rode a whirlwind"], ["DANIEL", "Lions' den survivor"], ["GOLIATH", "A giant"], ["SOLOMON", "Wisest king"], ["JOSHUA", "Marched around Jericho"]],
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
            b.disabled = true; b.classList.add("used"); at++;
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

  THP.MINIGAMES = [loaves, pairs, jericho, sling, fleece, scroll, lostSheep];
})();
