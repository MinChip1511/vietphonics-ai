# VietPhonics Figma Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Before any `get_design_context` call, load the `figma:figma-design-to-code` skill.

**Goal:** Rebuild the VietPhonics frontend to match the Figma file, starting with the shared design tokens and the sidebar app shell. After that, re-skin the screens that already exist, then add the new ones.

**Architecture:** The Figma app screens all share one layout: a 280px left `Sidebar` (logo, role-specific nav, role switcher Bé học / Phụ huynh / Admin, a support card) and an 84–88px `TopBar` (page title, streak and points pills, search, bell, avatar). We build that shell once as `components/shell/`, add the Figma colors as Tailwind v4 `@theme` tokens, then move the existing views into the shell one by one. There is still no router: `App.jsx` keeps `currentView` as its only navigation state. The landing page keeps its own top header, as in the Figma.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), lucide-react, Playwright (browser checks), Figma MCP (`get_design_context`, `get_screenshot`, `get_variable_defs`).

**Spec:** Figma file `WgQeJ47WTfgnzpsXBMsLtF` (https://www.figma.com/design/WgQeJ47WTfgnzpsXBMsLtF/VietPhonics-AI). The screen inventory is below. There is no written spec, so the Figma frames are the spec.

## Global Constraints

- Figma file key: `WgQeJ47WTfgnzpsXBMsLtF`. Every node ID below refers to it.
- Color tokens from Figma variables: `Xanh biển` #1978DC (primary blue), `Xanh nền` #DDF5FF (light blue surface), `Xanh chữ` #0D3577 (heading/ink), `Neutral NEW/600` #C4C7C7 (borders), `DROP` shadow `0 1.5px 2px #0000000D`.
- Headings use `Baloo 2` (already loaded in `frontend/index.html`). Body text uses `Be Vietnam Pro` / `Nunito`. Confirm the exact font per screen from `get_design_context` output before assuming.
- UI copy stays in Vietnamese and is taken verbatim from the Figma frames.
- Design width is 1440px. Every screen must also work at 390px (mobile): the sidebar collapses into a drawer opened from the TopBar.
- No new npm dependencies without asking the user. Use lucide-react for icons.
- Keep the existing API behavior. `services/apiService.js` still falls back to local data when the backend is down.
- The repo is **not** a git repository. Run `git init` and make a baseline commit before Task 1, or skip the commit steps if the user declines.
- Validation for every task: `cd frontend && npm run build && npm run lint`, then the task's Playwright check (both servers running via `./start_vietphonics.sh`).

## Review Focus

1. **Mobile width (390px):** the sidebar must not squash the content. Expect a hamburger in the TopBar that opens the sidebar as an overlay (checked in the Task 3 script).
2. **Role switch while inside a kid-only view:** switching to "Phụ huynh" while on `practice` must land on `parent_dashboard`, not leave a kid screen under parent nav (checked in the Task 3 script).
3. **Landing page:** it must render with no sidebar, and "Bắt đầu học ngay" still goes to `profile_select` (checked in the Task 3 script).
4. **Admin role before Phase 5 exists:** the Admin pill must be visibly disabled and must not navigate to a blank view (checked in the Task 3 script).
5. **Long child names / big numbers in TopBar pills** (e.g. 12345 điểm): the pills must not wrap or overflow (checked by the fixture in Task 3).

---

## Figma screen inventory → code mapping

| Group | Figma frame (node ID) | Existing code | Phase |
|---|---|---|---|
| Landing | VietPhonics AI `1:2` (Hero `1:3`, About Us `1:88`, Services `1:118`, Progress `1:147`, Gallery `1:182`, Demo `1:208`, Testimonial `1:224`, Footer `1:244`) | `views/LandingView.jsx` | 2 |
| Child | 01 child-welcome `27:2419` | `views/ProfileSelectView.jsx` | 2 |
| Child | 02 child-home `27:2454` | `views/KidDashboardView.jsx` | 2 |
| Child | 03 lesson-selection `27:2456` | `views/LessonCatalogView.jsx` | 2 |
| Child | 04 lesson-introduction `27:2457`, 05 listen-example `27:2458`, 06 recording-ready `27:2459`, 07 recording-active `27:2463`, 08 ai-processing `27:2464` | `views/PracticeStudioView.jsx` (states) | 2 |
| Child | 09 result-good `27:2465`, 10 result-nearly-correct `27:2467`, 11 result-needs-practice `27:2468` | `views/AIResultModal.jsx` | 2 |
| Child | 12 microphone-permission `27:2469`, 13 recording-errors `27:2470` | none (errors are console-only today) | 2 |
| Child | 14 points-streak-badges `27:2471` | `views/KidProgressView.jsx` | 2 |
| Child | 15 rewards-leaderboard `27:2461` | `views/RewardsView.jsx` | 2 |
| Parent | 02 Dashboard `7:954` | `views/ParentDashboardView.jsx` | 3 |
| Parent | 03 Progress `7:1070`, 04 Pronunciation `7:1179` | none | 3 |
| Parent | 05 ChildProfile `7:1285`, 06 PrivacyConsent `7:1378` | none | 3 |
| Parent | 07 Subscription `7:1459` | `views/SubscriptionView.jsx` | 3 |
| Auth | Sign in `69:1529`, Login/OTP `69:1742`, Login/Email `127:5768`, Signup step 2 `70:2245`, Signup step 3 `70:2623`, Forgot password `70:2902` | `views/AuthModal.jsx` (mock) | 4 |
| Admin | 11 screens `20:2`, `20:218`, `20:411`, `20:606`, `20:823`, `20:982`, `20:1148`, `20:1296`, `20:1453`, `20:1731`, `20:1857` | none | 5 |
| Shared | Components section `27:2438` (Sidebar `131:6465`, TopBar `99:3851`, Button `104:3907`, Button/Primary `20:1960`, Button/Menu `23:2249`, Filter/Option Picker `57:1395`) | `components/Navbar.jsx` | 1 |
| Assets | Mascots: Con cún `129:6313`, Con thỏ `129:6200`, Con gà `129:6204`, Gấu trúc `129:6198`, Khủng long `129:6202`; logo `2:2` | emoji avatars | 1 |

**Scope decision for the user:** Phases 4 (real auth/OTP) and 5 (admin, orders, QR payments, revenue) need backend endpoints, tables and auth that do not exist in `backend/app/`. This plan covers them only as frontend screens with mock data. Each needs its own backend spec before real implementation.

---

## Phase 1: Design foundation and app shell (detailed)

### Task 1: Design tokens and brand assets

**Files:**
- Modify: `frontend/src/index.css` (add `@theme` block after `@import "tailwindcss";`)
- Create: `frontend/src/assets/brand/logo.svg`, `frontend/src/assets/mascots/{cun,tho,ga,gau-truc,khung-long}.png`

**Interfaces:**
- Produces: Tailwind classes `bg-vp-blue`, `text-vp-ink`, `bg-vp-sky`, `border-vp-line`, `bg-vp-canvas`, `shadow-vp-drop`, and the asset paths above.

- [ ] **Step 1: Confirm the token values from Figma**

Call `get_variable_defs` on `7:954` and `20:2`. They should match the Global Constraints. Call `get_design_context` on `27:2454` and read the page background color from the returned code. It looks like `#EFF1F8` in the screenshot; use the exact value from Figma.

- [ ] **Step 2: Add tokens to `index.css`**

```css
@import "tailwindcss";

@theme {
  --color-vp-blue: #1978DC;
  --color-vp-sky: #DDF5FF;
  --color-vp-ink: #0D3577;
  --color-vp-line: #C4C7C7;
  --color-vp-canvas: #EFF1F8; /* replace with the value confirmed in Step 1 */
  --shadow-vp-drop: 0 1.5px 2px 0 rgb(0 0 0 / 0.05);
  --font-heading: "Baloo 2", "Nunito", system-ui, sans-serif;
}
```

- [ ] **Step 3: Export the assets**

Call `get_design_context` on `2:2` (logo) and on each mascot node. Download the asset URLs it returns with `curl -L -o <path> "<url>"` into the paths listed above.

- [ ] **Step 4: Verify**

Run: `cd frontend && npm run build && npm run lint`
Expected: build succeeds, and oxlint reports 0 errors. `grep -c "vp-blue" dist/assets/*.css` stays 0 until a class uses the token (Tailwind v4 emits theme vars on use). That's fine; Task 2 uses them.

- [ ] **Step 5: Commit** `Add Figma design tokens and brand assets`

### Task 2: Sidebar and TopBar components

**Files:**
- Create: `frontend/src/components/shell/navConfig.js`
- Create: `frontend/src/components/shell/Sidebar.jsx`
- Create: `frontend/src/components/shell/TopBar.jsx`

**Interfaces:**
- Consumes: tokens from Task 1, `assets/brand/logo.svg`.
- Produces:
  - `NAV_ITEMS: { kid: NavItem[], parent: NavItem[] }`, where `NavItem = { view: string, label: string, icon: LucideIcon }`
  - `VIEW_ROLE: Record<string, "kid" | "parent">`, `VIEW_TITLE: Record<string, string>`
  - `<Sidebar role currentView onNavigate onSwitchRole open onClose />`
  - `<TopBar title child showStats onOpenMenu />`

- [ ] **Step 1: Get the reference code**

Call `get_design_context` on Sidebar `131:6465` and TopBar `99:3851`. Use their spacing, radii and type sizes to replace any value in the code below that differs.

- [ ] **Step 2: Write `navConfig.js`**

```js
import { LayoutGrid, BookOpen, Trophy, CircleUser, LineChart, Mic, CreditCard, ShieldCheck } from "lucide-react";

export const NAV_ITEMS = {
  kid: [
    { view: "kid_dashboard", label: "Trang chủ", icon: LayoutGrid },
    { view: "lesson_catalog", label: "Bài học", icon: BookOpen },
    { view: "rewards", label: "Cúp của bé", icon: Trophy },
    { view: "kid_progress", label: "Hồ sơ của bé", icon: CircleUser }
  ],
  parent: [
    { view: "parent_dashboard", label: "Trang chủ", icon: LayoutGrid },
    { view: "parent_progress", label: "Tiến độ học", icon: LineChart, phase: 3 },
    { view: "parent_pronunciation", label: "Phân tích phát âm", icon: Mic, phase: 3 },
    { view: "subscription", label: "Gói học & Thanh toán", icon: CreditCard },
    { view: "profile_select", label: "Hồ sơ của bé", icon: CircleUser },
    { view: "parent_privacy", label: "Cấu hình & Bảo mật", icon: ShieldCheck, phase: 3 }
  ]
};

export const VIEW_ROLE = {
  kid_dashboard: "kid", lesson_catalog: "kid", rewards: "kid", kid_progress: "kid", practice: "kid",
  parent_dashboard: "parent", subscription: "parent", profile_select: "parent"
};

export const VIEW_TITLE = {
  kid_dashboard: "Trang chủ", lesson_catalog: "Bài học", rewards: "Cúp của bé",
  kid_progress: "Hồ sơ của bé", practice: "Luyện phát âm",
  parent_dashboard: "Trang chủ", subscription: "Gói học & Thanh toán", profile_select: "Hồ sơ của bé"
};

export const ROLE_HOME = { kid: "kid_dashboard", parent: "parent_dashboard" };
```

Items with `phase: 3` render disabled until Phase 3 adds their views.

- [ ] **Step 3: Write `Sidebar.jsx`**

```jsx
import React from "react";
import { ArrowLeftRight } from "lucide-react";
import logo from "../../assets/brand/logo.svg";
import { NAV_ITEMS } from "./navConfig";

const ROLES = [
  { id: "kid", label: "Bé học" },
  { id: "parent", label: "Phụ huynh" },
  { id: "admin", label: "Admin", disabled: true }
];

export default function Sidebar({ role, currentView, onNavigate, onSwitchRole, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside
        data-testid="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-70 bg-white border-r border-vp-line/50 px-6 py-8 flex flex-col gap-8 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <img src={logo} alt="VietPhonics AI" className="h-10 w-auto self-start" />

        <nav className="flex flex-col gap-2">
          {NAV_ITEMS[role].map(({ view, label, icon: Icon, phase }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                disabled={Boolean(phase)}
                onClick={() => { onNavigate(view); onClose(); }}
                className={`flex items-center gap-3 rounded-xl px-4 h-12 text-sm font-semibold text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  active ? "bg-vp-blue text-white shadow-vp-drop" : "text-vp-ink hover:bg-vp-sky"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            );
          })}
        </nav>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-vp-ink">Chuyển đổi vai trò</span>
            <ArrowLeftRight className="w-4 h-4 text-vp-blue" />
          </div>
          <div className="flex rounded-full bg-slate-100 p-1">
            {ROLES.map(({ id, label, disabled }) => (
              <button
                key={id}
                data-testid={`role-${id}`}
                disabled={disabled}
                title={disabled ? "Sắp ra mắt" : undefined}
                onClick={() => onSwitchRole(id)}
                className={`flex-1 rounded-full h-8 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  role === id ? "bg-vp-blue text-white" : "text-vp-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-vp-sky p-4 text-vp-ink">
          <p className="font-bold text-sm mb-2">Bạn cần hỗ trợ?</p>
          <p className="text-xs text-slate-500 mb-2">Tổng đài trợ lý giáo vụ VietPhonics luôn sẵn sàng đồng hành cùng ba mẹ.</p>
          <p className="text-xs font-bold text-vp-blue">Hotline: 1900 6080</p>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 4: Write `TopBar.jsx`**

```jsx
import React from "react";
import { Flame, Sparkles, Search, Bell, User, Menu } from "lucide-react";

export default function TopBar({ title, child, showStats, onOpenMenu }) {
  return (
    <header className="sticky top-0 z-30 h-21 bg-white border-b border-vp-line/50 flex items-center gap-4 px-4 lg:px-6">
      <button className="lg:hidden p-2 text-vp-ink" onClick={onOpenMenu} aria-label="Mở menu" data-testid="menu-toggle">
        <Menu className="w-6 h-6" />
      </button>
      <h1 className="font-heading text-2xl font-bold text-vp-ink whitespace-nowrap">{title}</h1>

      {showStats && child && (
        <div className="hidden md:flex items-center gap-3 mx-auto">
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-100 px-4 h-9 text-xs font-bold text-amber-500">
            <Flame className="w-4 h-4" /> {child.streak} NGÀY
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-vp-sky px-4 h-9 text-xs font-bold text-vp-blue">
            <Sparkles className="w-4 h-4" /> {child.stars} ĐIỂM
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <label className="hidden sm:flex items-center rounded-full bg-slate-100 h-10 px-4 w-48">
          <input className="bg-transparent text-sm outline-none flex-1 min-w-0" placeholder="Search.." />
          <Search className="w-4 h-4 text-vp-blue" />
        </label>
        <button className="w-10 h-10 rounded-full bg-vp-blue text-white grid place-items-center" aria-label="Thông báo">
          <Bell className="w-4 h-4" />
        </button>
        <button className="w-10 h-10 rounded-full bg-vp-blue text-white grid place-items-center" aria-label="Tài khoản">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Verify**

Run: `cd frontend && npm run build && npm run lint`. Expected: pass. The components are not mounted yet, so there's no visual check.

- [ ] **Step 6: Commit** `Add Figma sidebar and top bar components`

### Task 3: Mount the shell in `App.jsx` and verify

**Files:**
- Create: `frontend/src/components/shell/AppShell.jsx`
- Modify: `frontend/src/App.jsx` (the JSX `return` block, around line 222 onward)
- Create: `scripts/verify_shell.js`

**Interfaces:**
- Consumes: `Sidebar`, `TopBar`, `VIEW_ROLE`, `VIEW_TITLE`, `ROLE_HOME` from Task 2.
- Produces: `<AppShell currentView setCurrentView selectedChild>{children}</AppShell>`, used by every later phase.

- [ ] **Step 1: Write `AppShell.jsx`**

```jsx
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { VIEW_ROLE, VIEW_TITLE, ROLE_HOME } from "./navConfig";

export default function AppShell({ currentView, setCurrentView, selectedChild, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = VIEW_ROLE[currentView] || "kid";

  return (
    <div className="min-h-screen bg-vp-canvas">
      <Sidebar
        role={role}
        currentView={currentView}
        onNavigate={setCurrentView}
        onSwitchRole={(next) => { if (ROLE_HOME[next]) setCurrentView(ROLE_HOME[next]); }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-70">
        <TopBar
          title={VIEW_TITLE[currentView] || ""}
          child={selectedChild}
          showStats={role === "kid"}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wrap the views in `App.jsx`**

Import `AppShell`. Keep `Navbar` for `currentView === "landing"` only. Wrap every other view in `<AppShell currentView={currentView} setCurrentView={setCurrentView} selectedChild={selectedChild}>`. Leave the `AIResultModal` and `AuthModal` render outside the shell so they overlay everything.

- [ ] **Step 3: Write `scripts/verify_shell.js`** (same launch setup as `scripts/verify_features.js`)

```js
const { chromium } = require('../frontend/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const fail = (msg) => { console.error('FAIL:', msg); process.exitCode = 1; };

  for (const viewport of [{ width: 1440, height: 1024 }, { width: 390, height: 844 }]) {
    const page = await (await browser.newContext({ viewport })).newPage();
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

    // Landing has no sidebar
    if (await page.getByTestId('sidebar').count()) fail(`${viewport.width}: sidebar on landing`);

    await page.getByText('Bắt đầu học ngay').first().click();
    await page.getByText('Bé Minh').first().click();
    const sidebar = page.getByTestId('sidebar');

    if (viewport.width < 1024) {
      if (await sidebar.isInViewport()) fail('390: sidebar visible before opening menu');
      await page.getByTestId('menu-toggle').click();
      await page.waitForTimeout(300);
      if (!(await sidebar.isInViewport())) fail('390: menu did not open sidebar');
    }

    // Role switch lands on parent home
    await page.getByTestId('role-parent').click();
    await page.waitForTimeout(300);
    if (!(await page.getByText('Gói học & Thanh toán').first().isVisible().catch(() => false))) {
      if (viewport.width < 1024) await page.getByTestId('menu-toggle').click();
    }
    if (!(await page.getByText('Gói học & Thanh toán').first().isVisible())) fail(`${viewport.width}: parent nav missing after role switch`);

    // Admin disabled
    if (!(await page.getByTestId('role-admin').isDisabled())) fail(`${viewport.width}: admin role should be disabled`);

    await page.screenshot({ path: `scripts/shell_${viewport.width}.png`, fullPage: false });
    console.log(`${viewport.width}px checks done`);
  }
  await browser.close();
})();
```

- [ ] **Step 4: Run it**

Run: `./start_vietphonics.sh` (in a separate terminal), then `node scripts/verify_shell.js`
Expected: `1440px checks done` and `390px checks done`, with no `FAIL:` lines. Open `scripts/shell_1440.png` and compare it with the Figma screenshot of `27:2454`. The sidebar, TopBar pills and background color should match. The page body is still the old design until Phase 2.

- [ ] **Step 5: Pill overflow check (Review Focus 5)**

Temporarily set `stars: 12345` on the Bé Minh fixture in `App.jsx`, reload at 1440px and confirm the "12345 ĐIỂM" pill stays on one line. Then revert.

- [ ] **Step 6: Commit** `Mount sidebar app shell for kid and parent views`

---

## Phase 2–5: Screen re-skin and new screens (one plan per phase)

Once Phase 1 has landed, write one short plan per phase with this skill. Each screen becomes one task with this shape:

1. `get_design_context` on the node ID from the inventory table (load `figma:figma-design-to-code` first), plus `get_screenshot` for reference.
2. Rewrite the matching view's JSX to the Figma layout. Use `vp-*` tokens and shell-aware spacing, and keep every existing prop, handler and API call.
3. `npm run build && npm run lint`, then a Playwright check for that view at 1440px and 390px, and a screenshot compared side by side with Figma.
4. Commit.

- **Phase 2, Child UX (15 frames, 7 existing files):** order KidDashboard → LessonCatalog → PracticeStudio states (04–08) → AIResultModal (09–11, three score bands matching `score >= 90 / 70–89 / < 70`, confirmed from frame copy) → mic permission and recording errors (12–13; new UI states in `PracticeStudioView` driven by `getUserMedia` errors) → KidProgress (14) → Rewards (15) → ProfileSelect (01) → Landing (8 sections of `1:2`). `PracticeStudioView.jsx` is 871 lines, so split it into state components under `views/practice/` as part of its task.
- **Phase 3, Parent UX (6 frames):** re-skin ParentDashboard and Subscription. Add `ParentProgressView`, `ParentPronunciationView`, `ChildProfileView` and `PrivacyConsentView`, fed by the existing `/api/parent-stats` and `/api/practice-history`. Remove `phase: 3` from `navConfig`.
- **Phase 4, Auth (6 frames):** replace `AuthModal` with full-page Sign in / OTP / Email / Signup steps / Forgot password views. The front end is mocked until a backend auth spec exists.
- **Phase 5, Admin (11 frames):** enable the Admin role and add an admin nav and 11 views on mock data. This needs a backend spec before any real data.
