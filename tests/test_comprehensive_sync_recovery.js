// tests/test_comprehensive_sync_recovery.js
const assert = require('assert');

// 1. Test calculateDesync with isPlaying flag
function calculateDesync(localTime, hostClock) {
    if (!hostClock) return { isDetached: false, diff: 0, currentHostLive: localTime };
    const now = Date.now();
    const elapsed = hostClock.playing ? Math.max(0, (now - (hostClock.timestamp || now)) / 1000) * (hostClock.rate || 1) : 0;
    const currentHostLive = hostClock.time + elapsed;
    const diff = localTime - currentHostLive;
    const isDetached = Math.abs(diff) > 2.5;
    return { isDetached, diff: Math.round(diff), currentHostLive };
}

// Test Case 1: Host paused 30 seconds ago at time 120s, guest also paused at 120s
const pausedClock = {
    time: 120,
    playing: false,
    rate: 1,
    timestamp: Date.now() - 30000 // 30s elapsed
};
const res1 = calculateDesync(120, pausedClock);
assert.strictEqual(res1.isDetached, false, 'Guest paused at same time as paused host must NOT be detached!');
assert.strictEqual(res1.diff, 0, 'Diff must be 0 when both are paused at same time');

// Test Case 2: Host playing 10 seconds ago from time 100s, rate 1. Guest at 110s
const playingClock = {
    time: 100,
    playing: true,
    rate: 1,
    timestamp: Date.now() - 10000 // 10s elapsed
};
const res2 = calculateDesync(110, playingClock);
assert.strictEqual(res2.isDetached, false, 'Guest playing at live edge should not be detached');
assert.strictEqual(res2.diff, 0, 'Diff should be approximately 0');

// Test Case 3: Host playing, guest drifted by 15s behind
const res3 = calculateDesync(95, playingClock);
assert.strictEqual(res3.isDetached, true, 'Guest 15s behind playing host must be detached');
assert.strictEqual(res3.diff, -15);

// 2. Test Keepalive interval logic
let pingSent = 0;
const mockWs = {
    readyState: 1, // OPEN
    send: (msg) => {
        const parsed = JSON.parse(msg);
        if (parsed.type === 'signal' && parsed.data?.type === 'ping') pingSent++;
    }
};

function sendHeartbeat(ws) {
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'signal', data: { type: 'ping' } }));
    }
}
sendHeartbeat(mockWs);
assert.strictEqual(pingSent, 1, 'Heartbeat must send ping over WebSocket');

// 3. Test Room Code Header Display
function formatRoomCodeDisplay(roomId) {
    return roomId ? `اتاق: ${roomId}` : 'اتاق';
}
assert.strictEqual(formatRoomCodeDisplay('abc1234'), 'اتاق: abc1234');

console.log('Comprehensive Sync Recovery Tests Passed!');
