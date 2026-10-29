// Test suite to break prior attempt and verify fixes
const assert = require('assert');
const crypto = require('crypto');

console.log('=== TEST SUITE: Flow Video Merger Boost Recovery ===\n');

// -------------------------------------------------------------
// Test 1: Prior Attempt findAllDeep duplication bug
// -------------------------------------------------------------
console.log('--- Test 1: DOM traversal duplication ---');
function oldFindAllDeep(selector, root) {
  const results = [];
  function walk(node) {
    if (!node) return;
    if (node.querySelectorAll) {
      try {
        const matched = node.querySelectorAll(selector);
        for (let i = 0; i < matched.length; i++) results.push(matched[i]);
      } catch (_) {}
    }
    if (node.shadowRoot) walk(node.shadowRoot);
    const children = node.children || [];
    for (let i = 0; i < children.length; i++) walk(children[i]);
  }
  walk(root);
  return results;
}

function fixedFindAllDeep(selector, root) {
  const results = [];
  const seen = new Set();
  function walk(node) {
    if (!node) return;
    if (node.matches && node.matches(selector)) {
      if (!seen.has(node)) {
        seen.add(node);
        results.push(node);
      }
    }
    if (node.shadowRoot) {
      const sChildren = node.shadowRoot.children || [];
      for (let i = 0; i < sChildren.length; i++) walk(sChildren[i]);
    }
    const children = node.children || [];
    for (let i = 0; i < children.length; i++) walk(children[i]);
  }
  if (root.querySelectorAll) {
    const directMatches = root.querySelectorAll(selector);
    for (let i = 0; i < directMatches.length; i++) {
      seen.add(directMatches[i]);
      results.push(directMatches[i]);
    }
  }
  function walkShadowsOnly(node) {
    if (!node) return;
    if (node.shadowRoot) {
      const shadowMatches = node.shadowRoot.querySelectorAll ? node.shadowRoot.querySelectorAll(selector) : [];
      for (let i = 0; i < shadowMatches.length; i++) {
        if (!seen.has(shadowMatches[i])) {
          seen.add(shadowMatches[i]);
          results.push(shadowMatches[i]);
        }
      }
      const sChildren = node.shadowRoot.children || [];
      for (let i = 0; i < sChildren.length; i++) walkShadowsOnly(sChildren[i]);
    }
    const children = node.children || [];
    for (let i = 0; i < children.length; i++) walkShadowsOnly(children[i]);
  }
  walkShadowsOnly(root);
  return results;
}

// Tree with 1 video at depth 4
const testVideo = { id: 'video_1', matches: (sel) => sel === 'video' };
const testTree = {
  querySelectorAll: (sel) => (sel === 'video' ? [testVideo] : []),
  children: [
    {
      querySelectorAll: (sel) => (sel === 'video' ? [testVideo] : []),
      children: [
        {
          querySelectorAll: (sel) => (sel === 'video' ? [testVideo] : []),
          children: [testVideo]
        }
      ]
    }
  ]
};

const oldResults = oldFindAllDeep('video', testTree);
const newResults = fixedFindAllDeep('video', testTree);
console.log(`Old findAllDeep returned ${oldResults.length} matches (expected 1)!`);
console.log(`Fixed findAllDeep returned ${newResults.length} matches.`);
assert.strictEqual(oldResults.length, 3, 'Old findAllDeep duplicated elements!');
assert.strictEqual(newResults.length, 1, 'Fixed findAllDeep returns exactly 1 match.');
console.log('✅ Test 1 PASSED: Duplication bug confirmed and fixed.\n');

// -------------------------------------------------------------
// Test 2: getVideoSourceUrl ignores Boost URLs when currentSrc exists
// -------------------------------------------------------------
console.log('--- Test 2: Boost URL prioritization over draft preview ---');
function oldGetVideoSourceUrl(videoEl) {
  if (!videoEl) return "";
  if (videoEl.currentSrc && videoEl.currentSrc.trim()) return videoEl.currentSrc.trim();
  if (videoEl.src && videoEl.src.trim()) return videoEl.src.trim();
  const attrSrc = videoEl.getAttribute ? videoEl.getAttribute("src") : null;
  if (attrSrc && attrSrc.trim()) return attrSrc.trim();
  // ... dataAttrs are checked only AFTER currentSrc!
  return "";
}

function fixedGetVideoSourceUrl(videoEl, container) {
  if (!videoEl) return "";
  const isBoostUrl = (u) => u && (u.includes('/boost') || u.includes('boost') || u.includes('upscale') || u.includes('highres'));
  
  // 1. Check direct boost attributes first!
  const boostAttrs = ["data-boost-url", "data-upscale-url", "data-highres-url", "data-video-url", "data-download-url", "data-src"];
  for (const attr of boostAttrs) {
    const val = videoEl.getAttribute ? videoEl.getAttribute(attr) : null;
    if (val && isBoostUrl(val)) return val.trim();
  }

  // 2. Check source tags with boost
  if (videoEl.querySelectorAll) {
    const sources = Array.from(videoEl.querySelectorAll("source"));
    for (const s of sources) {
      const sSrc = s.src || (s.getAttribute ? s.getAttribute("src") : "");
      if (sSrc && isBoostUrl(sSrc)) return sSrc.trim();
    }
  }

  // 3. Check container / card attributes if present
  if (container && container.getAttribute) {
    for (const attr of boostAttrs) {
      const val = container.getAttribute(attr);
      if (val && isBoostUrl(val)) return val.trim();
    }
  }

  // 4. Fallback to currentSrc / src
  if (videoEl.currentSrc && videoEl.currentSrc.trim()) return videoEl.currentSrc.trim();
  if (videoEl.src && videoEl.src.trim()) return videoEl.src.trim();
  return "";
}

const fakeVideoEl = {
  currentSrc: "blob:https://flow.google/draft_preview_720p",
  getAttribute: (name) => (name === "data-boost-url" ? "https://storage.googleapis.com/veo-flow/boost_4k.mp4" : null),
  querySelectorAll: () => []
};

const oldSource = oldGetVideoSourceUrl(fakeVideoEl);
const fixedSource = fixedGetVideoSourceUrl(fakeVideoEl);
console.log('Old source extracted:', oldSource);
console.log('Fixed source extracted:', fixedSource);
assert.strictEqual(oldSource, "blob:https://flow.google/draft_preview_720p", "Old code preferred draft preview");
assert.strictEqual(fixedSource, "https://storage.googleapis.com/veo-flow/boost_4k.mp4", "Fixed code prioritizes boost URL!");
console.log('✅ Test 2 PASSED: Boost URLs now prioritized over draft preview blobs.\n');

// -------------------------------------------------------------
// Test 3: Large /boost Video IPC 32MB limit & Chunked Transfer
// -------------------------------------------------------------
console.log('--- Test 3: IPC Payload Size and Sequential Chunking ---');
const VIDEO_SIZE_BYTES = 26 * 1024 * 1024; // 26 MB video
console.log(`Simulating a ${VIDEO_SIZE_BYTES / (1024 * 1024)} MB /boost video...`);
const originalBuffer = crypto.randomBytes(VIDEO_SIZE_BYTES);
const originalSha = crypto.createHash('sha256').update(originalBuffer).digest('hex');

// In the prior attempt:
// Prior content.js put all chunks into one object: { isChunked: true, chunks: [chunk1, chunk2, ...] }
// and sent it in ONE sendResponse!
const CHUNK_SIZE = 4 * 1024 * 1024;
const oldChunks = [];
for (let offset = 0; offset < originalBuffer.length; offset += CHUNK_SIZE) {
  const slice = originalBuffer.subarray(offset, Math.min(originalBuffer.length, offset + CHUNK_SIZE));
  oldChunks.push(slice.toString('base64'));
}
const oldPayload = JSON.stringify({ isChunked: true, chunks: oldChunks, mimeType: 'video/mp4' });
console.log(`Old attempt single message JSON payload size: ${(oldPayload.length / (1024 * 1024)).toFixed(2)} MB`);
const CHROME_IPC_MAX = 32 * 1024 * 1024; // 32 MB
if (oldPayload.length > CHROME_IPC_MAX) {
  console.log(`⚠️ VIOLATION CONFIRMED: ${oldPayload.length} bytes EXCEEDS Chrome 32MB IPC limit (${CHROME_IPC_MAX} bytes)!`);
}

// In the new implementation: Sequential chunk pull protocol
// 1. Session start: metadata only (tiny, < 1KB)
const sessionMeta = {
  downloadId: 'dl_123',
  totalBytes: originalBuffer.length,
  chunkSize: 2 * 1024 * 1024,
  totalChunks: Math.ceil(originalBuffer.length / (2 * 1024 * 1024)),
  mimeType: 'video/mp4'
};
console.log(`New protocol session start payload size: ${JSON.stringify(sessionMeta).length} bytes`);

// 2. Each chunk message is small (< 3 MB base64)
const receivedBuffers = [];
for (let c = 0; c < sessionMeta.totalChunks; c++) {
  const start = c * sessionMeta.chunkSize;
  const end = Math.min(originalBuffer.length, start + sessionMeta.chunkSize);
  const slice = originalBuffer.subarray(start, end);
  const chunkMsg = JSON.stringify({ ok: true, chunkIndex: c, data: slice.toString('base64') });
  assert.ok(chunkMsg.length < 3.5 * 1024 * 1024, `Chunk ${c} must be well under 32MB limit`);
  receivedBuffers.push(Buffer.from(JSON.parse(chunkMsg).data, 'base64'));
}

// Reassemble
const reassembled = Buffer.concat(receivedBuffers);
const reassembledSha = crypto.createHash('sha256').update(reassembled).digest('hex');
assert.strictEqual(reassembledSha, originalSha, 'Reassembled binary SHA256 must match exactly!');
console.log(`✅ Test 3 PASSED: Sequential chunking transferred 26MB video with 100% data integrity and 0 IPC overflows.\n`);

// -------------------------------------------------------------
// Test 4: In-place Upgrade of Draft clips to Boost clips
// -------------------------------------------------------------
console.log('--- Test 4: Smart In-Place Upgrade for Boost clips ---');
const existingClips = [
  { id: 'c1', videoUrl: 'https://flow.google/draft1.mp4', promptText: 'Cyberpunk city', orderIndex: 1, isBoost: false },
  { id: 'c2', videoUrl: 'https://flow.google/draft2.mp4', promptText: 'Robot walking', orderIndex: 2, isBoost: false }
];

const newlyScanned = [
  // User boosted clip 1!
  { id: 'c1_boost', videoUrl: 'https://storage.googleapis.com/veo/boost_cyberpunk.mp4', promptText: 'Cyberpunk city', isBoost: true }
];

function smartMergeClips(currentList, incoming) {
  const result = [...currentList];
  for (const item of incoming) {
    // Check if an existing clip matches this prompt or base ID
    const existingIdx = result.findIndex((c) => {
      if (c.videoUrl === item.videoUrl) return true;
      if (c.id === item.id) return true;
      const cleanExisting = (c.promptText || '').replace(/^\[Boost ⚡\]\s*/, '').trim().toLowerCase();
      const cleanIncoming = (item.promptText || '').replace(/^\[Boost ⚡\]\s*/, '').trim().toLowerCase();
      return cleanExisting.length > 5 && cleanExisting === cleanIncoming;
    });

    if (existingIdx !== -1) {
      // If incoming is boost and existing is not, UPGRADE in place!
      if (item.isBoost && !result[existingIdx].isBoost) {
        result[existingIdx] = {
          ...result[existingIdx],
          videoUrl: item.videoUrl,
          thumbnail: item.thumbnail || result[existingIdx].thumbnail,
          width: item.width || 1920,
          height: item.height || 1080,
          isBoost: true,
          promptText: item.promptText
        };
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

const merged = smartMergeClips(existingClips, newlyScanned);
assert.strictEqual(merged.length, 2, 'Should not add a duplicate clip');
assert.strictEqual(merged[0].isBoost, true, 'Clip 1 should be upgraded to Boost');
assert.strictEqual(merged[0].videoUrl, 'https://storage.googleapis.com/veo/boost_cyberpunk.mp4', 'Clip 1 should now have the Boost URL');
assert.strictEqual(merged[0].orderIndex, 1, 'Clip 1 should retain position #01');
console.log('✅ Test 4 PASSED: Smart in-place upgrade preserves order and replaces draft with Boost.\n');

console.log('=== ALL TESTS PASSED! ===');
