/* Story Scene 2: Jonah and the Big Fish (Jonah 1–3), in the paper cut-out style.
   Everything is cut from "construction paper": flat shapes with torn, wobbly edges, baked drop shadows and a grain
   layer on top. Things move like shoebox puppets, in choppy steps() instead of smooth tweens.
   The world (1600 × 500 units, twice the frame's width) runs left to right:
   Nineveh · the road and the signpost · the beach and the dock at Joppa · the open sea toward Tarshish. */
(function () {
  const { el } = THP.ui;
  const { REDUCED } = THP.Scenes.kit;

  /* ---------- Paper-cutting helpers ---------- */
  // A small seeded random, reset before drawing, so the torn edges come out the same on every play.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const f1 = (n) => n.toFixed(1);

  /** A polygon with "torn" edges: each side is split into short bits that wander a little off the line. */
  function tear(pts, j = 1.4, step = 9) {
    let d = "";
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1, n = Math.max(1, Math.round(len / step));
      const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
      for (let k = 0; k < n; k++) {
        const t = k / n, o = k ? (rnd() * 2 - 1) * j : 0;
        d += (i || k ? "L" : "M") + f1(x1 + (x2 - x1) * t + nx * o) + " " + f1(y1 + (y2 - y1) * t + ny * o) + " ";
      }
    });
    return d + "Z";
  }
  /** A scissor-cut oval: a ring of straight snips with a slightly uneven radius. */
  function blob(cx, cy, rx, ry, j = 0.05) {
    const n = Math.max(12, Math.round((rx + ry) / 2.6));
    let d = "";
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, r = 1 + (rnd() * 2 - 1) * j;
      d += (i ? "L" : "M") + f1(cx + Math.cos(a) * rx * r) + " " + f1(cy + Math.sin(a) * ry * r) + " ";
    }
    return d + "Z";
  }
  const P = (d, fill, extra) => `<path d="${d}" fill="${fill}" ${extra || ""}/>`;
  const LIFT = 'filter="url(#paperLift)"', LIFT_BG = 'filter="url(#paperLiftBg)"';
  /** Like the kit's svg(), but with no ink outline: paper has no outlines. */
  const art = (vb, body, cls) => `<svg viewBox="${vb}" class="${cls || ""}" aria-hidden="true">${body}</svg>`;
  /** A torn strip of paper sea: bumpy crests, with its shadow baked in as a darker copy (no live filter). */
  function wave(y, amp, color, cls, x0, x1) {
    let d = `M${x0} 520 L${x0} ${y}`;
    for (let x = x0; x < x1; x += 40) {
      d += ` Q${x + 20} ${f1(y - amp - rnd() * 8)} ${x + 40} ${y}`;
      d += ` l${f1(rnd() * 4 - 2)} ${f1(rnd() * 5 - 2)}`; // the torn nibble between crests
    }
    d += ` L${x1 + 40} 520 Z`;
    return `<g class="jn-wave ${cls}"><path d="${d}" fill="rgba(11,15,36,0.35)" transform="translate(4 7)"/><path d="${d}" fill="${color}"/></g>`;
  }

  const INK = "#2c2a4a", CREAM = "#f6ecd6", PAPER = "#fffaf0", SKIN = "#d9a26c", SKIN2 = "#c68a52", HAIR = "#3b2412";
  const ROBE = "#e2574c", ROBE_D = "#b8382f", GOLD = "#f2b33d", TEAL = "#2f9e9a", TEAL_L = "#7fd1c1", TEAL_D = "#256f6c";

  /* ---------- Art (drawn fresh on each play, from the same seed) ---------- */
  function draw() {
    seed = 7;
    const A = {};

    // Jonah, facing right. Arms, praying hands and the seaweed are groups the scene switches on and off.
    A.jbody = `
      ${P(tear([[38, 150], [48, 150], [47, 190], [39, 190]], 1), SKIN2)}${P(tear([[52, 150], [62, 150], [61, 190], [53, 190]], 1), SKIN2)}
      ${P(tear([[33, 188], [50, 188], [50, 197], [32, 197]], 0.8), "#7a4a22")}${P(tear([[50, 188], [67, 188], [68, 197], [50, 197]], 0.8), "#7a4a22")}
      <g class="jn-arms"><g class="arm-l" style="transform-box:view-box;transform-origin:36px 88px">
        ${P(tear([[31, 84], [41, 84], [38, 128], [28, 128]], 1), ROBE_D)}${P(blob(33, 132, 5.5, 5.5), SKIN)}</g></g>
      ${P(tear([[30, 80], [70, 80], [79, 163], [21, 163]], 1.6), ROBE, LIFT)}
      ${P(tear([[23, 150], [77, 150], [79, 163], [21, 163]], 1), ROBE_D)}
      ${P(tear([[26, 114], [74, 114], [75, 123], [25, 123]], 0.8), GOLD)}
      ${P(tear([[44, 70], [58, 70], [58, 84], [44, 84]], 0.6), SKIN2)}
      ${P(blob(52, 52, 21, 23), SKIN, LIFT)}
      ${P(tear([[32, 56], [72, 56], [68, 76], [54, 88], [38, 78]], 1.6), HAIR)}
      ${P(blob(64, 66, 5, 2.6), "#9e3a2e")}
      ${P(tear([[29, 50], [33, 33], [48, 26], [64, 28], [75, 40], [74, 49], [65, 41], [45, 41], [37, 53]], 1.2), HAIR)}
      ${P(blob(75, 56, 4.5, 4), "#c98d58")}
      <g class="jn-eyes"><circle cx="59" cy="50" r="3" fill="${INK}"/><circle cx="69" cy="50" r="3" fill="${INK}"/>
        <path d="M55 44 l8 -1 M66 43 l7 1" stroke="${HAIR}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
      <g class="jn-shut" style="opacity:0"><path d="M55 51 q4 3 8 0 M65 51 q4 3 8 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
      <g class="jn-arms"><g class="arm-r" style="transform-box:view-box;transform-origin:64px 88px">
        ${P(tear([[59, 84], [70, 84], [73, 124], [62, 124]], 1), ROBE_D, LIFT)}${P(blob(68, 128, 5.5, 5.5), SKIN)}
        <circle cx="64.5" cy="89" r="2" fill="#e7d39a"/></g></g>
      <g class="jn-pray" style="opacity:0">
        ${P(tear([[40, 88], [52, 86], [84, 84], [82, 94]], 1), ROBE_D, LIFT)}
        ${P(tear([[80, 88], [89, 88], [88, 64], [83, 62]], 0.7), SKIN, LIFT)}</g>
      <g class="jn-weed" style="opacity:0">${P(tear([[34, 33], [60, 27], [62, 33], [51, 39], [54, 54], [47, 55], [45, 40], [35, 40]], 1.2), "#4caf6a")}</g>`;
    A.JONAH = art("0 0 100 200", A.jbody, "jn-jonah");

    // A sailor on the ship's deck (feet on fy), hands up in a panic.
    const sailor = (cx, fy, shirt, band, cls, tall) => {
      const y = fy - 72;
      return `<g class="${cls}" style="transform-box:fill-box;transform-origin:50% 100%">
        ${P(tear([[cx - 9, y + 50], [cx - 2, y + 50], [cx - 2, y + 72], [cx - 10, y + 72]], 0.8), "#3a3550")}
        ${P(tear([[cx + 2, y + 50], [cx + 9, y + 50], [cx + 10, y + 72], [cx + 2, y + 72]], 0.8), "#3a3550")}
        ${P(tear([[cx - 12, y + 31], [cx - 6, y + 28], [cx - 20, y + 7], [cx - 26, y + 11]], 0.8), SKIN2)}
        ${P(tear([[cx + 6, y + 28], [cx + 12, y + 31], [cx + 26, y + 11], [cx + 20, y + 7]], 0.8), SKIN2)}
        ${P(tear([[cx - 13, y + 26], [cx + 13, y + 26], [cx + 15, y + 54], [cx - 15, y + 54]], 1.2), shirt, LIFT)}
        ${P(tear([[cx - 14, y + 37], [cx + 14, y + 37], [cx + 14, y + 41], [cx - 14, y + 41]], 0.5), "rgba(255,250,240,0.6)")}
        ${P(blob(cx, y + 15, 10, 11), SKIN2, LIFT)}
        ${P(tear(tall ? [[cx - 12, y + 9], [cx + 12, y + 9], [cx + 8, y - 10], [cx - 8, y - 10]] : [[cx - 11, y + 10], [cx + 11, y + 10], [cx + 10, y + 3], [cx, y + 1], [cx - 10, y + 3]], 0.8), band)}
        <circle cx="${cx - 4}" cy="${y + 15}" r="2.1" fill="${INK}"/><circle cx="${cx + 4}" cy="${y + 15}" r="2.1" fill="${INK}"/>
        <ellipse cx="${cx}" cy="${y + 22}" rx="2.6" ry="3.4" fill="${INK}"/></g>`;
    };
    const crate = (x, y, s) => P(tear([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], 0.8), "#c68a4a", LIFT) +
      `<path d="M${x + 3} ${y + 3} L${x + s - 3} ${y + s - 3} M${x + s - 3} ${y + 3} L${x + 3} ${y + s - 3}" stroke="#8a5a2b" stroke-width="3"/>`;

    // The ship to Tarshish: sails, crew, a cutaway cabin with Jonah asleep, and a tiny Jonah for the deck.
    A.SHIP = art("0 0 400 300", `
      ${P(tear([[195, 18], [205, 18], [205, 200], [195, 200]], 0.6), "#6b3a1a")}
      ${P(tear([[205, 18], [242, 27], [205, 36]], 1), ROBE)}
      ${P(tear([[207, 34], [207, 180], [326, 180]], 1.6), CREAM, LIFT)}
      ${P(tear([[236, 128], [262, 128], [262, 150], [236, 150]], 0.8), "#e8b04a")}
      ${P(tear([[193, 46], [193, 178], [104, 178]], 1.6), "#e8b04a", LIFT)}
      <g class="lots" style="opacity:0">${P(blob(170, 162, 6, 5), "#c9ccd6", LIFT)}${P(blob(200, 158, 6, 5), "#c9ccd6", LIFT)}
        <g class="lot-j" style="transform-box:fill-box;transform-origin:50% 50%">${P(blob(186, 166, 6.5, 5.5), "#ffd34d", LIFT)}</g></g>
      ${sailor(66, 194, "#4a7bd0", "#ffd34d", "crew c1")}
      ${sailor(118, 194, "#7a4fb0", "#e2574c", "crew c2 captain", true)}
      ${sailor(352, 194, "#4caf6a", CREAM, "crew c3")}
      <g class="cargo">${crate(286, 162, 32)}${crate(320, 176, 20)}</g>
      <g class="deckj" style="opacity:0"><g class="dj" style="transform-box:fill-box;transform-origin:50% 50%"><g transform="translate(237 122) scale(0.36)">${A.jbody}</g></g></g>
      ${P(tear([[14, 192], [386, 192], [350, 288], [54, 288]], 1.8, 12), "#b5652f", LIFT)}
      ${P(tear([[18, 198], [382, 198], [380, 208], [21, 208]], 0.8), "#7d3f17")}
      ${P(tear([[44, 264], [360, 264], [357, 270], [47, 270]], 0.8), "#93501f")}
      ${P(tear([[146, 213], [266, 213], [266, 258], [146, 258]], 1.2), "#3d2410")}
      ${P(blob(206, 236, 52, 19), "#5e3518")}
      ${P(blob(160, 224, 5, 5), "#ffd34d")}
      <g class="sleep" style="opacity:0">
        ${P(tear([[158, 249], [254, 249], [254, 256], [158, 256]], 0.6), "#e8b04a")}
        ${P(tear([[166, 236], [228, 238], [231, 251], [164, 251]], 1), ROBE)}
        ${P(blob(162, 245, 5, 4), SKIN)}
        ${P(blob(238, 240, 10, 10), SKIN)}
        ${P(blob(241, 232, 9, 4.5), HAIR)}
        ${P(tear([[234, 246], [250, 243], [247, 254], [235, 252]], 0.7), HAIR)}
        <path class="s-shut" d="M239 238 q3 2 6 0" stroke="${INK}" stroke-width="1.8" fill="none"/>
        <g class="s-open" style="opacity:0"><circle cx="242" cy="238" r="2" fill="${INK}"/></g>
        <g class="jn-zzz"><text x="252" y="226" font-size="14" fill="${CREAM}" font-family="Patrick Hand, Comic Sans MS, cursive">z</text>
          <text x="261" y="212" font-size="20" fill="${CREAM}" font-family="Patrick Hand, Comic Sans MS, cursive">Z</text></g>
      </g>`, "jn-shipart");

    // The huge fish, facing left. Friendly: big eye, blush, a smile. The jaw hinges at (124, 146).
    A.FISH = art("0 -40 420 300", `
      <g class="jn-tail">${P(tear([[322, 128], [412, 58], [396, 130], [414, 206]], 1.8, 12), TEAL_D, LIFT)}</g>
      ${P(tear([[190, 46], [232, 6], [252, 46]], 1.4), TEAL_D)}
      ${P(tear([[40, 118], [70, 70], [140, 40], [240, 38], [320, 80], [352, 130], [320, 182], [240, 216], [140, 216], [70, 190], [40, 156]], 2, 12), TEAL, LIFT)}
      ${P(tear([[62, 160], [124, 152], [222, 162], [322, 160], [300, 190], [232, 210], [140, 212], [82, 194]], 1.6, 12), TEAL_L)}
      ${P(blob(250, 84, 11, 8), "#3fb3ad")}${P(blob(282, 104, 8, 6), "#3fb3ad")}${P(blob(226, 108, 7, 5), "#3fb3ad")}
      ${P(tear([[196, 150], [254, 138], [238, 184]], 1.2), TEAL_D, LIFT)}
      ${P(tear([[44, 142], [124, 144], [114, 178], [54, 172]], 1.2), "#5a1e36")}
      ${P(blob(82, 168, 18, 6), "#ff8fa3")}
      <g class="jn-jaw" style="transform-box:view-box;transform-origin:124px 146px">
        ${P(tear([[40, 146], [124, 146], [112, 182], [60, 188], [42, 166]], 1.2), TEAL)}
        ${P(tear([[48, 168], [112, 166], [106, 182], [62, 186]], 1), TEAL_L)}
        <path d="M42 147 Q84 158 124 146" stroke="#1d2142" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>
      ${P(blob(144, 130, 13, 7), "#ff8fa3", 'opacity="0.8"')}
      <g class="jn-eye">${P(blob(118, 94, 21, 21), CREAM, LIFT)}${P(blob(111, 96, 10, 10), "#1d2142")}<circle cx="107" cy="91" r="3.4" fill="#fff"/>
        <path d="M100 72 l-4 -8 M112 70 l0 -9 M124 72 l4 -8" stroke="#1d2142" stroke-width="3" stroke-linecap="round"/></g>
      <g class="jn-wink" style="opacity:0"><path d="M98 98 q20 -14 40 0" stroke="#1d2142" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>
      <g class="jn-spout" style="opacity:0">${P(tear([[176, 40], [184, 40], [190, -6], [170, -6]], 1), "#cfe9ff")}
        ${P(blob(160, -16, 9, 7), "#cfe9ff")}${P(blob(180, -26, 11, 8), "#cfe9ff")}${P(blob(200, -16, 9, 7), "#cfe9ff")}</g>`, "jn-fishart");

    // Beams of light from the sky, for when God speaks. (God himself is never drawn.)
    A.RAYS = art("0 0 200 160", `
      ${[-42, -24, -8, 8, 24, 42].map((dx, i) => P(tear([[100 + dx * 0.4 - 4, 14], [100 + dx * 0.4 + 4, 14], [100 + dx * 1.9 + 9, 160], [100 + dx * 1.9 - 9, 160]], 1.4, 12),
        i % 2 ? "#ffe9a0" : "#fff3c4", 'opacity="0.85"')).join("")}
      ${P(blob(100, 18, 62, 17, 0.08), PAPER, LIFT)}${P(blob(70, 22, 28, 12, 0.08), "#fff3c4")}`, "jn-raysart");

    // A person of Nineveh: grumpy at first, then sorry, in scratchy sackcloth.
    const faces = (cx, cy) => `
      <g class="grump"><path d="M${cx - 8} ${cy - 4} l6 2.5 M${cx + 8} ${cy - 4} l-6 2.5" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle cx="${cx - 5}" cy="${cy + 1}" r="1.9" fill="${INK}"/><circle cx="${cx + 5}" cy="${cy + 1}" r="1.9" fill="${INK}"/>
        <path d="M${cx - 5} ${cy + 9} q5 -3.5 10 0" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/></g>
      <g class="sorry" style="opacity:0"><path d="M${cx - 8} ${cy - 1.5} l6 -2.5 M${cx + 8} ${cy - 1.5} l-6 -2.5" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${cx - 7} ${cy + 1} q2.5 2 5 0 M${cx + 2} ${cy + 1} q2.5 2 5 0 M${cx - 4} ${cy + 9} q4 -2 8 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        ${P(blob(cx + 7, cy + 5, 1.5, 2.3), "#7fd1ff")}</g>`;
    const SACK = "#a8834f";
    const stitches = (x, y) => `<path d="M${x} ${y} l4 2 M${x + 10} ${y + 12} l4 -2 M${x + 18} ${y + 24} l3 3 M${x + 2} ${y + 34} l4 -1 M${x + 14} ${y + 44} l4 2" stroke="#7a5a30" stroke-width="1.6" fill="none"/>`;
    A.townie = (robe, wrap, skin) => art("0 0 60 100", `
      ${P(tear([[21, 88], [28, 88], [28, 99], [20, 99]], 0.6), "#3a3550")}${P(tear([[32, 88], [39, 88], [40, 99], [32, 99]], 0.6), "#3a3550")}
      <g class="clothes">${P(tear([[16, 37], [44, 37], [50, 92], [10, 92]], 1.2), robe, LIFT)}
        ${P(tear([[13, 50], [47, 47], [47, 55], [13, 58]], 0.8), wrap, LIFT)}</g>
      <g class="sack" style="opacity:0">${P(tear([[15, 37], [45, 37], [49, 93], [11, 93]], 2), SACK, LIFT)}${stitches(17, 46)}
        ${P(tear([[16, 40], [21, 40], [19, 72], [14, 72]], 0.6), skin)}${P(tear([[39, 40], [44, 40], [46, 72], [41, 72]], 0.6), skin)}</g>
      ${P(blob(30, 24, 12, 13), skin, LIFT)}
      ${P(tear([[17, 21], [21, 10], [30, 7], [39, 10], [43, 21], [30, 15]], 0.8), wrap)}
      ${faces(30, 25)}`, "jn-townie");

    // The king of Nineveh: purple robe and crown, with sackcloth underneath for later.
    A.KING = art("0 0 80 130", `
      ${P(tear([[30, 116], [38, 116], [38, 129], [29, 129]], 0.6), "#3a3550")}${P(tear([[43, 116], [51, 116], [52, 129], [43, 129]], 0.6), "#3a3550")}
      ${P(tear([[20, 46], [60, 46], [66, 120], [14, 120]], 2), SACK, LIFT)}${stitches(26, 60)}
      <g class="robe" style="transform-box:fill-box;transform-origin:50% 100%">
        ${P(tear([[16, 44], [64, 44], [74, 122], [6, 122]], 1.6), "#6b3fa0", LIFT)}
        ${P(tear([[34, 44], [46, 44], [46, 122], [34, 122]], 0.8), "#fffaf0")}
        <circle cx="40" cy="62" r="1.6" fill="${INK}"/><circle cx="40" cy="82" r="1.6" fill="${INK}"/><circle cx="40" cy="102" r="1.6" fill="${INK}"/>
        ${P(tear([[64, 50], [68, 50], [70, 96], [66, 96]], 0.6), GOLD)}${P(blob(67, 48, 5, 5), GOLD)}</g>
      ${P(blob(40, 30, 14, 15), SKIN2, LIFT)}
      ${P(tear([[26, 32], [54, 32], [50, 50], [40, 56], [30, 50]], 1.2), "#2a1a10")}
      ${P(tear([[25, 19], [25, 3], [32, 11], [40, 0], [48, 11], [55, 3], [55, 19]], 0.8), "#ffd34d", LIFT)}
      ${P(blob(40, 13, 2.6, 2.6), ROBE)}
      ${faces(40, 28)}`, "jn-kingart");

    A.HEART = art("0 0 40 36", P(tear([[20, 34], [4, 18], [2, 9], [9, 3], [16, 4], [20, 10], [24, 4], [31, 3], [38, 9], [36, 18]], 0.8, 6), "#ff7a9a", LIFT));

    /* The static backdrop: sky, Nineveh, the road, the signpost. Drawn once; nothing in it moves. */
    const wall = [[30, 400], [30, 300]];
    for (let x = 30; x < 520; x += 24) wall.push([x, 300], [x, 288], [x + 12, 288], [x + 12, 300]);
    wall.push([520, 300], [520, 400]);
    const tower = (x, top, w) => {
      const pts = [[x, 400], [x, top]];
      for (let i = 0; i < 4; i++) pts.push([x + (i * w) / 4, top - 12], [x + ((i + 0.5) * w) / 4, top - 12], [x + ((i + 0.5) * w) / 4, top]);
      pts.push([x + w, top], [x + w, 400]);
      return P(tear(pts, 1.2), "#c48a4e", LIFT_BG) +
        P(tear([[x + w / 2 - 6, top + 22], [x + w / 2 + 6, top + 22], [x + w / 2 + 6, top + 40], [x + w / 2 - 6, top + 40]], 0.6), "#6b3e1f") +
        P(tear([[x + w / 2, top - 12], [x + w / 2 + 2, top - 12], [x + w / 2 + 2, top - 44], [x + w / 2, top - 44]], 0.4), "#6b3a1a") +
        P(tear([[x + w / 2 + 2, top - 44], [x + w / 2 + 26, top - 37], [x + w / 2 + 2, top - 30]], 0.8), x % 2 ? GOLD : ROBE);
    };
    const palm = (x, y, s) => P(tear([[x - 3 * s, y], [x + 3 * s, y], [x + 6 * s, y - 70 * s], [x + 1 * s, y - 70 * s]], 1), "#8a5a33", LIFT_BG) +
      [[-34, -8], [-26, 10], [30, -10], [26, 12], [2, -26]].map(([dx, dy]) =>
        P(tear([[x + 3 * s, y - 72 * s], [x + (3 + dx) * s, y - (72 - dy) * s], [x + (3 + dx * 0.6) * s, y - (78 - dy * 0.5) * s]], 1.2), "#4caf6a", LIFT_BG)).join("");
    const cloud = (cx, cy, s) => {
      let d = "";
      for (let i = 0; i < 4; i++) d += blob(cx + (i - 1.5) * 30 * s, cy - (i % 2) * 8 * s, (26 + rnd() * 12) * s, (18 + rnd() * 6) * s, 0.06) + " ";
      return P(d, PAPER, LIFT_BG);
    };
    const hills = (y, amp, color, x1) => {
      let d = `M-20 520 L-20 ${y}`;
      for (let x = -20; x < x1; x += 110) d += ` Q${x + 55} ${f1(y - amp - rnd() * 20)} ${x + 110} ${y} l${f1(rnd() * 4 - 2)} ${f1(rnd() * 4 - 2)}`;
      return P(d + ` L${x1 + 110} 520 Z`, color, LIFT_BG);
    };
    A.BG = `<svg class="sp-bg" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="paperLift" x="-10%" y="-10%" width="125%" height="130%"><feDropShadow dx="1.2" dy="2.2" stdDeviation="0.5" flood-color="#0b0f24" flood-opacity="0.35"/></filter>
        <filter id="paperLiftBg" x="-10%" y="-10%" width="125%" height="135%"><feDropShadow dx="3" dy="5" stdDeviation="1.4" flood-color="#0b0f24" flood-opacity="0.32"/></filter>
        <clipPath id="paperSeaClip"><path d="M870 440 L940 336 L1700 300 L1700 520 L870 520 Z"/></clipPath>
        <clipPath id="paperFrontClip"><path d="M930 470 L990 380 L1700 360 L1700 520 L930 520 Z"/></clipPath>
      </defs>
      <rect width="1600" height="500" fill="#9fd3df"/>
      ${P(tear([[-10, 150], [1610, 130], [1610, 500], [-10, 500]], 3, 40), "#b6dfe6")}
      ${P(tear([[-10, 250], [1610, 232], [1610, 500], [-10, 500]], 3, 40), "#cbe8e8")}
      ${P(blob(140, 78, 38, 38, 0.03), "#ffcf5a", LIFT_BG)}${P(blob(140, 78, 26, 26, 0.03), "#ffe08a")}
      ${cloud(420, 90, 1)}${cloud(860, 60, 1.2)}${cloud(1240, 100, 0.9)}${cloud(1500, 56, 0.8)}
      ${hills(330, 30, "#b5d98a", 1000)}${hills(362, 22, "#9cc46a", 960)}
      ${P(tear([[300, 400], [300, 320], [320, 320], [320, 288], [342, 288], [342, 256], [364, 256], [364, 226], [436, 226], [436, 256], [458, 256], [458, 288], [480, 288], [480, 320], [500, 320], [500, 400]], 1.4, 12), "#cf9459", LIFT_BG)}
      ${P(tear([[388, 226], [412, 226], [412, 206], [388, 206]], 0.8), "#b97a45", LIFT_BG)}
      ${P(tear(wall, 1.4, 12), "#d9a86c", LIFT_BG)}
      ${P(tear([[30, 352], [520, 352], [520, 360], [30, 360]], 1, 20), "#c48a4e")}
      ${tower(40, 246, 50)}${tower(196, 236, 56)}${tower(470, 250, 50)}
      ${P(tear([[262, 400], [262, 336], [272, 322], [290, 318], [308, 322], [318, 336], [318, 400]], 1), "#6b3e1f")}
      ${[100, 140, 380, 420].map((x) => P(tear([[x, 316], [x + 12, 316], [x + 12, 334], [x, 334]], 0.6), "#6b3e1f")).join("")}
      ${palm(14, 396, 1.1)}${palm(548, 398, 1.3)}${palm(626, 400, 0.9)}
      ${P(tear([[-10, 392], [910, 394], [900, 520], [-10, 520]], 2.2, 14), "#8fbf5a", LIFT_BG)}
      ${P(tear([[-10, 440], [900, 446], [900, 520], [-10, 520]], 2.2, 14), "#7aab4a")}
      ${P(tear([[60, 382], [160, 382], [164, 396], [56, 396]], 1, 12), "#b97a45", LIFT_BG)}
      ${P(tear([[74, 370], [146, 370], [150, 384], [70, 384]], 1, 12), "#cf9459", LIFT_BG)}
      ${P(tear([[676, 300], [686, 300], [686, 398], [676, 398]], 0.8), "#8a5a33", LIFT_BG)}
      ${P(tear([[600, 300], [672, 300], [672, 330], [600, 330], [584, 315]], 1), CREAM, LIFT_BG)}
      ${P(tear([[690, 338], [766, 338], [782, 353], [766, 368], [690, 368]], 1), "#ffe08a", LIFT_BG)}
      <g font-family="Patrick Hand, Comic Sans MS, cursive" font-size="19" fill="${INK}" text-anchor="middle">
        <text x="632" y="322">NINEVEH</text><text x="732" y="360">TARSHISH</text></g>
    </svg>`;

    /* The sea, cut in strips. Its own small SVGs, so the stepping waves only repaint the sea, not the whole backdrop. */
    A.SEA_BACK = `<svg class="jn-sea" viewBox="700 0 900 500" preserveAspectRatio="none" aria-hidden="true">
      <path d="M870 440 L940 352 L1700 340 L1700 520 L870 520 Z" fill="#244f8e"/>
      <g clip-path="url(#paperSeaClip)">${wave(352, 22, "#3a5fa8", "b", 860, 1700)}${wave(380, 26, "#2b7fb8", "a", 860, 1700)}</g>
      ${P(tear([[760, 398], [900, 398], [1010, 452], [1010, 520], [760, 520]], 2, 14), "#ecd08f", LIFT_BG)}
      ${P(tear([[800, 450], [960, 460], [1000, 520], [800, 520]], 2, 14), "#e0bd72")}
      ${P(tear([[862, 330], [868, 330], [868, 470], [862, 470]], 0.8), "#7d4f2a")}
      ${[915, 965].map((x) => P(tear([[x - 4, 372], [x + 4, 372], [x + 4, 470], [x - 4, 470]], 0.8), "#7d4f2a")).join("")}
      ${P(tear([[848, 362], [978, 362], [978, 376], [848, 376]], 1.2), "#a8743a", LIFT_BG)}
      ${P(tear([[836, 306], [896, 306], [896, 330], [836, 330]], 1), CREAM, LIFT_BG)}
      <text x="866" y="324" font-family="Patrick Hand, Comic Sans MS, cursive" font-size="17" fill="${INK}" text-anchor="middle">JOPPA</text>
    </svg>`;
    A.SEA_FRONT = `<svg class="jn-sea" viewBox="700 0 900 500" preserveAspectRatio="none" aria-hidden="true">
      <g clip-path="url(#paperFrontClip)">${wave(428, 22, "#1f4f8a", "c", 920, 1700)}${wave(468, 16, "#173d6e", "b", 920, 1700)}</g>
    </svg>`;

    /* The storm: a dark sky that fades in over the sea, cut-paper storm clouds, and a lightning bolt. */
    let storm = "";
    for (const [cx, cy, s] of [[930, 70, 1.1], [1120, 50, 1.4], [1330, 80, 1.2], [1530, 46, 1]]) {
      let d = "";
      for (let i = 0; i < 5; i++) d += blob(cx + (i - 2) * 34 * s, cy + (i % 2) * 10, (28 + rnd() * 14) * s, (20 + rnd() * 6) * s, 0.06) + " ";
      storm += P(d, "#5d6c9e", LIFT_BG);
    }
    A.STORM = `<svg viewBox="640 0 960 500" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="paperStormFade" x1="640" x2="820" y1="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#2d3a6b" stop-opacity="0"/><stop offset="1" stop-color="#2d3a6b"/></linearGradient></defs>
      <rect x="640" y="0" width="960" height="420" fill="url(#paperStormFade)"/>${storm}
    </svg>`;
    A.BOLT = `<svg viewBox="0 0 100 220" aria-hidden="true">${P("M62 0 L22 100 L54 100 L10 220 L104 78 L66 78 L98 0 Z", "#ffd34d", LIFT_BG)}</svg>`;

    /* Inside the fish: a pink paper cave with ribs, seaweed, a puddle and an old boot. */
    const arch = (cx, cy, R, w) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const a = Math.PI + (i / 12) * Math.PI; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9]); }
      for (let i = 12; i >= 0; i--) { const a = Math.PI + (i / 12) * Math.PI; pts.push([cx + Math.cos(a) * (R - w), cy + Math.sin(a) * (R - w) * 0.9]); }
      return tear(pts, 2, 14);
    };
    let ribs = "";
    [[520, "#b44b6b"], [440, "#c95c7c"], [360, "#d9708a"]].forEach(([R, c]) => { ribs += P(arch(400, 520, R, 30), c, LIFT_BG); });
    let floor = "M-20 520 L-20 430";
    for (let x = -20; x < 820; x += 60) floor += ` Q${x + 30} ${f1(410 - rnd() * 16)} ${x + 60} 430`;
    A.BELLY = `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="800" height="500" fill="#5a1e36"/>
      ${P(blob(400, 250, 420, 230, 0.04), "#7a2f4a")}
      ${ribs}
      ${[90, 210, 610, 720].map((x, i) => P(tear([[x - 8, -10], [x + 8, -10], [x + 14 + (i % 2) * 6, 110 + i * 14], [x + 2, 130 + i * 14], [x - 6, 96]], 1.6), "#4caf6a", LIFT_BG)).join("")}
      ${P(floor + " L820 520 Z", "#3d1226", LIFT_BG)}
      ${P(blob(250, 462, 120, 18), "#2b7fb8")}${P(blob(230, 458, 60, 6), "#7fd1ff")}
      ${P(tear([[620, 420], [646, 420], [646, 446], [676, 452], [676, 466], [620, 466]], 1), "#6b4a2a", LIFT_BG)}
      ${P(tear([[122, 446], [130, 430], [138, 446], [154, 448], [142, 458], [146, 474], [130, 466], [114, 474], [118, 458], [106, 448]], 0.8, 6), "#ff9a6a", LIFT_BG)}
      <g class="jn-bubs" fill="#fbd3df" opacity="0.6">${P(blob(150, 300, 9, 9))}${P(blob(660, 260, 12, 12))}${P(blob(560, 340, 7, 7))}${P(blob(240, 200, 6, 6))}</g>
    </svg>`;
    return A;
  }

  /* ---------- The scene ---------- */
  async function jonahStory(D) {
    const W = D.world, F = D.frame;
    const A = draw();
    // Layers, back to front: backdrop · storm sky · back sea strips · the actors · front sea strips · rain.
    W.insertAdjacentHTML("afterbegin", A.BG);
    const storm = el("div", { class: "jn-storm" });
    storm.innerHTML = A.STORM;
    const bolt = el("div", { class: "jn-bolt" });
    bolt.innerHTML = A.BOLT;
    storm.append(bolt);
    W.append(storm);
    W.insertAdjacentHTML("beforeend", A.SEA_BACK);

    const crowd = [["#e2574c", "#ffd34d", SKIN2], ["#4a7bd0", CREAM, SKIN], ["#4caf6a", "#e2574c", "#a8693d"], ["#f2b33d", "#7a4fb0", SKIN],
      ["#7a4fb0", "#4caf6a", SKIN2], ["#e8823a", "#4a7bd0", "#a8693d"]]
      .map(([r, w, s], i) => D.actor(A.townie(r, w, s), { x: 11 + i * 3.6, y: 18 + (i % 2) * 1.5, h: 15 + (i % 3), cls: "jn-person" }));
    const king = D.actor(A.KING, { x: 6.8, y: 25, h: 21, cls: "jn-king" });
    const heaven = D.actor(A.RAYS, { x: 50.5, y: 50, h: 34, cls: "jn-rays", hidden: true });
    const fish = D.actor(A.FISH, { x: 86, y: -46, h: 44, cls: "jn-fish", hidden: true });
    const ship = D.actor(A.SHIP, { x: 69, y: 14, h: 42, cls: "jn-ship" });
    const fallJ = D.actor(A.JONAH, { x: 80, y: 30, h: 10.4, hidden: true });
    const jonah = D.actor(A.JONAH, { x: 50.5, y: 18.5, h: 26, cls: "jn-main" });
    W.insertAdjacentHTML("beforeend", A.SEA_FRONT);
    const rain = el("div", { class: "jn-rainbox" }, el("div", { class: "jn-rain" }));
    W.append(rain);
    // Paper grain over the whole picture (a static texture, so it costs nothing per frame).
    const overlay = F.querySelector(".sp-overlay");
    const grain = el("div", { class: "jn-grain" });
    F.insertBefore(grain, overlay);

    const q = (a, sel) => a.querySelector(sel);
    const qa = (a, sel) => a.querySelectorAll(sel);
    const show = (node, on) => { node.style.opacity = on ? "1" : "0"; };
    /** Jump an actor to a new spot without animating. */
    const place = (a, x, y) => { a._x = x; a._y = y; a.style.left = x + "%"; a.style.bottom = y + "%"; };
    /** Jonah's poses: arms down, or hands together to pray. */
    const pray = (a, on) => { qa(a, ".jn-arms").forEach((g) => show(g, !on)); show(q(a, ".jn-pray"), on); };
    const hop = (a, ms) => D.anim(a, [{ transform: "translateY(0)" }, { transform: "translateY(-18%)" }, { transform: "translateY(0)" }], { duration: ms || 420, easing: "steps(4)" });
    const jaw = (open, ms) => D.to(q(fish, ".jn-jaw"), "transform", open ? "rotate(0deg)" : "rotate(-34deg)", open ? "rotate(-34deg)" : "rotate(0deg)", { duration: ms || 400, easing: "steps(4)" });
    const crew = qa(ship, ".crew");
    const shiver = () => crew.forEach((c, i) => D.loop(c, [{ transform: "translateX(-2px)" }, { transform: "translateX(2px)" }], { duration: 160 + i * 30, direction: "alternate", easing: "steps(2)" }));

    const beats = [];
    const beat = (fn) => beats.push(fn);
    const clearBursts = () => F.querySelectorAll(".sp-burst").forEach((b) => b.remove());

    beat(async () => {
      await D.cam(0.46, 0.55, 1.1, 1);
      THP.Music.play("manna");
      await D.card("Story Scene 2", "WRONG WAY, JONAH", "Jonah and the Big Fish · Jonah 1–3", 1600);
    });
    beat(async () => {
      await D.narrate("Meet Jonah. He's a prophet, and God just gave him a job.", 700);
      D.sfx("whoosh");
      D.to(heaven, "opacity", "0", "1", { duration: 700, easing: "steps(5)" });
      D.loop(heaven, [{ transform: "translateY(0)" }, { transform: "translateY(-2%)" }], { duration: 1400, direction: "alternate", easing: "steps(3)" });
      D.anim(q(jonah, ".jn-eyes"), [{ transform: "translate(0, 0)" }, { transform: "translate(1px, -2px)" }], { duration: 300, easing: "steps(2)", fill: "forwards" });
      await D.bubble(heaven, 100, 30, "The LORD", "Go to the great city of Nineveh and preach against it.");
      await D.narrate("But Nineveh was full of wicked people. Jonah did NOT want to go.", 2200);
    });
    beat(async () => {
      D.to(heaven, "opacity", "1", "0", { duration: 500, easing: "steps(4)" });
      // A puppet double-take: look toward Nineveh, then the other way, then Nineveh again.
      for (const flip of [true, false, true, false]) { jonah.classList.toggle("flee", flip); D.sfx("tick"); await D.wait(340); }
      await D.bubble(jonah, 60, 22, "Jonah", "Nineveh? Nope. Nope, nope, nope.", { hold: 2000 });
      await Promise.all([
        D.cam(0.57, 0.55, 1.1, 1800),
        D.narrate("So Jonah ran the other way! He went down to Joppa and found a ship heading for Tarshish.", 400),
        D.move(jonah, 58, 27, 3400, { steps: 8, bob: 4, tilt: 3, easing: "steps(16)", onStep: () => D.sfx("step") }),
      ]);
      D.sfx("step");
      await hop(jonah, 360);
      show(q(ship, ".sleep"), true);
      await D.to(jonah, "opacity", "1", "0", { duration: 300, easing: "steps(3)" });
    });
    beat(async () => {
      D.loop(q(ship, ".jn-zzz"), [{ transform: "translate(0, 0)", opacity: 1 }, { transform: "translate(6px, -14px)", opacity: 0.2 }], { duration: 1600, easing: "steps(4)" });
      await Promise.all([
        D.cam(0.76, 0.5, 1, 1600),
        D.move(ship, 74, 14, 2600, { easing: "steps(12)" }),
        D.narrate("He went below deck, and off they sailed. Bye-bye, Nineveh!", 100),
      ]);
      THP.Music.play("redsea");
      W.classList.add("jn-stormy");
      D.to(storm, "opacity", "0", "1", { duration: 900, easing: "steps(5)" });
      D.sfx("impact"); D.shake(1.6);
      shiver();
      await D.narrate("But the LORD sent a great wind on the sea. The ship was about to break apart!", 500);
      D.sfx("whoosh");
      const say = D.narrate("The sailors were terrified. Overboard went the cargo!", 1200);
      await D.anim(q(ship, ".cargo"), [{ transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
        { transform: "translate(70px, -50px) rotate(60deg)", opacity: 1, offset: 0.5 }, { transform: "translate(130px, 90px) rotate(140deg)", opacity: 0 }],
      { duration: 900, easing: "steps(8)", fill: "forwards" });
      q(ship, ".cargo").style.opacity = "0";
      D.sfx("impact");
      await say;
    });
    beat(async () => {
      shiver();
      const c = D.point(ship, 206, 225);
      await D.cam(c.wx / 100, 1 - c.wy / 100 - 0.06, 1.8, 1200);
      await D.narrate("And Jonah? Below deck, fast asleep. Snoring right through the storm!", 500);
      D.sfx("tap");
      D.anim(q(ship, ".captain"), [0, 1, 2, 3].map((i) => ({ transform: `translateY(${i % 2 ? -8 : 0}px)` })), { duration: 500, easing: "steps(4)" });
      await D.bubble(ship, 118, 116, "The captain", "How can you sleep? Get up and call on your god!", { cls: "loud" });
    });
    beat(async () => {
      shiver();
      show(q(ship, ".sleep"), false);
      show(q(ship, ".deckj"), true);
      await Promise.all([D.cam(0.75, 0.5, 1.4, 1000), D.narrate("The sailors cast lots to find out who was to blame. And the lot fell on…", 100)]);
      const lots = q(ship, ".lots");
      show(lots, true);
      for (let i = 0; i < 2; i++) {
        D.sfx("tick");
        await D.anim(lots, [{ transform: "translateY(0)" }, { transform: "translateY(-26px)" }, { transform: "translateY(0)" }], { duration: 340, easing: "steps(4)" });
      }
      D.sfx("wrong");
      await D.anim(q(ship, ".lot-j"), [{ transform: "translate(0, 0) scale(1)" }, { transform: "translate(70px, -52px) scale(1.7)" }], { duration: 500, easing: "steps(5)", fill: "forwards" });
      const jp = D.point(ship, 256, 100);
      D.sfx("impact");
      await D.burst("JONAH!", Math.min(84, jp.fx), Math.max(16, jp.fy - 6));
      await D.wait(500);
      clearBursts();
      show(lots, false);
      await D.bubble(ship, 256, 126, "Jonah", "I worship the LORD, the God of heaven, who made the sea and the dry land.", { hold: 3300 });
      await D.bubble(ship, 256, 126, "Jonah", "Pick me up and throw me into the sea, and it will become calm.", { hold: 3500 });
    });
    beat(async () => {
      shiver();
      await Promise.all([D.cam(0.76, 0.5, 1.1, 900), D.narrate("The sailors rowed hard for land, but it was no use. So at last…", 100)]);
      D.sfx("whoosh");
      await D.anim(q(ship, ".dj"), [{ transform: "translate(0, 0) rotate(0deg)" }, { transform: "translate(10px, -40px) rotate(-20deg)", offset: 0.4 },
        { transform: "translate(80px, -10px) rotate(200deg)" }], { duration: 600, easing: "steps(6)", fill: "forwards" });
      const from = D.point(ship, 336, 118);
      show(q(ship, ".deckj"), false);
      place(fallJ, from.wx, from.wy - 5);
      show(fallJ, true);
      const sx = from.wx + 4, sy = 20;
      await D.anim(fallJ, [
        { left: from.wx + "%", bottom: from.wy - 5 + "%", transform: "rotate(200deg)" },
        { left: from.wx + 2 + "%", bottom: from.wy + 2 + "%", transform: "rotate(300deg)" },
        { left: sx + "%", bottom: sy + "%", transform: "rotate(540deg)" },
      ], { duration: 800, easing: "steps(8)" });
      place(fallJ, sx, sy);
      const sp = D.point(fallJ, 50, 120);
      D.sfx("impact"); D.shake(1);
      D.burst("SPLOOSH!", Math.min(84, sp.fx), Math.max(16, sp.fy - 10));
      W.classList.remove("jn-stormy");
      D.to(storm, "opacity", "1", "0", { duration: 1200, easing: "steps(6)" });
      D.loop(fallJ, [{ transform: "translateY(0)" }, { transform: "translateY(-8%)" }], { duration: 900, direction: "alternate", easing: "steps(3)" });
      await D.narrate("SPLOOSH! And the raging sea grew calm. Just like that.", 1800);
    });
    beat(async () => {
      THP.Music.play("manna");
      // The ship sails off toward the horizon: it shrinks and fades in steps, so it never crosses Jonah.
      D.move(ship, 70, 26, 2400, { easing: "steps(8)" });
      D.anim(ship, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.35)", opacity: 0 }], { duration: 2400, easing: "steps(8)", fill: "forwards" });
      D.loop(fallJ, [{ transform: "translateY(0)" }, { transform: "translateY(-8%)" }], { duration: 900, direction: "alternate", easing: "steps(3)" });
      place(fish, fallJ._x + 6.9, -46);
      show(fish, true);
      await D.cam(0.8, 0.56, 1.15, 1000);
      D.sfx("whoosh");
      await Promise.all([D.narrate("Then the LORD provided a huge fish to swallow Jonah.", 200), D.move(fish, fish._x, 8, 1300, { easing: "steps(7)" })]);
      await jaw(true);
      const m = D.point(fish, 80, 152);
      D.sfx("whoosh");
      await D.anim(fallJ, [{ left: fallJ._x + "%", bottom: fallJ._y + "%", scale: 1, opacity: 1 }, { left: m.wx + "%", bottom: m.wy - 4 + "%", scale: 0.4, opacity: 0 }], { duration: 600, easing: "steps(5)", fill: "forwards" });
      show(fallJ, false);
      await jaw(false, 300);
      D.sfx("impact"); D.shake(1);
      const fp = D.point(fish, 120, 40);
      D.burst("GULP!", Math.min(84, fp.fx), Math.max(16, fp.fy - 8));
      show(q(fish, ".jn-eye"), false); show(q(fish, ".jn-wink"), true);
      await D.narrate("GULP! Don't worry. That fish wasn't lunch. It was God's rescue boat!", 1900);
      show(q(fish, ".jn-eye"), true); show(q(fish, ".jn-wink"), false);
    });
    beat(async () => {
      // Inside the fish: a cut-away "belly" panel that irises open over the picture.
      const belly = el("div", { class: "jn-belly" });
      belly.innerHTML = A.BELLY;
      const bj = el("div", { class: "jn-bellyj" });
      bj.innerHTML = A.JONAH;
      const day = el("div", { class: "jn-day" }, "Day 1");
      belly.append(bj, day);
      F.insertBefore(belly, grain);
      F._jnBelly = belly;
      D.loop(q(belly, ".jn-bubs"), [{ transform: "translateY(0)" }, { transform: "translateY(-30px)" }], { duration: 2400, easing: "steps(6)" });
      D.sfx("whoosh");
      await D.anim(belly, [{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }], { duration: 700, easing: "steps(7)" });
      const days = (async () => {
        for (const n of [2, 3]) { await D.wait(1600); day.textContent = "Day " + n; D.sfx("flip"); D.anim(day, [{ scale: 1.4 }, { scale: 1 }], { duration: 300, easing: "steps(3)" }); }
      })();
      await D.narrate("Three days and three nights inside the fish. Dark. Squishy. Smells like old tuna.", 200);
      await days;
      pray(bj, true);
      show(q(bj, ".jn-eyes"), false); show(q(bj, ".jn-shut"), true);
      await D.narrate("And right there, inside the fish, Jonah prayed.", 400);
      D.sfx("correct");
      await D.bubble(bj, 52, 26, "Jonah", "Salvation comes from the LORD.", { hold: 2400 });
    });
    beat(async () => {
      const belly = F._jnBelly;
      await D.anim(belly, [{ clipPath: "circle(75% at 50% 50%)" }, { clipPath: "circle(0% at 50% 50%)" }], { duration: 600, easing: "steps(6)", fill: "forwards" });
      belly.remove();
      place(fish, 84, 8);
      await Promise.all([
        D.cam(0.6, 0.55, 1.05, 1200),
        D.narrate("Then the LORD commanded the fish, and it spat Jonah out onto dry land.", 0),
        D.move(fish, 70, 8, 2600, { easing: "steps(12)" }),
      ]);
      await jaw(true, 300);
      const m = D.point(fish, 60, 150);
      place(jonah, m.wx, m.wy - 10);
      jonah.classList.add("flee");
      show(q(jonah, ".jn-weed"), true);
      show(jonah, true);
      D.sfx("whoosh");
      D.burst("PTOOEY!", Math.min(84, m.fx + 4), Math.max(16, m.fy - 22));
      await D.anim(jonah, [
        { left: m.wx + "%", bottom: m.wy - 10 + "%", transform: "scale(0.4) rotate(0deg)" },
        { left: (m.wx + 52) / 2 + "%", bottom: 46 + "%", transform: "scale(0.8) rotate(-200deg)" },
        { left: "52%", bottom: "18.5%", transform: "scale(1) rotate(-360deg)" },
      ], { duration: 1100, easing: "steps(10)" });
      place(jonah, 52, 18.5);
      D.sfx("impact"); D.shake(1.2);
      jaw(false, 300);
      await D.wait(800);
    });
    beat(async () => {
      THP.Music.play("jericho");
      D.move(fish, 96, 8, 3000, { easing: "steps(10)" }); // the fish heads home
      await Promise.all([
        D.cam(0.22, 0.55, 1.05, 2800),
        D.narrate("God gave Jonah a second chance: go to Nineveh. And this time? Jonah went.", 200),
        D.move(jonah, 34, 18.5, 3000, { steps: 8, bob: 4, tilt: 3, easing: "steps(16)", onStep: () => D.sfx("step") }),
      ]);
      crowd.forEach((p, i) => D.anim(p, [{ transform: "rotate(0deg)" }, { transform: "rotate(-6deg)" }, { transform: "rotate(0deg)" }], { duration: 500, delay: i * 60, easing: "steps(3)" }));
      await D.bubble(jonah, 60, 22, "Jonah", "Forty more days and Nineveh will be overthrown!", { cls: "loud" });
    });
    beat(async () => {
      const say = D.narrate("And then, amazing! The people of Nineveh believed God!", 300);
      for (const p of crowd) {
        await D.wait(260);
        D.sfx("flip");
        show(q(p, ".clothes"), false); show(q(p, ".sack"), true); show(q(p, ".grump"), false); show(q(p, ".sorry"), true);
        hop(p, 300);
      }
      await say;
      await Promise.all([D.cam(0.13, 0.5, 1.4, 1000), D.narrate("They all put on scratchy sackcloth to show they were sorry. Even the king!", 100)]);
      D.sfx("whoosh");
      await D.anim(q(king, ".robe"), [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(40%)", opacity: 0 }], { duration: 600, easing: "steps(5)", fill: "forwards" });
      show(q(king, ".robe"), false); show(q(king, ".grump"), false); show(q(king, ".sorry"), true);
      D.sfx("crumble");
      await D.move(king, 6.8, 21, 500, { easing: "steps(3)" });
      await D.bubble(king, 40, 4, "The king", "Let everyone call urgently on God. Let them give up their evil ways.", { hold: 3800 });
    });
    beat(async () => {
      THP.Music.play("strut");
      place(heaven, 18, 46);
      place(fish, 72, -46);
      show(fish, true);
      await Promise.all([D.cam(0.4, 0.5, 0.68, 1600), D.to(heaven, "opacity", "0", "1", { duration: 800, easing: "steps(5)" })]);
      D.sfx("win");
      if (!D.rushing && !REDUCED()) THP.ui.confetti(120);
      crowd.forEach((p, i) => D.loop(p, [{ transform: "translateY(0)" }, { transform: "translateY(-14%)" }, { transform: "translateY(0)" }], { duration: 480, delay: i * 70, easing: "steps(3)" }));
      for (let i = 0; i < 8; i++) {
        const h = D.actor(A.HEART, { x: 5 + i * 3.6, y: 34 + (i % 3) * 4, h: 6 + (i % 2) });
        D.anim(h, [{ bottom: h._y + "%", opacity: 0 }, { opacity: 1, offset: 0.2 }, { bottom: h._y + 40 + "%", opacity: 0 }], { duration: 3000, delay: i * 260, easing: "steps(10)", fill: "forwards" });
      }
      (async () => {
        await D.move(fish, 72, 6, 1000, { easing: "steps(6)" });
        show(q(fish, ".jn-spout"), true);
        D.loop(q(fish, ".jn-spout"), [{ transform: "translateY(0)" }, { transform: "translateY(-12px)" }], { duration: 500, direction: "alternate", easing: "steps(2)" });
      })();
      await D.narrate("God saw them turn from their evil ways, and he had compassion on them.", 900);
      await D.narrate("Jonah ran from God. But nobody can outrun God's mercy.", 2600);
    });

    for (const b of beats) {
      D.next();
      await b();
    }
    D.next();
  }

  THP.Scenes.define("s2", {
    title: "Wrong Way, Jonah", sub: "Jonah and the Big Fish", ref: "Jonah 1–3", icon: "🐋",
    lesson: "You can run from God, but you can't outrun his mercy.",
    verse: ["Salvation comes from the LORD.", "Jonah 2:9"],
    play: jonahStory,
  });
})();
