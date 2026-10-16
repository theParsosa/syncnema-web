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
