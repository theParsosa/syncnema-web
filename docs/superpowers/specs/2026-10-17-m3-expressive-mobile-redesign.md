# Material 3 Expressive & Mobile-First Redesign Spec

**Date:** 2026-10-17  
**Status:** Approved  
**Project:** Syncnema (`syncnema.ir`)  
**Target:** Full M3 Expressive Overhaul for Desktop & Mobile

---

## 1. Executive Summary & Goals

Syncnema requires a modern, effective, and lightweight visual redesign adhering strictly to Google's **Material 3 Expressive (M3 Expressive)** design system. 

### Core Objectives:
1. **Performance & Lightness (افکتیو و سبک‌تر):**
   - Eliminate heavy, GPU-draining multi-layer backdrop blurs (`backdrop-filter: blur(24px)`) that degrade mobile battery life and performance.
   - Replace with Google's M3 **Tonal Elevation System** (`surface-container` tiers) with crisp 1px borders and high-contrast surfaces.
2. **Mobile Ergonomics (Mobile-First Thumb-Zone):**
   - Redesign mobile interactions from the ground up: move primary controls from the hard-to-reach top of the screen to an ergonomic **M3 Bottom Action Bar**.
   - Ensure all touch targets meet or exceed Google's **48×48px** touch target minimum.
3. **Simultaneous Video Watching & Interaction:**
   - Keep the video occupying the majority of the mobile viewport.
   - Introduce a **1-Tap Emoji Ribbon** directly above the bottom bar for instant, zero-friction reactions.
   - Implement an unobtrusive **Floating Live Chat Stream (Danmaku/Stream Overlay)** that displays recent messages with gentle auto-fade without occluding the movie.
4. **Modal Bottom Sheets for Mobile:**
   - Replace centered desktop-style modals with smooth, swipeable **M3 Modal Bottom Sheets** on mobile screens.
5. **Desktop Harmony:**
   - Re-skin desktop top navigation and side drawer with M3 Expressive pill shapes, clean chip components, and tonal containers.

---

## 2. Design System Tokens: M3 Expressive

### 2.1 Tonal Surfaces & Dark Theme Palette
```css
:root {
  /* M3 Dark Surfaces */
  --md-sys-color-surface: #090C10;
  --md-sys-color-surface-dim: #06090D;
  --md-sys-color-surface-container-lowest: #0C1017;
  --md-sys-color-surface-container-low: #131822;
  --md-sys-color-surface-container: #1A212E;
  --md-sys-color-surface-container-high: #232B3B;
  --md-sys-color-surface-container-highest: #2E374A;

  /* M3 Outlines & Dividers */
  --md-sys-color-outline: rgba(255, 255, 255, 0.12);
  --md-sys-color-outline-variant: rgba(255, 255, 255, 0.06);

  /* M3 Expressive Accents */
  --md-sys-color-primary: #38bdf8;
  --md-sys-color-primary-container: #082f49;
  --md-sys-color-on-primary: #082f49;
  --md-sys-color-on-primary-container: #e0f2fe;

  --md-sys-color-secondary: #f59e0b;
  --md-sys-color-secondary-container: #451a03;
  --md-sys-color-on-secondary-container: #fef3c7;

  --md-sys-color-tertiary: #ef4444;
  --md-sys-color-tertiary-container: #450a0a;
  --md-sys-color-on-tertiary-container: #fee2e2;

  --md-sys-color-on-surface: #f1f5f9;
  --md-sys-color-on-surface-variant: #94a3b8;
}
```

### 2.2 Expressive Shapes & Radius Scale
- **Pill / Fully Rounded:** `rounded-full` (9999px) for chips, bottom bars, FABs, and action pills.
- **Large Container:** `rounded-3xl` (24px to 28px) for cards, preview boxes, and modal containers.
- **Bottom Sheet Top Corners:** `rounded-t-[32px]` with a central drag handle (`w-10 h-1 rounded-full bg-slate-500/40`).
- **Interactive State Feedback:** Standard spring-like press scale (`active:scale-95` on mobile, `hover:scale-[1.02]` on desktop).

---

## 3. Mobile UI/UX Architecture

### 3.1 Layout Hierarchy (Portrait Mode)
- **Top Safe Zone (Status Scrim):**
  - Minimalist floating status chip (Room Name + Live Connection Indicator + User Avatar) pinned at the top-right in RTL.
  - Very low vertical footprint (<44px), leaving >85% of screen height for cinema viewing.
- **Central Cinema Player Viewport:**
  - Auto-centers video maintaining 16:9 or native aspect ratio.
  - Subtitles render with high-legibility M3 text styling (Vazirmatn, semi-bold, drop-shadow).
  - Floating Live Chat Stream Overlay: positioned at bottom-right of video viewport (max 3 recent messages, auto-fade after 4s, click-to-open bottom sheet).
- **Floating 1-Tap Reaction Ribbon:**
  - Placed horizontally directly above the bottom action bar.
  - Contains quick emoji buttons (`❤️`, `😂`, `😭`, `👏`, `🔥`) sized at `44×44px` with instant visual haptic bounce.
- **M3 Ergonomic Bottom Action Bar:**
  - Fixed at `bottom-4` with safe-area padding (`pb-[env(safe-area-inset-bottom)]`).
  - Height: `56px` with pill container (`rounded-full bg-surface-container/95 border border-outline`).
  - Key Actions:
    1. **Extended FAB Chat Trigger:** `[💬 چت (۳)]` with unread badge.
    2. **Media Button:** `[🎬 فیلم/زیرنویس]` with quick badge indicating active media.
    3. **Room & Admin Button:** `[👥 حاضرین / ⚙️ تنظیمات]`.
    4. **Fullscreen Quick-Toggle:** `[⛶ بزرگنمایی]`.

### 3.2 Modal Bottom Sheets (Mobile Replacement for Modals)
When any modal trigger is tapped on mobile (Chat, Media, Admin, Profile, Donate):
- Instead of centering a rigid dialog on the screen, a native-style **Modal Bottom Sheet** slides up from the bottom edge (`translate-y-full` -> `translate-y-0`).
- Has a prominent **Drag Handle** at top.
- Respects dynamic viewport height (`max-h-[85dvh]`).
- Closes smoothly on backdrop click, drag down, or close button.
- Solves mobile keyboard occlusion by anchoring inputs at the bottom sheet base.

---

## 4. Desktop UI/UX Architecture

- **M3 Expressive Top Bar:**
  - Consolidates the 3 islands into a cohesive, balanced M3 Pill Header.
  - Left: User Profile + Admin Crown Chip.
  - Center: Room Share + Connection Status Badge.
  - Right: Media Hub (Film + Subtitle) + Spectators Counter.
- **Side Panel Drawer:**
  - Clean M3 elevated surface container (`#161B24`) with seamless tab transitions (`[💬 گفتگو]` and `[👥 حاضرین]`).
  - Floating reaction trigger and fullscreen button docked on the right side.
- **Desktop Modals:**
  - High-contrast, clean M3 surface container dialogs (`rounded-3xl border border-outline`) with clear typography.

---

## 5. Landscape & Cinema Mode (Mobile & Desktop)

- **Mobile Landscape Auto-Fullscreen:**
  - When the device rotates horizontally, the bottom action bar and top chip automatically hide.
  - Touching anywhere on the screen displays translucent floating controls for 3 seconds before auto-hiding.
  - The Floating Reaction Ribbon stays docked at the bottom-left in landscape for uninterrupted party interactions.

---

## 6. Implementation & File Impact

1. **`index.html`:**
   - Implement M3 Expressive semantic containers (`#m3-bottom-bar`, `#emoji-ribbon`, `#chat-stream-overlay`).
   - Add M3 bottom sheet wrappers for mobile modals while preserving desktop accessibility.
   - Update cache buster to `?v=4.1`.
2. **`style.css`:**
   - Define M3 Expressive CSS variables and utility classes.
   - Implement bottom sheet slide transitions and drag handle styling.
   - Eliminate heavy blurs and optimize CSS rendering layers (`will-change: transform`).
3. **`script.js`:**
   - Add live chat stream overlay renderer (`appendChatStreamMessage` with 4s auto-fade).
   - Hook 1-tap reaction ribbon directly to `broadcastReaction`.
   - Add bottom sheet open/close handlers with swipe-down dismissal support.
   - Keep existing multi-user synchronization and authoritative host clock untouched.

---

## 7. Verification & Testing

- **Regression Tests:** All 8 existing tests (`test_identity`, `test_protocol`, `test_sync`, `test_admin`, `test_chat_drawer`, `test_reactions`, `test_media_hub`, `simulate_room`) must continue to pass with 0 errors.
- **Mobile Touch Target Verification:** Script verifying all mobile buttons have minimum bounding client dimensions of 48×48px.
- **Live Deployment:** Push to `origin/main` and verify live on `https://syncnema.ir` with HTTP/2 200.
