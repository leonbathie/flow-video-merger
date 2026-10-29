// Deep verification test suite for Flow Video Merger /boost recovery
const assert = require('assert');
const crypto = require('crypto');

console.log('=== DEEP INTEGRATION TEST SUITE: Flow Video Merger ===\n');

// -------------------------------------------------------------
// Test 1: Complex Nested Shadow DOM & LitElement Custom Components
// -------------------------------------------------------------
console.log('--- Test 1: Multi-level Shadow DOM without Duplicates ---');

function findAllDeep(selector, root) {
  const results = [];
  const seen = new Set();

  if (root.querySelectorAll) {
    try {
      const matches = root.querySelectorAll(selector);
      for (let i = 0; i < matches.length; i++) {
        if (!seen.has(matches[i])) {
          seen.add(matches[i]);
          results.push(matches[i]);
        }
      }
    } catch (_) {}
  }

  function walkShadows(node) {
    if (!node) return;
    if (node.shadowRoot) {
      if (node.shadowRoot.querySelectorAll) {
        try {
          const shadowMatches = node.shadowRoot.querySelectorAll(selector);
          for (let i = 0; i < shadowMatches.length; i++) {
            if (!seen.has(shadowMatches[i])) {
              seen.add(shadowMatches[i]);
              results.push(shadowMatches[i]);
            }
          }
        } catch (_) {}
      }
      const sChildren = node.shadowRoot.children || [];
      for (let i = 0; i < sChildren.length; i++) {
        walkShadows(sChildren[i]);
      }
    }
    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
      walkShadows(children[i]);
    }
  }

  walkShadows(root);
  return results;
}

// Build a tree with 3 videos: 1 in light DOM, 1 in a Lit component shadowRoot, 1 in a nested modal shadowRoot
const videoLight = { id: 'v_light' };
const videoShadow1 = { id: 'v_shadow_1' };
const videoShadow2 = { id: 'v_shadow_nested' };

const mockDocument = {
  querySelectorAll: (sel) => (sel === 'video' ? [videoLight] : []),
  children: [
    {
      tagName: 'FLOW-GALLERY',
      shadowRoot: {
        querySelectorAll: (sel) => (sel === 'video' ? [videoShadow1] : []),
        children: [
          {
            tagName: 'FLOW-BOOST-MODAL',
            shadowRoot: {
              querySelectorAll: (sel) => (sel === 'video' ? [videoShadow2] : []),
              children: []
            },
            children: []
          }
        ]
      },
      children: []
    }
  ]
};

const discoveredVideos = findAllDeep('video', mockDocument);
console.log(`Discovered videos in nested Shadow DOM: ${discoveredVideos.length} (expected 3)`);
assert.strictEqual(discoveredVideos.length, 3);
assert.deepStrictEqual(discoveredVideos.map((v) => v.id), ['v_light', 'v_shadow_1', 'v_shadow_nested']);
console.log('✅ Test 1 PASSED: All 3 videos found with zero duplicates across nested ShadowRoots.\n');

// -------------------------------------------------------------
// Test 2: Source Extraction with Card Container Boost Prioritization
// -------------------------------------------------------------
console.log('--- Test 2: Card Container Boost Detection ---');

function isBoostIndicator(str) {
  if (!str || typeof str !== 'string') return false;
  const lower = str.toLowerCase();
  return (
    lower.includes('/boost') ||
    lower.includes('boost') ||
    lower.includes('upscale') ||
    lower.includes('highres') ||
    lower.includes('1080p') ||
    lower.includes('4k')
  );
}

function extractUrlFromElement(el) {
  if (!el) return '';
  const priorityAttrs = [
    'data-boost-url',
    'data-upscale-url',
    'data-highres-url',
    'data-video-url',
    'data-download-url',
    'data-playback-url',
    'data-src',
    'data-url',
    'data-orig-src',
    'data-stream-url'
  ];

  for (const attr of priorityAttrs) {
    const val = el.getAttribute ? el.getAttribute(attr) : null;
    if (val && isBoostIndicator(val)) return val.trim();
  }
  for (const attr of priorityAttrs) {
    const val = el.getAttribute ? el.getAttribute(attr) : null;
    if (val && val.trim()) return val.trim();
  }
  if (el.tagName === 'A' && el.href) {
    return el.href.trim();
  }
  return '';
}

function getVideoSourceUrl(videoEl) {
  if (!videoEl) return '';

  const directElUrl = extractUrlFromElement(videoEl);
  if (directElUrl && isBoostIndicator(directElUrl)) return directElUrl;

  const sources = Array.from(videoEl.querySelectorAll ? videoEl.querySelectorAll('source') : []);
  let bestSourceUrl = '';
  for (const source of sources) {
    const sSrc = source.src || (source.getAttribute ? source.getAttribute('src') : '') || extractUrlFromElement(source);
    if (sSrc && sSrc.trim()) {
      if (isBoostIndicator(sSrc)) return sSrc.trim();
      if (!bestSourceUrl) bestSourceUrl = sSrc.trim();
    }
  }

  // Inspect parent card containers
  let container = videoEl.parentElement;
  for (let depth = 0; depth < 8 && container; depth++) {
    const containerBoostUrl = extractUrlFromElement(container);
    if (containerBoostUrl && isBoostIndicator(containerBoostUrl)) {
      return containerBoostUrl;
    }

    if (container.querySelectorAll) {
      const actionLinks = container.querySelectorAll("a[href], button, [role='button'], [data-boost-url], [data-download-url]");
      for (let j = 0; j < actionLinks.length; j++) {
        const linkUrl = extractUrlFromElement(actionLinks[j]);
        if (linkUrl && isBoostIndicator(linkUrl)) {
          return linkUrl;
        }
      }
    }
    container = container.parentElement;
  }

  if (bestSourceUrl) return bestSourceUrl;
  if (directElUrl) return directElUrl;
  if (videoEl.currentSrc && videoEl.currentSrc.trim()) return videoEl.currentSrc.trim();
  if (videoEl.src && videoEl.src.trim()) return videoEl.src.trim();
  return '';
}

// Scenario: A generation card with a 720p draft blob in <video currentSrc>,
// but a download button on the card with data-boost-url pointing to the 4K Veo render
const mockCard = {
  getAttribute: () => null,
  querySelectorAll: (sel) => [
    {
      tagName: 'BUTTON',
      getAttribute: (a) => (a === 'data-boost-url' ? 'https://storage.googleapis.com/veo-flow/boost_final_4k.mp4' : null)
    }
  ]
};

const mockVideoInCard = {
  currentSrc: 'blob:https://flow.google/draft_preview_720p_xyz',
  parentElement: mockCard,
  getAttribute: () => null,
  querySelectorAll: () => []
};

const resolvedSource = getVideoSourceUrl(mockVideoInCard);
console.log('Resolved source for video in boosted card:', resolvedSource);
assert.strictEqual(resolvedSource, 'https://storage.googleapis.com/veo-flow/boost_final_4k.mp4');
console.log('✅ Test 2 PASSED: Parent card boost URL correctly identified and selected over draft blob.\n');

// -------------------------------------------------------------
// Test 3: High-load 40 MB 4K Video Chunked Transfer & Integrity
// -------------------------------------------------------------
console.log('--- Test 3: 40 MB 4K Video Chunked Transfer (Simulating IPC Channel) ---');

const FILE_SIZE = 40 * 1024 * 1024; // 40 MB
const sourceBuffer = crypto.randomBytes(FILE_SIZE);
const expectedSha256 = crypto.createHash('sha256').update(sourceBuffer).digest('hex');

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
const totalChunks = Math.ceil(sourceBuffer.length / CHUNK_SIZE);
console.log(`Splitting ${FILE_SIZE / (1024 * 1024)} MB video into ${totalChunks} chunks of 2 MB...`);

const CHROME_IPC_LIMIT = 32 * 1024 * 1024; // 32 MB
const transmittedByteArrays = [];

for (let c = 0; c < totalChunks; c++) {
  const offset = c * CHUNK_SIZE;
  const slice = sourceBuffer.subarray(offset, Math.min(sourceBuffer.length, offset + CHUNK_SIZE));

  // Fast block conversion to base64
  const BLOCK = 0x8000;
  let binary = '';
  for (let i = 0; i < slice.length; i += BLOCK) {
    binary += String.fromCharCode.apply(null, slice.subarray(i, Math.min(slice.length, i + BLOCK)));
  }
  const base64Data = Buffer.from(binary, 'binary').toString('base64');

  // Simulated Chrome IPC message
  const messagePayload = JSON.stringify({ ok: true, chunkIndex: c, data: base64Data });
  assert.ok(messagePayload.length < 3.2 * 1024 * 1024, `Chunk message must not exceed 3.2 MB (is ${messagePayload.length})`);
  assert.ok(messagePayload.length < CHROME_IPC_LIMIT, 'Chunk message must never exceed 32 MB limit');

  // Reconstruct on side panel end
  const decodedBinary = Buffer.from(JSON.parse(messagePayload).data, 'base64');
  transmittedByteArrays.push(decodedBinary);
}

const reassembledBuffer = Buffer.concat(transmittedByteArrays);
const actualSha256 = crypto.createHash('sha256').update(reassembledBuffer).digest('hex');

assert.strictEqual(actualSha256, expectedSha256, 'Reassembled 40 MB video SHA256 must match exactly!');
assert.strictEqual(reassembledBuffer.length, FILE_SIZE, 'Reassembled byte count must match exactly!');
console.log('✅ Test 3 PASSED: 40 MB 4K video transferred cleanly with 100% integrity across 20 chunks.\n');

// -------------------------------------------------------------
// Test 4: Preserving Order with In-Place Upgrade
// -------------------------------------------------------------
console.log('--- Test 4: In-Place Upgrade Preserving Strict Order (#01, #02, #03) ---');

function smartMergeClips(currentList, scanned, sortMode) {
  if (currentList.length === 0) return scanned;
  const result = [...currentList];

  for (const incoming of scanned) {
    const isIncomingBoost = Boolean(
      incoming.isBoost ||
      (incoming.videoUrl && (incoming.videoUrl.includes('/boost') || incoming.videoUrl.includes('boost') || incoming.videoUrl.includes('upscale')))
    );

    const existingIdx = result.findIndex((existing) => {
      if (existing.videoUrl === incoming.videoUrl) return true;
      if (existing.id === incoming.id) return true;
      const cleanExisting = (existing.promptText || '').replace(/^\[Boost ⚡\]\s*/i, '').trim().toLowerCase();
      const cleanIncoming = (incoming.promptText || '').replace(/^\[Boost ⚡\]\s*/i, '').trim().toLowerCase();
      return cleanExisting.length > 5 && cleanExisting === cleanIncoming;
    });

    if (existingIdx !== -1) {
      const existing = result[existingIdx];
      if (isIncomingBoost && (!existing.isBoost || !existing.videoUrl.includes('boost'))) {
        result[existingIdx] = {
          ...existing,
          videoUrl: incoming.videoUrl,
          thumbnail: incoming.thumbnail || existing.thumbnail,
          width: incoming.width || 1920,
          height: incoming.height || 1080,
          isBoost: true,
          promptText: incoming.promptText.startsWith('[Boost ⚡]') ? incoming.promptText : `[Boost ⚡] ${incoming.promptText}`
        };
      }
    } else {
      result.push(incoming);
    }
  }

  return result;
}

const sequence = [
  { id: 'clip_1', orderIndex: 1, promptText: 'Scene 1: Introduction in Tokyo', videoUrl: 'https://flow.google/d1.mp4', isBoost: false },
  { id: 'clip_2', orderIndex: 2, promptText: 'Scene 2: Cyberpunk chase', videoUrl: 'https://flow.google/d2.mp4', isBoost: false },
  { id: 'clip_3', orderIndex: 3, promptText: 'Scene 3: Sunset finale', videoUrl: 'https://flow.google/d3.mp4', isBoost: false }
];

// User boosts Scene 2 in Google Flow
const newlyScannedFromPage = [
  { id: 'clip_2_boosted', promptText: '[Boost ⚡] Scene 2: Cyberpunk chase', videoUrl: 'https://flow.google/boost/cyberpunk_4k.mp4', isBoost: true }
];

const updatedSequence = smartMergeClips(sequence, newlyScannedFromPage, 'dom');

assert.strictEqual(updatedSequence.length, 3, 'Length must remain 3 (no duplicate clip created)');
assert.strictEqual(updatedSequence[0].id, 'clip_1');
assert.strictEqual(updatedSequence[1].id, 'clip_2', 'Scene 2 must stay in slot #02');
assert.strictEqual(updatedSequence[1].videoUrl, 'https://flow.google/boost/cyberpunk_4k.mp4', 'Scene 2 must now have the Boost URL');
assert.strictEqual(updatedSequence[1].isBoost, true, 'Scene 2 must be marked as Boost');
assert.strictEqual(updatedSequence[2].id, 'clip_3', 'Scene 3 must stay in slot #03');
console.log('✅ Test 4 PASSED: In-place upgrade kept all positions (#01, #02, #03) strictly intact.\n');

console.log('=== ALL DEEP INTEGRATION TESTS PASSED! ===');
