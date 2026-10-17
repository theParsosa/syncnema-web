// tests/test_m3_mobile_bar.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');

assert(html.includes('id="m3-bottom-bar"'), 'index.html missing #m3-bottom-bar');
assert(html.includes('id="m3-chat-fab"'), 'index.html missing #m3-chat-fab');
assert(html.includes('id="m3-media-btn"'), 'index.html missing #m3-media-btn');
assert(html.includes('id="m3-top-chip"'), 'index.html missing #m3-top-chip');
assert(html.includes('id="m3-spectators-btn"'), 'index.html missing #m3-spectators-btn');
assert(html.includes('id="m3-fs-btn"'), 'index.html missing #m3-fs-btn');

console.log('Task 2 Test Passed: Mobile M3 bar verified!');
