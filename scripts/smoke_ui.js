// Browser smoke test of the whole app against a running frontend + backend (local or deployed).
//
//   node scripts/smoke_ui.js                                  # http://127.0.0.1:5173, demo accounts
//   VP_URL=https://your-app.vercel.app VP_PARENT_EMAIL=... VP_PARENT_PASSWORD=... \
//     VP_ADMIN_EMAIL=... VP_ADMIN_PASSWORD=... node scripts/smoke_ui.js
//
// It signs in as a parent and as an admin and opens every screen, failing on page errors, failed API
// calls (5xx) or a screen stuck loading. It creates nothing; VP_TEST_LOCK=1 adds a lock/unlock of the
// first parent account (leave it off on a live system).
// Needs Playwright (frontend/node_modules) and Google Chrome (CHROME_PATH) or Playwright's Chromium.
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '../frontend/node_modules/playwright'));

const BASE = (process.env.VP_URL || 'http://127.0.0.1:5173').replace(/\/$/, '') + '/';
const PARENT = { email: process.env.VP_PARENT_EMAIL || 'phuhuynh@vietphonics.vn', password: process.env.VP_PARENT_PASSWORD || '123456' };
const ADMIN = { email: process.env.VP_ADMIN_EMAIL || 'admin@vietphonics.vn', password: process.env.VP_ADMIN_PASSWORD || 'admin123' };
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PARENT_VIEWS = ['parent_progress', 'parent_pronunciation', 'subscription', 'parent_child_profile', 'parent_privacy', 'parent_dashboard'];
const KID_VIEWS = ['lesson_catalog', 'rewards', 'kid_progress', 'kid_dashboard'];
const ADMIN_VIEWS = ['admin_dashboard', 'admin_lessons', 'admin_content', 'admin_rewards', 'admin_users', 'admin_pricing', 'admin_promotions', 'admin_orders', 'admin_revenue', 'admin_analytics', 'admin_settings'];

(async () => {
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync(CHROME) ? { executablePath: CHROME } : {}) });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.setDefaultTimeout(10000);
  const problems = new Set();
  const note = (m) => { if (!problems.has(m)) { problems.add(m); console.log('FAIL', m); } };
  page.on('pageerror', (e) => note(`page error: ${e.message}`));
  page.on('console', (m) => {
    // Rejected sign-ins are logged by the browser as failed resources; they are expected in the wrong-password step.
    if (m.type() === 'error' && !/status of 40[01]/.test(m.text())) note(`console: ${m.text().slice(0, 160)}`);
  });
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 500) note(`API ${r.status()} ${r.url()}`); });
  const step = async (name, fn) => { try { await fn(); console.log('ok  ', name); } catch (e) { note(`${name}: ${e.message.split('\n')[0]}`); } };
  const login = async ({ email, password }) => {
    await page.getByRole('button', { name: /Đăng nhập/i }).first().click();
    await page.click('[data-testid="tab-email"]');
    await page.fill('[data-testid="login-email"]', email);
    await page.fill('[data-testid="login-password"]', password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('[data-testid="sidebar"]');
  };
  const open = async (view) => { await page.click(`[data-testid="nav-${view}"]`); await page.waitForTimeout(500); };

  await page.goto(BASE);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(BASE);

  await step('kid area is gated for visitors', async () => {
    await page.getByRole('button', { name: /Bắt đầu học|Học thử|Bắt đầu/i }).first().click();
    await page.waitForSelector('[data-testid="login-view"]');
  });
  await step('wrong password is refused', async () => {
    await page.click('[data-testid="tab-email"]');
    await page.fill('[data-testid="login-email"]', PARENT.email);
    await page.fill('[data-testid="login-password"]', 'sai-mat-khau-123');
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('[data-testid="login-error"]');
  });
  await step('parent signs in', async () => {
    await page.fill('[data-testid="login-password"]', PARENT.password);
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('[data-testid="sidebar"]');
  });
  await step('back to the parent area', async () => { await page.click('[data-testid="role-parent"]'); await page.waitForSelector('[data-testid="nav-parent_progress"]'); });
  for (const v of PARENT_VIEWS) await step(`parent: ${v}`, () => open(v));
  await step('prices come from the server', async () => {
    await open('subscription');
    await page.waitForSelector('[data-testid="plan-family"]');
    const text = await page.locator('[data-testid="plan-family"]').innerText();
    if (!/1\.083\.000/.test(text)) throw new Error(`family yearly price missing: ${text.slice(0, 80)}`);
  });
  await step('kid area opens', async () => {
    await page.click('[data-testid="role-kid"]');
    await page.waitForSelector('[data-testid="continue-lesson"], [data-testid="start-learning"]');
    if (await page.locator('[data-testid="start-learning"]').count()) await page.click('[data-testid="start-learning"]');
    await page.waitForSelector('[data-testid="continue-lesson"]');
  });
  for (const v of KID_VIEWS) await step(`kid: ${v}`, () => open(v));
  await step('wallet equals the header points', async () => {
    await open('rewards');
    const wallet = (await page.locator('[data-testid="wallet"]').innerText()).match(/\d+/)[0];
    const header = (await page.locator('[data-testid="pill-points"]').innerText()).match(/\d+/)[0];
    if (wallet !== header) throw new Error(`wallet ${wallet} != header ${header}`);
  });
  await step('practice screen opens', async () => {
    await open('kid_dashboard');
    await page.click('[data-testid="continue-lesson"]');
    await page.waitForSelector('#btn-start-practice');
  });
  if (process.env.VP_SKIP_ADMIN !== '1') await step('admin signs in', async () => {
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE);
    await login(ADMIN);
  });
  for (const v of process.env.VP_SKIP_ADMIN === '1' ? [] : ADMIN_VIEWS) {
    await step(`admin: ${v}`, async () => {
      await open(v);
      if (await page.locator('[data-testid="admin-loading"]').count()) throw new Error('stuck loading');
    });
  }
  // Opt-in: it briefly locks the first parent account, which must not happen on a live system.
  if (process.env.VP_TEST_LOCK === '1' && process.env.VP_SKIP_ADMIN !== '1') await step('admin can lock and unlock an account', async () => {
    await open('admin_users');
    await page.waitForSelector('[data-testid="toggle-lock"]');
    await page.click('[data-testid="toggle-lock"]');
    await page.waitForFunction(() => /Mở khoá/.test(document.querySelector('[data-testid="toggle-lock"]')?.textContent || ''));
    await page.click('[data-testid="toggle-lock"]');
    await page.waitForFunction(() => /Khoá tài khoản/.test(document.querySelector('[data-testid="toggle-lock"]')?.textContent || ''));
  });

  await browser.close();
  console.log(problems.size ? `\n${problems.size} problem(s)` : '\nall screens ok');
  process.exit(problems.size ? 1 : 0);
})();
