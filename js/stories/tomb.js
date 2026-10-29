/* Story Scene 6: "He Is Risen" (the empty tomb, Matthew 27:57–28:10 and John 20:1–18), drawn as a stained-glass window.
   Every shape is a jewel-colored pane with a heavy lead line. The sky is three sets of panes (dusk, night, dawn) that
   cross-fade as the story moves from Friday to Sunday morning. The window's arch, the light beams, the sweep of sunlight
   and the dust motes sit on the frame, not in the world, so they stay put while the camera moves. */
(function () {
  const { el } = THP.ui;
  const { REDUCED } = THP.Scenes.kit;
  const LEAD = "#1c1424";

  /* ---------- Art ---------- */
  /** Like kit.svg, but with thick lead lines. */
  const glass = (viewBox, body, cls) => `<svg viewBox="${viewBox}" class="${cls || ""}" aria-hidden="true"><g stroke="${LEAD}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
  const SKIN = "#e8b98a", SKIN_D = "#c98e5e";

  /** A standing figure in robe and veil or mantle, the way saints stand in church windows: facing out, arms posed. */
  function person(o) {
    const sleeve = o.sleeve || o.robe;
    const hair = o.hair || "#5a3418";
    const veil = o.veil ? `<path d="M50 22 Q73 22 75 50 L83 130 Q70 138 64 120 L61 72 Q50 64 39 72 L36 120 Q30 138 17 130 L25 50 Q27 22 50 22 Z" fill="${o.veil}"/>` : "";
    const longHair = o.veil ? "" : `<path d="M33 52 Q31 26 50 25 Q69 26 67 52 L70 76 Q60 80 58 64 L42 64 Q40 80 30 76 Z" fill="${hair}"/>`;
    const mantle = o.mantle ? `<path d="M30 82 Q50 72 70 82 L77 132 Q60 116 50 102 Q40 116 23 132 Z" fill="${o.mantle}"/>` : "";
    const sash = o.sash ? `<path d="M31 82 L44 78 L82 172 L72 182 Z" fill="${o.sash}"/>` : "";
    const cap = o.veil ? `<path d="M34 47 Q34 29 50 29 Q66 29 66 47 Q58 37 50 37 Q42 37 34 47 Z" fill="${o.veil}"/>`
      : o.headcloth ? `<path d="M33 46 Q32 27 50 26 Q68 27 67 46 Q58 38 50 38 Q42 38 33 46 Z" fill="${o.headcloth}"/><path d="M33 44 Q50 36 67 44" fill="none" stroke-width="3"/>`
      : `<path d="M35 46 Q35 30 50 30 Q65 30 65 46 Q58 38 50 39 Q42 38 35 46 Z" fill="${hair}"/>`;
    const beard = o.beard ? `<path d="M37 54 Q39 73 50 75 Q61 73 63 54 Q57 63 50 63 Q43 63 37 54 Z" fill="${o.beard}"/>` : "";
    const jar = o.jar ? `<path class="jar" d="M45 104 h10 l1 5 q8 5 6 17 q-2 9 -12 9 q-10 0 -12 -9 q-2 -12 6 -17 z" fill="${o.jar}"/><path d="M42 118 h16" fill="none" stroke-width="2.5"/>` : "";
    const arms = o.arms === "open"
      ? `<path d="M33 84 Q18 104 11 128 L22 133 Q29 112 41 97 Z" fill="${sleeve}"/><path d="M67 84 Q82 104 89 128 L78 133 Q71 112 59 97 Z" fill="${sleeve}"/>
         <circle cx="15" cy="134" r="5.5" fill="${o.skin || SKIN}"/><circle cx="85" cy="134" r="5.5" fill="${o.skin || SKIN}"/>`
      : `${jar}<path d="M32 84 Q23 110 36 129 L48 124 Q38 108 40 91 Z" fill="${sleeve}"/><path d="M68 84 Q77 110 64 129 L52 124 Q62 108 60 91 Z" fill="${sleeve}"/>
         <circle cx="44" cy="127" r="5.5" fill="${o.skin || SKIN}"/><circle cx="56" cy="127" r="5.5" fill="${o.skin || SKIN}"/>`;
    return glass("0 0 100 220", `
      ${o.back || ""}
      <ellipse cx="42" cy="213" rx="7" ry="4" fill="#7a4a20"/><ellipse cx="58" cy="213" rx="7" ry="4" fill="#7a4a20"/>
      <path d="M32 80 Q50 72 68 80 L84 210 Q50 218 16 210 Z" fill="${o.robe}"/>
      <path d="M41 92 L33 210 M50 86 L50 214 M59 92 L67 210" fill="none" stroke-width="2.5"/>
      <path d="M19 192 Q50 200 81 192 L84 210 Q50 218 16 210 Z" fill="${o.hem || o.robe}"/>
      ${veil}${longHair}${mantle}${sash}
      <rect x="44" y="60" width="12" height="16" fill="${o.skin || SKIN}" stroke-width="3"/>
      <circle cx="50" cy="48" r="15" fill="${o.skin || SKIN}"/>
      ${cap}${beard}
      <g stroke-width="2"><path d="M42 44 q3 -2 6 0 M52 44 q3 -2 6 0" fill="none"/>
        <g class="eyes"><circle cx="45" cy="48.5" r="1.7" fill="${LEAD}" stroke="none"/><circle cx="55" cy="48.5" r="1.7" fill="${LEAD}" stroke="none"/></g>
        <path class="sad" d="M46 58 q4 -2.5 8 0" fill="none" style="opacity:${o.sad ? 1 : 0}"/>
        <path class="smile" d="M45 56 q5 4 10 0" fill="none" style="opacity:${o.sad ? 0 : 1}"/></g>
      <g class="tears" style="opacity:0"><path d="M44 51 q-2.5 6 0 8 q2.5 -2 0 -8z M56 51 q-2.5 6 0 8 q2.5 -2 0 -8z" fill="#7fd0ff" stroke-width="1.2"/></g>
      ${arms}`, o.cls);
  }

  const MARY_M = person({ veil: "#c8283a", robe: "#2a7f9e", hem: "#ffd45a", sleeve: "#2a7f9e", jar: "#f3e6c8", sad: true, cls: "mary" });
  const MARY_O = person({ veil: "#3757c4", robe: "#d08a2e", hem: "#7b5bd6", sleeve: "#d08a2e", jar: "#f3e6c8", sad: true });
  const JOSEPH = person({ headcloth: "#e8ddc0", mantle: "#6a3fa0", robe: "#2d4fa8", hem: "#ffd45a", beard: "#9a9aa8", hair: "#9a9aa8", sad: true, skin: SKIN_D });
  // Jesus: white and gold, a soft glow behind him (no halo). The glow is dim until he says her name.
  const JESUS = person({ robe: "#fbf8ef", hem: "#e0b040", sleeve: "#f4efe0", sash: "#e0b040", hair: "#6b3f1d", beard: "#6b3f1d", arms: "open", skin: SKIN_D,
    back: `<g class="aura" style="opacity:0"><circle cx="50" cy="110" r="96" fill="#fff1a8" stroke="none" opacity="0.35"/><circle cx="50" cy="110" r="70" fill="#fff6d6" stroke="none" opacity="0.45"/></g>` });

  /** A Roman guard: iron helmet with a red crest, bronze armor, a big red shield and a spear. */
  const guard = (flip) => glass("0 0 100 220", `<g${flip ? ' transform="translate(100 0) scale(-1 1)"' : ""}>
      <path d="M18 2 L18 214" stroke-width="9"/><path d="M18 2 L18 214" stroke="#7a4a20" stroke-width="4"/><path d="M18 -10 l-7 18 h14 z" fill="#c9c3d8" stroke-width="3"/>
      <rect x="39" y="170" width="9" height="40" fill="${SKIN_D}" stroke-width="3"/><rect x="52" y="170" width="9" height="40" fill="${SKIN_D}" stroke-width="3"/>
      <ellipse cx="43" cy="212" rx="7" ry="4" fill="#5a3418"/><ellipse cx="57" cy="212" rx="7" ry="4" fill="#5a3418"/>
      <path d="M28 128 L72 128 L78 176 L22 176 Z" fill="#b3262e"/><path d="M34 132 L31 176 M45 132 L44 176 M56 132 L57 176 M67 132 L70 176" fill="none" stroke-width="3"/>
      <path d="M30 82 Q50 74 70 82 L72 134 Q50 142 28 134 Z" fill="#d9a441"/><path d="M30 100 Q50 106 71 100 M29 118 Q50 124 72 118" fill="none" stroke-width="3"/>
      <path d="M30 84 Q20 100 20 118 L28 120 Q30 104 38 94 Z" fill="#b3262e"/><circle cx="22" cy="120" r="5.5" fill="${SKIN_D}"/>
      <rect x="44" y="64" width="12" height="16" fill="${SKIN_D}" stroke-width="3"/>
      <circle cx="50" cy="54" r="15" fill="${SKIN_D}"/>
      <g class="eyes"><circle cx="45" cy="54" r="1.8" fill="${LEAD}" stroke="none"/><circle cx="55" cy="54" r="1.8" fill="${LEAD}" stroke="none"/></g>
      <g class="shut" style="opacity:0"><path d="M42 54 q3 2.5 6 0 M52 54 q3 2.5 6 0" fill="none" stroke-width="2"/></g>
      <path d="M45 62 h10" fill="none" stroke-width="2"/>
      <g class="helmet" style="transform-box:view-box;transform-origin:50px 44px">
        <path d="M33 54 Q32 33 50 31 Q68 33 67 54 L63 52 Q61 42 50 41 Q39 42 37 52 Z" fill="#b9b3c8"/>
        <path d="M33 52 L33 64 L39 62 L38 52 Z M67 52 L67 64 L61 62 L62 52 Z" fill="#b9b3c8" stroke-width="3"/>
        <path d="M34 34 Q50 8 66 34 Q50 26 34 34 Z" fill="#e2333b"/><path d="M42 28 L44 20 M50 26 L50 16 M58 28 L56 20" fill="none" stroke-width="2.5"/>
      </g>
      <rect x="60" y="92" width="34" height="68" rx="9" fill="#8e1c2a"/>
      <path d="M77 96 V156 M64 126 H90" fill="none" stroke="#ffd45a" stroke-width="3"/><circle cx="77" cy="126" r="7" fill="#ffd45a" stroke-width="3"/>
    </g>`);

  /** The big round stone, with Pilate's seal (a cord and a blob of red wax) stuck across the front. */
  const STONE = glass("0 0 180 180", `<g class="rock" style="transform-box:view-box;transform-origin:90px 90px">
      <circle cx="90" cy="90" r="86" fill="#a7a5b8"/>
      <path d="M90 4 L78 64 L20 50 M78 64 L60 120 L10 118 M60 120 L96 176 M78 64 L130 70 L164 40 M130 70 L118 128 L60 120 M118 128 L168 120 M118 128 L132 168" fill="none" stroke-width="4"/>
      <path d="M78 64 L130 70 L118 128 L60 120 Z" fill="#bdbbcc" stroke-width="4"/>
      <path d="M20 50 L78 64 L60 120 L10 118 Q8 76 20 50 Z" fill="#94929f" stroke-width="4"/>
      <g class="seal" style="opacity:0">
        <path d="M4 96 Q90 84 176 96" fill="none" stroke="#e8ddc0" stroke-width="4"/>
        <circle cx="90" cy="90" r="14" fill="#b3262e" stroke-width="4"/><path d="M84 84 l12 12 M96 84 l-12 12" fill="none" stroke="#ffd45a" stroke-width="2.5"/>
      </g>
    </g>`);

  /** The angel, seated: wings of pale blue panes, a robe white as snow, gold hair and a ring of light. */
  const ANGEL = glass("0 0 200 220", `
      <g class="glory"><circle cx="100" cy="96" r="98" fill="#fff6d6" stroke="none" opacity="0.32"/><circle cx="100" cy="96" r="70" fill="#fffbe8" stroke="none" opacity="0.4"/></g>
      <path d="M86 92 Q36 76 10 10 Q52 30 70 40 Q60 20 66 4 Q86 40 96 80 Z" fill="#9fd8ff"/>
      <path d="M114 92 Q164 76 190 10 Q148 30 130 40 Q140 20 134 4 Q114 40 104 80 Z" fill="#9fd8ff"/>
      <path d="M86 92 Q48 70 28 32 M114 92 Q152 70 172 32 M90 84 Q68 50 66 4 M110 84 Q132 50 134 4" fill="none" stroke-width="3"/>
      <path d="M82 90 Q100 82 118 90 L128 140 Q152 172 162 214 L38 214 Q48 172 72 140 Z" fill="#fdfbff"/>
      <path d="M72 140 Q48 172 38 214 L70 214 Q74 178 88 146 Z" fill="#dfe9ff"/><path d="M128 140 Q152 172 162 214 L130 214 Q126 178 112 146 Z" fill="#dfe9ff"/>
      <path d="M100 92 L100 214" fill="none" stroke-width="3"/>
      <path d="M73 132 Q100 140 127 132 L129 143 Q100 151 71 143 Z" fill="#ffd45a" stroke-width="3.5"/>
      <path d="M82 96 Q66 120 72 148 L84 146 Q82 124 92 108 Z" fill="#f4f8ff"/><circle cx="78" cy="150" r="5.5" fill="${SKIN}"/>
      <path d="M118 96 Q140 104 150 80 L140 74 Q132 92 114 104 Z" fill="#f4f8ff"/><circle cx="146" cy="74" r="5.5" fill="${SKIN}"/>
      <rect x="94" y="74" width="12" height="16" fill="${SKIN}" stroke-width="3"/>
      <path d="M82 62 Q80 38 100 37 Q120 38 118 62 L122 84 Q112 86 110 72 L90 72 Q88 86 78 84 Z" fill="#ffd45a"/>
      <circle cx="100" cy="60" r="15" fill="${SKIN}"/>
      <path d="M85 57 Q85 41 100 41 Q115 41 115 57 Q108 49 100 50 Q92 49 85 57 Z" fill="#ffd45a"/>
      <g stroke-width="2"><circle cx="95" cy="61" r="1.7" fill="${LEAD}" stroke="none"/><circle cx="105" cy="61" r="1.7" fill="${LEAD}" stroke="none"/><path d="M95 68 q5 4 10 0" fill="none"/></g>
      <ellipse cx="100" cy="32" rx="22" ry="6" fill="none" stroke="#ffd45a" stroke-width="5"/>`);

  /** Sky panes: wedges fanning out from a light source, crossed by lead rings, like the rose of a church window. */
  function sky(id, cx, cy, colors, extra) {
    let p = "";
    const n = 18, R = 1900;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      p += `<path class="g-ray" style="animation-delay:${(-(i % 5) * 0.8).toFixed(1)}s" d="M${cx} ${cy} L${(cx + Math.cos(a0) * R).toFixed(0)} ${(cy + Math.sin(a0) * R).toFixed(0)} L${(cx + Math.cos(a1) * R).toFixed(0)} ${(cy + Math.sin(a1) * R).toFixed(0)} Z" fill="${colors[i % colors.length]}"/>`;
    }
    const rings = [90, 190, 320, 500, 740, 1050].map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="${i % 2 ? 0.1 : 0}" stroke-width="${r * 0.35}"/>`).join("")
      + [90, 190, 320, 500, 740, 1050].map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"/>`).join("");
    return `<g id="${id}" stroke="${LEAD}" stroke-width="6" stroke-linejoin="round">${p}${rings}${extra || ""}</g>`;
  }
  const star = (x, y, s) => `<path d="M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z" fill="#ffe9a0" stroke-width="2.5"/>`;
  const lily = (x, y) => `<path d="M${x} 500 L${x} ${y}" fill="none" stroke="#7cc46b" stroke-width="8"/><path d="M${x} 500 L${x} ${y}" fill="none" stroke-width="2"/>
    <path d="M${x - 15} ${y + 10} L${x - 8} ${y - 34} L${x} ${y - 6} L${x + 8} ${y - 34} L${x + 15} ${y + 10} Z" fill="#fdfbff"/><path d="M${x} ${y - 6} L${x} ${y + 10}" fill="none" stroke-width="2.5"/>`;
  const olive = (x, y, s) => `<path d="M${x - 8 * s} 440 Q${x - 4 * s} ${y + 60 * s} ${x - 16 * s} ${y + 30 * s} L${x} ${y + 40 * s} L${x + 14 * s} ${y + 26 * s} Q${x + 6 * s} ${y + 60 * s} ${x + 10 * s} 440 Z" fill="#7a4a20"/>
    <ellipse cx="${x - 40 * s}" cy="${y + 20 * s}" rx="${46 * s}" ry="${30 * s}" fill="#5a8a3a"/><ellipse cx="${x + 40 * s}" cy="${y + 16 * s}" rx="${48 * s}" ry="${32 * s}" fill="#6f9a4a"/>
    <ellipse cx="${x}" cy="${y - 10 * s}" rx="${50 * s}" ry="${34 * s}" fill="#87ad5a"/>`;

  // The world: 1600 × 500 units. Friday's hill is on the left, the tomb in the middle, the garden on the right.
  const WINDOW = `<svg class="sp-bg" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
    <defs><clipPath id="glassRockClip"><path d="M800 444 Q800 330 860 260 Q930 180 1040 176 Q1170 180 1230 260 Q1280 330 1284 444 Z"/></clipPath>
      <radialGradient id="glassLinenGlow"><stop offset="0" stop-color="#fff6c8" stop-opacity="0.95"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient></defs>
    ${sky("glassDawn", 1420, 300, ["#e85d4a", "#f29b38", "#ffd45a", "#5aa9e6", "#7b5bd6", "#3fb6a8"])}
    ${sky("glassNight", 960, 80, ["#1b2a6b", "#2a1f5e", "#22357f", "#311f66", "#173a6e", "#1d2f75"],
      `<circle cx="960" cy="80" r="34" fill="#efe9c8"/><path d="M944 70 q8 -6 14 2 M966 92 q8 2 10 -6" fill="none" stroke-width="3"/>
       ${star(140, 80, 9)}${star(330, 150, 7)}${star(520, 60, 10)}${star(700, 170, 7)}${star(1200, 60, 9)}${star(1350, 160, 8)}${star(1500, 70, 10)}${star(820, 250, 6)}${star(60, 220, 6)}`)}
    ${sky("glassDusk", 330, 262, ["#8e2a4a", "#c2413b", "#e0702f", "#6b2a6e", "#a03a5a", "#4a1f5a"])}
    <g stroke="${LEAD}" stroke-width="6" stroke-linejoin="round">
      <g id="glassSun" style="transform:translateY(170px)"><circle cx="1420" cy="300" r="64" fill="#ffd45a"/><circle cx="1420" cy="300" r="38" fill="#fff1a8"/></g>
      <path d="M0 332 Q120 302 240 320 Q400 290 560 324 Q760 300 900 322 Q1100 296 1300 320 Q1450 300 1600 318 L1600 500 L0 500 Z" fill="#6a64a8"/>
      <path d="M240 320 L300 380 M560 324 L520 390 M900 322 L960 380 M1300 320 L1260 380" fill="none" stroke-width="4"/>
      <path d="M0 372 Q160 322 330 264 Q500 312 700 374 L700 500 L0 500 Z" fill="#8a7a52"/>
      <path d="M330 264 L250 380 M330 264 L420 390 M140 336 L180 420" fill="none" stroke-width="4"/>
      <path d="M326 196 h8 v72 h-8 z M306 212 h48 v8 h-48 z" fill="${LEAD}" stroke-width="2"/>
      <path d="M1180 384 Q1400 336 1600 358 L1600 500 L1180 500 Z" fill="#3c9a5a"/>
      ${olive(700, 330, 1)}
      <path d="M800 444 Q800 330 860 260 Q930 180 1040 176 Q1170 180 1230 260 Q1280 330 1284 444 Z" fill="#8c8aa0"/>
      <g clip-path="url(#glassRockClip)" stroke-width="5">
        <path d="M790 300 L880 300 L940 440 L780 440 Z" fill="#7b7992"/><path d="M880 300 L930 180 L1040 176 L1010 260 Z" fill="#9d9bb2"/>
        <path d="M1040 176 L1180 200 L1150 270 L1010 260 Z" fill="#84829b"/><path d="M1150 270 L1300 290 L1300 450 L1110 450 Z" fill="#9895ad"/>
        <path d="M880 300 L1010 260 M1150 270 L1110 450" fill="none"/>
      </g>
      <path d="M955 444 V326 Q955 270 1020 266 Q1085 270 1085 326 V444 Z" fill="#2a1f3d"/>
      <rect x="966" y="398" width="108" height="18" fill="#6e6c86" stroke-width="4"/>
      <circle id="glassLinenGlow" cx="1020" cy="392" r="70" fill="url(#glassLinenGlow)" stroke="none" style="opacity:0"/>
      <path d="M972 398 Q976 386 990 386 L1036 386 Q1046 388 1046 398 Z" fill="#fdfbff" stroke-width="3.5"/><path d="M990 386 L986 398 M1010 386 L1010 398" fill="none" stroke-width="2.5"/>
      <rect x="1050" y="388" width="20" height="10" rx="2" fill="#fdfbff" stroke-width="3"/><path d="M1050 393 h20" fill="none" stroke-width="2"/>
      <path d="M0 436 Q400 424 800 442 Q1200 452 1600 432 L1600 500 L0 500 Z" fill="#2f8a4f"/>
      <path d="M120 432 L170 470 M360 428 L310 468 M600 436 L660 470 M880 444 L840 472 M1140 448 L1190 474 M1400 440 L1360 470" fill="none" stroke-width="4"/>
      <path d="M0 470 Q400 458 800 476 Q1200 488 1600 468 L1600 500 L0 500 Z" fill="#1f6b3d"/>
      <path d="M200 474 L240 500 M520 466 L480 500 M980 482 L1020 500 M1300 476 L1260 500" fill="none" stroke-width="4"/>
      ${olive(1540, 300, 1.1)}
      ${lily(1270, 432)}${lily(1300, 446)}${lily(1590, 440)}${lily(620, 450)}${lily(40, 452)}
      <g fill="#ff7a9a" stroke-width="3"><circle cx="1360" cy="470" r="7"/><circle cx="1440" cy="476" r="6"/><circle cx="560" cy="466" r="6"/><circle cx="160" cy="462" r="6"/></g>
      <g fill="#ffd45a" stroke-width="3"><circle cx="1400" cy="462" r="6"/><circle cx="1480" cy="468" r="6"/><circle cx="90" cy="470" r="5"/></g>
    </g>
  </svg>`;

  /** The window itself: a pointed stone arch over the picture, with lead and a gold line, plus the light that falls through it. */
  const ARCH = `<svg class="g-arch" viewBox="0 0 800 500" preserveAspectRatio="none" aria-hidden="true">
    <path fill-rule="evenodd" d="M-5 -5 H805 V505 H-5 Z M22 505 V196 C22 96 190 28 400 10 C610 28 778 96 778 196 V505 Z" fill="#17111f"/>
    <path d="M22 505 V196 C22 96 190 28 400 10 C610 28 778 96 778 196 V505" fill="none" stroke="#d9a441" stroke-opacity="0.25" stroke-width="22"/>
    <path d="M22 505 V196 C22 96 190 28 400 10 C610 28 778 96 778 196 V505" fill="none" stroke="${LEAD}" stroke-width="12"/>
    <path d="M22 505 V196 C22 96 190 28 400 10 C610 28 778 96 778 196 V505" fill="none" stroke="#d9a441" stroke-width="3"/>
  </svg>`;

  /* ---------- Scene 6: The Empty Tomb (Matthew 27:57–28:10, John 20:1–18) ---------- */
  async function tomb(D) {
    const W = D.world, F = D.frame;
    W.insertAdjacentHTML("afterbegin", WINDOW);
    const bg = (id) => W.querySelector("#" + id);
    const dusk = bg("glassDusk"), night = bg("glassNight"), sun = bg("glassSun");

    // World units → director units: x% of the world, y% up from the bottom, and heights in cqh (the world is 500 units tall).
    const X = (u) => u / 16, Y = (u) => (500 - u) / 5, H = (u) => u / 5;
    const GROUND = Y(442);
    const stone = D.actor(STONE, { x: X(1170), y: GROUND, h: H(176) });
    const joseph = D.actor(JOSEPH, { x: X(1020), y: GROUND, h: H(160), hidden: true });
    const gA = D.actor(guard(false), { x: X(-60), y: GROUND, h: H(166) });
    const gB = D.actor(guard(true), { x: X(1680), y: GROUND, h: H(166) });
    const maryO = D.actor(MARY_O, { x: X(300), y: GROUND, h: H(154), hidden: true });
    const mary = D.actor(MARY_M, { x: X(220), y: GROUND, h: H(160), hidden: true });
    const angel = D.actor(ANGEL, { x: X(1170), y: 100, h: H(190), cls: "g-angel", hidden: true });
    const jesus = D.actor(JESUS, { x: X(1500), y: GROUND, h: H(168), cls: "g-jesus", hidden: true });
    // Night and dusk tints sit over the whole world, actors included, and fade out as the sun comes up.
    const tint = (cls, o) => { const t = el("div", { class: "g-tint " + cls }); t.style.opacity = o; W.append(t); return t; };
    const tDusk = tint("dusk", "1"), tNight = tint("night", "0");

    // Frame layers (they don't move with the camera): light beams, the sweep of sunlight, dust motes, a flash, the arch.
    const over = F.querySelector(".sp-overlay");
    const layer = (cls, html) => { const n = el("div", { class: cls, html: html || "" }); F.insertBefore(n, over); return n; };
    layer("g-beams"); layer("g-sweep");
    let motes = "";
    for (let i = 0; i < 16; i++) motes += `<i style="left:${(18 + ((i * 37) % 64)).toFixed(0)}%;top:${(30 + ((i * 23) % 50)).toFixed(0)}%;animation-delay:${(-(i * 0.9) % 7).toFixed(1)}s"></i>`;
    layer("g-motes", motes);
    const flash = layer("g-flash");
    F.insertAdjacentHTML("beforeend", ARCH);
    F.insertBefore(F.lastElementChild, over);
    const lit = (on) => F.classList.toggle("g-lit", on);

    const q = (a, sel) => a.querySelector(sel);
    const fade = (n, from, to, ms) => D.to(n, "opacity", from, to, { duration: ms || 1200 });
    const walkOpts = { steps: 6, bob: 1.6, tilt: 1.2 };
    /** A speech bubble with a slightly quicker default hold than the director's. */
    const talk = (a, vx, vy, who, text, o) => D.bubble(a, vx, vy, who, text, Object.assign({ hold: 1000 + text.length * 40 }, o));
    const beats = [];
    const beat = (fn) => beats.push(fn);

    beat(async () => {
      await D.cam(0.22, 0.5, 1, 1);
      THP.Music.play("redsea");
      await D.card("Story Scene 6", "HE IS RISEN", "The Empty Tomb · Matthew 28; John 20", 1600);
    });
    // Friday: only the far-off cross against a red sky.
    beat(async () => {
      D.cam(0.21, 0.46, 1.25, 6000);
      await D.narrate("Friday. On a hill outside Jerusalem, Jesus died on the cross. No one took his life from him. He gave it, because he loves us.", 1400);
    });
    // Joseph closes the tomb.
    beat(async () => {
      await D.cam(0.66, 0.5, 1, 2000);
      fade(joseph, "0", "1", 900);
      await Promise.all([
        D.narrate("That evening, a rich man named Joseph wrapped Jesus' body in clean linen and laid it in his own new tomb, cut in the rock.", 600),
        D.wait(1200).then(() => D.move(joseph, X(1290), GROUND, 1900, { ...walkOpts, steps: 5 })),
      ]);
      D.sfx("crumble");
      const roll = D.anim(q(stone, ".rock"), [{ transform: "rotate(0deg)" }, { transform: "rotate(-98deg)" }], { duration: 2400, fill: "forwards", easing: "ease-in-out" });
      await Promise.all([
        D.narrate("Then he rolled a big stone in front of the entrance.", 0),
        D.move(stone, X(1020), GROUND, 2400, { easing: "ease-in-out" }),
        D.move(joseph, X(1140), GROUND, 2400, { easing: "ease-in-out", steps: 5, bob: 1.2 }),
        roll,
      ]);
      D.sfx("impact"); D.shake(0.6);
      D.move(joseph, X(1660), GROUND, 2600, walkOpts); fade(joseph, "1", "0", 1800);
      await D.wait(500);
    });
    // Saturday: guards and a seal, then a long, quiet wait.
    beat(async () => {
      fade(dusk, "1", "0", 3000); fade(tNight, "0", "1", 3000); fade(tDusk, "1", "0", 3000);
      D.sfx("step");
      D.move(gA, X(895), GROUND, 2400, { steps: 6, bob: 1.5 });
      D.move(gB, X(1318), GROUND, 2400, { steps: 6, bob: 1.5 });
      await D.narrate("Jesus had said he would rise again. So his enemies got Pilate to seal the stone and post guards.", 300);
      const seal = q(stone, ".seal");
      seal.style.opacity = "1";
      D.sfx("tick");
      await D.anim(seal, [{ opacity: 0, transform: "scale(1.8)" }, { opacity: 1, transform: "scale(1)" }], { duration: 500, easing: "ease-out" });
      await talk(gA, 50, 30, "Guard", "Nobody is getting past us.");
      await talk(gB, 50, 30, "Other guard", "Nobody.", { hold: 1100 });
      const st = night.querySelectorAll("path[fill='#ffe9a0']");
      st.forEach((s, i) => D.loop(s, [{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 1800 + (i % 3) * 500 }));
      D.anim(q(gB, ".helmet"), [{ transform: "rotate(0)" }, { transform: "rotate(-12deg)" }, { transform: "rotate(0)" }], { duration: 1400, delay: 800 });
      await D.narrate("Then they waited. All night, all the next day, all the next night. Very quiet. Too quiet.", 900);
    });
    // Sunday morning: the women walk to the tomb.
    beat(async () => {
      D.cam(0.5, 0.5, 1, 1800);
      fade(night, "1", "0.45", 3500); fade(tNight, "1", "0.45", 3500);
      fade(mary, "0", "1", 600); fade(maryO, "0", "1", 600);
      await Promise.all([
        D.narrate("Very early on Sunday morning, Mary Magdalene and the other Mary walked to the tomb, carrying spices.", 300),
        D.move(mary, X(640), GROUND, 4000, { ...walkOpts, steps: 8 }),
        D.move(maryO, X(730), GROUND, 4000, { ...walkOpts, steps: 8 }),
      ]);
      await talk(mary, 50, 22, "Mary Magdalene", "Who will roll the stone away from the entrance of the tomb?");
    });
    // The earthquake and the angel.
    beat(async () => {
      D.cam(0.66, 0.5, 1, 900);
      D.sfx("crumble");
      D.burst("RUMBLE", 50, 22, "quake");
      for (let i = 0; i < 6; i++) { D.shake(1.6); await D.wait(240); }
      D.sfx("shatter");
      D.anim(flash, [{ opacity: 0 }, { opacity: 0.95, offset: 0.15 }, { opacity: 0 }], { duration: 1400, easing: "ease-out" });
      fade(night, "0.45", "0", 1400); fade(tNight, "0.45", "0", 1400);
      lit(true);
      angel.style.opacity = "1";
      const seat = Y(296);
      D.sfx("whoosh");
      fade(q(stone, ".seal"), "1", "0", 600);
      await Promise.all([
        D.narrate("Suddenly, a violent earthquake! An angel of the Lord came down from heaven, rolled back the stone, and sat on it.", 300),
        D.move(angel, X(1170), seat + 30, 1400, { easing: "ease-out" })
          .then(() => Promise.all([D.move(stone, X(1170), GROUND, 2000, { easing: "ease-in-out" }),
            D.anim(q(stone, ".rock"), [{ transform: "rotate(-98deg)" }, { transform: "rotate(0deg)" }], { duration: 2000, fill: "forwards", easing: "ease-in-out" })]))
          .then(() => D.move(angel, X(1170), seat, 900, { easing: "ease-in-out" })),
      ]);
      D.sfx("impact");
      D.loop(q(angel, ".glory"), [{ opacity: 0.7 }, { opacity: 1 }, { opacity: 0.7 }], { duration: 2400 });
      await D.narrate("He looked like lightning, and his clothes were white as snow.", 1400);
    });
    // The guards faint.
    beat(async () => {
      await D.cam(0.69, 0.5, 1, 1000);
      [gA, gB].forEach((g) => D.loop(g.querySelector("svg"), [{ transform: "translateX(-2%)" }, { transform: "translateX(2%)" }], { duration: 80, direction: "alternate" }));
      await D.narrate("The guards were so afraid that they shook and became like dead men.", 300);
      await Promise.all([[gA, -1, 0], [gB, 1, 350]].map(([g, dir, delay]) => {
        q(g, ".eyes").style.opacity = "0"; q(g, ".shut").style.opacity = "1";
        D.anim(q(g, ".helmet"), [{ transform: "translate(0,0) rotate(0)" }, { transform: `translate(${dir * 6}px,-30px) rotate(${dir * 30}deg)` }, { transform: "translate(0,0) rotate(0)" }], { duration: 900, delay: delay + 700 });
        return D.to(g, "transform", "rotate(0deg)", `rotate(${dir * 90}deg)`, { duration: 1000, delay, easing: "cubic-bezier(.55,0,1,.45)", fill: "backwards" })
          .then(() => { D.sfx("impact"); D.shake(0.8); });
      }));
      gA.style.bottom = gB.style.bottom = GROUND + 4 + "%";
      await D.narrate("In other words, they fainted. Flat out. So much for “Nobody.”", 1000);
    });
    // "He is not here; he has risen."
    beat(async () => {
      fade(gA, "1", "0", 1400); fade(gB, "1", "0", 1400);
      await Promise.all([D.cam(0.6, 0.46, 1, 1200),
        D.move(mary, X(770), GROUND, 1600, walkOpts), D.move(maryO, X(860), GROUND, 1600, walkOpts)]);
      await talk(angel, 100, 24, "Angel", "Do not be afraid, for I know that you are looking for Jesus, who was crucified.", { cls: "loud" });
      THP.Music.play("strut");
      D.sfx("fanfare");
      D.to(sun, "transform", "translateY(170px)", "translateY(110px)", { duration: 4000, easing: "ease-out" });
      await talk(angel, 100, 24, "Angel", "He is not here; he has risen, just as he said. Come and see the place where he lay.", { cls: "loud", hold: 4200 });
    });
    // Inside: the empty tomb and the folded cloth.
    beat(async () => {
      fade(maryO, "1", "0", 1000);
      await D.cam(0.6375, 0.74, 2.1, 1600);
      const glow = bg("glassLinenGlow");
      fade(glow, "0", "1", 1400);
      D.loop(glow, [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }], { duration: 2600, delay: 1400 });
      D.sfx("correct");
      await D.narrate("Empty! Only the strips of linen, and the cloth from his head folded up by itself. (Robbers don't stop to fold the laundry.)", 2600);
    });
    // Mary in the garden. She thinks he is the gardener.
    beat(async () => {
      fade(angel, "1", "0", 1800);
      D.to(sun, "transform", "translateY(110px)", "translateY(70px)", { duration: 5000, easing: "ease-out" });
      fade(jesus, "0", "1", 2400);
      await Promise.all([D.cam(0.9, 0.5, 1.5, 2200), D.move(mary, X(1400), GROUND, 2600, walkOpts)]);
      q(mary, ".tears").style.opacity = "1";
      D.loop(mary.querySelector("svg"), [{ transform: "translateY(0)" }, { transform: "translateY(-0.6%)" }, { transform: "translateY(0)" }], { duration: 700 });
      await talk(jesus, 50, 22, "The man", "Woman, why are you crying? Who is it you are looking for?");
      await D.narrate("Mary thought he was the gardener. (It was early, and her eyes were full of tears.)", 900);
      await talk(mary, 50, 22, "Mary Magdalene", "Sir, if you have carried him away, tell me where you have put him.");
    });
    // "Mary." "Rabboni!"
    beat(async () => {
      await talk(jesus, 50, 22, "Jesus", "Mary.", { cls: "jesus", hold: 1800 });
      D.sfx("correct");
      jesus.classList.add("shine");
      fade(q(jesus, ".aura"), "0", "1", 1400);
      q(mary, ".tears").style.opacity = "0";
      q(mary, ".sad").style.opacity = "0"; q(mary, ".smile").style.opacity = "1";
      D.anim(mary, [{ transform: "translateY(0)" }, { transform: "translateY(-6%)" }, { transform: "translateY(0)" }], { duration: 600, easing: "ease-out" });
      await talk(mary, 50, 22, "Mary Magdalene", "Rabboni!", { hold: 1800 });
      await D.narrate("That means “Teacher.” It was Jesus! Alive!", 900);
    });
    // The women run to tell the disciples. Sunrise.
    beat(async () => {
      await talk(jesus, 50, 22, "Jesus", "Do not be afraid. Go and tell my brothers.", { cls: "jesus" });
      await talk(mary, 50, 22, "Mary Magdalene", "I have seen the Lord!", { hold: 1800 });
      maryO._x = X(1060); maryO.style.left = maryO._x + "%";
      fade(maryO, "0", "1", 600);
      D.cam(0.75, 0.5, 1, 2400);
      D.to(sun, "transform", "translateY(70px)", "translateY(0px)", { duration: 4000, easing: "ease-out" });
      F.classList.add("g-full");
      D.sfx("win");
      shards(F.querySelector(".sp-overlay"));
      D.move(mary, X(660), GROUND, 4200, { steps: 10, bob: 3, tilt: 3, easing: "ease-in" });
      D.move(maryO, X(620), GROUND, 3600, { steps: 9, bob: 3, tilt: 3, easing: "ease-in" });
      await D.narrate("So the women hurried away, afraid yet filled with joy, and ran to tell his disciples.", 600);
      D.burst("HE IS RISEN!", 50, 30, "risen");
      D.sfx("fanfare");
      await D.narrate("Jesus is alive! And that changes everything.", 2200);
    });

    /** Glass confetti: little jewel-colored panes drifting up through the light. */
    function shards(host) {
      if (REDUCED() || D.rushing) return;
      const cols = ["#e85d4a", "#f29b38", "#ffd45a", "#5aa9e6", "#7b5bd6", "#3fb6a8", "#fdfbff"];
      for (let i = 0; i < 26; i++) {
        const s = el("i", { class: "g-shard" });
        s.style.left = 8 + ((i * 37) % 84) + "%"; s.style.background = cols[i % cols.length];
        host.append(s);
        D.anim(s, [{ transform: "translateY(0) rotate(0deg)", opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateY(-90cqh) rotate(${(i % 2 ? 1 : -1) * 220}deg)`, opacity: 0 }],
          { duration: 4200 + (i % 5) * 500, delay: (i % 9) * 160, easing: "ease-out" }).then(() => s.remove());
      }
    }

    for (const b of beats) {
      D.next();
      await b();
    }
    D.next();
  }

  THP.Scenes.define("s6", {
    title: "He Is Risen", sub: "The Empty Tomb", ref: "Matthew 28; John 20", icon: "✝️",
    lesson: "Jesus is alive, and that changes everything.",
    verse: ["He is not here; he has risen, just as he said.", "Matthew 28:6"],
    play: tomb,
  });
})();
