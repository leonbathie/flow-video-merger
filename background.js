// Service Worker (Manifest V3) — Flow Video Merger
// Support complet des vidéos /boost & upscale, multi-frames et résilience IPC

// Configuration automatique des règles anti-CORP (Cross-Origin-Resource-Policy) pour Google Flow
async function ensureDeclarativeNetRules() {
  if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateDynamicRules) return;
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map((r) => r.id);
    const standardResourceTypes = [
      "main_frame",
      "sub_frame",
      "stylesheet",
      "script",
      "image",
      "font",
      "object",
      "xmlhttprequest",
      "media",
      "websocket",
      "other"
    ];
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: [
        {
          id: 101,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "/asb/",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 102,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||flow.google.com",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 103,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||flow.google",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 104,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||labs.google",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 105,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||storage.googleapis.com",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 106,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||googleusercontent.com",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 107,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||aitestkitchen.withgoogle.com",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 108,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||googlevideo.com",
            resourceTypes: standardResourceTypes
          }
        },
        {
          id: 109,
          priority: 2,
          action: {
            type: "modifyHeaders",
            responseHeaders: [
              { header: "Cross-Origin-Resource-Policy", operation: "set", value: "cross-origin" },
              { header: "Cross-Origin-Embedder-Policy", operation: "set", value: "unsafe-none" }
            ]
          },
          condition: {
            urlFilter: "||deepmind.google",
            resourceTypes: standardResourceTypes
          }
        }
      ]
    });
  } catch (err) {
    console.warn("Dynamic declarativeNetRequest rules registration notice:", err);
  }
}

// Initialisation immédiate au réveil du service worker
ensureDeclarativeNetRules().catch(() => {});

let bgLang = "en";

function updateContextMenuTitle(lang) {
  if (chrome.contextMenus && chrome.contextMenus.update) {
    const isFr = lang === "fr";
    chrome.contextMenus.update("open_flow_studio", {
      title: isFr ? "🎬 Ouvrir Flow Video Studio (Plein Écran Web)" : "🎬 Open Flow Video Studio (Fullscreen Web)"
    }, () => {
      void chrome.runtime.lastError;
    });
  }
}

try {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(["fvm_lang"], (res) => {
      if (res && (res.fvm_lang === "en" || res.fvm_lang === "fr")) {
        bgLang = res.fvm_lang;
        updateContextMenuTitle(bgLang);
      }
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.fvm_lang && changes.fvm_lang.newValue) {
        bgLang = changes.fvm_lang.newValue;
        updateContextMenuTitle(bgLang);
      }
    });
  }
} catch (_) {}

chrome.runtime.onInstalled.addListener(() => {
  ensureDeclarativeNetRules();
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn("SidePanel behavior warning:", err);
    });
  }
  if (chrome.contextMenus) {
    const isFr = bgLang === "fr";
    chrome.contextMenus.create({
      id: "open_flow_studio",
      title: isFr ? "🎬 Ouvrir Flow Video Studio (Plein Écran Web)" : "🎬 Open Flow Video Studio (Fullscreen Web)",
      contexts: ["action", "page"]
    }, () => {
      void chrome.runtime.lastError;
    });
  }
});

// Ouverture du Studio Web avec fermeture automatique du panneau latéral (Side Panel)
function openWebStudio(windowId) {
  // 1. Diffuser CLOSE_SIDEPANEL à tous les composants d'extension
  if (chrome.runtime && typeof chrome.runtime.sendMessage === "function") {
    try {
      chrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" }, () => {
        void chrome.runtime.lastError;
      });
    } catch (_) {}
  }

  // 2. Fermer le panneau latéral via l'API chrome.sidePanel si supportée
  try {
    if (typeof windowId === "number") {
      chrome.sidePanel?.close?.({ windowId })?.catch?.(() => {});
    }
  } catch (_) {}

  if (typeof windowId !== "number" && chrome.windows && typeof chrome.windows.getLastFocused === "function") {
    try {
      chrome.windows.getLastFocused((win) => {
        if (win && typeof win.id === "number") {
          chrome.sidePanel?.close?.({ windowId: win.id })?.catch?.(() => {});
        }
      });
    } catch (_) {}
  }

  // 3. Ouvrir l'onglet du Studio Web (dans la fenêtre cible si connue)
  const tabCreateOptions = { url: chrome.runtime.getURL("studio.html") };
  if (typeof windowId === "number") {
    tabCreateOptions.windowId = windowId;
  }
  chrome.tabs.create(tabCreateOptions);
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open_flow_studio") {
      const windowId = tab ? tab.windowId : undefined;
      openWebStudio(windowId);
    }
  });
}

chrome.runtime.onStartup.addListener(() => {
  ensureDeclarativeNetRules();
});

// Trouver l'onglet le plus pertinent (Google Flow actif ou ouvert, JAMAIS une page d'extension chrome-extension://)
async function findTargetTab() {
  const isFlowUrl = (u) => Boolean(
    u &&
    !u.startsWith("chrome://") &&
    !u.startsWith("chrome-extension://") &&
    (
      u.includes("flow.google") ||
      u.includes("labs.google") ||
      u.includes("aitestkitchen.withgoogle.com") ||
      u.includes("google.com/labs") ||
      u.includes("deepmind.google")
    )
  );

  const isEligibleTab = (t) => t && t.id && t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://");

  // 1. Onglet actif de la fenêtre active s'il s'agit de Google Flow
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab && isFlowUrl(activeTab.url)) {
    return activeTab;
  }

  // 2. Recherche prioritaire de n'importe quel onglet Google Flow ouvert
  const flowTabs = await chrome.tabs.query({
    url: [
      "*://flow.google.com/*",
      "*://*.flow.google.com/*",
      "*://flow.google/*",
      "*://*.flow.google/*",
      "*://labs.google/*",
      "*://*.labs.google/*",
      "*://aitestkitchen.withgoogle.com/*",
      "*://*.aitestkitchen.withgoogle.com/*",
      "*://deepmind.google/*",
      "*://*.deepmind.google/*"
    ]
  });
  if (flowTabs.length > 0) {
    // Si un des onglets Flow est actif dans sa fenêtre, le privilégier
    const activeFlow = flowTabs.find((t) => t.active);
    return activeFlow || flowTabs[0];
  }

  // 3. Onglet actif dans la fenêtre courante si éligible (pas une extension comme Studio)
  if (activeTab && isEligibleTab(activeTab)) {
    return activeTab;
  }

  // 4. N'importe quel onglet actif éligible
  const allActive = await chrome.tabs.query({ active: true });
  for (const t of allActive) {
    if (isEligibleTab(t)) return t;
  }

  // 5. Recherche par titre ou nom "flow"
  const allTabs = await chrome.tabs.query({});
  const flowNamedTab = allTabs.find((t) => isEligibleTab(t) && (t.title?.toLowerCase().includes("flow") || t.url?.toLowerCase().includes("flow")));
  if (flowNamedTab) return flowNamedTab;

  return null;
}

// Relais des messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_STUDIO") {
    const windowId = (message && typeof message.windowId === "number")
      ? message.windowId
      : ((sender && sender.tab) ? sender.tab.windowId : undefined);
    openWebStudio(windowId);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "CLOSE_SIDEPANEL") {
    const windowId = (message && typeof message.windowId === "number")
      ? message.windowId
      : ((sender && sender.tab) ? sender.tab.windowId : undefined);
    try {
      if (typeof windowId === "number") {
        chrome.sidePanel?.close?.({ windowId })?.catch?.(() => {});
      }
    } catch (_) {}
    if (typeof windowId !== "number" && chrome.windows && typeof chrome.windows.getLastFocused === "function") {
      try {
        chrome.windows.getLastFocused((win) => {
          if (win && typeof win.id === "number") {
            chrome.sidePanel?.close?.({ windowId: win.id })?.catch?.(() => {});
          }
        });
      } catch (_) {}
    }
    sendResponse({ ok: true });
    return false;
  }

  // Scan de l'onglet actif (sur tous les frames/iframes)
  if (message.type === "SCAN_ACTIVE_TAB") {
    (async () => {
      const tab = await findTargetTab();
      if (!tab || !tab.id) {
        sendResponse({
          ok: false,
          error: bgLang === "fr"
            ? "Aucun onglet Google Flow actif détecté. Ouvrez Google Flow et réessayez."
            : "No active Google Flow tab detected. Open Google Flow and try again."
        });
        return;
      }

      const sortMode = message.sortMode || "dom";

      // Fonction d'extraction exécutée dans le contexte du frame
      function executeFrameScan(mode) {
        if (typeof window.__flowVideoMergerScanAsync === "function") {
          return window.__flowVideoMergerScanAsync(mode);
        }
        if (typeof window.__flowVideoMergerScan === "function") {
          return window.__flowVideoMergerScan(mode);
        }
        return [];
      }

      try {
        // Tenter d'abord d'exécuter la fonction de scan sur tous les frames
        let frameResults;
        try {
          frameResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: executeFrameScan,
            args: [sortMode]
          });
        } catch (_) {
          frameResults = null;
        }

        // Si aucun résultat ou scripts non injectés, injecter flow-page-bridge.js (MAIN) et content.js (ISOLATED)
        const hasValidClips = Array.isArray(frameResults) && frameResults.some((fr) => Array.isArray(fr.result) && fr.result.length > 0);
        if (!hasValidClips) {
          try {
            // 1. Injecter le pont MAIN world pour intercepter les blobs, MediaSource, et API Flow
            await chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              world: "MAIN",
              files: ["flow-page-bridge.js"]
            }).catch(() => {});

            // 2. Injecter content.js dans le monde ISOLATED
            await chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              files: ["content.js"]
            }).catch(() => {});

            await new Promise((r) => setTimeout(r, 300));
            frameResults = await chrome.scripting.executeScript({
              target: { tabId: tab.id, allFrames: true },
              func: executeFrameScan,
              args: [sortMode]
            });
          } catch (injectErr) {
            console.warn("Script injection warning:", injectErr);
          }
        }

        // Agréger tous les clips trouvés dans tous les frames
        const allClips = [];
        const seenUrls = new Set();

        if (Array.isArray(frameResults)) {
          for (const fr of frameResults) {
            const frameId = fr.frameId || 0;
            const clipsInFrame = Array.isArray(fr.result) ? fr.result : [];
            for (const clip of clipsInFrame) {
              if (clip && clip.videoUrl) {
                // Associer les identifiants de frame et de tab pour la récupération ultérieure
                clip.tabId = tab.id;
                clip.frameId = frameId;

                if (!seenUrls.has(clip.videoUrl)) {
                  seenUrls.add(clip.videoUrl);
                  allClips.push(clip);
                } else if (clip.isBoost) {
                  // Remplacer par la version Boost si doublon d'URL avec métadonnées Boost
                  const exIdx = allClips.findIndex((c) => c.videoUrl === clip.videoUrl);
                  if (exIdx !== -1) allClips[exIdx] = clip;
                }
              }
            }
          }
        }

        // Fallback message direct au cas où executeScript retourne vide
        if (allClips.length === 0) {
          chrome.tabs.sendMessage(tab.id, { type: "SCAN_FLOW_VIDEOS", sortMode }, (msgRes) => {
            if (chrome.runtime.lastError || !msgRes || !msgRes.clips || msgRes.clips.length === 0) {
              sendResponse({ ok: true, clips: [] });
            } else {
              const tagged = msgRes.clips.map((c) => ({ ...c, tabId: tab.id, frameId: 0 }));
              sendResponse({ ok: true, clips: tagged });
            }
          });
          return;
        }

        sendResponse({ ok: true, clips: allClips });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || (bgLang === "fr" ? "Erreur de scan." : "Scan error.") });
      }
    })();
    return true; // Async
  }

  // Synchronisation des badges numérotés (#01, #02...) dans l'onglet
  if (message.type === "HIGHLIGHT_CLIP_IN_TAB") {
    (async () => {
      const tab = await findTargetTab();
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "SYNC_BADGE_NUMBERS",
          orderedIds: message.orderedIds || []
        }, () => {
          void chrome.runtime.lastError;
        });
      }
    })();
    sendResponse({ ok: true });
    return false;
  }

  // Téléchargement du fichier final fusionné
  if (message.type === "DOWNLOAD_MERGED_VIDEO") {
    chrome.downloads.download(
      {
        url: message.url,
        filename: message.filename || "Flow_Video_Merged.mp4",
        saveAs: true
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true, downloadId });
        }
      }
    );
    return true;
  }

  // Gestionnaire de téléchargements par blocs en arrière-plan (anti-CORS & anti-limite IPC 32Mo)
  const bgPendingDownloads = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [id, item] of bgPendingDownloads.entries()) {
      if (now - item.createdAt > 300000) {
        bgPendingDownloads.delete(id);
      }
    }
  }, 60000);

  if (message.type === "START_BG_CHUNKED_DOWNLOAD") {
    (async () => {
      try {
        if (!message.videoUrl || message.videoUrl.startsWith("blob:")) {
          throw new Error(bgLang === "fr" ? "Les flux blob: doivent être récupérés directement depuis l'onglet source." : "Blob: streams must be retrieved directly from the source tab.");
        }
        let resp;
        try {
          resp = await fetch(message.videoUrl, { credentials: "include" });
        } catch (_) {
          resp = await fetch(message.videoUrl);
        }
        if (!resp || !resp.ok) {
          throw new Error(bgLang === "fr" ? `Erreur réseau (${resp?.status || "inconnue"})` : `Network error (${resp?.status || "unknown"})`);
        }
        const blob = await resp.blob();
        const mimeType = blob.type || "video/mp4";
        const arrayBuffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const downloadId = "bgdl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
        const CHUNK_SIZE = 2 * 1024 * 1024;
        const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);
        bgPendingDownloads.set(downloadId, {
          bytes,
          mimeType,
          chunkSize: CHUNK_SIZE,
          totalChunks,
          createdAt: Date.now()
        });
        sendResponse({
          ok: true,
          downloadId,
          totalBytes: bytes.length,
          totalChunks,
          chunkSize: CHUNK_SIZE,
          mimeType
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || (bgLang === "fr" ? "Erreur de téléchargement background" : "Background download error") });
      }
    })();
    return true;
  }

  if (message.type === "GET_BG_CHUNK") {
    try {
      const item = bgPendingDownloads.get(message.downloadId);
      if (!item) throw new Error(bgLang === "fr" ? "Téléchargement background introuvable ou expiré." : "Background download not found or expired.");
      const offset = message.chunkIndex * item.chunkSize;
      if (offset >= item.bytes.length) throw new Error(bgLang === "fr" ? "Index de bloc hors limites." : "Chunk index out of bounds.");
      const slice = item.bytes.subarray(offset, Math.min(item.bytes.length, offset + item.chunkSize));
      const BLOCK = 0x8000;
      let binary = "";
      for (let i = 0; i < slice.length; i += BLOCK) {
        binary += String.fromCharCode.apply(null, slice.subarray(i, Math.min(slice.length, i + BLOCK)));
      }
      sendResponse({ ok: true, data: btoa(binary) });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return false;
  }

  if (message.type === "FINISH_BG_CHUNKED_DOWNLOAD") {
    if (message.downloadId) bgPendingDownloads.delete(message.downloadId);
    sendResponse({ ok: true });
    return false;
  }

  // Récupération de ressource sécurisée en arrière-plan (miniatures, images < 6Mo)
  if (message.type === "FETCH_BACKGROUND_RESOURCE") {
    (async () => {
      try {
        let resp;
        try {
          resp = await fetch(message.url, { credentials: "include" });
        } catch (_) {
          resp = await fetch(message.url);
        }
        if (!resp || !resp.ok) {
          throw new Error(bgLang === "fr" ? `Erreur réseau (${resp?.status || "inconnue"})` : `Network error (${resp?.status || "unknown"})`);
        }
        const blob = await resp.blob();
        if (blob.size > 6 * 1024 * 1024) {
          sendResponse({
            ok: false,
            error: bgLang === "fr"
              ? "Ressource trop volumineuse pour message direct, utilisez START_BG_CHUNKED_DOWNLOAD"
              : "Resource too large for direct message, use START_BG_CHUNKED_DOWNLOAD",
            requiresChunked: true
          });
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ ok: true, dataUrl: reader.result, mimeType: blob.type, size: blob.size });
        };
        reader.onerror = () => {
          sendResponse({ ok: false, error: bgLang === "fr" ? "Échec conversion FileReader" : "FileReader conversion failed" });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        sendResponse({ ok: false, error: err.message || (bgLang === "fr" ? "Erreur de récupération background" : "Background fetch error") });
      }
    })();
    return true;
  }
});
