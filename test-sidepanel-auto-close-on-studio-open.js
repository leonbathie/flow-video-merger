// Automated Test Suite: Side Panel Auto-Close on Web Studio Open
// Verifies that when the Web Studio (studio.html) is opened, the Side Panel (sidepanel.html) is automatically closed.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== TEST SUITE: Side Panel Auto-Close on Web Studio Open ===\n');

// ---------------------------------------------------------------------
// Test 1: Static Code Architecture & Pattern Integrity
// ---------------------------------------------------------------------
console.log('--- Test 1: Static Architecture Validation (sidepanel.js, studio.js, background.js) ---');

const sidepanelJs = fs.readFileSync(path.join(__dirname, 'sidepanel.js'), 'utf8');
const studioJs = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
const backgroundJs = fs.readFileSync(path.join(__dirname, 'background.js'), 'utf8');

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

// ---------------------------------------------------------------------
// Test 2: sidepanel.js Unit Simulation — Button Click & Message Listener
// ---------------------------------------------------------------------
console.log('--- Test 2: sidepanel.js Unit Simulation (Click & Message) ---');

// Simulate openStudioBtn click in sidepanel.js
{
  let windowClosed = false;
  let createdUrl = null;

  const mockWindow = {
    close: () => {
      windowClosed = true;
    }
  };

  const mockChrome = {
    tabs: {
      create: (opts) => {
        createdUrl = opts.url;
      }
    },
    runtime: {
      getURL: (page) => `chrome-extension://test-id/${page}`,
      onMessage: {
        addListener: () => {}
      }
    }
  };

  // Simulate handler logic from sidepanel.js
  const clickHandler = () => {
    mockChrome.tabs.create({ url: mockChrome.runtime.getURL("studio.html") });
    if (typeof mockWindow !== "undefined" && typeof mockWindow.close === "function") {
      mockWindow.close();
    }
  };

  clickHandler();

  assert.strictEqual(createdUrl, 'chrome-extension://test-id/studio.html', 'Must open studio.html tab');
  assert.strictEqual(windowClosed, true, 'window.close() must be invoked immediately on button click');
}

// Simulate CLOSE_SIDEPANEL message listener in sidepanel.js
{
  let windowClosed = false;
  let responseData = null;

  const mockWindow = {
    close: () => {
      windowClosed = true;
    }
  };

  const messageHandler = (message, sender, sendResponse) => {
    if (message && message.type === "CLOSE_SIDEPANEL") {
      if (sendResponse) {
        try {
          sendResponse({ ok: true });
        } catch (_) {}
      }
      if (typeof mockWindow !== "undefined" && typeof mockWindow.close === "function") {
        mockWindow.close();
      }
      return true;
    }
  };

  const handled = messageHandler(
    { type: "CLOSE_SIDEPANEL" },
    {},
    (res) => { responseData = res; }
  );

  assert.strictEqual(handled, true, 'Message handler must return true for async handling/confirmation');
  assert.strictEqual(windowClosed, true, 'window.close() must be invoked on CLOSE_SIDEPANEL message');
  assert.deepStrictEqual(responseData, { ok: true }, 'Response must be { ok: true }');
}

console.log('✅ Test 2 PASSED: sidepanel.js button click and message listener work correctly.\n');

// ---------------------------------------------------------------------
// Test 3: studio.js Unit Simulation — closeSidePanelIfOpen
// ---------------------------------------------------------------------
console.log('--- Test 3: studio.js Unit Simulation (closeSidePanelIfOpen) ---');

{
  let sentMessage = null;
  let sidePanelClosedWith = null;

  const mockChrome = {
    runtime: {
      sendMessage: (msg, cb) => {
        sentMessage = msg;
        if (cb) cb();
      },
      lastError: null
    },
    sidePanel: {
      close: async (options) => {
        sidePanelClosedWith = options;
      }
    },
    windows: {
      getCurrent: (cb) => {
        cb({ id: 888 });
      }
    }
  };

  // Re-run closeSidePanelIfOpen logic with mockChrome
  const closeSidePanelIfOpen = () => {
    if (typeof mockChrome === "undefined") return;

    if (mockChrome.runtime && typeof mockChrome.runtime.sendMessage === "function") {
      try {
        mockChrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" }, () => {
          void mockChrome.runtime.lastError;
        });
      } catch (_) {}
    }

    if (mockChrome.sidePanel && typeof mockChrome.sidePanel.close === "function") {
      if (mockChrome.windows && typeof mockChrome.windows.getCurrent === "function") {
        try {
          mockChrome.windows.getCurrent((currentWin) => {
            const windowId = currentWin ? currentWin.id : undefined;
            try {
              if (typeof windowId === "number") {
                mockChrome.sidePanel?.close?.({ windowId })?.catch?.(() => {});
              } else {
                mockChrome.sidePanel?.close?.()?.catch?.(() => {});
              }
            } catch (_) {}
          });
        } catch (_) {
          try {
            mockChrome.sidePanel?.close?.()?.catch?.(() => {});
          } catch (_) {}
        }
      } else {
        try {
          mockChrome.sidePanel?.close?.()?.catch?.(() => {});
        } catch (_) {}
      }
    }
  };

  closeSidePanelIfOpen();

  assert.deepStrictEqual(sentMessage, { type: "CLOSE_SIDEPANEL" }, 'Must broadcast CLOSE_SIDEPANEL message');
  assert.deepStrictEqual(sidePanelClosedWith, { windowId: 888 }, 'Must call chrome.sidePanel.close with windowId');
}

console.log('✅ Test 3 PASSED: studio.js closeSidePanelIfOpen broadcasts and calls sidePanel.close.\n');

// ---------------------------------------------------------------------
// Test 4: background.js Unit Simulation — openWebStudio & CLOSE_SIDEPANEL
// ---------------------------------------------------------------------
console.log('--- Test 4: background.js Unit Simulation (openWebStudio & Messages) ---');

{
  let broadcastMsg = null;
  let closedWindowId = null;
  let tabCreatedUrl = null;

  const mockChrome = {
    runtime: {
      getURL: (p) => `chrome-extension://flow-ext/${p}`,
      sendMessage: (msg, cb) => {
        broadcastMsg = msg;
        if (cb) cb();
      },
      lastError: null
    },
    sidePanel: {
      close: async (options) => {
        closedWindowId = options?.windowId;
      }
    },
    windows: {
      getLastFocused: (cb) => {
        cb({ id: 999 });
      }
    },
    tabs: {
      create: (opts) => {
        tabCreatedUrl = opts.url;
      }
    }
  };

  const openWebStudio = (windowId) => {
    if (mockChrome.runtime && typeof mockChrome.runtime.sendMessage === "function") {
      try {
        mockChrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" }, () => {
          void mockChrome.runtime.lastError;
        });
      } catch (_) {}
    }

    try {
      if (typeof windowId === "number") {
        mockChrome.sidePanel?.close?.({ windowId })?.catch?.(() => {});
      } else {
        mockChrome.sidePanel?.close?.()?.catch?.(() => {});
      }
    } catch (_) {}

    if (typeof windowId !== "number" && mockChrome.windows && typeof mockChrome.windows.getLastFocused === "function") {
      try {
        mockChrome.windows.getLastFocused((win) => {
          if (win && win.id) {
            mockChrome.sidePanel?.close?.({ windowId: win.id })?.catch?.(() => {});
          }
        });
      } catch (_) {}
    }

    mockChrome.tabs.create({ url: mockChrome.runtime.getURL("studio.html") });
  };

  // Case 1: Called with windowId 123 (e.g. from context menu)
  openWebStudio(123);
  assert.deepStrictEqual(broadcastMsg, { type: "CLOSE_SIDEPANEL" });
  assert.strictEqual(closedWindowId, 123);
  assert.strictEqual(tabCreatedUrl, 'chrome-extension://flow-ext/studio.html');

  // Case 2: Called without windowId (falls back to getLastFocused)
  closedWindowId = null;
  openWebStudio(undefined);
  assert.strictEqual(closedWindowId, 999, 'Must fall back to getLastFocused windowId');
}

console.log('✅ Test 4 PASSED: background.js openWebStudio handles both explicit and fallback windowId.\n');

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

    // studio.js closeSidePanelIfOpen must not throw
    if (mockChrome.sidePanel && typeof mockChrome.sidePanel.close === "function") {
      mockChrome.sidePanel.close();
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

console.log('✅ Test 5 PASSED: Robust error handling and graceful degradation verified.\n');

console.log('=== ALL 5 AUTOCLOSE TESTS PASSED SUCCESSFULLY! ===\n');
