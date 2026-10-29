// Deep unit & integration tests for FlowSmartOrder
const assert = require('assert');
const FlowSmartOrder = require('./smart-order.js');

console.log('=== TEST SUITE: FlowSmartOrder Intelligent Video Ordering ===\n');

// ---------------------------------------------------------------------
// Test 1: Explicit numbering extraction across extensive patterns
// ---------------------------------------------------------------------
console.log('--- Test 1: Explicit numbering detection across patterns ---');

const testCasesNum = [
  { text: "Scene 01: Sunrise over the ocean", expected: 1 },
  { text: "Scène 2 - Voyage dans la jungle", expected: 2 },
  { text: "Shot #03 - Close up on character", expected: 3 },
  { text: "Plan 4: Combat final", expected: 4 },
  { text: "Partie 5 / Epilogue", expected: 5 },
  { text: "Acte IV: Le dénouement", expected: 4 },
  { text: "Acte I: L'aube", expected: 1 },
  { text: "Acte XI: Le tournant", expected: 11 },
  { text: "Acte XIV: Le duel", expected: 14 },
  { text: "Acte XX: L'apogée", expected: 20 },
  { text: "Clip #02 [Boost ⚡]", expected: 2 },
  { text: "01_intro_animation.mp4", expected: 1 },
  { text: "mountain_hike_03.mp4", expected: 3 },
  { text: "[4] Ending scene", expected: 4 },
  { text: "2 of 5 - Continuing the walk", expected: 2 },
  { text: "Première scène : la découverte", expected: 1 },
  { text: "Deuxième scène : la marche", expected: 2 },
  { text: "Troisième partie : l'assaut", expected: 3 },
  { text: "Quatrième acte : la chute", expected: 4 },
  { text: "Cinquième plan : le repos", expected: 5 },
  { text: "1ère scène : le départ", expected: 1 },
  { text: "2ème scène : la plaine", expected: 2 },
  { text: "3ème scène : le pont", expected: 3 },
  { text: "1er plan : le réveil", expected: 1 },
  { text: "2e plan : la forêt", expected: 2 },
  { text: "1st shot: entering the cave", expected: 1 },
  { text: "2nd shot: taking artifact", expected: 2 },
  { text: "3rd shot: escape", expected: 3 },
  { text: "4th shot: sunset", expected: 4 },
  { text: "First scene: arrival", expected: 1 },
  { text: "Second scene: meeting", expected: 2 },
  { text: "Third scene: departure", expected: 3 },
  { text: "Scene 1A : opening vista", expected: 1.1 },
  { text: "Scene 1B : close up hero", expected: 1.2 },
  { text: "Plan 2C : aerial view", expected: 2.3 },
  { text: "Épisode 1 : Le début", expected: 1 },
  { text: "Épisode 2 : La tempête", expected: 2 },
  { text: "Vidéo 1 : Le matin", expected: 1 },
  { text: "Vidéo 2 : Le midi", expected: 2 },
  { text: "1) Introduction", expected: 1 },
  { text: "2) Développement", expected: 2 },
  { text: "3) Conclusion", expected: 3 },
  { text: "A 4k video 60fps cinematic", expected: null },
  { text: "A background with color #ffffff", expected: null },
  { text: "Simple prompt with no numbers", expected: null }
];

for (const tc of testCasesNum) {
  const res = FlowSmartOrder.extractExplicitNumber(tc.text);
  const actual = res ? res.number : null;
  assert.strictEqual(actual, tc.expected, `Failed for text: "${tc.text}", got ${actual}, expected ${tc.expected}`);
}
console.log(`✅ Test 1 PASSED: All ${testCasesNum.length} explicit numbering variations identified.\n`);

// ---------------------------------------------------------------------
// Test 2: Sorting clips with explicit scene numbers out of order
// ---------------------------------------------------------------------
console.log('--- Test 2: Sorting out-of-order explicit scenes ---');

const outOfOrderScenes = [
  { id: 'c3', promptText: 'Scene 03: The great explosion and battle', discoveredOrder: 1 },
  { id: 'c1', promptText: 'Scene 01: Early morning sunrise over the mountains', discoveredOrder: 2 },
  { id: 'c4', promptText: 'Scene 04: Peaceful sunset, the end credits', discoveredOrder: 3 },
  { id: 'c2', promptText: 'Scene 02: Traveling along the ancient forest road', discoveredOrder: 4 }
];

const sortedScenes = FlowSmartOrder.sortClips(outOfOrderScenes, 'smart');
const sceneIds = sortedScenes.map(c => c.id);
assert.deepStrictEqual(sceneIds, ['c1', 'c2', 'c3', 'c4'], `Expected ['c1', 'c2', 'c3', 'c4'], got ${JSON.stringify(sceneIds)}`);
console.log('✅ Test 2 PASSED: Clips correctly ordered Scene 01 -> 02 -> 03 -> 04.\n');

// ---------------------------------------------------------------------
// Test 3: French explicit numbering & Roman numerals up to XX
// ---------------------------------------------------------------------
console.log('--- Test 3: French Roman & Standard numbering ---');

const romanClips = [
  { id: 'r14', promptText: 'Acte XIV: Le duel au sommet', discoveredOrder: 1 },
  { id: 'r1', promptText: 'Acte I: Le départ du village au lever du jour', discoveredOrder: 2 },
  { id: 'r20', promptText: 'Acte XX: Le triomphe et la fin', discoveredOrder: 3 },
  { id: 'r11', promptText: 'Acte XI: La traversée du grand canyon', discoveredOrder: 4 }
];

const sortedRoman = FlowSmartOrder.sortClips(romanClips, 'smart');
assert.deepStrictEqual(sortedRoman.map(c => c.id), ['r1', 'r11', 'r14', 'r20']);
console.log('✅ Test 3 PASSED: Acte I -> XI -> XIV -> XX properly sorted.\n');

// ---------------------------------------------------------------------
// Test 4: Pure Semantic Narrative Arc (No numbers)
// ---------------------------------------------------------------------
console.log('--- Test 4: Pure Semantic Narrative Arc in French & English ---');

const narrativeClips = [
  { id: 'n_climax', promptText: 'Tension maximale, terrible combat affrontement épique avec le dragon cracheur de flammes', discoveredOrder: 1 },
  { id: 'n_intro', promptText: 'Vue d\'ensemble panoramique au lever de soleil, ouverture et réveil paisible de la cité', discoveredOrder: 2 },
  { id: 'n_end', promptText: 'Nuit étoilée, feu de camp crépitant, adieu et fin de l\'histoire, fondu au noir', discoveredOrder: 3 },
  { id: 'n_journey', promptText: 'Ensuite, marche et exploration le long de la rivière, voyage vers le donjon', discoveredOrder: 4 }
];

const sortedNarrative = FlowSmartOrder.sortClips(narrativeClips, 'smart');
assert.deepStrictEqual(
  sortedNarrative.map(c => c.id),
  ['n_intro', 'n_journey', 'n_climax', 'n_end'],
  `Narrative sorting failed: got ${JSON.stringify(sortedNarrative.map(c => c.id))}`
);
console.log('✅ Test 4 PASSED: Intro -> Journey -> Climax -> End perfectly ordered by semantic analysis.\n');

// ---------------------------------------------------------------------
// Test 5: Temporal connectors progression (D'abord -> Ensuite -> Enfin)
// ---------------------------------------------------------------------
console.log('--- Test 5: Temporal connectors ordering ---');

const temporalClips = [
  { id: 't_end', promptText: 'Enfin, le vaisseau atterrit sur la base lunaire', discoveredOrder: 1 },
  { id: 't_start', promptText: 'D\'abord, les réacteurs s\'allument au pas de tir', discoveredOrder: 2 },
  { id: 't_mid', promptText: 'Ensuite, la fusée traverse l\'atmosphère terrestre', discoveredOrder: 3 }
];

const sortedTemporal = FlowSmartOrder.sortClips(temporalClips, 'smart');
assert.deepStrictEqual(sortedTemporal.map(c => c.id), ['t_start', 't_mid', 't_end']);
console.log('✅ Test 5 PASSED: D\'abord -> Ensuite -> Enfin ordered correctly.\n');

// ---------------------------------------------------------------------
// Test 6: Diurnal Time-of-Day Progression (Dawn -> Noon -> Sunset -> Midnight)
// ---------------------------------------------------------------------
console.log('--- Test 6: Diurnal progression ---');

const diurnalClips = [
  { id: 'd_night', promptText: 'Cyberpunk street in the dark midnight rain', discoveredOrder: 1 },
  { id: 'd_dawn', promptText: 'Aube brumeuse au-dessus de la forêt boréale', discoveredOrder: 2 },
  { id: 'd_sunset', promptText: 'Golden hour sunset over calm ocean waves', discoveredOrder: 3 },
  { id: 'd_noon', promptText: 'High noon bright sunshine in bustling bazaar', discoveredOrder: 4 }
];

const sortedDiurnal = FlowSmartOrder.sortClips(diurnalClips, 'smart');
assert.deepStrictEqual(sortedDiurnal.map(c => c.id), ['d_dawn', 'd_noon', 'd_sunset', 'd_night']);
console.log('✅ Test 6 PASSED: Dawn -> Noon -> Sunset -> Night ordered properly.\n');

// ---------------------------------------------------------------------
// Test 7: Spatial Layout in Flow Canvas (2D grid reading order)
// ---------------------------------------------------------------------
console.log('--- Test 7: Spatial Canvas 2D grid order ---');

const spatialClips = [
  { id: 's_r2_c2', promptText: 'Clip D', domTop: 310, domLeft: 350, discoveredOrder: 1 },
  { id: 's_r1_c1', promptText: 'Clip A', domTop: 95, domLeft: 50, discoveredOrder: 2 },
  { id: 's_r2_c1', promptText: 'Clip C', domTop: 300, domLeft: 50, discoveredOrder: 3 },
  { id: 's_r1_c2', promptText: 'Clip B', domTop: 105, domLeft: 350, discoveredOrder: 4 }
];

const sortedSpatial = FlowSmartOrder.sortClips(spatialClips, 'spatial_canvas');
assert.deepStrictEqual(sortedSpatial.map(c => c.id), ['s_r1_c1', 's_r1_c2', 's_r2_c1', 's_r2_c2']);
console.log('✅ Test 7 PASSED: 2D Canvas reading order (Row 1 Col 1 -> Col 2 -> Row 2 Col 1 -> Col 2) verified.\n');

// ---------------------------------------------------------------------
// Test 8: Explanation Generation & Confidence Reporting
// ---------------------------------------------------------------------
console.log('--- Test 8: Explanations and Confidence Scoring ---');

const explanationReport = FlowSmartOrder.explainSequence(sortedScenes);
assert.strictEqual(typeof explanationReport.summary, 'string');
assert.ok(explanationReport.avgConfidence >= 90, `Expected avgConfidence >= 90, got ${explanationReport.avgConfidence}`);
assert.strictEqual(explanationReport.clips.length, 4);
assert.strictEqual(explanationReport.clips[0].positionText, '#01');
assert.ok(explanationReport.clips[0].explanation.includes('01'));
console.log('Report Summary:', explanationReport.summary);
console.log('✅ Test 8 PASSED: ExplainSequence generated comprehensive, high-confidence reports.\n');

// ---------------------------------------------------------------------
// Test 9: Edge cases (empty array, 1 clip, duplicate prompts)
// ---------------------------------------------------------------------
console.log('--- Test 9: Edge cases ---');

assert.deepStrictEqual(FlowSmartOrder.sortClips([]), []);
const single = [{ id: '1', promptText: 'Single clip' }];
assert.deepStrictEqual(FlowSmartOrder.sortClips(single).map(c => c.id), ['1']);

// Identical prompts maintain stable chronological order
const duplicates = [
  { id: 'dup2', promptText: 'Identical prompt', discoveredOrder: 2 },
  { id: 'dup1', promptText: 'Identical prompt', discoveredOrder: 1 }
];
const sortedDups = FlowSmartOrder.sortClips(duplicates, 'smart');
assert.deepStrictEqual(sortedDups.map(c => c.id), ['dup1', 'dup2']);

console.log('✅ Test 9 PASSED: All boundary and edge cases handled robustly.\n');

// ---------------------------------------------------------------------
// Test 10: Mixed [Boost ⚡] tags and interpolation with unnumbered clips
// ---------------------------------------------------------------------
console.log('--- Test 10: Mixed Boost clips and narrative interpolation ---');

const mixedClips = [
  { id: 'm3', promptText: '[Boost ⚡] Scene 03: Final victory, sunset and credits', isBoost: true, discoveredOrder: 1 },
  { id: 'm1', promptText: '[Boost ⚡] Scene 01: Wide establishing shot at dawn', isBoost: true, discoveredOrder: 2 },
  { id: 'm2', promptText: 'Then, travelers walking and exploring the misty forest', isBoost: false, discoveredOrder: 3 }
];

const sortedMixed = FlowSmartOrder.sortClips(mixedClips, 'smart');
assert.deepStrictEqual(sortedMixed.map(c => c.id), ['m1', 'm2', 'm3']);
console.log('✅ Test 10 PASSED: Mixed Boost clips and unnumbered clips interpolated in proper order.\n');

// ---------------------------------------------------------------------
// Test 11: French & English Ordinal sequence sorting (Words & Abbreviations)
// ---------------------------------------------------------------------
console.log('--- Test 11: French & English Ordinal Sequence Sorting ---');

const frOrdClips = [
  { id: 'c3', promptText: 'Troisième scène : un combat' },
  { id: 'c1', promptText: 'Première scène : une découverte' },
  { id: 'c4', promptText: 'Quatrième scène : la fuite' },
  { id: 'c2', promptText: 'Deuxième scène : la poursuite' },
  { id: 'c5', promptText: 'Cinquième scène : le calme' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(frOrdClips).map(c => c.id), ['c1', 'c2', 'c3', 'c4', 'c5']);

const enOrdClips = [
  { id: 'e3', promptText: '3rd shot: temple begins collapsing' },
  { id: 'e1', promptText: '1st shot: entering the temple' },
  { id: 'e5', promptText: '5th shot: resting outside' },
  { id: 'e2', promptText: '2nd shot: discovering the artifact' },
  { id: 'e4', promptText: '4th shot: escaping' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(enOrdClips).map(c => c.id), ['e1', 'e2', 'e3', 'e4', 'e5']);

const abbrClips = [
  { id: 'a3', promptText: '3ème scène : le pont' },
  { id: 'a1', promptText: '1ère scène : le départ' },
  { id: 'a2', promptText: '2ème scène : la plaine' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(abbrClips).map(c => c.id), ['a1', 'a2', 'a3']);

console.log('✅ Test 11 PASSED: French and English word and abbreviated ordinals sorted with 100% precision.\n');

// ---------------------------------------------------------------------
// Test 12: Sub-scenes, Episodes, Videos and List prefixes
// ---------------------------------------------------------------------
console.log('--- Test 12: Sub-scenes, Episodes, Videos & List Prefixes ---');

const subSceneClips = [
  { id: 's1b', promptText: 'Scene 1B : conversation' },
  { id: 's2a', promptText: 'Scene 2A : action' },
  { id: 's1a', promptText: 'Scene 1A : panorama' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(subSceneClips).map(c => c.id), ['s1a', 's1b', 's2a']);

const epClips = [
  { id: 'ep3', promptText: 'Épisode 3 : Le dénouement' },
  { id: 'ep1', promptText: 'Épisode 1 : Le réveil' },
  { id: 'ep2', promptText: 'Épisode 2 : La tempête' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(epClips).map(c => c.id), ['ep1', 'ep2', 'ep3']);

const listClips = [
  { id: 'l2', promptText: '2) Progression dans la vallée' },
  { id: 'l3', promptText: '3) Coucher de soleil final' },
  { id: 'l1', promptText: '1) Ouverture au matin' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(listClips).map(c => c.id), ['l1', 'l2', 'l3']);

console.log('✅ Test 12 PASSED: Sub-scenes, Episodes, and List prefixes sorted properly.\n');

// ---------------------------------------------------------------------
// Test 13: Single Explicit Anchor with Unnumbered Clips (Anchor Bug Fix)
// ---------------------------------------------------------------------
console.log('--- Test 13: Single Explicit Anchor Position Handling ---');

const anchorClips = [
  { id: 'c1', promptText: 'Scene 1: Introduction' },
  { id: 'c2', promptText: 'A peaceful morning in the village' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(anchorClips).map(c => c.id), ['c1', 'c2']);

const oneInFourClips = [
  { id: 'f2', promptText: 'A car driving through the desert' },
  { id: 'f4', promptText: 'Ending credits roll' },
  { id: 'f1', promptText: 'Scene 1: Intro sequence' },
  { id: 'f3', promptText: 'Explosion and confrontation' }
];
assert.deepStrictEqual(FlowSmartOrder.sortClips(oneInFourClips).map(c => c.id), ['f1', 'f2', 'f3', 'f4']);

console.log('✅ Test 13 PASSED: Single explicit anchor properly anchors sequence position.\n');

// ---------------------------------------------------------------------
// Test 14: Substring False Positive Rejection
// ---------------------------------------------------------------------
console.log('--- Test 14: Substring False Positive Rejection ---');

assert.strictEqual(FlowSmartOrder.analyzeNarrativeStage('A 3D render of a futuristic robot').stage, 'neutral');
assert.strictEqual(FlowSmartOrder.analyzeNarrativeStage('A person speaking to the crowd').stage, 'neutral');
assert.strictEqual(FlowSmartOrder.analyzeNarrativeStage('Un tableau raffiné avec reflets dorés').stage, 'neutral');
assert.strictEqual(FlowSmartOrder.analyzeNarrativeStage('Un portefeuille en cuir').stage, 'neutral');
assert.strictEqual(FlowSmartOrder.analyzeNarrativeStage('Un paysage aux confins de la terre').stage, 'neutral');

console.log('✅ Test 14 PASSED: Technical and common substrings cleanly rejected from false positive matches.\n');

console.log('=== ALL FlowSmartOrder TESTS PASSED! ===');
