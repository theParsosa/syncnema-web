// tests/test_m3_rebuild_mobile_portrait.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('id="m3-mobile-dock"'), 'index.html missing #m3-mobile-dock');
assert(css.includes('@media (max-width: 767px)') || css.includes('@media (max-width: 768px)'), 'style.css missing mobile portrait media query');
assert(html.includes('id="m3-dock-video"'), 'index.html missing #m3-dock-video in mobile dock');
assert(html.includes('id="m3-dock-sub"'), 'index.html missing #m3-dock-sub in mobile dock');

console.log('Task 4 Test Passed: Mobile portrait layout verified!');
