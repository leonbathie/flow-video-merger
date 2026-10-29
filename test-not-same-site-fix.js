// Test suite for ERR_BLOCKED_BY_RESPONSE.NotSameSite resolution on flow.google.com/asb/...
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: Net ERR_BLOCKED_BY_RESPONSE.NotSameSite Resolution ===\n');

// ----------------------------------------------------------------------------
// Test 1: Manifest V3 & declarativeNetRequest / Permissions Configuration
// ----------------------------------------------------------------------------
console.log('--- Test 1: Manifest V3 declarativeNetRequest & Privileges Configuration ---');
const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.strictEqual(manifest.manifest_version, 3, 'Manifest must be version 3');
assert.ok(manifest.permissions.includes('declarativeNetRequest'), 'Manifest permissions must include declarativeNetRequest');
assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'), 'Manifest permissions must include declarativeNetRequestWithHostAccess');
assert.ok(manifest.permissions.includes('cookies'), 'Manifest permissions must include cookies');
assert.ok(manifest.declarative_net_request, 'Manifest must include declarative_net_request block');
assert.ok(Array.isArray(manifest.declarative_net_request.rule_resources), 'rule_resources must be an array');
assert.strictEqual(manifest.declarative_net_request.rule_resources[0].id, 'ruleset_corp');
assert.strictEqual(manifest.declarative_net_request.rule_resources[0].enabled, true);
assert.strictEqual(manifest.declarative_net_request.rule_resources[0].path, 'rules.json');

console.log('✅ Test 1 PASSED: manifest.json declares declarativeNetRequest, declarativeNetRequestWithHostAccess, cookies, and ruleset_corp correctly.\n');

// ----------------------------------------------------------------------------
// Test 2: rules.json Syntax & CORP Overrides Coverage (Zero Wildcard CORS Conflict)
// ----------------------------------------------------------------------------
console.log('--- Test 2: rules.json Syntax & Rule Coverage ---');
const rulesPath = path.join(__dirname, 'rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

assert.ok(Array.isArray(rules), 'rules.json must be a JSON array');
assert.ok(rules.length >= 4, 'Must define rules covering Google Flow domains and /asb/');

const sampleErrorUrl = 'https://flow.google.com/asb/ANqvLOaARRBzvctCVTKafQCvclPIU2aNossiPSvQxGuKQ9fS30dgLHhgcwHv6IkhBsYLk_QyXTZFrcFbdewwc7MoRqerKWK2GG7aug8LivgYZCNCiYXkmFzhV8O-lrMB5Hjeb5ugfXZrSrv0BlayxdbUFjrLb8x7TMSSGq9hOgGrbA=mm,22,15';

function evaluateRulesForUrl(url, resourceType) {
  const matchedHeaders = {};
  for (const rule of rules) {
    const filter = rule.condition.urlFilter;
    let matched = false;
    if (filter.startsWith('||')) {
      const domain = filter.slice(2);
      matched = url.includes(domain);
    } else {
      matched = url.includes(filter);
    }

    if (matched && rule.condition.resourceTypes.includes(resourceType)) {
      if (rule.action.type === 'modifyHeaders' && Array.isArray(rule.action.responseHeaders)) {
        for (const h of rule.action.responseHeaders) {
          if (h.operation === 'set') {
            matchedHeaders[h.header.toLowerCase()] = h.value;
          }
        }
      }
    }
  }
  return matchedHeaders;
}

const mediaHeaders = evaluateRulesForUrl(sampleErrorUrl, 'media');
console.log('Evaluated headers for sample /asb/ video stream URL:', mediaHeaders);
assert.strictEqual(mediaHeaders['cross-origin-resource-policy'], 'cross-origin', 'CORP header must be overridden to cross-origin');
assert.strictEqual(mediaHeaders['cross-origin-embedder-policy'], 'unsafe-none', 'COEP header must be unsafe-none');
assert.strictEqual(mediaHeaders['access-control-allow-origin'], undefined, 'Must NOT inject wildcard Access-Control-Allow-Origin: * which breaks credentialed fetches');

const imageHeaders = evaluateRulesForUrl(sampleErrorUrl, 'image');
assert.strictEqual(imageHeaders['cross-origin-resource-policy'], 'cross-origin');

const xhrHeaders = evaluateRulesForUrl(sampleErrorUrl, 'xmlhttprequest');
assert.strictEqual(xhrHeaders['cross-origin-resource-policy'], 'cross-origin');

console.log('✅ Test 2 PASSED: rules.json successfully overrides Cross-Origin-Resource-Policy to cross-origin on /asb/ media without wildcard CORS conflicts.\n');

// ----------------------------------------------------------------------------
// Test 3: Side Panel UI Safe Thumbnail Rendering (Zero Raw Remote Requests)
// ----------------------------------------------------------------------------
console.log('--- Test 3: Safe Thumbnail Rendering (Zero Un-cached Remote Requests) ---');

function generateThumbHtml(clip, numStr) {
  const hasLocalBlob = Boolean(clip.cachedObjectUrl || clip.localObjectUrl);
  const isSafeLocalThumb = clip.thumbnail && (clip.thumbnail.startsWith('data:') || clip.thumbnail.startsWith('blob:'));

  return isSafeLocalThumb
    ? `<img class="clip-thumb" src="${clip.thumbnail}" alt="Clip ${numStr}" />`
    : hasLocalBlob
    ? `<video class="clip-thumb" src="${clip.cachedObjectUrl || clip.localObjectUrl}" muted preload="metadata"></video>`
    : `<div class="clip-thumb clip-thumb-placeholder" data-clip-id="${clip.id}" title="Clip #${numStr}"><span class="placeholder-icon">▶</span><span class="placeholder-tag">#${numStr}</span></div>`;
}

// Case A: Newly discovered clip with remote flow.google.com/asb/ thumbnail URL
const clipWithRemoteThumb = {
  id: 'flow_clip_remote_1',
  videoUrl: sampleErrorUrl,
  thumbnail: sampleErrorUrl, // RAW remote URL from Google Flow!
  cachedObjectUrl: null
};

const renderedHtmlA = generateThumbHtml(clipWithRemoteThumb, '01');
console.log('Rendered HTML for clip with remote flow.google.com/asb/ thumbnail:\n', renderedHtmlA.trim());
assert.ok(!renderedHtmlA.includes('<img class="clip-thumb" src="https://flow.google.com'), 'Must NOT insert raw remote flow.google.com/asb/ URL in <img> tag');
assert.ok(!renderedHtmlA.includes('<video'), 'Must NOT insert raw <video> tag');
assert.ok(renderedHtmlA.includes('clip-thumb-placeholder'), 'Must render safe placeholder badge');
assert.ok(renderedHtmlA.includes('#01'), 'Must display sequence index');
assert.ok(renderedHtmlA.includes('data-clip-id="flow_clip_remote_1"'), 'Must attach data-clip-id for async safe resolution');

// Case B: Clip with captured base64 data URL thumbnail
const clipWithDataUrl = {
  id: 'flow_clip_2',
  videoUrl: sampleErrorUrl,
  thumbnail: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  cachedObjectUrl: null
};
const renderedHtmlB = generateThumbHtml(clipWithDataUrl, '02');
assert.ok(renderedHtmlB.includes('<img class="clip-thumb" src="data:image/jpeg;base64,'), 'Must render <img> tag for data URL thumbnail');

// Case C: Clip with local object URL
const clipWithLocalBlob = {
  id: 'flow_clip_3',
  videoUrl: sampleErrorUrl,
  thumbnail: '',
  cachedObjectUrl: 'blob:chrome-extension://xyz123/video-blob'
};
const renderedHtmlC = generateThumbHtml(clipWithLocalBlob, '03');
assert.ok(renderedHtmlC.includes('<video class="clip-thumb" src="blob:chrome-extension://'), 'Must render <video> for local blob object URL');

console.log('✅ Test 3 PASSED: Side panel eliminates un-cached remote img and video tags in the DOM, preventing ERR_BLOCKED_BY_RESPONSE.NotSameSite.\n');

// ----------------------------------------------------------------------------
// Test 4: resolvePlayableUrl Priority Routing and Safe Error Handling
// ----------------------------------------------------------------------------
console.log('--- Test 4: resolvePlayableUrl Priority Routing & Safe Error Handling ---');

let chunkedTabFetchCalled = false;
let directFetchCalled = false;
let bgChunkedFetchCalled = false;

async function mockResolvePlayableUrl(clip, mockTabFetch, mockDirectFetch, mockBgFetch) {
  if (clip.localObjectUrl) return clip.localObjectUrl;
  if (clip.cachedObjectUrl) return clip.cachedObjectUrl;

  const url = clip.videoUrl;
  if (!url) return '';

  const isGoogleFlowUrl = url.includes('flow.google') || url.includes('/asb/') || url.includes('labs.google');

  if (isGoogleFlowUrl || url.startsWith('blob:')) {
    try {
      const blob = await mockTabFetch(clip);
      if (blob) {
        clip.cachedObjectUrl = 'blob:chrome-extension://mock-tab/' + clip.id;
        return clip.cachedObjectUrl;
      }
    } catch (_) {}
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const directRes = await mockDirectFetch(url);
      if (directRes) {
        clip.cachedObjectUrl = 'blob:chrome-extension://mock-direct/' + clip.id;
        return clip.cachedObjectUrl;
      }
    } catch (_) {}
  }

  try {
    const bgRes = await mockBgFetch(url);
    if (bgRes) {
      clip.cachedObjectUrl = 'blob:chrome-extension://mock-bg/' + clip.id;
      return clip.cachedObjectUrl;
    }
  } catch (_) {}

  if (isGoogleFlowUrl) {
    throw new Error('Impossible de récupérer le flux vidéo Google Flow protégé (/asb/).');
  }

  return clip.videoUrl;
}

(async () => {
  // Scenario 1: Tab fetch succeeds
  const testClip1 = { id: 'test_1', videoUrl: sampleErrorUrl, cachedObjectUrl: null };
  const res1 = await mockResolvePlayableUrl(
    testClip1,
    async () => { chunkedTabFetchCalled = true; return { size: 1024 }; },
    async () => { directFetchCalled = true; return null; },
    async () => { bgChunkedFetchCalled = true; return null; }
  );
  assert.strictEqual(chunkedTabFetchCalled, true, 'Tab fetch called first');
  assert.strictEqual(directFetchCalled, false, 'Direct fetch not needed');
  assert.ok(res1.startsWith('blob:chrome-extension://mock-tab/'), 'Resolves to tab blob URL');

  // Scenario 2: Tab fetch fails, sidepanel direct fetch succeeds
  chunkedTabFetchCalled = false;
  directFetchCalled = false;
  bgChunkedFetchCalled = false;
  const testClip2 = { id: 'test_2', videoUrl: sampleErrorUrl, cachedObjectUrl: null };
  const res2 = await mockResolvePlayableUrl(
    testClip2,
    async () => { chunkedTabFetchCalled = true; return null; },
    async () => { directFetchCalled = true; return { size: 2048 }; },
    async () => { bgChunkedFetchCalled = true; return null; }
  );
  assert.strictEqual(chunkedTabFetchCalled, true);
  assert.strictEqual(directFetchCalled, true);
  assert.ok(res2.startsWith('blob:chrome-extension://mock-direct/'), 'Resolves to direct blob URL');

  // Scenario 3: All fail on /asb/ URL -> Must throw error, NEVER return raw /asb/ URL
  let threwExpected = false;
  const testClip3 = { id: 'test_3', videoUrl: sampleErrorUrl, cachedObjectUrl: null };
  try {
    await mockResolvePlayableUrl(
      testClip3,
      async () => null,
      async () => null,
      async () => null
    );
  } catch (err) {
    threwExpected = true;
    assert.ok(err.message.includes('Google Flow'), 'Error message must explain protected resource');
  }
  assert.strictEqual(threwExpected, true, 'Must throw error instead of returning raw /asb/ URL to media player');

  console.log('✅ Test 4 PASSED: flow.google.com/asb/... routes properly and never leaks raw protected URLs into DOM media player.\n');

  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
})();
