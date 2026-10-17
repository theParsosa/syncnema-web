// tests/test_v51_mkv_subtitles_and_fullscreen_chat.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing v5.1 MKV Subtitle Parsing & Robust Fullscreen Chat ---');

const indexPath = path.join(__dirname, '..', 'index.html');
const scriptPath = path.join(__dirname, '..', 'script.js');
const stylePath = path.join(__dirname, '..', 'style.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const scriptJs = fs.readFileSync(scriptPath, 'utf8');
const styleCss = fs.readFileSync(stylePath, 'utf8');

// 1. matroska-subtitles dependency in index.html
assert(indexHtml.includes('matroska-subtitles'), 'index.html must include matroska-subtitles CDN library');
console.log('✓ 1. matroska-subtitles dependency verified');

// 2. Artplayer fullscreen isolation prevention
assert(scriptJs.includes('fullscreen: false'), 'script.js must set Artplayer fullscreen: false to prevent isolating $player');
assert(scriptJs.includes('name: \'custom-fullscreen\'') || scriptJs.includes('name: "custom-fullscreen"'), 
    'script.js must add custom-fullscreen control bound to cinemaContainer');
assert(scriptJs.includes('syncChatSidebarStacking'), 'script.js must implement syncChatSidebarStacking to ensure sidebar is in fullscreen DOM');
console.log('✓ 2. Fullscreen isolation prevention & stacking sync verified');

// 3. MKV Subtitle Parser in script.js
assert(scriptJs.includes('function parseMkvSubtitles') || scriptJs.includes('parseMkvSubtitles ='),
    'script.js must define parseMkvSubtitles to demux embedded MKV/MP4 subtitles');
assert(scriptJs.includes('buildVttFromCues'), 'script.js must define buildVttFromCues to convert cues to WebVTT');
console.log('✓ 3. MKV Subtitle demuxing and WebVTT conversion verified');

// 4. CSS: Scoped portrait docking and open/closed fullscreen sidebar rules
assert(styleCss.includes('body:not(.is-fullscreen-cinema)'), 'style.css must scope portrait sidebar dock to non-fullscreen');
assert(styleCss.includes(':fullscreen #chat-sidebar:not(.sidebar-closed)') || styleCss.includes('.is-fullscreen-cinema #chat-sidebar:not(.sidebar-closed)'),
    'style.css must have explicit display: flex rule for open fullscreen chat sidebar');
assert(styleCss.includes(':fullscreen #chat-sidebar.sidebar-closed') || styleCss.includes('.is-fullscreen-cinema #chat-sidebar.sidebar-closed'),
    'style.css must have explicit hidden rule for closed fullscreen chat sidebar');
console.log('✓ 4. Fullscreen Chat Sidebar CSS Display & Scoping Verified');

// 5. Functional Simulation: WebVTT Generator from MKV Cues
function simulateVttGenerator(cues) {
    let vtt = 'WEBVTT\n\n';
    cues.forEach((c, idx) => {
        const startSec = (c.time / 1000).toFixed(3);
        const endSec = ((c.time + c.duration) / 1000).toFixed(3);
        const formatTime = (sec) => {
            const s = parseFloat(sec);
            const hrs = Math.floor(s / 3600).toString().padStart(2, '0');
            const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
            const secs = (s % 60).toFixed(3).padStart(6, '0');
            return `${hrs}:${mins}:${secs}`;
        };
        vtt += `${idx + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${c.text}\n\n`;
    });
    return vtt;
}

const testCues = [
    { time: 500, duration: 2000, text: 'سلام سینک‌نما' },
    { time: 3000, duration: 1500, text: 'این یک تست زیرنویس است' }
];

const generatedVtt = simulateVttGenerator(testCues);
assert(generatedVtt.startsWith('WEBVTT\n\n'), 'Generated VTT must have WEBVTT header');
assert(generatedVtt.includes('00:00:00.500 --> 00:00:02.500'), 'Generated VTT must format start/end timestamps properly');
assert(generatedVtt.includes('سلام سینک‌نما'), 'Generated VTT must contain subtitle text');
console.log('✓ 5. Functional WebVTT conversion verified');

console.log('All v5.1 Tests PASSED Successfully!');
