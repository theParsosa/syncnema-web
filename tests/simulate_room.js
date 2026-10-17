// tests/simulate_room.js
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('/Users/parsosa/Downloads/syncnema/index.html', 'utf8');
const script = fs.readFileSync('/Users/parsosa/Downloads/syncnema/script.js', 'utf8');

// 1. Extract all $('...') calls from script.js
const idMatches = [...script.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = Array.from(new Set(idMatches));

console.log(`Checking ${uniqueIds.length} unique DOM element IDs used in script.js...`);

const missing = [];
uniqueIds.forEach(id => {
  // Check if id exists in HTML
  const regex = new RegExp(`id=["']${id}["']`);
  if (!regex.test(html)) {
    // Check if it's dynamically created or optional
    missing.push(id);
  }
});

console.log('Missing IDs:', missing);
// Ensure critical IDs exist
const criticalIds = [
  'profile-modal', 'profile-name-input', 'profile-avatar-preview', 'save-profile-btn',
  'admin-modal', 'admin-panel-trigger', 'close-admin-modal', 'admin-mode-cinema', 'admin-mode-open', 'admin-force-sync-btn', 'admin-lock-toggle-btn',
  'catch-up-btn', 'catch-up-text',
  'user-profile-btn', 'user-avatar-display', 'user-name-display',
  'spectators-trigger-btn', 'spectators-pane', 'spectators-list',
  'chat-sidebar', 'chat-pane', 'chat-messages', 'chat-input', 'chat-send', 'emoji-btn', 'reply-preview',
  'my-video', 'youtube-player-container', 'youtube-player', 'cinema-container',
  'playback-status-badge', 'reaction-area', 'reaction-toggle-btn', 'reaction-drawer',
  'video-modal', 'video-modal-trigger', 'sub-modal', 'sub-modal-trigger',
  'tutorial-modal', 'tutorial-btn', 'tutorial-tooltip', 'donate-modal', 'donate-trigger-btn-mobile'
];

criticalIds.forEach(id => {
  assert(html.includes(`id="${id}"`), `Critical element id="${id}" missing from index.html!`);
});

console.log('All critical DOM elements verified in index.html!');
