/* First-time intro: the logo slams in, then Barnabas drops in to say hello, explains the game and asks your name.
   Plays once (thp-intro-seen) and can be replayed from How to play. Tap, Space or Enter moves on; Skip or Esc ends it. */
window.THP = window.THP || {};

THP.Intro = (function () {
  const { el, $ } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  const REDUCED = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const seen = () => store.get("thp-intro-seen", false);

  function play() {
    return new Promise((resolve) => {
      const prevFocus = document.activeElement;
      let ended = false, advance = null;
      const anim = (node, kf, o) => (REDUCED() || ended ? Promise.resolve() : node.animate(kf, Object.assign({ duration: 500, easing: "ease-out", fill: "both" }, o)).finished.catch(() => {}));
      const wait = (ms) => new Promise((r) => { const t = setTimeout(r, ended ? 0 : ms); advance = () => { clearTimeout(t); r(); }; });
      // Wait for a tap (or a key) on lines the player should read.
      const tap = () => new Promise((r) => { if (ended) return r(); nextBtn.hidden = false; advance = () => { nextBtn.hidden = true; r(); }; });

      const logo = el("h1", { class: "logo intro-logo", "aria-label": "Trivia Holy Party" },
        el("span", { class: "logo-1" }, "TRIVIA"),
        el("span", { class: "logo-2" }, ...[..."HOLY"].map((c, i) => el("b", { style: { "--i": i } }, c))),
        el("span", { class: "logo-3" }, "PARTY"));
      const donkey = el("div", { class: "intro-donkey" });
      donkey.innerHTML = $("#host svg").outerHTML;
      const text = el("p", { class: "intro-text", "aria-live": "polite" });
      const nextBtn = el("button", { class: "intro-next", hidden: true }, "Next ▶");
      const bubble = el("div", { class: "intro-bubble", hidden: true }, el("p", { class: "intro-who" }, "Barnabas"), text, nextBtn);
      const stageBox = el("div", { class: "intro-stage" }, logo, donkey, bubble);
      const startBtn = el("button", { class: "btn btn-go intro-start" }, "▶ Press start");
      const skip = el("button", { class: "btn btn-ghost intro-skip" }, "Skip intro ⏭");
      const root = el("div", { class: "intro", role: "dialog", "aria-label": "Meet Barnabas" }, el("div", { class: "intro-spot" }), stageBox, startBtn, skip);
      document.body.append(root);
      document.body.classList.add("intro-open");
      startBtn.focus();

      const end = () => {
        if (ended) return;
        ended = true;
        if (advance) advance();
        store.set("thp-intro-seen", true);
        document.removeEventListener("keydown", onKey);
        anim(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).then(() => {
          root.remove();
          document.body.classList.remove("intro-open");
          THP.game.titleScreen();
          if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
          resolve();
        });
      };
      const onKey = (e) => {
        if (e.key === "Escape") { e.preventDefault(); S("tap"); end(); }
        else if ((e.key === " " || e.key === "Enter") && document.activeElement !== skip && !root.querySelector(".intro-name input:focus")) {
          if (document.activeElement === startBtn) return; // the button's own click starts it
          e.preventDefault(); if (advance) advance();
        }
      };
      document.addEventListener("keydown", onKey);
      skip.addEventListener("click", () => { S("tap"); end(); });
      root.addEventListener("click", (e) => { if (e.target.closest("button, input")) return; if (advance) advance(); });
      nextBtn.addEventListener("click", () => { S("tap"); if (advance) advance(); });

      /** Barnabas types a line; finishes early on a tap, then waits for the next tap. */
      async function line(t, o) {
        o = o || {};
        if (ended) return;
        donkey.classList.add("talking");
        text.textContent = "";
        let skipType = false;
        advance = () => { skipType = true; };
        for (let i = 1; i <= t.length; i++) {
          if (skipType || ended || REDUCED()) { text.textContent = t; break; }
          text.textContent = t.slice(0, i);
          if (i % 3 === 0) S("tick");
          await new Promise((r) => setTimeout(r, 28));
        }
        donkey.classList.remove("talking");
        if (o.noWait) return;
        await tap();
      }

      startBtn.addEventListener("click", async () => {
        // The tap that starts the intro also lets the browser play sound.
        THP.Sound.unlock(); THP.Music.unlock();
        startBtn.remove();
        root.classList.add("on");
        THP.Music.play("strut");

        // 1. The logo slams in: TRIVIA, then H-O-L-Y one at a time, then PARTY.
        await wait(300);
        S("whoosh");
        await anim(logo.querySelector(".logo-1"), [{ opacity: 0, transform: "translateX(-60vw) skewX(-20deg)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,1.3,.4,1)" });
        for (const b of logo.querySelectorAll(".logo-2 b")) {
          S("impact");
          anim(root, [{ transform: "translate(0,0)" }, { transform: "translate(-6px,4px)" }, { transform: "translate(5px,-3px)" }, { transform: "translate(0,0)" }], { duration: 200, fill: "none" });
          await anim(b, [{ opacity: 0, transform: "translateY(-70vh) scale(1.4)" }, { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.75 }, { transform: "translateY(-6%) scale(1.04)", offset: 0.88 }, { opacity: 1, transform: "none" }], { duration: 420, easing: "ease-in" });
          await wait(70);
        }
        S("fanfare");
        await anim(logo.querySelector(".logo-3"), [{ opacity: 0, transform: "scale(3) rotate(-8deg)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,1.3,.4,1)" });
        if (!REDUCED() && !ended) THP.ui.confetti(70);
        await wait(1100);

        // 2. The logo flies off and Barnabas drops in.
        const from = getComputedStyle(logo).transform;
        await anim(logo, [{ transform: from === "none" ? "none" : from, opacity: 1 }, { transform: "translateY(-80vh) scale(0.6)", opacity: 0 }], { duration: 550, easing: "cubic-bezier(.5,0,.75,0)" });
        root.classList.add("meet");
        S("whoosh");
        await anim(donkey, [{ opacity: 0, transform: "translateY(-120vh) rotate(-12deg)" }, { opacity: 1, transform: "translateY(0) rotate(0)", offset: 0.7 }, { transform: "translateY(0) scaleY(0.82) scaleX(1.12)", offset: 0.8 }, { transform: "translateY(-8%) scaleY(1.05)", offset: 0.9 }, { opacity: 1, transform: "none" }], { duration: 900, easing: "ease-in" });
        S("impact");
        bubble.hidden = false;
        anim(bubble, [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "scale(1.05)", offset: 0.7 }, { opacity: 1, transform: "none" }], { duration: 300 });

        // 3. Barnabas says hello and explains the game.
        await line("Yooo! Welcome, welcome! I'm Barnabas: your host, your hype man… and yes, a donkey.");
        await line("Don't laugh. A donkey carried Jesus into Jerusalem, so I'm basically famous. 😎");
        await line("And my name means \"son of encouragement\" (Acts 4:36). So get ready for a LOT of cheering.");
        await line("Here's the game: answer 8 Bible questions. Miss one? Win a quick minigame to stay in.");
        await line("Then race Grumbles to the gate in the final round. Win games to unlock cartoons and level up!");

        // 4. What should I call you?
        if (!ended) {
          const input = el("input", { maxlength: 14, placeholder: "Your nickname", autocomplete: "off", "aria-label": "Your nickname", value: store.get("thp-name", "") });
          const go = el("button", { class: "btn btn-go" }, "Let's go!");
          const form = el("form", { class: "intro-name" }, input, go);
          await line("Okay, last thing. What should I call you?", { noWait: true });
          bubble.append(form);
          input.focus();
          const name = await new Promise((r) => {
            form.addEventListener("submit", (e) => { e.preventDefault(); S("tap"); r(input.value.trim()); });
            advance = () => r(input.value.trim());
          });
          form.remove();
          if (name) store.set("thp-name", name);
          S("correct");
          anim(donkey, [{ transform: "none" }, { transform: "translateY(-14%)" }, { transform: "none" }], { duration: 420, iterations: 2, fill: "none" });
          await line(name ? `${name}! Love that name. Let's get this party started!` : "Mystery player, huh? Cool, cool. Let's get this party started!", { noWait: true });
          if (!REDUCED() && !ended) THP.ui.confetti(110);
          S("win");
          await wait(2200);
        }
        end();
      });
    });
  }

  return { play, seen };
})();
