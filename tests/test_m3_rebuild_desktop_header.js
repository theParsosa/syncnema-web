// tests/test_m3_rebuild_desktop_header.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');

assert(html.includes('id="m3-desktop-header"'), 'index.html missing #m3-desktop-header');
assert(html.includes('id="video-modal-trigger"'), 'Desktop header missing video trigger');
assert(html.includes('id="sub-modal-trigger"'), 'Desktop header missing subtitle trigger');
assert(html.includes('id="spectators-trigger-btn"'), 'Desktop header missing spectators trigger');
assert(!html.includes('class="glass-island pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full relative group"'), 'Legacy separated islands should be replaced');

console.log('Task 2 Test Passed: Unified desktop header verified!');
