// tests/test_m3_desktop_landscape.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

assert(css.includes('@media (orientation: landscape) and (max-height: 500px)'), 'Missing landscape media query in style.css');
assert(css.includes('show-controls'), 'Missing show-controls rule in style.css');
assert(script.includes('revealControlsTemporarily'), 'script.js missing revealControlsTemporarily');

console.log('Task 6 Test Passed: Desktop and landscape verified!');
