// tests/test_m3_rebuild_font.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('family=Estedad'), 'index.html missing Google Fonts Estedad link');
assert(css.includes("font-family: 'Estedad'"), 'style.css missing Estedad font-family definition');
assert(!html.includes('class="ambient-glow-1"'), 'index.html should not contain legacy ambient glow divs');

console.log('Task 1 Test Passed: Estedad font and foundation verified!');
