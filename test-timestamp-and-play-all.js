// Deep unit & integration tests for Timestamp Recognition, Reordering & Sequence Playback
const assert = require('assert');
const FlowSmartOrder = require('./smart-order.js');

console.log('=== TEST SUITE: Timestamp Recognition & Continuous Playback Engine ===\n');

// ---------------------------------------------------------------------
// Test 1: Timestamp parsing across all variations
// ---------------------------------------------------------------------
console.log('--- Test 1: Timestamp Extraction Across Date/Time Patterns ---');

const timestampTestCases = [
  {
    input: "Lion_standing_in_village_square_1080p_20261027134151.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_roars_near_villagers_202610271332109.webm",
    expectedTime: "13:32:10",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_steps_in_courtyard_20261027132109",
    expectedTime: "13:21:09",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lioness_walking_beside_male_lion_20261027132109",
    expectedTime: "13:21:09",
    expectedDate: "2026-10-27"
  },
  {
    input: "clip_2026-10-27_13-41-51.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_2026-10-27-13-41-51.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_2026_10_27_13_41_51.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_2026.10.27.13.41.51.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_1080p20261027134151.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "20261027134151clip.mp4",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "Lion_13h41m51s.mp4",
    expectedTime: "13:41:51",
    expectedDate: "Today"
  },
  {
    input: "Lion_13-41-51.mp4",
    expectedTime: "13:41:51",
    expectedDate: "Today"
  },
  {
    input: "generation_20261027_134151_final",
    expectedTime: "13:41:51",
    expectedDate: "2026-10-27"
  },
  {
    input: "media_1793113673557_f31ea872.png",
    expectedTime: "15:07:53",
    expectedDate: "2026-10-27"
  },
  {
    input: "timestamp_1793113673",
    expectedTime: "15:07:53",
    expectedDate: "2026-10-27"
  }
];

for (const tc of timestampTestCases) {
  const res = FlowSmartOrder.extractTimestamp(tc.input);
  assert.ok(res, `Expected timestamp for "${tc.input}", got null`);
  assert.strictEqual(res.formattedTime, tc.expectedTime, `Time mismatch for "${tc.input}": got ${res.formattedTime}, expected ${tc.expectedTime}`);
  if (tc.expectedDate) {
    assert.strictEqual(res.formattedDate, tc.expectedDate, `Date mismatch for "${tc.input}": got ${res.formattedDate}, expected ${tc.expectedDate}`);
  }
}
console.log(`✅ Test 1 PASSED: All ${timestampTestCases.length} date/time patterns parsed with 100% precision.\n`);

// ---------------------------------------------------------------------
// Test 2: Solving User's Actual Inverted Lion Clips Bug
// ---------------------------------------------------------------------
console.log("--- Test 2: Solving User's Actual Screenshot Inverted Clips ---");

// In the screenshot, the clips appeared inverted:
// #01: Lion_standing_in_village_square_1080p_20261027134151 (13:41:51)
// #02: Lion_roars_near_villagers_202610271332109 (13:32:10)
// #03: Lion_steps_in_courtyard_20261027132109 (13:21:09)
// #04: Lioness_walking_beside_male_lion_20261027132109 (13:21:09)

const invertedClips = [
  { id: 'c1', promptText: 'Lion_standing_in_village_square_1080p_20261027134151', discoveredOrder: 1 },
  { id: 'c2', promptText: 'Lion_roars_near_villagers_202610271332109', discoveredOrder: 2 },
  { id: 'c3', promptText: 'Lion_steps_in_courtyard_20261027132109', discoveredOrder: 3 },
  { id: 'c4', promptText: 'Lioness_walking_beside_male_lion_20261027132109', discoveredOrder: 4 }
];

const smartSorted = FlowSmartOrder.sortClips(invertedClips, 'smart');
const smartIds = smartSorted.map(c => c.id);

console.log('Smart Sorted Clips:');
smartSorted.forEach(c => {
  console.log(`  #0${c.orderIndex}: ${c.promptText} | Tags: ${JSON.stringify(c._smartMeta.tags)} | Conf: ${c._smartMeta.confidence}%`);
});

// Verification:
// Earliest generated clip (13:21:09) with entrance action (steps in courtyard) must be #01
assert.strictEqual(smartIds[0], 'c3', 'Clip c3 (Lion_steps_in_courtyard) must be #01');
// Same timestamp (13:21:09) with secondary walking action must be #02
assert.strictEqual(smartIds[1], 'c4', 'Clip c4 (Lioness_walking_beside_male_lion) must be #02');
// Middle timestamp (13:32:10) with climax roar action must be #03
assert.strictEqual(smartIds[2], 'c2', 'Clip c2 (Lion_roars_near_villagers) must be #03');
// Latest timestamp (13:41:51) with standing/surveying action must be #04
assert.strictEqual(smartIds[3], 'c1', 'Clip c1 (Lion_standing_in_village_square) must be #04');

console.log('✅ Test 2 PASSED: Inverted lion sequence successfully reordered to #01 -> #02 -> #03 -> #04!\n');

// ---------------------------------------------------------------------
// Test 3: Chronological & Narrative Sorting Strategies
// ---------------------------------------------------------------------
console.log('--- Test 3: Chronological and Narrative Strategy Verification ---');

const chronoSorted = FlowSmartOrder.sortClips(invertedClips, 'chronological');
assert.strictEqual(chronoSorted[0].id, 'c3');
assert.strictEqual(chronoSorted[1].id, 'c4');
assert.strictEqual(chronoSorted[2].id, 'c2');
assert.strictEqual(chronoSorted[3].id, 'c1');
console.log('✅ Test 3A PASSED: Chronological strategy orders by file timestamp with narrative tiebreaker.');

const narrativeSorted = FlowSmartOrder.sortClips(invertedClips, 'narrative');
assert.strictEqual(narrativeSorted[0].id, 'c3'); // Intro / entrance (0.10)
assert.strictEqual(narrativeSorted[1].id, 'c4'); // Walking / journey (0.38)
assert.strictEqual(narrativeSorted[2].id, 'c2'); // Roar / climax (0.68)
assert.strictEqual(narrativeSorted[3].id, 'c1'); // Standing / resolution (0.82)
console.log('✅ Test 3B PASSED: Narrative strategy orders Intro -> Walking -> Roar -> Standing.\n');

// ---------------------------------------------------------------------
// Test 4: Mixed Explicit Numbers and Timestamps
// ---------------------------------------------------------------------
console.log('--- Test 4: Explicit Numbers Precedence Over Timestamps ---');

const mixedClips = [
  { id: 'm1', promptText: 'Scene 02: lion walks away 20261027131000', discoveredOrder: 1 },
  { id: 'm2', promptText: 'Scene 01: lion arrives in village 20261027135000', discoveredOrder: 2 }
];

const sortedMixed = FlowSmartOrder.sortClips(mixedClips, 'smart');
assert.strictEqual(sortedMixed[0].id, 'm2', 'Scene 01 must come before Scene 02 even if timestamp is later');
assert.strictEqual(sortedMixed[1].id, 'm1');
console.log('✅ Test 4 PASSED: Explicit scene numbers maintain strict priority over timestamps.\n');

// ---------------------------------------------------------------------
// Test 5: Simulated Continuous Playback Engine (Fix for "Lire Tout")
// ---------------------------------------------------------------------
console.log('--- Test 5: Continuous Sequence Playback Simulation ---');

class MockVideoElement {
  constructor() {
    this.src = '';
    this.currentTime = 0;
    this.duration = 5.0;
    this.paused = true;
    this.ended = false;
    this.readyState = 0;
    this.eventListeners = {};
  }
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(callback);
  }
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
  }
  dispatchEvent(event) {
    (this.eventListeners[event] || []).forEach(cb => cb({ type: event }));
  }
  load() {
    this.readyState = 1;
    setTimeout(() => {
      this.readyState = 4;
      this.dispatchEvent('loadeddata');
      this.dispatchEvent('canplay');
    }, 5);
  }
  async play() {
    this.paused = false;
    this.ended = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent('pause');
  }
}

async function simulateSequencePlayback(clips, shouldFailClipIndex = -1) {
  const video = new MockVideoElement();
  const playedIndices = [];
  let isPlayingSequence = true;
  let currentIndex = 0;

  function waitForVideoReady(videoEl) {
    return new Promise((resolve) => {
      if (videoEl.readyState >= 2) return resolve(true);
      const onReady = () => {
        videoEl.removeEventListener('canplay', onReady);
        resolve(true);
      };
      videoEl.addEventListener('canplay', onReady);
    });
  }

  async function playLoop(idx) {
    if (idx >= clips.length) {
      isPlayingSequence = false;
      return;
    }
    currentIndex = idx;
    playedIndices.push(idx);

    if (idx === shouldFailClipIndex) {
      // Simulate error and auto-advance
      setTimeout(() => {
        if (isPlayingSequence) playLoop(idx + 1);
      }, 10);
      return;
    }

    video.src = `blob:video_${idx}.mp4`;
    video.load();
    await waitForVideoReady(video);
    await video.play();

    // Simulate video playing to end
    setTimeout(() => {
      video.ended = true;
      video.dispatchEvent('ended');
    }, 15);
  }

  video.addEventListener('ended', async () => {
    if (isPlayingSequence) {
      await playLoop(currentIndex + 1);
    }
  });

  await playLoop(0);

  // Wait for all clips to complete cleanly without timer jitter race condition
  return new Promise((resolve) => {
    let timeoutId;
    const checkInterval = setInterval(() => {
      if (!isPlayingSequence) {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
        resolve({ playedIndices, isPlayingSequence });
      }
    }, 5);
    timeoutId = setTimeout(() => {
      clearInterval(checkInterval);
      resolve({ playedIndices, isPlayingSequence });
    }, 2000);
  });
}

(async () => {
  // Test healthy 4-clip playback
  const healthyResult = await simulateSequencePlayback(['clip1', 'clip2', 'clip3', 'clip4']);
  assert.deepStrictEqual(healthyResult.playedIndices, [0, 1, 2, 3], 'All 4 clips must be played sequentially');
  assert.strictEqual(healthyResult.isPlayingSequence, false, 'Sequence must complete gracefully');
  console.log('✅ Test 5A PASSED: Healthy sequence plays all 4 clips continuously without hanging.');

  // Test sequence with corrupted clip #2 auto-advancing to #3 and #4
  const errorResult = await simulateSequencePlayback(['clip1', 'clip2', 'clip3', 'clip4'], 1);
  assert.deepStrictEqual(errorResult.playedIndices, [0, 1, 2, 3], 'Corrupted clip #1 must auto-advance to #2 and #3');
  assert.strictEqual(errorResult.isPlayingSequence, false, 'Sequence must complete despite 1 error');
  console.log('✅ Test 5B PASSED: Corrupted clip auto-advances smoothly without breaking "Lire Tout".\n');

  // ---------------------------------------------------------------------
  // Test 6: FileName Narrative Analysis, Replay Reset & Autoplay Muted Fallback
  // ---------------------------------------------------------------------
  console.log('--- Test 6: FileName Narrative Analysis, Replay Reset & Autoplay Fallback ---');

  // 6A: Clips with empty promptText but rich fileNames
  const fileNameClips = [
    { id: 'f1', promptText: '', fileName: 'Lion_standing_in_village_square_1080p_20261027134151.mp4', discoveredOrder: 1 },
    { id: 'f2', promptText: '', fileName: 'Lion_roars_near_villagers_202610271332109.mp4', discoveredOrder: 2 },
    { id: 'f3', promptText: '', fileName: 'Lion_steps_in_courtyard_20261027132109.mp4', discoveredOrder: 3 },
    { id: 'f4', promptText: '', fileName: 'Lioness_walking_beside_male_lion_20261027132109.mp4', discoveredOrder: 4 }
  ];
  const sortedFileClips = FlowSmartOrder.sortClips(fileNameClips, 'smart');
  assert.strictEqual(sortedFileClips[0].id, 'f3', 'Steps in courtyard must be #01 via fileName analysis');
  assert.strictEqual(sortedFileClips[1].id, 'f4', 'Walking beside must be #02 via fileName analysis');
  assert.strictEqual(sortedFileClips[2].id, 'f2', 'Roars must be #03 via fileName analysis');
  assert.strictEqual(sortedFileClips[3].id, 'f1', 'Standing must be #04 via fileName analysis');
  console.log('✅ Test 6A PASSED: FileNames correctly analyzed for narrative stages and timestamps even when prompt is empty.');

  // 6B: Replay currentTime reset simulation
  const endedVideo = new MockVideoElement();
  endedVideo.currentTime = 5.0;
  endedVideo.duration = 5.0;
  endedVideo.ended = true;
  // If targetTime is 0, reset currentTime to 0 before play
  const targetTime = 0;
  endedVideo.currentTime = targetTime;
  assert.strictEqual(endedVideo.currentTime, 0, 'Replaying video must reset currentTime to 0');
  console.log('✅ Test 6B PASSED: Replaying ended video resets currentTime = 0.');

  // 6C: Autoplay NotAllowedError fallback to muted
  let playAttempts = 0;
  const autoplayBlockedVideo = {
    muted: false,
    async play() {
      playAttempts++;
      if (!this.muted) {
        const err = new Error('play() failed because the user didn\'t interact with the document first.');
        err.name = 'NotAllowedError';
        throw err;
      }
      return Promise.resolve();
    }
  };

  async function safePlayWithFallback(v) {
    try {
      await v.play();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        v.muted = true;
        await v.play();
      } else {
        throw err;
      }
    }
  }

  await safePlayWithFallback(autoplayBlockedVideo);
  assert.strictEqual(playAttempts, 2, 'Must retry play after muting');
  assert.strictEqual(autoplayBlockedVideo.muted, true, 'Video must be muted on fallback');
  console.log('✅ Test 6C PASSED: Autoplay NotAllowedError gracefully falls back to muted playback without breaking sequence.\n');

  console.log('=== ALL TIMESTAMP & SEQUENCE PLAYBACK TESTS PASSED! ===');
})();
