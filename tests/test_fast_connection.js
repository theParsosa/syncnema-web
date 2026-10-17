// tests/test_fast_connection.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

// 1. Verify YouTube API is NOT statically loaded in HTML (which hangs in regions with filtered IPs)
assert(!html.includes('src="https://www.youtube.com/iframe_api"'), 'index.html must not statically load YouTube API as it causes 5-10m hangs in filtered networks');

// 2. Verify script.js does NOT delay initialization behind window "load" event
assert(!script.includes("window.addEventListener('load'"), 'script.js must not wait for window.onload; it should initialize on DOMContentLoaded');

// 3. Verify DOMContentLoaded or immediate execution is used
assert(script.includes('DOMContentLoaded'), 'script.js must use DOMContentLoaded for instant startup');

// 4. Verify YouTube script is loaded on demand when needed
assert(script.includes("document.createElement('script')") || script.includes('yt-iframe-api'), 'script.js must load YouTube API on demand');

// 5. Verify WebSocket connection timeout safeguard exists
assert(script.includes('WebSocket.CONNECTING') && (script.includes('connTimer') || script.includes('connectionTimer') || script.includes('timed out')), 'script.js must have a connection timeout safeguard to prevent hanging connections');

console.log('Fast Connection & Instant Startup Tests Passed!');
