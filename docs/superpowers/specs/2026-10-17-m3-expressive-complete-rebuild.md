# Material 3 Expressive Complete Rebuild Specification (v4.2)

## 1. Vision & Goals

A complete, ground-up rebuild of Syncnema's frontend following Google's **Material 3 Expressive (M3 Expressive)** design system, inspired by modern Android FOSS applications (such as Seal, OuterTune, Metrolist, and NewPipe).

### Core Goals:
1. **Complete Visual Overhaul:** Strip all legacy VisionOS liquid glass, ambient void glows, and multi-island clutter. Replace with M3 Expressive tonal surface containers (`--md-sys-color-surface-container-*`), 1px subtle outlines, and responsive tactile geometry.
2. **Estedad Font Integration:** Replace Vazirmatn entirely with **Estedad (استعداد)**, providing ultra-modern Iranian digital product typography, loaded via Google Fonts with robust jsDelivr CDN fallback.
3. **Dual-Mode Mobile Architecture:**
   - **Mode A (Portrait Browsing):** Top app bar, 16:9 video card, quick action chips dock directly beneath the video, and an integrated full-height chat/spectators panel below that avoids keyboard overlap.
   - **Mode B (Cinema Fullscreen & Landscape):** Zero chrome obstruction; video occupies 100% of the display. 3-second auto-fading playback HUD, 1-tap fast emoji ribbon in bottom corner, and non-intrusive floating chat overlay pills.
4. **Desktop Harmonization:** Single unified M3 Top App Bar (brand/status, media split-buttons, room invite, spectators, admin crown, profile chip) and expansive cinema player.
5. **Complete Sidebar Redesign:** M3 Navigation Drawer with segmented pill tabs (`[💬 گفتگو]` and `[👥 حاضرین]`), native FOSS message bubble cards with distinct host badges, and an ergonomic pill input bar with integrated mini-FAB.
6. **M3 Expressive Dialogs & Bottom Sheets:** 28px rounded surface dialogs on desktop, native bottom sheets on mobile with visible drag handles.

---

## 2. Design Tokens & Typography

### 2.1 Typography: Estedad (استعداد)
- Primary Font Family: `'Estedad', sans-serif`.
- Weights used:
  - `400 (Regular)`: Body text, subtitle lines, chat messages.
  - `500 (Medium)`: Input fields, spectator list labels.
  - `600 (SemiBold)`: Buttons, chip labels, timestamps.
  - `700 (Bold)`: Titles, headers, sender usernames.
  - `800 (ExtraBold)`: Modal headings, room title.
- Fallback stack: `'Estedad', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.

### 2.2 Tonal Surface Palette
- `--md-sys-color-surface`: `#0B0E14` (Deep obsidian dark base)
- `--md-sys-color-surface-dim`: `#080B10`
- `--md-sys-color-surface-container-lowest`: `#0F131C`
- `--md-sys-color-surface-container-low`: `#141924`
- `--md-sys-color-surface-container`: `#1B2230`
- `--md-sys-color-surface-container-high`: `#232B3C`
- `--md-sys-color-surface-container-highest`: `#2C364B`
- `--md-sys-color-outline`: `rgba(255, 255, 255, 0.10)`
- `--md-sys-color-outline-variant`: `rgba(255, 255, 255, 0.05)`

### 2.3 Expressive Accent Colors
- **Primary (Cyan/Electric Blue):**
  - `--md-sys-color-primary`: `#38bdf8`
  - `--md-sys-color-primary-container`: `#004d67`
  - `--md-sys-color-on-primary`: `#003549`
  - `--md-sys-color-on-primary-container`: `#c3e8ff`
- **Secondary / Admin (Gold/Amber):**
  - `--md-sys-color-secondary`: `#fbbf24`
  - `--md-sys-color-secondary-container`: `#451a03`
  - `--md-sys-color-on-secondary-container`: `#fef3c7`
- **Tertiary / Live Warning (Crimson Red):**
  - `--md-sys-color-tertiary`: `#f87171`
  - `--md-sys-color-tertiary-container`: `#450a0a`
  - `--md-sys-color-on-tertiary-container`: `#fee2e2`

---

## 3. Screen Layouts & Components

### 3.1 Mobile Portrait Mode (Vertical Browsing)
- **Top App Bar:**
  - Height: 52px.
  - Right: App Icon + Room Title.
  - Center/Left: Live Status dot + Copy Link button + User Profile Avatar chip.
- **Pinned Video Card:**
  - 16:9 container, `rounded-2xl`, overflow hidden, drop shadow.
  - Video element with native controls or custom HUD.
  - Expand to Fullscreen button (⛶) prominent in corner.
- **Media Action Dock (Horizontal Scrollable Chips directly below video):**
  - `[🎬 فیلم]`: Opens M3 Bottom Sheet with segmented tabs (`فایل دستگاه` | `لینک مستقیم` | `یوتیوب`).
  - `[💬 زیرنویس]`: Opens Subtitle Sheet with file selector and `[-0.5s]` / `[+0.5s]` offset buttons.
  - `[👥 ۳ حاضر]`: Switches view to spectators tab.
  - `[🔴 بازگشت به لایو]`: Dynamic chip, only appears when local clock drifts >1.5s from host.
  - `[⚙️ مدیریت]`: Only appears for room host.
- **Integrated Chat & Spectators View:**
  - Tab header (`[گفتگو]` | `[حاضرین]`) with smooth indicator slider.
  - Messages stream with auto-scroll and reply previews.
  - Sticky bottom input bar with auto-height adjustment for virtual keyboards.

### 3.2 Mobile Fullscreen & Landscape Mode
- Video expands to 100vw × 100vh.
- Top bar, media action dock, and chat pane are completely hidden.
- Touching the screen reveals:
  - Playback HUD (Play/Pause, scrub bar, exit fullscreen) with 3.5s auto-fade.
  - Floating 1-tap emoji reaction ribbon (`❤️`, `😂`, `😭`, `👏`, `🔥`, `😱`) in lower-left corner.
  - Floating recent chat overlay pills in lower-right corner (max 3 items, 4s auto-fade).

### 3.3 Desktop Mode (Large Screen Cinema)
- **Unified M3 Top App Bar:**
  - Width: max-w-7xl centered or full-width floating bar (`rounded-3xl` container, 60px height).
  - Right: Brand identity + Live room status.
  - Center: Media chips (`[🎬 انتخاب فیلم]`, `[💬 زیرنویس]`, `[🔗 دعوت دوستان]`).
  - Left: Spectators badge, Host Crown button, and User Profile chip.
- **Cinema Player Area:**
  - Expansive center stage, high-contrast black backdrop.
- **M3 Side Drawer:**
  - Docked on the left side (RTL).
  - Width: 380px.
  - Surface: `surface-container-low` with 1px border.
  - Segmented buttons for Chat / Spectators.
  - Rich chat bubbles:
    - User's own messages: `primary-container` right-aligned.
    - Other users' messages: `surface-container-high` left-aligned with sender avatar and colored username.
  - Chat input bar with emoji picker and cyan send FAB.

### 3.4 Modals & Bottom Sheets
- All dialogs on desktop: `rounded-[28px]` M3 surface containers with clear header, body, and action buttons.
- On mobile (`< 768px`): Automatically rendered as M3 Modal Bottom Sheets with top drag handle (`w-11 h-1.5 rounded-full bg-white/20`).

---

## 4. Verification & Testing Criteria
1. Full test suite passing across identity, protocol, sync, chat drawer, reactions, media hub, room simulation, and new M3 components.
2. Verified font rendering of Estedad across headers, chat bubbles, buttons, and inputs.
3. Verified mobile responsive breakpoints (`< 768px` portrait, `< 500px` height landscape, `>= 768px` desktop).
4. Zero console errors or layout shift during keyboard open/close.
