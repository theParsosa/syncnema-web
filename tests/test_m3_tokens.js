// tests/test_m3_tokens.js
const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

// Check that M3 tokens are defined
assert(css.includes('--md-sys-color-surface:'), 'Missing --md-sys-color-surface in style.css');
assert(css.includes('--md-sys-color-surface-container:'), 'Missing --md-sys-color-surface-container');
assert(css.includes('--md-sys-color-surface-container-high:'), 'Missing --md-sys-color-surface-container-high');
assert(css.includes('.m3-surface-container'), 'Missing .m3-surface-container class');
assert(css.includes('.m3-pill-btn'), 'Missing .m3-pill-btn class');

console.log('Task 1 Test Passed: M3 tokens verified!');
