// Test Suite: Bilingual i18n System & English Default Verification
// Verifies English default across UI, metadata, smart order engine, content script, and dynamic switching

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: Bilingual System & English Default Verification ===\n');

// ---------------------------------------------------------------------
// Test 1: Manifest V3 English Default & Web Resources
// ---------------------------------------------------------------------
console.log('--- Test 1: Manifest V3 Metadata & Declarations ---');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));

assert.strictEqual(
  manifest.name,
  'Flow Video Merger — Group & Order Sequence',
  'manifest.json name must default to English'
);
assert.ok(
  manifest.description.includes('merges videos generated in Google Flow'),
  'manifest.json description must default to English'
);
assert.strictEqual(
  manifest.action.default_title,
  'Open Flow Video Merger',
  'manifest.json action default_title must be Open Flow Video Merger'
);

const accessible = manifest.web_accessible_resources[0].resources;
assert.ok(accessible.includes('i18n.js'), 'manifest.json must declare i18n.js in web_accessible_resources');
assert.ok(accessible.includes('smart-order.js'), 'manifest.json must declare smart-order.js in web_accessible_resources');
assert.ok(accessible.includes('studio.html'), 'manifest.json must declare studio.html in web_accessible_resources');

console.log('✅ Test 1 PASSED: Manifest V3 has English defaults and all required web accessible resources.\n');

// ---------------------------------------------------------------------
// Test 2: i18n Engine Core Functionality & Parity
// ---------------------------------------------------------------------
console.log('--- Test 2: i18n Dictionary Parity & Engine API ---');

// Mock browser globals for i18n.js
global.chrome = {
  storage: {
    local: {
      get: (keys, cb) => cb({ fvm_lang: 'en' }),
      set: (obj, cb) => { if (cb) cb(); }
    },
    onChanged: { addListener: () => {} }
  }
};

require('./i18n.js');
const FlowI18n = global.FlowI18n;

assert.ok(FlowI18n, 'FlowI18n must be globally exported');
assert.strictEqual(FlowI18n.getLanguage(), 'en', 'FlowI18n default language MUST be "en"');

// Test English defaults
assert.strictEqual(FlowI18n.t('badge_add'), '+ Sequence', 'English badge_add must be "+ Sequence"');
assert.strictEqual(FlowI18n.t('badge_selected', { num: '01' }), '#01 ✓ Sequence');
assert.strictEqual(FlowI18n.t('default_group_name'), 'Sequence 1');
assert.strictEqual(FlowI18n.t('capture_flow_clips'), 'Capture Flow clips');
assert.strictEqual(FlowI18n.t('sort_smart'), 'Smart Order (Narrative & Chrono)');
assert.strictEqual(FlowI18n.t('open_studio_btn'), 'Web Studio Storyboard & Timeline');

// Test French switching
FlowI18n.setLanguage('fr');
assert.strictEqual(FlowI18n.getLanguage(), 'fr', 'Language should switch to "fr"');
assert.strictEqual(FlowI18n.t('badge_add'), '+ Séquence', 'French badge_add must be "+ Séquence"');
assert.strictEqual(FlowI18n.t('badge_selected', { num: '01' }), '#01 ✓ Séquence');
assert.strictEqual(FlowI18n.t('default_group_name'), 'Séquence 1');
assert.strictEqual(FlowI18n.t('capture_flow_clips'), 'Capturer les clips Flow');
assert.strictEqual(FlowI18n.t('sort_smart'), 'Ordre intelligent (Narratif & Chrono)');

// Test parameter interpolation
assert.strictEqual(
  FlowI18n.t('confirm_delete_scene', { group: 'TestScene' }),
  'Supprimer définitivement la séquence "TestScene" ?'
);

// Switch back to English
FlowI18n.setLanguage('en');
assert.strictEqual(FlowI18n.getLanguage(), 'en', 'Language should switch back to "en"');
assert.strictEqual(
  FlowI18n.t('confirm_delete_scene', { group: 'TestScene' }),
  'Permanently delete sequence "TestScene"?'
);

console.log('✅ Test 2 PASSED: i18n engine correctly defaults to English, switches dynamically, and interpolates parameters.\n');

// ---------------------------------------------------------------------
// Test 3: HTML Markup English Defaults & Switcher Controls
// ---------------------------------------------------------------------
console.log('--- Test 3: sidepanel.html & studio.html Bilingual Markup ---');

const sidepanelHtml = fs.readFileSync(path.join(__dirname, 'sidepanel.html'), 'utf8');
const studioHtml = fs.readFileSync(path.join(__dirname, 'studio.html'), 'utf8');

// Check <html lang="en">
assert.ok(sidepanelHtml.includes('<html lang="en">'), 'sidepanel.html must declare lang="en"');
assert.ok(studioHtml.includes('<html lang="en">'), 'studio.html must declare lang="en"');

// Check script inclusions
assert.ok(sidepanelHtml.includes('<script src="i18n.js"></script>'), 'sidepanel.html must include i18n.js');
assert.ok(studioHtml.includes('<script src="i18n.js"></script>'), 'studio.html must include i18n.js');

// Check language switchers exist
assert.ok(sidepanelHtml.includes('id="langEnBtn"'), 'sidepanel.html must contain #langEnBtn');
assert.ok(sidepanelHtml.includes('id="langFrBtn"'), 'sidepanel.html must contain #langFrBtn');
assert.ok(studioHtml.includes('id="langEnBtn"'), 'studio.html must contain #langEnBtn');
assert.ok(studioHtml.includes('id="langFrBtn"'), 'studio.html must contain #langFrBtn');

// Check default English button texts and labels
assert.ok(sidepanelHtml.includes('Capture Flow clips'), 'sidepanel.html default button must be English "Capture Flow clips"');
assert.ok(sidepanelHtml.includes('Clips in Sequence'), 'sidepanel.html sequence header must be English "Clips in Sequence"');
assert.ok(sidepanelHtml.includes('Merge into 1 Video'), 'sidepanel.html export button must be English "Merge into 1 Video"');

assert.ok(studioHtml.includes('Capture Flow clips'), 'studio.html default button must be English "Capture Flow clips"');
assert.ok(studioHtml.includes('Smart Ordering Engine'), 'studio.html AI bar must be English "Smart Ordering Engine"');
assert.ok(studioHtml.includes('Merge into 1 Final Video'), 'studio.html merge button must be English "Merge into 1 Final Video"');

console.log('✅ Test 3 PASSED: Both HTML files have lang="en", language switcher pills, and English default content.\n');

// ---------------------------------------------------------------------
// Test 4: content.js In-Page Video Badge English Defaults
// ---------------------------------------------------------------------
console.log('--- Test 4: content.js Overlay Badge Defaults & Synchronization ---');

const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

assert.ok(contentJs.includes('let currentLang = "en"'), 'content.js must default currentLang to "en"');
assert.ok(contentJs.includes('btn.textContent = isFr ? "+ Séquence" : "+ Sequence"'), 'content.js unselected badge must support English default "+ Sequence"');
assert.ok(contentJs.includes('btn.textContent = isFr ? `#${numStr} ✓ Séquence` : `#${numStr} ✓ Sequence`'), 'content.js selected badge must support English default "#01 ✓ Sequence"');
assert.ok(contentJs.includes('fvm_lang'), 'content.js must sync with fvm_lang in chrome.storage.local');

console.log('✅ Test 4 PASSED: content.js defaults in-page badges to English and reacts to language changes.\n');

// ---------------------------------------------------------------------
// Test 5: FlowSmartOrder Bilingual Analysis & English Default
// ---------------------------------------------------------------------
console.log('--- Test 5: FlowSmartOrder English Default & Bilingual Story Arcs ---');

require('./smart-order.js');
const FlowSmartOrder = global.FlowSmartOrder;

assert.ok(FlowSmartOrder, 'FlowSmartOrder must be globally exported');
assert.strictEqual(FlowSmartOrder.getLanguage(), 'en', 'FlowSmartOrder default language must be "en"');

// Test English story arc sorting
const englishStoryClips = [
  { id: 'c_climax', promptText: 'Dramatic climax and massive explosion during final battle' },
  { id: 'c_intro', promptText: 'At sunrise, opening panoramic view and awakening of the medieval village' },
  { id: 'c_journey', promptText: 'Then, long walk and journey across the misty valley' },
  { id: 'c_ending', promptText: 'In the deep night, final resolution and stars in the sky' }
];

const sortedEn = FlowSmartOrder.sortClips(englishStoryClips, 'smart');
assert.strictEqual(sortedEn[0].id, 'c_intro', 'Clip #1 should be intro');
assert.strictEqual(sortedEn[1].id, 'c_journey', 'Clip #2 should be journey');
assert.strictEqual(sortedEn[2].id, 'c_climax', 'Clip #3 should be climax');
assert.strictEqual(sortedEn[3].id, 'c_ending', 'Clip #4 should be ending');

// Test English tags
const analyzedEn = FlowSmartOrder.analyzeClip(sortedEn[0], sortedEn);
assert.ok(
  analyzedEn.tags.some(t => t.includes('Intro / Opening')),
  'English analysis must include English narrative tag "Intro / Opening"'
);

// Test English explanation report
const reportEn = FlowSmartOrder.explainSequence(sortedEn);
assert.ok(reportEn.summary.includes('Successfully ordered sequence'), 'Report summary must default to English');
assert.ok(reportEn.summary.includes('confidence:'), 'Report summary must contain confidence in English');

// Test French story arc sorting in same engine
const frenchStoryClips = [
  { id: 'fr_climax', promptText: 'Affrontement gigantesque et combat final' },
  { id: 'fr_intro', promptText: 'Au lever de soleil, ouverture et réveil du village' },
  { id: 'fr_journey', promptText: 'Ensuite, longue marche et voyage à travers la vallée' },
  { id: 'fr_ending', promptText: 'Dans la nuit noire, fin et dénouement sous les étoiles' }
];

const sortedFr = FlowSmartOrder.sortClips(frenchStoryClips, 'smart');
assert.strictEqual(sortedFr[0].id, 'fr_intro', 'French Clip #1 should be intro');
assert.strictEqual(sortedFr[1].id, 'fr_journey', 'French Clip #2 should be journey');
assert.strictEqual(sortedFr[2].id, 'fr_climax', 'French Clip #3 should be climax');
assert.strictEqual(sortedFr[3].id, 'fr_ending', 'French Clip #4 should be ending');

// Test switching smart-order language to French
FlowSmartOrder.setLanguage('fr');
assert.strictEqual(FlowSmartOrder.getLanguage(), 'fr');
const reportFr = FlowSmartOrder.explainSequence(sortedFr);
assert.ok(reportFr.summary.includes('Séquence ordonnée avec succès'), 'Report summary must be French when language is set to fr');

// Switch back to English
FlowSmartOrder.setLanguage('en');
assert.strictEqual(FlowSmartOrder.getLanguage(), 'en');

console.log('✅ Test 5 PASSED: FlowSmartOrder default language is English and seamlessly sorts both English and French narratives.\n');

// ---------------------------------------------------------------------
// Test 6: CSS Theme Consistency for Language Switcher
// ---------------------------------------------------------------------
console.log('--- Test 6: CSS Styling Consistency ---');

const sidepanelCss = fs.readFileSync(path.join(__dirname, 'sidepanel.css'), 'utf8');
const studioCss = fs.readFileSync(path.join(__dirname, 'studio.css'), 'utf8');

assert.ok(sidepanelCss.includes('.lang-switch-wrap'), 'sidepanel.css must define .lang-switch-wrap');
assert.ok(sidepanelCss.includes('.lang-btn'), 'sidepanel.css must define .lang-btn');
assert.ok(sidepanelCss.includes('.lang-btn.active'), 'sidepanel.css must define .lang-btn.active');

assert.ok(studioCss.includes('.lang-switch-wrap'), 'studio.css must define .lang-switch-wrap');
assert.ok(studioCss.includes('.lang-btn'), 'studio.css must define .lang-btn');
assert.ok(studioCss.includes('.lang-btn.active'), 'studio.css must define .lang-btn.active');

console.log('✅ Test 6 PASSED: CSS stylesheets define consistent styling for language switchers.\n');

// ---------------------------------------------------------------------
// Test 7: Dictionary Parity & UI Button Refinements
// ---------------------------------------------------------------------
console.log('--- Test 7: Dictionary Parity & Edge Case Verifications ---');

// 1. Strict Dictionary Key Parity
const enKeys = Object.keys(FlowI18n.TRANSLATIONS.en).sort();
const frKeys = Object.keys(FlowI18n.TRANSLATIONS.fr).sort();
assert.strictEqual(enKeys.length, frKeys.length, `Translations must have identical key count (${enKeys.length} vs ${frKeys.length})`);
enKeys.forEach(k => {
  assert.ok(FlowI18n.TRANSLATIONS.fr[k], `French dictionary missing key: ${k}`);
  assert.ok(FlowI18n.TRANSLATIONS.en[k], `English dictionary missing key: ${k}`);
});
console.log(`✅ Parity verified across all ${enKeys.length} translation keys.`);

// 2. sidepanel.html new_scene_label prevents "+ + Scene" bug
assert.ok(
  sidepanelHtml.includes('data-i18n="new_scene_label"'),
  'sidepanel.html must use new_scene_label to avoid double plus (+ + Scene)'
);
assert.ok(
  !sidepanelHtml.includes('<span class="icon-plus">+</span> <span data-i18n="new_scene_btn">'),
  'sidepanel.html must NOT combine plus icon with new_scene_btn (+ + Scene)'
);

// 3. studio.html preserves emojis in spans and localizes AI explanations button
assert.ok(
  studioHtml.includes('<span data-i18n="capture_flow_clips">'),
  'studio.html must isolate scan text in data-i18n span to preserve 🔍 emoji'
);
assert.ok(
  studioHtml.includes('<span data-i18n="import_files_btn">'),
  'studio.html must isolate import text in data-i18n span to preserve 📁 emoji'
);
assert.ok(
  studioHtml.includes('data-i18n="studio_ai_explanations_btn_text"'),
  'studio.html must localize AI explanations button'
);

// 4. smart-order.js generic fallback recognizes English and French clip prefixes
assert.strictEqual(FlowSmartOrder.cleanTitle('Flow Clip #3', 3), 'Clip #03');
assert.strictEqual(FlowSmartOrder.cleanTitle('Clip Flow #3', 3), 'Clip #03');

// 5. content.js cleanPromptText strips unaccented "+ Sequence"
assert.ok(
  contentJs.includes('\\+\\s*S[eé]quence'),
  'content.js cleanPromptText must match both + Sequence and + Séquence'
);

// 6. background.js default context menu in English and dynamic update
const backgroundJs = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');
assert.ok(
  backgroundJs.includes('🎬 Open Flow Video Studio (Fullscreen Web)'),
  'background.js must default context menu to English'
);
assert.ok(
  backgroundJs.includes('chrome.contextMenus.update'),
  'background.js must dynamically update context menu on language change'
);

console.log('✅ Test 7 PASSED: Dictionary parity, emoji preservation, prompt cleaner, and context menu verified.\n');

console.log('=== ALL BILINGUAL & ENGLISH DEFAULT TESTS PASSED SUCCESSFULLY! ===');
