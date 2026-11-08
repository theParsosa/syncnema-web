// tests/test_sync_clock_and_drift.js
// Real sync-core.js code under simulated skew / latency (no DOM, no network).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SC = require(path.join(__dirname, '..', 'sync-core.js'));

// deterministic PRNG so the test is reproducible
function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const jitter = (r, base, spread) => base + (r() * 2 - 1) * spread;

// ---- (a) offset estimation with +/-5s skews and jittery RTT -------------------------------
function runEstimation(skewMs, seed, samples, base = 150, spread = 80) {
    const r = rng(seed);
    const est = SC.createClockEstimator();
    let t = 1_000_000; // guest wall clock
    for (let i = 0; i < samples; i++) {
        const t0 = t;
        const up = jitter(r, base, spread), down = jitter(r, base, spread);
        const hostNow = (t0 + up) + skewMs; // host clock = guest clock + skew
        est.addSample(t0, hostNow, t0 + up + down);
        t += i < 5 ? 200 : 15000;
    }
    return { est, err: Math.abs(est.getOffset() - skewMs) };
}
for (const skew of [5000, -5000, 0, 1234]) {
    const errs = [];
    for (let seed = 1; seed <= 200; seed++) errs.push(runEstimation(skew, seed, 5).err);
    errs.sort((a, b) => a - b);
    const p90 = errs[Math.floor(errs.length * 0.90)], p95 = errs[Math.floor(errs.length * 0.95)];
    console.log(`  skew ${skew}ms: 5 samples -> p50 err ${errs[100].toFixed(1)}ms, p90 ${p90.toFixed(1)}ms, p95 ${p95.toFixed(1)}ms`);
    // asymmetric jitter (+/-80ms per leg) limits a 5-sample estimate: typical ~15ms, 95th percentile ~50ms
    assert(errs[100] <= 25, `median offset error must be <=25ms after the burst (skew ${skew}), got ${errs[100]}`);
    assert(p90 <= 50, `p90 offset error must be <=50ms after the burst (skew ${skew}), got ${p90}`);
    assert(p95 <= 60, `p95 offset error must be <=60ms after the burst (skew ${skew}), got ${p95}`);
}
{ // steady state: after the periodic samples fill the window
    const errs = [];
    for (let seed = 1; seed <= 200; seed++) errs.push(runEstimation(5000, seed, 12).err);
    errs.sort((a, b) => a - b);
    assert(errs[190] <= 50, `steady-state p95 error must be <=50ms, got ${errs[190]}`);
}
{ // rtt > 2s discarded, negative rtt discarded, no samples -> offset 0 (old behaviour)
    const est = SC.createClockEstimator();
    assert.strictEqual(est.getOffset(), 0);
    assert.strictEqual(est.addSample(0, 5000, 2500), false, 'rtt 2.5s must be discarded');
    assert.strictEqual(est.addSample(100, 5000, 50), false, 'negative rtt must be discarded');
    assert.strictEqual(est.getOffset(), 0);
    assert.strictEqual(est.addSample(0, 5100, 200), true);
    assert.strictEqual(est.getOffset(), 5000);
    est.reset();
    assert.strictEqual(est.getOffset(), 0, 'reset must clear samples');
    for (let i = 0; i < 20; i++) est.addSample(i * 1000, i * 1000 + 100 + 777, i * 1000 + 200);
    assert.strictEqual(est.count(), 8, 'only the last 8 samples are kept');
}
{ // a single spike-RTT outlier must not move the estimate (lowest-RTT samples win)
    const est = SC.createClockEstimator();
    [100, 110, 120].forEach((rtt, i) => est.addSample(i * 1000, i * 1000 + rtt / 2 + 3000, i * 1000 + rtt));
    est.addSample(9000, 9000 + 1900 + 3000 + 1500, 9000 + 1900); // asymmetric 1.9s sample
    assert(Math.abs(est.getOffset() - 3000) <= 2, 'outlier with high RTT must be ignored');
}

// ---- (b) stale / out-of-order clocks ------------------------------------------------------
{
    const gate = SC.createClockGate();
    assert(gate.accept('host', 10));
    assert(gate.accept('host', 11));
    assert(!gate.accept('host', 11), 'duplicate seq ignored');
    assert(!gate.accept('host', 9), 'older seq ignored');
    assert(gate.accept('host', 12));
    assert(gate.accept('host', undefined), 'old clients without seq keep working');
    assert(gate.accept('other', 1), 'seq is tracked per sender');
    gate.reset();
    assert(gate.accept('host', 1), 'reset (host change) accepts lower seq again');

    // pause (seq 6) overtaken by a delayed play tick (seq 5): only the pause survives
    const g2 = SC.createClockGate();
    const arrivals = [{ seq: 4, playing: true }, { seq: 6, playing: false }, { seq: 5, playing: true }];
    const applied = arrivals.filter(c => g2.accept('host', c.seq));
    assert.deepStrictEqual(applied.map(c => c.seq), [4, 6]);
    assert.strictEqual(applied[applied.length - 1].playing, false, 'stale tick must not override the newer pause');
}

// ---- (c) drift controller ----------------------------------------------------------------
{
    const S = SC.newDriftState;
    const d = (drift, o = {}) => SC.decideDrift({ drift, currentRate: 1, hostRate: 1, state: S(), now: 10_000, ...o });
    assert.strictEqual(d(0.05).action, 'none');
    assert.strictEqual(d(-0.14).action, 'none');
    assert.strictEqual(d(0.2).action, 'none', 'no correction starts at 0.2s (needs >0.25s)');
    // dead zone resets a leftover nudge to the host rate
    const reset = d(0.05, { currentRate: 0.95 });
    assert.deepStrictEqual([reset.action, reset.rate], ['rate', 1]);
    assert.strictEqual(d(0.05, { currentRate: 1, hostRate: 1.5 }).rate, 1.5);
    // proportional, clamped, correct sign (local ahead -> slow down)
    const ahead = d(0.3);
    assert.strictEqual(ahead.action, 'rate');
    assert(Math.abs(ahead.rate - 0.95) < 1e-9, 'drift 0.3 -> rate 0.95 (clamped at 5%)');
    assert(ahead.state.correcting);
    const behind = d(-1.9, { hostRate: 1.5 });
    assert(Math.abs(behind.rate - 1.5 * 1.05) < 1e-9);
    // hysteresis: keep correcting between 0.10 and 0.25 once started, stop below 0.10
    let st = ahead.state;
    const mid = SC.decideDrift({ drift: 0.18, currentRate: 1, hostRate: 1, state: st, now: 10_000 });
    assert.strictEqual(mid.action, 'rate'); // still correcting at 0.18
    assert(Math.abs(mid.rate - 0.95) < 1e-9, 'still nudging at 0.18s');
    assert.strictEqual(SC.decideDrift({ drift: 0.18, currentRate: 0.95, hostRate: 1, state: st, now: 10_000 }).action, 'none', 'already at the target rate: no redundant set');
    assert(mid.state.correcting);
    const lowEdge = SC.decideDrift({ drift: 0.12, currentRate: 0.94, hostRate: 1, state: mid.state, now: 10_000 });
    assert(lowEdge.state.correcting, 'still correcting at 0.12');
    const stop = SC.decideDrift({ drift: 0.09, currentRate: 0.94, hostRate: 1, state: lowEdge.state, now: 10_000 });
    assert(!stop.state.correcting, 'stops below 0.10');
    assert.deepStrictEqual([stop.action, stop.rate], ['rate', 1], 'and restores host rate');
    // not correcting + 0.18 stays idle (the other side of the hysteresis)
    assert.strictEqual(SC.decideDrift({ drift: 0.18, currentRate: 1, hostRate: 1, state: S(), now: 1 }).action, 'none');
    // seek above 2s, then cooldown 1.5s
    const seek = d(2.5);
    assert.strictEqual(seek.action, 'seek');
    assert.strictEqual(seek.state.lastSeekAt, 10_000);
    const cool = SC.decideDrift({ drift: 3, currentRate: 1, hostRate: 1, state: seek.state, now: 11_000 });
    assert.notStrictEqual(cool.action, 'seek', 'no second hard seek within 1.5s');
    const after = SC.decideDrift({ drift: 3, currentRate: 1, hostRate: 1, state: seek.state, now: 11_500 });
    assert.strictEqual(after.action, 'seek', 'seek allowed again after the cooldown');
    assert.strictEqual(d(2.0).action, 'rate', 'exactly 2s is still a rate correction');
    // buffering: never touch anything
    assert.strictEqual(d(9, { isBuffering: true }).action, 'none');
    assert.strictEqual(d(0.5, { isBuffering: true }).action, 'none');
    // YouTube: seek-only above 1s, never nudges
    assert.strictEqual(d(0.6, { isYouTube: true }).action, 'none');
    assert.strictEqual(d(-1.2, { isYouTube: true }).action, 'seek');
    assert.strictEqual(d(0.4, { isYouTube: true, currentRate: 1 }).action, 'none');
}
{ // planner keeps the legacy branches
    const base = { hostNow: 100_000, now: 100_000, force: false, state: SC.newDriftState() };
    const clk = (o) => ({ time: 50, playing: true, rate: 1, timestamp: 100_000, ...o });
    let p = SC.planClockApply({ ...base, clock: clk({ playing: false }), local: { time: 60, playing: true, rate: 1 } });
    assert(p.pause && p.seek === 50 && p.status === 'paused', 'paused host aligns position and pauses guest');
    p = SC.planClockApply({ ...base, clock: clk(), local: { time: 48, playing: false, rate: 1 } });
    assert(p.play && p.seek === 50 && Math.abs(p.rate - 1.08) < 1e-9, 'guest paused near host: no teleport, 1.08x catch-up');
    p = SC.planClockApply({ ...base, clock: clk(), local: { time: 10, playing: false, rate: 1, isYouTube: false } });
    assert(p.play && p.seek === 50 && p.rate === 1, 'guest paused far away: jump to live');
    p = SC.planClockApply({ ...base, clock: clk(), local: { time: 48, playing: false, rate: 1, isYouTube: true } });
    assert.strictEqual(p.rate, 1, 'YouTube is never nudged');
    p = SC.planClockApply({ ...base, force: true, clock: clk(), local: { time: 50.1, playing: true, rate: 1 } });
    assert.strictEqual(p.seek, 50, 'force_sync always seeks');
    p = SC.planClockApply({ ...base, clock: clk(), local: { time: 10, playing: true, rate: 1, buffering: true } });
    assert(p.seek === null && p.rate === null, 'no correction while buffering');
}

// ---- (d) simulated skewed host, 150ms +/- 80ms latency ---------------------------------------
function simulate({ skew, seed, hostPlayingFor = 10, guestStartOffset = 0.3, useOffset = true, withSeq = true }) {
    const r = rng(seed);
    const SKEW = skew; // host wall clock = true time + SKEW; guest wall clock = true time
    let T = 0; // true time, ms
    const guest = { pos: 20 + guestStartOffset, rate: 1, playing: true };
    const host = { pos: 20, rate: 1, playing: true };
    const est = SC.createClockEstimator();
    const gate = SC.createClockGate();
    let state = SC.newDriftState();
    let latest = null, seq = 1000;
    const queue = []; // {at, fn}
    const net = (fn) => queue.push({ at: T + jitter(r, 150, 80), fn });
    const EPOCH = 1.7e12; // realistic wall-clock magnitude (a 0 timestamp would be falsy)
    const guestWall = () => EPOCH + T;
    const hostWall = () => EPOCH + T + SKEW;
    const guestHostNow = () => guestWall() + (useOffset ? est.getOffset() : 0);
    const step = 20;
    let maxErr = 0, errAt10 = null;
    // 5 quick pings, then host heartbeat every 5s plus an initial tick
    const sendPing = () => {
        const t0 = guestWall();
        net(() => { const hn = hostWall(); net(() => est.addSample(t0, hn, guestWall())); });
    };
    for (let i = 0; i < 5; i++) queue.push({ at: i * 200, fn: sendPing });
    const sendTick = () => {
        const clock = { time: host.pos, playing: host.playing, rate: host.rate, timestamp: hostWall(), seq: ++seq };
        net(() => { if (!withSeq || gate.accept('host', clock.seq)) { latest = clock; } });
    };
    queue.push({ at: 50, fn: sendTick });
    for (let k = 1; k <= 6; k++) queue.push({ at: k * 5000, fn: sendTick });
    for (; T <= hostPlayingFor * 1000; T += step) {
        queue.filter(q => q.at <= T).forEach(q => q.fn());
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i].at <= T) queue.splice(i, 1);
        host.pos += host.rate * step / 1000;
        guest.pos += guest.playing ? guest.rate * step / 1000 : 0;
        if (latest && T % 1000 === 0) {
            const plan = SC.planClockApply({
                clock: latest, hostNow: guestHostNow(), now: T, force: false, state,
                local: { time: guest.pos, playing: guest.playing, rate: guest.rate, buffering: false }
            });
            state = plan.state;
            if (plan.seek !== null) guest.pos = plan.seek;
            if (plan.rate !== null) guest.rate = plan.rate;
        }
            const err = guest.pos - host.pos;
        if (T >= 6000) maxErr = Math.max(maxErr, Math.abs(err));
        if (T === hostPlayingFor * 1000) errAt10 = err;
    }
    return { maxErr, errAt10, offsetErr: Math.abs(est.getOffset() - SKEW) };
}
for (const skew of [5000, -5000, 0]) {
    const results = [];
    for (let seed = 1; seed <= 40; seed++) results.push(simulate({ skew, seed }));
    const worstAt10 = Math.max(...results.map(r => Math.abs(r.errAt10)));
    const worstAfter6 = Math.max(...results.map(r => r.maxErr));
    console.log(`  sim skew ${skew}ms: worst |err| @10s ${(worstAt10 * 1000).toFixed(0)}ms, worst after 6s ${(worstAfter6 * 1000).toFixed(0)}ms`);
    assert(worstAt10 <= 0.2, `guest must be within 200ms after 10s (skew ${skew}), worst ${worstAt10}`);
}
{ // a larger initial offset (0.9s) is only rate-corrected (max 5%/s), so it needs ~18s: document the limit
    const results = [];
    for (let seed = 1; seed <= 40; seed++) results.push(simulate({ skew: -5000, seed, guestStartOffset: 0.9, hostPlayingFor: 25 }));
    const worst = Math.max(...results.map(r => Math.abs(r.errAt10)));
    console.log(`  sim 0.9s initial offset: worst |err| @25s ${(worst * 1000).toFixed(0)}ms`);
    assert(worst <= 0.2, `0.9s initial drift must converge within 25s, worst ${worst}`);
}
{ // control: without offset estimation a 5s skew makes the guest wrong by seconds (the original bug)
    const bad = simulate({ skew: 5000, seed: 3, useOffset: false });
    assert(Math.abs(bad.errAt10) > 1, 'sanity: raw wall-clock comparison is broken by skew');
}

// ---- wiring in script.js / index.html ---------------------------------------------------------
const script = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(html.indexOf('sync-core.js') !== -1 && html.indexOf('sync-core.js') < html.indexOf('script.js?v='), 'sync-core.js must load before script.js');
assert(/function hostNow\(\)/.test(script) && /case 'clock_ping'/.test(script) && /case 'clock_pong'/.test(script));
assert(!/Date\.now\(\) - clock\.timestamp/.test(script), 'applyLiveClock must not compare raw wall clocks');
assert(!/ignoreSyncUntil = Date\.now\(\) \+ 3000/.test(script), 'time-based 3000ms guard must be gone');
assert(!/setTimeout\(\(\) => \{ isProgrammaticSync = false/.test(script), 'time-based programmatic flag reset must be gone');

console.log('Sync clock & drift tests passed!');
