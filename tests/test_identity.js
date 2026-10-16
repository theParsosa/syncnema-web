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
      name: (name || 'تماشاگر').trim(),
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
assert.strictEqual(p1.color, '#38bdf8');

const p2 = pm.getProfile();
assert.deepStrictEqual(p2, p1);

console.log('Task 1 Test Passed!');
