/* Story Scene 3: Daniel in the Lions' Den (Daniel 6), drawn as an 8-bit video game.
   Every sprite is a grid of letters. Each letter is one color from a small palette and becomes a crisp SVG rect.
   A sprite has "poses" (idle, walk, pray…), and each pose loops four frames with a CSS steps() animation
   (see css/stories/daniel.css). The world is one long 320×100 pixel strip: palace, Daniel's house, the den. */
(function () {
  const { el } = THP.ui;

  /* ---------- Palette: one letter per color ---------- */
  const PAL = {
    k: "#12102a", e: "#12102a", w: "#f4f4ff", g: "#b8b4d0", s: "#e0a872", S: "#b07040",
    R: "#3b6fd1", r: "#24459a", P: "#8e3fc9", p: "#5a2290", Y: "#ffd84d", y: "#d9902a",
    G: "#4caf50", q: "#23703a", O: "#e07a2a", o: "#9a4a1a", B: "#8a5a2b", b: "#4a2a12",
    x: "#e8433a", M: "#b8561f", T: "#e0a848", F: "#f6d28a", t: "#9a5a1e", W: "#9fd8ff",
    n: "#9a94b8", N: "#6a6488", m: "#454066",
  };

  /** Rows of letters → SVG rects, one rect per run of the same color. "." is see-through. */
  function rects(rows, ox, oy) {
    let out = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        const c = row[x];
        let n = 1;
        while (row[x + n] === c) n++;
        if (PAL[c]) out += `<rect x="${x + (ox || 0)}" y="${y + (oy || 0)}" width="${n}" height="1" fill="${PAL[c]}"/>`;
        x += n;
      }
    });
    return out;
  }
  /** Copy a frame with some rows replaced: edit(rows, { 19: "...", 20: "..." }). */
  const edit = (rows, changes) => rows.map((r, i) => (changes[i] != null ? changes[i] : r));
  /** Swap colors: recolor(rows, { G: "O" }). */
  const recolor = (rows, map) => rows.map((r) => [...r].map((c) => map[c] || c).join(""));
  /** Set single pixels: dots(rows, [[x, y, "t"], ...]). */
  const dots = (rows, list) => {
    const a = rows.map((r) => [...r]);
    list.forEach(([x, y, c]) => { while (a[y].length <= x) a[y].push("."); a[y][x] = c; });
    return a.map((r) => r.join(""));
  };

  /** A sprite: { pose: [frame, frame, ...] }. Frames are bottom-aligned and centered in one viewBox.
      One frame = a still pose; two frames play a-b-a-b; four play in order. */
  function sprite(poses, o) {
    o = o || {};
    const list = Object.entries(poses);
    const frames = list.flatMap(([, fr]) => fr);
    const W = Math.max(...frames.map((f) => Math.max(...f.map((r) => r.length))));
    const H = Math.max(...frames.map((f) => f.length));
    const fit = (f) => {
      const fw = Math.max(...f.map((r) => r.length)), l = ".".repeat(Math.floor((W - fw) / 2));
      return Array(H - f.length).fill("").concat(f.map((r) => l + r));
    };
    const body = list.map(([name, fr], i) => {
      const t = o.speed && o.speed[name] ? ` style="--px-t:${o.speed[name]}"` : "";
      const inner = fr.length === 1 ? rects(fit(fr[0]))
        : `<g class="px-frames"${t}>${[0, 1, 2, 3].map((k) => `<g>${rects(fit(fr[k % fr.length]))}</g>`).join("")}</g>`;
      return `<g class="px-pose" data-pose="${name}"${i ? ' style="display:none"' : ""}>${inner}</g>`;
    }).join("");
    const vb = o.pad ? `${-o.pad} ${-o.pad} ${W + 2 * o.pad} ${H + 2 * o.pad}` : `0 0 ${W} ${H}`;
    return { W, H: H + 2 * (o.pad || 0), ox: o.pad || 0,
      html: `<svg viewBox="${vb}" shape-rendering="crispEdges" class="px-sprite" aria-hidden="true">${o.under || ""}${body}</svg>` };
  }

  /* ---------- Cast ---------- */
  // Daniel: an old man by now (about 80), white hair and beard, blue robe.
  const DAN = [
    "....wwww....",
    "...wwwwww...",
    "..wwsssssw..",
    "..wssesses..",
    "..wsssssss..",
    "..wwwsswww..",
    "...wwwwwww..",
    "....wwwww...",
    ".....www....",
    "...RRwwRR...",
    "..RRRRRRRR..",
    "..RRRRRRRR..",
    ".sRRRRRRRRs.",
    ".sRyyyyyyRs.",
    "..RRRRRRRR..",
    "..RRRRRRRR..",
    "..rRRRRRRr..",
    "..rRRRRRRr..",
    "..rrRRRRrr..",
    "..rrrrrrrr..",
    "...bb..bb...",
  ];
  const DAN_WALK = [
    DAN,
    edit(DAN, { 12: ".sRRRRRRRR..", 13: "..RyyyyyyRs.", 20: "..bb....bb.." }),
    DAN,
    edit(DAN, { 12: "..RRRRRRRRs.", 13: ".sRyyyyyyR..", 20: "....bbbb...." }),
  ];
  const DAN_CHEER = [
    edit(DAN, { 8: ".s...www..s.", 9: ".s.RRwwRR.s.", 10: "..sRRRRRRs..", 12: "..RRRRRRRR..", 13: "..RyyyyyyR.." }),
    edit(DAN, { 7: "s...wwwww..s", 8: ".s...www..s.", 9: "..sRRwwRRs..", 12: "..RRRRRRRR..", 13: "..RyyyyyyR.." }),
  ];
  // Kneeling, seen from behind, hands raised toward the window.
  const KNEEL = [
    "....wwww....",
    "...wwwwww...",
    "...wwwwww...",
    "...gwwwwg...",
    ".s..gwwg..s.",
    ".s..RRRR..s.",
    "..sRRRRRRs..",
    "...RRRRRR...",
    "..RRRRRRRR..",
    "..RyyyyyyR..",
    "..RRRRRRRR..",
    ".RRRRRRRRRR.",
    ".RRRRRRRRRR.",
    ".rrrrrrrrrr.",
    ".rrrrrrrrrr.",
    "..bb....bb..",
  ];
  const KNEEL_2 = edit(KNEEL, { 2: ".s.wwwwww.s.", 3: ".s.gwwwwg.s.", 4: "..s.gwwg.s..", 5: "....RRRR....", 6: "...RRRRRR..." });
  const DANIEL = sprite({ idle: [DAN], walk: DAN_WALK, cheer: DAN_CHEER, pray: [KNEEL, KNEEL, KNEEL_2, KNEEL_2] },
    { speed: { walk: "0.5s", cheer: "0.5s", pray: "1.6s" } });

  // King Darius: gold crown, purple robe.
  const KING = [
    "...Y..YYY..Y..",
    "...YYYYYYYYY..",
    "...YxYYYYYxY..",
    "...bsssssssb..",
    "...bssessesb..",
    "...bsssssssb..",
    "...bbbsssbbb..",
    "....bbbbbbb...",
    ".....bbbbb....",
    "...PPPYYYPPP..",
    "..PPPPYYYPPPP.",
    "..PPPPPYPPPPP.",
    ".sPPPPPYPPPPPs",
    ".sPPPPPYPPPPPs",
    "..PPYYYYYYYPP.",
    "..PPPPPYPPPPP.",
    "..PPPPPYPPPPP.",
    "..pPPPPYPPPPp.",
    "..pPPPPYPPPPp.",
    "..ppPPPYPPPpp.",
    "..YYYYYYYYYYY.",
    "...bbb...bbb..",
  ];
  const KING_WALK = [
    KING,
    edit(KING, { 12: ".sPPPPPYPPPPP.", 13: "..PPPPPYPPPPPs", 21: "..bbb.....bbb" }),
    KING,
    edit(KING, { 12: "..PPPPPYPPPPPs", 13: ".sPPPPPYPPPPP.", 21: "....bbbbbb..." }),
  ];
  // Hands on his head: a very worried king.
  const KING_WORRY = edit(KING, {
    2: "..sYxYYYYYxYs.", 3: "..PbsssssssbP.", 4: "..PbsseessbbP.", 5: "..PbsssssssbP.", 6: "..PbbbsssbbbP.",
    7: "..P.bbbbbbb.P.", 8: "..PP.bbbbb.PP.", 12: "..PPPPPYPPPPP.", 13: "..PPPPPYPPPPP.",
  });
  const KING_JOY = [
    edit(KING, { 8: ".s...bbbbb..s.", 9: ".sPPPPYYYPPPs.", 10: "..sPPPYYYPPs..", 12: "..PPPPPYPPPPP.", 13: "..PPPPPYPPPPP." }),
    edit(KING, { 7: "s...bbbbbbb..s", 8: ".s...bbbbb..s.", 9: "..sPPPYYYPPs..", 12: "..PPPPPYPPPPP.", 13: "..PPPPPYPPPPP." }),
  ];
  const DARIUS = sprite({ idle: [KING], walk: KING_WALK, worry: [KING_WORRY, edit(KING_WORRY, { 4: "..PbssessesbP." })], joy: KING_JOY },
    { speed: { walk: "0.45s", worry: "0.6s", joy: "0.5s" } });

  // The jealous officials: tall hats, pointy beards, shifty eyebrows. Two robe colors.
  const OFF = [
    "....qqqq....",
    "....qqqq....",
    "...qqqqqq...",
    "...GGGGGG...",
    "...ssssss...",
    "...skkskk...",
    "...ssesses..",
    "...kkkkkkk..",
    "....kkkkk...",
    ".....kkk....",
    "...GGGGGG...",
    "..GGGGGGGG..",
    ".sGGGGGGGGs.",
    ".sGxxxxxxGs.",
    "..GGGGGGGG..",
    "..GGGGGGGG..",
    "..qGGGGGGq..",
    "..qGGGGGGq..",
    "..qqGGGGqq..",
    "..qqqqqqqq..",
    "...bb..bb...",
  ];
  // Rubbing their hands together, scheming.
  const OFF_SCHEME = [
    edit(OFF, { 12: "..GGsGGsGG..", 13: "..GxxssxxG.." }),
    edit(OFF, { 12: "..GGGssGGG..", 13: "..GxxssxxG.." }),
  ];
  const OFF_WALK = [
    OFF,
    edit(OFF, { 20: "..bb....bb.." }),
    OFF,
    edit(OFF, { 20: "....bbbb...." }),
  ];
  const offSprite = (map) => sprite({
    idle: [recolor(OFF, map)], scheme: OFF_SCHEME.map((f) => recolor(f, map)), walk: OFF_WALK.map((f) => recolor(f, map)),
  }, { speed: { scheme: "0.4s", walk: "0.4s" } });
  const OFFICIAL_A = offSprite({}), OFFICIAL_B = offSprite({ G: "O", q: "o" });
  // Two officials peeking over a window sill (heads and fingers only).
  const PEEK_ROWS = OFF.slice(0, 10).map((r, i) => r + recolor([r], { G: "O", q: "o" })[0]).concat(["..ss.ss.......ss.ss.....", "........................"]);
  const PEEK = sprite({ look: [PEEK_ROWS, dots(PEEK_ROWS, [[6, 6, "s"], [9, 6, "s"], [5, 6, "e"], [8, 6, "e"], [18, 6, "s"], [21, 6, "s"], [17, 6, "e"], [20, 6, "e"]])] }, { speed: { look: "0.9s" } });

  // Lions, lying down, head on the left. Tail tip flicks; the mouth opens, shuts, then they doze off.
  const LION = [
    "..MMMMM...................",
    ".MMMMMMM..................",
    "MMMTTTMMM.................",
    "MMTeTTeTMM................",
    "MMTTTTTTMM................",
    "MMTFkkFTMMTTTTTTTTTTTT....",
    "MMTFFFFTMTTTTTTTTTTTTTT...",
    ".MMTFFTMMTTTTTTTTTTTTTTT..",
    "..MMMMMMTTTTTTTTTTTTTTTT..",
    "...MMMMTTTTTTTTTTTTTTTTT..",
    "....TTTTTtTTTTTTTTTTTTTT..",
    "...TTTT..TTT.....TTT.TTT..",
    "..FFFF..FFF.....FFF..FFF..",
  ];
  const tail = (rows, k) => dots(rows, [[[24, 9], [24, 8], [24, 7], [24, 8]][k], [[25, 8], [25, 7], [25, 6], [25, 7]][k]].map(([x, y]) => [x, y, "t"]));
  const ROAR = edit(LION, { 3: "MMTeTTeTMM", 5: "MMTFkkFTMMTTTTTTTTTTTT....", 6: "MMxwxxwxMTTTTTTTTTTTTTT...", 7: ".MxxxxxxMTTTTTTTTTTTTTTT..", 8: "..MwMMwMTTTTTTTTTTTTTTTT.." });
  const SLEEP = edit(LION, { 3: "MMTtTTtTMM" });
  const lionSprite = sprite({
    idle: [0, 1, 2, 3].map((k) => tail(LION, k)),
    roar: [tail(ROAR, 0), tail(LION, 1), tail(ROAR, 2), tail(LION, 3)],
    sleep: [tail(SLEEP, 0), tail(SLEEP, 0), tail(edit(SLEEP, { 9: "...MMMMTTTTTTTTTTTTTTTTT..", 8: "..MMMMMMTTTTTTTTTTTTTTTTT." }), 0), tail(SLEEP, 0)],
  }, { speed: { idle: "1.2s", roar: "0.5s", sleep: "2s" } });

  // The angel, with a stepped glow drawn under it.
  const ANGEL_ROWS = [
    ".....YYYY.....",
    "....Y....Y....",
    ".....YYYY.....",
    ".....ssss.....",
    ".....sess.....",
    "..WW.ssss.WW..",
    ".WWWwwwwwwWWW.",
    "WWWWwwwwwwWWWW",
    "WWW.wwwwww.WWW",
    "WW..wwwwww..WW",
    "W...wwwwww...W",
    "....wwwwww....",
    "...wwwwwwww...",
    "...wwwwwwww...",
    "..wwwwwwwwww..",
    "..wwwwwwwwww..",
    "..wwwwwwwwww..",
    "..wwwwwwwwww..",
  ];
  const ANGEL_UP = edit(ANGEL_ROWS, { 5: "WWW..ssss.WWW", 6: "WWWWwwwwwwWWWW", 7: ".WWWwwwwwwWWW.", 8: "..W.wwwwww.W..", 9: "....wwwwww....", 10: "....wwwwww...." });
  let glow = "";
  for (let r = 10; r > 0; r -= 2) glow += `<rect x="${-r}" y="${-r}" width="${14 + 2 * r}" height="${18 + 2 * r}" fill="#ffeca0" opacity="${(0.07 + (10 - r) * 0.012).toFixed(3)}"/>`;
  const ANGEL = sprite({ fly: [ANGEL_ROWS, ANGEL_ROWS, ANGEL_UP, ANGEL_UP] }, { pad: 10, under: `<g class="px-glow">${glow}</g>`, speed: { fly: "0.8s" } });

  // The big stone for the den's mouth: a lumpy dome with light on the top left.
  const STONE_ROWS = [];
  for (let y = 0; y < 14; y++) {
    const half = Math.round(17 * Math.sqrt(1 - Math.pow((13 - y) / 14, 2)));
    let row = "";
    for (let x = 0; x < 34; x++) {
      const d = Math.abs(x - 16.5);
      if (d > half) { row += "."; continue; }
      const light = x - y * 1.2;
      row += (x === 9 && y > 5 && y < 9) || (x === 24 && y > 3 && y < 7) ? "m" : light < 6 ? "n" : light < 18 ? "N" : "m";
    }
    STONE_ROWS.push(row);
  }
  const STONE = sprite({ still: [STONE_ROWS] });

  // The law, on a scroll with a red seal.
  const SCROLL = sprite({ still: [[
    ".yyyyyyyyyyyyyy.",
    "yFFFFFFFFFFFFFFy",
    ".FBBBBBBBBBBBBF.",
    ".FFFFFFFFFFFFFF.",
    ".FBBBBBBBBBBFFF.",
    ".FFFFFFFFFFFFFF.",
    ".FBBBBBBBFFFFFF.",
    ".FFFFFFFFFFxxFF.",
    "yFFFFFFFFFxxxxFy",
    ".yyyyyyyyyyxxyy.",
  ]] });

  // Things the king turns down: food, music, sleep. Each gets a red ✗ when he says no.
  const nope = (rows) => {
    const w = Math.max(...rows.map((r) => r.length)), h = rows.length, list = [];
    for (let i = 0; i < Math.max(w, h); i++) {
      const x = Math.round((i / (Math.max(w, h) - 1)) * (w - 1)), y = Math.round((i / (Math.max(w, h) - 1)) * (h - 1));
      list.push([x, y, "x"], [w - 1 - x, y, "x"]);
    }
    return dots(rows, list);
  };
  const icon = (rows) => sprite({ on: [rows], no: [nope(rows)] });
  const FOOD = icon(["...TTTT...", "..TFFFFT..", ".TFFFFFFT.", ".TTTTTTTT.", "wwwwwwwwww", ".gggggggg."]);
  const MUSIC = icon(["..YYYYYYY", "..YYYYYYY", "..Y.....Y", "..Y.....Y", "..Y.....Y", "YYY...YYY", "YYY...YYY"]);
  const ZZZ = icon(["WWWWWW..", "....WW..", "...WW...", "..WW....", ".WW.....", "WWWWWW..", "........"]);
  const ZED = sprite({ still: [["www", "..w", ".w.", "www"]] });

  /* ---------- The world: palace (x 0–120), Daniel's house (122–202), the den (204–320) ---------- */
  const R = (x, y, w, h, c, a) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${a || ""}/>`;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  /** A wall of bricks between x0..x1, y0..y1 in two shades, with mortar showing through. */
  function bricks(x0, y0, x1, y1, base, c1, c2, bw, bh) {
    let s = R(x0, y0, x1 - x0, y1 - y0, base);
    for (let y = y0, row = 0; y < y1; y += bh, row++) {
      for (let x = x0 - (row % 2 ? bw / 2 : 0); x < x1; x += bw) {
        const l = Math.max(x0, x + 1), r = Math.min(x1, x + bw), b = Math.min(y1, y + bh);
        if (r - l > 0 && b - y - 1 > 0) s += R(l, y + 1, r - l, b - y - 1, rnd() < 0.3 ? c2 : c1);
      }
    }
    return s;
  }
  /** A torch or lamp flame that flickers through four frames. */
  const flame = (x, y) => `<g class="px-frames" style="--px-t:0.6s">${[0, 1, 2, 3].map((k) =>
    `<g>${R(x - 1, y - 4 - (k % 2), 4, 4 + (k % 2), k % 3 ? "#ffb02e" : "#ff7a2e")}${R(x, y - 3 + (k === 2 ? 1 : 0), 2, 2, "#ffe14d")}</g>`).join("")}</g>`;
  const column = (x) => R(x, 14, 8, 66, "#e8dcc0") + R(x + 6, 14, 2, 66, "#b8a88a") + R(x - 2, 12, 12, 3, PAL.Y) + R(x - 2, 78, 12, 3, PAL.y) + R(x + 2, 14, 1, 64, "#f8f0dc");
  const archWindow = (x, y, w, h, cls) => {
    let s = R(x - 2, y - 2, w + 4, h + 4, PAL.Y);
    const r = (a, b, c, d) => `<rect x="${a}" y="${b}" width="${c}" height="${d}"/>`;
    s += `<g class="${cls}" fill="#5aa9e6">` + r(x, y + 3, w, h - 3) + r(x + 2, y + 1, w - 4, 2) + r(x + 4, y, w - 8, 1) + "</g>";
    s += R(x - 2, y - 2, 4, 3, "#3d1a63") + R(x + w - 2, y - 2, 4, 3, "#3d1a63") + R(x - 2, y - 2, 2, 5, "#3d1a63") + R(x + w, y - 2, 2, 5, "#3d1a63");
    return s + R(x + w / 2 - 0.5, y, 1, h, PAL.Y) + R(x, y + h / 2, w, 1, PAL.Y);
  };
  function bg() {
    let s = "";
    // Palace: purple brick, a gold frieze, columns, arched windows, a throne and a checkered gold floor.
    s += bricks(0, 0, 120, 80, "#2e1450", "#3d1a63", "#4a2177", 16, 8);
    for (let x = 0; x < 120; x += 4) s += R(x, 8, 4, 4, (x / 4) % 2 ? PAL.Y : PAL.y);
    s += archWindow(68, 24, 14, 22, "px-palsky") + archWindow(90, 24, 14, 22, "px-palsky");
    s += `<g class="px-palstars" style="opacity:0">${R(71, 30, 1, 1, "#fff") + R(77, 35, 1, 1, "#fff") + R(94, 29, 1, 1, "#fff") + R(99, 38, 1, 1, "#fff") + R(96, 27, 2, 2, "#fff6c0")}</g>`;
    s += column(4) + column(52) + column(110);
    s += R(58, 16, 8, 26, PAL.x) + R(58, 16, 8, 2, PAL.Y) + R(60, 22, 4, 4, PAL.Y) + R(58, 40, 2, 3, PAL.Y) + R(62, 40, 2, 3, PAL.Y);
    s += R(16, 50, 24, 30, PAL.Y) + R(18, 46, 20, 4, PAL.Y) + R(26, 42, 4, 4, PAL.Y) + R(20, 52, 16, 22, PAL.p) + R(18, 72, 20, 8, PAL.y) + R(16, 50, 2, 30, PAL.y);
    s += R(15, 34, 3, 10, "#5a3a20") + flame(16, 34) + R(41, 34, 3, 10, "#5a3a20") + flame(42, 34);
    for (let y = 80; y < 100; y += 5) for (let x = 0; x < 120; x += 8) s += R(x, y, 8, 5, ((x / 8 + (y - 80) / 5) % 2) ? "#c98a2a" : "#a8641f");
    s += R(0, 80, 120, 1, "#ffd84d");
    // A thick stone wall between the palace and the house.
    s += bricks(118, 0, 124, 100, "#454066", "#6a6488", "#9a94b8", 6, 5);
    // Daniel's upstairs room: plaster, a beam ceiling, a wooden floor, a rug, a lamp and a door.
    s += R(124, 0, 80, 82, "#c8935a");
    for (let i = 0; i < 40; i++) s += R(126 + Math.floor(rnd() * 74), 8 + Math.floor(rnd() * 70), 2, 1, "#b8834a");
    s += R(124, 0, 80, 6, PAL.b) + R(124, 6, 80, 1, PAL.B);
    for (let x = 128; x < 202; x += 14) s += R(x, 6, 4, 3, PAL.b);
    for (let y = 82; y < 100; y += 4) s += R(124, y, 80, 4, (y / 4) % 2 ? "#8a5a2b" : "#7a4a20") + R(124 + ((y * 7) % 30), y, 1, 4, PAL.b) + R(160 + ((y * 5) % 30), y, 1, 4, PAL.b);
    s += R(124, 82, 80, 1, PAL.b);
    s += R(146, 85, 32, 5, PAL.x) + R(148, 86, 28, 3, "#9a1f2a");
    for (let x = 150; x < 176; x += 4) s += R(x, 87, 2, 1, PAL.Y);
    // The window toward Jerusalem: shutters open, far hills and a little walled city.
    s += `<defs><clipPath id="pixelWinClip"><rect x="146" y="40" width="32" height="22"/></clipPath></defs>`;
    s += R(144, 38, 36, 26, PAL.b);
    s += `<g clip-path="url(#pixelWinClip)">` + `<rect class="px-winsky" x="146" y="40" width="32" height="22" fill="#9fd8ff"/>`;
    s += `<g class="px-sun"><rect x="-3" y="-2" width="6" height="4" fill="#fff6a0"/><rect x="-2" y="-3" width="4" height="6" fill="#fff6a0"/></g>`;
    s += R(146, 54, 32, 8, "#3fa34d") + R(146, 52, 12, 2, "#3fa34d") + R(168, 53, 10, 1, "#3fa34d") + R(146, 58, 32, 4, "#23703a");
    s += R(158, 49, 10, 4, "#e8dcc0") + R(158, 47, 2, 2, "#e8dcc0") + R(162, 46, 2, 3, "#e8dcc0") + R(166, 47, 2, 2, "#e8dcc0") + R(160, 51, 2, 2, "#b8a88a") + "</g>";
    s += R(161.5, 40, 1, 22, PAL.b) + R(146, 62, 32, 2, PAL.B);
    s += R(136, 40, 8, 22, PAL.B) + R(180, 40, 8, 22, PAL.B);
    for (let y = 42; y < 61; y += 3) s += R(137, y, 6, 1, PAL.b) + R(181, y, 6, 1, PAL.b);
    s += R(126, 74, 8, 8, PAL.o) + R(127, 64, 2, 10, "#3fa34d") + R(129, 66, 3, 3, "#4caf50") + R(125, 68, 3, 3, "#4caf50") + R(130, 62, 2, 4, "#4caf50");
    s += R(190, 50, 14, 32, PAL.b) + R(192, 52, 10, 30, PAL.B) + R(194, 48, 6, 2, PAL.b) + R(199, 66, 2, 2, PAL.Y);
    s += R(186, 34, 6, 2, PAL.b) + R(187, 32, 4, 2, PAL.Y) + flame(188, 32);
    // The den: sky above, a sandy surface, solid rock, and a dark cave below a square mouth.
    s += `<rect class="px-densky" x="204" y="0" width="116" height="44" fill="#5aa9e6"/>`;
    s += `<g class="px-dawn" style="opacity:0">${R(204, 30, 116, 14, "#f29b8a") + R(204, 38, 116, 6, "#ffcf8a")}</g>`;
    s += `<g class="px-stars" style="opacity:0">`;
    for (let i = 0; i < 18; i++) s += R(206 + Math.floor(rnd() * 110), 2 + Math.floor(rnd() * 34), 1, 1, i % 4 ? "#fff" : "#fff6c0");
    s += R(298, 6, 6, 6, "#fff6c0") + R(297, 7, 8, 4, "#fff6c0") + R(301, 7, 3, 3, "#e8e0b0") + "</g>";
    s += `<g class="px-sunrise" style="opacity:0">${R(208, 38, 10, 6, "#ffe14d") + R(210, 36, 6, 2, "#ffe14d")}</g>`;
    s += R(216, 18, 3, 26, PAL.B) + R(217, 18, 1, 26, PAL.b) + R(208, 16, 20, 3, "#3fa34d") + R(210, 14, 16, 2, "#4caf50") + R(206, 19, 4, 3, "#3fa34d") + R(226, 19, 4, 3, "#3fa34d") + R(214, 13, 8, 2, "#23703a");
    s += bricks(204, 44, 320, 100, "#2b2546", "#3a3358", "#454066", 12, 6);
    s += R(204, 44, 116, 6, "#d9a04a") + R(204, 44, 116, 1, "#f2c27a");
    for (let x = 206; x < 320; x += 7) s += R(x, 49, 3, 1, "#a8641f");
    s += R(212, 52, 100, 40, "#1c1735") + R(216, 50, 92, 2, "#1c1735") + R(210, 56, 2, 32, "#1c1735") + R(312, 56, 2, 32, "#1c1735");
    for (let y = 54; y < 88; y += 6) for (let x = 214 + (((y - 54) / 6) % 2) * 6; x < 310; x += 12) s += R(x, y, 10, 5, "#231d40");
    s += R(212, 88, 100, 12, "#463a63") + R(212, 88, 100, 1, "#5a4d7a");
    for (let x = 214; x < 312; x += 6) s += R(x, 91 + (x % 4 ? 1 : 3), 3, 1, "#3c3157");
    s += R(246, 44, 28, 8, "#1c1735") + R(242, 42, 4, 3, PAL.N) + R(274, 42, 4, 3, PAL.N) + R(242, 42, 4, 1, PAL.n) + R(274, 42, 4, 1, PAL.n);
    s += `<g class="px-beam">`;
    for (let y = 44; y < 88; y++) { const w = 26 + (y - 44) * 0.45; s += R(260 - w / 2, y, w, 1, "#c8dcff", ` opacity="${(0.06 + (y % 2) * 0.04).toFixed(2)}"`); }
    s += "</g>";
    return `<svg class="sp-bg px-bg" viewBox="0 0 320 100" preserveAspectRatio="none" shape-rendering="crispEdges" aria-hidden="true">${s}</svg>`;
  }

  /* ---------- Scene 3: Daniel in the Lions' Den (Daniel 6) ---------- */
  // Camera shots: [cx, cy, zoom]. The den has three: the surface, the whole den, and a close-up of the cave.
  const PALACE = [0.17, 0.6, 1.6], HOUSE = [0.506, 0.64, 2];
  const DEN_TOP = [0.8, 0.27, 2], DEN_ALL = [0.82, 0.532, 1.38], DEN_CAVE = [0.83, 0.71, 2];

  async function lions(D) {
    const W = D.world;
    W.insertAdjacentHTML("afterbegin", bg());
    const overlay = D.frame.querySelector(".sp-overlay");
    const one = (sel) => W.querySelector(sel), all = (sel) => [...W.querySelectorAll(sel)];
    // World pixels → director units: x is 0–320 across, foot is the pixel row the feet stand on.
    const put = (spr, x, foot, o) => { const a = D.actor(spr.html, Object.assign({ x: x / 3.2, y: 100 - foot, h: spr.H, cls: "px" }, o)); a._spr = spr; return a; };
    const go = (a, x, foot, ms, o) => D.move(a, x / 3.2, 100 - foot, ms, Object.assign({ easing: `steps(${Math.max(2, Math.round(ms / 110))})` }, o));
    const jump = (a, x, foot) => { a._x = x / 3.2; a._y = 100 - foot; a.style.left = a._x + "%"; a.style.bottom = a._y + "%"; };
    const pose = (a, name) => a.querySelectorAll(".px-pose").forEach((g) => { g.style.display = g.dataset.pose === name ? "" : "none"; });
    const face = (a, left) => a.classList.toggle("px-flip", !!left);
    const show = (a) => D.to(a, "opacity", "0", "1", { duration: 240, easing: "steps(3)" });
    const hide = (a) => D.to(a, "opacity", "1", "0", { duration: 240, easing: "steps(3)" });
    const say = (a, who, text, o) => D.bubble(a, a._spr.W / 2 + (a._spr.ox || 0), (a._spr.ox || 0) - 1, who, text, o);
    const pop = (a) => D.anim(a, [{ transform: "scale(0)" }, { transform: "scale(1.3)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 360, easing: "steps(4)" });
    const cam = (shot, ms) => D.cam(shot[0], shot[1], shot[2], ms);
    /** A hard cut through black, like walking through a door in an old RPG. */
    const cut = async (shot, whileDark) => {
      const b = el("div", { class: "px-wipe" });
      overlay.append(b);
      await D.anim(b, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "steps(3)", fill: "forwards" });
      overlay.querySelectorAll(".sp-burst").forEach((n) => n.remove());
      if (whileDark) whileDark();
      await cam(shot, 1);
      await D.anim(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "steps(3)", fill: "forwards" });
      b.remove();
    };
    /** Fade fills (sky colors) in four palette steps, like an old console. */
    const shade = (sel, color, ms) => all(sel).forEach((n) => { const from = n.style.fill || n.getAttribute("fill"); D.to(n, "fill", from, color, { duration: ms || 900, easing: "steps(4)" }); });
    const fade = (sel, to, ms) => all(sel).forEach((n) => D.to(n, "opacity", n.style.opacity || "1", String(to), { duration: ms || 900, easing: "steps(4)" }));
    /** An RPG location banner across the top of the picture. */
    const area = (text) => {
      const b = el("div", { class: "px-area" }, text);
      overlay.append(b);
      D.anim(b, [{ opacity: 0, transform: "translateY(-60%)" }, { opacity: 1, transform: "none", offset: 0.12 }, { opacity: 1, transform: "none", offset: 0.85 }, { opacity: 0, transform: "none" }],
        { duration: 2600, easing: "steps(14)" }).then(() => b.remove());
    };
    // Where a sprite pixel is on screen, for bursts.
    const at = (a, vx, vy) => D.point(a, vx + (a._spr.ox || 0), vy + (a._spr.ox || 0));
    const tint = el("div", { class: "px-tint" });
    W.append(tint);

    const king = put(DARIUS, 28, 88);
    const daniel = put(DANIEL, 104, 88, { hidden: true });
    const offA = put(OFFICIAL_A, 118, 88, { hidden: true }), offB = put(OFFICIAL_B, 118, 88, { hidden: true });
    const scroll = put(SCROLL, 42, 64, { hidden: true });
    const peek = put(PEEK, 162, 63, { hidden: true, cls: "px px-peek" });
    const lionL = put(lionSprite, 232, 89, { cls: "px px-flip" }), lionR = put(lionSprite, 290, 89);
    const stone = put(STONE, 293, 46);
    const angel = put(ANGEL, 247, 78, { hidden: true });
    const icons = [FOOD, MUSIC, ZZZ].map((ic, i) => put(ic, 30 + i * 11, 60, { hidden: true }));
    const zeds = [241, 281].map((x) => put(ZED, x, 76, { hidden: true }));
    const beats = [];
    const beat = (fn) => beats.push(fn);

    beat(async () => {
      await cam(PALACE, 1);
      THP.Music.play("jericho");
      await D.card("Story Scene 3", "LIONS ON MUTE", "Daniel in the Lions' Den · Daniel 6", 1600);
    });
    beat(async () => {
      area("PALACE OF BABYLON");
      show(daniel);
      pose(daniel, "walk"); face(daniel, true);
      await Promise.all([
        D.narrate("King Darius makes Daniel a top official. And Daniel is GREAT at it.", 300),
        go(daniel, 66, 88, 2400).then(() => pose(daniel, "idle")),
      ]);
      const p = at(daniel, 6, 0);
      D.sfx("fanfare");
      D.burst("LEVEL UP!", p.fx, Math.max(14, p.fy - 6), "lvl");
      await D.narrate("The king plans to put him over the WHOLE kingdom!", 1300);
    });
    beat(async () => {
      [offA, offB].forEach(show);
      pose(offA, "walk"); pose(offB, "walk"); face(offA, true); face(offB, true);
      await Promise.all([
        D.narrate("The other officials are jealous. They hunt for dirt on Daniel…", 300),
        go(offA, 84, 88, 1700).then(() => pose(offA, "idle")),
        go(offB, 98, 89, 2000).then(() => pose(offB, "idle")),
      ]);
      for (const o of [offA, offB]) { const p = at(o, 6, 0); D.sfx("tick"); await D.burst("?", p.fx, Math.max(12, p.fy - 5), "q"); await D.wait(200); }
      await D.narrate("Nothing! He's honest and he works hard. Ugh!", 300);
      pose(offA, "scheme"); pose(offB, "scheme");
      await say(offA, "Official", "We will never find any basis for charges against this man Daniel unless it has something to do with the law of his God.", { hold: 4300 });
    });
    beat(async () => {
      pose(daniel, "walk"); face(daniel, false);
      go(daniel, 118, 88, 1200).then(() => hide(daniel));
      pose(offA, "walk"); pose(offB, "walk");
      await Promise.all([go(offA, 48, 88, 1200), go(offB, 60, 89, 1400)]);
      pose(offA, "idle"); pose(offB, "idle");
      await say(offB, "Officials", "May King Darius live forever!", { cls: "loud", hold: 1800 });
      await D.narrate("Their trick: a new law. For 30 days, pray only to the king… or go to the lions!", 300);
      show(scroll); D.sfx("flip");
      await pop(scroll);
      await D.wait(400);
      const p = at(scroll, 8, 4);
      D.sfx("impact"); D.shake(0.8);
      D.burst("STAMP!", p.fx, p.fy, "stamp");
      await D.narrate("Darius signs it. And this law can't be changed. Not even by the king!", 1700);
      hide(scroll);
    });
    beat(async () => {
      jump(daniel, 196, 88); face(daniel, true); pose(daniel, "walk");
      await cut(HOUSE);
      area("DANIEL'S HOUSE");
      show(daniel);
      await Promise.all([
        D.narrate("Daniel hears about the law. He goes home, where his windows open toward Jerusalem.", 300),
        go(daniel, 162, 88, 2400),
      ]);
      pose(daniel, "pray"); face(daniel, false);
      D.sfx("tap");
      const hud = el("div", { class: "px-hud" }, "PRAYERS: 0/3");
      overlay.append(hud);
      const sun = one(".px-sun");
      const times = [["translate(150px, 55px)", "#9fd8ff"], ["translate(163px, 44px)", "#5aa9e6"], ["translate(174px, 56px)", "#f29b5a"]];
      const said = D.narrate("He kneels and prays to God three times a day, just as he had done before.", 0);
      for (let i = 0; i < 3; i++) {
        D.to(sun, "transform", sun.style.transform || times[0][0], times[i][0], { duration: 600, easing: "steps(4)" });
        shade(".px-winsky", times[i][1], 600);
        await D.wait(800);
        hud.textContent = `PRAYERS: ${i + 1}/3`;
        D.sfx("correct");
        D.anim(hud, [{ transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: 300, easing: "steps(3)" });
        await D.wait(500);
      }
      await said;
      await D.wait(700);
      hud.remove();
    });
    beat(async () => {
      D.narrate("But guess who's peeking in…", 0);
      peek.style.opacity = "1";
      D.sfx("whoosh");
      await D.anim(peek.querySelector("svg"), [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 600, easing: "steps(5)", fill: "forwards" });
      const p = at(peek, 12, 0);
      D.sfx("wrong");
      D.burst("!", p.fx, Math.max(12, p.fy - 8), "alert");
      await D.wait(1000);
      await D.anim(peek.querySelector("svg"), [{ transform: "translateY(0)" }, { transform: "translateY(100%)" }], { duration: 400, easing: "steps(4)", fill: "forwards" });
      peek.style.opacity = "0";
      jump(offA, 50, 88); jump(offB, 62, 89); face(offA, true); face(offB, true);
      pose(offA, "scheme"); pose(offB, "scheme");
      await cut(PALACE);
      await say(offA, "Officials", "Daniel pays no attention to you, Your Majesty, or to the decree you put in writing. He still prays three times a day.", { cls: "loud", hold: 4500 });
    });
    beat(async () => {
      pose(king, "worry");
      const said = D.narrate("The king is upset. He tries everything to save Daniel, until sundown.", 200);
      await D.wait(600);
      pose(king, "walk");
      shade(".px-palsky", "#e8733a", 2400);
      await go(king, 40, 88, 1100);
      face(king, true); await go(king, 22, 88, 1300);
      await said;
      face(king, false); pose(king, "worry");
      D.loop(king.querySelector("svg"), [{ transform: "translateX(-4%)" }, { transform: "translateX(4%)" }], { duration: 240, direction: "alternate", easing: "steps(2)" });
      pose(offA, "idle"); pose(offB, "idle");
      await say(offB, "Officials", "Remember, Your Majesty, no decree or edict that the king issues can be changed.", { cls: "loud", hold: 3600 });
    });
    beat(async () => {
      await cut(DEN_TOP, () => {
        jump(king, 236, 46); pose(king, "worry"); face(king, false);
        jump(daniel, 252, 46); pose(daniel, "idle"); face(daniel, true); daniel.style.opacity = "1";
        offA.style.opacity = "0"; offB.style.opacity = "0";
        shade(".px-densky", "#e8733a", 1);
      });
      area("THE LIONS' DEN");
      await say(king, "King Darius", "May your God, whom you serve continually, rescue you!", { hold: 3000 });
      pose(daniel, "walk"); face(daniel, false);
      await go(daniel, 264, 46, 500);
      pose(daniel, "idle");
      D.sfx("whoosh");
      await Promise.all([cam(DEN_ALL, 1300), go(daniel, 264, 89, 1300)]);
      D.sfx("step");
      D.sfx("crumble");
      await go(stone, 260, 46, 1000, { steps: 4, bob: 2, tilt: 0.001 });
      D.sfx("impact"); D.shake(1.6);
      fade(".px-beam", 0, 300);
      const p = at(stone, 17, 4);
      D.burst("THUD!", p.fx, p.fy, "thud");
      await D.narrate("A stone covers the mouth of the den, and the king seals it with his own ring.", 1700);
    });
    beat(async () => {
      await cut(PALACE, () => {
        jump(king, 40, 88); pose(king, "walk"); face(king, false);
        shade(".px-palsky", "#12102a", 1); fade(".px-palstars", 1, 1);
        D.to(tint, "opacity", "0", "1", { duration: 1 });
        shade(".px-densky", "#12102a", 1); fade(".px-stars", 1, 1);
      });
      area("PALACE · NIGHT");
      const pace = (async () => {
        for (let i = 0; i < 2 && !D.rushing; i++) {
          face(king, false); await go(king, 52, 88, 1000);
          face(king, true); await go(king, 30, 88, 1000);
        }
        face(king, false); pose(king, "worry");
      })();
      D.narrate("Back at the palace, the king can't eat. No music. No sleep.", 0);
      await D.wait(700);
      for (const ic of icons) {
        show(ic); D.sfx("tap");
        await pop(ic);
        await D.wait(300);
        pose(ic, "no"); D.sfx("wrong");
        await D.wait(450);
      }
      await pace;
      await D.wait(200);
      icons.forEach(hide);
    });
    beat(async () => {
      await cam(DEN_CAVE, 1400);
      area("MEANWHILE…");
      pose(lionL, "roar"); pose(lionR, "roar");
      D.sfx("trial");
      await D.narrate("Meanwhile, down in the dark… the lions open WIDE.", 300);
      angel.style.opacity = "1";
      D.sfx("correct");
      await D.anim(angel, [{ opacity: 0, transform: "translateY(-30%)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 900, easing: "steps(6)" });
      D.loop(angel.querySelector(".px-glow"), [{ opacity: 1 }, { opacity: 0.6 }], { duration: 500, direction: "alternate", easing: "steps(2)" });
      pose(lionL, "idle"); pose(lionR, "idle");
      D.sfx("impact");
      D.burst("MUTE", 50, 30, "mute");
      await D.narrate("Then… SNAP. Shut. Lions on mute.", 500);
      pose(lionL, "sleep"); pose(lionR, "sleep");
      zeds.forEach((z, i) => {
        z.style.opacity = "1";
        D.loop(z, [{ transform: "translate(0, 0)", opacity: 1 }, { transform: "translate(60%, -160%)", opacity: 0 }], { duration: 1600, delay: i * 500, easing: "steps(4)" });
      });
      await D.wait(1300);
    });
    beat(async () => {
      zeds.forEach((z) => { z.style.opacity = "0"; });
      angel.style.opacity = "0";
      await cut(DEN_TOP, () => {
        jump(king, 206, 46); face(king, false); pose(king, "walk");
        D.to(tint, "opacity", "1", "0", { duration: 1 });
        fade(".px-stars", 0, 1); fade(".px-dawn", 1, 1); fade(".px-sunrise", 1, 1);
        shade(".px-densky", "#7a5ab8", 1);
      });
      area("DAWN");
      await Promise.all([
        D.narrate("At dawn, the king hurries to the den.", 200),
        go(king, 236, 46, 1600, { steps: 6, bob: 3, tilt: 0.001 }),
      ]);
      pose(king, "worry");
      await say(king, "King Darius", "Daniel, servant of the living God, has your God, whom you serve continually, been able to rescue you from the lions?", { cls: "loud", hold: 4500 });
    });
    beat(async () => {
      await cam(DEN_ALL, 700);
      await say(daniel, "Daniel", "May the king live forever! My God sent his angel, and he shut the mouths of the lions. They have not hurt me.", { hold: 4600 });
      pose(king, "joy");
      D.sfx("crumble");
      fade(".px-beam", 1, 600);
      await go(stone, 293, 46, 800, { steps: 4, bob: 2, tilt: 0.001 });
      D.sfx("whoosh");
      await Promise.all([cam(DEN_TOP, 1000), go(daniel, 260, 46, 1000)]);
      pose(daniel, "walk"); face(daniel, true);
      await go(daniel, 250, 46, 500);
      pose(daniel, "cheer");
      D.sfx("win");
      const p = at(daniel, 6, 0);
      D.burst("NOT A SCRATCH!", p.fx, Math.max(14, p.fy - 6), "lvl");
      await D.narrate("They lift Daniel out. Not a scratch on him, because he trusted in his God.", 1800);
    });
    beat(async () => {
      THP.Music.play("strut");
      shade(".px-densky", "#5aa9e6", 1200); fade(".px-dawn", 0, 1200);
      if (!D.rushing) THP.ui.confetti(120);
      await say(king, "King Darius", "He is the living God and he endures forever! He rescues and he saves.", { hold: 3500 });
      await D.narrate("Daniel kept praying, and did great while Darius was king. The lions? Still on mute.", 1300);
    });

    for (const b of beats) {
      D.next();
      await b();
    }
    D.next();
  }

  THP.Scenes.define("s3", {
    title: "Lions on Mute", sub: "Daniel in the Lions' Den", ref: "Daniel 6", icon: "🦁",
    lesson: "Daniel kept praying even when it was risky, and God was faithful.",
    verse: ["My God sent his angel, and he shut the mouths of the lions.", "Daniel 6:22"],
    play: lions,
  });
})();
