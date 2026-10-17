// tests/test_m3_bottom_sheets.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

assert(html.includes('m3-bottom-sheet'), 'index.html missing m3-bottom-sheet classes');
assert(css.includes('.m3-drag-handle'), 'style.css missing .m3-drag-handle');
assert(css.includes('sheet-open'), 'style.css missing sheet-open animation');

console.log('Task 5 Test Passed: Bottom sheets verified!');
