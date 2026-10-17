# Material 3 Expressive Complete Rebuild Implementation Plan (v4.2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete, ground-up rebuild of Syncnema's frontend into a modern, battery-efficient Material 3 Expressive experience inspired by Android FOSS apps, featuring Estedad typography, a dual-mode mobile layout (Portrait Browsing + Cinema Fullscreen), unified desktop M3 header, and completely rebuilt sidebar.

**Architecture:** Pure vanilla HTML5, CSS3, and JavaScript with Tailwind utility primitives and custom M3 Expressive tokens. Elimination of all heavy GPU-draining liquid glass and ambient void glows, replaced with high-contrast M3 surface containers and responsive layouts.

**Tech Stack:** HTML5, CSS3, JavaScript (ES6+), Tailwind CSS, Estedad Font, WebSockets, HTML5 Video, YouTube IFrame API.

**Spec:** `docs/superpowers/specs/2026-10-17-m3-expressive-complete-rebuild.md`

## Global Constraints

- Primary typeface MUST be **Estedad (استعداد)** across all text, inputs, buttons, and badges.
- All interactive touch targets on mobile MUST be >= 48px.
- Zero battery-draining `backdrop-filter: blur(28px)` liquid glass.
- Dual mobile mode MUST support:
  1. Portrait Browsing Mode: Top bar, 16:9 pinned video, media chips dock beneath video, and full-height chat/spectators view below.
  2. Cinema Fullscreen / Landscape: 100% video display, auto-fading controls, 1-tap emoji reaction ribbon, and non-occluding chat stream overlay.
- Real-time synchronization protocol, authoritative host clock, catch-up mechanism, and subtitle broadcasting MUST remain 100% functional.

---

### Task 1: Estedad Font Integration & Foundation Cleanup

**Files:**
- Modify: `index.html` (load Estedad font, remove ambient glow divs)
- Modify: `style.css` (set Estedad as default font-family, purge legacy liquid-glass glow rules)
- Create: `tests/test_m3_rebuild_font.js`

**Interfaces:**
- Produces: Global CSS font-family `'Estedad', sans-serif` and clean obsidian surface background `#0B0E14`.

- [ ] **Step 1: Write the failing font and cleanup test**

```javascript
// tests/test_m3_rebuild_font.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('family=Estedad'), 'index.html missing Google Fonts Estedad link');
assert(css.includes("font-family: 'Estedad'"), 'style.css missing Estedad font-family definition');
assert(!html.includes('class="ambient-glow-1"'), 'index.html should not contain legacy ambient glow divs');

console.log('Task 1 Test Passed: Estedad font and foundation verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_font.js`  
Expected: FAIL.

- [ ] **Step 3: Implement Estedad font and remove legacy glow elements**

In `index.html`:
- Add Google Fonts Estedad link: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Estedad:wght@300;400;500;600;700;800;900&display=swap">`.
- Remove `ambient-glow-1` and `ambient-glow-2` divs.
In `style.css`:
- Update `body` and `:root` font-family to `'Estedad', sans-serif`.
- Remove `.ambient-glow-*` rules.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_font.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css tests/test_m3_rebuild_font.js
git commit -m "feat(m3): integrate Estedad typography and purge legacy ambient glows"
```

---

### Task 2: Unified Desktop M3 Top App Bar

**Files:**
- Modify: `index.html` (rebuild `#top-bar` as unified M3 Center-Aligned Top App Bar)
- Modify: `style.css` (M3 Top App Bar styling)
- Create: `tests/test_m3_rebuild_desktop_header.js`

**Interfaces:**
- Produces: Single unified header `#m3-desktop-header` replacing the 3 detached floating islands on screens `>= 768px`.

- [ ] **Step 1: Write the failing desktop header test**

```javascript
// tests/test_m3_rebuild_desktop_header.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');

assert(html.includes('id="m3-desktop-header"'), 'index.html missing #m3-desktop-header');
assert(html.includes('id="video-modal-trigger"'), 'Desktop header missing video trigger');
assert(html.includes('id="sub-modal-trigger"'), 'Desktop header missing subtitle trigger');
assert(html.includes('id="spectators-trigger-btn"'), 'Desktop header missing spectators trigger');

console.log('Task 2 Test Passed: Unified desktop header verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_desktop_header.js`  
Expected: FAIL with missing `#m3-desktop-header`.

- [ ] **Step 3: Implement unified `#m3-desktop-header` in `index.html` and `style.css`**

Replace `#top-bar` with an elegant, cohesive `header#m3-desktop-header` that has:
- Right: Brand logo + Live connection pulse badge.
- Center: Quick media actions (`#video-modal-trigger`, `#sub-modal-trigger`, `#share-room-btn`).
- Left: Spectators count badge (`#spectators-trigger-btn`), Host Crown (`#admin-panel-trigger`), and User Profile (`#user-profile-btn`).

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_desktop_header.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css tests/test_m3_rebuild_desktop_header.js
git commit -m "feat(m3): implement unified desktop M3 Top App Bar"
```

---

### Task 3: Complete M3 Sidebar & Chat Drawer Rebuild

**Files:**
- Modify: `index.html` (rebuild `#chat-sidebar` markup with M3 segmented buttons and message containers)
- Modify: `style.css` (M3 Navigation Drawer styles, FOSS chat bubble shapes, and pill input)
- Modify: `script.js` (update `addMsg` DOM creation to use M3 bubble layout)
- Create: `tests/test_m3_rebuild_sidebar.js`

**Interfaces:**
- Produces: Polished FOSS-style drawer with M3 segmented pill tabs and distinct primary-container message bubbles.

- [ ] **Step 1: Write the failing sidebar test**

```javascript
// tests/test_m3_rebuild_sidebar.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(html.includes('id="chat-drawer-tabs"'), 'Missing #chat-drawer-tabs');
assert(css.includes('.m3-chat-bubble-me'), 'Missing .m3-chat-bubble-me styling');
assert(css.includes('.m3-chat-bubble-other'), 'Missing .m3-chat-bubble-other styling');
assert(script.includes('m3-chat-bubble-me'), 'script.js missing m3-chat-bubble-me class assignment');

console.log('Task 3 Test Passed: M3 sidebar verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_sidebar.js`  
Expected: FAIL.

- [ ] **Step 3: Implement M3 sidebar and message styling**

In `style.css`:
- Define `.m3-chat-bubble-me`: `bg-[var(--md-sys-color-primary-container)]`, text `[var(--md-sys-color-on-primary-container)]`, `rounded-2xl rounded-br-sm`.
- Define `.m3-chat-bubble-other`: `bg-[var(--md-sys-color-surface-container-high)]`, text `[var(--md-sys-color-on-surface)]`, border `var(--md-sys-color-outline)`, `rounded-2xl rounded-bl-sm`.
In `script.js`:
- In `addMsg`, apply `.m3-chat-bubble-me` when `isMe` is true, and `.m3-chat-bubble-other` when false. Include host crown badge if sender is room host.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_sidebar.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js tests/test_m3_rebuild_sidebar.js
git commit -m "feat(m3): complete redesign of chat drawer and FOSS message bubbles"
```

---

### Task 4: Mobile Dual-Mode (Mode A: Portrait Browsing Architecture)

**Files:**
- Modify: `index.html` (rearchitect mobile viewport: top chip, pinned video card, scrollable action chips dock, and integrated chat pane)
- Modify: `style.css` (portrait layout rules: zero screen waste, keyboard responsive)
- Create: `tests/test_m3_rebuild_mobile_portrait.js`

**Interfaces:**
- Produces: Dual mobile layout where mobile portrait presents clean stacked cinema browsing without overlapping video.

- [ ] **Step 1: Write the failing mobile portrait test**

```javascript
// tests/test_m3_rebuild_mobile_portrait.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('id="m3-mobile-dock"'), 'index.html missing #m3-mobile-dock');
assert(css.includes('@media (max-width: 767px)'), 'style.css missing mobile portrait media query');

console.log('Task 4 Test Passed: Mobile portrait layout verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_mobile_portrait.js`  
Expected: FAIL.

- [ ] **Step 3: Implement Mobile Portrait Browsing Mode**

- Add `#m3-mobile-dock` directly below the video container in mobile portrait, containing:
  - `🎬 فیلم`
  - `💬 زیرنویس`
  - `👥 حاضرین`
  - `🔴 بازگشت به لایو` (hidden until drift)
  - `⛶ تمام صفحه`
- Ensure the lower screen displays the active tab pane (chat / spectators) directly on mobile portrait.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_mobile_portrait.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css tests/test_m3_rebuild_mobile_portrait.js
git commit -m "feat(m3): implement mobile portrait browsing mode with pinned video and media dock"
```

---

### Task 5: Mobile Dual-Mode (Mode B: Cinema Fullscreen & Landscape HUD)

**Files:**
- Modify: `style.css` (landscape auto-fullscreen rules, HUD 3.5s auto-hide)
- Modify: `script.js` (fullscreen change & touch listeners to reveal controls temporarily)
- Create: `tests/test_m3_rebuild_mobile_fullscreen.js`

**Interfaces:**
- Produces: Seamless immersion when entering fullscreen or rotating horizontally, preserving 1-tap emoji ribbon and non-occluding chat stream overlay.

- [ ] **Step 1: Write the failing fullscreen test**

```javascript
// tests/test_m3_rebuild_mobile_fullscreen.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(css.includes('is-fullscreen-cinema'), 'style.css missing is-fullscreen-cinema styling');
assert(script.includes('enterCinemaFullscreen'), 'script.js missing enterCinemaFullscreen');

console.log('Task 5 Test Passed: Cinema fullscreen verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_mobile_fullscreen.js`  
Expected: FAIL.

- [ ] **Step 3: Implement cinema fullscreen mode**

In `script.js`:
- Add `enterCinemaFullscreen()` and attach to fullscreen button and orientation change events.
- When active, add `.is-fullscreen-cinema` to body.
In `style.css`:
- In `.is-fullscreen-cinema` and `@media (orientation: landscape) and (max-height: 500px)`, hide top app bars and browsing dock. Keep video at 100% viewport and dock reaction ribbon in the corner.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_mobile_fullscreen.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add style.css script.js tests/test_m3_rebuild_mobile_fullscreen.js
git commit -m "feat(m3): implement immersive cinema fullscreen mode and landscape HUD"
```

---

### Task 6: M3 Expressive Dialogs Overhaul, Regression & Deployment

**Files:**
- Modify: `index.html` (bump cache buster to `v=4.2`, polish modal structures)
- Modify: `style.css` (M3 dialog styling with 28px corners and segmented input tabs)
- Run all 15 verification tests
- Commit, push, and verify live on `https://syncnema.ir`

- [ ] **Step 1: Bump cache buster in `index.html` to `v=4.2`**

```html
<link rel="stylesheet" href="style.css?v=4.2">
<script src="script.js?v=4.2" defer></script>
```

- [ ] **Step 2: Run all 15 verification tests**

```bash
node --check /Users/parsosa/Downloads/syncnema/script.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_identity.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_protocol.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_sync.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_admin.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_chat_drawer.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_reactions.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_media_hub.js && \
node /Users/parsosa/Downloads/syncnema/tests/simulate_room.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_font.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_desktop_header.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_sidebar.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_mobile_portrait.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_rebuild_mobile_fullscreen.js
```
Expected: All tests PASS with exit code 0.

- [ ] **Step 3: Commit and Push to `origin/main`**

```bash
git add index.html style.css
git commit -m "release: v4.2 complete Material 3 Expressive rebuild with Estedad typography"
git push origin main
```

- [ ] **Step 4: Verify live deployment on `https://syncnema.ir`**

```bash
curl -s "https://syncnema.ir/?cb=v42" | grep -E "family=Estedad|v=4.2"
```
Expected: HTTP 200 with Estedad font and `v=4.2`.
