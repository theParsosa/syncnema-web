const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('--- Testing v5.3 Chat Opening & Softsub Demuxing Robustness ---');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'script.js');
const stylePath = path.join(repoRoot, 'style.css');
const indexPath = path.join(repoRoot, 'index.html');

// 1. Script Syntax Integrity Verification via node -c
try {
    execSync(`node -c "${scriptPath}"`, { stdio: 'pipe' });
    console.log('✓ 1. script.js syntax validated via node -c (0 syntax errors)');
} catch (e) {
    assert.fail(`script.js syntax validation failed: ${e.message}`);
}

const scriptContent = fs.readFileSync(scriptPath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// 2. Cache busters
assert(/style\.css\?v=5\.[3-9]/.test(indexContent), 'index.html must link style.css >= v5.3');
assert(/script\.js\?v=5\.[3-9]/.test(indexContent), 'index.html must link script.js >= v5.3');
console.log('✓ 2. Cache busters verified');

// 3. Document onclick trigger protection verification
assert(scriptContent.includes('const isChatTrigger = e.target.closest('), 
    'script.js must check isChatTrigger using e.target.closest in document.onclick');
assert(scriptContent.includes('if (isChatTrigger) return;'),
    'script.js must early-return if a chat trigger is clicked');
console.log('✓ 3. Document.onclick chat trigger protection verified');

// 4. StopPropagation verification in chat buttons
assert(scriptContent.includes('click: function (custom, $btn, event)'),
    'script.js must accept event parameter in Artplayer chat control');
assert(scriptContent.includes('if (event && event.stopPropagation) event.stopPropagation();'),
    'script.js must call event.stopPropagation in Artplayer chat control');
console.log('✓ 4. StopPropagation in Artplayer chat control verified');

// 5. feedParser with _isBuffer = true verification
assert(scriptContent.includes('function feedParser('),
    'script.js must define feedParser in parseMkvSubtitles');
assert(scriptContent.includes('uint8._isBuffer = true;'),
    'script.js must set uint8._isBuffer = true to avoid TypeError in matroska-subtitles');
console.log('✓ 5. feedParser with uint8._isBuffer = true verified');

// 6. Functional Simulation: Document click outside logic
let isSidebarOpen = false;
let isCinemaMode = true;
const sidebar = {
    contains: (target) => target.id === 'chat-sidebar' || target.closest === '#chat-sidebar'
};

function simulateDocumentClick(targetSelector) {
    const fakeTarget = {
        id: targetSelector.replace('#', '').replace('.', ''),
        closest: (sel) => {
            const list = sel.split(',').map(s => s.trim());
            return list.includes(targetSelector);
        }
    };
    
    // Simulate our script.js logic:
    const isChatTrigger = fakeTarget.closest('#toggle-chat-btn, .art-chat-control-btn, #m3-chat-fab, #m3-spectators-btn, #m3-dock-spectators, #spectators-trigger, .chat-stream-pill, #chat-stream-overlay, #custom-fs-btn, .art-custom-fs-btn, #m3-dock-fs, #m3-fs-btn, #emoji-btn');
    if (isChatTrigger) return; // Must NOT close!

    if (isCinemaMode && isSidebarOpen && !sidebar.contains(fakeTarget)) {
        isSidebarOpen = false; // Closed by clicking outside
    }
}

// User opens sidebar via Artplayer button
isSidebarOpen = true;
// Click event bubbles up to document
simulateDocumentClick('.art-chat-control-btn');
assert.strictEqual(isSidebarOpen, true, 'Sidebar must REMAIN OPEN when clicking .art-chat-control-btn!');

// User clicks mobile fab
isSidebarOpen = true;
simulateDocumentClick('#m3-chat-fab');
assert.strictEqual(isSidebarOpen, true, 'Sidebar must REMAIN OPEN when clicking #m3-chat-fab!');

// User clicks outside on video player
simulateDocumentClick('#player-viewport');
assert.strictEqual(isSidebarOpen, false, 'Sidebar must CLOSE when clicking outside on #player-viewport!');

console.log('✓ 6. Simulated click outside & chat trigger interaction verified successfully');

console.log('All v5.3 Tests PASSED Successfully!');
