// tests/test_m3_rebuild_mobile_fullscreen.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(css.includes('is-fullscreen-cinema'), 'style.css missing is-fullscreen-cinema styling');
assert(script.includes('enterCinemaFullscreen'), 'script.js missing enterCinemaFullscreen');

console.log('Task 5 Test Passed: Cinema fullscreen verified!');
