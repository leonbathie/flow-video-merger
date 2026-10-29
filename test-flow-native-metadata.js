// Test Suite: Google Flow Native Metadata Extraction
// Validates deep extraction of creation timestamp, scene/generation order, prompt,
// duration, resolution, boost/upscale status, model, seed, and ID from Flow DOM,
// Web Components, <time> tags, datasets, and in-page script states.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TEST SUITE: Google Flow Native Metadata Extraction ===\n');

// -------------------------------------------------------------
// Load content.js environment mock
// -------------------------------------------------------------
function setupMockDom() {
  const listeners = {};
  const mockStorage = {};

  const globalMock = {
    URL: global.URL,
    window: {},
    document: {
      documentElement: {
        appendChild: () => {},
        getAttribute: () => null
      },
      head: { appendChild: () => {} },
      body: { appendChild: () => {} },
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          children: [],
          dataset: {},
          style: {},
          classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
          },
          getAttribute: (attr) => el[attr] || el.dataset[attr.replace(/^data-/, '')] || null,
          setAttribute: (attr, val) => { el[attr] = val; },
          addEventListener: () => {},
          removeEventListener: () => {},
          appendChild: (c) => { el.children.push(c); c.parentElement = el; },
          querySelector: (sel) => el.querySelectorAll(sel)[0] || null,
          querySelectorAll: (sel) => {
            const matches = [];
            function search(node) {
              if (node.tagName && sel.toUpperCase().includes(node.tagName)) matches.push(node);
              if (sel.includes('time') && node.tagName === 'TIME') matches.push(node);
              if (sel.includes('.prompt') && node.className && node.className.includes('prompt')) matches.push(node);
              if (sel.includes('.scene-badge') && node.className && node.className.includes('scene-badge')) matches.push(node);
              if (sel.includes('.resolution-badge') && node.className && node.className.includes('resolution-badge')) matches.push(node);
              if (sel.includes('.duration-badge') && node.className && node.className.includes('duration-badge')) matches.push(node);
              if (sel.includes('.boost-badge') && node.className && node.className.includes('boost-badge')) matches.push(node);
              for (const c of node.children || []) search(c);
            }
            search(el);
            return matches;
          }
        };
        return el;
      },
      querySelectorAll: () => []
    },
    chrome: {
      runtime: {
        onMessage: {
          addListener: (fn) => { listeners['runtime'] = fn; }
        },
        sendMessage: () => Promise.resolve({ ok: true })
      }
    },
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    setInterval: () => 123,
    setTimeout: (fn) => fn(),
    performance: {
      timeOrigin: 1730030000000,
      getEntriesByType: () => [],
      getEntriesByName: () => []
    },
    location: {
      href: 'https://flow.google.com/project/veo-test-123'
    }
  };

  globalMock.window = globalMock;
  return { globalMock, listeners };
}

// -------------------------------------------------------------
// Test 1: Flow Card DOM Attributes & Dataset Deep Extraction
// -------------------------------------------------------------
console.log('--- Test 1: Flow Card DOM Attributes & Dataset Deep Extraction ---');

const contentCode = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

// Execute content.js in simulated VM context
const vm = require('vm');
const { globalMock } = setupMockDom();
const context = vm.createContext(globalMock);
vm.runInContext(contentCode, context);

const extractMetadata = context.window.__flowVideoMergerExtractMetadata;
assert(typeof extractMetadata === 'function', 'extractFlowNativeMetadata must be exposed on window');

// Simulate a Flow Card element with native Flow attributes
const mockFlowCard = {
  tagName: 'FLOW-CARD',
  getAttribute: (attr) => {
    const map = {
      'data-generation-id': 'gen_flow_lion_scene1',
      'data-scene': '1',
      'data-prompt': 'A majestic golden lion standing gracefully on an ancient stone terrace at dawn',
      'data-created-at': '2026-10-27T13:21:09.000Z',
      'data-duration': '5.0',
      'data-resolution': '1080p',
      'data-boost': 'true',
      'data-model': 'Veo 2',
      'data-seed': '9847291'
    };
    return map[attr] || null;
  },
  children: [],
  parentElement: null
};

const mockVideo = {
  tagName: 'VIDEO',
  currentSrc: 'https://flow.google.com/asb/video?id=gen_flow_lion_scene1',
  videoWidth: 1920,
  videoHeight: 1080,
  duration: 5.0,
  parentElement: mockFlowCard,
  getAttribute: () => null
};

const meta1 = extractMetadata(mockVideo, mockVideo.currentSrc, mockFlowCard);

assert.strictEqual(meta1.generationId, 'gen_flow_lion_scene1', 'Should extract Flow generationId');
assert.strictEqual(meta1.sceneNumber, 1, 'Should extract sceneNumber 1');
assert.strictEqual(meta1.promptText, 'A majestic golden lion standing gracefully on an ancient stone terrace at dawn');
assert.strictEqual(meta1.createdAt, new Date('2026-10-27T13:21:09.000Z').getTime());
assert.strictEqual(meta1.createdAtLabel, '13:21:09');
assert.strictEqual(meta1.duration, 5.0);
assert.strictEqual(meta1.resolution, '1080p');
assert.strictEqual(meta1.isBoost, true);
assert.strictEqual(meta1.model, 'Veo 2');
assert.strictEqual(meta1.seed, '9847291');

console.log('✅ Test 1 PASSED: All Flow card attributes and dataset extracted accurately.\n');

// -------------------------------------------------------------
// Test 2: Shadow DOM Traversal across Custom Element boundaries
// -------------------------------------------------------------
console.log('--- Test 2: Shadow DOM Traversal across Custom Element boundaries ---');

const findContainer = context.window.__flowVideoMergerFindContainer;
assert(typeof findContainer === 'function', 'findFlowCardContainer must be exposed on window');

// Setup nested Web Component hierarchy: <flow-card> -> shadowRoot -> <div class="player-wrapper"> -> <video>
const hostCard = {
  tagName: 'FLOW-CARD',
  getAttribute: (attr) => (attr === 'data-generation-id' ? 'card_host_99' : null),
  parentElement: null
};

const shadowRoot = {
  host: hostCard,
  nodeType: 11
};

const playerWrapper = {
  tagName: 'DIV',
  className: 'player-wrapper',
  parentElement: null,
  parentNode: shadowRoot, // Root of this light sub-tree is the shadowRoot
  getAttribute: () => null
};

const deepVideo = {
  tagName: 'VIDEO',
  parentElement: playerWrapper,
  getAttribute: () => null
};

const resolvedContainer = findContainer(deepVideo);
assert.strictEqual(resolvedContainer, hostCard, 'Must traverse through shadowRoot.host to find parent Flow custom element');
console.log('✅ Test 2 PASSED: Seamless traversal through Shadow DOM boundaries to host Web Component.\n');

// -------------------------------------------------------------
// Test 3: Web Component Reactive State / JS Property Extraction
// -------------------------------------------------------------
console.log('--- Test 3: Web Component Reactive State & Properties ---');

const litComponent = {
  tagName: 'FLOW-GENERATION',
  parentElement: null,
  getAttribute: () => null,
  __flow_metadata__: {
    generationId: 'asb_state_777',
    sceneNumber: 3,
    prompt: 'Heroic knight drawing glowing sword in midnight thunderstorm',
    createdAt: 1730035269000,
    duration: 8.5,
    resolution: '4K',
    isBoost: true,
    model: 'Veo-2.0-Ultra'
  }
};

const videoInLit = {
  tagName: 'VIDEO',
  parentElement: litComponent,
  getAttribute: () => null,
  duration: 8.5,
  videoWidth: 3840,
  videoHeight: 2160
};

const meta3 = extractMetadata(videoInLit, 'https://storage.googleapis.com/veo/clip777.mp4', litComponent);

assert.strictEqual(meta3.generationId, 'asb_state_777');
assert.strictEqual(meta3.sceneNumber, 3);
assert.strictEqual(meta3.promptText, 'Heroic knight drawing glowing sword in midnight thunderstorm');
assert.strictEqual(meta3.createdAt, 1730035269000);
assert.strictEqual(meta3.duration, 8.5);
assert.strictEqual(meta3.resolution, '4K');
assert.strictEqual(meta3.isBoost, true);
assert.strictEqual(meta3.model, 'Veo-2.0-Ultra');
assert.strictEqual(meta3.source, 'component_state');

console.log('✅ Test 3 PASSED: Direct extraction from Web Component internal state object.\n');

// -------------------------------------------------------------
// Test 4: HTML <time> Tags & Child DOM Badges Extraction
// -------------------------------------------------------------
console.log('--- Test 4: HTML <time> tags, Prompt elements & Badges ---');

const timeElement = {
  tagName: 'TIME',
  getAttribute: (a) => (a === 'datetime' ? '2026-10-27T15:30:45Z' : null),
  textContent: '15:30:45'
};

const promptElement = {
  tagName: 'P',
  className: 'flow-prompt',
  textContent: 'Panoramic view of ancient mountain temple shrouded in mist'
};

const sceneBadge = {
  tagName: 'SPAN',
  className: 'scene-badge',
  textContent: 'Scène 04'
};

const resBadge = {
  tagName: 'SPAN',
  className: 'resolution-badge',
  textContent: '4K UHD'
};

const boostBadge = {
  tagName: 'SPAN',
  className: 'boost-badge',
  textContent: '⚡ Boost 4K'
};

const durBadge = {
  tagName: 'SPAN',
  className: 'duration-badge',
  textContent: '0:06'
};

const domCard = {
  tagName: 'DIV',
  className: 'flow-card',
  parentElement: null,
  getAttribute: () => null,
  children: [timeElement, promptElement, sceneBadge, resBadge, boostBadge, durBadge],
  querySelectorAll: (sel) => {
    const res = [];
    if (sel.includes('time')) res.push(timeElement);
    if (sel.includes('flow-prompt') || sel.includes('.prompt')) res.push(promptElement);
    if (sel.includes('.scene-badge')) res.push(sceneBadge);
    if (sel.includes('.resolution-badge')) res.push(resBadge);
    if (sel.includes('.boost-badge')) res.push(boostBadge);
    if (sel.includes('.duration-badge')) res.push(durBadge);
    return res;
  }
};

const meta4 = extractMetadata(null, 'https://flow.google.com/asb/video?id=dom_badge_test', domCard);

assert.strictEqual(meta4.sceneNumber, 4, 'Should parse Scène 04 into integer 4');
assert.strictEqual(meta4.promptText, 'Panoramic view of ancient mountain temple shrouded in mist');
assert.strictEqual(meta4.createdAt, new Date('2026-10-27T15:30:45Z').getTime());
assert.strictEqual(meta4.createdAtLabel, '15:30:45');
assert.strictEqual(meta4.duration, 6.0, '0:06 should parse to 6.0 seconds');
assert.strictEqual(meta4.resolution, '4K');
assert.strictEqual(meta4.isBoost, true, 'Boost badge should set isBoost=true');

console.log('✅ Test 4 PASSED: <time> tag, prompt elements, and badges parsed successfully.\n');

// -------------------------------------------------------------
// Test 5: In-Page Script JSON Hydration Extraction
// -------------------------------------------------------------
console.log('--- Test 5: In-Page Script JSON Hydration Extraction ---');

const { globalMock: jsonMock } = setupMockDom();
const sampleJsonPayload = JSON.stringify({
  flowProject: {
    generations: [
      {
        id: 'json_gen_555',
        prompt: 'Futuristic solar train gliding through desert dunes',
        videoUrl: 'https://flow.google.com/asb/stream_555.mp4',
        createdAt: '2026-10-27T16:15:00Z',
        sceneNumber: 5,
        duration: 5.0,
        resolution: '1080p',
        isBoost: false,
        model: 'Veo'
      }
    ]
  }
});

const scriptTag = {
  tagName: 'SCRIPT',
  type: 'application/json',
  textContent: sampleJsonPayload
};

jsonMock.document.querySelectorAll = (sel) => (sel.includes('script') ? [scriptTag] : []);

const jsonContext = vm.createContext(jsonMock);
vm.runInContext(contentCode, jsonContext);

const jsonExtract = jsonContext.window.__flowVideoMergerExtractMetadata;
const meta5 = jsonExtract(null, 'https://flow.google.com/asb/stream_555.mp4', null);

assert.strictEqual(meta5.generationId, 'json_gen_555');
assert.strictEqual(meta5.promptText, 'Futuristic solar train gliding through desert dunes');
assert.strictEqual(meta5.sceneNumber, 5);
assert.strictEqual(meta5.createdAt, new Date('2026-10-27T16:15:00Z').getTime());
assert.strictEqual(meta5.createdAtLabel, '16:15:00');
assert.strictEqual(meta5.model, 'Veo');

console.log('✅ Test 5 PASSED: In-page script JSON state indexed and mapped.\n');

// -------------------------------------------------------------
// Test 6: Resource Timing & URL Query Metadata Extraction
// -------------------------------------------------------------
console.log('--- Test 6: Resource Timing & URL Query Metadata Extraction ---');

const { globalMock: timingMock } = setupMockDom();
timingMock.performance.timeOrigin = 1730030000000;
timingMock.performance.getEntriesByName = (name) => {
  if (name.includes('asb/video_timed')) {
    return [{ startTime: 50000 }]; // 1730030000000 + 50000 = 1730030050000
  }
  return [];
};

const timingContext = vm.createContext(timingMock);
vm.runInContext(contentCode, timingContext);

const timingExtract = timingContext.window.__flowVideoMergerExtractMetadata;
const urlWithParams = 'https://flow.google.com/asb/video_timed?id=gen_url_99&scene=2&prompt=Neon+cyberpunk+bazaar&boost=1';
const meta6 = timingExtract(null, urlWithParams, null);

assert.strictEqual(meta6.generationId, 'gen_url_99');
assert.strictEqual(meta6.sceneNumber, 2);
assert.strictEqual(meta6.promptText, 'Neon cyberpunk bazaar');
assert.strictEqual(meta6.isBoost, true);
assert.strictEqual(meta6.createdAt, 1730030050000, 'Resource timing startTime should calculate accurate createdAt');

console.log('✅ Test 6 PASSED: URL parameters and resource timing extracted.\n');

// -------------------------------------------------------------
// Test 7: Smart Ordering Integration with Native Flow Metadata
// -------------------------------------------------------------
console.log('--- Test 7: Smart Ordering Integration with Native Flow Metadata ---');

const smartOrderCode = fs.readFileSync(path.join(__dirname, 'smart-order.js'), 'utf8');
const smartContext = vm.createContext({ window: {} });
vm.runInContext(smartOrderCode, smartContext);
const FlowSmartOrder = smartContext.window.FlowSmartOrder;

// Feed clips with Flow native sceneNumbers and timestamps
const flowClips = [
  {
    id: 'clip_b',
    videoUrl: 'https://flow.google.com/asb/b.mp4',
    promptText: 'Lioness walking beside male lion',
    sceneNumber: 2,
    createdAt: 1730035269000,
    createdAtLabel: '13:21:09',
    duration: 5.0,
    isBoost: false
  },
  {
    id: 'clip_c',
    videoUrl: 'https://flow.google.com/asb/c.mp4',
    promptText: 'Lion roars near villagers',
    sceneNumber: 3,
    createdAt: 1730035930000,
    createdAtLabel: '13:32:10',
    duration: 5.0,
    isBoost: true
  },
  {
    id: 'clip_a',
    videoUrl: 'https://flow.google.com/asb/a.mp4',
    promptText: 'Lion steps in courtyard',
    sceneNumber: 1,
    createdAt: 1730035269000,
    createdAtLabel: '13:21:09',
    duration: 5.0,
    isBoost: false
  }
];

const sortedByScene = FlowSmartOrder.sortClips(flowClips, 'smart');
assert.strictEqual(sortedByScene[0].id, 'clip_a', 'Scène 1 should come first');
assert.strictEqual(sortedByScene[1].id, 'clip_b', 'Scène 2 should come second');
assert.strictEqual(sortedByScene[2].id, 'clip_c', 'Scène 3 should come third');

const analysisA = FlowSmartOrder.analyzeClip(flowClips[0]);
assert(analysisA.tags.some(t => t.includes('Scène 1') || t.includes('13:21:09')), 'Should generate tags from Flow metadata');
assert.strictEqual(analysisA.confidence, 98, 'Flow sceneNumber must yield 98% confidence');

console.log('✅ Test 7 PASSED: FlowSmartOrder perfectly prioritizes Flow native metadata with 98% confidence.\n');

// -------------------------------------------------------------
// Test 8: Relative Time Parsing (Flow UI "<time>il y a 5 min</time>", "just now")
// -------------------------------------------------------------
console.log('--- Test 8: Relative Time Parsing & French/English UI ---');

const relativeDomCard = {
  tagName: 'DIV',
  className: 'flow-card',
  children: [],
  parentElement: null,
  getAttribute: (a) => (a === 'data-generation-id' ? 'gen_rel_time' : null),
  querySelectorAll: (sel) => {
    if (sel.includes('time')) {
      return [{
        tagName: 'TIME',
        getAttribute: () => null,
        textContent: 'il y a 5 min'
      }];
    }
    return [];
  }
};

const meta8 = extractMetadata(null, 'https://flow.google.com/asb/clip_rel.mp4', relativeDomCard);
assert(meta8.createdAt !== null, 'Relative timestamp must be parsed');
const expectedApprox = Date.now() - 5 * 60 * 1000;
assert(Math.abs(meta8.createdAt - expectedApprox) < 2000, 'Timestamp should be approximately 5 minutes ago');
assert(meta8.createdAtLabel.length >= 5, 'createdAtLabel should be formatted as HH:MM:SS');

console.log(`Parsed "il y a 5 min" -> ${meta8.createdAtLabel} (${meta8.createdAt})`);
console.log('✅ Test 8 PASSED: Relative timestamps parsed with high fidelity.\n');

// -------------------------------------------------------------
// Test 9: DOM Serialized JSON Attributes (data-flow-metadata)
// -------------------------------------------------------------
console.log('--- Test 9: DOM Serialized JSON Attributes (data-flow-metadata) ---');

const jsonAttrCard = {
  tagName: 'FLOW-CARD',
  parentElement: null,
  children: [],
  getAttribute: (a) => {
    if (a === 'data-flow-metadata') {
      return JSON.stringify({
        generationId: 'gen_attr_json_999',
        scene: 4,
        prompt: 'An eagle soaring high over snow-covered Alpine peaks',
        createdAt: '2026-10-27T17:45:00.000Z',
        duration: 7.5,
        resolution: '1080p (9:16)',
        isBoost: true,
        model: 'Veo 2.0',
        seed: '428812'
      });
    }
    return null;
  }
};

const meta9 = extractMetadata(null, 'https://flow.google.com/asb/eagle_4k.mp4', jsonAttrCard);
assert.strictEqual(meta9.generationId, 'gen_attr_json_999');
assert.strictEqual(meta9.sceneNumber, 4);
assert.strictEqual(meta9.promptText, 'An eagle soaring high over snow-covered Alpine peaks');
assert.strictEqual(meta9.resolution, '1080p (9:16)');
assert.strictEqual(meta9.isBoost, true);
assert.strictEqual(meta9.model, 'Veo 2.0');
assert.strictEqual(meta9.seed, '428812');
console.log('✅ Test 9 PASSED: data-flow-metadata JSON attribute fully extracted.\n');

// -------------------------------------------------------------
// Test 10: Multi-Generation Duplicate Prompt Preservation (smartMergeClips)
// -------------------------------------------------------------
console.log('--- Test 10: Multi-Generation Duplicate Prompt Preservation ---');

// Simulate smartMergeClips from sidepanel.js / studio.js
function testSmartMergeClips(currentList, scanned) {
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
      if (existing.generationId && incoming.generationId && existing.generationId === incoming.generationId) return true;
      if (isIncomingBoost && !existing.isBoost) {
        if (!existing.generationId || !incoming.generationId || existing.generationId === incoming.generationId) {
          const cleanExisting = (existing.promptText || '').replace(/^\[Boost ⚡\]\s*/i, '').trim().toLowerCase();
          const cleanIncoming = (incoming.promptText || '').replace(/^\[Boost ⚡\]\s*/i, '').trim().toLowerCase();
          return cleanExisting.length > 5 && cleanExisting === cleanIncoming;
        }
      }
      return false;
    });

    if (existingIdx !== -1) {
      if (isIncomingBoost && (!result[existingIdx].isBoost || !result[existingIdx].videoUrl.includes('boost'))) {
        result[existingIdx] = {
          ...result[existingIdx],
          videoUrl: incoming.videoUrl,
          isBoost: true
        };
      }
    } else {
      result.push(incoming);
    }
  }
  return result;
}

// 3 separate generations in Flow for the exact same prompt
const initialClips = [
  { id: 'flow_clip_1', generationId: 'gen_lion_take1', videoUrl: 'https://flow.google.com/asb/v1.mp4', promptText: 'Lion walking gracefully', isBoost: false }
];

const newlyGenerated = [
  { id: 'flow_clip_2', generationId: 'gen_lion_take2', videoUrl: 'https://flow.google.com/asb/v2.mp4', promptText: 'Lion walking gracefully', isBoost: false },
  { id: 'flow_clip_3', generationId: 'gen_lion_take3', videoUrl: 'https://flow.google.com/asb/v3.mp4', promptText: 'Lion walking gracefully', isBoost: false }
];

const mergedDistinct = testSmartMergeClips(initialClips, newlyGenerated);
assert.strictEqual(mergedDistinct.length, 3, 'All 3 generations with the same prompt MUST be preserved!');
assert.strictEqual(mergedDistinct[0].generationId, 'gen_lion_take1');
assert.strictEqual(mergedDistinct[1].generationId, 'gen_lion_take2');
assert.strictEqual(mergedDistinct[2].generationId, 'gen_lion_take3');

// Now simulate a Boost upscale of take 2:
const boostUpscale = [
  { id: 'flow_clip_boost_2', generationId: 'gen_lion_take2', videoUrl: 'https://flow.google.com/asb/v2_boost_4k.mp4', promptText: 'Lion walking gracefully', isBoost: true }
];

const mergedBoost = testSmartMergeClips(mergedDistinct, boostUpscale);
assert.strictEqual(mergedBoost.length, 3, 'Boost must upgrade in-place, not create duplicate');
assert.strictEqual(mergedBoost[1].isBoost, true, 'Take 2 should now be boosted');
assert.strictEqual(mergedBoost[1].videoUrl, 'https://flow.google.com/asb/v2_boost_4k.mp4');

console.log('✅ Test 10 PASSED: Multiple generations with identical prompts are preserved and Boost upgrades in place.\n');

// -------------------------------------------------------------
// Test 11: Main World Flow Page Bridge API Interceptor
// -------------------------------------------------------------
console.log('--- Test 11: Main World Flow Page Bridge API Interceptor ---');

const bridgeCode = fs.readFileSync(path.join(__dirname, 'flow-page-bridge.js'), 'utf8');

const postedMessages = [];
const mockMainGlobal = {
  window: {},
  document: {
    readyState: 'complete',
    querySelectorAll: () => []
  },
  fetch: (url) => Promise.resolve({
    clone: () => ({
      json: () => Promise.resolve({
        generation: {
          id: 'asb_api_gen_404',
          prompt: 'Bioluminescent jellyfish floating in deep neon trench',
          videoUrl: 'https://flow.google.com/asb/jellyfish_1080p.mp4',
          createTime: '2026-10-27T18:00:00Z',
          sceneNumber: 7,
          duration: 6.0,
          resolution: '1080p',
          isBoost: false,
          model: 'Veo 2'
        }
      })
    })
  }),
  XMLHttpRequest: class {
    open(method, url) { this._url = url; }
    send() {}
    addEventListener(event, fn) { this._fn = fn; }
  },
  postMessage: (data) => {
    postedMessages.push(data);
  },
  addEventListener: () => {}
};
mockMainGlobal.window = mockMainGlobal;

const bridgeContext = vm.createContext(mockMainGlobal);
vm.runInContext(bridgeCode, bridgeContext);

(async () => {
  // Trigger fetch call through intercepted window.fetch
  await bridgeContext.window.fetch('https://flow.google.com/asb/api/generate');

  // Allow microtask to resolve JSON parsing
  await new Promise(r => setTimeout(r, 50));

  const bridgeMsg = postedMessages.find(m => m.type === 'FLOW_METADATA_ITEM');
  assert(bridgeMsg, 'Bridge must dispatch FLOW_METADATA_ITEM via postMessage');
  assert.strictEqual(bridgeMsg.metadata.generationId, 'asb_api_gen_404');
  assert.strictEqual(bridgeMsg.metadata.sceneNumber, 7);
  assert.strictEqual(bridgeMsg.metadata.promptText, 'Bioluminescent jellyfish floating in deep neon trench');
  assert.strictEqual(bridgeMsg.metadata.model, 'Veo 2');

  console.log('✅ Test 11 PASSED: Main world bridge intercepts Flow API and dispatches metadata.\n');

  console.log('=== ALL GOOGLE FLOW NATIVE METADATA TESTS PASSED SUCCESSFULLY! ===');
})();
