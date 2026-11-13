// Signal Divide: whole matches from the host's phone, with 1 real phone and bots over WebSockets, at 12, 13, 14 and
// 15 players. Needs the server's fast clock (DIVIDE_FAST=1: rounds of seconds, not minutes), so only against a local
// server. SMOKE=1 (for the live site, at real speed): deal, check the cards and screens in round 1, then stop the match.
//   node tests/e2e/signal-divide.cjs <base> <screenshot dir> [counts, e.g. 12,13,14,15]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
if (process.env.HTTPS_PROXY && !(process.argv[2] || '').includes('127.0.0.1')) {
  const { EnvHttpProxyAgent, setGlobalDispatcher } = require(ROOT + '/huddle/server/node_modules/undici');
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

(async () => {
  const BASE = process.argv[2] || 'http://127.0.0.1:8789';
  const OUT = process.argv[3] || 'divide-shots';
  const COUNTS = (process.argv[4] || '12,13,14,15').split(',').map(Number);
  fs.mkdirSync(OUT, { recursive: true });
  const PX = process.env.HTTPS_PROXY, live = !BASE.includes('127.0.0.1');
  const b = await chromium.launch(PX && live ? { proxy: { server: PX } } : {});
  const errs = [];
  let ok = 0, bad = 0;
  const check = (c, what) => { c ? ok++ : bad++; console.log((c ? '  ok   ' : '  FAIL ') + what); };
  const phoneCtx = () => b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Ezra', 'Finn', 'Gabe', 'Hope', 'Ivy', 'Jude', 'Kai', 'Liam', 'Mia', 'Noah', 'Owen'];
  const AV = ['tent', 'pine', 'bear', 'deer', 'fox', 'owl', 'canoe', 'lantern', 'snail', 'beaver', 'moon', 'star', 'map', 'coffee', 'guitar'];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const [k, N] of COUNTS.entries()) {
    const hostPlays = N % 2 === 1; // the host plays at 13 and 15, only hosts at 12 and 14
    console.log(`\n--- ${N} players (the host ${hostPlays ? 'plays too' : 'only hosts'})`);
    const host = await (await phoneCtx()).newPage();
    host.on('pageerror', (e) => errs.push('host: ' + e.message));
    host.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy/.test(m.text())) errs.push('host console: ' + m.text()); });
    host.on('dialog', (d) => d.accept());
    await host.goto(BASE + '/divide');
    await host.evaluate(() => localStorage.clear());
    await host.reload();
    if (hostPlays) { await host.check('.hd-check input'); await host.fill('.hd-field input', 'Rae'); }
    if (k === 0) await host.screenshot({ path: `${OUT}/host-00-title.png` });
    await host.click('text=Create game');
    await host.waitForSelector('.hd-code', { timeout: 10000 });
    const code = (await host.textContent('.hd-code')).trim();
    // The presets: name the zones (a quick pair, or typed), and a pace.
    if (k % 2) await host.click('.hd-chip:has-text("Upstairs / Downstairs")');
    else { await host.fill('.hd-zrow:has-text("A") input', 'Youth Room'); await host.fill('.hd-zrow:has-text("B") input', 'Kitchen'); await host.press('.hd-zrow:has-text("B") input', 'Tab'); }
    await host.click(`.hd-chip:has-text("${k % 3 === 1 ? 'Quick' : 'Standard'}")`);
    await sleep(500);
    const opts = (await host.evaluate(() => SIGNAL_DIVIDE._state().view)).opts;
    const zA = k % 2 ? 'Upstairs' : 'Youth Room';
    check(opts.zones.A === zA && opts.pace === (k % 3 === 1 ? 'quick' : 'standard'), `the host sets the zones' names ("${opts.zones.A}" / "${opts.zones.B}") and the pace (${opts.pace})`);
    check(/^[A-Z]{4}$/.test(code), `the host's phone shows a QR code and the code (${code})`);

    // One real phone, from the QR link.
    const phone = await (await phoneCtx()).newPage();
    phone.on('pageerror', (e) => errs.push('phone: ' + e.message));
    phone.on('console', (m) => { if (/Content Security Policy/.test(m.text())) errs.push('phone blocked: ' + m.text()); });
    phone.on('dialog', (d) => d.accept());
    await phone.goto(`${BASE}/?room=${code}`);
    await phone.waitForFunction(() => document.documentElement.dataset.mode === 'divide', null, { timeout: 8000 }).catch(() => {});
    check(await phone.evaluate(() => document.documentElement.dataset.mode === 'divide'), 'a phone from the QR link gets the Signal Divide look');
    await phone.fill('#name', 'Joy');
    await phone.click('button[type=submit]');
    await phone.waitForSelector('.avatars');
    await phone.click('.avatars button:nth-child(3)');
    await phone.click("text=I'm ready!");
    await phone.waitForSelector('.sd-lobby', { timeout: 8000 });
    await phone.click('.sd-lobby .sd-main');
    check(((await phone.textContent('.sd-zonesign').catch(() => '')) || '').includes(zA), 'the phones show the zones\' names in the lobby');

    // The bots.
    const st = { errors: [], leaks: 0, roleChanged: 0, results: 0 };
    const bots = [];
    const nBots = N - 1 - (hostPlays ? 1 : 0);
    for (let i = 0; i < nBots; i++) {
      const bot = { name: NAMES[i], views: [] };
      await new Promise((resolve) => { const open = () => {
        const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/ws/${code}?role=player`);
        bot.ws = ws; bot.reopen = open;
        ws.onclose = () => { if (ws === bot.ws && bot.id && !bot.done) setTimeout(open, 300); };
        const sendIn = (data) => { try { ws.send(JSON.stringify({ t: 'input', data })); } catch (e) {} };
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data);
          if (m.t === 'hello') return ws.send(JSON.stringify(bot.id ? { t: 'rejoin', id: bot.id, key: bot.key } : { t: 'join', name: NAMES[i], avatar: AV[i] }));
          if (m.t === 'joined') { if (!m.rejoined) { bot.id = m.id; bot.key = m.key; resolve(); } else bot.rejoined = (bot.rejoined || 0) + 1; return; }
          if (m.t === 'error') return st.errors.push(NAMES[i] + ':' + m.code);
          if (m.t !== 'msg' || m.data.screen !== 'divide') return;
          const v = m.data.view; bot.v = v;
          // Nobody's screen may hold another card before the result.
          const j = JSON.stringify(v);
          if (v.phase !== 'result' && ((j.match(/"role"/g) || []).length > 1 || j.includes('"everyone"'))) st.leaks++;
          if (v.me && v.me.role) { if (bot.role && bot.role !== v.me.role) st.roleChanged++; bot.role = v.me.role; }
          if (v.me && v.me.zone && v.phase !== 'result') { if (bot.zone && bot.zone !== v.me.zone) bot.moves = (bot.moves || 0) + 1; bot.zone = v.me.zone; }
          if (v.phase === 'lobby' && !v.me.ready) sendIn({ type: 'ready' });
          if ((v.phase === 'arrival' || v.phase === 'moving') && v.move && (v.move.first || v.move.moving) && !v.me.arrived) setTimeout(() => sendIn({ type: 'here' }), 100 + Math.random() * 300);
          if ((v.phase === 'round' || v.phase === 'lock') && v.me.leader && !v.zone.locked && !bot.lazy) {
            const pick = v.zone.people.filter((p) => p.id !== v.me.id).slice(0, v.need).map((p) => p.id);
            if (v.zone.picks.length !== v.need) sendIn({ type: 'select', ids: pick });
            else sendIn({ type: 'lock' });
          }
          if (v.phase === 'predict' && v.predict && v.predict.asked && !v.predict.pick) sendIn({ type: 'predict', pick: Math.random() < 0.5 ? 'signal' : 'static' });
          if (v.phase === 'result' && !bot.sawResult) { bot.sawResult = true; st.results++; bot.result = v.result; }
        };
      }; open(); });
      bots.push(bot);
    }
    await host.waitForFunction((n) => (SIGNAL_DIVIDE._state().view || {}).lobby && SIGNAL_DIVIDE._state().view.lobby.ready === n, N, { timeout: 15000 }).catch(() => {});
    const lob = (await host.evaluate(() => SIGNAL_DIVIDE._state().view)).lobby;
    check(lob.count === N && lob.ready === N, `${N} joined and ready (${lob.count} joined, ${lob.ready} ready)`);
    if (k === 0) { await host.screenshot({ path: `${OUT}/host-01-lobby.png`, fullPage: true }); await phone.screenshot({ path: `${OUT}/phone-01-lobby.png`, fullPage: true }); }
    const info = await (await fetch(`${BASE}/api/rooms/${code}`)).text();
    await host.click('text=Lock & deal');
    await host.waitForFunction(() => SIGNAL_DIVIDE._state().view.phase !== 'lobby', null, { timeout: 8000 }).catch(() => {});
    const locked = JSON.parse((await (await fetch(`${BASE}/api/rooms/${code}`)).text()));
    check(locked.locked === true && !/beacon|jammer|"role"/.test(info + JSON.stringify(locked)), 'once dealt the room is locked, and the public room info has no cards');

    // Play it out: the real phone (and the host's own screen) do what the screen asks.
    const hostViews = [];
    const actOn = async (page, scope) => {
      try {
        const r = scope ? `${scope} ` : '';
        const here = await page.$(`${r}.sd-move .sd-main`);
        if (here) return await here.click();
        const lead = await page.$(`${r}.sd-lead`);
        if (lead) {
          const need = await page.$$eval(`${r}.sd-pick`, (b) => b.length);
          const on = await page.$$eval(`${r}.sd-pick[aria-pressed=true]`, (b) => b.length);
          const want = Number(((await page.textContent(`${r}.sd-lead h3`)) || '').match(/Send (\d)/)?.[1] || 1);
          if (need && on < want) return await page.click(`${r}.sd-pick[aria-pressed=false] >> nth=0`);
          const lock = await page.$(`${r}.sd-lead .sd-main:not([disabled])`);
          if (lock) return await lock.click();
        }
        const pred = await page.$(`${r}.sd-predict .sd-sig`);
        if (pred) return await pred.click();
      } catch (e) {}
    };
    let shots = 0, peeked = false, reconnected = false, last = '', sawCurtain = false, sawTen = false, sawCine = false, sawName = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      const s = await host.evaluate(() => SIGNAL_DIVIDE._state());
      if (!s.view) { await sleep(200); continue; }
      hostViews.push(JSON.stringify(s.view));
      if (s.view.phase === 'result') break;
      sawCurtain = sawCurtain || !!(await phone.$('.sd-curtain'));
      sawTen = sawTen || !!(await phone.$('.sd-ten'));
      sawName = sawName || ((await phone.textContent('.sd-zone em, .sd-move-name').catch(() => '')) || '').length > 0;
      await actOn(phone);
      if (hostPlays) { if (s.tab !== 'me') await host.click('.hd-tabs button >> nth=0').catch(() => {}); await actOn(host); }
      const key = `${s.view.phase}:${s.view.round}`;
      if (key !== last && k === 0 && shots < 8) {
        last = key; shots++;
        await sleep(250);
        await phone.screenshot({ path: `${OUT}/phone-${String(shots + 1).padStart(2, '0')}-${key.replace(':', '-')}.png`, fullPage: true });
        await host.screenshot({ path: `${OUT}/host-${String(shots + 1).padStart(2, '0')}-${key.replace(':', '-')}.png`, fullPage: true });
      }
      // In round 1: peek at the card (it shows only while held), and show your team (it hides by itself).
      if (!peeked && s.view.phase === 'round' && (await phone.$('.sd-peek'))) {
        peeked = true;
        const box = await (await phone.$('.sd-peek')).boundingBox();
        await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await phone.mouse.down(); await sleep(250);
        const shown = !!(await phone.$('.sd-overlay .sd-role'));
        if (k === 0) await phone.screenshot({ path: `${OUT}/phone-peek.png` });
        await phone.mouse.up(); await sleep(150);
        const gone = !(await phone.$('.sd-overlay'));
        check(shown && gone, 'holding "My card" shows the card; letting go hides it');
        await phone.click('text=Show team');
        const team = (await phone.textContent('.sd-overlay').catch(() => '')) || '';
        if (k === 0) await phone.screenshot({ path: `${OUT}/phone-show-team.png` });
        await phone.click('.sd-hide');
        check(/SIGNAL|STATIC|NO TEAM/.test(team) && !(await phone.$('.sd-overlay')), '"Show team" shows only the team, and "Hide now" hides it');
      }
      if (process.env.SMOKE && peeked) {
        await host.click('.hd-tabs button >> nth=1').catch(() => {});
        await host.click('text=Stop match');
        await host.waitForFunction(() => SIGNAL_DIVIDE._state().view.phase === 'aborted', null, { timeout: 5000 }).catch(() => {});
        check((await host.evaluate(() => SIGNAL_DIVIDE._state().view.phase)) === 'aborted', 'the host can stop a match (no winner, no cards shown)');
        break;
      }
      // In round 2: a bot loses its connection and comes back: same card, same zone.
      if (!reconnected && s.view.phase === 'round' && s.view.round === 2) {
        reconnected = true;
        const bot = bots[2], before = { role: bot.role, zone: bot.zone, moves: bot.moves || 0, id: bot.id };
        // Its line drops, and it comes back on a new one (as a phone does when it wakes up or finds the Wi-Fi again).
        const old = bot.ws; bot.reopen(); try { old.close(); } catch (e) {}
        for (let i = 0; i < 30 && !bot.rejoined; i++) await sleep(100);
        // (On the test's fast clock the round may end meanwhile and legitimately move them: then the zone may differ.)
        const sameZone = bot.zone === before.zone || (bot.moves || 0) > before.moves;
        check(bot.rejoined >= 1 && bot.id === before.id && bot.role === before.role && sameZone, `a dropped phone rejoins as the same player, with the same card and zone (${before.role}, Zone ${before.zone})`);
      }
      await sleep(150);
    }
    if (process.env.SMOKE) {
      check(!st.leaks && !hostViews.some((j) => /"role"|"everyone"/.test(j)), 'no phone or host screen held another card');
      for (const bot of bots) { bot.done = true; try { bot.ws.close(); } catch (e) {} }
      await host.click('text=Back to the lobby').catch(() => {});
      await host.click('text=End the game').catch(() => {});
      await host.context().close(); await phone.context().close();
      continue;
    }
    const end = await host.evaluate(() => SIGNAL_DIVIDE._state().view);
    check(end && end.phase === 'result', `the match reaches the result (${end && end.phase})`);
    sawCine = !!(await phone.waitForSelector('.sd-cine', { timeout: 3000 }).catch(() => null));
    if (k === 0) { await sleep(3500); await phone.screenshot({ path: `${OUT}/phone-98-reveal-playing.png` }); }
    check(sawCurtain && sawCine, `the moments play on the phone: a sweep when things happen${sawTen ? ', the last ten seconds counted down' : ''}, and the reveal`);
    check(sawName, 'the phone shows the zone\'s name (on the zone badge or the move screen)');
    await phone.waitForSelector('.sd-win', { timeout: 12000 }).catch(() => {});
    for (let i = 0; i < 30 && st.results < bots.length; i++) await sleep(200);
    check(st.results === bots.length, `every phone sees the result (${st.results} of ${bots.length})`);
    check(!st.leaks, `no phone ever held another card before the result (${st.leaks} leaks)`);
    check(!hostViews.slice(0, -1).some((j) => /"role"|"everyone"/.test(j)), "the host's console never had a card in it before the result");
    check(!st.roleChanged, 'nobody\'s card changed when they moved');
    const r = end.result, roles = r.everyone.map((p) => p.role), c = (x) => roles.filter((y) => y === x).length;
    check(roles.length === N && c('beacon') === 1 && c('jammer') === 1 && c('forecaster') === N % 2 && c('signal') === c('static'), `the deck for ${N}: 1 Beacon, 1 Jammer, equal teams, ${N % 2 ? '1 Forecaster' : 'no Forecaster'}`);
    const inA = r.everyone.filter((p) => p.zone === 'A').length;
    check(inA === Math.ceil(N / 2), `the zones are still ${Math.ceil(N / 2)}/${Math.floor(N / 2)} at the end`);
    const moves = bots.reduce((n, x) => n + (x.moves || 0), 0);
    check(moves > 0, `people moved between zones (${moves} bot moves)`);
    check(r.winner === (r.zone.beacon === r.zone.jammer ? 'static' : 'signal'), `the right team wins: ${r.winner} (Beacon in ${r.zone.beacon}, Jammer in ${r.zone.jammer})`);
    if (k === 0) { await sleep(800); await phone.screenshot({ path: `${OUT}/phone-99-result.png`, fullPage: true }); await host.screenshot({ path: `${OUT}/host-99-result.png`, fullPage: true }); }
    await host.click('.hd-tabs button >> nth=1').catch(() => {});
    await host.click('text=Rematch').catch(() => {});
    await host.waitForFunction(() => SIGNAL_DIVIDE._state().view.phase === 'lobby', null, { timeout: 5000 }).catch(() => {});
    const again = await host.evaluate(() => SIGNAL_DIVIDE._state().view);
    check(again.phase === 'lobby' && again.lobby.count === N, 'rematch: back to the lobby with everyone still in');
    console.log(`       errors: ${st.errors.join(',') || 'none'}`);
    for (const bot of bots) { bot.done = true; try { bot.ws.close(); } catch (e) {} }
    try { await host.evaluate(() => localStorage.clear()); } catch (e) {}
    await host.context().close(); await phone.context().close();
  }
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
  console.log(`\n${ok} ok, ${bad} failed`);
  await b.close();
  process.exit(bad || errs.length ? 1 : 0);
})();
