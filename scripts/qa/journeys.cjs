// End-to-end user journeys A–F against the production build (npm run build; vite preview on :4173).
// Run: node scripts/qa/journeys.cjs   Exit code 1 if any assertion fails. Honest scope: headless Chromium + SwiftShader GL, not a phone.
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:4173/';
let failed = 0; const results = [];
const ok = (name, cond, extra = '') => { results.push([cond ? 'PASS' : 'FAIL', name, extra]); if (!cond) failed++; };
const rows = (page, sql) => page.evaluate((q) => window.__seder_db.driver.all(q), sql);
const newCtx = async (browser, extra = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'America/New_York', ...extra });
  const external = []; const errors = [];
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await page.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') { external.push(u.href); return r.abort(); } return r.continue(); });
  return { ctx, page, external, errors };
};
process.on('unhandledRejection', (e) => { console.error(e); process.exit(1); });
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  // ---------- Journey A: daily learning (2026-10-25 = day 1) + restart persistence
  {
    const { ctx, page, external, errors } = await newCtx(browser);
    await page.clock.setFixedTime(new Date('2026-10-25T14:00:00-04:00'));
    await page.goto(BASE + '?qa#/today'); await page.waitForSelector('.work-row');
    let taps = 0;
    const maamarRow = page.locator('.work-row', { hasText: 'ואלה המשפטים' });
    ok('A1 today lists the current maamar without any navigation', await maamarRow.count() === 1);
    await maamarRow.locator('.work-row-head').click(); taps++;          // tap 1: expand the assignment
    await page.waitForSelector('.log-mark-next');
    const label = (await page.locator('.log-mark-next').innerText());
    await page.locator('.log-mark-next').click(); taps++;               // tap 2: mark the next unit
    await page.waitForTimeout(300);
    ok('A2 next unit marked in ≤3 taps from Today', taps <= 3, `${taps} taps (${label})`);
    const ev1 = await rows(page, "SELECT unit_id, action FROM completion_events WHERE program_id='tm_maamarim'");
    ok('A3 completion stored as a single event', ev1.length === 1 && ev1[0].action === 'complete', JSON.stringify(ev1));
    await page.locator('.work-row-head').first().waitFor();
    const afterText = await maamarRow.innerText();
    ok('A4 Today row now shows progress and the following unit', /1 מתוך 6/.test(afterText) && /232/.test(afterText), afterText.replace(/\s+/g, ' ').slice(0, 120));
    await page.waitForTimeout(800);                                      // let the debounced flush persist
    await page.reload(); await page.waitForSelector('.work-row');
    const ev2 = await rows(page, "SELECT unit_id FROM completion_events WHERE program_id='tm_maamarim'");
    ok('A5 completion survives an app restart (reload)', ev2.length === 1);
    const txt2 = await page.locator('.work-row', { hasText: 'ואלה המשפטים' }).innerText();
    ok('A6 progress still shown after restart', /1 מתוך 6/.test(txt2));
    ok('A7 no external network requests, no console errors', external.length === 0 && errors.length === 0, `external=${external.length} errors=${errors.slice(0, 2)}`);
    await ctx.close();
  }

  // ---------- Journey D: mistake correction (toast undo, unchecking, consistency across views)
  {
    const { ctx, page } = await newCtx(browser);
    await page.clock.setFixedTime(new Date('2026-10-25T14:00:00-04:00'));
    await page.goto(BASE + '?qa#/today'); await page.waitForSelector('.work-row');
    await page.locator('.work-row', { hasText: 'ואלה המשפטים' }).locator('.work-row-head').click();
    await page.locator('.log-mark-next').click();
    await page.waitForSelector('.toast, [role=status]');
    await page.getByText('ביטול').first().click();                       // undo from the toast
    await page.waitForTimeout(300);
    ok('D1 toast undo restores the unit', (await rows(page, "SELECT COUNT(*) AS c FROM unit_state WHERE program_id='tm_maamarim' AND completed=1"))[0].c === 0);
    await page.locator('.log-mark-next').click(); await page.waitForTimeout(200);
    await page.locator('.check-row[aria-checked=true]').first().click();   // uncheck directly
    await page.waitForTimeout(300);
    const st = await rows(page, "SELECT COUNT(*) AS c FROM unit_state WHERE program_id='tm_maamarim' AND completed=1");
    ok('D2 unchecking a box clears it', st[0].c === 0);
    const ev = await rows(page, "SELECT action FROM completion_events WHERE program_id='tm_maamarim' ORDER BY id");
    ok('D3 history is append-only (nothing deleted)', ev.length === 4, ev.map((e) => e.action).join(','));
    await page.evaluate(() => { location.hash = '#/progress'; }); await page.waitForSelector('.pg-hero');
    const prog = await page.locator('.pg-hero').innerText();
    ok('D4 Progress agrees (0 of 16 maamarim done)', /0\/16/.test(prog));
    await ctx.close();
  }

  // ---------- Journey C: late completion keeps intended date and actual timestamp distinct
  {
    const { ctx, page } = await newCtx(browser);
    await page.clock.setFixedTime(new Date('2026-10-27T10:00:00-04:00'));
    await page.goto(BASE + '?qa#/day/2026-10-25'); await page.waitForSelector('.daily-row');
    const unit = page.locator('.daily-row', { hasText: 'חומש' }).locator('.check-row').first();
    ok('C1 past day shows its assignments', await unit.count() === 1);
    await unit.click(); await page.waitForTimeout(300);
    const r = await rows(page, "SELECT occurrence_key, intended_date, completed_at FROM unit_state WHERE program_id='chitas_chumash'");
    ok('C2 intended date = assignment day, completion time = now', r.length === 1 && r[0].intended_date === '2026-10-25' && String(r[0].completed_at).startsWith('2026-10-27'), JSON.stringify(r));
    await ctx.close();
  }

  // ---------- Journey B: bookshelf (real tap on a spine → sheet → mark → close → book returns), repeated; GPU memory flat
  {
    const { ctx, page, errors } = await newCtx(browser);
    // (no fixed clock here: GSAP's animation ticker follows Date.now)
    await page.goto(BASE + '?qa#/library');
    await page.waitForFunction(() => window.__seder_stats && window.__seder_stats().frame > 0, null, { timeout: 90000 });
    await page.waitForTimeout(3000);
    const mem0 = await page.evaluate(() => window.__seder_stats().textures);
    let opened = 0; let memAfterFirst = null;
    for (let i = 0; i < 4; i++) {
      await page.touchscreen.tap(360, 240);                              // top shelf, right-most spine (תורת מנחם כרך א)
      try { await page.waitForSelector('.sheet.ready', { timeout: 30000 }); opened++; } catch { break; }
      if (i === 0) { await page.waitForSelector('.log-mark-next, .check-row, .nav-item', { timeout: 10000 }).catch(() => {}); }
      await page.locator('.sheet-close').click({ timeout: 10000 });
      await page.waitForFunction(() => !document.querySelector('.sheet.ready'), null, { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      if (i === 0) memAfterFirst = await page.evaluate(() => window.__seder_stats().textures);
    }
    ok('B1 tapping a spine opens its learning sheet (4 times in a row)', opened === 4, `opened ${opened}/4`);
    const mem1 = await page.evaluate(() => window.__seder_stats().textures);
    ok('B2 GPU textures settle after the first open (covers warm once) and stay flat on repeated opens', mem1 - memAfterFirst <= 2, `start ${mem0}, after 1st ${memAfterFirst}, after 4th ${mem1}`);
    ok('B3 library visible again after closing (route back to #/library)', /#\/library/.test(await page.evaluate(() => location.hash)));
    ok('B4 no console errors on the shelf', errors.length === 0, errors.slice(0, 2).join('|'));
    await ctx.close();
  }

  // ---------- Journey E: no internet needed (every external request is blocked) — browse, record, restart
  {
    const { ctx, page, external } = await newCtx(browser);
    await page.clock.setFixedTime(new Date('2026-10-25T14:00:00-04:00'));
    await page.goto(BASE + '?qa#/today'); await page.waitForSelector('.work-row');
    for (const h of ['#/calendar', '#/progress', '#/settings', '#/search', '#/today']) { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(400); }
    const chk = page.locator('.daily-row .check-row').first(); await chk.click(); await page.waitForTimeout(900);
    await page.reload(); await page.waitForSelector('.daily-row');
    ok('E1 everything works with all external hosts blocked', external.length === 0, external.slice(0, 3).join(','));
    ok('E2 progress recorded offline survives restart', (await rows(page, 'SELECT COUNT(*) AS c FROM unit_state WHERE completed=1'))[0].c === 1);
    await ctx.close();
  }

  // ---------- Journey F: first-time user (fresh profile, no instructions)
  {
    const { ctx, page } = await newCtx(browser);
    await page.clock.setFixedTime(new Date('2026-10-25T14:00:00-04:00'));
    await page.goto(BASE + '?qa');
    await page.waitForSelector('.bottom-nav');
    const tabs = await page.locator('.nav-tab .nav-label').allInnerTexts();
    ok('F1 five plain-Hebrew tabs visible at once', tabs.join('|') === 'הספריה|היום|לוח השנה|התקדמות|הגדרות', tabs.join('|'));
    await page.waitForSelector('.library-top');
    ok('F2 first screen is the library with a one-tap "היום" shortcut', await page.getByRole('button', { name: /היום/ }).first().isVisible());
    await page.getByRole('button', { name: /^היום$/ }).first().click().catch(async () => { await page.locator('.nav-tab', { hasText: 'היום' }).click(); });
    await page.waitForSelector('.work-row');
    ok('F3 Today answers "what do I learn today": assignments listed immediately', await page.locator('.work-row, .daily-row').count() >= 3);
    await ctx.close();
  }

  await browser.close();
  for (const [s, n, e] of results) console.log(s, n, e ? '— ' + e : '');
  console.log(failed ? `\n${failed} FAILED` : '\nall journeys passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
