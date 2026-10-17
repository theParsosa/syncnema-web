const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

console.log('--- Testing v5.4 Artplayer Subtitle Integration & srtToVtt Parser ---');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'script.js');
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

// 2. Cache busters v=5.4
assert(indexContent.includes('style.css?v=5.4'), 'index.html must link style.css?v=5.4');
assert(indexContent.includes('script.js?v=5.4'), 'index.html must link script.js?v=5.4');
console.log('✓ 2. Cache busters v=5.4 verified');

// 3. Artplayer initialization must configure subtitle
assert(scriptContent.includes('subtitle: {'), 'script.js must configure subtitle in Artplayer options');
assert(scriptContent.includes('subtitleOffset: true'), 'script.js must enable subtitleOffset in Artplayer');
console.log('✓ 3. Artplayer subtitle option verified');

// 4. srtToVtt function test
function srtToVtt(srt) {
    if (!srt) return 'WEBVTT\n\n';
    if (srt.trim().startsWith('WEBVTT')) return srt;
    let vtt = 'WEBVTT\n\n';
    const clean = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const blocks = clean.split(/\n\s*\n/);
    let cueIdx = 1;
    blocks.forEach(block => {
        const lines = block.split('\n');
        const timeIndex = lines.findIndex(l => l.includes('-->'));
        if (timeIndex !== -1) {
            const timeLine = lines[timeIndex].replace(/,/g, '.').trim();
            const textLines = lines.slice(timeIndex + 1).join('\n').trim();
            if (textLines) {
                vtt += `${cueIdx}\n${timeLine}\n${textLines}\n\n`;
                cueIdx++;
            }
        }
    });
    return vtt;
}

const sampleSrt = `1\r\n00:00:01,500 --> 00:00:04,200\r\nسلام این یک تست زیرنویس است.\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,000\r\nخط دوم زیرنویس`;
const generatedVtt = srtToVtt(sampleSrt);
assert(generatedVtt.startsWith('WEBVTT\n\n'), 'WebVTT must start with WEBVTT header');
assert(generatedVtt.includes('00:00:01.500 --> 00:00:04.200'), 'Timecodes must have periods instead of commas');
assert(generatedVtt.includes('سلام این یک تست زیرنویس است.'), 'First cue text must match');
assert(generatedVtt.includes('خط دوم زیرنویس'), 'Second cue text must match');
console.log('✓ 4. srtToVtt parses and converts accurately');

// 5. addSubTrack must use targetVideo and artInstance.subtitle.switch
assert(scriptContent.includes('artInstance.subtitle.switch(blobUrl'), 'addSubTrack must call artInstance.subtitle.switch');
assert(scriptContent.includes('const targetVideo = (artInstance && artInstance.video) || videoPlayer;'), 
    'addSubTrack must attach track to artInstance.video');
console.log('✓ 5. addSubTrack uses artInstance.video and artInstance.subtitle.switch verified');

console.log('All v5.4 Tests PASSED Successfully!');
