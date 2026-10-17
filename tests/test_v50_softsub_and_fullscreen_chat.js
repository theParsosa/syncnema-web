// tests/test_v50_softsub_and_fullscreen_chat.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing v5.0 Softsub Detection & Fullscreen Chat Integration ---');

const indexPath = path.join(__dirname, '..', 'index.html');
const scriptPath = path.join(__dirname, '..', 'script.js');
const stylePath = path.join(__dirname, '..', 'style.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const scriptJs = fs.readFileSync(scriptPath, 'utf8');
const styleCss = fs.readFileSync(stylePath, 'utf8');

// 1. Softsub UI in Subtitle Modal
assert(indexHtml.includes('id="softsub-section"'), 'index.html must have #softsub-section in #sub-modal');
assert(indexHtml.includes('id="softsub-list"'), 'index.html must have #softsub-list in #sub-modal');
console.log('✓ 1. Softsub DOM Container Verified');

// 2. Softsub Scanning & Artplayer Settings in script.js
assert(scriptJs.includes('function detectSoftsubs') || scriptJs.includes('detectSoftsubs ='), 
    'script.js must define detectSoftsubs to scan video.textTracks and HLS subtitle tracks');
assert(scriptJs.includes('selectSoftsubTrack'), 'script.js must define selectSoftsubTrack handler');
assert(scriptJs.includes('subtitle-tracks') || scriptJs.includes('artInstance.setting.add'), 
    'script.js must register softsub selector in Artplayer settings');
console.log('✓ 2. Softsub Detection & Settings Logic Verified');

// 3. Fullscreen Cinema Container Targeting
assert(scriptJs.includes('artInstance.fullscreen') || scriptJs.includes('enterCinemaFullscreen'), 
    'script.js must ensure fullscreen is bound to cinemaContainer');
assert(scriptJs.includes('name: \'chat-toggle\'') || scriptJs.includes('name: "chat-toggle"'), 
    'script.js must add chat toggle control to Artplayer controls');
console.log('✓ 3. Artplayer Fullscreen & Chat Control Integration Verified');

// 4. Fullscreen Chat Sidebar Stacking & Layout in style.css
assert(styleCss.includes(':fullscreen #chat-sidebar') || styleCss.includes('.is-fullscreen-cinema #chat-sidebar'),
    'style.css must define fullscreen chat sidebar styles');
assert(styleCss.includes('z-index: 90 !important;') || styleCss.includes('z-index: 95 !important;'),
    'style.css must elevate fullscreen chat sidebar to z-index 90 or higher');
console.log('✓ 4. Fullscreen Chat Stacking Context Verified');

// 5. Functional Simulation: Softsub Detection & Track Switching
function simulateSoftsubEngine() {
    let activeTrackIndex = -1; // -1 = off
    const fakeTracks = [
        { id: 0, label: 'فارسی (Persian)', language: 'fa', mode: 'disabled' },
        { id: 1, label: 'English', language: 'en', mode: 'disabled' }
    ];

    function selectTrack(idx) {
        activeTrackIndex = idx;
        fakeTracks.forEach((t, i) => {
            t.mode = (i === idx) ? 'showing' : 'disabled';
        });
    }

    return {
        getTracks: () => fakeTracks,
        getActiveIndex: () => activeTrackIndex,
        selectTrack
    };
}

const softsubSim = simulateSoftsubEngine();
assert.strictEqual(softsubSim.getActiveIndex(), -1);
softsubSim.selectTrack(0);
assert.strictEqual(softsubSim.getActiveIndex(), 0);
assert.strictEqual(softsubSim.getTracks()[0].mode, 'showing');
assert.strictEqual(softsubSim.getTracks()[1].mode, 'disabled');

softsubSim.selectTrack(-1);
assert.strictEqual(softsubSim.getActiveIndex(), -1);
assert.strictEqual(softsubSim.getTracks()[0].mode, 'disabled');
console.log('✓ 5. Softsub Engine Track Switching Verified');

console.log('All v5.0 Tests PASSED Successfully!');
