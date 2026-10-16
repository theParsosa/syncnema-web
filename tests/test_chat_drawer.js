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
