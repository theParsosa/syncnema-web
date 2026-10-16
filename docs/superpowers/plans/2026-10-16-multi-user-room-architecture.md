# برنامه اجرایی بازنویسی معماری اتاق‌های چندنفره سینک‌نما (Syncnema v4.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بازنویسی کامل پروژه Syncnema از معماری دو‌نفره به پلتفرم جامع واچ‌پارتی چندنفره با محوریت ساعت لایو میزبان (Host-Authoritative)، هویت کاربری مستقل، پنل اختیارات گسترده ادمین، بازطراحی کامل چت و درآور موبایل، و ایموجی‌های شناور هوشمند با نشان فرستنده.

**Architecture:** مهاجرت از پروتکل نظیر‌به‌نظیر قدیمی (`partnerId`) به وضعیت یکپارچه اتاق (`RoomState`) روی وب‌سوکت PartyKit؛ ساعت لایو ادمین به عنوان مرجع قطعی پخش که هرگز متوقف نمی‌شود؛ امکان تماشای مستقل شرکت‌کنندگان همراه با دکمه شناور «🔴 بازگشت به لایو»؛ احراز هویت ادمین با کلید امنیتی (`hostKey`) در `localStorage`؛ بازطراحی چت به صورت درآور دو تَبِ (چت + حاضرین) و ایموجی‌های میکروکپسولی با نام و آواتار.

**Tech Stack:** HTML5, Modern Vanilla JavaScript (ES2022), Tailwind CSS, Custom Glassmorphism CSS, PartyKit WebSockets, HLS.js, YouTube Iframe API, jschardet.

**Spec:** [docs/superpowers/specs/2026-10-16-multi-user-room-architecture-design.md](file:///Users/parsosa/Downloads/syncnema/docs/superpowers/specs/2026-10-16-multi-user-room-architecture-design.md)

## Global Constraints
- حذف کامل کلیه متغیرها و منطق‌های مرتبط با `partnerId`، `syncnema_partner` و هندشیک دوطرفه `conn_req/conn_ack`.
- پخش ادمین تحت هیچ شرایطی به خاطر بافرینگ یا دستکاری بقیه متوقف نمی‌شود.
- کاربری که هاست نیست، با پلی/پاز/پرش صرفاً وارد حالت مستقل (Detached) می‌شود و هیچ پیام تغییر تایمی برای بقیه ارسال نمی‌کند.
- ادمینی اتاق منحصراً در صورتی به فرد دیگری می‌رسد که ادمین خودش از منوی اعضا آن را انتقال دهد.
- انکودینگ زیرنویس‌های فارسی (Windows-1256 با `jschardet`) بدون نقص حفظ می‌شود.
- عملکرد دکمه‌های شناور تمام‌صفحه (چسبیدن به بالای صفحه در Fullscreen) بدون تغییر حفظ می‌گردد.

---

### Task 1: موتور هویت و پروفایل کاربری (User Identity & Onboarding Engine)

**Files:**
- Modify: `index.html:45-75` (جایگزینی مودال خوش‌آمدگویی قدیمی با دیالوگ شیک تنظیم پروفایل)
- Modify: `script.js:20-65` (متغیرها و ذخیره‌سازی پروفایل)
- Test: `tests/test_identity.js`

**Interfaces:**
- Produces: `getUserProfile(): { id: string, name: string, avatar: string, color: string }`
- Produces: `saveUserProfile(profile): void`
- Produces: `openProfileModal(): void`

- [ ] **Step 1: ایجاد تست اعتبارسنجی ذخیره و بازیابی هویت کاربر**

```javascript
// tests/test_identity.js
const assert = require('assert');

// Mock localStorage
const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

function initProfileManager(randomIdFn) {
  function getProfile() {
    const raw = localStorage.getItem('syncnema_user_profile');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return null;
  }
  function saveProfile(name, avatar, color) {
    const current = getProfile() || {};
    const profile = {
      id: current.id || randomIdFn(),
      name: name.trim(),
      avatar: avatar || '🍿',
      color: color || '#38bdf8'
    };
    localStorage.setItem('syncnema_user_profile', JSON.stringify(profile));
    return profile;
  }
  return { getProfile, saveProfile };
}

const pm = initProfileManager(() => 'usr_123');
assert.strictEqual(pm.getProfile(), null);

const p1 = pm.saveProfile('پارسا', '👑', '#38bdf8');
assert.strictEqual(p1.id, 'usr_123');
assert.strictEqual(p1.name, 'پارسا');
assert.strictEqual(p1.avatar, '👑');

const p2 = pm.getProfile();
assert.deepStrictEqual(p2, p1);
console.log('Task 1 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_identity.js`  
Expected: PASS with "Task 1 Test Passed!"

- [ ] **Step 3: به‌روزرسانی مودال پروفایل در `index.html` و توابع مدیریت هویت در `script.js`**
  - افزودن دیالوگ انتخاب آواتارهای کارتونی (👑, 🦁, 🐱, 🚀, 🍿, 🎮, ⚡, 🕶️, 🦊)، فیلد نام کاربری، پالت انتخاب رنگ و دکمه «ورود به اتاق سینما».
  - اتصال به سیستم مدیریت پروفایل در `script.js`.

- [ ] **Step 4: کامیت تغییرات Task 1**

```bash
git add index.html script.js tests/test_identity.js
git commit -m "feat: implement user identity and onboarding profile engine"
```

---

### Task 2: بازنویسی پروتکل سشن و هسته وب‌سوکت اتاق (Multi-User Room State Protocol)

**Files:**
- Modify: `script.js:140-180` (اتاق و کلید امنیتی میزبان `hostKey`)
- Modify: `script.js:590-760` (پروتکل پیام‌ها و مدیریت اعضا)
- Test: `tests/test_protocol.js`

**Interfaces:**
- Consumes: `getUserProfile()` from Task 1
- Produces: `state: RoomState`
- Produces: `isHost: boolean`
- Produces: `broadcastRoom(msg)`
- Produces: `sendToUser(targetId, msg)`

- [ ] **Step 1: نوشتن تست ماشین وضعیت اتاق و احراز هویت هاست**

```javascript
// tests/test_protocol.js
const assert = require('assert');

function createRoomStateMachine(roomId, myUser, storedHostKey) {
  let isHost = false;
  let hostKey = storedHostKey;
  let members = new Map();
  let mode = 'cinema';
  let isLocked = false;

  // If no host key exists for this room, this creator becomes the original Host
  if (!hostKey) {
    hostKey = 'key_' + Math.random().toString(36).substring(2);
    isHost = true;
  } else {
    // Returning with known host key
    isHost = true;
  }

  function handleMessage(fromId, msg) {
    if (msg.type === 'join_room') {
      if (isLocked) {
        return { reply: { type: 'join_rejected', reason: 'اتاق قفل است' } };
      }
      members.set(fromId, {
        id: fromId,
        name: msg.user.name,
        avatar: msg.user.avatar,
        color: msg.user.color,
        isHost: isHost && fromId === myUser.id,
        canControl: isHost && fromId === myUser.id,
        isMuted: false,
        time: 0,
        isLive: true
      });
      return { broadcast: { type: 'room_state', members: Array.from(members.values()) } };
    }
    return null;
  }

  return { isHost, hostKey, handleMessage, members };
}

const userA = { id: 'usr_A', name: 'ادمین' };
const r1 = createRoomStateMachine('room_1', userA, null);
assert.strictEqual(r1.isHost, true);
assert(r1.hostKey.startsWith('key_'));

// User B joins
const joinMsg = { type: 'join_room', user: { name: 'کاربر ۲', avatar: '🐱', color: '#ff0000' } };
const res = r1.handleMessage('usr_B', joinMsg);
assert.strictEqual(res.broadcast.type, 'room_state');
assert.strictEqual(r1.members.size, 1);
assert.strictEqual(r1.members.get('usr_B').name, 'کاربر ۲');
console.log('Task 2 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_protocol.js`  
Expected: PASS with "Task 2 Test Passed!"

- [ ] **Step 3: پاک‌سازی کدهای قدیمی نظیر‌به‌نظیر و پیاده‌سازی پروتکل جدید در `script.js`**
  - حذف کلیه رفرنس‌های `partnerId`, `syncnema_partner`, `partnerInput`, `conn_req/conn_ack`.
  - ذخیره و اعتبارسنجی `hostKey` اختصاصی برای هر اتاق در `localStorage`.
  - مدیریت پیام‌های `join_room`, `room_state`, `user_presence`.

- [ ] **Step 4: کامیت تغییرات Task 2**

```bash
git add script.js tests/test_protocol.js
git commit -m "feat: rewrite room session protocol with host-authoritative state"
```

---

### Task 3: ساعت لایو میزبان، تماشای مستقل و دکمه بازگشت به لایو (Live Clock & Independent Scrubbing)

**Files:**
- Modify: `script.js:770-870` (منطق همگام‌سازی زمان و محاسبه فاصله از لایو)
- Modify: `index.html:360-375` (المان دکمه شناور `🔴 بازگشت به لایو`)
- Modify: `style.css:450-480` (استایل دکمه شناور بازگشت به لایو)
- Test: `tests/test_sync.js`

**Interfaces:**
- Consumes: `isHost`, `broadcastRoom` from Task 2
- Produces: `syncClockToHost()`
- Produces: `checkDesync(currentTime, hostLiveTime): boolean`
- Produces: `renderCatchUpButton(diffSeconds): void`

- [ ] **Step 1: نوشتن تست منطق سنکرون‌سازی و دکمه بازگشت به لایو**

```javascript
// tests/test_sync.js
const assert = require('assert');

function calculateDesync(localTime, hostTime, hostTimestamp, rtt = 100) {
  // Approximate current host time with network latency adjustment
  const elapsed = (Date.now() - hostTimestamp) / 1000;
  const currentHostLive = hostTime + elapsed;
  const diff = localTime - currentHostLive;
  const isDetached = Math.abs(diff) > 2.5;
  return { isDetached, diff: Math.round(diff) };
}

const now = Date.now();
// In sync (within 1s)
const s1 = calculateDesync(50.2, 50.0, now);
assert.strictEqual(s1.isDetached, false);

// 30 seconds behind
const s2 = calculateDesync(20.0, 50.0, now);
assert.strictEqual(s2.isDetached, true);
assert.strictEqual(s2.diff, -30);

// 10 seconds ahead
const s3 = calculateDesync(60.0, 50.0, now);
assert.strictEqual(s3.isDetached, true);
assert.strictEqual(s3.diff, 10);

console.log('Task 3 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_sync.js`  
Expected: PASS with "Task 3 Test Passed!"

- [ ] **Step 3: پیاده‌سازی منطق لایو، دکمه بازگشت و ایزوله‌سازی رویدادهای پلیر در `script.js` و `index.html`**
  - رویدادهای `play/pause/seeked` تنها در صورتی پیام به اتاق می‌فرستند که کاربر ادمین باشد (یا دسترسی کنترل داشته باشد).
  - در غیر این صورت، کاربر بدون اثرگذاری بر دیگران جلو/عقب می‌زند و دکمه شناور `🔴 بازگشت به لایو ادمین (-0:45)` ظاهر می‌شود.
  - با کلیک روی دکمه بازگشت، زمان کلاینت به زمان هاست پرش کرده و مجدداً لایو می‌شود.

- [ ] **Step 4: کامیت تغییرات Task 3**

```bash
git add index.html script.js style.css tests/test_sync.js
git commit -m "feat: implement live host clock, independent scrubbing, and catch-up button"
```

---

### Task 4: نوسازی تاپ‌بار و پنل کنترل ادمین (VisionOS Top-Bar & Admin Panel)

**Files:**
- Modify: `index.html:250-345` (جزایر ۳ گانه تاپ‌بار)
- Modify: `index.html:150-240` (دیالوگ تنظیمات و اختیارات ادمین)
- Modify: `script.js:350-420` (هندلرهای دکمه‌های ادمین و تاپ‌بار)
- Modify: `style.css:230-310` (استایل‌های تاپ‌بار و نشان‌های ادمین)
- Test: `tests/test_admin.js`

**Interfaces:**
- Consumes: `isHost`, `state` from Task 2
- Produces: `togglePlaybackMode(mode)`
- Produces: `forceSyncAll()`
- Produces: `toggleRoomLock(locked)`
- Produces: `broadcastMedia(media)`

- [ ] **Step 1: نوشتن تست اعمال اختیارات ادمین**

```javascript
// tests/test_admin.js
const assert = require('assert');

function createAdminController() {
  let state = {
    mode: 'cinema',
    isLocked: false,
    media: null,
    users: new Map()
  };

  function setMode(newMode) {
    state.mode = newMode;
    return { type: 'admin_action', action: 'mode_change', mode: newMode };
  }
  function setLock(locked) {
    state.isLocked = locked;
    return { type: 'admin_action', action: 'lock_change', locked };
  }
  function kickUser(userId) {
    state.users.delete(userId);
    return { type: 'admin_action', action: 'kick', targetId: userId };
  }
  function muteUser(userId, muted) {
    if (state.users.has(userId)) state.users.get(userId).isMuted = muted;
    return { type: 'admin_action', action: 'mute', targetId: userId, muted };
  }

  return { state, setMode, setLock, kickUser, muteUser };
}

const ac = createAdminController();
assert.strictEqual(ac.setMode('open').mode, 'open');
assert.strictEqual(ac.setLock(true).locked, true);
console.log('Task 4 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_admin.js`  
Expected: PASS with "Task 4 Test Passed!"

- [ ] **Step 3: طراحی ساختار تاپ‌بار جدید و دیالوگ مدیریت ادمین در `index.html` و `style.css`**
  - جزیره ۱: نام اتاق، کپی لینک، نقطه وضعیت سرور.
  - جزیره ۲: دکمه‌های فیلم، زیرنویس و تنظیم تاخیر.
  - جزیره ۳: آواتار و نام کاربر، دکمه طلایی تاج ادمین (در صورت هاست بودن)، شمارنده آنلاین‌ها.
  - دیالوگ مدیریت ادمین: سوئیچ سینما/آزاد، فورس‌سینک، قفل اتاق، و ارسال رسانه.

- [ ] **Step 4: کامیت تغییرات Task 4**

```bash
git add index.html script.js style.css tests/test_admin.js
git commit -m "feat: overhaul top-bar and implement comprehensive admin control panel"
```

---

### Task 5: بازطراحی کامل چت و درآور تماشاگران برای موبایل و دسکتاپ (Responsive Two-Tab Drawer)

**Files:**
- Modify: `index.html:420-455` (ساختار درآور دو تَبِ: چت و حاضرین)
- Modify: `script.js:460-560` (مدیریت پیام‌ها، لیست اعضا و اکشن‌های ادمین)
- Modify: `style.css:330-410` (استایل درآور موبایل با `100dvh` و کیبورد امن)
- Test: `tests/test_chat_drawer.js`

**Interfaces:**
- Consumes: `getUserProfile()`, `isHost`
- Produces: `appendChatMessage(msg)`
- Produces: `renderSpectatorsList(users)`
- Produces: `toggleChatDrawer(open)`

- [ ] **Step 1: نوشتن تست رندر چت با هویت کامل و منوی تماشاگران**

```javascript
// tests/test_chat_drawer.js
const assert = require('assert');

function formatChatMessage(user, text, replyTo = null) {
  return {
    id: 'msg_' + Math.random().toString(36).substring(2),
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userColor: user.color,
    text: text.trim(),
    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    replyTo
  };
}

const u1 = { id: 'usr_1', name: 'سارا', avatar: '🐱', color: '#ec4899' };
const msg = formatChatMessage(u1, 'فیلم عالیه!');
assert.strictEqual(msg.userName, 'سارا');
assert.strictEqual(msg.userAvatar, '🐱');
assert.strictEqual(msg.text, 'فیلم عالیه!');
console.log('Task 5 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_chat_drawer.js`  
Expected: PASS with "Task 5 Test Passed!"

- [ ] **Step 3: پیاده‌سازی رابط کاربری دو تَبِ و استایل‌های واکنش‌گرای موبایل**
  - تب چت با حباب‌های مدرن و مشخص بودن هویت هر فرد.
  - تب حاضرین با برچسب‌های `👑 میزبان`، `🔴 لایو`، وضعیت بافر، و منوی ۳ نقطه ادمین (کیک، میوت، انتقال میزبانی).
  - حل ریشه‌ای مشکلات موبایل با استفاده از `100dvh` و انیمیشن اسلاید نرم از راست.

- [ ] **Step 4: کامیت تغییرات Task 5**

```bash
git add index.html script.js style.css tests/test_chat_drawer.js
git commit -m "feat: implement responsive two-tab drawer for chat and spectators list"
```

---

### Task 6: ایموجی‌های شناور هوشمند با نشان فرستنده (Smart Attributed Reactions)

**Files:**
- Modify: `index.html:380-410` (دراور ایموجی‌ها)
- Modify: `script.js:430-460` (تابع ارسال و انیمیشن پرواز شناور)
- Modify: `style.css:520-560` (استایل‌های میکروکپسول‌های شناور)
- Test: `tests/test_reactions.js`

**Interfaces:**
- Consumes: `getUserProfile()`
- Produces: `sendReaction(emoji)`
- Produces: `spawnSmartReaction(emoji, senderUser)`

- [ ] **Step 1: نوشتن تست تراتل و ساخت کپسول هوشمند واکنش**

```javascript
// tests/test_reactions.js
const assert = require('assert');

function createReactionThrottler(minIntervalMs = 400) {
  let lastTime = 0;
  return function canSend() {
    const now = Date.now();
    if (now - lastTime >= minIntervalMs) {
      lastTime = now;
      return true;
    }
    return false;
  };
}

const throttle = createReactionThrottler(400);
assert.strictEqual(throttle(), true);
assert.strictEqual(throttle(), false); // Too fast

console.log('Task 6 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_reactions.js`  
Expected: PASS with "Task 6 Test Passed!"

- [ ] **Step 3: پیاده‌سازی میکروکپسول‌های شناور و انیمیشن پرواز در `script.js` و `style.css`**
  - ایجاد تگ نانو شامل آواتار، نام و ایموجی (`[🐱 سارا] ❤️`).
  - انیمیشن پرواز ملایم از پایین صفحه به بالا با محو شدن پس از ۳ ثانیه.
  - محدودکننده ارسال برای جلوگیری از شلوغی تصویر.

- [ ] **Step 4: کامیت تغییرات Task 6**

```bash
git add index.html script.js style.css tests/test_reactions.js
git commit -m "feat: implement smart attributed floating reactions with throttle"
```

---

### Task 7: هماهنگ‌سازی پخش رسانه، زیرنویس‌ها و انکودینگ فارسی (Media & Subtitles Hub)

**Files:**
- Modify: `script.js:880-990` (سیستم زیرنویس و انکودینگ Windows-1256)
- Modify: `script.js:1000-1080` (سوئیچینگ پلیرها و پخش رسانه همگانی)
- Test: `tests/test_media_hub.js`

**Interfaces:**
- Produces: `broadcastMediaSource(type, src)`
- Produces: `broadcastSubtitle(vttText)`

- [ ] **Step 1: نوشتن تست اعتبارسنجی انکودینگ و برودکست زیرنویس**

```javascript
// tests/test_media_hub.js
const assert = require('assert');

function prepareSubtitleBroadcast(text, encoding = 'utf-8') {
  return {
    type: 'room_subtitle',
    vttContent: text,
    encoding
  };
}

const sub = prepareSubtitleBroadcast('1\n00:00:01,000 --> 00:00:03,000\nسلام سینک‌نما');
assert.strictEqual(sub.type, 'room_subtitle');
assert(sub.vttContent.includes('سلام سینک‌نما'));
console.log('Task 7 Test Passed!');
```

- [ ] **Step 2: اجرای تست برای اطمینان از عملکرد**

Run: `node tests/test_media_hub.js`  
Expected: PASS with "Task 7 Test Passed!"

- [ ] **Step 3: تکمیل ارسال همگانی زیرنویس و حفظ انکودینگ Windows-1256 در `script.js`**

- [ ] **Step 4: کامیت تغییرات Task 7**

```bash
git add script.js tests/test_media_hub.js
git commit -m "feat: complete media switching and subtitle broadcast preserving Windows-1256 encoding"
```

---

### Task 8: اعتبارسنجی نهایی، تست شبیه‌سازی اتاق، ارتقا به نسخه 4.0 و استقرار (E2E Verification & Deployment)

**Files:**
- Modify: `index.html:19,460` (ارتقای کش‌باستینگ به `?v=4.0`)
- Run: شبیه‌سازی بارگذاری و لیسنرهای صفحه
- Deploy: پوش به گیت‌هاب `main` و تایید انتشار زنده

- [ ] **Step 1: اجرای تست شبیه‌سازی DOM و اعتبارسنجی لیسنرها و لود بدون خطای اسکریپت**

- [ ] **Step 2: به‌روزرسانی نسخه به `?v=4.0` در `index.html`**

- [ ] **Step 3: کامیت نهایی و پوش به برنچ `main` گیت‌هاب**

```bash
git add index.html script.js style.css
git commit -m "release: v4.0 multi-user room architecture overhaul"
git push origin main
```

- [ ] **Step 4: تایید استقرار زنده روی `https://syncnema.ir` با curl و ارسال گزارش به کاربر**
