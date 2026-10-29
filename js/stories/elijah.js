/* Story Scene 5: Fire on the Mountain (Elijah on Mount Carmel, 1 Kings 18:16–39), in the crayon-drawing style.
   It looks like a kid drew it on notebook paper: waxy double strokes, scribble-hatch fills, handwritten labels with
   arrows, and twelve numbered stones. Every line is jittered once from a seeded random, so it is wobbly but the same
   on every play. The "boil" (lines wiggling a little on every frame) is one small SVG filter whose noise seed steps
   between three values; only the actors use it. The big paper background gets a static grain filter, drawn once. */
(function () {
  const { REDUCED } = THP.Scenes.kit;
  const el = THP.ui.el;
  const HAND = `font-family="'Patrick Hand', 'Comic Sans MS', 'Chalkboard SE', cursive"`;

  /* ---------- Crayon kit ---------- */
  // A seeded random, so the wobble is the same every time the scene plays.
  let seed = 18;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const j = (a) => (rnd() * 2 - 1) * a;
  const f = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);
  /** A wobbly hand-drawn line through points: long sides are cut into ~22-unit pieces and every joint is nudged. */
  function wl(pts, amp, closed) {
    amp = amp == null ? 1.6 : amp;
    const P = closed ? [...pts, pts[0]] : pts, out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 22));
      for (let k = 0; k < n; k++) out.push([x1 + ((x2 - x1) * k) / n + j(amp), y1 + ((y2 - y1) * k) / n + j(amp)]);
    }
    if (!closed) out.push([P[P.length - 1][0] + j(amp / 2), P[P.length - 1][1] + j(amp / 2)]);
    return "M" + out.map(f).join(" L") + (closed ? " Z" : "");
  }
  /** A wobbly oval, smoothed with curves through the midpoints (crayon circles are never round). */
  function wo(cx, cy, rx, ry, amp) {
    amp = amp == null ? 1.4 : amp;
    const n = Math.max(10, Math.round((rx + ry) / 5)), pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * rx + j(amp), cy + Math.sin(a) * ry + j(amp)]); }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = "M" + f(mid(pts[n - 1], pts[0]));
    pts.forEach((p, i) => { d += ` Q${f(p)} ${f(mid(p, pts[(i + 1) % n]))}`; });
    return d + "Z";
  }
  /** One crayon stroke: a solid line plus a thinner, broken second pass slightly off, like wax skipping on paper. */
  const cr = (d, c, w, fill, attrs) => `<path d="${d}" fill="${fill || "none"}" stroke="${c}" stroke-width="${w}" ${attrs || ""}/>` +
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${(w * 0.45).toFixed(1)}" opacity="0.5" stroke-dasharray="17 3 9 2" transform="translate(1.3 -1)"/>`;
  const H = (n) => `url(#crayon-h-${n})`;
  const txt = (x, y, s, c, t, extra) => `<text x="${x}" y="${y}" ${HAND} font-size="${s}" fill="${c}" stroke="none" ${extra || ""}>${t}</text>`;
  /** An actor drawing. boil = the wiggling filter (small actors only); otherwise the static wax grain. */
  const pic = (vb, body, boil) => `<svg viewBox="${vb}" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round" filter="url(#crayon-${boil ? "boil" : "wax"})">${body}</g></svg>`;

  // Scribble-hatch fills: one rotated stripe pattern per crayon color.
  const HATCH = [["sky", "#8ec5f5", 8, -30], ["mtn", "#f1dcc0", 13, 35], ["grass", "#86cf5f", 7, -62], ["stone", "#b3b3b3", 7, 20],
    ["robe", "#9b5fd6", 7, -40], ["beard", "#b8b8b8", 5, 60], ["bull", "#b07a48", 7, 50], ["fire", "#ff9a1a", 7, 60], ["fire2", "#ffd21a", 6, -30],
    ["water", "#4aa3f0", 6, -25], ["sun", "#ffd21a", 7, 30], ["jar", "#d98c4a", 7, -35], ["ash", "#6a6a6a", 6, 40], ["smoke", "#c9c9c9", 6, -20],
    ["red", "#ef5350", 7, -40], ["green", "#5cb85c", 7, 35], ["blue", "#42a5f5", 7, -50], ["orange", "#ffa726", 7, 45], ["pink", "#f48fb1", 7, -30],
    ["teal", "#26a69a", 7, 30], ["bgreen", "#7cb342", 7, -45], ["bora", "#ff8a1a", 7, 40], ["hat", "#d84a4a", 5, 0], ["hat2", "#8e44ad", 5, 0]];
  const defs = () => `<defs>
    ${HATCH.map(([n, c, g, a]) => `<pattern id="crayon-h-${n}" width="${g}" height="${g}" patternUnits="userSpaceOnUse" patternTransform="rotate(${a})"><line x1="0" y1="0" x2="0" y2="${g}" stroke="${c}" stroke-width="${(g * 0.55).toFixed(1)}"/></pattern>`).join("")}
    <filter id="crayon-wax" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="ga"/>
      <feComposite in="SourceGraphic" in2="ga" operator="in"/>
    </filter>
    <filter id="crayon-boil" x="-8%" y="-8%" width="116%" height="116%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed="1" result="wob">${REDUCED() ? "" : `<animate attributeName="seed" values="1;2;3" dur="0.45s" calcMode="discrete" repeatCount="indefinite"/>`}</feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="wob" scale="4" xChannelSelector="R" yChannelSelector="G" result="w"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="ga"/>
      <feComposite in="w" in2="ga" operator="in"/>
    </filter>
  </defs>`;

  /* ---------- The page: notebook paper with Mount Carmel and Baal's altar drawn on it ----------
     World units: 1600 × 500 (the world is two frames wide). The grass line is at y ≈ 432. */
  function paper() {
    let lines = "";
    for (let y = 70; y < 500; y += 30) lines += `<line x1="0" y1="${y}" x2="1600" y2="${y}"/>`;
    // Baal's altar: nine plain stones, wood and a bull. No numbers. (Nothing is going to happen to it.)
    let stones = "";
    [[0, 400], [1, 400], [2, 400], [0.5, 370], [1.5, 370]].forEach(([i, y]) => { stones += cr(wo(296 + i * 34, y + 15, 17, 15, 1.4), "#666", 3.5, H("stone")); });
    const tufts = Array.from({ length: 30 }, (_, i) => { const x = 20 + i * 53 + j(10); return cr(wl([[x, 446], [x + 4, 436], [x + 8, 446], [x + 12, 434], [x + 16, 446]], 0.8), "#4caf50", 2.5); }).join("");
    return `<svg class="sp-bg" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">${defs()}
      <rect width="1600" height="500" fill="#fdfcf6"/>
      <g stroke="#9cc3ea" stroke-width="1.5">${lines}</g>
      <path d="M70 0 V500" stroke="#f0a0a8" stroke-width="2"/>
      <g stroke-linecap="round" stroke-linejoin="round">
        ${cr(wl([[0, -4], [1600, -4], [1600, 24], [1300, 30], [1000, 22], [700, 30], [400, 22], [0, 28]], 2, true), "#4a90e2", 3, H("sky"))}
        ${cr(wl([[60, 434], [250, 260], [420, 180], [560, 236], [820, 108], [1050, 214], [1250, 150], [1460, 250], [1600, 330], [1600, 434]], 3, true), "#8a5a2b", 4.5, H("mtn"))}
        ${cr(wl([[0, 434], [400, 428], [800, 436], [1200, 428], [1600, 434], [1600, 504], [0, 504]], 2.5, true), "#3e9a3e", 4, H("grass"))}
        ${tufts}
        ${cr(wl([[600, 66], [610, 56], [620, 66], [630, 56], [640, 66]], 0.8), "#444", 3)}${cr(wl([[668, 84], [676, 76], [684, 84], [692, 76], [700, 84]], 0.8), "#444", 3)}
        ${txt(735, 72, 34, "#8a5a2b", "MT. CARMEL", 'transform="rotate(-3 735 72)"')}
        ${cr("M800 82 Q822 92 820 104 M811 96 L820 106 L827 95", "#8a5a2b", 3.5)}
        ${txt(1440, 64, 22, "#888", "by: me :)", 'transform="rotate(4 1440 64)"')}
        ${stones}
        ${cr(wl([[284, 356], [378, 350]], 1), "#7a4a20", 6)}${cr(wl([[288, 350], [372, 360]], 1), "#8a5a2b", 5)}
        ${cr(wo(328, 330, 38, 15, 1.5), "#7a4a20", 4, H("bull"))}
        ${cr(wo(368, 318, 11, 10, 1), "#7a4a20", 4, H("bull"))}
        ${cr("M362 308 Q358 298 364 296 M374 308 Q380 298 376 295", "#ddd", 3.5)}
        <circle cx="371" cy="316" r="1.8" fill="#222"/>
        ${cr("M292 328 Q280 322 282 312", "#7a4a20", 3.5)}
        ${txt(372, 262, 26, "#e07a10", "Baal's altar", 'transform="rotate(-4 372 262)"')}
        ${cr("M392 272 Q376 290 362 294 M366 284 L360 295 L372 297", "#e07a10", 3)}
      </g>
      <g fill="#ebe8dc"><circle cx="30" cy="100" r="11"/><circle cx="30" cy="250" r="11"/><circle cx="30" cy="400" r="11"/></g>
    </svg>`;
  }

  /* ---------- Characters ---------- */
  // Elijah: the biggest one, because he's the main character. Three arm poses, swapped by opacity.
  const ELIJAH = pic("0 0 100 160", `
    ${cr(wl([[42, 140], [38, 157], [30, 158]]), "#b5651d", 5)}${cr(wl([[58, 140], [62, 157], [70, 158]]), "#b5651d", 5)}
    ${cr(wl([[37, 63], [63, 63], [80, 141], [20, 141]], 1.5, true), "#7a3fb8", 4.5, H("robe"))}
    ${cr(wl([[29, 100], [71, 100]], 1), "#6b3b1a", 4)}
    <g class="a-down">${cr(wl([[38, 70], [27, 90], [23, 108]]), "#b5651d", 5)}${cr(wl([[62, 70], [73, 90], [77, 108]]), "#b5651d", 5)}</g>
    <g class="a-up" opacity="0">${cr(wl([[38, 70], [28, 48], [20, 20]]), "#b5651d", 5)}${cr(wl([[62, 70], [72, 48], [80, 20]]), "#b5651d", 5)}
      ${cr(wo(19, 16, 4.5, 4.5, 0.6), "#b5651d", 3.5, "#fde3c8")}${cr(wo(81, 16, 4.5, 4.5, 0.6), "#b5651d", 3.5, "#fde3c8")}</g>
    <g class="a-point" opacity="0">${cr(wl([[38, 70], [16, 64], [-6, 60]]), "#b5651d", 5)}${cr("M-6 60 L-14 58 M-6 60 L-12 64", "#b5651d", 3.5)}${cr(wl([[62, 70], [76, 86], [65, 99]]), "#b5651d", 5)}</g>
    ${cr(wo(50, 40, 19, 19, 1.2), "#b5651d", 4, "#fde3c8")}
    ${cr(wl([[29, 36], [28, 22], [38, 13], [50, 11], [62, 13], [72, 22], [71, 36]], 2.5), "#6b3b1a", 5)}
    ${cr("M33 22 L27 14 M46 12 L44 4 M58 12 L62 3 M68 19 L76 13", "#6b3b1a", 3.5)}
    ${cr(wl([[31, 46], [36, 64], [50, 76], [64, 64], [69, 46], [60, 55], [50, 58], [40, 55]], 1.2, true), "#8a8a8a", 3.5, H("beard"))}
    <circle cx="43" cy="37" r="2.6" fill="#222"/><circle cx="57" cy="37" r="2.6" fill="#222"/>
    <path class="m-smile" d="M42 46 Q50 53 58 46" fill="none" stroke="#b5651d" stroke-width="3.5"/>
    <ellipse class="m-open" cx="50" cy="49" rx="5" ry="5.5" fill="#7a1a1a" stroke="none" opacity="0"/>`, true);

  // The people of Israel, watching. Each one can stand or bow down (two drawings, swapped).
  const PCOL = ["red", "green", "blue", "orange", "pink", "teal", "red"];
  const PSTROKE = { red: "#c62828", green: "#2e7d32", blue: "#1565c0", orange: "#ef6c00", pink: "#d81b60", teal: "#00796b" };
  const PEOPLE = pic("0 0 340 110", PCOL.map((c, i) => {
    const x = 24 + i * 49, small = i === 2 || i === 5, s = PSTROKE[c];
    const sc = small ? ` transform="translate(${x} 108) scale(0.8) translate(${-x} -108)"` : "";
    const hair = i % 2 ? cr(wl([[x - 10, 38], [x - 6, 31], [x, 30], [x + 6, 31], [x + 10, 38]], 1), "#5d3a1a", 4) : cr(`M${x - 6} 32 L${x - 9} 26 M${x} 31 L${x} 24 M${x + 6} 32 L${x + 9} 26`, "#3a2a1a", 3);
    return `<g class="pp"><g class="stand"${sc}>
        ${cr(wl([[x - 6, 96], [x - 8, 108]], 0.8), "#555", 4)}${cr(wl([[x + 6, 96], [x + 8, 108]], 0.8), "#555", 4)}
        ${cr(wl([[x, 54], [x + 16, 98], [x - 16, 98]], 1.2, true), s, 3.5, H(c))}
        ${cr(wl([[x - 5, 64], [x - 15, 84]], 0.8), "#c98a52", 4)}${cr(wl([[x + 5, 64], [x + 15, 84]], 0.8), "#c98a52", 4)}
        ${cr(wo(x, 42, 11, 11, 1), "#b5651d", 3.5, "#fde3c8")}${hair}
        <circle cx="${x - 4}" cy="41" r="1.8" fill="#222"/><circle cx="${x + 4}" cy="41" r="1.8" fill="#222"/>
        <path d="M${x - 3} 47 Q${x} 49 ${x + 3} 47" fill="none" stroke="#b5651d" stroke-width="2.5"/>
      </g><g class="bow" opacity="0">
        ${cr(wl([[x - 20, 108], [x - 18, 86], [x - 6, 74], [x + 8, 76], [x + 16, 92], [x + 12, 108]], 1, true), s, 3.5, H(c))}
        ${cr(wl([[x + 8, 86], [x + 22, 100], [x + 38, 106]], 0.8), "#c98a52", 4)}
        ${cr(wo(x + 24, 94, 10, 10, 0.8), "#b5651d", 3.5, "#fde3c8")}<g transform="translate(24 52)">${hair}</g>
        <path d="M${x + 18} 95 q3 2 5 0 M${x + 26} 95 q3 2 5 0" fill="none" stroke="#222" stroke-width="2"/>
      </g></g>`;
  }).join(""), true);

  // The prophets of Baal: pointy hats, arms always up, mouths always open. Eight drawn, 442 implied.
  const PROPHETS = pic("0 0 420 120", [20, 62, 104, 146, 274, 316, 358, 400].map((x, i) => {
    const c = i % 2 ? "bgreen" : "bora", s = i % 2 ? "#558b2f" : "#e65100";
    return `<g class="bp" style="transform-box: fill-box; transform-origin: 50% 100%">
      ${cr(wl([[x - 6, 104], [x - 9, 118]], 0.8), "#555", 4)}${cr(wl([[x + 6, 104], [x + 9, 118]], 0.8), "#555", 4)}
      ${cr(wl([[x, 58], [x + 15, 106], [x - 15, 106]], 1.2, true), s, 3.5, H(c))}
      ${cr(wl([[x - 4, 66], [x - 14, 52], [x - 20, 38]], 0.8), "#c98a52", 4)}${cr(wl([[x + 4, 66], [x + 14, 52], [x + 20, 38]], 0.8), "#c98a52", 4)}
      ${cr(wo(x, 48, 10, 10, 1), "#b5651d", 3.5, "#fde3c8")}
      ${cr(wl([[x - 11, 41], [x, 12], [x + 11, 41]], 1, true), i % 3 ? "#b71c1c" : "#6a1b9a", 3, H(i % 3 ? "hat" : "hat2"))}
      <circle cx="${x - 4}" cy="46" r="1.7" fill="#222"/><circle cx="${x + 4}" cy="46" r="1.7" fill="#222"/>
      <ellipse cx="${x}" cy="53" rx="3" ry="3.6" fill="#7a1a1a"/></g>`;
  }).join(""), true);

  // Elijah's altar. It starts as rubble ("torn down"), then gets twelve numbered stones, a trench, wood and a bull.
  const ALTAR = (() => {
    let st = "";
    let n = 1;
    [[56, 140], [64, 108], [60, 76]].forEach(([x0, y]) => {
      for (let i = 0; i < 4; i++, n++) {
        const x = x0 + i * 41;
        st += `<g class="st" opacity="0">${cr(wl([[x, y], [x + 38, y], [x + 38, y + 30], [x, y + 30]], 1.6, true), "#555", 3.5, H("stone"))}${txt(x + 19, y + 23, 22, "#333", n, 'text-anchor="middle"')}</g>`;
      }
    });
    const rubble = [[30, 186, 16], [70, 192, 12], [150, 190, 18], [205, 188, 13], [250, 192, 15]].map(([x, y, r]) => cr(wo(x, y, r, r * 0.7, 1.5), "#777", 3.5, H("stone"))).join("");
    const drips = [80, 118, 160, 198].map((x) => cr(wl([[x, 80], [x + 2, 120], [x - 1, 166]], 1), "#2a8ae0", 3)).join("");
    return pic("-20 -60 320 260", `
      <g class="rubble">${rubble}</g>
      <path class="trench" d="M4 172 Q6 198 30 198 L250 198 Q274 198 276 172" fill="none" stroke="#8a5a2b" stroke-width="5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <g class="burn">
        <path class="water" d="M8 178 Q10 195 30 195 L250 195 Q270 195 272 178 Z" fill="${H("water")}" stroke="#2a8ae0" stroke-width="3.5" style="transform-box: fill-box; transform-origin: 50% 100%; transform: scaleY(0)"/>
        ${st}
        <g class="wood" opacity="0">${cr(wl([[62, 102], [222, 94]], 1), "#7a4a20", 7)}${cr(wl([[66, 92], [218, 104]], 1), "#8a5a2b", 6)}${cr(wl([[90, 98], [196, 98]], 1), "#6b3b1a", 5)}</g>
        <g class="bull" opacity="0">
          ${cr(wo(136, 74, 52, 18, 1.5), "#7a4a20", 4, H("bull"))}${cr(wo(192, 60, 14, 12, 1), "#7a4a20", 4, H("bull"))}
          ${cr("M184 50 Q178 38 186 36 M198 49 Q206 38 200 34", "#ddd", 4)}${cr("M84 70 Q70 64 72 52", "#7a4a20", 3.5)}
          <circle cx="196" cy="58" r="2" fill="#222"/>${cr("M190 66 Q195 70 200 66", "#5a3410", 2.5)}
        </g>
        <g class="wet" opacity="0">${drips}</g>
      </g>
      <g class="scorch" opacity="0">
        ${cr(wl([[40, 196], [70, 178], [110, 170], [170, 170], [212, 178], [244, 196]], 1.5, true), "#333", 4, H("ash"))}
        ${txt(120, 192, 18, "#ddd", "ashes")}
      </g>
      <g class="flames" opacity="0" style="transform-box: fill-box; transform-origin: 50% 100%">
        ${cr(wl([[10, 198], [20, 120], [44, 150], [56, 60], [90, 120], [110, 10], [140, 90], [168, -20], [190, 92], [214, 30], [232, 130], [258, 96], [270, 198]], 3, true), "#e0301e", 6, H("fire"))}
        ${cr(wl([[50, 198], [64, 140], [88, 164], [110, 80], [136, 150], [160, 60], [184, 150], [208, 120], [226, 198]], 2.5, true), "#ffb000", 5, H("fire2"))}
      </g>`);
  })();

  // Four large jars of water, floating in kid-drawing style. They tip over and pour (streams sit outside the jars).
  const JARS = pic("0 0 280 110", [35, 100, 165, 230].map((x) => `
    <g class="jar" style="transform-box: fill-box; transform-origin: 50% 55%">
      ${cr(wo(x, 66, 22, 26, 1.2), "#a0522d", 4, H("jar"))}
      ${cr(wl([[x - 9, 42], [x + 9, 42], [x + 11, 30], [x - 11, 30]], 0.8, true), "#a0522d", 4, H("jar"))}
      ${cr(`M${x - 18} 52 Q${x - 30} 56 ${x - 20} 70 M${x + 18} 52 Q${x + 30} 56 ${x + 20} 70`, "#a0522d", 3.5)}
    </g>
    <g class="stream" opacity="0">${cr(wl([[x + 30, 50], [x + 36, 90], [x + 32, 150], [x + 30, 200]], 2), "#2a8ae0", 5)}${cr(wl([[x + 24, 60], [x + 26, 120], [x + 22, 190]], 2), "#7cc0f5", 3)}</g>`).join(""));

  // The fire from heaven: two zigzag crayon bolts that draw themselves top to bottom.
  const FIRE = pic("0 0 140 270", `
    <path class="bolt" d="${wl([[72, -10], [46, 56], [90, 70], [50, 138], [94, 152], [62, 262]], 1.5)}" fill="none" stroke="#e0301e" stroke-width="13" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <path class="bolt" d="${wl([[98, -10], [76, 60], [114, 74], [80, 142], [118, 158], [86, 262]], 1.5)}" fill="none" stroke="#ffa31a" stroke-width="9" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <g class="sparks" opacity="0">${cr("M20 120 L34 128 M14 170 L30 172 M126 110 L138 100 M128 190 L140 196 M30 220 L42 210", "#ff7a00", 4)}</g>`);

  const SUN = pic("0 0 120 120", `
    ${cr(wo(60, 60, 26, 26, 1.2), "#f5b800", 5, H("sun"))}
    ${cr("M60 22 V8 M60 98 V112 M22 60 H8 M98 60 H112 M33 33 L23 23 M87 87 L97 97 M87 33 L97 23 M33 87 L23 97", "#f5b800", 5)}
    <circle cx="51" cy="56" r="2.6" fill="#a06000"/><circle cx="69" cy="56" r="2.6" fill="#a06000"/>${cr("M50 67 Q60 75 70 67", "#a06000", 3)}`);

  const CRICKET = pic("0 0 120 70", `
    ${txt(14, 22, 20, "#666", "chirp chirp…", 'transform="rotate(-6 14 22)" stroke="#fdfcf6" stroke-width="5" paint-order="stroke"')}
    ${cr(wo(52, 56, 17, 7, 0.8), "#388e3c", 3, H("green"))}${cr(wo(72, 52, 6, 6, 0.6), "#388e3c", 3, H("green"))}
    ${cr("M74 46 Q82 32 92 34 M70 46 Q74 30 82 28 M42 60 L36 68 M54 62 L52 69 M46 50 L34 40 L30 62", "#2e7d32", 2.5)}`);

  const PUFF = pic("0 0 60 60", cr(wo(30, 30, 22, 17, 2), "#999", 3.5, H("smoke")));

  /** A handwritten label with an arrow, placed by its top-left corner in world units. tip/from are in the label's units. */
  function label(D, o) {
    const [sx, sy] = o.from, [px, py] = o.tip;
    const qx = (sx + px) / 2 + (o.bend || 14), qy = (sy + py) / 2 - 6;
    const a = Math.atan2(py - qy, px - qx), hd = (d) => f([px - 13 * Math.cos(a + d), py - 13 * Math.sin(a + d)]);
    const body = txt(6, 34, o.size || 32, o.c, o.text, `transform="rotate(${o.rot || -3} 6 34)"`) + (o.extra || "") +
      cr(`M${sx} ${sy} Q${qx.toFixed(1)} ${qy.toFixed(1)} ${px} ${py}`, o.c, 3.5) + cr(`M${hd(0.5)} L${px} ${py} L${hd(-0.5)}`, o.c, 3.5);
    return D.actor(pic(`0 0 ${o.w} 100`, body, true), { x: (o.x + o.w / 2) / 16, y: (500 - (o.y + 100)) / 5, h: 20, hidden: true, cls: "cr-label" });
  }

  /* ---------- The scene ---------- */
  async function play(D) {
    const W = D.world;
    seed = 18; // same wobble every play
    W.insertAdjacentHTML("afterbegin", paper());
    const sun = D.actor(SUN, { x: 7.5, y: 57, h: 20, hidden: true });
    const baal = D.actor(PROPHETS, { x: 20.6, y: 12.4, h: 24 });
    const people = D.actor(PEOPLE, { x: 49.4, y: 13, h: 22 });
    const altar = D.actor(ALTAR, { x: 81.9, y: 12, h: 52 });
    const cricket = D.actor(CRICKET, { x: 19.6, y: 35, h: 14, hidden: true });
    const jars = D.actor(JARS, { x: 81.9, y: 50, h: 22, hidden: true });
    const eli = D.actor(ELIJAH, { x: 104, y: 12, h: 30 });
    const fire = D.actor(FIRE, { x: 81.9, y: 47.6, h: 54, hidden: true });
    const lEli = label(D, { text: "ELIJAH", c: "#d42a2a", x: 900, y: 196, w: 170, from: [56, 46], tip: [128, 102], bend: 10 });
    const l450 = label(D, { text: "450 guys", c: "#666", x: 70, y: 222, w: 300, from: [60, 44], tip: [110, 100], size: 32,
      extra: `<g class="extra" opacity="0">${txt(128, 34, 28, "#d42a2a", "(no fire)", 'transform="rotate(-3 128 34)"')}</g>` });
    const lPeople = label(D, { text: "the people", c: "#2357c9", x: 560, y: 246, w: 220, from: [100, 44], tip: [160, 104], size: 30 });
    const lWater = label(D, { text: "water (lots!)", c: "#2a8ae0", x: 1408, y: 338, w: 190, from: [30, 44], tip: [14, 96], bend: -18, size: 28 });
    const lGone = label(D, { text: "ALL GONE!!", c: "#d42a2a", x: 1400, y: 222, w: 200, from: [40, 46], tip: [-60, 150], bend: 30, size: 32,
      extra: txt(14, 70, 22, "#2a8ae0", "(even the water!)", 'transform="rotate(-3 14 70)"') });
    const ev = (s) => eli.querySelector(s), av = (s) => altar.querySelector(s), avAll = (s) => [...altar.querySelectorAll(s)];
    const show = (n, ms) => D.to(n, "opacity", getComputedStyle(n).opacity, "1", { duration: ms || 300 });
    const hide = (n, ms) => D.to(n, "opacity", getComputedStyle(n).opacity, "0", { duration: ms || 300 });
    const pose = (p) => ["down", "up", "point"].forEach((k) => { ev(".a-" + k).style.opacity = k === p ? "1" : "0"; });
    const mouth = (open) => { ev(".m-open").style.opacity = open ? "1" : "0"; ev(".m-smile").style.opacity = open ? "0" : "1"; };
    const say = async (who, text, o) => { mouth(true); await D.bubble(eli, 50, 14, who || "Elijah", text, o); mouth(false); };
    // Stop-motion loops (steps easing), so the filtered drawings only repaint a few times a second.
    const dance = (big) => baal.querySelectorAll(".bp").forEach((g, i) => D.loop(g,
      [{ transform: "translateY(0) rotate(-8deg)" }, { transform: `translateY(-${big ? 14 : 8}px) rotate(8deg)` }],
      { duration: big ? 280 : 440, direction: "alternate", easing: "steps(2, jump-none)", delay: i * 60 }));
    const fidget = () => people.querySelectorAll(".pp").forEach((g, i) => D.loop(g,
      [{ transform: "translateY(0)" }, { transform: "translateY(-3px)" }], { duration: 700 + (i % 3) * 150, direction: "alternate", easing: "steps(2, jump-none)" }));
    const beats = [];
    const beat = (fn) => beats.push(fn);

    // Camera: most shots zoom to 1.35 and look at the lower part of the page, where the drawing is.
    const Z = 1.35, CY = 0.62;

    beat(async () => {
      await D.cam(0.5, 0.5, 1, 1);
      THP.Music.play("jericho");
      await D.card("Story Scene 5", "FIRE ON THE MOUNTAIN", "Elijah · 1 Kings 18:16–39", 1600);
    });
    beat(async () => {
      fidget();
      show(lPeople, 400);
      await D.narrate("Israel has a problem: lots of people are bowing down to a fake god called Baal.", 900);
      await Promise.all([
        D.cam(0.525, CY, Z, 2200),
        D.narrate("So God's prophet Elijah calls everyone up to Mount Carmel for a showdown.", 300),
        D.move(eli, 65, 12, 2600, { steps: 7, bob: 3, easing: "ease-out", onStep: () => D.sfx("step") }),
      ]);
      show(lEli, 300); D.sfx("tick");
      await D.wait(600);
    });
    beat(async () => {
      pose("point");
      await say("Elijah", "How long will you waver between two opinions? If the LORD is God, follow him; but if Baal is God, follow him.", { hold: 5200 });
      pose("down");
      await D.bubble(people, 170, 30, "The people", "…", { hold: 1100 });
      await D.narrate("The people said… nothing. Not one word. Awkward!", 700);
    });
    beat(async () => {
      hide(lEli, 200);
      await D.cam(0.19, CY, Z, 1400);
      dance(false);
      show(l450, 300); D.sfx("tick");
      await D.narrate("On Team Baal: 450 prophets of Baal.", 600);
      await D.cam(0.525, CY, Z, 1300);
      await D.narrate("On Team God: Elijah. Just Elijah. 450 to 1!", 500);
      await say("Elijah", "The god who answers by fire—he is God.", { hold: 2600 });
      await D.bubble(people, 170, 30, "The people", "What you have said is good.", { hold: 1500 });
      await D.narrate("Two altars, two bulls, and NO matches. Whichever god sends fire is the real God.", 900);
    });
    beat(async () => {
      await D.cam(0.22, CY, Z, 1400);
      show(sun, 500);
      dance(false);
      const up = D.move(sun, 20.6, 74, 4400, { easing: "ease-in-out" });
      await D.narrate("Team Baal goes first. They shout and dance around their altar from morning till noon.", 200);
      await D.bubble(baal, 104, 14, "Baal prophets", "Baal, answer us!", { cls: "loud", hold: 1500 });
      await up;
      const p = D.point(baal, 210, 20);
      D.burst("…nothing.", p.fx, p.fy, "plain");
      await D.wait(900);
    });
    beat(async () => {
      await D.move(eli, 36, 12, 1500, { steps: 4, bob: 3, easing: "ease-in-out" });
      pose("point");
      await say("Elijah", "Shout louder! Surely he is a god! … Maybe he is sleeping and must be awakened.", { hold: 4300 });
      pose("down");
      const z = D.point(baal, 210, 0);
      D.sfx("tick");
      D.burst("zzz…?", z.fx, z.fy, "plain");
      await D.wait(800);
    });
    beat(async () => {
      dance(true);
      const late = D.move(sun, 35, 64, 3600, { easing: "ease-in-out" });
      D.shake(0.5);
      await D.bubble(baal, 104, 14, "Baal prophets", "BAAL!!! ANSWER US!!!", { cls: "loud", hold: 1500 });
      await Promise.all([D.narrate("So they shout even LOUDER. They keep it up all afternoon long.", 200), late]);
    });
    beat(async () => {
      await D.cam(0.21, 0.6, 1.8, 1200);
      show(cricket, 300);
      D.loop(cricket, [{ transform: "translateY(0)" }, { transform: "translateY(-6%)" }], { duration: 300, direction: "alternate", easing: "steps(2, jump-none)" });
      show(l450.querySelector(".extra"), 300); D.sfx("wrong");
      await D.narrate("Still nothing. There was no response, no one answered, no one paid attention. Not even one tiny spark.", 900);
    });
    beat(async () => {
      hide(cricket, 300); hide(lPeople, 300);
      await Promise.all([D.cam(0.8, CY, Z, 1600), D.move(eli, 65, 12, 2000, { steps: 6, bob: 3, easing: "ease-in-out", onStep: () => D.sfx("step") })]);
      const say1 = D.narrate("Now it's Elijah's turn. He rebuilds the LORD's broken-down altar with 12 stones: one for each tribe of Israel.", 200);
      hide(av(".rubble"), 400);
      for (const s of avAll(".st")) {
        D.sfx("tap");
        s.style.opacity = "1";
        await D.anim(s, [{ transform: "translateY(-40px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 200, easing: "ease-in" });
        await D.wait(110);
      }
      await say1;
      D.sfx("crumble");
      const dig = D.to(av(".trench"), "strokeDashoffset", "1", "0", { duration: 1100, easing: "ease-in-out" });
      await D.narrate("Then he digs a trench around it, and puts the wood and the bull on top.", 0);
      await dig;
      D.sfx("flip"); await show(av(".wood"), 250);
      D.sfx("flip"); await show(av(".bull"), 250);
      await D.wait(300);
    });
    beat(async () => {
      await say("Elijah", "Fill four large jars with water and pour it on the offering and on the wood.", { hold: 3600 });
      const water = av(".water"), levels = ["scaleY(0)", "scaleY(0.4)", "scaleY(0.72)", "scaleY(1)"];
      const lines = ["", "“Do it again,” he said.", "“Do it a third time,” he ordered."];
      for (let k = 0; k < 3; k++) {
        if (lines[k]) D.narrate(lines[k], 0);
        await show(jars, 250);
        D.sfx("whoosh");
        await Promise.all([...jars.querySelectorAll(".jar")].map((g, i) => D.anim(g, [{ transform: "rotate(0deg)" }, { transform: "rotate(62deg)" }], { duration: 340, delay: i * 50, fill: "forwards" })));
        jars.querySelectorAll(".stream").forEach((s) => { s.style.opacity = "1"; });
        show(av(".wet"), 400);
        await D.to(water, "transform", levels[k], levels[k + 1], { duration: 700, easing: "ease-out" });
        const p = D.point(altar, 140, -40);
        D.burst(k + 1 + (k === 2 ? "!!" : "!"), p.fx, p.fy, "plain count");
        jars.querySelectorAll(".stream").forEach((s) => { s.style.opacity = "0"; });
        await hide(jars, 250);
        jars.querySelectorAll(".jar").forEach((g) => g.getAnimations().forEach((a) => a.cancel()));
        await D.wait(450);
        D.next();
      }
      show(lWater, 300); D.sfx("tick");
      await D.narrate("Water runs down the altar and fills the trench. Soggy wood does NOT burn. No tricks here!", 800);
    });
    beat(async () => {
      const face = D.point(eli, 50, 40);
      await D.cam(face.wx / 100 + 0.04, 1 - face.wy / 100 + 0.04, 1.6, 1300);
      THP.Music.play("manna");
      await D.narrate("No dancing. No shouting all day. Elijah just prays.", 200);
      pose("up");
      await say("Elijah", "Answer me, LORD, answer me, so these people will know that you, LORD, are God.", { hold: 3800 });
    });
    beat(async () => {
      await D.cam(0.8, 0.5, 1.15, 800);
      fire.style.opacity = "1";
      D.sfx("whoosh");
      const bolts = [...fire.querySelectorAll(".bolt")];
      await Promise.all(bolts.map((b, i) => D.to(b, "strokeDashoffset", "1", "0", { duration: 700, delay: i * 90, easing: "ease-in" })));
      D.sfx("impact"); D.sfx("shatter"); D.shake(2.4);
      fire.querySelector(".sparks").style.opacity = "1";
      const fl = av(".flames");
      fl.style.opacity = "1";
      D.anim(fl, [{ transform: "scaleY(0.2)" }, { transform: "scaleY(1.1)", offset: 0.7 }, { transform: "scaleY(1)" }], { duration: 450, easing: "ease-out" });
      D.loop(fl, [{ transform: "scaleY(1) skewX(-3deg)" }, { transform: "scaleY(1.08) skewX(3deg)" }], { duration: 300, direction: "alternate", easing: "steps(2, jump-none)" });
      const p = D.point(fire, 100, 90);
      D.burst("WOOSH!!", Math.min(80, p.fx + 14), Math.max(20, p.fy), "woosh");
      THP.Music.play("redsea");
      await D.narrate("Then the fire of the LORD fell!", 1300);
      hide(fire, 400);
      await D.narrate("It burned up the bull, the wood, the stones, the soil… and it even licked up all the water in the trench!", 100);
      D.sfx("crumble");
      hide(av(".burn"), 500); hide(lWater, 300);
      show(av(".scorch"), 600);
      await hide(fl, 700);
      for (let i = 0; i < 4; i++) {
        const puff = D.actor(PUFF, { x: 76 + i * 3.6, y: 18 + (i % 2) * 4, h: 10 });
        D.anim(puff, [{ transform: "translateY(0) scale(0.6)", opacity: 0.9 }, { transform: "translateY(-160%) scale(1.5)", opacity: 0 }], { duration: 2200, delay: i * 180, easing: "ease-out", fill: "forwards" });
      }
      show(lGone, 300); D.sfx("tick");
      await D.wait(1600);
    });
    beat(async () => {
      hide(lGone, 300);
      await D.cam(0.525, CY, Z, 1400);
      people.querySelectorAll(".stand").forEach((g) => { g.style.opacity = "0"; });
      people.querySelectorAll(".bow").forEach((g) => { g.style.opacity = "1"; });
      D.sfx("crumble"); D.shake(0.8);
      pose("down");
      THP.Music.play("strut");
      if (!D.rushing) THP.ui.confetti(120);
      D.sfx("win");
      await D.bubble(people, 170, 74, "The people", "The LORD—he is God! The LORD—he is God!", { cls: "loud", hold: 2900 });
      await D.narrate("450 prophets shouting all day: nothing. One prayer to the one true God: FIRE!", 1500);
    });

    for (const b of beats) {
      D.next();
      await b();
    }
    D.next();
  }

  THP.Scenes.define("s5", {
    title: "Fire on the Mountain", sub: "Elijah on Mount Carmel", ref: "1 Kings 18:16–39", icon: "🔥",
    lesson: "There's only one true God, and he hears when we pray.",
    verse: ["The LORD—he is God! The LORD—he is God!", "1 Kings 18:39"],
    play,
  });
})();
