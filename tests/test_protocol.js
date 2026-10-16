const assert = require('assert');

function createRoomProtocolEngine(roomId, myUser, storedHostKey) {
  let isHost = false;
  let hostKey = storedHostKey;
  let members = new Map();
  let mode = 'cinema';
  let isLocked = false;
  let media = { type: 'empty' };

  // If room has no stored key and this client initiated creation
  if (storedHostKey) {
    isHost = true;
  }

  function becomeHost() {
    isHost = true;
    hostKey = 'hkey_' + Math.random().toString(36).substring(2);
    return hostKey;
  }

  function getRoomState() {
    return {
      roomId,
      hostId: myUser.id,
      mode,
      isLocked,
      media,
      users: Array.from(members.values())
    };
  }

  function handleMessage(fromId, msg) {
    switch (msg.type) {
      case 'join_room': {
        if (isLocked && (!msg.hostKey || msg.hostKey !== hostKey)) {
          return { type: 'join_rejected', to: fromId, reason: 'اتاق توسط میزبان قفل شده است' };
        }
        // If incoming user has valid hostKey, they reclaim Host
        let userIsHost = false;
        if (hostKey && msg.hostKey === hostKey) {
          userIsHost = true;
        } else if (members.size === 0 && !hostKey) {
          userIsHost = true;
          hostKey = msg.hostKey || 'hkey_' + Math.random().toString(36).substring(2);
        }

        members.set(fromId, {
          id: fromId,
          name: msg.user.name,
          avatar: msg.user.avatar,
          color: msg.user.color,
          isHost: userIsHost,
          canControl: userIsHost,
          isMuted: false,
          isBuffering: false,
          time: 0,
          isLive: true
        });

        if (isHost) {
          return { broadcast: { type: 'room_state', state: getRoomState() } };
        }
        return null;
      }

      case 'admin_action': {
        if (msg.action === 'kick' && msg.targetId === myUser.id) {
          return { kicked: true };
        }
        if (msg.action === 'transfer_host') {
          isHost = (msg.newHostId === myUser.id);
          return { newHost: msg.newHostId };
        }
        return null;
      }
    }
    return null;
  }

  return {
    isHost: () => isHost,
    getHostKey: () => hostKey,
    becomeHost,
    handleMessage,
    getRoomState,
    members
  };
}

// Test 1: Creator becomes host
const hostUser = { id: 'usr_host', name: 'پارسا', avatar: '👑', color: '#38bdf8' };
const engine1 = createRoomProtocolEngine('room_test_1', hostUser, null);
const generatedKey = engine1.becomeHost();
assert.strictEqual(engine1.isHost(), true);
assert(generatedKey.startsWith('hkey_'));

// Test 2: Participant joins room
const joinResult = engine1.handleMessage('usr_guest', {
  type: 'join_room',
  user: { name: 'سارا', avatar: '🐱', color: '#ec4899' }
});
assert.strictEqual(joinResult.broadcast.type, 'room_state');
assert.strictEqual(engine1.members.size, 1);
assert.strictEqual(engine1.members.get('usr_guest').name, 'سارا');

// Test 3: Admin transfer
const guestEngine = createRoomProtocolEngine('room_test_1', { id: 'usr_guest', name: 'سارا' }, null);
assert.strictEqual(guestEngine.isHost(), false);
guestEngine.handleMessage('usr_host', { type: 'admin_action', action: 'transfer_host', newHostId: 'usr_guest' });
assert.strictEqual(guestEngine.isHost(), true);

console.log('Task 2 Test Passed!');
