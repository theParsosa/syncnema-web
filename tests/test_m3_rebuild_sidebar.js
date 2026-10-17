// tests/test_m3_rebuild_sidebar.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(html.includes('id="chat-drawer-tabs"'), 'Missing #chat-drawer-tabs');
assert(css.includes('.m3-chat-bubble-me'), 'Missing .m3-chat-bubble-me styling');
assert(css.includes('.m3-chat-bubble-other'), 'Missing .m3-chat-bubble-other styling');
assert(css.includes('var(--md-sys-color-surface-container-low)'), 'Missing M3 surface container low in sidebar');
assert(!css.includes('background: rgba(10, 15, 26, 0.32)'), 'Legacy blurred sidebar still present');
assert(script.includes('m3-chat-bubble-me'), 'script.js missing m3-chat-bubble-me class assignment');

console.log('Task 3 Test Passed: M3 sidebar verified!');
