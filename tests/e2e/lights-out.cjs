// Lights Out: two whole rounds from the host's phone (who plays too), 1 real phone and bots over WebSockets, plus a
// reload of the host's page in the middle of the morning.
//   node tests/e2e/lights-out.cjs <base> <screenshot dir> [players]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
if (process.env.HTTPS_PROXY && !(process.argv[2] || '').includes('127.0.0.1')) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = require(ROOT + '/huddle/server/node_modules/undici');
  setGlobalDispatcher(new EnvHttpProxyAgent());
}
require(ROOT + '/bonfire/night/rules.js');
const R = globalThis.LIGHTS_OUT_RULES;

(async () => {
  const BASE = process.argv[2] || 'http://127.0.0.1:8789';
  const OUT = process.argv[3] || 'lights-out-shots';
  const N = Math.min(12, Math.max(3, Number(process.argv[4] || 8)));
  fs.mkdirSync(OUT, { recursive: true });
  const live = !BASE.includes('127.0.0.1');
  const PX = process.env.HTTPS_PROXY;
  const b = await chromium.launch(PX && live ? { proxy: { server: PX } } : {});
  const errs = [];
  let ok = 0, bad = 0;
  const check = (c, what) => { c ? ok++ : bad++; console.log((c ? '  ok   ' : '  FAIL ') + what); };
  const phoneCtx = () => b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  // The host's phone (voice and music off: headless Chromium can't speak, and the show would wait for it).
  const host = await (await phoneCtx()).newPage();
  host.on('pageerror', (e) => errs.push('host: ' + e.message));
  host.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/.test(m.text())) errs.push('host console: ' + m.text()); });
  await host.addInitScript(() => localStorage.setItem('lightsout-prefs', JSON.stringify({ voice: false, sound: false, talk: 180, play: true, name: 'Rae' })));
  await host.goto(BASE + '/night');
  await host.screenshot({ path: `${OUT}/host-00-title.png` });
  await host.click('text=Start a game');
  await host.waitForSelector('.lobby .code', { timeout: 10000 });
  const code = (await host.textContent('.lobby .code')).trim();
  check(/^[A-Z]{4}$/.test(code), `the host's phone shows a QR code and the room code (${code})`);

  // One real phone, from the QR link: the night look from the start.
  const phone = await (await phoneCtx()).newPage();
  phone.on('pageerror', (e) => errs.push('phone: ' + e.message));
  phone.on('console', (m) => { if (/Content Security Policy/.test(m.text())) errs.push('phone blocked: ' + m.text()); });
  await phone.goto(`${BASE}/?room=${code}`);
  await phone.waitForFunction(() => document.documentElement.dataset.mode === 'night', null, { timeout: 8000 }).catch(() => {});
  check(await phone.evaluate(() => document.documentElement.dataset.mode === 'night'), 'a phone from the QR link gets the night look');
  await phone.fill('#name', 'Joy');
  await phone.click('button[type=submit]');
  await phone.waitForSelector('.avatars');
  await phone.click('.avatars button:nth-child(4)');
  await phone.click("text=I'm ready!");
  await phone.waitForSelector('text=Wait for the host', { timeout: 8000 });
  await phone.screenshot({ path: `${OUT}/phone-01-joined.png` });

  // The bots: they peek, do their part at night (a random but real choice), and vote.
  const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Ezra', 'Finn', 'Gabe', 'Hope', 'Ivy', 'Jude'].slice(0, N - 2);
  const AV = ['tent', 'pine', 'bear', 'deer', 'fox', 'owl', 'canoe', 'lantern', 'snail', 'beaver'];
  const wsBase = BASE.replace(/^http/, 'ws');
  const st = { stages: {}, reveals: 0, errors: [], wins: 0 };
  const bots = [];
  const any = (a) => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < NAMES.length; i++) {
    const bot = { name: NAMES[i] };
    await new Promise((resolve) => { const open = () => {
      const ws = new WebSocket(`${wsBase}/ws/${code}?role=player`);
      bot.ws = ws;
      const hb = setInterval(() => { try { ws.send('{"t":"hb"}'); } catch (e) {} }, 20000);
      ws.onclose = () => { clearInterval(hb); if (bot.id && !bot.done) setTimeout(open, 800); };
      const sendIn = (data) => { try { ws.send(JSON.stringify({ t: 'input', data })); } catch (e) {} };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.t === 'hello') return ws.send(JSON.stringify(bot.id ? { t: 'rejoin', id: bot.id, key: bot.key } : { t: 'join', name: NAMES[i], avatar: AV[i] }));
        if (m.t === 'joined') { if (!m.rejoined) { bot.id = m.id; bot.key = m.key; resolve(); } return; }
        if (m.t === 'error') return st.errors.push(NAMES[i] + ':' + m.code);
        if (m.t !== 'msg' || m.data.screen !== 'secret') return;
        const s = m.data; bot.last = s;
        st.stages[s.stage] = (st.stages[s.stage] || 0) + 1;
        const later = (ms, fn) => setTimeout(() => { if (bot.last === s) fn(); }, ms);
        if (s.stage === 'deal' && !s.ready) later(300 + Math.random() * 1500, () => sendIn({ type: 'ready', round: s.round }));
        if (s.stage === 'night' && s.action && !s.action.done) later(500 + Math.random() * 3000, () => {
          const a = s.action, ids = a.players.map((p) => p.id).sort(() => Math.random() - 0.5);
          const pick = a.kind === 'two' ? { players: ids.slice(0, 2) } : a.kind === 'center' ? { center: [Math.floor(Math.random() * 3)] }
            : a.kind === 'counselor' ? (Math.random() < 0.5 ? { players: ids.slice(0, 1) } : { center: [0, 2] }) : { players: ids.slice(0, 1) };
          sendIn({ type: 'night', round: s.round, players: [], center: [], ...pick });
        });
        if (s.stage === 'night' && s.action) bot.night = s;
        if (s.stage === 'day') bot.day = s;
        if (s.stage === 'vote' && s.action && !s.action.done) later(300 + Math.random() * 2000, () => sendIn({ type: 'vote', round: s.round, target: any(s.action.players).id }));
        if (s.stage === 'reveal') { st.reveals++; bot.reveal = s.reveal; }
      };
    }; open(); });
    bots.push(bot);
  }
  await host.waitForFunction((n) => document.querySelectorAll('.people li').length === n, N, { timeout: 10000 }).catch(() => {});
  check((await host.$$('.people li')).length === N, `${N} around the campfire (the host, a real phone and ${N - 2} bots)`);
  const chips = await host.$$eval('.lo-deck .lo-chip', (c) => c.map((x) => x.textContent));
  const deckCount = chips.reduce((n, c) => n + (Number((/×(\d+)/.exec(c) || [0, 1])[1])), 0);
  check(deckCount === N + 3, `the lobby shows the ${N + 3} cards in play (${chips.join(', ')})`);
  await host.screenshot({ path: `${OUT}/host-01-lobby.png`, fullPage: true });

  // Phones (the real one and the host's own card): do whatever the screen asks.
  async function act(page, scope) {
    const root = scope ? `${scope} ` : '';
    if (await page.$(`${root}.lo-ready:not([disabled])`)) return page.click(`${root}.lo-ready`);
    if (!(await page.$(`${root}.lo-act`)) || (await page.$(`${root}.lo-done`))) return;
    const people = await page.$$(`${root}.lo-people .lo-pick`), mid = await page.$$(`${root}.lo-middle .lo-pick`);
    if (people.length) { await people[0].click(); await page.waitForTimeout(150); if (!(await page.$(`${root}.lo-done`))) { await people[1].click(); await page.waitForTimeout(500); } }
    else if (mid.length) await mid[1].click();
  }
  const roundOf = async () => host.evaluate(() => LIGHTS_OUT._state());

  async function playRound(n, reload) {
    await host.click(n === 1 ? 'text=Deal the cards' : 'text=Play again');
    await phone.waitForSelector('.lo-card', { timeout: 8000 });
    // Peek: hold the card, and it turns over; let go, and it's face down again.
    const card = await phone.$('.lo-card');
    const box = await card.boundingBox();
    await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await phone.mouse.down();
    await phone.waitForTimeout(500);
    const peeked = await phone.$eval('.lo-card', (c) => c.classList.contains('peek'));
    if (n === 1) await phone.screenshot({ path: `${OUT}/phone-02-peek.png` });
    await phone.mouse.up();
    const hidden = await phone.$eval('.lo-card', (c) => !c.classList.contains('peek'));
    check(peeked && hidden, `round ${n}: holding the card shows it, letting go hides it`);
    if (n === 1) { await phone.screenshot({ path: `${OUT}/phone-03-deal.png`, fullPage: true }); await host.screenshot({ path: `${OUT}/host-02-deal.png`, fullPage: true }); }
    await act(phone); await act(host, '.mine');
    await host.waitForFunction(() => LIGHTS_OUT._state().phase === 'night', null, { timeout: 90000 }).catch(() => {});
    check((await roundOf()).phase === 'night', `round ${n}: once everyone taps Got it (and the rules have been read, the first time), it's night`);
    await phone.waitForSelector('.lo-night', { timeout: 8000 });
    await act(phone); await act(host, '.mine');
    if (n === 1) { await phone.waitForTimeout(600); await phone.screenshot({ path: `${OUT}/phone-04-night.png`, fullPage: true }); await host.screenshot({ path: `${OUT}/host-03-night.png`, fullPage: true }); }
    const nightAt = Date.now();
    await host.waitForFunction(() => LIGHTS_OUT._state().phase === 'day', null, { timeout: 90000 }).catch(() => {});
    const waited = (Date.now() - nightAt) / 1000;
    const s = await roundOf();
    check(s.phase === 'day' && waited > 12, `round ${n}: morning comes once everyone's done, never too fast to give anyone away (${waited.toFixed(0)}s)`);
    check(Object.keys(s.G.actions).length === N, `round ${n}: everyone tapped something in the night (${Object.keys(s.G.actions).length})`);
    // The night was carried out by the rules: the same cards, moved around as the taps said.
    const again = R.resolve({ start: s.G.start, center: s.G.center }, s.G.actions, s.G.names, () => 0);
    const sameish = Object.keys(again.final).every((id) => s.G.start[id] === 'sleepwalker' || again.final[id] === s.G.night.final[id]) || Object.values(s.G.start).includes('sleepwalker');
    check(sameish, `round ${n}: the night's swaps match the rules`);
    await phone.waitForSelector('.lo-day', { timeout: 8000 });
    await phone.waitForTimeout(400);
    check(bots.every((x) => x.day && x.day.round === s.G.round && x.day.lines.length), `round ${n}: every phone learned something (on the back of its card)`);
    if (n === 1) {
      const mb = await (await phone.$('.lo-card')).boundingBox();
      await phone.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); await phone.mouse.down(); await phone.waitForTimeout(450);
      await phone.screenshot({ path: `${OUT}/phone-05-day-peek.png` }); await phone.mouse.up();
      await host.screenshot({ path: `${OUT}/host-04-day.png`, fullPage: true });
    }
    if (reload) {
      // The host's page reloads mid-morning: the round carries on.
      await host.reload();
      await host.waitForSelector('.phase.day', { timeout: 10000 }).catch(() => {});
      const r = await roundOf();
      check(r.phase === 'day' && r.G.round === s.G.round, `round ${n}: reloading the host's phone keeps the round going (${r.phase})`);
      await host.waitForTimeout(1500);
    }
    await host.click('text=+1 minute');
    const more = await roundOf();
    check(more.G.deadline - Date.now() > 200000, `round ${n}: "+1 minute" adds a minute`);
    await host.click('text=Vote now');
    await phone.waitForSelector('.lo-vote', { timeout: 8000 });
    await act(phone); await act(host, '.mine');
    if (n === 1) await phone.screenshot({ path: `${OUT}/phone-06-vote.png`, fullPage: true });
    await host.waitForFunction(() => LIGHTS_OUT._state().phase === 'reveal', null, { timeout: 60000 }).catch(() => {});
    await host.waitForSelector('.lo-reveal', { timeout: 20000 }).catch(() => {});
    await phone.waitForSelector('.lo-reveal', { timeout: 20000 }).catch(() => {});
    const e = await roundOf();
    check(e.phase === 'reveal' && Object.keys(e.G.votes).length === N, `round ${n}: everyone voted, and the votes are counted (${Object.keys(e.G.votes).length})`);
    const v = R.tally(e.G.votes, e.G.ids), o = R.outcome(e.G.night.final, v.out, e.G.names);
    check(JSON.stringify(v.out) === JSON.stringify(e.G.result.out) && o.headline === e.G.result.headline, `round ${n}: the right people are out, and the right side wins: "${o.headline}"`);
    for (let k = 0; k < 60 && !bots.every((x) => x.reveal && x.reveal === x.last.reveal && x.last.round === e.G.round); k++) await phone.waitForTimeout(500);
    check(bots.every((x) => x.reveal && x.reveal.people.length === N), `round ${n}: every phone sees the reveal, with everyone's real card`);
    const youLine = (await phone.textContent('.lo-you').catch(() => '')) || '';
    check(/You (win|lose)/.test(youLine), `round ${n}: the phone says whether you won ("${youLine.slice(0, 60)}...")`);
    await host.screenshot({ path: `${OUT}/host-0${4 + n}-reveal.png`, fullPage: true });
    await phone.screenshot({ path: `${OUT}/phone-0${6 + n}-reveal.png`, fullPage: true });
  }
  await playRound(1, false);
  await playRound(2, true);

  // Back to the lobby: the wins so far are by everyone's name, and someone can be removed.
  await host.click('text=Back to the lobby');
  await host.waitForSelector('.lobby', { timeout: 5000 });
  const wins = await host.$$eval('.people .wins', (w) => w.length);
  check(wins > 0, `the lobby keeps tonight's wins (${wins} with a 🏆)`);
  host.once('dialog', (d) => d.accept());
  await host.click('.people li:last-child .x');
  await host.waitForFunction((n) => document.querySelectorAll('.people li').length === n - 1, N, { timeout: 5000 }).catch(() => {});
  check((await host.$$('.people li')).length === N - 1, 'the host can remove someone from the lobby');
  await host.screenshot({ path: `${OUT}/host-07-lobby-again.png`, fullPage: true });

  console.log(`       stages seen by bots: ${JSON.stringify(st.stages)} · errors: ${st.errors.join(',')}`);
  check(!st.errors.length, 'no bot got an error');
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(`\n${ok} ok, ${bad} failed`);
  for (const bot of bots) { bot.done = true; try { bot.ws.close(); } catch (e) {} }
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
