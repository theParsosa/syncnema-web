// tests/test_artplayer_integration.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');
const style = fs.readFileSync('/Users/parsosa/Downloads/syncnema/style.css', 'utf8');

// 1. DOM & Assets
assert(html.includes('artplayer'), 'index.html missing Artplayer.js CDN script');
assert(html.includes('id="artplayer-container"'), 'index.html missing #artplayer-container');
assert(style.includes('.art-video-player'), 'style.css missing .art-video-player styling');
assert(style.includes('Estedad'), 'style.css missing Estedad font for Artplayer');

// 2. Artplayer initialization & theme
assert(script.includes('function initArtPlayer'), 'script.js missing initArtPlayer function');
assert(script.includes('new Artplayer'), 'script.js missing Artplayer constructor call');
assert(script.includes('38bdf8'), 'script.js missing M3 cyan theme (#38bdf8) in Artplayer configuration');

// 3. Unified player control helpers
assert(script.includes('function getPlayerCurrentTime()'), 'script.js missing getPlayerCurrentTime helper');
assert(script.includes('function getPlayerIsPlaying()'), 'script.js missing getPlayerIsPlaying helper');
assert(script.includes('function getPlayerPlaybackRate()'), 'script.js missing getPlayerPlaybackRate helper');
assert(script.includes('function getPlayerDuration()'), 'script.js missing getPlayerDuration helper');
assert(script.includes('function setPlayerTime('), 'script.js missing setPlayerTime helper');
assert(script.includes('function playPlayer()'), 'script.js missing playPlayer helper');
assert(script.includes('function pausePlayer()'), 'script.js missing pausePlayer helper');
assert(script.includes('function setPlayerPlaybackRate('), 'script.js missing setPlayerPlaybackRate helper');

// 4. Unified video loading
assert(script.includes('function loadVideoSource('), 'script.js missing loadVideoSource unified video loader');

// 5. Player switcher handles Artplayer container
assert(script.includes("artContainer.style.display = youtube ? 'none' : 'block'") || script.includes("$('artplayer-container').style.display"), 'switchPlayer must toggle artplayer-container');

// 6. Subtitles and subtitle offset integration
assert(script.includes('artInstance.subtitle') || script.includes('artInstance.subtitleOffset'), 'script.js missing Artplayer subtitle integration');

// 7. Fullscreen integration with auto-orientation
assert(script.includes("artInstance.on('fullscreen'") || script.includes('artInstance.fullscreen'), 'script.js missing Artplayer fullscreen integration with auto-orientation');

// 8. Room sync integration: syncPlayer & sendSync use unified controllers
assert(script.includes('getPlayerCurrentTime()') && script.includes('setPlayerTime('), 'script.js missing unified player time sync');

console.log('Artplayer Integration Test Passed!');
