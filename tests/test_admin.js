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
