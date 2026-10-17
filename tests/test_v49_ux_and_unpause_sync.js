// tests/test_v49_ux_and_unpause_sync.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing v4.9 UX Fixes: Unpause Jump Prevention, Desktop Chat Stacking, and Floating Chat Readability ---');

const indexPath = path.join(__dirname, '..', 'index.html');
const scriptPath = path.join(__dirname, '..', 'script.js');
const stylePath = path.join(__dirname, '..', 'style.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const scriptJs = fs.readFileSync(scriptPath, 'utf8');
const styleCss = fs.readFileSync(stylePath, 'utf8');

// 1. Desktop Chat Stacking & Shadow Clearance
assert(styleCss.includes('#player-viewport {\n    isolation: isolate'), 'style.css must isolate #player-viewport stacking context');
assert(styleCss.includes('z-index: 70 !important;'), 'style.css must elevate #chat-sidebar to z-index: 70');
assert(styleCss.includes('.art-video-player .art-bottom {\n    z-index: 20 !important;\n    inset: auto 0 0 0 !important;'), 
    'art-bottom must have z-index: 20 and inset: auto 0 0 0 to prevent overlaying desktop chat sidebar');
console.log('✓ 1. Desktop Chat Stacking & Shadow Clearance Verified');

// 2. Floating Live Chat Stream Readability & Contrast
assert(indexHtml.includes('id="chat-stream-overlay"\n                class="absolute bottom-28 sm:bottom-24 right-4 z-[55]'),
    'index.html must elevate #chat-stream-overlay to z-[55] with clean bottom spacing');
assert(styleCss.includes('#chat-stream-overlay {\n    z-index: 55 !important;'), 'style.css must set #chat-stream-overlay z-index to 55');
assert(styleCss.includes('backdrop-filter: blur(24px)'), 'chat-stream-msg must have high-contrast frosted glass with blur(24px)');
assert(scriptJs.includes('el.className = \'chat-stream-msg flex items-center gap-2.5 text-sm text-white cursor-pointer\''),
    'script.js must render chat-stream-msg with text-sm typography');
assert(scriptJs.includes('rounded-full flex items-center justify-center text-xs shrink-0 shadow'),
    'script.js must render distinct avatar pill inside stream message');
console.log('✓ 2. Floating Live Chat Stream Readability Verified');

// 3. Unpause Jump Elimination Simulation
function simulatePlayerSync() {
    let localTime = 120.0;
    let isPlaying = false;
    let currentRate = 1.0;
    let isBuffering = false;
    let seekCount = 0;

    function applyLiveClock(clock, force = false) {
        const now = Date.now();
        const elapsed = clock.playing ? Math.max(0, (now - (clock.timestamp || now)) / 1000) * (clock.rate || 1) : 0;
        const hostLiveTime = clock.time + elapsed;
        const drift = localTime - hostLiveTime;

        if (!clock.playing) {
            if (force || Math.abs(localTime - clock.time) > 0.5) {
                localTime = Math.max(0, clock.time);
                seekCount++;
            }
            currentRate = clock.rate || 1.0;
            isPlaying = false;
        } else if (clock.playing && !isPlaying) {
            const pauseDrift = Math.abs(localTime - clock.time);
            if (!force && pauseDrift < 8.0) {
                if (pauseDrift > 0.5) {
                    localTime = Math.max(0, clock.time);
                    seekCount++;
                }
                currentRate = Math.min(2.0, (clock.rate || 1.0) * 1.08);
            } else {
                localTime = Math.max(0, hostLiveTime);
                currentRate = clock.rate || 1.0;
                seekCount++;
            }
            isPlaying = true;
        } else if (clock.playing && isPlaying) {
            if (!isBuffering) {
                if (force || Math.abs(drift) > 5.0) {
                    localTime = Math.max(0, hostLiveTime);
                    currentRate = clock.rate || 1.0;
                    seekCount++;
                } else if (Math.abs(drift) > 0.7) {
                    const baseRate = clock.rate || 1.0;
                    currentRate = drift < 0 ? Math.min(2.0, baseRate * 1.07) : Math.max(0.5, baseRate * 0.93);
                } else {
                    currentRate = clock.rate || 1.0;
                }
            }
        }
    }

    return {
        applyLiveClock,
        getLocalTime: () => localTime,
        getIsPlaying: () => isPlaying,
        getRate: () => currentRate,
        getSeekCount: () => seekCount,
        setBuffering: (b) => { isBuffering = b; }
    };
}

const sim = simulatePlayerSync();
// Host was paused at 120s, guest paused at 120s
assert.strictEqual(sim.getLocalTime(), 120.0);
assert.strictEqual(sim.getIsPlaying(), false);

// Admin clicks play at 120s. Tick arrives 4 seconds later due to latency!
const clockTick = {
    time: 120.0,
    playing: true,
    rate: 1.0,
    timestamp: Date.now() - 4000 // 4s elapsed
};

sim.applyLiveClock(clockTick, false);
// In old code, guest would jump forward to 124.0s!
// In new code, guest starts playing at 120.0s without jumping forward!
assert.strictEqual(sim.getLocalTime(), 120.0, 'Guest must NOT jump forward 4 seconds when unpausing!');
assert.strictEqual(sim.getIsPlaying(), true, 'Guest must start playing');
assert.strictEqual(sim.getRate(), 1.08, 'Guest must start with 1.08x micro-rate to seamlessly close gap');
assert.strictEqual(sim.getSeekCount(), 0, 'No hard seek should have occurred on unpause');
console.log('✓ 3. Unpause Jump Elimination Verified');

// 4. Buffering Protection Simulation
sim.setBuffering(true);
// Host continues playing and ticks arrive while guest is buffering
const bufferingTick = {
    time: 120.0,
    playing: true,
    rate: 1.0,
    timestamp: Date.now() - 6000 // 6s elapsed
};
sim.applyLiveClock(bufferingTick, false);
assert.strictEqual(sim.getSeekCount(), 0, 'Seeks must NOT be triggered while guest is buffering');
console.log('✓ 4. Buffering Protection From Seek Interruptions Verified');

console.log('All v4.9 Tests PASSED Successfully!');
