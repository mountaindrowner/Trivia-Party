/* Story Scenes: short animated Bible cartoons, unlocked as rewards for winning games.
   Everything is drawn in inline SVG and moved with the Web Animations API, so there are no image or video files.
   A scene is a list of beats. Tapping the picture rushes the current beat to its end; Skip jumps to the end card. */
window.THP = window.THP || {};

THP.Scenes = (function () {
  const { el, $ } = THP.ui;
  const S = (n) => THP.Sound.play(n);
  const INK = "#1a0b3d";
  const REDUCED = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  /* ---------- Art ---------- */
  const svg = (viewBox, body, cls) => `<svg viewBox="${viewBox}" class="${cls || ""}" aria-hidden="true"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
  const SKIN_D = "#b07040", SKIN_G = "#d9a066", BRONZE = "#c98b2a";

  const DAVID = svg("0 0 120 200", `
    <rect x="44" y="146" width="12" height="44" rx="5" fill="${SKIN_D}"/>
    <rect x="64" y="146" width="12" height="44" rx="5" fill="${SKIN_D}"/>
    <path d="M40 188h20v7H38z" fill="#6b3b1a"/><path d="M62 188h20v7H60z" fill="#6b3b1a"/>
    <path d="M42 100 Q30 122 36 142" fill="none" stroke-width="11"/><path d="M42 100 Q30 122 36 142" fill="none" stroke="${SKIN_D}" stroke-width="6"/>
    <path d="M40 88 Q60 80 82 88 L90 154 Q60 162 30 154 Z" fill="#2ec4a6"/>
    <path d="M33 138 Q60 146 87 138" fill="none" stroke="#ffc53d" stroke-width="5"/>
    <path d="M36 116 Q60 122 85 116" fill="none" stroke="#7a4a20" stroke-width="7"/>
    <path d="M78 118 q9 2 9 13 q-8 6 -15 0 z" fill="#8a5a2b"/>
    <rect x="52" y="74" width="16" height="14" fill="${SKIN_D}"/>
    <circle cx="60" cy="54" r="27" fill="${SKIN_D}"/>
    <g fill="#2a160b"><circle cx="38" cy="44" r="10"/><circle cx="47" cy="32" r="11"/><circle cx="61" cy="28" r="12"/><circle cx="75" cy="33" r="11"/><circle cx="84" cy="45" r="9"/></g>
    <path d="M34 47 Q60 37 86 47" fill="none" stroke="#ff3d7f" stroke-width="6"/>
    <path d="M86 47 l16 -6 M86 49 l14 6" fill="none" stroke="#ff3d7f" stroke-width="5"/>
    <g class="eyes"><ellipse cx="51" cy="57" rx="5" ry="6" fill="#fff"/><ellipse cx="70" cy="57" rx="5" ry="6" fill="#fff"/>
      <circle cx="53" cy="58" r="2.6" fill="${INK}" stroke="none"/><circle cx="72" cy="58" r="2.6" fill="${INK}" stroke="none"/></g>
    <path d="M45 48 l11 2 M65 50 l11 -2" fill="none"/>
    <path d="M52 67 Q61 75 70 66" fill="none"/>
    <g class="shades" style="opacity:0"><path d="M41 51 h19 v8 q-10 7 -19 0 z M63 51 h19 v8 q-10 7 -19 0 z" fill="#111"/><path d="M60 53 h3 M41 52 l-6 -3 M82 52 l6 -3" fill="none"/></g>
    <g class="armor" style="opacity:0">
      <path d="M28 84 Q60 72 94 84 L98 152 Q60 162 24 152 Z" fill="${BRONZE}"/>
      <path d="M34 104 Q60 112 88 104 M32 124 Q60 132 92 124" fill="none" stroke="#8a5a1a" stroke-width="3"/>
      <path d="M24 60 Q24 12 60 10 Q96 12 96 60 Q60 52 24 60 Z" fill="#d9a03a"/>
      <path d="M60 10 q-4 -14 12 -18" fill="none" stroke="#ff3d7f" stroke-width="6"/>
    </g>
    <g class="arm-r" style="transform-box:view-box;transform-origin:80px 98px">
      <path d="M80 98 Q96 112 100 132" fill="none" stroke-width="11"/><path d="M80 98 Q96 112 100 132" fill="none" stroke="${SKIN_D}" stroke-width="6"/>
      <circle cx="100" cy="134" r="6" fill="${SKIN_D}"/>
      <path d="M100 134 Q105 156 98 172 M100 134 Q93 156 98 172" fill="none" stroke="#7a4a20" stroke-width="2"/>
      <ellipse cx="98" cy="174" rx="6" ry="4" fill="#7a4a20"/>
    </g>`, "david");

  let scales = "";
  for (let y = 140; y <= 214; y += 14) for (let x = 58 + ((y / 14) % 2) * 7; x <= 138; x += 14) scales += `M${x} ${y} q7 8 14 0 `;
  const GOLIATH = svg("0 -12 200 372", `
    <rect x="66" y="250" width="26" height="96" rx="8" fill="${SKIN_G}" stroke-width="4"/>
    <rect x="108" y="250" width="26" height="96" rx="8" fill="${SKIN_G}" stroke-width="4"/>
    <rect x="63" y="285" width="32" height="58" rx="6" fill="${BRONZE}" stroke-width="4"/>
    <rect x="105" y="285" width="32" height="58" rx="6" fill="${BRONZE}" stroke-width="4"/>
    <path d="M50 342 h46 v12 h-50z" fill="#6b3b1a" stroke-width="4"/><path d="M94 342 h46 v12 h-50z" fill="#6b3b1a" stroke-width="4"/>
    <path d="M54 232 h92 l6 44 h-104 z" fill="#8a2a1a" stroke-width="4"/>
    <path d="M64 238 v34 M80 238 v34 M96 238 v34 M112 238 v34 M128 238 v34 M142 238 v34" stroke="${BRONZE}" stroke-width="5"/>
    <path d="M146 140 Q172 190 160 234" fill="none" stroke-width="27"/><path d="M146 140 Q172 190 160 234" fill="none" stroke="${SKIN_G}" stroke-width="19"/>
    <circle cx="160" cy="240" r="13" fill="${SKIN_G}" stroke-width="4"/>
    <path d="M50 128 Q100 108 150 128 L154 240 Q100 252 46 240 Z" fill="${BRONZE}" stroke-width="4"/>
    <path d="${scales}" fill="none" stroke="#8a5a1a" stroke-width="2.5"/>
    <path d="M48 228 Q100 240 152 228" fill="none" stroke="#6b3b1a" stroke-width="10"/>
    <rect x="84" y="108" width="34" height="24" fill="${SKIN_G}" stroke-width="4"/>
    <g class="head" style="transform-box:view-box;transform-origin:100px 110px">
      <circle cx="100" cy="86" r="40" fill="${SKIN_G}" stroke-width="4"/>
      <path d="M62 92 Q64 140 100 146 Q138 140 138 92 Q120 110 100 108 Q80 110 62 92 Z" fill="#4a2a12" stroke-width="4"/>
      <path class="mouth" d="M80 110 Q97 122 114 107 Q97 113 80 110 Z" fill="#fff"/>
      <path d="M84 86 q-9 8 2 13" fill="none"/>
      <g class="eyes"><ellipse cx="82" cy="78" rx="6" ry="5" fill="#fff"/><ellipse cx="106" cy="78" rx="6" ry="5" fill="#fff"/>
        <circle cx="79" cy="79" r="3" fill="${INK}" stroke="none"/><circle cx="103" cy="79" r="3" fill="${INK}" stroke="none"/></g>
      <g class="dizzy" style="opacity:0"><circle cx="82" cy="78" r="7" fill="#fff"/><circle cx="106" cy="78" r="7" fill="#fff"/>
        <path d="M82 78 m-5 0 a5 5 0 1 0 5 -5 a3 3 0 1 0 -3 3 M106 78 m-5 0 a5 5 0 1 0 5 -5 a3 3 0 1 0 -3 3" fill="none" stroke-width="2"/></g>
      <path d="M71 66 l17 6 M96 72 l17 -6" fill="none" stroke-width="5"/>
      <path d="M58 66 Q56 30 100 26 Q144 30 142 66 Q122 56 100 56 Q78 56 58 66 Z" fill="${BRONZE}" stroke-width="4"/>
      <path d="M60 60 Q100 44 140 60" fill="none" stroke="#8a5a1a" stroke-width="4"/>
      <path d="M100 27 Q88 2 116 -4 Q106 10 126 6 Q112 24 100 27 Z" fill="#ff3d3d" stroke-width="4"/>
      <g class="stars" style="opacity:0;transform-box:view-box;transform-origin:100px 40px">
        <path d="M52 30 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z M140 24 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z M98 -2 l3 6 7 1 -5 4 1 7 -6 -4 -6 4 1 -7 -5 -4 7 -1z" fill="#ffe14d"/>
      </g>
    </g>
    <path d="M40 24 L40 354" stroke-width="14"/><path d="M40 24 L40 354" stroke="#7a4a20" stroke-width="8"/>
    <path d="M40 -10 L28 26 h24 Z" fill="#aab3c5" stroke-width="4"/>
    <path d="M56 140 Q34 170 40 196" fill="none" stroke-width="27"/><path d="M56 140 Q34 170 40 196" fill="none" stroke="${SKIN_G}" stroke-width="19"/>
    <circle cx="40" cy="200" r="14" fill="${SKIN_G}" stroke-width="4"/>`, "goliath");

  const soldier = (side) => {
    const isr = side === "isr";
    const body = `
      <line x1="30" y1="6" x2="30" y2="66" stroke="#6b3b1a" stroke-width="3"/><path d="M30 0 l-4 8 h8z" fill="#d6dbe6" stroke-width="2"/>
      <rect x="12" y="34" width="16" height="30" rx="4" fill="${isr ? "#e8d7a8" : "#f3c6a0"}"/>
      <circle cx="20" cy="24" r="10" fill="#c68a52"/>
      <path d="M9 22 Q10 10 20 10 Q30 10 31 22 Z" fill="${isr ? "#8a5a2b" : BRONZE}"/>
      ${isr ? "" : `<path d="M10 13 l2 -8 l3 7 l3 -9 l3 9 l3 -8 l2 8" fill="none" stroke="#ff3d3d" stroke-width="2.5"/>`}
      <circle cx="24" cy="25" r="1.8" fill="${INK}" stroke="none"/>
      <ellipse cx="27" cy="46" rx="10" ry="13" fill="${isr ? "#4da3ff" : "#ff7a3d"}"/><circle cx="27" cy="46" r="3" fill="#ffc53d"/>`;
    return `<svg viewBox="0 0 40 70" aria-hidden="true"><g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"${isr ? "" : ` transform="translate(40 0) scale(-1 1)"`}>${body}</g></svg>`;
  };

  const BASKET = svg("0 0 44 32", `<ellipse cx="14" cy="9" rx="10" ry="7" fill="#e9a650"/><path d="M24 12 l14 -9 v12 z" fill="#ffd84d"/>
    <path d="M3 12 h38 l-4 18 h-30 z" fill="#a8743a"/><path d="M6 18 h32 M8 24 h28" fill="none" stroke="#6b4320" stroke-width="2"/>`);

  const VALLEY = `<svg class="sp-bg" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="spSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#47a8ff"/><stop offset="0.75" stop-color="#ffd9a0"/></linearGradient></defs>
    <rect width="1600" height="500" fill="url(#spSky)"/>
    <circle cx="1210" cy="100" r="44" fill="#fff3b0"/>
    <g fill="#fff" opacity="0.9"><ellipse cx="300" cy="90" rx="70" ry="20"/><ellipse cx="350" cy="76" rx="44" ry="20"/><ellipse cx="860" cy="60" rx="80" ry="18"/><ellipse cx="1420" cy="120" rx="60" ry="16"/></g>
    <path d="M0 300 Q200 220 400 280 T800 262 T1200 280 T1600 250 V500 H0Z" fill="#a395de" opacity="0.75"/>
    <g stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <path d="M0 232 Q220 192 420 262 Q520 302 610 390 L610 500 0 500Z" fill="#6cbf4a"/>
      <path d="M1600 232 Q1380 192 1180 262 Q1080 302 990 390 L990 500 1600 500Z" fill="#c9b56a"/>
      <path d="M0 404 Q800 368 1600 404 V500 H0Z" fill="#94cc5c"/>
      <path d="M540 452 Q700 428 800 446 T1060 444 L1060 466 Q920 480 800 468 T540 474Z" fill="#4da3ff" stroke-width="3"/>
      <path d="M40 226 l34 -46 34 46z M120 214 l28 -38 28 38z" fill="#f1e3c0"/>
      <path d="M1450 214 l30 -42 30 42z M1520 228 l34 -46 34 46z" fill="#ff9a6a"/>
      <path d="M200 206 v-50 l30 10 -30 10" fill="#4da3ff" stroke-width="3"/>
      <path d="M1400 206 v-50 l-30 10 30 10" fill="#ff5a3d" stroke-width="3"/>
    </g>
    <path d="M600 456 q40 -8 80 0 M860 450 q50 -8 100 0" fill="none" stroke="#fff" stroke-width="3" opacity="0.7"/>
  </svg>`;

  /* ---------- Reading pace ----------
     Young readers need time. Every line of narration and dialogue stays up for a reading time based on its length,
     and the next line waits for it, so the cartoon plays on its own without any tapping. */
  const TYPE_MS = 30;
  const readTime = (text) => 1200 + 65 * text.length;

  /* ---------- Director: the little animation engine every scene uses ---------- */
  function director(frame, world, overlay, cap) {
    let rush = false, abort = false;
    const anims = new Set(), loops = new Set(), waiters = new Set();
    // The line on screen now: when it finished typing and how long it needs to be read.
    let lineAt = 0, lineNeed = 0, typing = false, typeSkip = false;
    const D = {
      world, frame,
      get aborted() { return abort; },
      get rushing() { return rush; },
      rushNow() { rush = true; anims.forEach((a) => { try { a.finish(); } catch (e) {} }); [...waiters].forEach((f) => f()); },
      abort() { abort = true; D.rushNow(); },
      /** A tap on the picture: show the rest of the line being typed. The cartoon then carries on by itself. */
      nudge() { if (typing) typeSkip = true; },
      /** Hold until the current line has been read. */
      async settle() {
        if (rush) return;
        const left = lineAt + lineNeed - Date.now();
        if (left > 0) await D.wait(left);
      },
      /** Start a new beat: clear speech bubbles and loops left over from the last one. */
      next() {
        rush = abort;
        loops.forEach((a) => a.cancel()); loops.clear();
        overlay.querySelectorAll(".sp-bubble, .sp-burst").forEach((b) => b.remove());
      },
      wait(ms) {
        if (rush) return Promise.resolve();
        return new Promise((r) => {
          const done = () => { clearTimeout(t); waiters.delete(done); r(); };
          const t = setTimeout(done, ms);
          waiters.add(done);
        });
      },
      /** A one-off animation that returns to rest (shakes, hops). */
      anim(node, kf, opts) {
        const a = node.animate(kf, Object.assign({ duration: 400, easing: "ease-in-out" }, opts));
        anims.add(a);
        const end = () => anims.delete(a);
        a.finished.then(end, end);
        if (rush) a.finish();
        return a.finished.catch(() => {});
      },
      /** Animate a style property from → to, and leave it at "to". */
      to(node, prop, from, to, opts) {
        node.style[prop] = to;
        return D.anim(node, [{ [prop]: from }, { [prop]: to }], opts);
      },
      /** A repeating animation for this beat only (shivering, cheering). */
      loop(node, kf, opts) {
        if (REDUCED()) return;
        const a = node.animate(kf, Object.assign({ iterations: Infinity }, opts));
        loops.add(a);
      },
      sfx(name) { if (!rush) S(name); },
      shake(power) {
        if (rush || REDUCED()) return;
        const p = power || 1;
        D.anim(frame, [0, 1, 2, 3, 4, 5].map((i) => ({ transform: i === 5 ? "none" : `translate(${(i % 2 ? -1 : 1) * 6 * p}px, ${(i % 3 - 1) * 4 * p}px)` })), { duration: 260, easing: "linear" });
      },
      /** Put a character in the world. x is % of world width (center), y is % from the ground up, h is % of the frame's height. */
      actor(html, o) {
        const a = el("div", { class: "sp-actor " + (o.cls || "") });
        a.innerHTML = html;
        a.style.left = o.x + "%"; a.style.bottom = o.y + "%"; a.style.height = o.h + "cqh";
        if (o.hidden) a.style.opacity = "0";
        a._x = o.x; a._y = o.y;
        world.append(a);
        return a;
      },
      /** Walk/slide an actor to a new spot, with an optional bob or stomp per step. */
      async move(a, x, y, ms, opts) {
        const fx = a._x, fy = a._y;
        a._x = x; a._y = y;
        const o = Object.assign({ duration: ms, easing: "linear" }, opts);
        const steps = o.steps || 0;
        const run = Promise.all([D.to(a, "left", fx + "%", x + "%", o), D.to(a, "bottom", fy + "%", y + "%", o)]);
        if (steps) {
          const bob = [];
          for (let i = 0; i <= steps * 2; i++) bob.push({ transform: `translateY(${i % 2 ? -(o.bob || 4) : 0}%) rotate(${i % 2 ? (o.tilt || 2) : 0}deg)` });
          D.anim(a, bob, { duration: ms, easing: "linear" });
          if (o.onStep) for (let i = 0; i < steps; i++) setTimeout(() => !rush && o.onStep(i), (ms / steps) * (i + 0.5));
        }
        return run;
      },
      /** Camera: center world point (cx across, cy down, as 0–1 fractions) at zoom s. The frame shows half the world at s = 1. */
      cam(cx, cy, s, ms) {
        let tx = 0.25 - cx * s, ty = 0.5 - cy * s;
        tx = Math.min(0, Math.max(0.5 - s, tx));
        ty = s >= 1 ? Math.min(0, Math.max(1 - s, ty)) : 1 - s;
        const t = `translate(${(tx * 100).toFixed(2)}%, ${(ty * 100).toFixed(2)}%) scale(${s})`;
        const from = world.style.transform || "translate(0%, 0%) scale(1)";
        return D.to(world, "transform", from, t, { duration: REDUCED() ? 1 : ms || 1, easing: "cubic-bezier(.45,0,.25,1)" });
      },
      /** Where a point of an actor's drawing (in its SVG units) sits: in world % (for moving things) and frame % (for bubbles). */
      point(a, vx, vy) {
        const s = a.querySelector("svg"), vb = s.viewBox.baseVal, r = s.getBoundingClientRect();
        const px = r.left + ((vx - vb.x) / vb.width) * r.width, py = r.top + ((vy - vb.y) / vb.height) * r.height;
        const w = world.getBoundingClientRect(), f = frame.getBoundingClientRect();
        return { wx: ((px - w.left) / w.width) * 100, wy: ((w.bottom - py) / w.height) * 100, fx: ((px - f.left) / f.width) * 100, fy: ((py - f.top) / f.height) * 100 };
      },
      /** Narration under the picture, typed out, then held long enough to read. */
      async narrate(text, hold) {
        await D.settle();
        cap.textContent = "";
        typing = true; typeSkip = false;
        for (let i = 1; i <= text.length; i++) {
          if (rush || typeSkip) { cap.textContent = text; break; }
          cap.textContent = text.slice(0, i);
          await new Promise((r) => setTimeout(r, TYPE_MS));
        }
        typing = false;
        lineAt = Date.now(); lineNeed = readTime(text);
        // hold 0 (or a short hold) lets the action carry on while the line stays up; the next line still waits for it.
        if (hold === 0) return;
        await D.wait(hold == null ? lineNeed : hold);
      },
      /** A speech bubble over an actor's head point (vx, vy in its SVG units). */
      async bubble(a, vx, vy, who, text, o) {
        if (abort) return;
        o = o || {};
        await D.settle();
        const p = D.point(a, vx, vy);
        const hold = Math.max(o.hold || 0, 600 + readTime(text));
        const linger = () => D.wait(hold);
        // Small screens: the line goes in the caption bar, with a "talking" marker over the speaker.
        if (frame.clientHeight < 330) {
          const prev = cap.textContent;
          cap.replaceChildren(el("b", { class: "sp-who" }, who + ": "), text);
          const m = el("div", { class: "sp-bubble mini " + (o.cls || "") }, "💬");
          m.style.left = Math.min(92, Math.max(8, p.fx)) + "%"; m.style.top = Math.max(12, p.fy) + "%";
          overlay.append(m);
          D.sfx("flip");
          await linger();
          m.remove();
          cap.textContent = prev;
          return;
        }
        const b = el("div", { class: "sp-bubble " + (o.cls || "") }, el("b", { class: "sp-who" }, who), text);
        if (p.fy < 30) {
          // Too close to the top for a bubble above: put it beside the head, toward the middle of the picture.
          const leftSide = p.fx > 50;
          b.classList.add("side", leftSide ? "to-left" : "to-right");
          b.style.left = (leftSide ? p.fx - 3 : p.fx + 3) + "%";
          b.style.top = Math.max(3, p.fy) + "%";
        } else {
          const left = Math.min(78, Math.max(22, p.fx));
          b.style.left = left + "%";
          b.style.top = p.fy - 2 + "%";
          b.style.setProperty("--tail", Math.min(90, Math.max(10, 50 + (p.fx - left) * 2.2)) + "%");
        }
        overlay.append(b);
        D.anim(b, [{ scale: 0.3, opacity: 0 }, { scale: 1.06, opacity: 1, offset: 0.7 }, { scale: 1, opacity: 1 }], { duration: 260, easing: "ease-out" });
        D.sfx("flip");
        await linger();
        b.remove();
      },
      /** A comic-book burst ("BONK!") at a frame position (% of the frame). */
      burst(text, fx, fy, cls) {
        const b = el("div", { class: "sp-burst " + (cls || "") }, el("span", {}, text));
        b.style.left = fx + "%"; b.style.top = fy + "%";
        overlay.append(b);
        return D.anim(b, [{ scale: 0, rotate: "-20deg" }, { scale: 1.25, rotate: "8deg", offset: 0.6 }, { scale: 1, rotate: "-4deg" }], { duration: 380, easing: "ease-out" });
      },
      /** A big title card over the picture. */
      async card(top, big, sub, ms) {
        const c = el("div", { class: "sp-card" }, el("small", {}, top), el("strong", {}, big), el("span", {}, sub));
        overlay.append(c);
        await D.anim(c, [{ scale: 2.4, opacity: 0 }, { scale: 0.94, opacity: 1, offset: 0.7 }, { scale: 1, opacity: 1 }], { duration: 520, easing: "ease-out" });
        D.sfx("impact"); D.shake(1.2);
        await D.wait(ms);
        await D.anim(c, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
        c.remove();
      },
    };
    return D;
  }

  /* ---------- Scene 1: David and Goliath (1 Samuel 17) ---------- */
  async function giant(D) {
    const W = D.world;
    W.insertAdjacentHTML("afterbegin", VALLEY);
    const isr = [3, 6.5, 10, 13.5, 17, 20.5].map((x, i) => D.actor(soldier("isr"), { x, y: 51 + (i % 2) * 1.5, h: 17, cls: "soldier" }));
    const phil = [79.5, 83, 86.5, 90, 93.5, 97].map((x, i) => D.actor(soldier("phil"), { x, y: 51 + (i % 2) * 1.5, h: 17, cls: "soldier" }));
    const stones = [44, 47, 50, 53, 56].map((x, i) => {
      const s = el("div", { class: "sp-stone" }); s.style.left = x + "%"; s.style.bottom = 7 + (i % 2) + "%"; W.append(s); return s;
    });
    const goliath = D.actor(GOLIATH, { x: 90, y: 52, h: 72, cls: "goliath", hidden: true });
    const basket = D.actor(BASKET, { x: 15, y: 54, h: 7, hidden: true });
    const david = D.actor(DAVID, { x: 13, y: 54, h: 28, hidden: true });
    const dv = (sel) => david.querySelector(sel), gv = (sel) => goliath.querySelector(sel);
    const beats = [];
    const beat = (fn) => beats.push(fn);

    beat(async () => {
      await D.cam(0.5, 0.5, 0.5, 1);
      THP.Music.play("gate");
      await D.card("Story Scene 1", "GIANT PROBLEM", "David and Goliath · 1 Samuel 17", 1600);
    });
    beat(async () => {
      [...isr, ...phil].forEach((s, i) => D.loop(s, [{ transform: "translateY(0)" }, { transform: "translateY(-3%)" }, { transform: "translateY(0)" }], { duration: 900 + (i % 3) * 120 }));
      await D.narrate("The Valley of Elah. Israel's army is on one hill. The Philistines are on the other. Nobody wants to go first.");
    });
    beat(async () => {
      await D.cam(0.74, 0.5, 1, 1300);
      D.to(goliath, "opacity", "0", "1", { duration: 300 });
      await Promise.all([
        D.narrate("Then HE walks out. Goliath. Over nine feet tall, in bronze armor that weighs about 125 pounds."),
        D.move(goliath, 64, 21, 3400, { steps: 4, bob: 2, tilt: 1.5, easing: "ease-out", onStep: () => { S("impact"); D.shake(1.4); } }),
      ]);
      await D.bubble(goliath, 142, 70, "Goliath", "This day I defy the armies of Israel! Give me a man and let us fight each other!", { cls: "loud" });
    });
    beat(async () => {
      await D.cam(0.14, 0.5, 1, 1100);
      isr.forEach((s) => D.loop(s, [{ transform: "translateX(-1.5%)" }, { transform: "translateX(1.5%)" }], { duration: 90, direction: "alternate" }));
      await D.narrate("He did this every morning and every evening for 40 days. Israel's army? Shaking in their sandals.");
    });
    beat(async () => {
      D.to(david, "opacity", "0", "1", { duration: 250 });
      D.to(basket, "opacity", "0", "1", { duration: 250 });
      await Promise.all([
        D.narrate("Enter David. The youngest brother. He's just here to drop off bread and cheese for his big brothers."),
        D.move(david, 27, 44, 2600, { steps: 6, bob: 3, easing: "ease-out" }),
        D.move(basket, 30, 45.5, 2600, { steps: 6, bob: 3, easing: "ease-out" }),
      ]);
      D.anim(dv(".eyes"), [{ transform: "translateX(0)" }, { transform: "translateX(2px)" }], { duration: 300, fill: "forwards" });
      await D.bubble(david, 60, 22, "David", "Who is this Philistine, that he should defy the armies of the living God?");
    });
    beat(async () => {
      const armor = dv(".armor");
      await D.narrate("King Saul hands David his own armor. Huge upgrade… except it does NOT fit.", 300);
      armor.style.opacity = "1";
      await D.anim(armor, [{ transform: "translateY(-60%)" }, { transform: "translateY(4%)", offset: 0.7 }, { transform: "translateY(0)" }], { duration: 500, easing: "ease-in" });
      D.sfx("crumble"); D.shake(0.6);
      await D.anim(david, [0, 1, 2, 3, 4, 5, 6].map((i) => ({ transform: `rotate(${i === 6 ? 0 : (i % 2 ? -7 : 7)}deg)` })), { duration: 1200 });
      await D.bubble(david, 60, 4, "David", "I can't go in these, because I'm not used to them.");
      D.sfx("whoosh");
      await D.anim(armor, [{ transform: "translate(0, 0) rotate(0)", opacity: 1 }, { transform: "translate(120%, -160%) rotate(160deg)", opacity: 0 }], { duration: 600, fill: "forwards", easing: "ease-in" });
    });
    beat(async () => {
      await Promise.all([D.cam(0.48, 0.82, 1.3, 1200), D.move(david, 41, 12, 1800, { steps: 4, bob: 3 })]);
      const say = D.narrate("He takes his staff, picks five smooth stones from the stream… and grabs his sling.");
      for (const s of stones) {
        D.sfx("tap");
        await D.anim(s, [{ scale: 1, filter: "brightness(1)" }, { scale: 1.8, filter: "brightness(2.2)" }, { scale: 1, filter: "brightness(1)" }], { duration: 420 });
        D.to(s, "opacity", "1", "0", { duration: 200 });
      }
      await say;
    });
    beat(async () => {
      await Promise.all([D.cam(0.53, 0.5, 1, 1200), D.narrate("Goliath looks down at David… and laughs.", 0)]);
      D.anim(gv(".head"), [0, 1, 2, 3, 4].map((i) => ({ transform: `rotate(${i === 4 ? 0 : (i % 2 ? -5 : 5)}deg)` })), { duration: 900 });
      await D.bubble(goliath, 142, 70, "Goliath", "Am I a dog, that you come at me with sticks?", { cls: "loud" });
      D.narrate("David doesn't even flinch.", 0);
      await D.bubble(david, 60, 22, "David", "You come against me with sword and spear, but I come against you in the name of the LORD Almighty!");
    });
    beat(async () => {
      D.narrate("David doesn't run away. He runs AT the giant.", 0);
      D.frame.classList.add("speed");
      await D.move(david, 46, 16, 700, { steps: 3, bob: 3, easing: "ease-in" });
      D.sfx("whoosh");
      await D.anim(dv(".arm-r"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-1080deg)" }], { duration: 1100, easing: "ease-in" });
      D.frame.classList.remove("speed");
      D.frame.classList.add("slowmo");
      const from = D.point(david, 98, 174), hit = D.point(goliath, 92, 62);
      const stone = el("div", { class: "sp-stone flying" });
      W.append(stone);
      const top = Math.max(from.wy, hit.wy) + 6;
      D.sfx("whoosh");
      await D.anim(stone, [
        { left: from.wx + "%", bottom: from.wy + "%" },
        { left: (from.wx + hit.wx) / 2 + "%", bottom: top + "%" },
        { left: hit.wx + "%", bottom: hit.wy + "%" },
      ], { duration: 1100, easing: "linear", fill: "forwards" });
      stone.remove();
      D.frame.classList.remove("slowmo");
      const p = D.point(goliath, 92, 62);
      D.sfx("impact"); D.shake(2);
      await D.burst("BONK!", p.fx, p.fy, "bonk");
      await D.wait(700);
    });
    beat(async () => {
      gv(".eyes").style.opacity = "0";
      D.to(gv(".dizzy"), "opacity", "0", "1", { duration: 120 });
      D.to(gv(".stars"), "opacity", "0", "1", { duration: 200 });
      D.loop(gv(".stars"), [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 900, easing: "linear" });
      const wob = D.anim(goliath, [0, 1, 2, 3, 4].map((i) => ({ transform: `rotate(${i === 4 ? 0 : (i % 2 ? -5 : 5)}deg)` })), { duration: 1300 });
      D.move(david, 36, 13, 600, { steps: 2, bob: 4 }); // hop back out of the way
      await Promise.all([D.narrate("The stone sinks into his forehead. The giant wobbles…", 200), wob]);
      D.sfx("whoosh");
      await D.to(goliath, "transform", "rotate(0deg)", "rotate(-86deg)", { duration: 950, easing: "cubic-bezier(.55,0,1,.45)" });
      D.sfx("impact"); D.sfx("crumble"); D.shake(3);
      for (let i = 0; i < 7; i++) {
        const d = el("div", { class: "sp-dust" });
        d.style.left = 40 + i * 4 + "%"; d.style.bottom = 18 + (i % 2) * 2 + "%";
        W.append(d);
        D.anim(d, [{ scale: 0.2, opacity: 0.9 }, { scale: 2.4, opacity: 0 }], { duration: 1100, delay: i * 40, easing: "ease-out", fill: "forwards" });
      }
      const g = D.point(goliath, 100, 200);
      D.burst("THOOOM!", Math.min(80, g.fx), Math.max(20, g.fy - 10), "thoom");
      await D.narrate("…and falls flat on his face. TIMBERRR.");
    });
    beat(async () => {
      await D.cam(0.5, 0.5, 0.5, 1400);
      THP.Music.play("strut");
      phil.forEach((s) => s.classList.add("flee"));
      phil.forEach((s, i) => D.move(s, 108 + i * 2, s._y, 2200 + i * 150, { steps: 7, bob: 5, easing: "ease-in" }));
      isr.forEach((s, i) => D.loop(s, [{ transform: "translateY(0)" }, { transform: "translateY(-22%)" }, { transform: "translateY(0)" }], { duration: 420, delay: i * 60, easing: "ease-out" }));
      if (!D.rushing) THP.ui.confetti(140);
      D.sfx("win");
      await D.narrate("The Philistines take off running. Israel goes wild. And the snack-delivery kid? Absolute legend.");
    });
    beat(async () => {
      const face = D.point(david, 60, 60);
      await D.cam(face.wx / 100, 1 - face.wy / 100 + 0.12, 1.7, 1200);
      const sh = dv(".shades");
      sh.style.opacity = "1";
      await D.anim(sh, [{ transform: "translateY(-60px)" }, { transform: "translateY(0)" }], { duration: 700, easing: "cubic-bezier(.3,1.4,.6,1)" });
      D.sfx("correct");
      await D.bubble(david, 60, 22, "David", "The battle is the LORD's.", { hold: 2200 });
    });

    for (const b of beats) {
      D.next();
      await b();
    }
    D.next();
  }

  /* ---------- Milestones ----------
     Scene 1 hooks a new player on their first win. After that a new scene comes every four levels, spaced to land
     while the content still feels fresh (about 1,000 XP per solo game):
     Level 6 ≈ game 4 · Level 10 ≈ game 8 · Level 14 ≈ game 14 · Level 18 ≈ game 22 · Level 22 ≈ game 32.
     Every scene gets its own art style. Milestones without a finished scene show as "in production". */
  const LIST = [
    { id: "giant", ep: 1, need: { wins: 1 }, style: "Saturday-morning cartoon", theme: "cartoon",
      title: "Giant Problem", sub: "David and Goliath", ref: "1 Samuel 17", icon: "🪨",
      lesson: "David wasn't brave because he was big. He knew God was bigger.", verse: ["The battle is the LORD's.", "1 Samuel 17:47"], play: giant },
    // Scenes 2–6 are filled in by their own files in js/stories/ (see define below).
    { id: "s2", ep: 2, need: { lvl: 6 }, style: "Paper cut-out", theme: "paper" },
    { id: "s3", ep: 3, need: { lvl: 10 }, style: "8-bit pixel art", theme: "pixel" },
    { id: "s4", ep: 4, need: { lvl: 14 }, style: "Clay stop-motion", theme: "clay" },
    { id: "s5", ep: 5, need: { lvl: 18 }, style: "Crayon drawing", theme: "crayon" },
    { id: "s6", ep: 6, need: { lvl: 22 }, style: "Stained glass", theme: "glass" },
  ];
  /** A story file adds its scene: title, sub, ref, icon, lesson, verse and play(D). */
  function define(id, props) { Object.assign(LIST.find((s) => s.id === id), props); }
  const ready = (s) => typeof s.play === "function";

  /* ---------- Unlocks ---------- */
  const wins = () => store.get("thp-wins", 0);
  const xp = () => store.get("thp-xp", 0);
  /** Total XP needed to reach a level (level n needs 500 + 100·(n−1) more than the one before; see js/game.js). */
  const xpFor = (lvl) => 500 * (lvl - 1) + 50 * (lvl - 1) * (lvl - 2);
  const level = () => (THP.game && THP.game.levelOf ? THP.game.levelOf(xp()).lvl : 1);
  const reached = (s) => (s.need.wins ? wins() >= s.need.wins : level() >= s.need.lvl);
  const isOpen = (s) => ready(s) && reached(s);
  const needText = (s) => (s.need.wins ? `Win ${s.need.wins} game${s.need.wins === 1 ? "" : "s"}` : `Reach Level ${s.need.lvl}`);

  /** Count a solo win. */
  function recordWin() { store.set("thp-wins", wins() + 1); }
  /** Scenes that became watchable since the last check (call after XP and wins are saved). */
  function newlyUnlocked() {
    const seen = new Set(store.get("thp-scenes-seen", []));
    const fresh = LIST.filter((s) => isOpen(s) && !seen.has(s.id));
    fresh.forEach((s) => seen.add(s.id));
    store.set("thp-scenes-seen", [...seen]);
    return fresh;
  }
  /** The next milestone still to reach, and how far away it is. */
  function nextMilestone() {
    const m = LIST.find((s) => !reached(s));
    if (!m) return null;
    if (m.need.wins) return { scene: m, text: `${m.need.wins - wins()} more win${m.need.wins - wins() === 1 ? "" : "s"}` };
    return { scene: m, text: `${(xpFor(m.need.lvl) - xp()).toLocaleString()} XP to Level ${m.need.lvl}` };
  }
  const unlockedCount = () => LIST.filter(isOpen).length;
  const readyCount = () => LIST.filter(ready).length;

  /* ---------- Player ---------- */
  function play(id) {
    const def = LIST.find((s) => s.id === id);
    return new Promise((resolve) => {
      const prevFocus = document.activeElement;
      const world = el("div", { class: "sp-world" });
      const overlay = el("div", { class: "sp-overlay" });
      const frame = el("div", { class: "sp-frame", role: "img", "aria-label": `${def.sub}, an animated scene` }, world, overlay);
      const cap = el("p", { class: "sp-caption", "aria-live": "polite" });
      const skip = el("button", { class: "btn btn-ghost sp-skip" }, "Skip ⏭");
      const hint = el("span", { class: "sp-hint" }, "Tap to show the whole line");
      const controls = el("div", { class: "sp-controls" }, hint, skip);
      const root = el("div", { class: "scene-player theme-" + (def.theme || "cartoon"), role: "dialog", "aria-label": def.title }, frame, cap, controls);
      document.body.append(root);
      document.body.classList.add("scene-open");
      const D = director(frame, world, overlay, cap);
      frame.addEventListener("click", () => D.nudge());
      cap.addEventListener("click", () => D.nudge());
      skip.addEventListener("click", () => { S("tap"); D.abort(); });
      const onKey = (e) => {
        if (e.key === "Escape") { D.abort(); e.preventDefault(); }
        else if ((e.key === " " || e.key === "Enter") && document.activeElement !== skip && !root.querySelector(".sp-end")) { D.nudge(); e.preventDefault(); }
      };
      document.addEventListener("keydown", onKey);
      skip.focus();

      const close = () => {
        document.removeEventListener("keydown", onKey);
        root.remove();
        document.body.classList.remove("scene-open");
        const cur = $("#stage") && $("#stage").firstElementChild;
        if (cur) THP.Music.forNode(cur);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve();
      };
      const endCard = () => {
        controls.hidden = true;
        cap.textContent = "The End. " + def.lesson;
        const again = el("button", { class: "btn btn-ghost", onclick: () => { S("tap"); close(); play(id).then(resolve); } }, "↻ Watch again");
        const done = el("button", { class: "btn btn-go", onclick: () => { S("tap"); close(); } }, "Done");
        overlay.append(el("div", { class: "sp-end" },
          el("small", {}, `Story Scene ${def.ep} · ${def.ref}`),
          el("strong", {}, def.title),
          el("p", { class: "sp-verse" }, `“${def.verse[0]}”`, el("cite", {}, def.verse[1])),
          el("div", { class: "btn-row" }, again, done)));
        done.focus();
      };
      def.play(D).catch((e) => console.error(e)).then(() => D.settle()).then(endCard);
    });
  }

  /* ---------- Gallery ---------- */
  function screen(back) {
    S("tap");
    $("#hud").hidden = true;
    THP.ui.setMood("happy");
    const card = (s) => {
      const open = isOpen(s), got = reached(s);
      const status = open ? `${s.sub}. Tap to watch.` : got ? "Milestone reached! This scene is still being animated." : `${needText(s)} to unlock.`;
      return el("button", {
        class: "scene-card" + (open ? "" : " locked") + (ready(s) ? "" : " soon"), "aria-disabled": open ? null : "true",
        onclick: async () => {
          if (open) { S("tap"); await play(s.id); return; }
          S("wrong");
          const nx = nextMilestone();
          THP.ui.say(got ? "You made it! The animators are still drawing this one." : `Locked! ${needText(s)}.${nx && nx.scene === s ? ` ${nx.text} to go.` : ""}`, { mood: "worried" });
        },
      },
        el("span", { class: "scene-thumb", "aria-hidden": "true" }, open ? s.icon : got ? "🎨" : "🔒"),
        el("span", { class: "scene-text" },
          el("small", {}, `Scene ${s.ep}${s.ref && open ? " · " + s.ref : ""} · ${s.style}`),
          el("strong", {}, open ? s.title : "??? Mystery scene"),
          el("span", {}, status)));
    };
    const nx = nextMilestone();
    const node = el("section", { class: "scenes-screen" },
      el("p", { class: "eyebrow" }, "Rewards"),
      el("h2", { class: "screen-title" }, "Story Scenes"),
      el("p", { class: "section-help" }, "Animated Bible stories, each in its own art style. Win games and rank up to unlock them."),
      nx ? el("p", { class: "scene-next" }, `🎬 Next: Scene ${nx.scene.ep} · ${nx.text}`) : null,
      el("div", { class: "scene-list" }, ...LIST.map(card)),
      el("div", { class: "btn-row" }, el("button", { class: "btn btn-ghost", onclick: back }, "Back")));
    THP.ui.show(node, { scene: "title" });
    THP.ui.say(unlockedCount() ? "Grab some popcorn. Well, manna." : "Win a game to unlock your first scene!");
  }

  return { LIST, define, kit: { svg, INK, store, REDUCED }, play, screen, recordWin, newlyUnlocked, nextMilestone, unlockedCount, readyCount, isOpen };
})();
