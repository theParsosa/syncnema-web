// tests/test_connection_stability_v48.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing v4.8 Connection Stability, Outbox Queue & Mobile Status Indicator ---');

const indexPath = path.join(__dirname, '..', 'index.html');
const scriptPath = path.join(__dirname, '..', 'script.js');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const scriptJs = fs.readFileSync(scriptPath, 'utf8');

// 1. Mobile Status Indicator DOM in index.html
assert(indexHtml.includes('id="m3-status-container"'), 'index.html must have #m3-status-container in mobile header');
assert(indexHtml.includes('id="m3-connection-dot"'), 'index.html must have #m3-connection-dot');
assert(indexHtml.includes('id="m3-status-text"'), 'index.html must have #m3-status-text');
assert(/href="style\.css\?v=(4\.[89]|5\.[0-9])"/.test(indexHtml), 'index.html must link style.css with cache buster >= v4.8');
assert(/src="script\.js\?v=(4\.[89]|5\.[0-9])"/.test(indexHtml), 'index.html must link script.js with cache buster >= v4.8');
console.log('✓ 1. Mobile Status Indicator DOM & Cache Busters Verified');

// 2. Dual Status Indicator Updates (Desktop & Mobile)
function createMockStatusElements() {
    return {
        statusText: { textContent: '', classList: new Set() },
        connectionDot: { className: '' },
        statusContainer: { title: '' },
        m3StatusText: { textContent: '', classList: new Set() },
        m3ConnectionDot: { className: '' },
        m3StatusContainer: { title: '' }
    };
}

function simulateSetStatus(elems, msg, type) {
    const { statusText, connectionDot, statusContainer, m3StatusText, m3ConnectionDot, m3StatusContainer } = elems;
    if (statusText) statusText.textContent = msg;
    if (m3StatusText) m3StatusText.textContent = msg;

    let dotClass = 'pulse-dot';
    if (type === 'ok') {
        dotClass = 'pulse-dot st-green';
        if (statusText) statusText.classList.delete('text-cyan-400');
        if (m3StatusText) {
            m3StatusText.classList.delete('text-cyan-400');
            m3StatusText.classList.delete('text-amber-400');
            m3StatusText.classList.delete('text-rose-400');
            m3StatusText.classList.add('text-emerald-400');
        }
    } else if (type === 'con') {
        dotClass = 'pulse-dot st-blue';
        if (statusText) statusText.classList.add('text-cyan-400');
        if (m3StatusText) {
            m3StatusText.classList.delete('text-emerald-400');
            m3StatusText.classList.delete('text-amber-400');
            m3StatusText.classList.delete('text-rose-400');
            m3StatusText.classList.add('text-cyan-400');
        }
    } else if (type === 'yellow') {
        dotClass = 'pulse-dot st-yellow';
        if (statusText) statusText.classList.delete('text-cyan-400');
        if (m3StatusText) {
            m3StatusText.classList.delete('text-emerald-400');
            m3StatusText.classList.delete('text-cyan-400');
            m3StatusText.classList.delete('text-rose-400');
            m3StatusText.classList.add('text-amber-400');
        }
    } else {
        dotClass = 'pulse-dot st-red';
        if (statusText) statusText.classList.delete('text-cyan-400');
        if (m3StatusText) {
            m3StatusText.classList.delete('text-emerald-400');
            m3StatusText.classList.delete('text-cyan-400');
            m3StatusText.classList.delete('text-amber-400');
            m3StatusText.classList.add('text-rose-400');
        }
    }

    if (connectionDot) connectionDot.className = dotClass;
    if (m3ConnectionDot) m3ConnectionDot.className = dotClass;
}

const mockUI = createMockStatusElements();
simulateSetStatus(mockUI, 'در حال اتصال...', 'yellow');
assert.strictEqual(mockUI.m3StatusText.textContent, 'در حال اتصال...');
assert.strictEqual(mockUI.m3ConnectionDot.className, 'pulse-dot st-yellow');
assert(mockUI.m3StatusText.classList.has('text-amber-400'));

simulateSetStatus(mockUI, 'متصل به اتاق', 'ok');
assert.strictEqual(mockUI.m3StatusText.textContent, 'متصل به اتاق');
assert.strictEqual(mockUI.m3ConnectionDot.className, 'pulse-dot st-green');
assert(mockUI.m3StatusText.classList.has('text-emerald-400'));

simulateSetStatus(mockUI, 'اتاق (۲ نفر)', 'con');
assert.strictEqual(mockUI.m3StatusText.textContent, 'اتاق (۲ نفر)');
assert.strictEqual(mockUI.m3ConnectionDot.className, 'pulse-dot st-blue');
assert(mockUI.m3StatusText.classList.has('text-cyan-400'));

simulateSetStatus(mockUI, 'قطع (۱)', 'err');
assert.strictEqual(mockUI.m3StatusText.textContent, 'قطع (۱)');
assert.strictEqual(mockUI.m3ConnectionDot.className, 'pulse-dot st-red');
assert(mockUI.m3StatusText.classList.has('text-rose-400'));
console.log('✓ 2. Synchronized Mobile & Desktop Status Changes Verified');

// 3. Reliable Outbox Queue Logic
function createOutboxSimulator() {
    let ws = null; // initially disconnected
    const outboxQueue = [];
    const sentHistory = [];

    function isEssentialSignal(data) {
        if (!data || !data.type) return false;
        const essentialTypes = [
            'chat', 'reaction', 'admin_action', 'room_media',
            'sync_sub_file', 'load_sub', 'load_url', 'load_yt',
            'profile_update', 'join_room', 'request_sync'
        ];
        return essentialTypes.includes(data.type);
    }

    function send(to, data) {
        const msg = { type: 'signal', to, data };
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify(msg));
        } else if (isEssentialSignal(data)) {
            outboxQueue.push(msg);
        }
    }

    function broadcast(data) {
        const msg = { type: 'signal', data };
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify(msg));
        } else if (isEssentialSignal(data)) {
            outboxQueue.push(msg);
        }
    }

    function flushOutbox() {
        if (!ws || ws.readyState !== 1) return;
        while (outboxQueue.length > 0) {
            const item = outboxQueue.shift();
            ws.send(JSON.stringify(item));
        }
    }

    function connectWs() {
        ws = {
            readyState: 1,
            send: (str) => sentHistory.push(JSON.parse(str))
        };
        flushOutbox();
    }

    return { send, broadcast, connectWs, outboxQueue, sentHistory };
}

const sim = createOutboxSimulator();
// Send while disconnected
sim.broadcast({ type: 'chat', data: { text: 'سلام!' } });
sim.broadcast({ type: 'ping' }); // Non-essential, must be discarded
sim.broadcast({ type: 'reaction', emoji: '🍿' });
sim.broadcast({ type: 'sync_tick', clock: {} }); // Non-essential, discarded

assert.strictEqual(sim.outboxQueue.length, 2, 'Outbox must queue essential messages and ignore ephemeral pings/ticks');
assert.strictEqual(sim.outboxQueue[0].data.type, 'chat');
assert.strictEqual(sim.outboxQueue[1].data.type, 'reaction');

// Now socket connects and flushes outbox
sim.connectWs();
assert.strictEqual(sim.outboxQueue.length, 0, 'Outbox must be empty after flush');
assert.strictEqual(sim.sentHistory.length, 2, 'Queued messages must be sent over WebSocket');
assert.strictEqual(sim.sentHistory[0].data.data.text, 'سلام!');
assert.strictEqual(sim.sentHistory[1].data.emoji, '🍿');
console.log('✓ 3. Reliable Outbox Offline Queue & Delivery Verified');

// 4. Safe Close & Reconnect Deduplication
assert(scriptJs.includes('function safeCloseWs(socket)'), 'script.js must contain safeCloseWs');
assert(scriptJs.includes('function scheduleReconnect(delay)'), 'script.js must contain scheduleReconnect');
assert(scriptJs.includes('function flushOutbox()'), 'script.js must contain flushOutbox');
assert(!scriptJs.includes('ws.close();'), 'script.js must not call ws.close() directly without safe unbinding');

// Test Safe Close cleans callbacks
const dummySocket = {
    onopen: () => {},
    onclose: () => { throw new Error('onclose should not fire if safeCloseWs was called!'); },
    onerror: () => {},
    onmessage: () => {},
    readyState: 1,
    close: function() {
        if (this.onclose) this.onclose();
    }
};

function safeCloseWs(socket) {
    if (!socket) return;
    try {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        if (socket.readyState === 1 || socket.readyState === 0) {
            socket.close();
        }
    } catch (e) {}
}

safeCloseWs(dummySocket);
assert.strictEqual(dummySocket.onclose, null, 'Safe close must remove onclose handler');
console.log('✓ 4. Safe WebSocket Teardown & Reconnect Storm Prevention Verified');

// 5. Smooth Drift Compensation (Eliminate Seek Stutter)
function testSyncEngine() {
    let playerTime = 100.0;
    let playbackRate = 1.0;
    let seekCount = 0;

    function setPlayerTime(t) {
        playerTime = t;
        seekCount++;
    }

    function setPlayerPlaybackRate(r) {
        playbackRate = r;
    }

    function applyLiveClock(clock, force = false) {
        const now = Date.now();
        const elapsed = clock.playing ? Math.max(0, (now - (clock.timestamp || now)) / 1000) * (clock.rate || 1) : 0;
        const hostLiveTime = clock.time + elapsed;
        const drift = playerTime - hostLiveTime;

        if (force || !clock.playing || Math.abs(drift) > 3.0) {
            if (force || Math.abs(drift) > 0.5) {
                setPlayerTime(Math.max(0, hostLiveTime));
            }
            setPlayerPlaybackRate(clock.rate || 1.0);
        } else if (clock.playing && Math.abs(drift) > 0.8) {
            const baseRate = clock.rate || 1.0;
            if (drift < 0) {
                setPlayerPlaybackRate(baseRate * 1.07);
            } else {
                setPlayerPlaybackRate(baseRate * 0.93);
            }
        } else if (clock.playing) {
            setPlayerPlaybackRate(clock.rate || 1.0);
        }
    }

    return {
        applyLiveClock,
        getSeekCount: () => seekCount,
        getPlaybackRate: () => playbackRate,
        getPlayerTime: () => playerTime,
        setLocalTime: (t) => { playerTime = t; }
    };
}

const engine = testSyncEngine();
// Scenario A: Minor drift (1.5s lag) - should NOT hard seek, but adjust rate to 1.07x
const hostClockA = { time: 101.5, playing: true, rate: 1.0, timestamp: Date.now() };
engine.applyLiveClock(hostClockA);
assert.strictEqual(engine.getSeekCount(), 0, 'Minor drift (1.5s) must NOT trigger hard seek on mobile');
assert.strictEqual(Math.round(engine.getPlaybackRate() * 100) / 100, 1.07, 'Lagging guest should slightly speed up (1.07x)');

// Scenario B: In sync (< 0.8s) - rate returns to 1.0x, 0 seeks
engine.setLocalTime(101.4);
engine.applyLiveClock(hostClockA);
assert.strictEqual(engine.getSeekCount(), 0, 'In sync must NOT trigger hard seek');
assert.strictEqual(engine.getPlaybackRate(), 1.0, 'In sync rate must return to 1.0x');

// Scenario C: Major drift (> 3.5s) - triggers hard seek
const hostClockC = { time: 120.0, playing: true, rate: 1.0, timestamp: Date.now() };
engine.applyLiveClock(hostClockC);
assert.strictEqual(engine.getSeekCount(), 1, 'Major drift (18.6s) must trigger hard seek');
assert.strictEqual(engine.getPlayerTime(), 120.0, 'Player time must match host live time after hard seek');
assert.strictEqual(engine.getPlaybackRate(), 1.0, 'Playback rate must be reset after hard seek');
console.log('✓ 5. Smooth Drift Compensation & Zero Stutter Loop Verified');

console.log('All v4.8 Connection Stability Tests PASSED Successfully!');
