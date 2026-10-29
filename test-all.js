// Unified Test Runner: Flow Video Merger & Web Studio
// Runs all 12 automated integration and regression test suites with pass/fail tracking

const { spawnSync } = require('child_process');
const path = require('path');

const testFiles = [
  'test-suite-deep.js',
  'test-studio-and-smart-ordering.js',
  'test-smart-order.js',
  'test-timestamp-and-play-all.js',
  'test-break-and-verify-flow-retrieval.js',
  'test-flow-native-metadata.js',
  'test-extension-design-refresh.js',
  'test-i18n-and-bilingual.js',
  'test-not-same-site-fix.js',
  'test-break-and-verify.js',
  'test-flow-retrieval-pipeline.js',
  'test-generative-ui-cleanup.js',
  'test-sidepanel-auto-close-on-studio-open.js',
  'test-dialogs-and-translations.js'
];

console.log('================================================================');
console.log('🚀 FLOW VIDEO MERGER — COMPLETE AUTOMATED TEST SUITE RUNNER');
console.log(`Executing ${testFiles.length} test suites...`);
console.log('================================================================\n');

let passedCount = 0;
let failedCount = 0;
const results = [];
const startTime = Date.now();

for (const testFile of testFiles) {
  process.stdout.write(`▶ Running ${testFile.padEnd(42)} ... `);
  const suiteStart = Date.now();

  const child = spawnSync(process.execPath, [path.join(__dirname, testFile)], {
    cwd: __dirname,
    encoding: 'utf8',
    env: process.env
  });

  const durationMs = Date.now() - suiteStart;

  if (child.status === 0) {
    passedCount++;
    results.push({ file: testFile, status: 'PASS', durationMs });
    console.log(`✅ PASS (${durationMs}ms)`);
  } else {
    failedCount++;
    results.push({ file: testFile, status: 'FAIL', durationMs, output: child.stdout + child.stderr });
    console.log(`❌ FAIL (${durationMs}ms)`);
    console.error(`\n--- Error output for ${testFile} ---`);
    console.error(child.stdout);
    console.error(child.stderr);
    console.error('------------------------------------\n');
  }
}

const totalDurationMs = Date.now() - startTime;

console.log('\n================================================================');
console.log('📊 TEST EXECUTION SUMMARY:');
console.log(`Total Suites : ${testFiles.length}`);
console.log(`Passed       : ${passedCount}`);
console.log(`Failed       : ${failedCount}`);
console.log(`Total Time   : ${(totalDurationMs / 1000).toFixed(2)}s`);
console.log('================================================================\n');

if (failedCount > 0) {
  console.error(`❌ FAILURE: ${failedCount} test suite(s) failed.`);
  process.exit(1);
} else {
  console.log(`🎉 SUCCESS: All ${testFiles.length} test suites passed with 100% success rate!\n`);
  process.exit(0);
}
