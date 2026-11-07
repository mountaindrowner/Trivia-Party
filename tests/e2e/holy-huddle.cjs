// A whole Holy Huddle game (Trivia Holy Party's phone party game): a TV and three scripted phones play through the
// intro, 8 questions, Trial Rooms, Lost Sheep, the Race to the Narrow Gate and the podium.
//   node tests/e2e/holy-huddle.cjs <base> <screenshot dir> [trials, e.g. jericho,order]
const { chromium } = require('playwright');
const fs = require('fs');
const ORDER_SETS = {
  "David's story": ["Shepherd boy", "Anointed by Samuel", "Beats Goliath", "Becomes king"],
  "Jesus' life": ["Born in Bethlehem", "Baptized in the Jordan", "Feeds the 5,000", "Rises again"],
  "Creation, days 1 to 4": ["Light", "Sky", "Land and plants", "Sun, moon and stars"],
  "Moses' story": ["Basket in the river", "The burning bush", "The plagues", "Crossing the Red Sea"],
  "First books of the Bible": ["Genesis", "Exodus", "Leviticus", "Numbers"],
  "The Gospels": ["Matthew", "Mark", "Luke", "John"],
  "Joseph's story": ["The colorful coat", "Sold by his brothers", "Explains Pharaoh's dreams", "Forgives his brothers"],
  "Jonah's story": ["Runs from God", "The great storm", "Inside the fish", "Preaches in Nineveh"],
};
(async () => {
  const BASE = process.argv[2] || 'http://127.0.0.1:8787';
  const OUT = process.argv[3] || 'tmp';
  fs.mkdirSync(OUT, { recursive: true });
  const PX = process.env.HTTPS_PROXY || process.env.https_proxy;
  const b = await chromium.launch(PX && !BASE.includes('127.0.0.1') ? { proxy: { server: PX } } : {});
  const errs = [], seen = new Set(), log = [];
  let ok = 0, bad = 0;
  const check = (c, what) => { c ? ok++ : bad++; console.log((c ? '  ok   ' : '  FAIL ') + what); };

  const tvCtx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 720 } });
  const tv = await tvCtx.newPage();
  tv.on('pageerror', (e) => errs.push('tv: ' + e.message));
  tv.on('console', (m) => { if (/Content Security Policy/.test(m.text())) errs.push('blocked by the page rules: ' + m.text()); });
  await tv.addInitScript(() => {
    localStorage.setItem('thp-intro-seen', 'true'); localStorage.setItem('thp-notice-thanksgiving-2026', 'true');
    localStorage.setItem('thp-huddle-prefs', JSON.stringify({ level: 1, voice: false }));
  });
  await tv.goto(BASE + '/tv' + (process.argv[4] ? '?trials=' + process.argv[4] : '')); await tv.waitForTimeout(1000);
  await tv.click('.huddle-btn');
  await tv.waitForSelector('.huddle-code span', { timeout: 8000 });
  const code = await tv.$$eval('.huddle-code span', (s) => s.map((x) => x.textContent).join(''));

  const who = [
    { name: 'Joy', answers: 'right', trial: 'good', race: 'right' },
    { name: 'Sam', answers: 'wrong', trial: 'bad', race: 'sloppy' },
    { name: 'Eli', answers: 'missQ2', trial: 'good', race: 'right' },
  ];
  const phones = [];
  for (let i = 0; i < who.length; i++) {
    const ctx = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`${who[i].name}: ` + e.message));
    p.on('console', (m) => { if (/Content Security Policy/.test(m.text())) errs.push('blocked by the page rules: ' + m.text()); });
    await p.goto(`${BASE}/?room=${code}`);
    await p.waitForSelector('#name');
    await p.fill('#name', who[i].name);
    await p.click('button[type=submit]');
    await p.waitForSelector('.avatars');
    await p.click(`.avatars button:nth-child(${i + 3})`);
    await p.click("text=I'm ready!");
    await p.waitForSelector("text=You're in!", { timeout: 5000 });
    phones.push(p);
  }
  await tv.waitForTimeout(400);
  await tv.screenshot({ path: `${OUT}/tv-00-lobby.png` });
  await phones[0].click("text=Everybody's in!");

  // TV knowledge the scripted players use (a real player would just know the answer, or not).
  const rightAnswer = (prompt) => tv.evaluate((q) => { const Q = THP.QUESTIONS.find((x) => x.q === q); return Q ? Q.a[0] : null; }, prompt);
  const raceRight = (prompt) => tv.evaluate((p) => { const F = THP.FINAL_PROMPTS.find((x) => x.p === p); return F ? F.opts.filter((o) => o[1]).map((o) => o[0]) : []; }, prompt);
  const fishCount = () => tv.evaluate(() => [...document.querySelectorAll('.huddle-field span')].filter((s) => s.textContent === '🐟').length);

  async function drive(i) {
    const p = phones[i], me = who[i];
    const st = await p.evaluate(() => {
      const t = (s) => (document.querySelector(s) || {}).textContent || '';
      return {
        tap: !!document.querySelector('.tapper:not([disabled])'),
        order: !!document.querySelector('.choices.order:not(.done)'),
        multi: !!document.querySelector('.choices.multi:not(.done)'),
        choices: !!document.querySelector('.choices:not(.order):not(.multi):not(.done)'),
        prompt: t('.prompt'), buttons: [...document.querySelectorAll('button:not([disabled])')].map((x) => x.textContent),
        final: /You won|You finished/.test(t('.result')), lost: !!document.querySelector('.tag.lost'), text: document.body.innerText.slice(0, 200),
      };
    });
    if (st.final) return 'final';
    for (const k of ['tap', 'order', 'multi', 'choices']) if (st[k] && !seen.has('ph-' + k + (/lamp/i.test(st.prompt) ? 'oil' : /fish/i.test(st.prompt) ? 'fish' : ''))) { seen.add('ph-' + k + (/lamp/i.test(st.prompt) ? 'oil' : /fish/i.test(st.prompt) ? 'fish' : '')); await p.screenshot({ path: `${OUT}/phone-${k}${/lamp/i.test(st.prompt) ? '-oil' : /fish/i.test(st.prompt) ? '-fish' : ''}-${me.name}.png` }); }
    if (st.lost && !seen.has('ph-lost')) { seen.add('ph-lost'); await p.screenshot({ path: `${OUT}/phone-lost-${me.name}.png` }); }
    if (st.tap) {
      const n = me.trial === 'good' ? 45 : 6;
      for (let k = 0; k < n; k++) await p.dispatchEvent('.tapper', 'pointerdown');
      await p.waitForSelector('.tapper[disabled]', { timeout: 12000 }).catch(() => {});
      return 'tapped';
    }
    if (st.order) {
      const items = await p.$$eval('.choices.order button', (bs) => bs.map((x) => x.textContent.replace(/^[•\d]/, '')));
      const right = ORDER_SETS[st.prompt] || items;
      const seq = me.trial === 'good' ? right : right.slice().reverse();
      for (const it of seq) await p.click(`.choices.order button:has-text("${it}")`);
      return 'ordered';
    }
    if (st.multi) {
      const opts = await p.$$eval('.choices.multi button', (bs) => bs.map((x) => x.textContent.replace(/^[○✔]/, '')));
      const right = await raceRight(st.prompt.replace(/!$/, ''));
      const mine = me.race === 'right' ? right : opts.filter((o) => !right.includes(o)).slice(0, 1).concat(right.slice(0, 1));
      for (const o of mine) await p.click(`.choices.multi button:has-text("${o}")`);
      await p.click('text=Lock it in!');
      return 'raced';
    }
    if (st.choices) {
      const opts = await p.$$eval('.choices button', (bs) => bs.map((x) => x.textContent.slice(1)));
      let choice;
      if (/lamp/i.test(st.prompt)) choice = Math.floor(Math.random() * 4);
      else if (/fish/i.test(st.prompt)) { const n = String(await fishCount()); choice = me.trial === 'good' ? opts.indexOf(n) : (opts.indexOf(n) + 1) % 4; }
      else {
        const right = await rightAnswer(st.prompt), ri = opts.indexOf(right);
        const qn = await tv.evaluate(() => (document.querySelector('.huddle-question .eyebrow') || {}).textContent || '');
        const isQ2 = /Question 2 of/.test(qn);
        const good = me.answers === 'right' || (me.answers === 'missQ2' && !isQ2);
        choice = good ? ri : (ri + 1) % 4;
        if (i === 2 && good) await p.waitForTimeout(600); // Eli is a little slower
      }
      if (choice < 0) choice = 0;
      await p.click(`.choices button:nth-child(${choice + 1})`).catch(() => {});
      return 'answered';
    }
    if (i === 0) {
      for (const label of ['Skip the intro', 'Next question ▶', 'On to the finale ▶']) if (st.buttons.includes(label)) { await p.click(`text=${label}`).catch(() => {}); return 'vip'; }
    }
    return st.lost ? 'lost' : 'idle';
  }

  // Run until every phone shows its final place, taking pictures of each new kind of screen.
  const t0 = Date.now();
  const lostSeen = new Set(), trials = new Set();
  let finals = [false, false, false];
  while (Date.now() - t0 < 360000 && !finals.every(Boolean)) {
    const cls = await tv.evaluate(() => { const s = document.querySelector('#stage > section'); return s ? s.className.replace(/\s*(enter|huddle-screen)\s*/g, ' ').trim() : ''; });
    const big = await tv.evaluate(() => (document.querySelector('.huddle-big') || {}).textContent || '');
    const key = cls + (cls.includes('huddle-trial') ? '|' + big : '');
    if (cls.includes('huddle-trial')) trials.add(big);
    if (!seen.has(key)) { seen.add(key); await tv.waitForTimeout(400); await tv.screenshot({ path: `${OUT}/tv-${String(seen.size).padStart(2, '0')}-${cls.replace(/\s+/g, '_')}.png` }); log.push(key); }
    const res = await Promise.all(phones.map((_, i) => drive(i).catch((e) => 'err:' + e.message.slice(0, 80))));
    res.forEach((r, i) => { if (r === 'final') finals[i] = true; if (r === 'lost') lostSeen.add(who[i].name); });
    for (const r of res) if (['tapped', 'ordered', 'raced'].includes(r)) seen.add('phone-' + r);
    await tv.waitForTimeout(250);
  }
  console.log('       TV screens seen:', log.join(' → '));
  console.log('       trials played:', [...trials].join(', '));
  check(finals.every(Boolean), 'all three phones reached their final place');
  check(lostSeen.has('Sam'), 'Sam (always wrong, bad at trials) became a Lost Sheep');
  const podium = await tv.$$eval('.huddle-step .name', (n) => n.map((x) => x.textContent)).catch(() => []);
  check(podium[1] === 'Joy' || podium[1] === 'Eli', 'a player who stayed in the flock won: ' + podium.join(' / '));
  check(seen.has('huddle-race') || log.some((k) => k.includes('huddle-race')), 'the race was played');
  await tv.waitForTimeout(2500);
  await tv.screenshot({ path: `${OUT}/tv-99-podium.png` });
  for (const [i, p] of phones.entries()) await p.screenshot({ path: `${OUT}/phone-final-${who[i].name}.png` });
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(`${ok} ok, ${bad} failed  (${Math.round((Date.now() - t0) / 1000)}s of play)`);
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
