// Syncnema sync core: pure, DOM-free playback-sync logic (unit-testable under node).
// Browser: exposes window.SyncCore. Node: module.exports.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.SyncCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    const CFG = {
        // clock-offset estimation
        maxSamples: 8,
        bestSamples: 3,
        maxRtt: 2000,
        // drift controller
        deadZone: 0.15,
        startCorrecting: 0.25,
        stopCorrecting: 0.10,
        seekThreshold: 2,
        ytSeekThreshold: 1,
        maxRateNudge: 0.05,
        rateGain: 0.5,
        seekCooldownMs: 1500,
        // guest paused while host plays: don't teleport if within this many seconds
        resumeWindow: 8,
        resumeRateBoost: 1.08
    };

    // ---- Step 1: guest <-> host clock offset ------------------------------------------
    // offset = hostClock - localClock, so hostNow() = Date.now() + offset.
    function createClockEstimator(opts) {
        const o = Object.assign({}, CFG, opts || {});
        let samples = [];
        return {
            // t0: local send time, hostNow: host's Date.now() at reply, now: local receive time
            addSample(t0, hostNow, now) {
                const rtt = now - t0;
                if (!isFinite(rtt) || !isFinite(hostNow) || rtt < 0 || rtt > o.maxRtt) return false;
                samples.push({ rtt, offset: hostNow + rtt / 2 - now });
                if (samples.length > o.maxSamples) samples.shift();
                return true;
            },
            // median offset of the lowest-RTT samples; 0 (old behaviour) with no samples
            getOffset() {
                if (!samples.length) return 0;
                const best = samples.slice().sort((a, b) => a.rtt - b.rtt).slice(0, o.bestSamples)
                    .map(s => s.offset).sort((a, b) => a - b);
                const m = best.length >> 1;
                return best.length % 2 ? best[m] : (best[m - 1] + best[m]) / 2;
            },
            count() { return samples.length; },
            reset() { samples = []; }
        };
    }

    // ---- Step 2: clock versioning ------------------------------------------------------
    // Ignores a clock whose seq is <= the last accepted one from the same sender.
    // Clocks without seq (old clients) are always accepted.
    function createClockGate() {
        const last = new Map();
        return {
            accept(sender, seq) {
                if (typeof seq !== 'number' || !isFinite(seq)) return true;
                const key = sender || '';
                const prev = last.get(key);
                if (prev !== undefined && seq <= prev) return false;
                last.set(key, seq);
                return true;
            },
            reset() { last.clear(); }
        };
    }

    // ---- Step 3: drift controller ------------------------------------------------------
    function newDriftState() { return { correcting: false, lastSeekAt: -Infinity }; }

    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

    // drift = local - host (seconds; positive = local is ahead).
    // Returns { action: 'none' | 'rate' | 'seek', rate?, state } and never mutates `state`.
    function decideDrift(input) {
        const { drift, currentRate, hostRate, now } = input;
        const state = Object.assign(newDriftState(), input.state);
        const hr = hostRate || 1;
        const cur = currentRate || 1;
        if (input.isBuffering) return { action: 'none', state };

        const ad = Math.abs(drift);
        const seekAt = input.isYouTube ? CFG.ytSeekThreshold : CFG.seekThreshold;
        const resetRate = () => (Math.abs(cur - hr) > 1e-3 ? { action: 'rate', rate: hr } : { action: 'none' });

        if (ad > seekAt && now - state.lastSeekAt >= CFG.seekCooldownMs) {
            return { action: 'seek', rate: hr, state: { correcting: false, lastSeekAt: now } };
        }
        // YouTube only supports discrete rates: seek-only, never nudge.
        if (input.isYouTube) return Object.assign(resetRate(), { state: { ...state, correcting: false } });

        // hysteresis: start above 0.25s, keep going until below 0.10s. Below deadZone (0.15s)
        // while not already correcting is covered by the start threshold: nothing happens.
        const correcting = state.correcting ? ad >= CFG.stopCorrecting : ad > CFG.startCorrecting;
        const next = { ...state, correcting };
        if (!correcting) {
            return Object.assign(resetRate(), { state: next });
        }
        const rate = hr * (1 - clamp(drift * CFG.rateGain, -CFG.maxRateNudge, CFG.maxRateNudge));
        return Math.abs(rate - cur) > 1e-3
            ? { action: 'rate', rate, state: next }
            : { action: 'none', state: next };
    }

    // ---- Guest apply planner (decision half of applyLiveClock) -------------------------
    // clock must already be in the guest's time base: hostLive = clock.time + extrapolated elapsed.
    // local: { time, playing, rate, buffering, isYouTube }
    // Returns { seek, rate, play, pause, status, state }; the caller executes it.
    function planClockApply(input) {
        const { clock, hostNow, local, force, now } = input;
        const state = Object.assign(newDriftState(), input.state);
        const hostRate = clock.rate || 1;
        const elapsed = clock.playing ? Math.max(0, (hostNow - (clock.timestamp || hostNow)) / 1000) * hostRate : 0;
        const hostLive = clock.time + elapsed;
        const plan = { seek: null, rate: null, play: false, pause: false, status: null, state };

        if (!clock.playing) {
            if (force || Math.abs(local.time - clock.time) > 0.5) plan.seek = Math.max(0, clock.time);
            plan.rate = hostRate;
            if (local.playing) { plan.pause = true; plan.status = 'paused'; }
            plan.state = { correcting: false, lastSeekAt: state.lastSeekAt };
        } else if (!local.playing) {
            const pauseDrift = Math.abs(local.time - clock.time);
            if (!force && pauseDrift < CFG.resumeWindow) {
                if (pauseDrift > 0.5) plan.seek = Math.max(0, clock.time);
                // catch up to the live edge without skipping scenes (not on YouTube: discrete rates)
                plan.rate = local.isYouTube ? hostRate : Math.min(2.0, hostRate * CFG.resumeRateBoost);
            } else {
                plan.seek = Math.max(0, hostLive);
                plan.rate = hostRate;
                plan.state = { correcting: false, lastSeekAt: now };
            }
            plan.play = true;
            plan.status = 'playing';
        } else if (!local.buffering) {
            if (force) {
                plan.seek = Math.max(0, hostLive);
                plan.rate = hostRate;
                plan.state = { correcting: false, lastSeekAt: now };
            } else {
                const d = decideDrift({
                    drift: local.time - hostLive, currentRate: local.rate, hostRate,
                    state, now, isYouTube: !!local.isYouTube, isBuffering: false
                });
                plan.state = d.state;
                if (d.action === 'seek') { plan.seek = Math.max(0, hostLive); plan.rate = hostRate; }
                else if (d.action === 'rate') plan.rate = d.rate;
            }
        }
        plan.hostLive = hostLive;
        return plan;
    }

    return { CFG, createClockEstimator, createClockGate, newDriftState, decideDrift, planClockApply };
});
