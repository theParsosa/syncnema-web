# Material 3 Expressive & Mobile-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely overhaul Syncnema's UI/UX to Google's Material 3 Expressive (M3 Expressive) design system, replacing heavy blurs with lightweight tonal surfaces, and engineering an ergonomic, mobile-first experience featuring an M3 Bottom Action Bar, 1-tap emoji ribbon, live chat stream overlay, and native bottom sheets.

**Architecture:** Tonal elevation architecture replacing GPU-heavy `backdrop-filter` with `--md-sys-color-surface-container-*` CSS tokens. Responsive split: desktop maintains a unified M3 pill top bar and right rail, while mobile switches to a bottom thumb-zone dock (`#m3-bottom-bar`), a 1-tap emoji ribbon, a semi-transparent floating chat stream on video, and swipeable M3 bottom sheets with minimum 48px touch targets.

**Tech Stack:** Vanilla JavaScript (ES2022), CSS3 (Custom Properties & Animations), Tailwind CSS (CDN), HTML5 Video/HLS, PartyKit WebSocket.

**Spec:** `docs/superpowers/specs/2026-10-17-m3-expressive-mobile-redesign.md`

## Global Constraints
- Target 100% responsive behavior from 360px (mobile) to 4K (desktop).
- Minimum mobile touch target size of 48×48px for all interactive buttons.
- Zero regression in multi-user synchronization, authoritative host clock, subtitle broadcast, and party protocol.
- Preserved Persian typography (Vazirmatn) and RTL layout.
- Cache buster bumped to `?v=4.1` upon completion.

---

### Task 1: M3 Expressive Tonal Surfaces & Performance Tokens

**Files:**
- Modify: `style.css:1-120`
- Create: `tests/test_m3_tokens.js`

**Interfaces:**
- Produces: CSS custom properties (`--md-sys-color-surface-*`, `--md-sys-shape-*`) and utility classes (`.m3-surface-low`, `.m3-surface-container`, `.m3-surface-high`, `.m3-pill-btn`, `.m3-fab`).

- [ ] **Step 1: Write the failing token test**

```javascript
// tests/test_m3_tokens.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

// Check that M3 tokens are defined
assert(css.includes('--md-sys-color-surface:'), 'Missing --md-sys-color-surface in style.css');
assert(css.includes('--md-sys-color-surface-container:'), 'Missing --md-sys-color-surface-container');
assert(css.includes('--md-sys-color-surface-container-high:'), 'Missing --md-sys-color-surface-container-high');
assert(css.includes('.m3-surface-container'), 'Missing .m3-surface-container class');
assert(css.includes('.m3-pill-btn'), 'Missing .m3-pill-btn class');

console.log('Task 1 Test Passed: M3 tokens verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_tokens.js`  
Expected: FAIL with missing token assertion.

- [ ] **Step 3: Implement M3 Expressive tokens in `style.css`**

Add root variables and M3 surface classes to `style.css`, replacing heavy `backdrop-filter` in `.glass-island` and `.modal-content` with performant M3 tonal elevation containers and crisp outlines.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_tokens.js`  
Expected: PASS with "Task 1 Test Passed: M3 tokens verified!"

- [ ] **Step 5: Commit**

```bash
git add style.css tests/test_m3_tokens.js
git commit -m "feat(m3): implement Material 3 Expressive tonal surface tokens and classes"
```

---

### Task 2: Mobile M3 Bottom Action Bar & Thumb-Zone Layout

**Files:**
- Modify: `index.html:318-405` (add `#m3-bottom-bar` and `#m3-top-chip`)
- Modify: `style.css` (mobile bottom bar styling and responsive breakpoints)
- Create: `tests/test_m3_mobile_bar.js`

**Interfaces:**
- Consumes: M3 surface classes from Task 1.
- Produces: DOM elements `#m3-bottom-bar`, `#m3-top-chip`, `#m3-chat-fab`, `#m3-media-btn`, `#m3-spectators-btn`, `#m3-fs-btn`.

- [ ] **Step 1: Write the failing mobile bar test**

```javascript
// tests/test_m3_mobile_bar.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');

assert(html.includes('id="m3-bottom-bar"'), 'index.html missing #m3-bottom-bar');
assert(html.includes('id="m3-chat-fab"'), 'index.html missing #m3-chat-fab');
assert(html.includes('id="m3-media-btn"'), 'index.html missing #m3-media-btn');
assert(html.includes('id="m3-top-chip"'), 'index.html missing #m3-top-chip');

console.log('Task 2 Test Passed: Mobile M3 bar verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_mobile_bar.js`  
Expected: FAIL with missing `#m3-bottom-bar`.

- [ ] **Step 3: Implement `#m3-bottom-bar` and `#m3-top-chip` in `index.html` and `style.css`**

Add the bottom dock with safe-area padding at bottom of mobile viewports, hiding the bulky desktop top bar on screens `< 768px`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_mobile_bar.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css tests/test_m3_mobile_bar.js
git commit -m "feat(m3): add mobile M3 bottom action bar and compact top chip"
```

---

### Task 3: 1-Tap Fast Emoji Reaction Ribbon

**Files:**
- Modify: `index.html:450-475` (add `#m3-emoji-ribbon`)
- Modify: `style.css` (ribbon styling, scroll snap, bouncy spring active state)
- Modify: `script.js` (delegate ribbon click events to `broadcastReaction`)
- Create: `tests/test_m3_emoji_ribbon.js`

**Interfaces:**
- Consumes: `broadcastReaction(emoji)` from `script.js`.
- Produces: Instant reaction triggers directly above the bottom bar.

- [ ] **Step 1: Write the failing emoji ribbon test**

```javascript
// tests/test_m3_emoji_ribbon.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(html.includes('id="m3-emoji-ribbon"'), 'Missing #m3-emoji-ribbon in index.html');
assert(script.includes('.m3-quick-emoji'), 'script.js missing .m3-quick-emoji listener');

console.log('Task 3 Test Passed: Emoji ribbon verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_emoji_ribbon.js`  
Expected: FAIL.

- [ ] **Step 3: Implement `#m3-emoji-ribbon` in `index.html`, `style.css`, and `script.js`**

Add the horizontal quick emoji pill container above the bottom bar with buttons for `❤️`, `😂`, `😭`, `👏`, `🔥`, `😱`. Attach click handlers in `script.js` invoking `spawnReaction(emoji, myProfile)` and broadcasting over WebSocket with 400ms throttle.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_emoji_ribbon.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js tests/test_m3_emoji_ribbon.js
git commit -m "feat(m3): implement 1-tap fast emoji reaction ribbon"
```

---

### Task 4: Floating Live Chat Stream Overlay

**Files:**
- Modify: `index.html:410-440` (add `#chat-stream-overlay`)
- Modify: `style.css` (stream message bubble animations, fade-out keyframes)
- Modify: `script.js` (function `renderStreamMessage(msg)` auto-removing after 4s)
- Create: `tests/test_m3_chat_stream.js`

**Interfaces:**
- Consumes: Incoming chat messages from WebSocket handler in `script.js`.
- Produces: Unobtrusive overlay bubbles on video player edge.

- [ ] **Step 1: Write the failing chat stream test**

```javascript
// tests/test_m3_chat_stream.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(html.includes('id="chat-stream-overlay"'), 'Missing #chat-stream-overlay in index.html');
assert(script.includes('renderStreamMessage'), 'script.js missing renderStreamMessage');

console.log('Task 4 Test Passed: Chat stream overlay verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_chat_stream.js`  
Expected: FAIL.

- [ ] **Step 3: Implement `#chat-stream-overlay` in `index.html`, `style.css`, and `script.js`**

Render incoming messages as compact pills in the lower-right corner of the video. Limit to 3 items at once; smoothly fade out after 4 seconds. Tapping any message opens the full chat drawer.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_chat_stream.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js tests/test_m3_chat_stream.js
git commit -m "feat(m3): implement floating live chat stream overlay"
```

---

### Task 5: M3 Modal Bottom Sheets for Mobile Forms

**Files:**
- Modify: `index.html` (add bottom sheet classes and drag handles to modals)
- Modify: `style.css` (bottom sheet slide-up animation, drag handle styling)
- Modify: `script.js` (wire `#m3-media-btn`, `#m3-chat-fab`, `#m3-spectators-btn` to open bottom sheets)
- Create: `tests/test_m3_bottom_sheets.js`

**Interfaces:**
- Consumes: Modal elements (`#video-modal`, `#sub-modal`, `#admin-modal`, `#profile-modal`, `#chat-sidebar`).
- Produces: Adaptive display: centered dialog on desktop (`md:`), slide-up bottom sheet on mobile (`max-md:`).

- [ ] **Step 1: Write the failing bottom sheet test**

```javascript
// tests/test_m3_bottom_sheets.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('m3-bottom-sheet'), 'index.html missing m3-bottom-sheet classes');
assert(css.includes('.m3-drag-handle'), 'style.css missing .m3-drag-handle');
assert(css.includes('sheet-open'), 'style.css missing sheet-open animation');

console.log('Task 5 Test Passed: Bottom sheets verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_bottom_sheets.js`  
Expected: FAIL.

- [ ] **Step 3: Implement M3 bottom sheets in `index.html`, `style.css`, and `script.js`**

Add responsive bottom sheet styling to modal dialogs. When opened on mobile, they slide up from the bottom with `rounded-t-[32px]`, a visible drag handle, and max height `85dvh`. Wire the mobile bottom bar buttons (`#m3-media-btn`, `#m3-chat-fab`, etc.) to trigger these sheets.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_bottom_sheets.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js tests/test_m3_bottom_sheets.js
git commit -m "feat(m3): implement M3 modal bottom sheets for mobile dialogs"
```

---

### Task 6: Desktop M3 Harmonization & Landscape Mode Auto-Hide

**Files:**
- Modify: `index.html` (harmonize desktop top-bar into cohesive M3 pill header)
- Modify: `style.css` (landscape auto-hide rules and desktop hover states)
- Modify: `script.js` (landscape orientation change listener)
- Create: `tests/test_m3_desktop_landscape.js`

**Interfaces:**
- Produces: Polished M3 experience on desktop, seamless auto-fullscreen in landscape.

- [ ] **Step 1: Write the failing desktop/landscape test**

```javascript
// tests/test_m3_desktop_landscape.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');
assert(css.includes('@media (orientation: landscape) and (max-height: 500px)'), 'Missing landscape media query in style.css');

console.log('Task 6 Test Passed: Desktop and landscape verified!');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_desktop_landscape.js`  
Expected: FAIL.

- [ ] **Step 3: Implement desktop styling and landscape rules**

Harmonize desktop top bar with M3 pill design. Add landscape media queries that auto-hide chrome when height is constrained, revealing controls only on tap.

- [ ] **Step 4: Run test to verify it passes**

Run: `node /Users/parsosa/Downloads/syncnema/tests/test_m3_desktop_landscape.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add style.css index.html script.js tests/test_m3_desktop_landscape.js
git commit -m "feat(m3): harmonize desktop header and landscape fullscreen behavior"
```

---

### Task 7: Full Regression Suite, Cache Buster Bump & Production Deployment

**Files:**
- Modify: `index.html` (bump cache buster to `v=4.1`)
- Run all tests: 8 regression tests + 6 new M3 tests

- [ ] **Step 1: Bump cache buster in `index.html` to `v=4.1`**

```html
<link rel="stylesheet" href="style.css?v=4.1">
<script src="script.js?v=4.1" defer></script>
```

- [ ] **Step 2: Run all 14 verification tests**

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
node /Users/parsosa/Downloads/syncnema/tests/test_m3_tokens.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_mobile_bar.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_emoji_ribbon.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_chat_stream.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_bottom_sheets.js && \
node /Users/parsosa/Downloads/syncnema/tests/test_m3_desktop_landscape.js
```
Expected: All 14 tests PASS with exit code 0.

- [ ] **Step 3: Commit and Push to `origin/main`**

```bash
git add index.html
git commit -m "release: v4.1 Material 3 Expressive and mobile-first overhaul"
git push origin main
```

- [ ] **Step 4: Verify live on `https://syncnema.ir`**

```bash
curl -Iv https://syncnema.ir/ | grep -E "200 OK|v=4.1"
```
Expected: HTTP/2 200 with `v=4.1`.
