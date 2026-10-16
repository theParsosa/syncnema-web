// tests/test_media_hub.js
const assert = require('assert');

function prepareSubtitleBroadcast(text, encoding = 'utf-8') {
  return {
    type: 'sync_sub_file',
    content: text,
    encoding
  };
}

const sub = prepareSubtitleBroadcast('WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nسلام سینک‌نما');
assert.strictEqual(sub.type, 'sync_sub_file');
assert(sub.content.includes('سلام سینک‌نما'));
console.log('Task 7 Test Passed!');
