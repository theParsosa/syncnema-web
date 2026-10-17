// tests/test_m3_chat_stream.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('id="chat-stream-overlay"'), 'Missing #chat-stream-overlay in index.html');
assert(script.includes('renderStreamMessage'), 'script.js missing renderStreamMessage');
assert(css.includes('.chat-stream-msg'), 'style.css missing .chat-stream-msg animation styling');

console.log('Task 4 Test Passed: Chat stream overlay verified!');
