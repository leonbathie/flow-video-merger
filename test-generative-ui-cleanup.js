// Verification Test Suite: Generative UI Cleanup & Minimalist Card Redesign
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FlowSmartOrder = require('./smart-order.js');

console.log('=== TEST SUITE: Generative UI Cleanup & Sleek Card Architecture ===\n');

// ---------------------------------------------------------------------
// Test 1: FlowSmartOrder.cleanTitle comprehensive verification
// ---------------------------------------------------------------------
console.log('--- Test 1: Human-readable Title Cleaning ---');

const titleCases = [
  {
    raw: 'Lion_steps_in_courtyard_20261027132109',
    expected: 'Lion steps in courtyard',
    fallback: 1
  },
  {
    raw: 'Lion_steps_in_courtyard_20261027132109 (1).mp4',
    expected: 'Lion steps in courtyard',
    fallback: 1
  },
  {
    raw: '20261027_132109_Lion_steps_in_courtyard.mp4',
    expected: 'Lion steps in courtyard',
    fallback: 1
  },
  {
    raw: 'Lioness_walking_beside_male_lion_20261027132109',
    expected: 'Lioness walking beside male lion',
    fallback: 2
  },
  {
    raw: 'Lion_roars_near_villagers_202610271332109.webm',
    expected: 'Lion roars near villagers',
    fallback: 3
  },
  {
    raw: 'Lion_standing_in_village_square_1080p_20261027134151.mp4',
    expected: 'Lion standing in village square',
    fallback: 4
  },
  {
    raw: 'clip_2026-10-27_13-41-51.mp4',
    expected: 'Clip #05',
    fallback: 5
  },
  {
    raw: 'media_1793113673557_f31ea872.png',
    expected: 'Clip #06',
    fallback: 6
  },
  {
    raw: 'Au lever de soleil, ouverture panoramique et réveil du village médiéval',
    expected: 'Au lever de soleil, ouverture panoramique et réveil du village médiéval',
    fallback: 7
  },
  {
    raw: '[Boost ⚡] Scene 03 - The vault opens',
    expected: 'Scene 03 - The vault opens',
    fallback: 8
  },
  {
    raw: '',
    expected: 'Clip #09',
    fallback: 9
  },
  {
    raw: null,
    expected: 'Clip #10',
    fallback: 10
  },
  {
    raw: undefined,
    expected: 'Clip #11',
    fallback: 11
  },
  {
    raw: 'Hero_running_through_cyberpunk_neon_alley_4k_20261027150000',
    expected: 'Hero running through cyberpunk neon alley',
    fallback: 12
  },
  {
    raw: 'VID_20261027_132109.mp4',
    expected: 'Clip #13',
    fallback: 13
  },
  {
    raw: '___---___',
    expected: 'Clip #14',
    fallback: 14
  },
  {
    raw: '---',
    expected: 'Clip #15',
    fallback: 15
  },
  {
    raw: 'Lion%20steps%20in%20courtyard_20261027132109',
    expected: 'Lion steps in courtyard',
    fallback: 16
  }
];

assert.strictEqual(typeof FlowSmartOrder.cleanTitle, 'function', 'FlowSmartOrder.cleanTitle must be exported');

titleCases.forEach(tc => {
  const result = FlowSmartOrder.cleanTitle(tc.raw, tc.fallback);
  assert.strictEqual(
    result,
    tc.expected,
    `cleanTitle failed for "${tc.raw}": expected "${tc.expected}", got "${result}"`
  );
  console.log(`  "${tc.raw || ''}" -> "${result}"`);
});

console.log('✅ Test 1 PASSED: All technical timestamps, extensions, and resolution suffixes cleanly stripped into human titles.\n');

// ---------------------------------------------------------------------
// Test 2: Studio Codebase Audit (No Clutter, Minimalist Architecture)
// ---------------------------------------------------------------------
console.log('--- Test 2: Studio UI Inspection (No "Lire cette section", No AI Badges on Cards) ---');

const studioJsContent = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
const studioCssContent = fs.readFileSync(path.join(__dirname, 'studio.css'), 'utf8');

// 1. Verify "Lire cette section" button is removed from card template in studio.js
assert.ok(
  !studioJsContent.includes('Lire cette section'),
  'studio.js MUST NOT render redundant "Lire cette section" button on cards'
);
assert.ok(
  !studioJsContent.includes('card-quick-play-row'),
  'studio.js MUST NOT include card-quick-play-row'
);

// 2. Verify noisy AI tags are removed from card template in studio.js
assert.ok(
  !studioJsContent.includes('card-tags-row'),
  'studio.js MUST NOT render noisy card-tags-row on card surfaces'
);

// 3. Verify cleanTitle is used in studio.js
assert.ok(
  studioJsContent.includes('FlowSmartOrder.cleanTitle'),
  'studio.js MUST use FlowSmartOrder.cleanTitle for displayTitle'
);

// 4. Verify clean title input field exists with prompt syncing
assert.ok(
  studioJsContent.includes('card-title-field'),
  'studio.js MUST render sleek card-title-field'
);
assert.ok(
  studioJsContent.includes('card-order-badge'),
  'studio.js MUST render card-order-badge'
);
assert.ok(
  studioJsContent.includes('card-hover-delete'),
  'studio.js MUST render card-hover-delete'
);
assert.ok(
  studioJsContent.includes('mini-arrow-btn move-up') && studioJsContent.includes('mini-arrow-btn move-down'),
  'studio.js MUST retain minimal hover navigation arrows'
);

// 5. Verify title serialization in saveState
assert.ok(
  studioJsContent.includes('title: item.title || ""'),
  'studio.js MUST serialize title in saveState'
);

// 6. Verify timeline track cleans titles
assert.ok(
  studioJsContent.includes('timeline-clip-name') && studioJsContent.includes('FlowSmartOrder.cleanTitle'),
  'studio.js MUST use cleanTitle in timeline track'
);

// 7. Verify CSS styling is defined for the new elements and accessible on focus-within
assert.ok(studioCssContent.includes('.card-order-badge'), 'studio.css must style .card-order-badge');
assert.ok(studioCssContent.includes('.card-title-field'), 'studio.css must style .card-title-field');
assert.ok(studioCssContent.includes('.card-hover-delete'), 'studio.css must style .card-hover-delete');
assert.ok(studioCssContent.includes('.card-hover-arrows'), 'studio.css must style .card-hover-arrows');
assert.ok(studioCssContent.includes(':focus-within .card-hover-delete'), 'studio.css must support :focus-within for delete button');
assert.ok(studioCssContent.includes(':focus-within .card-hover-arrows'), 'studio.css must support :focus-within for arrows');

console.log('✅ Test 2 PASSED: studio.js and studio.css verified with clean, professional UI.\n');

// ---------------------------------------------------------------------
// Test 3: Sidepanel Codebase Audit (No Clutter, Clean List Rows)
// ---------------------------------------------------------------------
console.log('--- Test 3: Sidepanel UI Inspection (No Noisy Badges, Sleek Rows) ---');

const sidepanelJsContent = fs.readFileSync(path.join(__dirname, 'sidepanel.js'), 'utf8');
const sidepanelCssContent = fs.readFileSync(path.join(__dirname, 'sidepanel.css'), 'utf8');

// 1. Verify noisy smartTagsHtml is removed from card template in sidepanel.js
assert.ok(
  !sidepanelJsContent.includes('smartTagsHtml'),
  'sidepanel.js MUST NOT render noisy smartTagsHtml on card surfaces'
);

// 2. Verify cleanTitle is used in sidepanel.js
assert.ok(
  sidepanelJsContent.includes('FlowSmartOrder.cleanTitle'),
  'sidepanel.js MUST use FlowSmartOrder.cleanTitle for displayTitle'
);

// 3. Verify sleek order badge and hover actions
assert.ok(
  sidepanelJsContent.includes('clip-order-badge'),
  'sidepanel.js MUST render clip-order-badge'
);
assert.ok(
  sidepanelJsContent.includes('clip-hover-actions'),
  'sidepanel.js MUST render clip-hover-actions'
);
assert.ok(
  sidepanelJsContent.includes('clip-thumb-dur'),
  'sidepanel.js MUST render duration on thumbnail'
);

// 4. Verify in-place editable title in sidepanel.js
assert.ok(
  sidepanelJsContent.includes('clip-title-input'),
  'sidepanel.js MUST render editable clip-title-input'
);
assert.ok(
  sidepanelJsContent.includes('title: item.title || ""'),
  'sidepanel.js MUST serialize title in saveState'
);

// 5. Verify sidepanel.css styles including focus-within
assert.ok(sidepanelCssContent.includes('.clip-order-badge'), 'sidepanel.css must style .clip-order-badge');
assert.ok(sidepanelCssContent.includes('.clip-hover-actions'), 'sidepanel.css must style .clip-hover-actions');
assert.ok(sidepanelCssContent.includes('.clip-title-input'), 'sidepanel.css must style .clip-title-input');
assert.ok(sidepanelCssContent.includes(':focus-within .clip-hover-actions'), 'sidepanel.css must support :focus-within for hover actions');

console.log('✅ Test 3 PASSED: sidepanel.js and sidepanel.css verified with clean, professional list rows.\n');

// ---------------------------------------------------------------------
// Test 4: End-to-End Screenshot Scenario Simulation
// ---------------------------------------------------------------------
console.log('--- Test 4: User Actual Screenshot Scenario Simulation ---');

const screenshotClips = [
  { id: 'c3', promptText: 'Lion_steps_in_courtyard_20261027132109', duration: 5.0, resolution: '1080p' },
  { id: 'c4', promptText: 'Lioness_walking_beside_male_lion_20261027132109', duration: 5.0, resolution: '1080p' },
  { id: 'c2', promptText: 'Lion_roars_near_villagers_202610271332109.webm', duration: 5.0, resolution: '1080p' },
  { id: 'c1', promptText: 'Lion_standing_in_village_square_1080p_20261027134151.mp4', duration: 5.0, resolution: '1080p' }
];

screenshotClips.forEach((clip, index) => {
  const displayTitle = FlowSmartOrder.cleanTitle(clip.promptText, index + 1);
  const numStr = String(index + 1).padStart(2, '0');
  
  // Verify clean title
  assert.ok(!displayTitle.includes('20261027'), `displayTitle must not contain timestamp: ${displayTitle}`);
  assert.ok(!displayTitle.includes('_'), `displayTitle must not contain underscores: ${displayTitle}`);
  assert.ok(!displayTitle.includes('.mp4') && !displayTitle.includes('.webm'), `displayTitle must not contain extensions: ${displayTitle}`);
  assert.ok(!displayTitle.includes('1080p'), `displayTitle must not contain resolution tag: ${displayTitle}`);
  
  console.log(`  Clip #${numStr}: "${displayTitle}" [${clip.resolution} • ${clip.duration.toFixed(1)}s]`);
});

// Verify explainSequence provides clean title
const report = FlowSmartOrder.explainSequence(screenshotClips);
report.clips.forEach(rc => {
  assert.ok(!rc.title.includes('20261027'), `Report clip title must be clean: ${rc.title}`);
  assert.ok(!rc.title.includes('_'), `Report clip title must not contain underscores: ${rc.title}`);
});
console.log('  ExplainSequence report titles verified clean.');

console.log('\n✅ Test 4 PASSED: User screenshot clips formatted cleanly without clutter or artificial tags.\n');

console.log('=== ALL GENERATIVE UI CLEANUP TESTS PASSED SUCCESSFULLY! ===');
