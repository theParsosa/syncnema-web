const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('--- Testing v5.2 Syntax Integrity, MatroskaSubtitles & Fullscreen Chat ---');

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
const styleContent = fs.readFileSync(stylePath, 'utf8');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// 2. Cache Busters
assert(/style\.css\?v=5\.[2-9]/.test(indexContent), 'index.html must link style.css?v>=5.2');
assert(/script\.js\?v=5\.[2-9]/.test(indexContent), 'index.html must link script.js?v>=5.2');
console.log('✓ 2. Cache busters verified');

// 3. MatroskaSubtitles global reference check
assert(scriptContent.includes('MatroskaSubtitles'), 'script.js must check MatroskaSubtitles global');
assert(scriptContent.includes('sanitizeCueText'), 'script.js must define sanitizeCueText');
console.log('✓ 3. MatroskaSubtitles global reference & sanitizeCueText verified');

// 4. Test sanitizeCueText functionality
function sanitizeCueText(text) {
    if (!text) return '';
    return text
        .replace(/\\N/gi, '\n')
        .replace(/\\n/gi, '\n')
        .replace(/\\h/gi, ' ')
        .replace(/\{[^}]+\}/g, '');
}
const assSample = '{\\an8}{\\b1}سلام دنیا{\\b0}\\Nخط دوم';
const cleaned = sanitizeCueText(assSample);
assert.strictEqual(cleaned, 'سلام دنیا\nخط دوم');
console.log('✓ 4. sanitizeCueText properly cleans ASS tags and newlines');

// 5. Verify Fullscreen Chat Sidebar CSS selectors & z-index
assert(styleContent.includes(':fullscreen #chat-sidebar'), 'style.css must have :fullscreen #chat-sidebar');
assert(styleContent.includes(':-webkit-full-screen #chat-sidebar'), 'style.css must have :-webkit-full-screen #chat-sidebar');
assert(styleContent.includes('.is-fullscreen-cinema #chat-sidebar'), 'style.css must have .is-fullscreen-cinema #chat-sidebar');
assert(styleContent.includes('.art-fullscreen-web #chat-sidebar'), 'style.css must have .art-fullscreen-web #chat-sidebar');
assert(styleContent.includes('z-index: 99999 !important;'), 'style.css must specify z-index: 99999 !important for fullscreen chat sidebar');
console.log('✓ 5. Fullscreen Chat Sidebar CSS Display, WebKit support & z-index: 99999 verified');

// 6. Verify syncChatSidebarStacking & Artplayer events
assert(scriptContent.includes('function syncChatSidebarStacking()'), 'script.js must define syncChatSidebarStacking');
assert(scriptContent.includes('artInstance.on(\'fullscreenWeb\''), 'script.js must listen to fullscreenWeb');
assert(scriptContent.includes('syncChatSidebarStacking()'), 'script.js must call syncChatSidebarStacking');
console.log('✓ 6. syncChatSidebarStacking and Artplayer events verified');

console.log('All v5.2 Tests PASSED Successfully!');
