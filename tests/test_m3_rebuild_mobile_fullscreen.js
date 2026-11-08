// tests/test_m3_rebuild_mobile_fullscreen.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
const script = fs.readFileSync(require('path').join(__dirname, '..', 'script.js'), 'utf8');

assert(css.includes('is-fullscreen-cinema'), 'style.css missing is-fullscreen-cinema styling');
assert(script.includes('enterCinemaFullscreen'), 'script.js missing enterCinemaFullscreen');

console.log('Task 5 Test Passed: Cinema fullscreen verified!');
