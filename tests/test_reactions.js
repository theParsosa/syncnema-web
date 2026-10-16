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
