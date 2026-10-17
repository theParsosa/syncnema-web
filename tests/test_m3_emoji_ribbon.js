// tests/test_m3_emoji_ribbon.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(html.includes('id="m3-emoji-ribbon"'), 'Missing #m3-emoji-ribbon in index.html');
assert(html.includes('class="m3-quick-emoji'), 'index.html missing .m3-quick-emoji buttons');
assert(html.includes('data-emoji="❤️"'), 'Missing heart emoji in ribbon');
assert(html.includes('data-emoji="😂"'), 'Missing laugh emoji in ribbon');
assert(html.includes('data-emoji="🔥"'), 'Missing fire emoji in ribbon');
assert(script.includes('.m3-quick-emoji'), 'script.js missing .m3-quick-emoji listener');

console.log('Task 3 Test Passed: Emoji ribbon verified!');
