// tests/test_live_sync_simulation.js
const assert = require('assert');

// Simulate the Sync Engine logic from script.js
function createClient(id, isHost) {
    let isLiveMode = true;
    let isProgrammaticSync = false;
    let ignoreSyncUntil = 0;
    let latestHostClock = null;
    let currentTime = 0;
    let isPlaying = false;
    let rate = 1;

    function applyLiveClock(clock, force = false) {
        if (isHost) return;
        latestHostClock = clock;

        const now = Date.now();
        const elapsed = Math.max(0, (now - (clock.timestamp || now)) / 1000);
        const hostLiveTime = clock.playing ? clock.time + (elapsed * (clock.rate || 1)) : clock.time;
        const drift = currentTime - hostLiveTime;

        if (force || isLiveMode) {
            isProgrammaticSync = true;
            if (force || Math.abs(drift) > 2.0) {
                ignoreSyncUntil = Date.now() + 2500;
                currentTime = Math.max(0, hostLiveTime);
            }

            if (clock.playing && !isPlaying) {
                ignoreSyncUntil = Date.now() + 2500;
                isPlaying = true;
            } else if (!clock.playing && isPlaying) {
                ignoreSyncUntil = Date.now() + 2500;
                isPlaying = false;
            }

            setTimeout(() => {
                isProgrammaticSync = false;
            }, 50);
        }
    }

    // When video emits event (e.g. seeked or play)
    function onVideoEvent(evtName) {
        if (!isProgrammaticSync && typeof trackInteraction === 'function') {
            trackInteraction();
        }
    }

    function trackInteraction() {
        if (isProgrammaticSync || Date.now() < ignoreSyncUntil) return;
        if (!isHost) {
            isLiveMode = false;
        }
    }

    return {
        id,
        isHost,
        getLiveMode: () => isLiveMode,
        getTime: () => currentTime,
        getIsPlaying: () => isPlaying,
        applyLiveClock,
        onVideoEvent,
        userManualScrub: (newTime) => {
            isProgrammaticSync = false;
            ignoreSyncUntil = 0;
            currentTime = newTime;
            trackInteraction();
        }
    };
}

// Scenario 1: Host plays and Guest receives automated sync ticks
const host = createClient('host_1', true);
const guest = createClient('guest_1', false);

// Host is at 10.0s and playing
const clockTick1 = { time: 10.0, playing: true, rate: 1, timestamp: Date.now() };
guest.applyLiveClock(clockTick1);

// Programmatic seeking causes video element to fire 'seeked' and 'play' events
guest.onVideoEvent('seeked');
guest.onVideoEvent('play');

// Guest MUST stay in isLiveMode!
assert.strictEqual(guest.getLiveMode(), true, 'Guest should not be detached from live sync during automated playback updates');
assert.strictEqual(guest.getTime(), 10.0, 'Guest should seek to host time');
assert.strictEqual(guest.getIsPlaying(), true, 'Guest should be playing');

// Scenario 2: Host pauses
const clockTick2 = { time: 25.0, playing: false, rate: 1, timestamp: Date.now() };
guest.applyLiveClock(clockTick2);
guest.onVideoEvent('seeked');
guest.onVideoEvent('pause');

assert.strictEqual(guest.getLiveMode(), true, 'Guest should still be live when host pauses');
assert.strictEqual(guest.getIsPlaying(), false, 'Guest should pause when host pauses');
assert.strictEqual(guest.getTime(), 25.0, 'Guest should seek to host paused time');

// Scenario 3: Guest manually scrubs
guest.userManualScrub(5.0);
assert.strictEqual(guest.getLiveMode(), false, 'Manual scrubbing by guest should detach to independent viewing');

console.log('Live Sync Multi-Client Simulation Test Passed!');
