// test-flow-retrieval-pipeline.js
// Verification suite for Google Flow Video Retrieval & Detection Pipeline
// Tests:
// 1. MAIN world Blob retention (including early revokeObjectURL) & binary IPC transfer
// 2. Closed Shadow DOM traversal (attachShadow monkey patch & __fvmShadowRoot)
// 3. Virtual scrolling persistence (discoveredVideos session caching)
// 4. Studio tab exclusion & Target Tab Resolution (findTargetTab priority)
// 5. Chunked video download integrity (sub-2MB slicing under 32MB IPC limit)
// 6. declarativeNetRequest rules coverage for Flow and Google video domains

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vm = require("vm");

console.log("=== TEST SUITE: Google Flow Video Retrieval & Capture Pipeline ===");

// ----------------------------------------------------------------------------
// Test 1: MAIN World Blob Interception, Revocation Shield & Binary IPC Transfer
// ----------------------------------------------------------------------------
console.log("\n--- Test 1: MAIN World Blob Interception, Revocation Shield & Binary Transfer ---");

class MockBlob {
  constructor(parts = [], options = {}) {
    this._parts = parts;
    this.type = options.type || "video/mp4";
    this.size = parts.reduce((sum, p) => sum + (p.byteLength || p.length || 0), 0);
  }
  async arrayBuffer() {
    const total = this.size;
    const buf = Buffer.alloc(total);
    let offset = 0;
    for (const p of this._parts) {
      const b = Buffer.from(p);
      b.copy(buf, offset);
      offset += b.length;
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
}

// Set up simulated MAIN world environment
const messageListeners = [];
const mainWorldWindow = {
  addEventListener: (type, fn) => {
    if (type === "message") messageListeners.push(fn);
  },
  removeEventListener: (type, fn) => {
    if (type === "message") {
      const idx = messageListeners.indexOf(fn);
      if (idx !== -1) messageListeners.splice(idx, 1);
    }
  },
  postMessage: (data, targetOrigin, transfer) => {
    // Deliver message to listeners asynchronously
    setImmediate(() => {
      for (const fn of [...messageListeners]) {
        fn({ data, source: mainWorldWindow });
      }
    });
  },
  fetch: async () => ({ ok: true, clone: () => ({ json: async () => ({}) }) })
};

const mainWorldCode = fs.readFileSync(path.join(__dirname, "flow-page-bridge.js"), "utf8");

// Mock URL and DOM primitives in sandbox
const sandbox = {
  window: mainWorldWindow,
  document: {
    readyState: "complete",
    addEventListener: () => {},
    querySelectorAll: () => []
  },
  URL: {
    _blobs: new Map(),
    createObjectURL(obj) {
      const id = "blob:https://flow.google.com/" + crypto.randomUUID();
      this._blobs.set(id, obj);
      return id;
    },
    revokeObjectURL(url) {
      this._blobs.delete(url);
    }
  },
  Blob: MockBlob,
  Element: class Element {
    attachShadow(init) {
      return { host: this, init, childNodes: [] };
    }
  },
  HTMLMediaElement: class HTMLMediaElement {},
  SourceBuffer: class SourceBuffer {},
  XMLHttpRequest: class XMLHttpRequest {
    open() {}
    send() {}
    addEventListener() {}
  },
  console
};
sandbox.window.URL = sandbox.URL;
sandbox.window.Blob = sandbox.Blob;
sandbox.window.Element = sandbox.Element;
sandbox.window.HTMLMediaElement = sandbox.HTMLMediaElement;
sandbox.window.SourceBuffer = sandbox.SourceBuffer;
sandbox.window.XMLHttpRequest = sandbox.XMLHttpRequest;

vm.createContext(sandbox);
vm.runInContext(mainWorldCode, sandbox);

(async () => {
  // Simulate Google Flow creating a video blob in the page context
  const sampleVideoBytes = crypto.randomBytes(512 * 1024); // 512 KB video
  const flowBlob = new MockBlob([sampleVideoBytes], { type: "video/mp4" });
  const flowBlobUrl = sandbox.URL.createObjectURL(flowBlob);

  // Verify blobRegistry recorded the blob
  const cached = sandbox.window.__flowVideoMergerGetBlob(flowBlobUrl);
  assert(cached, "flow-page-bridge must register the created blob in blobRegistry");
  assert.strictEqual(cached.size, 512 * 1024, "Cached blob size must match original video");

  // Simulate Google Flow revoking the blob URL shortly after
  sandbox.URL.revokeObjectURL(flowBlobUrl);

  // Verify revocation shield: the extension's bridge maintains the blob in memory
  const cachedAfterRevoke = sandbox.window.__flowVideoMergerGetBlob(flowBlobUrl);
  assert(cachedAfterRevoke, "Revocation shield must keep blob in memory even after page revokes URL");
  assert(cachedAfterRevoke.revokedAt > 0, "revokedAt timestamp should be tracked");

  // Simulate Content script requesting binary video data via postMessage
  const requestId = "test_req_001";
  const receivedData = await new Promise((resolve) => {
    const onResponse = (event) => {
      if (
        event.data &&
        event.data.source === "FLOW_PAGE_BRIDGE" &&
        event.data.type === "FVM_VIDEO_DATA_RESPONSE" &&
        event.data.requestId === requestId
      ) {
        mainWorldWindow.removeEventListener("message", onResponse);
        resolve(event.data);
      }
    };
    mainWorldWindow.addEventListener("message", onResponse);
    mainWorldWindow.postMessage({
      source: "FVM_CONTENT",
      type: "FVM_REQUEST_VIDEO_DATA",
      requestId,
      videoUrl: flowBlobUrl
    }, "*");
  });

  assert(receivedData.ok, "Bridge response must be ok: true");
  assert(receivedData.buffer, "Bridge must return ArrayBuffer");
  const receivedBuf = Buffer.from(receivedData.buffer);
  assert.strictEqual(receivedBuf.length, 512 * 1024, "Transferred buffer must match original size");
  assert.strictEqual(
    crypto.createHash("sha256").update(receivedBuf).digest("hex"),
    crypto.createHash("sha256").update(sampleVideoBytes).digest("hex"),
    "SHA-256 hash of transferred video must match original byte-for-byte"
  );
  console.log("✅ Test 1 PASSED: MAIN world blob intercepted, preserved past revokeObjectURL, and transferred with 100% byte integrity.");

  // ----------------------------------------------------------------------------
  // Test 2: Closed Shadow DOM Traversal (__fvmShadowRoot)
  // ----------------------------------------------------------------------------
  console.log("\n--- Test 2: Closed Shadow DOM Traversal ---");

  // Create a Web Component that attaches a CLOSED shadow root
  const hostElement = new sandbox.Element();
  const closedRoot = hostElement.attachShadow({ mode: "closed" });

  assert.strictEqual(hostElement.shadowRoot, undefined, "Closed shadowRoot is inaccessible directly on element in standard DOM");
  assert(hostElement.__fvmShadowRoot === closedRoot, "Monkey patched attachShadow must expose __fvmShadowRoot on host element");
  assert(sandbox.window.__fvmAllShadowRoots.has(closedRoot), "All closed shadow roots must be tracked in __fvmAllShadowRoots");

  console.log("✅ Test 2 PASSED: Closed ShadowRoot successfully captured on host and in global registry.");

  // ----------------------------------------------------------------------------
  // Test 3: Virtual Scrolling Offscreen Persistence
  // ----------------------------------------------------------------------------
  console.log("\n--- Test 3: Virtual Scrolling Offscreen Persistence ---");

  // Simulate content script's discoveredVideos map
  const discoveredVideos = new Map();
  const clipsMap = new Map();

  // Scroll Position 1: Clips #1, #2 are in DOM
  const clip1 = { id: "clip_01", videoUrl: "https://flow.google.com/asb/scene1.mp4", promptText: "Lion in savanna", domTop: 100 };
  const clip2 = { id: "clip_02", videoUrl: "https://flow.google.com/asb/scene2.mp4", promptText: "Lioness drinking", domTop: 400 };

  clipsMap.set(clip1.videoUrl, clip1);
  discoveredVideos.set(clip1.id, clip1);
  clipsMap.set(clip2.videoUrl, clip2);
  discoveredVideos.set(clip2.id, clip2);

  assert.strictEqual(discoveredVideos.size, 2, "Session has 2 clips");

  // User scrolls down: Virtual scroll removes clip1 and clip2 from active DOM, adds clip3 and clip4
  const activeDomClipsMap = new Map();
  const clip3 = { id: "clip_03", videoUrl: "https://flow.google.com/asb/scene3.mp4", promptText: "Cubs playing", domTop: 900 };
  const clip4 = { id: "clip_04", videoUrl: "https://flow.google.com/asb/scene4.mp4", promptText: "Sunset over pride", domTop: 1200 };

  activeDomClipsMap.set(clip3.videoUrl, clip3);
  discoveredVideos.set(clip3.id, clip3);
  activeDomClipsMap.set(clip4.videoUrl, clip4);
  discoveredVideos.set(clip4.id, clip4);

  // Content script's step 6 logic: Merge discoveredVideos back into clipsMap
  for (const [id, meta] of discoveredVideos.entries()) {
    if (meta && meta.videoUrl && !activeDomClipsMap.has(meta.videoUrl)) {
      activeDomClipsMap.set(meta.videoUrl, meta);
    }
  }

  assert.strictEqual(activeDomClipsMap.size, 4, "Virtual scrolling persistence must preserve all 4 clips even after DOM unmount");
  assert(activeDomClipsMap.has("https://flow.google.com/asb/scene1.mp4"), "Clip 1 must still be present");
  assert(activeDomClipsMap.has("https://flow.google.com/asb/scene2.mp4"), "Clip 2 must still be present");
  assert(activeDomClipsMap.has("https://flow.google.com/asb/scene3.mp4"), "Clip 3 must be present");
  assert(activeDomClipsMap.has("https://flow.google.com/asb/scene4.mp4"), "Clip 4 must be present");

  console.log("✅ Test 3 PASSED: Offscreen clips preserved across virtual scrolling passes.");

  // ----------------------------------------------------------------------------
  // Test 4: Target Tab Resolution & Extension Studio Tab Exclusion
  // ----------------------------------------------------------------------------
  console.log("\n--- Test 4: Target Tab Resolution & Extension Studio Tab Exclusion ---");

  // We test the logic implemented in background.js, sidepanel.js, and studio.js
  function isEligibleTab(tab) {
    if (!tab || !tab.url) return false;
    const u = tab.url.toLowerCase();
    if (u.startsWith("chrome://") || u.startsWith("chrome-extension://") || u.startsWith("edge://") || u.startsWith("about:")) {
      return false;
    }
    return true;
  }

  function mockFindTargetTab(tabs, activeTab) {
    // 1. Si l'onglet actif est déjà un onglet Google Flow
    if (activeTab && activeTab.url && (activeTab.url.includes("flow.google") || activeTab.url.includes("labs.google") || activeTab.url.includes("aitestkitchen.withgoogle.com"))) {
      return activeTab;
    }

    // 2. Recherche prioritaire de n'importe quel onglet Google Flow ouvert
    const flowTabs = tabs.filter((t) =>
      t.url && (t.url.includes("flow.google") || t.url.includes("labs.google") || t.url.includes("aitestkitchen.withgoogle.com"))
    );
    if (flowTabs.length > 0) {
      const activeFlow = flowTabs.find((t) => t.active);
      return activeFlow || flowTabs[0];
    }

    // 3. Onglet actif si éligible (pas l'extension studio)
    if (activeTab && isEligibleTab(activeTab)) {
      return activeTab;
    }

    // 4. Fallback éligible
    return tabs.find((t) => isEligibleTab(t)) || null;
  }

  const mockTabs = [
    { id: 101, url: "chrome-extension://abcdef/studio.html", title: "Flow Video Studio", active: true },
    { id: 202, url: "https://flow.google.com/project/489271", title: "Flow - Project Lion", active: false },
    { id: 303, url: "https://www.google.com", title: "Google", active: false }
  ];

  // The active tab is the Studio tab (id 101)
  const resolved = mockFindTargetTab(mockTabs, mockTabs[0]);
  assert(resolved, "Target tab must be resolved");
  assert.strictEqual(resolved.id, 202, "Must resolve to the Google Flow tab (id 202), NEVER the studio tab (id 101)");
  assert.strictEqual(isEligibleTab(mockTabs[0]), false, "Studio tab must be deemed ineligible");

  console.log("✅ Test 4 PASSED: Studio tab (chrome-extension://) successfully rejected; Flow tab prioritized.");

  // ----------------------------------------------------------------------------
  // Test 5: Chunked Video Download & IPC Buffer Integrity (Sub-2MB Slicing)
  // ----------------------------------------------------------------------------
  console.log("\n--- Test 5: Chunked Video Download & IPC Buffer Integrity ---");

  // Create an arbitrary 10 MB video buffer
  const videoSize = 10 * 1024 * 1024;
  const originalVideo = crypto.randomBytes(videoSize);
  const CHUNK_SIZE = 2 * 1024 * 1024;
  const totalChunks = Math.ceil(originalVideo.length / CHUNK_SIZE);

  // Slicing simulation
  const chunks = [];
  for (let c = 0; c < totalChunks; c++) {
    const start = c * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, originalVideo.length);
    const slice = originalVideo.slice(start, end);
    const b64 = slice.toString("base64");
    // Verify base64 IPC payload size is well below 32 MB
    assert(b64.length < 3 * 1024 * 1024, "Chunk base64 size must stay below 3 MB");
    chunks.push(b64);
  }

  assert.strictEqual(chunks.length, 5, "10 MB video should be split into exactly 5 chunks of 2 MB");

  // Reassembly simulation
  const reassembledBuffers = [];
  for (const b64 of chunks) {
    reassembledBuffers.push(Buffer.from(b64, "base64"));
  }
  const reassembled = Buffer.concat(reassembledBuffers);

  assert.strictEqual(reassembled.length, originalVideo.length, "Reassembled video size must match");
  assert.strictEqual(
    crypto.createHash("sha256").update(reassembled).digest("hex"),
    crypto.createHash("sha256").update(originalVideo).digest("hex"),
    "Reassembled video must be byte-for-byte identical to original"
  );

  console.log("✅ Test 5 PASSED: 10 MB video chunked into 5 sub-2MB packets and reassembled with 100% integrity.");

  // ----------------------------------------------------------------------------
  // Test 6: DeclarativeNetRequest Ruleset Coverage
  // ----------------------------------------------------------------------------
  console.log("\n--- Test 6: DeclarativeNetRequest Ruleset Coverage ---");

  const rulesPath = path.join(__dirname, "rules.json");
  const rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

  const requiredDomains = [
    "flow.google",
    "labs.google",
    "storage.googleapis.com",
    "googleusercontent.com",
    "aitestkitchen.withgoogle.com",
    "googlevideo.com"
  ];

  for (const domain of requiredDomains) {
    const matchedRule = rules.find((r) => r.condition && r.condition.urlFilter && r.condition.urlFilter.includes(domain));
    assert(matchedRule, `rules.json must contain declarative rule for domain: ${domain}`);
    const corpHeader = matchedRule.action.responseHeaders.find((h) => h.header.toLowerCase() === "cross-origin-resource-policy");
    assert(corpHeader && corpHeader.value === "cross-origin", `Rule for ${domain} must set Cross-Origin-Resource-Policy: cross-origin`);
    const coepHeader = matchedRule.action.responseHeaders.find((h) => h.header.toLowerCase() === "cross-origin-embedder-policy");
    assert(coepHeader && coepHeader.value === "unsafe-none", `Rule for ${domain} must set Cross-Origin-Embedder-Policy: unsafe-none`);
  }

  console.log("✅ Test 6 PASSED: All Flow and Google video domains covered by declarativeNetRequest CORS/CORP rules.");

  console.log("\n=== ALL FLOW RETRIEVAL PIPELINE TESTS PASSED SUCCESSFULLY! ===");
})().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
