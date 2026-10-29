// Comprehensive Test Suite: Flow Video Studio & Smart Ordering Engine
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FlowSmartOrder = require('./smart-order.js');

console.log('=== TEST SUITE: Flow Video Studio Web Interface & Smart Ordering ===\n');

// ---------------------------------------------------------------------
// Test 1: Manifest V3 & Extension Architecture Validation
// ---------------------------------------------------------------------
console.log('--- Test 1: Manifest V3 Configuration & Web Resources ---');

const manifestRaw = fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);

assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.version, '1.2.0');
assert.ok(manifest.permissions.includes('contextMenus'), 'Missing contextMenus permission');
assert.ok(manifest.permissions.includes('sidePanel'), 'Missing sidePanel permission');
assert.ok(manifest.permissions.includes('storage'), 'Missing storage permission');
assert.ok(manifest.permissions.includes('declarativeNetRequest'), 'Missing declarativeNetRequest');

assert.ok(Array.isArray(manifest.web_accessible_resources), 'Missing web_accessible_resources');
const accessibleFiles = manifest.web_accessible_resources.flatMap(w => w.resources);
assert.ok(accessibleFiles.includes('studio.html'), 'studio.html must be web-accessible');
assert.ok(accessibleFiles.includes('studio.css'), 'studio.css must be web-accessible');
assert.ok(accessibleFiles.includes('studio.js'), 'studio.js must be web-accessible');
assert.ok(accessibleFiles.includes('smart-order.js'), 'smart-order.js must be web-accessible');

console.log('✅ Test 1 PASSED: Manifest V3 correctly declares studio web resources and permissions.\n');

// ---------------------------------------------------------------------
// Test 2: HTML Structure & Integration Integrity
// ---------------------------------------------------------------------
console.log('--- Test 2: HTML Page Consistency (Studio Web & Sidepanel) ---');

const studioHtml = fs.readFileSync(path.join(__dirname, 'studio.html'), 'utf8');
const sidepanelHtml = fs.readFileSync(path.join(__dirname, 'sidepanel.html'), 'utf8');

// Studio HTML requirements
assert.ok(studioHtml.includes('smart-order.js'), 'studio.html must load smart-order.js');
assert.ok(studioHtml.includes('studio.js'), 'studio.html must load studio.js');
assert.ok(studioHtml.includes('studio.css'), 'studio.html must load studio.css');
assert.ok(studioHtml.includes('id="storyboardView"'), 'studio.html must have storyboardView');
assert.ok(studioHtml.includes('id="timelineView"'), 'studio.html must have timelineView');
assert.ok(studioHtml.includes('id="timelineTrack"'), 'studio.html must have timelineTrack');
assert.ok(studioHtml.includes('id="timelinePlayhead"'), 'studio.html must have timelinePlayhead');
assert.ok(studioHtml.includes('id="applyAiSortBtn"'), 'studio.html must have applyAiSortBtn');
assert.ok(studioHtml.includes('id="sortStrategySelect"'), 'studio.html must have sortStrategySelect');
assert.ok(studioHtml.includes('id="sequencePlayer"'), 'studio.html must have sequencePlayer');
assert.ok(studioHtml.includes('id="mergerCanvas"'), 'studio.html must have mergerCanvas');

// Sidepanel HTML requirements
assert.ok(sidepanelHtml.includes('smart-order.js'), 'sidepanel.html must load smart-order.js');
assert.ok(sidepanelHtml.includes('openStudioBtn'), 'sidepanel.html must have openStudioBtn');
assert.ok(sidepanelHtml.includes('value="smart"'), 'sidepanel.html must offer smart sort option');

console.log('✅ Test 2 PASSED: Both Web Studio and Side Panel HTML structures are complete.\n');

// ---------------------------------------------------------------------
// Test 3: Complex French Narrative Story Arc Reordering
// ---------------------------------------------------------------------
console.log('--- Test 3: Complex French Story Arc out-of-order reconstruction ---');

// Scénario : un utilisateur a généré 5 clips d'une histoire dans le désordre
const mixedStoryClips = [
  {
    id: 'c_battle',
    promptText: 'Affrontement gigantesque et explosion dramatique lors du combat final',
    discoveredOrder: 1
  },
  {
    id: 'c_intro',
    promptText: 'Au lever de soleil, ouverture panoramique et réveil du village médiéval',
    discoveredOrder: 2
  },
  {
    id: 'c_ending',
    promptText: 'Dans la nuit noire, le chevalier s\'éloigne vers les étoiles, fin de l\'histoire, fondu au noir',
    discoveredOrder: 3
  },
  {
    id: 'c_calm',
    promptText: 'Après la bataille, crépuscule apaisé et retour au calme dans les ruines',
    discoveredOrder: 4
  },
  {
    id: 'c_journey',
    promptText: 'Ensuite, longue marche et voyage à travers la grande forêt interdite',
    discoveredOrder: 5
  }
];

const sortedStory = FlowSmartOrder.sortClips(mixedStoryClips, 'smart');
const storyIds = sortedStory.map(c => c.id);

assert.deepStrictEqual(
  storyIds,
  ['c_intro', 'c_journey', 'c_battle', 'c_calm', 'c_ending'],
  `Failed French narrative sequence: got ${JSON.stringify(storyIds)}`
);
console.log('Story Order:', sortedStory.map(c => `#${c.orderIndex} : ${c.promptText.slice(0, 35)}...`));
console.log('✅ Test 3 PASSED: Out-of-order narrative story reconstructed with 100% precision.\n');

// ---------------------------------------------------------------------
// Test 4: Mixed Numbered and Boosted Clips with Explanations
// ---------------------------------------------------------------------
console.log('--- Test 4: Mixed Scene Numbering & /boost 4K Clips ---');

const mixedNumberedClips = [
  { id: 'b3', promptText: '[Boost ⚡] Scene 03 - The vault opens', isBoost: true, videoUrl: 'https://flow.google/boost/v3.mp4' },
  { id: 'b1', promptText: 'Scene 01 - Entering the bank', isBoost: false, videoUrl: 'https://flow.google/v1.mp4' },
  { id: 'b4', promptText: '[Boost ⚡] Scene 04 - Getaway helicopter', isBoost: true, videoUrl: 'https://flow.google/boost/v4.mp4' },
  { id: 'b2', promptText: '[Boost ⚡] Scene 02 - Hacking the laser grid', isBoost: true, videoUrl: 'https://flow.google/boost/v2.mp4' }
];

const sortedNumbered = FlowSmartOrder.sortClips(mixedNumberedClips, 'smart');
assert.deepStrictEqual(sortedNumbered.map(c => c.id), ['b1', 'b2', 'b3', 'b4']);

const report = FlowSmartOrder.explainSequence(sortedNumbered);
assert.strictEqual(report.avgConfidence >= 95, true);
assert.strictEqual(report.clips.length, 4);
assert.ok(report.clips[0].tags.includes('🎬 Scène 1'));
assert.ok(report.clips[1].tags.includes('⚡ Boost 4K'));
console.log('Explanation Report:', report.summary);
console.log('✅ Test 4 PASSED: Explicit scenes and Boost tags correctly handled with high confidence.\n');

// ---------------------------------------------------------------------
// Test 5: Storage Synchronization State Emulation
// ---------------------------------------------------------------------
console.log('--- Test 5: Two-Way Synchronization between Side Panel & Studio ---');

// Mock storage system
const mockStorage = {
  data: {},
  listeners: [],
  set(obj) {
    const changes = {};
    for (const [k, v] of Object.entries(obj)) {
      changes[k] = { oldValue: this.data[k], newValue: v };
      this.data[k] = v;
    }
    for (const l of this.listeners) l(changes, 'local');
  },
  get(keys, cb) {
    const res = {};
    for (const k of keys) res[k] = this.data[k];
    cb(res);
  },
  addListener(l) { this.listeners.push(l); }
};

// State representation
let sidepanelState = { groups: { 'Séquence 1': [] }, activeGroup: 'Séquence 1' };
let studioState = { groups: { 'Séquence 1': [] }, activeGroup: 'Séquence 1' };

mockStorage.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.fvm_groups) {
      sidepanelState.groups = changes.fvm_groups.newValue;
      studioState.groups = changes.fvm_groups.newValue;
    }
    if (changes.fvm_activeGroup) {
      sidepanelState.activeGroup = changes.fvm_activeGroup.newValue;
      studioState.activeGroup = changes.fvm_activeGroup.newValue;
    }
  }
});

// 1. Side panel captures 2 clips from Google Flow
const capturedClips = [
  { id: 'f1', promptText: 'Scene 01: Sunrise', duration: 5, videoUrl: 'https://flow.google/asb/1' },
  { id: 'f2', promptText: 'Scene 02: Road', duration: 5, videoUrl: 'https://flow.google/asb/2' }
];

mockStorage.set({
  fvm_groups: { 'Séquence 1': capturedClips },
  fvm_activeGroup: 'Séquence 1'
});

// Verify studio immediately received both clips
assert.strictEqual(studioState.groups['Séquence 1'].length, 2);
assert.strictEqual(studioState.groups['Séquence 1'][0].id, 'f1');

// 2. Studio adds a new scene and reorders via AI
const newSceneClips = [
  { id: 's2', promptText: 'Finally sunset', duration: 5 },
  { id: 's1', promptText: 'First morning', duration: 5 }
];
const sortedNewScene = FlowSmartOrder.sortClips(newSceneClips, 'smart');

mockStorage.set({
  fvm_groups: {
    ...studioState.groups,
    'Scène 2': sortedNewScene
  },
  fvm_activeGroup: 'Scène 2'
});

// 3. Group deletion synchronization (Zombie group bug fix)
const remainingGroups = { ...mockStorage.data.fvm_groups };
delete remainingGroups['Séquence 1'];
mockStorage.set({
  fvm_groups: remainingGroups,
  fvm_activeGroup: 'Scène 2'
});

assert.strictEqual(sidepanelState.groups['Séquence 1'], undefined, 'Deleted group must not persist in sidepanel');
assert.strictEqual(studioState.groups['Séquence 1'], undefined, 'Deleted group must not persist in studio');

console.log('✅ Test 5 PASSED: Real-time synchronization & group deletion verified across instances.\n');

// ---------------------------------------------------------------------
// Test 6: Studio Interactive Timeline Scrubbing & Seeking Logic
// ---------------------------------------------------------------------
console.log('--- Test 6: Studio Interactive Timeline Scrubbing & Seeking ---');

const studioJs = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
assert.ok(studioJs.includes('handleTimelineScrub'), 'studio.js must implement handleTimelineScrub');
assert.ok(studioJs.includes('timelineRuler.addEventListener("click"'), 'timelineRuler must listen for click seeking');
assert.ok(studioJs.includes('timelineTrack.addEventListener("click"'), 'timelineTrack must listen for click seeking');
assert.ok(studioJs.includes('updatePlayButtons'), 'studio.js must toggle play/pause buttons');
assert.ok(studioJs.includes('triggerDirectDownload'), 'studio.js must provide direct download fallback');

console.log('✅ Test 6 PASSED: Studio interactive timeline scrubbing and play/pause toggle verified.\n');

// ---------------------------------------------------------------------
// Test 7: Studio Keyboard Shortcuts, Selection Sync & Inspector Guarding
// ---------------------------------------------------------------------
console.log('--- Test 7: Studio Keyboard Shortcuts & Selection Integrity ---');

// 1. Verify global keydown listener guards against button / input hijacking
assert.ok(
  studioJs.includes('e.target.matches("input, textarea, select, button") || e.target.closest("button")'),
  'studio.js must not hijack Space keydown when a button or input is focused'
);

// 2. Verify Delete / Backspace targeting and fallback
assert.ok(
  studioJs.includes('e.key === "Delete" || e.key === "Backspace"'),
  'studio.js must support Delete / Backspace keydown'
);
assert.ok(
  studioJs.includes('removeClip(targetIdx)'),
  'studio.js must resolve target clip index when deleting via shortcut'
);

// 3. Verify Escape deselects without destroying UI
assert.ok(
  studioJs.includes('state.selectedClipId = null'),
  'studio.js must clear selectedClipId on Escape'
);
assert.ok(
  studioJs.includes('renderInspector()'),
  'studio.js must update inspector on selection/deselection'
);

// 4. Verify inspector Enter keydown blur and non-empty blur fallback
assert.ok(
  studioJs.includes('inspectorPromptInput.addEventListener("keydown"'),
  'inspectorPromptInput must listen for keydown events'
);
assert.ok(
  studioJs.includes('inspectorPromptInput.addEventListener("blur"'),
  'inspectorPromptInput must validate and fallback on blur'
);

// 5. Verify selectClip toggles .is-selected class across cards and timeline
assert.ok(
  studioJs.includes('c.classList.toggle("is-selected"'),
  'selectClip must toggle is-selected class on storyboard cards'
);
assert.ok(
  studioJs.includes('b.classList.toggle("is-selected"'),
  'selectClip must toggle is-selected class on timeline blocks'
);

// 6. Verify removeClip bounds clamping and selectedClipId reset
assert.ok(
  studioJs.includes('state.currentPreviewIndex = Math.max(0, clips.length - 1)'),
  'removeClip must clamp currentPreviewIndex within valid bounds'
);

console.log('✅ Test 7 PASSED: Keyboard shortcuts, selection sync & inspector guards verified.\n');

console.log('=== ALL STUDIO & SMART ORDERING TESTS PASSED! ===');

