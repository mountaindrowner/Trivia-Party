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
              count.textContent = `${got} / ${need}`;
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
              if (lives <= 0) { end(false); return; }
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
          count.textContent = `${placed} / ${need}`;
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
          count.textContent = `${steps} / ${need}`;
          me.style.left = (steps / need) * 88 + "%";
          if (steps >= need) { S("correct"); end(true); }
        });
      });
    },
  };

  /* ---------------- 12. Fishers of Men — whack-a-fish ---------------- */
  const fishers = {
    id: "fishers", name: "Fishers of Men", icon: "🐟",
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
          count.textContent = `${got} / ${need}`;
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
            b.disabled = true; b.classList.add("used"); at++;
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
            seq.push(rand(0, 3));
            await sleep(400);
            show();
          }
        }));
      });
    },
  };

  THP.MINIGAMES = [loaves, pairs, jericho, sling, fleece, scroll, lostSheep, manna, redSea, ark, lions, fishers, verseBuilder, dreams];
})();
