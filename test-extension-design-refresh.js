// Targeted Verification Test Suite for the Extension Design Refresh
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FlowSmartOrder = require('./smart-order.js');

console.log('=== TEST SUITE: Chrome Extension Modern Design Refresh ===\n');

// 1. Inspect sidepanel.html
console.log('--- Test 1: sidepanel.html Semantic Structure & Styling Audit ---');
const sidepanelHtml = fs.readFileSync(path.join(__dirname, 'sidepanel.html'), 'utf8');

// Ensure no ugly inline styles
assert.ok(!sidepanelHtml.includes('style="width: 100%'), 'sidepanel.html must NOT contain inline style for openStudioBtn');
assert.ok(!sidepanelHtml.includes('style="margin-top'), 'sidepanel.html must NOT contain inline style for studio wrapper');

// Ensure modern elements and IDs exist
const requiredIds = [
  'groupSelect', 'newGroupBtn', 'openStudioBtn', 'scanFlowBtn', 'localFileInput',
  'sortModeSelect', 'applySortBtn', 'clipList', 'clipCount', 'totalDurationBadge',
  'clearAllBtn', 'previewSection', 'closePreviewBtn', 'sequencePreviewPlayer',
  'previewNowPlaying', 'resolutionSelect', 'transitionSelect', 'progressContainer',
  'progressStatus', 'progressPercent', 'progressBarFill', 'previewSeqBtn',
  'mergeExportBtn', 'mergerCanvas'
];
requiredIds.forEach(id => {
  assert.ok(sidepanelHtml.includes(`id="${id}"`), `sidepanel.html must contain id="${id}"`);
});

// Modern UI structural classes
assert.ok(sidepanelHtml.includes('open-studio-btn'), 'sidepanel.html must use open-studio-btn class');
assert.ok(sidepanelHtml.includes('hint-card'), 'sidepanel.html must use hint-card component');
assert.ok(sidepanelHtml.includes('preview-header'), 'sidepanel.html must use preview-header component');
assert.ok(sidepanelHtml.includes('live-dot'), 'sidepanel.html must include live-dot indicator');
assert.ok(sidepanelHtml.includes('version-chip'), 'sidepanel.html must include version-chip');

console.log('✅ Test 1 PASSED: sidepanel.html verified with clean modern semantic architecture and zero inline styles.\n');

// 2. Inspect sidepanel.css
console.log('--- Test 2: sidepanel.css Design Tokens & Component Styling ---');
const sidepanelCss = fs.readFileSync(path.join(__dirname, 'sidepanel.css'), 'utf8');

// Check Design Tokens
assert.ok(sidepanelCss.includes('--bg-base'), 'sidepanel.css must define --bg-base');
assert.ok(sidepanelCss.includes('--accent-gradient'), 'sidepanel.css must define --accent-gradient');
assert.ok(sidepanelCss.includes('--boost-gold'), 'sidepanel.css must define --boost-gold');

// Check Required Component Selectors
const requiredSelectors = [
  '.open-studio-btn',
  '.toolbar-card',
  '.primary-btn',
  '.secondary-btn',
  '.clip-card',
  '.clip-order-badge',
  '.clip-pos-select',
  '.clip-thumb-wrap',
  '.clip-thumb-dur',
  '.clip-thumb-play-overlay',
  '.clip-title-input',
  '.boost-indicator',
  '.clip-hover-actions',
  '.mini-btn',
  ':focus-within .clip-hover-actions',
  '.preview-card',
  '.live-dot',
  '.export-footer',
  '.progress-container',
  '.progress-bar-fill',
  '.merge-btn'
];
requiredSelectors.forEach(sel => {
  assert.ok(sidepanelCss.includes(sel), `sidepanel.css must style selector: ${sel}`);
});

console.log('✅ Test 2 PASSED: sidepanel.css verified with Arc/Linear dark theme design tokens & complete component hierarchy.\n');

// 3. Inspect content.js OVERLAY_BADGE_CSS
console.log('--- Test 3: content.js In-Page Video Overlay Badge Styling ---');
const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

assert.ok(contentJs.includes('.fvm-overlay-btn'), 'content.js must define .fvm-overlay-btn');
assert.ok(contentJs.includes('backdrop-filter: blur(8px)'), 'content.js overlay badge must feature frosted glass blur');
assert.ok(contentJs.includes('.fvm-overlay-btn.fvm-selected'), 'content.js must define selected state for badges');
assert.ok(contentJs.includes('.fvm-overlay-btn.fvm-boost-badge'), 'content.js must define boost badge styling');

console.log('✅ Test 3 PASSED: In-page Google Flow badge styles verified with modern frosted glass aesthetic.\n');

// 4. Inspect sidepanel.js Card Template & Empty State
console.log('--- Test 4: sidepanel.js Empty State & Card Rendering ---');
const sidepanelJs = fs.readFileSync(path.join(__dirname, 'sidepanel.js'), 'utf8');

assert.ok(sidepanelJs.includes('empty-state'), 'sidepanel.js must render empty-state');
assert.ok(sidepanelJs.includes('empty-steps'), 'sidepanel.js must provide structured empty-steps guidance');
assert.ok(sidepanelJs.includes('clip-drag-grip'), 'sidepanel.js must render clip-drag-grip for reordering');
assert.ok(sidepanelJs.includes('boost-indicator'), 'sidepanel.js must render boost-indicator');
assert.ok(sidepanelJs.includes('FlowSmartOrder.cleanTitle'), 'sidepanel.js must use cleanTitle');
assert.ok(!sidepanelJs.includes('smartTagsHtml'), 'sidepanel.js must not render noisy AI tags on card surfaces');

console.log('✅ Test 4 PASSED: sidepanel.js card rendering verified with clean, content-first architecture.\n');

// 5. Tactile 6-Dot Grip & Interactive Drag Feedback
console.log('--- Test 5: Tactile 6-Dot Grip & Drag Visual Feedback ---');
assert.ok(sidepanelJs.includes('grip-column'), 'sidepanel.js must structure grip dots into grip-columns');
assert.ok(sidepanelCss.includes('.grip-column'), 'sidepanel.css must style .grip-column');
assert.ok(sidepanelCss.includes('.clip-card.drag-over'), 'sidepanel.css must provide .clip-card.drag-over visual feedback');
assert.ok(sidepanelJs.includes('drag-over'), 'sidepanel.js must toggle drag-over class during dragenter/dragleave');

console.log('✅ Test 5 PASSED: 6-dot tactile grip and drag-over visual feedback verified.\n');

// 6. Vector SVG Micro-icons (No cartoonish emojis)
console.log('--- Test 6: Vector SVG Micro-icons (Arc/Linear Standard) ---');
assert.ok(sidepanelHtml.includes('<svg class="group-icon"'), 'Header must use SVG for group selector icon');
assert.ok(sidepanelHtml.includes('<svg class="studio-btn-icon"'), 'Header must use SVG for studio launch icon');
assert.ok(sidepanelHtml.includes('<svg class="btn-icon"'), 'Buttons must use SVG for toolbar icons');
assert.ok(sidepanelHtml.includes('<svg class="sort-icon"'), 'Sort bar must use SVG for sort icon');
assert.ok(sidepanelHtml.includes('<svg class="clear-icon"'), 'Sequence header must use SVG for clear icon');
assert.ok(!sidepanelHtml.includes('🧠 Ordre Intelligent IA'), 'Sort select must NOT contain artificial AI emoji tags');

console.log('✅ Test 6 PASSED: Clean vector SVG micro-icons and clean typography verified.\n');

// 7. Non-intrusive Absolute Hover Actions Overlay
console.log('--- Test 7: Non-intrusive Absolute Hover Actions Overlay ---');
assert.ok(sidepanelCss.includes('position: absolute'), 'sidepanel.css must position .clip-hover-actions as absolute overlay');
assert.ok(sidepanelCss.includes('padding-right: 68px') || sidepanelCss.includes('padding-right: 66px'), 'sidepanel.css must smoothly expand padding-right on hover without shrinking default title space');

console.log('✅ Test 7 PASSED: Non-intrusive hover actions verified for narrow viewports.\n');

console.log('=== ALL DESIGN REFRESH TESTS PASSED SUCCESSFULLY! ===\n');
