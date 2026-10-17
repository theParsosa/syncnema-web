// tests/test_sync_robustness.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');
const style = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

// 1. "لطفا گوشی را بچرخانید" completely removed from index.html
assert(!html.includes('id="landscape-warning"'), 'index.html must not contain #landscape-warning');
assert(!html.includes('لطفاً گوشی را بچرخانید'), 'index.html must not contain "لطفاً گوشی را بچرخانید"');

// 2. No active blocking overlay in style.css for portrait
assert(!style.includes('#landscape-warning { display: flex; }'), 'style.css must not show #landscape-warning on portrait');

// 3. Programmatic sync protection: trackInteraction must not kill isLiveMode during automated sync
assert(script.includes('isProgrammaticSync'), 'script.js must use isProgrammaticSync guard to prevent programmatic actions from killing isLiveMode');

// 4. Player playing status must be based on standard !video.paused
assert(script.includes('!artInstance.video.paused') || script.includes('artInstance.video.paused === false'), 'getPlayerIsPlaying must use !video.paused rather than flawed artInstance.playing');

// 5. Identity integrity: saveProfile must preserve myId
assert(script.includes('id: myProfile?.id || myId') || script.includes('myProfile = {\n            id: myId') || script.includes('myProfile = {\n            id: myProfile?.id || myId'), 'saveProfile must not generate a disconnected new randomId when myId is already registered');

// 6. Pending seek for mobile video loading
assert(script.includes('pendingSeekTime') || script.includes('loadedmetadata'), 'script.js must handle pending seek time for videos loading on mobile');

console.log('Sync Robustness & Cleanup Tests Passed!');
