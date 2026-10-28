/* Shared helpers: DOM, timing, host (Barnabas the Donkey), timers, confetti, TV-remote navigation. */
window.THP = window.THP || {};

THP.ui = (function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "style" && typeof v === "object") {
        for (const prop in v) prop.startsWith("--") ? n.style.setProperty(prop, v[prop]) : (n.style[prop] = v[prop]);
      }
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return n;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const stage = () => $("#stage");

  /** Replace the stage with new content, play the enter animation, focus the first control. */
  function show(node, opts) {
    const s = stage();
    s.replaceChildren(node);
    s.scrollTop = 0; // every screen starts at the top
    s.dataset.scene = (opts && opts.scene) || "";
    node.classList.add("enter");
    requestAnimationFrame(() => focusFirst(node));
    return node;
  }

  function focusFirst(root) {
    const t = $("[data-autofocus]", root) || $("button:not([disabled])", root);
    if (t) t.focus({ preventScroll: true });
  }

  /* ---------- Host ---------- */
  let typing = null;

  function setMood(mood) {
    $("#host").dataset.mood = mood || "happy";
  }

  /** Barnabas speaks. Resolves when the line is fully typed and has been held on screen. */
  function say(text, opts) {
    opts = opts || {};
    const host = $("#host");
    const bubble = $("#bubble-text");
    const next = $("#bubble-next");
    next.hidden = true;
    if (opts.mood) setMood(opts.mood);
    text = text.replace("{name}", THP.state ? THP.state.name : "friend");
    if (typing) typing.cancel();

    return new Promise((resolve) => {
      let i = 0;
      let done = false;
      let iv = 0;
      host.classList.add("talking");
      bubble.textContent = "";
      const speed = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 22;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(iv);
        bubble.textContent = text;
        host.classList.remove("talking");
        typing = null;
        const hold = opts.hold != null ? opts.hold : Math.min(1800, 500 + text.length * 12);
        if (opts.wait) {
          next.hidden = false;
          const go = () => { next.removeEventListener("click", go); next.hidden = true; THP.Sound.play("tap"); resolve(); };
          next.addEventListener("click", go);
          next.focus({ preventScroll: true });
        } else setTimeout(resolve, hold);
      };
      typing = { cancel: finish };
      if (speed) {
        iv = setInterval(() => {
          i += 2;
          bubble.textContent = text.slice(0, i);
          if (i >= text.length) finish();
        }, speed);
      } else finish();
      $("#bubble").onclick = (e) => { if (e.target !== next) finish(); };
    });
  }

  /* ---------- Big buttons / waits ---------- */
  function waitButton(container, label, cls) {
    return new Promise((resolve) => {
      const b = el("button", { class: "btn " + (cls || "btn-go"), "data-primary": true, "data-autofocus": true }, label);
      b.addEventListener("click", () => { THP.Sound.play("tap"); b.disabled = true; resolve(); });
      container.append(b);
      requestAnimationFrame(() => b.focus({ preventScroll: true }));
    });
  }

  /* ---------- Timers ---------- */
  /** Countdown timer. Calls onTick(remainingSec, fraction) every frame-ish; resolves 'timeout'. */
  function timer(seconds, onTick) {
    let stopped = false;
    let endAt = 0; // when the timer stopped, so elapsed() freezes at the moment play ended
    let resolveFn;
    const start = performance.now();
    let lastWhole = Math.ceil(seconds);
    const p = new Promise((r) => (resolveFn = r));
    function frame(now) {
      if (stopped) return;
      const left = Math.max(0, seconds - (now - start) / 1000);
      onTick && onTick(left, left / seconds);
      const whole = Math.ceil(left);
      if (whole !== lastWhole) {
        lastWhole = whole;
        if (whole <= 3 && whole > 0) THP.Sound.play("tick");
      }
      if (left <= 0) { stopped = true; endAt = endAt || now; resolveFn("timeout"); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return {
      done: p,
      seconds,
      stop() { stopped = true; endAt = endAt || performance.now(); },
      elapsed: () => Math.min(seconds, ((endAt || performance.now()) - start) / 1000),
    };
  }

  /** Circular candle-flame timer widget. */
  function ringTimer(seconds) {
    const R = 26, C = 2 * Math.PI * R;
    const wrap = el("div", { class: "ring", role: "timer", "aria-label": "Time left" });
    wrap.innerHTML =
      `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" class="ring-bg"/>` +
      `<circle cx="32" cy="32" r="${R}" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>` +
      `<span class="ring-num">${seconds}</span>`;
    const fg = $(".ring-fg", wrap), num = $(".ring-num", wrap);
    const t = timer(seconds, (left, frac) => {
      fg.style.strokeDashoffset = String(C * (1 - frac));
      num.textContent = Math.ceil(left);
      wrap.classList.toggle("urgent", left <= 3.5);
    });
    t.node = wrap;
    return t;
  }

  /** Thin bar timer used inside minigames. */
  function barTimer(seconds) {
    const wrap = el("div", { class: "bar-timer" }, el("i"));
    const fill = wrap.firstChild;
    const t = timer(seconds, (left, frac) => {
      fill.style.transform = `scaleX(${frac})`;
      wrap.classList.toggle("urgent", left <= 3);
    });
    t.node = wrap;
    return t;
  }

  /* ---------- FX ---------- */
  function confetti(n) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = $("#fx");
    const colors = ["#ff3d7f", "#ffc53d", "#2ee6a6", "#4da3ff", "#b78cff", "#ffffff"];
    for (let i = 0; i < (n || 70); i++) {
      const p = el("i", { class: "confetti" });
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = pick(colors);
      p.style.setProperty("--dx", (Math.random() * 2 - 1) * 30 + "vw");
      p.style.setProperty("--rot", rand(200, 900) + "deg");
      p.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
      p.style.animationDelay = Math.random() * 0.3 + "s";
      layer.append(p);
      setTimeout(() => p.remove(), 3800);
    }
  }

  function popText(text, cls, anchor) {
    const layer = $("#fx");
    const p = el("div", { class: "pop " + (cls || "") }, text);
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      p.style.left = r.left + r.width / 2 + "px";
      p.style.top = r.top + "px";
    }
    layer.append(p);
    setTimeout(() => p.remove(), 1400);
  }

  function flash(cls) {
    const app = $("#app");
    app.classList.remove("flash-good", "flash-bad", "shake");
    void app.offsetWidth;
    app.classList.add(cls);
    setTimeout(() => app.classList.remove(cls), 700);
  }

  /** Big slam-in word across the screen ("NAILED IT", "TOO SLOW"). */
  function stamp(text, cls) {
    const layer = $("#fx");
    const n = el("div", { class: "stamp " + (cls || "") }, text);
    layer.append(n);
    THP.Sound.play("impact");
    setTimeout(() => n.remove(), 1100);
  }

  /** Cracked-glass overlay radiating from a random point near the center. */
  function crack() {
    const layer = $("#fx");
    const cx = 35 + Math.random() * 30, cy = 30 + Math.random() * 30;
    let d = "";
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + Math.random() * 0.4;
      let x = cx, y = cy;
      d += `M${x} ${y}`;
      for (let k = 0; k < 4; k++) {
        const len = 6 + Math.random() * 14;
        const aa = a + (Math.random() - 0.5) * 0.6;
        x += Math.cos(aa) * len; y += Math.sin(aa) * len;
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    for (let r = 1; r <= 2; r++) {
      const R = r * 7 + Math.random() * 3;
      d += ` M${cx + R} ${cy}`;
      for (let i = 1; i <= 9; i++) {
        const a = (i / 9) * Math.PI * 2, j = R * (0.8 + Math.random() * 0.4);
        d += ` L${(cx + Math.cos(a) * j).toFixed(1)} ${(cy + Math.sin(a) * j).toFixed(1)}`;
      }
    }
    const wrap = el("div", { class: "crack" });
    wrap.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${d}"/></svg>`;
    layer.append(wrap);
    THP.Sound.play("shatter");
    setTimeout(() => wrap.remove(), 1600);
  }

  /** Rising embers in the background (CSS-animated, no loop). */
  function embers(n) {
    const sky = $(".sky");
    if (!sky || $(".embers", sky) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = el("div", { class: "embers" });
    for (let i = 0; i < (n || 26); i++) {
      const e = el("i");
      e.style.left = Math.random() * 100 + "%";
      e.style.setProperty("--s", (0.2 + Math.random() * 0.35).toFixed(2) + "rem");
      e.style.setProperty("--dx", (Math.random() * 2 - 1) * 8 + "vw");
      e.style.animationDuration = 6 + Math.random() * 8 + "s";
      e.style.animationDelay = -Math.random() * 12 + "s";
      box.append(e);
    }
    sky.append(box);
  }

  /** Neon City backdrop: a generated skyline (one tower carries a neon cross), a grid floor and rain. Hidden unless the cyber skin is on. */
  function cityscape() {
    const sky = $(".sky");
    if (!sky || $(".city", sky)) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const windows = ["rgba(0, 240, 255, 0.4)", "rgba(255, 43, 214, 0.35)", "rgba(244, 255, 58, 0.3)", "rgba(157, 92, 255, 0.4)"];
    const signs = ["#ff2bd6", "#00f0ff", "#f4ff3a", "#9d5cff"];
    const skyline = el("div", { class: "skyline" });
    const count = 18;
    const crossAt = pick([15, 16]); // a tall tower at the far right, clear of the logo, the question and the host column
    for (let i = 0; i < count; i++) {
      const tall = i === crossAt;
      const b = el("div", { class: "bldg" + (!tall && Math.random() < 0.35 ? " far" : "") });
      b.style.width = rand(4, 8) + "%";
      b.style.height = (tall ? rand(78, 92) : rand(22, 70)) + "%";
      b.style.setProperty("--win", pick(windows));
      b.style.setProperty("--lit", (0.25 + Math.random() * 0.55).toFixed(2));
      if (tall) b.append(el("span", { class: "neon-cross" }));
      else if (Math.random() < 0.3) b.append(el("span", { class: "antenna" }));
      if (!tall && Math.random() < 0.35) {
        const sg = el("span", { class: "sign" });
        sg.style.top = rand(12, 45) + "%";
        sg.style.setProperty("--sc", pick(signs));
        b.append(sg);
      }
      skyline.append(b);
    }
    const rain = el("div", { class: "rain" });
    if (!calm) for (let i = 0; i < 46; i++) {
      const d = el("i");
      d.style.left = Math.random() * 110 + "%";
      d.style.setProperty("--h", rand(30, 80) + "px");
      d.style.animationDuration = 0.6 + Math.random() * 0.7 + "s";
      d.style.animationDelay = -Math.random() * 2 + "s";
      rain.append(d);
    }
    sky.prepend(el("div", { class: "city" }, skyline, el("div", { class: "grid-floor" }), rain));
  }

  /** Victory Lobby backdrop: drifting clouds and twinkling sparkles under the storm ring. Hidden unless the loot skin is on. */
  function lobby() {
    const sky = $(".sky");
    if (!sky || $(".lobby", sky)) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const box = el("div", { class: "lobby" });
    for (let i = 0; i < 7; i++) {
      const c = el("i", { class: "cloud" });
      c.style.top = rand(4, 62) + "%";
      c.style.setProperty("--w", rand(9, 22) + "rem");
      c.style.animationDuration = rand(50, 110) + "s";
      c.style.animationDelay = -rand(0, 100) + "s";
      box.append(c);
    }
    if (!calm) for (let i = 0; i < 22; i++) {
      const sp = el("b", { class: "sparkle" }, "✦");
      sp.style.left = Math.random() * 100 + "%";
      sp.style.top = Math.random() * 100 + "%";
      sp.style.fontSize = (0.5 + Math.random() * 0.9).toFixed(2) + "rem";
      sp.style.animationDelay = -Math.random() * 3 + "s";
      box.append(sp);
    }
    box.append(el("div", { class: "storm" }));
    sky.prepend(box);
  }

  /* ---------- Skins ---------- */
  // Each skin is a stylesheet layered over Holy Fire (css/edge.css); "fire" turns them all off.
  const SKINS = {
    loot: { name: "Victory Lobby", host: "Barnabas", color: "#2b5bea", sheet: "skin-loot" },
    cyber: { name: "Neon City", host: "BARNABAS.EXE", color: "#05060f", sheet: "skin-cyber" },
    fire: { name: "Holy Fire", host: "Barnabas", color: "#08080b", sheet: null },
  };
  const SKIN_ORDER = ["loot", "cyber", "fire"];
  const SKIN_KEY = "thp-skin-v2"; // new key so everyone lands on Victory Lobby once
  let skin = "loot";
  try { skin = localStorage.getItem(SKIN_KEY) || "loot"; } catch (e) {}
  if (!SKINS[skin]) skin = "loot";

  function applySkin(name) {
    skin = SKINS[name] ? name : "loot";
    try { localStorage.setItem(SKIN_KEY, skin); } catch (e) {}
    document.documentElement.dataset.skin = skin;
    for (const k in SKINS) {
      const sheet = SKINS[k].sheet && document.getElementById(SKINS[k].sheet);
      if (sheet) sheet.disabled = k !== skin;
    }
    const hostName = $(".host-name");
    if (hostName) hostName.textContent = SKINS[skin].host;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", SKINS[skin].color);
  }
  const nextSkin = () => SKIN_ORDER[(SKIN_ORDER.indexOf(skin) + 1) % SKIN_ORDER.length];

  /* ---------- Keyboard / TV-remote spatial navigation ---------- */
  function navTargets() {
    return $$("#stage button:not([disabled]), #stage input, #bubble-next:not([hidden]), #hud button").filter(
      (b) => b.offsetParent !== null
    );
  }

  document.addEventListener("keydown", (e) => {
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.target && e.target.tagName === "INPUT" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
    if (dirs[e.key]) {
      const list = navTargets();
      if (!list.length) return;
      const cur = document.activeElement;
      if (!list.includes(cur)) { list[0].focus(); e.preventDefault(); return; }
      const [dx, dy] = dirs[e.key];
      const c = cur.getBoundingClientRect();
      const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      let best = null, bestScore = Infinity;
      for (const b of list) {
        if (b === cur) continue;
        const r = b.getBoundingClientRect();
        const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
        const along = x * dx + y * dy;
        if (along <= 4) continue;
        const across = Math.abs(x * dy) + Math.abs(y * dx);
        const score = along + across * 2.2;
        if (score < bestScore) { bestScore = score; best = b; }
      }
      if (best) { best.focus(); e.preventDefault(); }
      return;
    }
    // Number keys pick answers on the question screen.
    if (/^[1-4]$/.test(e.key)) {
      const b = $(`#stage [data-key="${e.key}"]:not([disabled])`);
      if (b) { b.click(); e.preventDefault(); }
    }
    if (e.key === "Enter" && (document.activeElement === document.body || !document.activeElement)) {
      const p = $("#stage [data-primary]:not([disabled])") || $("#bubble-next:not([hidden])");
      if (p) { p.click(); e.preventDefault(); }
    }
  });

  return {
    $, $$, el, sleep, pick, rand, shuffle, show, focusFirst, say, setMood, waitButton, timer, ringTimer, barTimer,
    confetti, popText, flash, stamp, crack, embers, cityscape, lobby, applySkin, nextSkin,
    skin: () => skin, skinName: (k) => SKINS[k || skin].name, SKINS,
  };
})();
