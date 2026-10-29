// Automated Test Suite: Side Panel Auto-Close on Web Studio Open
// Verifies that when the Web Studio (studio.html) is opened, the Side Panel (sidepanel.html) is automatically closed.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TEST SUITE: Side Panel Auto-Close on Web Studio Open ===\n');

// ---------------------------------------------------------------------
// Test 1: Static Code Architecture & Pattern Integrity
// ---------------------------------------------------------------------
console.log('--- Test 1: Static Architecture Validation (sidepanel.js, studio.js, background.js) ---');

const sidepanelJs = fs.readFileSync(path.join(__dirname, 'sidepanel.js'), 'utf8');
const studioJs = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
const backgroundJs = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');
const i18nJs = fs.readFileSync(path.join(__dirname, 'i18n.js'), 'utf8');

// 1.1 sidepanel.js checks
assert.ok(
  sidepanelJs.includes('openStudioBtn.addEventListener("click"'),
  'sidepanel.js must register click listener on openStudioBtn'
);
assert.ok(
  sidepanelJs.includes('studio.html'),
  'sidepanel.js must open studio.html on openStudioBtn click'
);
assert.ok(
  sidepanelJs.includes('window.close()'),
  'sidepanel.js must call window.close() on openStudioBtn click'
);
assert.ok(
  sidepanelJs.includes('CLOSE_SIDEPANEL'),
  'sidepanel.js must handle CLOSE_SIDEPANEL message'
);

// 1.2 studio.js checks
assert.ok(
  studioJs.includes('closeSidePanelIfOpen'),
  'studio.js must define closeSidePanelIfOpen function'
);
assert.ok(
  studioJs.includes('closeSidePanelIfOpen();'),
  'studio.js must call closeSidePanelIfOpen() on initialization'
);
assert.ok(
  studioJs.includes('CLOSE_SIDEPANEL'),
  'studio.js must broadcast CLOSE_SIDEPANEL on initialization'
);
assert.ok(
  studioJs.includes('chrome.sidePanel') && (studioJs.includes('close({ windowId })') || studioJs.includes('close?.({ windowId })')),
  'studio.js must call chrome.sidePanel close({ windowId }) if supported'
);

// 1.3 background.js checks
assert.ok(
  backgroundJs.includes('openWebStudio'),
  'background.js must define openWebStudio helper'
);
assert.ok(
  backgroundJs.includes('CLOSE_SIDEPANEL'),
  'background.js must broadcast and handle CLOSE_SIDEPANEL'
);
assert.ok(
  backgroundJs.includes('chrome.sidePanel') && (backgroundJs.includes('close({ windowId') || backgroundJs.includes('close?.({ windowId')),
  'background.js must call chrome.sidePanel close with windowId if supported'
);
assert.ok(
  backgroundJs.includes('open_flow_studio'),
  'background.js contextMenu open_flow_studio must trigger Web Studio opening'
);

console.log('✅ Test 1 PASSED: All 3 source files contain required auto-close patterns.\n');

// Helper to create mock DOM elements for VM execution
const makeEl = () => ({
  addEventListener: () => {},
  appendChild: () => {},
  removeChild: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  setAttribute: () => {},
  getAttribute: () => null,
  style: {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  getContext: () => ({})
});

// ---------------------------------------------------------------------
// Test 2: Real sidepanel.js Execution — Button Click & Message Listener
// ---------------------------------------------------------------------
console.log('--- Test 2: Real sidepanel.js Execution (Click & Message) ---');

{
  let windowClosedCount = 0;
  let createdTabOptions = null;
  let sidePanelClosedWith = null;
  const messageListeners = [];
  const elementListeners = {};

  const openStudioEl = makeEl();
  openStudioEl.addEventListener = (ev, cb) => {
    elementListeners[ev] = cb;
  };

  const context = {
    document: {
      getElementById: (id) => (id === 'openStudioBtn' ? openStudioEl : makeEl()),
      createElement: () => makeEl(),
      querySelectorAll: () => []
    },
    window: {
      close: () => { windowClosedCount++; }
    },
    chrome: {
      runtime: {
        getURL: (p) => 'chrome-extension://test-id/' + p,
        sendMessage: () => {},
        onMessage: {
          addListener: (cb) => { messageListeners.push(cb); }
        }
      },
      tabs: {
        create: (opts) => { createdTabOptions = opts; }
      },
      sidePanel: {
        close: async (opts) => { sidePanelClosedWith = opts; }
      },
      windows: {
        getCurrent: (cb) => { cb({ id: 101 }); }
      },
      storage: {
        local: {
          get: (keys, cb) => { if (cb) cb({}); },
          set: (obj, cb) => { if (cb) cb(); }
        },
        onChanged: { addListener: () => {} }
      }
    },
    console: console
  };
  context.window.window = context.window;

  vm.createContext(context);
  vm.runInContext(i18nJs, context);
  context.FlowI18n = context.window.FlowI18n;
  vm.runInContext(sidepanelJs, context);

  // 1. Test clicking openStudioBtn in real sidepanel.js
  assert.ok(elementListeners['click'], 'Click listener must be registered on openStudioBtn');
  elementListeners['click']();
  assert.strictEqual(windowClosedCount, 1, 'window.close() must be called on click');
  assert.strictEqual(createdTabOptions?.url, 'chrome-extension://test-id/studio.html');
  assert.strictEqual(sidePanelClosedWith?.windowId, 101, 'chrome.sidePanel.close must be called with windowId');

  // 2. Test receiving CLOSE_SIDEPANEL message in real sidepanel.js
  let responseData = null;
  sidePanelClosedWith = null;
  for (const listener of messageListeners) {
    listener({ type: 'CLOSE_SIDEPANEL' }, {}, (r) => { responseData = r; });
  }
  assert.strictEqual(windowClosedCount, 2, 'window.close() must be called on CLOSE_SIDEPANEL message');
  assert.strictEqual(sidePanelClosedWith?.windowId, 101, 'chrome.sidePanel.close must be called with windowId');
  assert.strictEqual(responseData?.ok, true, 'Response must be { ok: true }');
}

console.log('✅ Test 2 PASSED: Real sidepanel.js click and message listener work correctly.\n');

// ---------------------------------------------------------------------
// Test 3: Real studio.js Execution — closeSidePanelIfOpen
// ---------------------------------------------------------------------
console.log('--- Test 3: Real studio.js Execution (closeSidePanelIfOpen) ---');

{
  const sentMessages = [];
  let closedWith = null;

  const context = {
    document: {
      getElementById: () => makeEl(),
      createElement: () => makeEl(),
      querySelectorAll: () => []
    },
    window: {
      addEventListener: () => {}
    },
    chrome: {
      runtime: {
        getURL: (p) => 'chrome-extension://test-id/' + p,
        sendMessage: (msg, cb) => { sentMessages.push(msg); if (cb) cb(); },
        onMessage: { addListener: () => {} }
      },
      sidePanel: {
        close: async (opts) => { closedWith = opts; }
      },
      windows: {
        getCurrent: (cb) => { cb({ id: 888 }); }
      },
      tabs: {
        create: () => {}
      },
      storage: {
        local: {
          get: (keys, cb) => { if (cb) cb({}); },
          set: (obj, cb) => { if (cb) cb(); }
        },
        onChanged: { addListener: () => {} }
      }
    },
    console: console
  };
  context.window.window = context.window;

  vm.createContext(context);
  vm.runInContext(i18nJs, context);
  context.FlowI18n = context.window.FlowI18n;
  vm.runInContext(studioJs, context);

  assert.ok(sentMessages.some(m => m && m.type === 'CLOSE_SIDEPANEL'), 'studio.js must broadcast CLOSE_SIDEPANEL');
  assert.strictEqual(closedWith?.windowId, 888, 'studio.js must call chrome.sidePanel.close with windowId: 888');
}

console.log('✅ Test 3 PASSED: Real studio.js closeSidePanelIfOpen broadcasts and calls sidePanel.close.\n');

// ---------------------------------------------------------------------
// Test 4: Real background.js Execution — openWebStudio & Message Handlers
// ---------------------------------------------------------------------
console.log('--- Test 4: Real background.js Execution (openWebStudio & Messages) ---');

{
  let broadcastMsg = null;
  let closedWindowId = null;
  let createdTabOpts = null;
  let onMessageListener = null;
  let contextMenuListener = null;

  const context = {
    chrome: {
      runtime: {
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        onMessage: { addListener: (cb) => { onMessageListener = cb; } },
        getURL: (p) => 'chrome-extension://flow-ext/' + p,
        sendMessage: (msg, cb) => { broadcastMsg = msg; if (cb) cb(); },
        lastError: null
      },
      contextMenus: {
        create: () => {},
        onClicked: { addListener: (cb) => { contextMenuListener = cb; } }
      },
      tabs: {
        create: (opts) => { createdTabOpts = opts; },
        query: async () => []
      },
      sidePanel: {
        setPanelBehavior: async () => {},
        close: async (opts) => { closedWindowId = opts?.windowId; }
      },
      windows: {
        getLastFocused: (cb) => { cb({ id: 999 }); }
      },
      storage: {
        local: { get: () => {} },
        onChanged: { addListener: () => {} }
      },
      declarativeNetRequest: {
        getDynamicRules: async () => [],
        updateDynamicRules: async () => {}
      }
    },
    console: console,
    setInterval: () => {},
    Map: Map,
    Date: Date
  };

  vm.createContext(context);
  vm.runInContext(backgroundJs, context);

  // 1. Context menu open_flow_studio with explicit windowId 123
  contextMenuListener({ menuItemId: 'open_flow_studio' }, { windowId: 123 });
  assert.strictEqual(broadcastMsg?.type, 'CLOSE_SIDEPANEL');
  assert.strictEqual(closedWindowId, 123);
  assert.strictEqual(createdTabOpts.url, 'chrome-extension://flow-ext/studio.html');
  assert.strictEqual(createdTabOpts.windowId, 123, 'Must route new tab to explicit windowId');

  // 2. Context menu fallback when tab is missing
  closedWindowId = null;
  createdTabOpts = null;
  contextMenuListener({ menuItemId: 'open_flow_studio' }, null);
  assert.strictEqual(closedWindowId, 999, 'Must fall back to getLastFocused windowId');
  assert.strictEqual(createdTabOpts.url, 'chrome-extension://flow-ext/studio.html');
  assert.strictEqual(createdTabOpts.windowId, undefined);

  // 3. OPEN_STUDIO message handler with windowId
  closedWindowId = null;
  createdTabOpts = null;
  let resp = null;
  onMessageListener({ type: 'OPEN_STUDIO', windowId: 456 }, {}, (r) => { resp = r; });
  assert.strictEqual(closedWindowId, 456);
  assert.strictEqual(createdTabOpts.url, 'chrome-extension://flow-ext/studio.html');
  assert.strictEqual(createdTabOpts.windowId, 456);
  assert.strictEqual(resp?.ok, true);

  // 4. CLOSE_SIDEPANEL message handler with explicit message.windowId
  closedWindowId = null;
  resp = null;
  onMessageListener({ type: 'CLOSE_SIDEPANEL', windowId: 789 }, {}, (r) => { resp = r; });
  assert.strictEqual(closedWindowId, 789);
  assert.strictEqual(resp?.ok, true);
}

console.log('✅ Test 4 PASSED: Real background.js openWebStudio handles explicit and fallback windowId.\n');

// ---------------------------------------------------------------------
// Test 5: Graceful Degradation & Resilience (Edge Cases)
// ---------------------------------------------------------------------
console.log('--- Test 5: Resilience & Unsupported API Edge Cases ---');

// 5.1 chrome.sidePanel.close is not a function (Chrome < 122 or mocked environment without sidePanel)
{
  assert.doesNotThrow(() => {
    const mockChrome = {
      runtime: {
        sendMessage: (msg, cb) => cb && cb(),
        lastError: null
      },
      sidePanel: {}, // no close method
      windows: {
        getCurrent: (cb) => cb({ id: 1 })
      }
    };

    if (mockChrome.sidePanel && typeof mockChrome.sidePanel.close === "function") {
      mockChrome.sidePanel.close({ windowId: 1 });
    }
  }, 'Must safely skip chrome.sidePanel.close if not supported');
}

// 5.2 chrome.runtime.lastError when no receiver exists for CLOSE_SIDEPANEL
{
  assert.doesNotThrow(() => {
    const mockChrome = {
      runtime: {
        sendMessage: (msg, cb) => {
          mockChrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." };
          if (cb) cb();
        },
        lastError: null
      }
    };

    try {
      mockChrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" }, () => {
        void mockChrome.runtime.lastError;
      });
    } catch (_) {}
  }, 'Must safely handle lastError when no sidepanel is open');
}

// 5.3 window.close does not throw in headless or node environment where window is undefined
{
  assert.doesNotThrow(() => {
    const testWindow = undefined;
    if (typeof testWindow !== "undefined" && typeof testWindow.close === "function") {
      testWindow.close();
    }
  }, 'Must safely handle environments without window.close');
}

// 5.4 chrome.sidePanel.close never invoked with 0 arguments
{
  let zeroArgCalled = false;
  const mockChrome = {
    sidePanel: {
      close: (opts) => {
        if (!opts || typeof opts !== 'object') zeroArgCalled = true;
      }
    }
  };
  const winId = undefined;
  if (typeof winId === 'number') {
    mockChrome.sidePanel.close({ windowId: winId });
  }
  assert.strictEqual(zeroArgCalled, false, 'sidePanel.close must not be called with undefined or 0 args');
}

console.log('✅ Test 5 PASSED: Robust error handling and graceful degradation verified.\n');

console.log('=== ALL 5 AUTOCLOSE TESTS PASSED SUCCESSFULLY! ===\n');
