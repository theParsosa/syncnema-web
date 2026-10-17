// tests/test_chat_dedup.js
const assert = require('assert');

const seenMessageIds = new Set();
let renderedMessages = [];

function addMsg(msg, isMe) {
  renderedMessages.push({ id: msg.id, text: msg.text, isMe });
}

function handleIncomingChatMessage(data, from, myId) {
  const payload = data.data || data;
  if (!payload || !payload.text) return;
  if (payload.userId === myId || from === myId) return;
  if (payload.id && seenMessageIds.has(payload.id)) return;
  if (payload.id) seenMessageIds.add(payload.id);
  addMsg(payload, false);
}

// 1. Sender sends message
const myId = 'usr_me';
const sentMsg = { id: 'msg_1', userId: myId, text: 'سلام!' };
seenMessageIds.add(sentMsg.id);
addMsg(sentMsg, true);

// 2. Server echoes back to sender (should be ignored)
handleIncomingChatMessage({ data: sentMsg }, myId, myId);
assert.strictEqual(renderedMessages.length, 1, 'Sender message was duplicated on echo!');

// 3. Peer sends message once
const peerMsg = { id: 'msg_2', userId: 'usr_peer', text: 'درود' };
handleIncomingChatMessage({ data: peerMsg }, 'usr_peer', myId);
assert.strictEqual(renderedMessages.length, 2);

// 4. Peer message arrives second time via duplicate broadcast (should be ignored)
handleIncomingChatMessage({ data: peerMsg }, 'usr_peer', myId);
assert.strictEqual(renderedMessages.length, 2, 'Peer duplicate message was not deduplicated!');

console.log('Chat deduplication test passed!');
