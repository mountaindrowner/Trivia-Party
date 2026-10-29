/* Story Scene 4: "Two by Two", Noah's Ark (Genesis 6–9), in clay stop-motion.
   Every actor is plasticine: one static SVG filter gives it lumpy edges, a soft shine and a contact shadow, and it is
   drawn once and cached. The stop-motion feel is all timing: moves, hops and camera pans jump in steps at about
   12 frames a second, and a CSS "boil" nudges each actor a hair every frame, like hands re-posing clay. The big
   scenery (sky, ground, mountains, water) is hand-lumpy paths with no filter, so the camera stays smooth on a TV. */
(function () {
  const { REDUCED } = THP.Scenes.kit;
  const { el } = THP.ui;

  /* ---------- Clay kit ---------- */
  // The plasticine filter. Nothing in it animates (an animated seed over the whole world would stutter on a TV).
  const DEFS = `<svg class="clay-defs" aria-hidden="true" focusable="false"><defs>
    <filter id="clay-lump" x="-12%" y="-12%" width="124%" height="132%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="2.4" result="b"/>
      <feSpecularLighting in="b" surfaceScale="3" specularConstant="0.9" specularExponent="22" lighting-color="#fff" result="s"><feDistantLight azimuth="235" elevation="38"/></feSpecularLighting>
      <feComposite in="s" in2="d" operator="in" result="s2"/>
      <feComposite in="d" in2="s2" operator="arithmetic" k1="0" k2="1" k3="0.75" k4="0" result="lit"/>
      <feDropShadow in="lit" dx="0" dy="4" stdDeviation="2.5" flood-color="#2b1a0c" flood-opacity="0.35"/>
    </filter></defs></svg>`;

  /** An actor: the clay body goes through the filter; googly eyes sit on top, crisp, like real plastic eyes. */
  const clay = (vb, body, eyes) => `<svg viewBox="${vb}" aria-hidden="true"><g filter="url(#clay-lump)">${body}</g>${eyes || ""}</svg>`;
  const goo = (x, y, r) => `<g class="goo"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#3a2412" stroke-width="${(r / 6).toFixed(2)}"/>` +
    `<circle class="pup" cx="${x + r * 0.2}" cy="${y + r * 0.18}" r="${(r * 0.52).toFixed(2)}" fill="#1b1410"/></g>`;

  /** A lumpy edge from x0 to x1 around height y, as path commands starting with "L" (smoothed with quadratic curves). */
  function edge(x0, x1, y, amp, n, seed) {
    const p = [];
    for (let i = 0; i <= n; i++) p.push([x0 + ((x1 - x0) * i) / n, y + Math.sin(i * 1.7 + seed) * amp + Math.sin(i * 0.63 + seed * 2.1) * amp * 0.6]);
    const f = (v) => v.toFixed(1);
    let d = `L${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 1; i <= n; i++) d += ` Q${f(p[i - 1][0])} ${f(p[i - 1][1])} ${f((p[i - 1][0] + p[i][0]) / 2)} ${f((p[i - 1][1] + p[i][1]) / 2)}`;
    return d + ` L${f(p[n][0])} ${f(p[n][1])}`;
  }
  const line = (e) => "M" + e.slice(1); // the same edge as a stroke, for the soft highlight along a clay rim

  /* ---------- Scenery (no filters: lumpy paths and highlight rims) ---------- */
  const tree = (x) => `<rect x="${x - 8}" y="380" width="16" height="56" rx="7" fill="#8a5a2b"/>
    <circle cx="${x - 22}" cy="372" r="26" fill="#4f9a3a"/><circle cx="${x + 20}" cy="370" r="28" fill="#4f9a3a"/><circle cx="${x}" cy="346" r="30" fill="#5aa845"/>
    <circle cx="${x - 10}" cy="336" r="11" fill="#86c866" opacity="0.8"/><circle cx="${x - 28}" cy="364" r="7" fill="#86c866" opacity="0.7"/>`;
  const puff = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="8" rx="70" ry="22" fill="#dbe9f2"/>
    <ellipse cx="-30" cy="0" rx="40" ry="24" fill="#fff"/><ellipse cx="20" cy="-8" rx="46" ry="30" fill="#fff"/><ellipse cx="54" cy="4" rx="28" ry="18" fill="#fff"/></g>`;
  const GROUND = edge(0, 1600, 430, 5, 40, 5);
  const HILLS = edge(0, 1600, 352, 12, 14, 2);
  const BG = `<svg class="sp-bg" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="clay-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc7e8"/><stop offset="1" stop-color="#e3f2f8"/></linearGradient></defs>
    <rect width="1600" height="500" fill="url(#clay-sky)"/>
    <circle cx="1490" cy="74" r="34" fill="#ffd95a"/><circle cx="1480" cy="64" r="15" fill="#fff3b8" opacity="0.8"/>
    ${puff(300, 90, 1)}${puff(800, 60, 0.8)}${puff(1180, 120, 0.9)}
    <path d="M0 500 ${HILLS} L1600 500 Z" fill="#a9d08f"/><path d="${line(HILLS)}" transform="translate(0 7)" fill="none" stroke="#c9e6b2" stroke-width="5" stroke-linecap="round"/>
    ${tree(60)}${tree(330)}${tree(1530)}
    <path d="M0 500 ${GROUND} L1600 500 Z" fill="#6fb04a"/><path d="${line(GROUND)}" transform="translate(0 7)" fill="none" stroke="#9bd06b" stroke-width="7" stroke-linecap="round"/>
    <path d="M0 500 ${edge(0, 1600, 474, 4, 30, 9)} L1600 500 Z" fill="#5c9a3c"/>
    <g fill="#ff8fb1"><circle cx="150" cy="452" r="5"/><circle cx="420" cy="460" r="5"/><circle cx="1010" cy="456" r="5"/><circle cx="1300" cy="462" r="5"/></g>
    <g fill="#ffe27a"><circle cx="250" cy="462" r="5"/><circle cx="700" cy="458" r="5"/><circle cx="1160" cy="452" r="5"/></g>
  </svg>`;

  // The mountains of Ararat. They stay hidden until the flood covers everything, then the water goes down to reveal them.
  // The left flank (x 760–1030) is the path the animals walk down at the end; the plateau at y 300 (40%) holds the ark.
  const MTN_TOP = "M760 470 Q830 440 860 420 Q900 395 930 372 Q960 350 990 330 Q1010 312 1030 302 L1360 300 Q1390 296 1420 276 Q1450 256 1470 252 Q1490 248 1510 264 Q1560 290 1600 300";
  const MOUNTAINS = `<svg class="sp-bg" viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
    <path d="${MTN_TOP} V500 H760 Z" fill="#a98163"/>
    <path d="M900 470 Q980 400 1060 380 Q1150 372 1200 420 Q1260 470 1300 500 H880 Z" fill="#94704f" opacity="0.7"/>
    <path d="M1380 340 Q1440 300 1500 320 Q1560 350 1600 340 V420 Q1500 380 1380 340 Z" fill="#94704f" opacity="0.6"/>
    <path d="${MTN_TOP}" transform="translate(0 8)" fill="none" stroke="#c9a07c" stroke-width="8" stroke-linecap="round"/>
    <path d="M1040 304 L1350 302" stroke="#7cba55" stroke-width="9" stroke-linecap="round"/>
    <path d="M1440 274 Q1470 242 1500 256 Q1492 270 1482 264 Q1472 276 1462 266 Q1452 278 1440 274 Z" fill="#f4f6fb"/>
  </svg>`;

  const WAVE = edge(-60, 1660, 20, 7, 36, 4);
  const WATER = `<svg viewBox="0 0 1600 500" preserveAspectRatio="none" aria-hidden="true">
    <g class="clay-wv"><path d="M-60 500 ${WAVE} L1660 500 Z" fill="#4aa3d8"/>
      <path d="${line(WAVE)}" transform="translate(0 9)" fill="none" stroke="#8fd0f2" stroke-width="6" stroke-linecap="round"/></g>
    <rect y="110" width="1600" height="390" fill="#3a8cc4" opacity="0.55"/>
    <g fill="#bfe6fa" opacity="0.7"><ellipse cx="200" cy="70" rx="26" ry="5"/><ellipse cx="640" cy="90" rx="34" ry="5"/><ellipse cx="1100" cy="66" rx="28" ry="5"/><ellipse cx="1450" cy="96" rx="30" ry="5"/></g>
  </svg>`;

  let storm = "";
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 190, y = 70 + (i % 2) * 22;
    storm += `<ellipse cx="${x}" cy="${y + 34}" rx="120" ry="30" fill="#626b7d"/><ellipse cx="${x - 50}" cy="${y}" rx="70" ry="44" fill="#7d879b"/>
      <ellipse cx="${x + 40}" cy="${y - 14}" rx="80" ry="50" fill="#7d879b"/><ellipse cx="${x + 20}" cy="${y - 34}" rx="34" ry="12" fill="#a3abbc"/>`;
  }
  const CLOUDS = `<svg viewBox="0 0 1600 200" preserveAspectRatio="none" aria-hidden="true"><rect width="1600" height="70" fill="#7d879b"/>${storm}</svg>`;

  let bands = "";
  ["#ff5a4e", "#ff9a3d", "#ffd84d", "#6cc04a", "#4aa3d8", "#8a6ad0"].forEach((c, i) => {
    const r = 284 - i * 16, d = `M${300 - r} 310 A${r} ${r} 0 0 1 ${300 + r} 310`;
    bands += `<g class="band"><path d="${d}" pathLength="1" stroke="${c}" stroke-width="18" fill="none" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path d="${d}" pathLength="1" transform="translate(0 -5)" stroke="#fff" stroke-opacity="0.35" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/></g>`;
  });
  const RAINBOW = `<svg viewBox="0 0 600 320" aria-hidden="true">${bands}
    <g class="puffs" style="opacity:0">${puff(52, 296, 0.75)}${puff(548, 296, 0.75)}</g></svg>`;

  /* ---------- Characters ---------- */
  const NOAH = clay("0 0 120 200", `
    <ellipse cx="44" cy="193" rx="14" ry="6" fill="#6b3b1a"/><ellipse cx="76" cy="193" rx="14" ry="6" fill="#6b3b1a"/>
    <path d="M36 92 Q60 80 84 92 L98 188 Q60 198 22 188 Z" fill="#7d5aa6"/>
    <path d="M30 160 Q60 170 90 160" stroke="#64478a" stroke-width="5" fill="none"/>
    <path d="M33 122 Q60 130 88 122" stroke="#e0b13a" stroke-width="8" fill="none"/>
    <path d="M38 98 Q22 120 26 142" stroke="#6c4b94" stroke-width="15" fill="none" stroke-linecap="round"/><circle cx="26" cy="146" r="8" fill="#f0c49a"/>
    <ellipse cx="33" cy="58" rx="5" ry="8" fill="#e8b488"/><ellipse cx="87" cy="58" rx="5" ry="8" fill="#e8b488"/>
    <circle cx="60" cy="54" r="27" fill="#f0c49a"/>
    <path d="M35 52 Q30 32 44 26 M85 52 Q90 32 76 26" stroke="#e8e6ef" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M34 58 Q32 104 60 112 Q88 104 86 58 Q76 74 60 72 Q44 74 34 58 Z" fill="#f2f1f6"/>
    <path d="M46 72 Q60 64 74 72 Q60 79 46 72 Z" fill="#dedce6"/>
    <ellipse cx="60" cy="63" rx="7" ry="6" fill="#e8a27a"/>
    <path d="M54 82 Q60 87 66 82" stroke="#8a4a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M42 37 Q49 33 55 37 M65 37 Q71 33 78 37" stroke="#f2f1f6" stroke-width="5" fill="none" stroke-linecap="round"/>
    <g class="arm" style="transform-box:view-box;transform-origin:82px 98px">
      <g class="hammer" style="opacity:0"><path d="M102 136 L128 126" stroke="#8a5a2b" stroke-width="6" stroke-linecap="round"/><rect x="122" y="112" width="13" height="26" rx="4" fill="#8e8fa3"/></g>
      <path d="M82 98 Q100 112 102 132" stroke="#6c4b94" stroke-width="15" fill="none" stroke-linecap="round"/><circle cx="102" cy="136" r="8" fill="#f0c49a"/>
    </g>`, goo(50, 48, 8) + goo(70, 48, 8));

  const NEIGHBOR = (robe, hair, skin, hat) => clay("0 0 90 170", `
    <ellipse cx="34" cy="165" rx="11" ry="5" fill="#6b3b1a"/><ellipse cx="56" cy="165" rx="11" ry="5" fill="#6b3b1a"/>
    <path d="M26 80 Q45 70 64 80 L74 160 Q45 168 16 160 Z" fill="${robe}"/>
    <path d="M28 86 Q14 104 24 118" stroke="${robe}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="25" cy="120" r="6" fill="${skin}"/>
    <path d="M62 86 Q76 104 66 118" stroke="${robe}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="65" cy="120" r="6" fill="${skin}"/>
    <circle cx="45" cy="48" r="22" fill="${skin}"/>
    ${hat ? `<path d="M20 40 Q45 4 70 40 Q45 30 20 40 Z" fill="${hair}"/>` : `<path d="M23 44 Q24 22 45 22 Q66 22 67 44 Q56 33 45 33 Q34 33 23 44 Z" fill="${hair}"/>`}
    <ellipse cx="45" cy="55" rx="5" ry="4" fill="#00000022"/>
    <ellipse cx="45" cy="63" rx="3.5" ry="4.5" fill="#5a2e0e"/>`, goo(37, 45, 7) + goo(53, 45, 7));

  const ELEPHANT = (c1, c2) => clay("-8 0 132 80", `
    <rect x="14" y="44" width="16" height="32" rx="7" fill="${c2}"/><rect x="58" y="44" width="16" height="32" rx="7" fill="${c2}"/>
    <path d="M2 34 Q-6 44 -2 54" stroke="${c2}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="46" cy="40" rx="46" ry="30" fill="${c1}"/>
    <rect x="24" y="50" width="16" height="28" rx="7" fill="${c1}"/><rect x="66" y="50" width="16" height="28" rx="7" fill="${c1}"/>
    <g fill="#f4f1ea"><circle cx="29" cy="76" r="2.5"/><circle cx="35" cy="76" r="2.5"/><circle cx="71" cy="76" r="2.5"/><circle cx="77" cy="76" r="2.5"/></g>
    <circle cx="92" cy="30" r="22" fill="${c1}"/>
    <ellipse cx="80" cy="30" rx="14" ry="18" fill="${c2}"/>
    <path d="M108 38 Q122 60 110 76" stroke="${c1}" stroke-width="11" fill="none" stroke-linecap="round"/>`, goo(99, 23, 6));

  const GIRAFFE = (c1, c2, spot) => clay("-8 -34 110 136", `
    <rect x="8" y="58" width="9" height="42" rx="4" fill="${c2}"/><rect x="44" y="58" width="9" height="42" rx="4" fill="${c2}"/>
    <path d="M-3 54 Q-9 64 -5 74" stroke="${c2}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="30" cy="58" rx="34" ry="20" fill="${c1}"/>
    <rect x="18" y="62" width="9" height="38" rx="4" fill="${c1}"/><rect x="54" y="62" width="9" height="38" rx="4" fill="${c1}"/>
    <path d="M52 48 L66 -10 L80 -6 L66 52 Z" fill="${c1}"/>
    <path d="M74 -20 v-9 M84 -20 v-9" stroke="${spot}" stroke-width="3.5" stroke-linecap="round"/><circle cx="74" cy="-30" r="3" fill="${spot}"/><circle cx="84" cy="-30" r="3" fill="${spot}"/>
    <ellipse cx="80" cy="-12" rx="17" ry="10" fill="${c1}"/><ellipse cx="94" cy="-9" rx="4" ry="3" fill="${spot}" opacity="0.6"/>
    <g fill="${spot}"><circle cx="20" cy="52" r="6"/><circle cx="38" cy="62" r="5"/><circle cx="8" cy="62" r="4"/><circle cx="46" cy="48" r="4"/><circle cx="64" cy="18" r="4"/><circle cx="67" cy="36" r="4"/></g>`, goo(82, -16, 5));

  const TURTLE = clay("0 0 88 46", `
    <ellipse cx="18" cy="38" rx="8" ry="6" fill="#4f8f34"/><ellipse cx="60" cy="38" rx="8" ry="6" fill="#4f8f34"/>
    <circle cx="77" cy="28" r="9" fill="#8cc46a"/>
    <path d="M8 36 Q10 6 40 6 Q70 6 72 36 Z" fill="#5aa04a"/>
    <path d="M22 33 L28 18 L40 12 L52 18 L58 33 M28 18 L40 24 L52 18 M40 24 V33" stroke="#3f7a30" stroke-width="3" fill="none" stroke-linejoin="round"/>
    <path d="M6 36 H74" stroke="#3f7a30" stroke-width="4" stroke-linecap="round"/>`, goo(80, 25, 4));

  const BIRD = (body, wing, beak, dove) => clay("0 0 72 44", `
    <path d="M16 24 L0 16 L3 32 Z" fill="${wing}"/>
    <ellipse cx="32" cy="26" rx="20" ry="12" fill="${body}"/><circle cx="52" cy="18" r="10" fill="${body}"/>
    <path d="M60 15 L71 19 L60 23 Z" fill="${beak}"/>
    ${dove ? `<g class="leaf" style="opacity:0"><path d="M66 20 Q76 11 88 17 Q79 27 66 20 Z" fill="#6aa84f"/><path d="M68 20 L85 17" stroke="#3f7a30" stroke-width="1.5"/></g>` : ""}
    <g class="wing" style="transform-box:view-box;transform-origin:32px 22px"><path d="M22 22 Q32 -2 46 20 Z" fill="${wing}"/></g>`, goo(54, 15, 4.5));

  const person = (x, robe, hair, skin) => `<path d="M${x - 13} 104 Q${x - 12} 58 ${x} 56 Q${x + 12} 58 ${x + 13} 104 Z" fill="${robe}"/>
    <circle cx="${x}" cy="42" r="14" fill="${skin}"/><path d="M${x - 14} 40 Q${x} 18 ${x + 14} 40 Q${x} 32 ${x - 14} 40 Z" fill="${hair}"/>`;
  const FAM = [[18, "#e8743b", "#3a2412", "#e0a878"], [48, "#4aa3d8", "#6b3b1a", "#c68a52"], [78, "#6cc04a", "#2a160b", "#8d5a34"],
    [108, "#ffd84d", "#3a2412", "#f0c49a"], [138, "#ff8fb1", "#6b3b1a", "#c68a52"], [168, "#2ec4a6", "#2a160b", "#e0a878"], [198, "#c98a4b", "#e8e6ef", "#f0c49a"]];
  const FAMILY = clay("0 0 216 108", FAM.map((f) => person(...f)).join(""), FAM.map(([x]) => goo(x - 5, 42, 3.6) + goo(x + 5, 42, 3.6)).join(""));

  const ALTAR = clay("0 0 90 84", `
    <rect class="st" x="4" y="60" width="40" height="21" rx="8" fill="#a3a4b8"/><rect class="st" x="46" y="60" width="40" height="21" rx="8" fill="#8e8fa3"/>
    <rect class="st" x="14" y="41" width="32" height="20" rx="8" fill="#8e8fa3"/><rect class="st" x="44" y="41" width="30" height="20" rx="8" fill="#a3a4b8"/>
    <rect class="st" x="24" y="24" width="42" height="19" rx="8" fill="#b4b5c6"/>
    <g class="fire" style="opacity:0;transform-box:view-box;transform-origin:45px 26px"><path d="M45 28 Q28 14 40 0 Q44 12 50 5 Q64 16 45 28 Z" fill="#ff8a2a"/>
      <path d="M45 26 Q37 18 43 9 Q46 15 50 12 Q55 20 45 26 Z" fill="#ffd84d"/></g>`);

  const WOOD = clay("0 -8 130 62", `
    <rect x="6" y="30" width="118" height="20" rx="10" fill="#a8642b"/><circle cx="114" cy="40" r="8" fill="#e0b07a"/>
    <rect x="18" y="12" width="100" height="20" rx="10" fill="#b97a3e"/><circle cx="108" cy="22" r="8" fill="#e9c08a"/>
    <rect x="34" y="-6" width="70" height="19" rx="9" fill="#a8642b"/><circle cx="95" cy="3.5" r="7" fill="#e0b07a"/>`);

  const SCROLL = `<svg viewBox="0 0 170 110" aria-hidden="true"><g filter="url(#clay-lump)">
    <rect x="14" y="8" width="142" height="94" rx="6" fill="#f3e2b8"/>
    <rect x="4" y="2" width="18" height="106" rx="9" fill="#d9b77a"/><rect x="148" y="2" width="18" height="106" rx="9" fill="#d9b77a"/>
    <path d="M38 60 L132 60 L120 76 L50 76 Z M60 60 V48 H110 V60 M55 50 L85 36 L115 50" stroke="#8a5226" stroke-width="3" fill="none" stroke-linejoin="round"/></g>
    <g font-family="'Baloo 2', 'Nunito', sans-serif" font-weight="800" text-anchor="middle" fill="#8a5226">
      <text x="85" y="28" font-size="13">cypress wood</text><text x="85" y="95" font-size="14">300 cubits long</text></g></svg>`;

  // The ark (viewBox 400 × 230). Parts start hidden so Noah can build it; the door swings shut from its hinge.
  const ARK_VB = [400, 230], ARK_H = 36;
  const ARK = clay("0 0 400 230", `
    <g class="peek" style="opacity:0"><path d="M196 30 L206 -26 L220 -24 L212 32 Z" fill="#f0c94e"/><ellipse cx="222" cy="-30" rx="16" ry="10" fill="#f0c94e"/>
      <path d="M216 -38 v-8 M226 -38 v-8" stroke="#b47a22" stroke-width="3.5" stroke-linecap="round"/><circle cx="206" cy="6" r="4" fill="#b47a22"/></g>
    <g class="p-cabin" style="opacity:0;transform-box:fill-box;transform-origin:50% 100%">
      <rect x="92" y="50" width="216" height="68" rx="8" fill="#c98a4b"/>
      <path d="M96 74 H304 M96 96 H304" stroke="#a8642b" stroke-width="4"/>
      <rect x="128" y="62" width="22" height="18" rx="4" fill="#3a220f"/><rect x="196" y="62" width="22" height="18" rx="4" fill="#3a220f"/>
      <rect x="268" y="62" width="24" height="20" rx="4" fill="#3a220f"/></g>
    <g class="p-roof" style="opacity:0;transform-box:fill-box;transform-origin:50% 100%"><path d="M74 58 Q200 2 326 58 Z" fill="#7a4219"/>
      <path d="M96 50 Q200 12 304 50" stroke="#9a5a2a" stroke-width="5" fill="none" stroke-linecap="round"/></g>
    <g class="p-hull" style="opacity:0;transform-box:fill-box;transform-origin:50% 100%">
      <path d="M6 110 Q200 124 394 110 L354 220 Q200 230 46 220 Z" fill="#a8642b"/>
      <path d="M18 142 Q200 154 382 142 M30 172 Q200 184 370 172 M40 200 Q200 210 360 200" stroke="#7a4219" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M10 114 Q200 128 390 114" stroke="#c98a4b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="120" y="138" width="44" height="62" rx="6" fill="#3a220f"/>
      <g class="door" style="transform-box:view-box;transform-origin:120px 169px;transform:scaleX(0)"><rect x="120" y="138" width="44" height="62" rx="6" fill="#c98a4b"/>
        <path d="M134 143 v52 M150 143 v52" stroke="#8a5226" stroke-width="3"/></g></g>
    <g class="ramp" style="opacity:0"><path d="M120 200 L164 200 L72 234 L28 234 Z" fill="#b97a3e"/>
      <path d="M112 206 L64 224 M132 206 L84 224 M152 206 L104 224" stroke="#8a5226" stroke-width="3"/></g>`,
    `<g class="peek-eyes" style="opacity:0">${goo(222, -33, 5)}</g>`);

  /* ---------- Scene ---------- */
  async function play(D) {
    const W = D.world, overlay = D.frame.querySelector(".sp-overlay");
    const frames = (ms) => Math.max(2, Math.round(ms / 85)); // stop-motion: about 12 poses a second
    const stepped = (ms) => `steps(${frames(ms)}, end)`;
    const box = (cls, html) => { const d = el("div", { class: cls }); if (html) d.innerHTML = html; return d; };

    // Back to front: sky and ground, storm tint, storm clouds, rainbow, mountains, God's light, actors, then the water.
    W.insertAdjacentHTML("afterbegin", DEFS + BG);
    const dim = W.appendChild(box("clay-dim"));
    const clouds = W.appendChild(box("clay-clouds", CLOUDS));
    const rainbow = D.actor(RAINBOW, { x: 61, y: 12, h: 84, cls: "clay-rainbow" });
    const mtn = W.appendChild(box("clay-mtn", MOUNTAINS));
    const beam = W.appendChild(box("clay-beam"));
    const altar = D.actor(ALTAR, { x: 56, y: 12, h: 10, cls: "clay-boil", hidden: true });
    const wood = D.actor(WOOD, { x: 45, y: 12, h: 9, cls: "clay-boil" });
    const ark = D.actor(ARK, { x: 45, y: 12.5, h: ARK_H, cls: "clay-boil big" });
    const scroll = D.actor(SCROLL, { x: 36, y: 46, h: 24, cls: "clay-boil", hidden: true });
    const nb1 = D.actor(NEIGHBOR("#e8743b", "#3a2412", "#c68a52"), { x: -6, y: 12, h: 22, cls: "clay-boil", hidden: true });
    const nb2 = D.actor(NEIGHBOR("#4aa3d8", "#ffd84d", "#f0c49a", true), { x: -12, y: 12, h: 21, cls: "clay-boil", hidden: true });
    const noah = D.actor(NOAH, { x: -6, y: 12, h: 24, cls: "clay-boil" });
    const family = D.actor(FAMILY, { x: 73, y: 41, h: 13, cls: "clay-boil", hidden: true });
    const animals = [
      D.actor(ELEPHANT("#a3a4b8", "#8e8fa3"), { x: -8, y: 12, h: 15, cls: "clay-boil", hidden: true }),
      D.actor(ELEPHANT("#9b9cb0", "#86879b"), { x: -8, y: 12, h: 13.5, cls: "clay-boil", hidden: true }),
      D.actor(GIRAFFE("#f0c94e", "#e0b13a", "#b47a22"), { x: -8, y: 12, h: 25, cls: "clay-boil", hidden: true }),
      D.actor(GIRAFFE("#e8bf45", "#d6a52f", "#a86f1c"), { x: -8, y: 12, h: 23, cls: "clay-boil", hidden: true }),
    ];
    const turtles = [D.actor(TURTLE, { x: -4, y: 12, h: 5, cls: "clay-boil", hidden: true }), D.actor(TURTLE, { x: -8, y: 12, h: 4.6, cls: "clay-boil", hidden: true })];
    const raven = D.actor(BIRD("#2b2b38", "#3d3d4d", "#6a6a78"), { x: 80, y: 64, h: 7, cls: "clay-boil", hidden: true });
    const dove = D.actor(BIRD("#f4f4f8", "#dcdce6", "#e6a04a", true), { x: 80, y: 64, h: 7, cls: "clay-boil", hidden: true });
    const water = W.appendChild(box("clay-water", WATER));
    const rain = box("clay-rain");
    rain.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 120"><g fill="#7cc4ec"><path d="M12 6 q7 14 0 18 q-7 -4 0 -18z"/><path d="M42 46 q7 14 0 18 q-7 -4 0 -18z"/><path d="M24 86 q7 14 0 18 q-7 -4 0 -18z"/></g><g fill="#fff" opacity=".7"><circle cx="10" cy="19" r="2"/><circle cx="40" cy="59" r="2"/><circle cx="22" cy="99" r="2"/></g></svg>`)}")`;
    overlay.prepend(rain);
    const q = (a, sel) => a.querySelector(sel);
    const clearBursts = () => overlay.querySelectorAll(".sp-burst").forEach((b) => b.remove());

    /* Stop-motion helpers. */
    // Walk in hops: position and bob both jump between poses instead of gliding.
    function walk(a, x, y, ms, o) {
      o = o || {};
      const n = frames(ms), hops = Math.max(1, Math.round(n / 2));
      const fx = a._x, fy = a._y;
      a._x = x; a._y = y;
      const t = { duration: ms, easing: `steps(${n}, end)` };
      const run = Promise.all([D.to(a, "left", fx + "%", x + "%", t), D.to(a, "bottom", fy + "%", y + "%", t)]);
      const bob = [];
      for (let i = 0; i <= hops * 2; i++) bob.push({ transform: i % 2 ? `translateY(-${o.bob || 5}%) rotate(${o.tilt == null ? 3 : o.tilt}deg)` : "none" });
      if (o.bob !== 0) D.anim(a, bob, { duration: ms, easing: `steps(${hops * 2}, end)` });
      if (o.sfx) D.sfx(o.sfx);
      return run;
    }
    // Camera, the same framing math as D.cam, but the move is posed frame by frame with an ease in and out.
    let camAt = null;
    function cam(cx, cy, s, ms) {
      let tx = 0.25 - cx * s, ty = 0.5 - cy * s;
      tx = Math.min(0, Math.max(0.5 - s, tx));
      ty = s >= 1 ? Math.min(0, Math.max(1 - s, ty)) : 1 - s;
      const to = { tx, ty, s }, from = camAt || to;
      camAt = to;
      const fmt = (c) => `translate(${(c.tx * 100).toFixed(2)}%, ${(c.ty * 100).toFixed(2)}%) scale(${c.s.toFixed(3)})`;
      W.style.transform = fmt(to);
      if (!ms || REDUCED()) return D.wait(0);
      const n = frames(ms), kf = [];
      for (let i = 0; i <= n; i++) {
        const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
        kf.push({ transform: fmt({ tx: from.tx + (to.tx - from.tx) * e, ty: from.ty + (to.ty - from.ty) * e, s: from.s + (to.s - from.s) * e }), easing: "steps(1, end)" });
      }
      return D.anim(W, kf, { duration: ms, easing: "linear" });
    }
    const show = (n, ms) => D.to(n, "opacity", "0", "1", { duration: ms || 250, easing: stepped(ms || 250) });
    const hide = (n, ms) => D.to(n, "opacity", "1", "0", { duration: ms || 250, easing: stepped(ms || 250) });
    // A clay part squashes into place: squish, overshoot, settle.
    const plop = (n, ms) => {
      n.style.opacity = "1";
      return D.anim(n, [{ transform: "scale(1, 0)" }, { transform: "scale(1.12, 1.1)", offset: 0.65 }, { transform: "scale(1, 1)" }], { duration: ms || 600, easing: stepped(ms || 600) });
    };
    // Googly eyes rattle around.
    const googly = (a, ms) => a.querySelectorAll(".pup").forEach((p, i) => {
      const r = +p.getAttribute("r") * 0.55;
      D.loop(p, [[0, 0], [r, r * 0.6], [-r * 0.7, r], [r * 0.5, -r * 0.8], [0, 0]].map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })), { duration: ms || 640, delay: i * 70, easing: "steps(4, end)" });
    });
    let level = -8; // flood height, % of the world from the bottom
    const flood = (to, ms) => {
      const from = level;
      level = to;
      return D.to(water, "transform", `translateY(${96 - from}%)`, `translateY(${96 - to}%)`, { duration: ms, easing: stepped(ms) });
    };
    water.style.transform = `translateY(${96 - level}%)`;
    // Points on the ark in world % (for walking animals to its ramp and door), from its viewBox units.
    const arkW = () => (ARK_H * ARK_VB[0]) / ARK_VB[1] / 3.2; // ark width, % of the world (the world is 3.2 frame-heights wide)
    const arkPt = (vx, vy) => ({ x: ark._x + (vx / ARK_VB[0] - 0.5) * arkW(), y: ark._y + ((ARK_VB[1] - vy) / ARK_VB[1]) * ARK_H });
    const flap = (b) => D.loop(q(b, ".wing"), [{ transform: "scaleY(1)" }, { transform: "scaleY(-0.7)" }], { duration: 260, direction: "alternate", easing: "steps(1, end)" });

    const beats = [];
    const beat = (fn) => beats.push(fn);

    beat(async () => {
      await cam(0.3, 0.5, 1, 0);
      THP.Music.play("strut");
      await D.card("Story Scene 4", "TWO BY TWO", "Noah's Ark · Genesis 6–9", 1600);
    });
    beat(async () => {
      await Promise.all([
        D.narrate("Long ago, people forgot all about God. But one man was different. Noah “walked faithfully with God.”", 3000),
        walk(noah, 24, 12, 2400, { bob: 4, sfx: "step" }),
      ]);
    });
    beat(async () => {
      D.sfx("correct");
      show(beam, 700);
      await D.narrate("God told Noah: “Make yourself an ark of cypress wood.”", 300);
      D.sfx("flip");
      await plop(scroll, 500);
      await D.narrate("300 cubits long! That's about 450 feet, longer than a football field.", 400);
      hide(scroll, 300);
      googly(noah);
      await D.bubble(noah, 60, 22, "Noah", "That's a LOT of wood.");
      hide(beam, 500);
    });
    beat(async () => {
      await Promise.all([cam(0.37, 0.5, 1, 900), walk(noah, 31, 12, 900, { bob: 4 })]);
      const arm = q(noah, ".arm"), hammer = q(noah, ".hammer");
      hammer.style.opacity = "1";
      D.loop(arm, [{ transform: "rotate(-95deg)" }, { transform: "rotate(-20deg)" }], { duration: 300, direction: "alternate", easing: "steps(1, end)" });
      const say = D.narrate("So Noah built. And built. And BUILT. Smack in the middle of dry land.", 600);
      const parts = [[".p-hull", "BANG!", 150], [".p-cabin", "TAP TAP!", 80], [".p-roof", "BONK!", 30]];
      for (const [sel, word, vy] of parts) {
        D.sfx("tap");
        const p = D.point(ark, 200, vy);
        D.burst(word, p.fx, Math.max(14, p.fy), "clay-pop");
        await plop(q(ark, sel), 600);
        if (sel === ".p-hull") hide(wood, 300);
        D.sfx("impact");
        await D.wait(250);
        clearBursts();
      }
      await say;
      await D.narrate("“Noah did everything just as God commanded him.”", 1900);
    });
    beat(async () => {
      q(noah, ".arm").style.transform = "rotate(-20deg)";
      nb1.style.opacity = nb2.style.opacity = "1";
      D.narrate("The neighbors came to stare. A giant boat? With no water anywhere?", 0);
      await Promise.all([cam(0.25, 0.5, 1, 900), walk(nb1, 15, 12, 1500, { sfx: "step" }), walk(nb2, 7, 12, 1700)]);
      googly(nb1); googly(nb2);
      await D.wait(1600);
      await D.bubble(nb1, 45, 22, "Neighbor", "Um, Noah? Where's the sea?", { hold: 2100 });
      await D.bubble(nb2, 45, 22, "Other neighbor", "Maybe it's a really big bathtub.", { hold: 2300 });
      nb1.classList.add("clay-flip"); nb2.classList.add("clay-flip");
      D.sfx("tap");
      await Promise.all([D.narrate("Noah just kept on building.", 400), walk(nb1, -8, 12, 1500), walk(nb2, -12, 12, 1400)]);
    });
    beat(async () => {
      q(noah, ".hammer").style.opacity = "0";
      q(noah, ".arm").style.transform = "none";
      walk(noah, 29, 12, 500, { bob: 3 });
      await Promise.all([cam(0.3, 0.5, 1, 800), plop(q(ark, ".ramp"), 500)]);
      const foot = arkPt(50, 234), door = arkPt(142, 200);
      // Each animal hops in from the left, climbs the ramp and squishes through the door.
      const board = async (a, delay, ms) => {
        await D.wait(delay);
        a.style.opacity = "1";
        await walk(a, foot.x - 0.5, foot.y, ms, { bob: 6, tilt: 4 });
        await walk(a, door.x, door.y, 800, { bob: 4 });
        D.sfx("tap");
        await D.anim(a, [{ scale: "1 1", opacity: 1 }, { scale: "0.5 0.45", opacity: 0 }], { duration: 340, easing: "steps(3, end)", fill: "forwards" });
      };
      const say = D.narrate("Then the animals came, two by two, male and female. Some kinds even came in seven pairs!");
      D.sfx("bray");
      await Promise.all([board(animals[0], 0, 2000), board(animals[1], 400, 2000), board(animals[2], 1300, 2000), board(animals[3], 1700, 2000), say]);
      animals.forEach(googly);
      turtles.forEach((t) => (t.style.opacity = "1"));
      googly(turtles[0]); googly(turtles[1]);
      await Promise.all([
        D.narrate("…and the turtles. Still coming. Aaalmost… made it!", 0),
        (async () => { await walk(turtles[0], foot.x - 0.5, foot.y, 2400, { bob: 3, tilt: 1 }); await walk(turtles[0], door.x, door.y, 600, { bob: 3 }); await hide(turtles[0], 200); })(),
        (async () => { await walk(turtles[1], foot.x - 2, foot.y, 2400, { bob: 3, tilt: 1 }); await walk(turtles[1], door.x, door.y, 700, { bob: 3 }); await hide(turtles[1], 200); })(),
      ]);
    });
    beat(async () => {
      const foot = arkPt(50, 234), door = arkPt(142, 200);
      const say = D.narrate("Noah, his wife, his three sons and their wives went in too. Eight people in all.", 500);
      await walk(noah, foot.x, foot.y, 900, { bob: 3 });
      await walk(noah, door.x, door.y, 800, { bob: 3 });
      await D.anim(noah, [{ scale: "1 1", opacity: 1 }, { scale: "0.6 0.5", opacity: 0 }], { duration: 300, easing: "steps(3, end)", fill: "forwards" });
      await say;
      await cam(door.x / 100, 0.6, 1.4, 800);
      hide(q(ark, ".ramp"), 400);
      const glow = box("clay-glow");
      const g = D.point(ark, 142, 168);
      glow.style.left = g.fx + "%"; glow.style.top = g.fy + "%";
      overlay.append(glow);
      D.sfx("correct");
      await D.anim(glow, [{ scale: 0.2, opacity: 0 }, { scale: 1.2, opacity: 1 }], { duration: 600, easing: "steps(5, end)", fill: "forwards" });
      await D.to(q(ark, ".door"), "transform", "scaleX(0)", "scaleX(1)", { duration: 600, easing: "steps(5, end)" });
      D.sfx("impact"); D.shake(1.2);
      D.burst("THUNK!", g.fx, Math.max(14, g.fy - 18), "clay-pop");
      D.anim(glow, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: "steps(6, end)", fill: "forwards" }).then(() => glow.remove());
      await D.narrate("“Then the LORD shut him in.”", 1400);
    });
    beat(async () => {
      THP.Music.play("redsea");
      await cam(0.42, 0.5, 1, 1000);
      D.sfx("whoosh");
      show(dim, 900);
      clouds.style.opacity = "1";
      D.to(clouds, "transform", "translateY(-110%)", "translateY(0%)", { duration: 1200, easing: stepped(1200) });
      D.to(rain, "opacity", "0", "1", { duration: 600, easing: stepped(600) });
      D.loop(rain, [{ transform: "translateY(0)" }, { transform: "translateY(30cqh)" }], { duration: 420, easing: "steps(4, end)" });
      D.loop(q(water, ".clay-wv"), [{ transform: "translateX(0)" }, { transform: "translateX(-36px)" }], { duration: 1000, direction: "alternate", easing: "steps(4, end)" });
      await D.narrate("Drip. Drop. SPLOOSH! Rain fell for 40 days and 40 nights.", 100);
      await flood(20, 1400);
      D.loop(ark, [{ transform: "rotate(-2deg)" }, { transform: "rotate(2deg) translateY(-2%)" }], { duration: 1300, direction: "alternate", easing: "steps(5, end)" });
      await Promise.all([
        D.narrate("The water rose higher and higher. And the ark? It floated, safe and dry.", 2400),
        flood(54, 3600),
        D.to(ark, "bottom", "12.5%", "46.5%", { duration: 3600, easing: stepped(3600) }),
        cam(0.45, 0.5, 1, 2000),
      ]);
      ark._y = 46.5;
      mtn.style.opacity = "1"; // hidden under the water, ready to show up when it goes down
    });
    beat(async () => {
      D.loop(rain, [{ transform: "translateY(0)" }, { transform: "translateY(30cqh)" }], { duration: 420, easing: "steps(4, end)" });
      D.loop(q(water, ".clay-wv"), [{ transform: "translateX(0)" }, { transform: "translateX(-36px)" }], { duration: 1000, direction: "alternate", easing: "steps(4, end)" });
      D.loop(ark, [{ transform: "rotate(-2deg)" }, { transform: "rotate(2deg) translateY(-2%)" }], { duration: 1300, direction: "alternate", easing: "steps(5, end)" });
      await Promise.all([cam(0.62, 0.5, 1, 3000), walk(ark, 62, 46.5, 3000, { bob: 0 }),
        (async () => { show(q(ark, ".peek"), 300); await show(q(ark, ".peek-eyes"), 300); googly(ark); })(),
        D.narrate("Inside: eight people and a boatload of animals. Imagine the smell. Actually… don't.", 1800)]);
      hide(q(ark, ".peek"), 300); hide(q(ark, ".peek-eyes"), 300);
      D.sfx("whoosh");
      hide(rain, 800); hide(dim, 1400);
      D.to(clouds, "transform", "translateY(0%)", "translateY(-110%)", { duration: 1600, easing: stepped(1600) }).then(() => (clouds.style.opacity = "0"));
      await Promise.all([D.narrate("But God remembered Noah. He sent a wind, and the rain stopped.", 1600), cam(0.75, 0.5, 1, 2000), walk(ark, 76, 46.5, 2000, { bob: 0 })]);
    });
    beat(async () => {
      THP.Music.play("manna");
      D.loop(q(water, ".clay-wv"), [{ transform: "translateX(0)" }, { transform: "translateX(-36px)" }], { duration: 1000, direction: "alternate", easing: "steps(4, end)" });
      const say = D.narrate("Slowly, slowly, the water went down… until BUMP! The ark came to rest on the mountains of Ararat.", 600);
      await Promise.all([flood(47, 2600), D.to(ark, "bottom", "46.5%", "39.5%", { duration: 2600, easing: stepped(2600) })]);
      ark._y = 39.5;
      D.sfx("impact"); D.shake(1);
      const p = D.point(ark, 200, 226);
      D.burst("BUMP!", p.fx, Math.min(86, p.fy), "clay-pop");
      await D.anim(ark, [{ transform: "rotate(0)" }, { transform: "rotate(-3deg) translateY(-3%)" }, { transform: "rotate(1deg)" }, { transform: "rotate(0)" }], { duration: 500, easing: "steps(3, end)" });
      await Promise.all([flood(36, 1600), say]);
    });
    beat(async () => {
      const win = arkPt(280, 72);
      await cam(0.76, 0.42, 1, 800);
      raven._x = win.x; raven._y = win.y;
      raven.style.left = win.x + "%"; raven.style.bottom = win.y + "%";
      show(raven, 200);
      flap(raven);
      const say = D.narrate("Noah opened a window and sent out a raven. It flew back and forth, back and forth.", 300);
      const fly = (b, x, y, ms) => walk(b, x, y, ms, { bob: 10, tilt: 0 });
      await fly(raven, 92, 82, 900);
      raven.classList.add("clay-flip");
      await fly(raven, 58, 76, 1300);
      raven.classList.remove("clay-flip");
      await fly(raven, 112, 84, 1100);
      await say;
      dove._x = win.x; dove._y = win.y;
      dove.style.left = win.x + "%"; dove.style.bottom = win.y + "%";
      show(dove, 200);
      flap(dove);
      const say2 = D.narrate("Then he sent out a dove. On its second trip, it came back with a fresh olive leaf in its beak!", 400);
      await fly(dove, 108, 80, 1200);
      q(dove, ".leaf").style.opacity = "1";
      dove.classList.add("clay-flip");
      await D.wait(300);
      await fly(dove, win.x + 4, win.y + 2, 1200);
      D.sfx("correct");
      const p = D.point(dove, 76, 18);
      D.burst("LEAF!", Math.min(84, p.fx), Math.max(16, p.fy - 14), "clay-pop leaf");
      googly(dove);
      await say2;
      clearBursts();
      dove.classList.remove("clay-flip");
      q(dove, ".leaf").style.opacity = "0";
      await Promise.all([D.narrate("A week later he sent it again. This time it didn't come back. Dry land!", 400),
        (async () => { await fly(dove, 96, 86, 900); await fly(dove, 116, 92, 900); })()]);
    });
    beat(async () => {
      await Promise.all([flood(-8, 1600), cam(0.62, 0.5, 0.8, 1600)]);
      D.to(q(ark, ".door"), "transform", "scaleX(1)", "scaleX(0)", { duration: 500, easing: "steps(4, end)" });
      await plop(q(ark, ".ramp"), 500);
      const door = arkPt(142, 200), foot = arkPt(50, 234);
      const path = [[foot.x, foot.y], [64.4, 39.5], [60, 30], [53.8, 15.5], [50, 12]];
      // Out they come, one at a time, down the ramp and the mountainside to the fresh green ground.
      const out = async (a, delay, endX, endY, legMs) => {
        await D.wait(delay);
        a.classList.add("clay-flip");
        a._x = door.x; a._y = door.y; a.style.left = door.x + "%"; a.style.bottom = door.y + "%";
        a.style.scale = "1 1";
        await D.anim(a, [{ scale: "0.5 0.45", opacity: 0 }, { scale: "1.1 1.05", opacity: 1 }, { scale: "1 1", opacity: 1 }], { duration: 360, easing: "steps(3, end)", fill: "forwards" });
        a.style.opacity = "1";
        for (const [x, y] of path) await walk(a, x, y, legMs, { bob: 6, tilt: -4 });
        if (endX != null) { a.classList.remove("clay-flip"); await walk(a, endX, endY, legMs, { bob: 6, tilt: 4 }); }
      };
      const say = D.narrate("God said, “Come out of the ark.” And out they came: stomping, hopping and stretching their legs!");
      D.sfx("bray");
      await Promise.all([
        out(animals[0], 0, null, 0, 420).then(() => walk(animals[0], 27, 12, 900, { bob: 6, tilt: -4 })),
        out(animals[1], 450, null, 0, 420).then(() => walk(animals[1], 32, 12, 700, { bob: 6, tilt: -4 })),
        out(animals[2], 900, null, 0, 420).then(() => walk(animals[2], 37.5, 12, 600, { bob: 6, tilt: -4 })),
        out(animals[3], 1350, null, 0, 420).then(() => walk(animals[3], 42, 12, 500, { bob: 6, tilt: -4 })),
        out(family, 1800, 46, 12, 420),
        out(noah, 2300, 51, 12, 420),
        say,
      ]);
      noah.classList.remove("clay-flip");
      turtles.forEach((t, i) => { t.classList.add("clay-flip"); t._x = door.x; t._y = door.y; t.style.left = door.x + "%"; t.style.bottom = door.y + "%"; t.style.scale = "1 1"; show(t, 200); walk(t, 64 - i * 1.5, 38.5, 3000, { bob: 3, tilt: 1 }); });
      animals.forEach(googly);
    });
    beat(async () => {
      await cam(0.56, 0.5, 0.8, 700);
      altar.style.opacity = "1";
      const stones = altar.querySelectorAll(".st");
      stones.forEach((s) => (s.style.opacity = "0"));
      const say = D.narrate("Noah built an altar to worship God and say thank you.", 200);
      for (const s of stones) { D.sfx("tap"); await plop(s, 220); }
      await plop(q(altar, ".fire"), 300);
      D.loop(q(altar, ".fire"), [{ transform: "scale(1, 1)" }, { transform: "scale(0.9, 1.15)" }, { transform: "scale(1.08, 0.92)" }], { duration: 420, direction: "alternate", easing: "steps(2, end)" });
      await say;
      D.sfx("fanfare");
      const draw = Promise.all([...rainbow.querySelectorAll(".band")].map((b, i) =>
        D.wait(i * 220).then(() => Promise.all([...b.querySelectorAll("path")].map((p) => D.to(p, "strokeDashoffset", "1", "0", { duration: 1300, easing: "steps(10, end)" }))))));
      plop(q(rainbow, ".puffs"), 600);
      [...animals, family].forEach(googly);
      [...animals, family].forEach((a, i) => D.loop(a, [{ transform: "none" }, { transform: "translateY(-14%)" }], { duration: 300, delay: i * 90, direction: "alternate", easing: "steps(1, end)" }));
      await Promise.all([draw, D.narrate("Then God put a rainbow in the sky. “I have set my rainbow in the clouds.”", 600)]);
      if (!D.rushing) THP.ui.confetti(80);
      await D.narrate("It's God's promise: never again will a flood cover the whole earth.", 400);
      await cam(0.52, 0.62, 1.7, 1200);
      googly(noah);
      D.sfx("correct");
      await D.bubble(noah, 60, 22, "Noah", "God keeps his promises. Every single one!", { hold: 2600 });
    });

    for (const b of beats) {
      D.next();
      await b();
    }
    D.next();
  }

  THP.Scenes.define("s4", {
    title: "Two by Two", sub: "Noah's Ark", ref: "Genesis 6–9", icon: "🌈",
    lesson: "God keeps his promises, every single one.",
    verse: ["I have set my rainbow in the clouds.", "Genesis 9:13"],
    play,
  });
})();
