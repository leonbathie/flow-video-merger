// Content Script — Détection, Numérotation & Capture des Vidéos dans Google Flow
// Support complet des flux /boost & upscale haute résolution, Shadow DOM, et protocole par blocs (anti-CORS & IPC 32Mo)

(() => {
  if (window.__flowVideoMergerInjected) return;
  window.__flowVideoMergerInjected = true;

  const discoveredVideos = new Map(); // clipId -> metadata
  const pendingDownloads = new Map(); // downloadId -> { bytes, mimeType, chunkSize, totalChunks, createdAt }
  let sequenceOrderIds = []; // Liste ordonnée des clipIds sélectionnés
  let discoveryCounter = 0;
  let currentLang = "en"; // English is the default primary language

  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["fvm_lang"], (res) => {
        if (res && (res.fvm_lang === "en" || res.fvm_lang === "fr")) {
          currentLang = res.fvm_lang;
          updateAllBadges();
        }
      });
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.fvm_lang && changes.fvm_lang.newValue) {
          currentLang = changes.fvm_lang.newValue;
          updateAllBadges();
        }
      });
    }
  } catch (_) {}

  // Registre des métadonnées Flow capturées par le pont MAIN world (API fetch/XHR, globals)
  const pageBridgeMetadataMap = new Map();

  function ensurePageBridgeInjected() {
    try {
      if (typeof document !== "undefined" && !document.getElementById("fvm-page-bridge-script")) {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
          const s = document.createElement("script");
          s.id = "fvm-page-bridge-script";
          s.src = chrome.runtime.getURL("flow-page-bridge.js");
          (document.head || document.documentElement || document.body)?.appendChild(s);
        }
      }
    } catch (_) {}
  }
  ensurePageBridgeInjected();

  function enrichClipWithFlowMetadata(meta, item) {
    if (!meta || !item) return;
    let changed = false;
    if (!meta.generationId && item.generationId) { meta.generationId = item.generationId; changed = true; }
    if (meta.sceneNumber === null && item.sceneNumber !== null && item.sceneNumber !== undefined) { meta.sceneNumber = item.sceneNumber; changed = true; }
    if ((!meta.promptText || meta.promptText.startsWith("Clip Flow #")) && item.promptText) { meta.promptText = item.promptText; changed = true; }
    if (!meta.createdAt && item.createdAt) { meta.createdAt = item.createdAt; meta.createdAtLabel = item.createdAtLabel; changed = true; }
    if (!meta.resolution && item.resolution) { meta.resolution = item.resolution; meta.width = item.width; meta.height = item.height; changed = true; }
    if (item.isBoost && !meta.isBoost) { meta.isBoost = true; changed = true; }
    if (!meta.model && item.model) { meta.model = item.model; changed = true; }
    if (!meta.seed && item.seed) { meta.seed = item.seed; changed = true; }
    if (changed) {
      meta.flowMetadata = meta.flowMetadata || {};
      Object.assign(meta.flowMetadata, item);
      chrome.runtime.sendMessage({
        type: "CLIP_METADATA_UPDATED",
        clipId: meta.id,
        generationId: meta.generationId,
        sceneNumber: meta.sceneNumber,
        promptText: meta.promptText,
        createdAt: meta.createdAt,
        createdAtLabel: meta.createdAtLabel,
        resolution: meta.resolution,
        width: meta.width,
        height: meta.height,
        duration: meta.duration,
        isBoost: meta.isBoost,
        model: meta.model,
        seed: meta.seed,
        flowMetadata: meta.flowMetadata
      }).catch(() => {});
    }
  }

  // Écoute des métadonnées provenant du pont MAIN world
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.source === "FLOW_PAGE_BRIDGE") {
        if (event.data.type === "FLOW_METADATA_ITEM" && event.data.metadata) {
          const item = event.data.metadata;
          if (item.videoUrl) pageBridgeMetadataMap.set(item.videoUrl, item);
          if (item.generationId) pageBridgeMetadataMap.set(item.generationId, item);
          if (item.promptText && item.promptText.length > 5) pageBridgeMetadataMap.set(item.promptText.slice(0, 60), item);
          for (const meta of discoveredVideos.values()) {
            if (
              (meta.videoUrl && meta.videoUrl === item.videoUrl) ||
              (meta.generationId && meta.generationId === item.generationId)
            ) {
              enrichClipWithFlowMetadata(meta, item);
            }
          }
        } else if (event.data.type === "FLOW_ALL_METADATA_RESPONSE" && Array.isArray(event.data.items)) {
          for (const item of event.data.items) {
            if (item.videoUrl) pageBridgeMetadataMap.set(item.videoUrl, item);
            if (item.generationId) pageBridgeMetadataMap.set(item.generationId, item);
            if (item.promptText && item.promptText.length > 5) pageBridgeMetadataMap.set(item.promptText.slice(0, 60), item);
          }
        }
      }
    });

    try {
      window.postMessage({ type: "FVM_REQUEST_ALL_METADATA" }, "*");
    } catch (_) {}
  }

  // Nettoyage périodique des sessions de téléchargement expirées (> 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [id, item] of pendingDownloads.entries()) {
      if (now - item.createdAt > 300000) {
        pendingDownloads.delete(id);
      }
    }
  }, 60000);

  // CSS pour les badges de numérotation injectés sur les vidéos Google Flow
  const OVERLAY_BADGE_CSS = `
    .fvm-overlay-btn {
      position: absolute !important;
      top: 10px !important;
      left: 10px !important;
      z-index: 99999 !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      padding: 5px 12px !important;
      border-radius: 999px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif !important;
      font-size: 11.5px !important;
      font-weight: 700 !important;
      letter-spacing: 0.02em !important;
      color: #ffffff !important;
      background: rgba(11, 15, 25, 0.85) !important;
      border: 1px solid rgba(255, 255, 255, 0.18) !important;
      cursor: pointer !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
      backdrop-filter: blur(8px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(8px) saturate(180%) !important;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
      user-select: none !important;
      line-height: 1.2 !important;
    }
    .fvm-overlay-btn:hover {
      transform: translateY(-1px) scale(1.04) !important;
      background: rgba(30, 41, 59, 0.95) !important;
      border-color: rgba(99, 102, 241, 0.8) !important;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(99, 102, 241, 0.35) !important;
    }
    .fvm-overlay-btn:active {
      transform: translateY(0) scale(0.98) !important;
    }
    .fvm-overlay-btn.fvm-selected {
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.45), 0 0 10px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
    }
    .fvm-overlay-btn.fvm-boost-badge {
      border-color: rgba(245, 158, 11, 0.75) !important;
    }
    .fvm-overlay-btn.fvm-boost-badge::after {
      content: "⚡" !important;
      font-size: 11px !important;
      margin-left: 2px !important;
      color: #fbbf24 !important;
    }
  `;

  // Injecter le style global
  const mainStyleEl = document.createElement("style");
  mainStyleEl.dataset.fvmGlobalStyle = "true";
  mainStyleEl.textContent = OVERLAY_BADGE_CSS;
  (document.head || document.documentElement).appendChild(mainStyleEl);

  // Assurer la présence des styles dans un ShadowRoot donné
  function ensureShadowStyles(rootNode) {
    if (rootNode && rootNode instanceof ShadowRoot && !rootNode.querySelector("style[data-fvm-shadow-style]")) {
      const s = document.createElement("style");
      s.dataset.fvmShadowStyle = "true";
      s.textContent = OVERLAY_BADGE_CSS;
      rootNode.appendChild(s);
    }
  }

  // Convertir une URL relative en URL absolue basée sur le domaine actuel
  function toAbsoluteUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return "";
    const clean = rawUrl.trim();
    if (!clean) return "";
    if (clean.startsWith("blob:") || clean.startsWith("data:")) return clean;
    try {
      return new URL(clean, window.location.href).href;
    } catch (_) {
      return clean;
    }
  }

  function isBoostIndicator(str) {
    if (!str || typeof str !== "string") return false;
    const lower = str.toLowerCase();
    return (
      lower.includes("/boost") ||
      lower.includes("boost") ||
      lower.includes("upscale") ||
      lower.includes("highres") ||
      lower.includes("high-res") ||
      lower.includes("1080p") ||
      lower.includes("4k") ||
      lower.includes("2160p") ||
      lower.includes("⚡") ||
      lower.includes("super-res") ||
      lower.includes("veo-boost")
    );
  }

  // Recherche récursive robuste dans le DOM + tous les Shadow DOM ouverts et fermés SANS doublons
  function findAllDeep(selector, root = document) {
    const results = [];
    const seen = new Set();

    // 1. Matches directs dans le light DOM du root
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

    // 2. Exploration des Shadow DOM (incluant les closed roots capturés par le pont __fvmShadowRoot)
    function walkShadows(node) {
      if (!node) return;
      const sRoot = node.shadowRoot || node.__fvmShadowRoot;
      if (sRoot) {
        if (sRoot.querySelectorAll) {
          try {
            const shadowMatches = sRoot.querySelectorAll(selector);
            for (let i = 0; i < shadowMatches.length; i++) {
              if (!seen.has(shadowMatches[i])) {
                seen.add(shadowMatches[i]);
                results.push(shadowMatches[i]);
              }
            }
          } catch (_) {}
        }
        const sChildren = sRoot.children || [];
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

    // 3. Vérification des ShadowRoots enregistrés globalement dans le pont de page
    if (typeof window !== "undefined" && window.__fvmAllShadowRoots) {
      try {
        for (const sRoot of window.__fvmAllShadowRoots) {
          if (sRoot && sRoot.querySelectorAll) {
            const matches = sRoot.querySelectorAll(selector);
            for (let i = 0; i < matches.length; i++) {
              if (!seen.has(matches[i])) {
                seen.add(matches[i]);
                results.push(matches[i]);
              }
            }
          }
        }
      } catch (_) {}
    }

    return results;
  }

  // ============================================================================
  // MOTEUR D'EXTRACTION NATIVE DES MÉTADONNÉES GOOGLE FLOW
  // (Horodatage, Scène/Ordre, Prompt, Durée, Résolution, Boost/Upscale, ID, Modèle)
  // ============================================================================

  // Traversal sécurisé vers le conteneur de carte Flow (traverse les frontières Shadow DOM)
  function findFlowCardContainer(node) {
    if (!node) return null;
    let curr = node;
    const cardSelectors = [
      "flow-card",
      "flow-video",
      "flow-generation",
      "video-card",
      "generation-card",
      "media-card",
      "prompt-card",
      "flow-node",
      "flow-item",
      "flow-tile",
      "flow-cell",
      "flow-timeline-item",
      "flow-canvas-node",
      "flow-timeline-node",
      "flow-clip-item",
      "flow-shot-item",
      "flow-scene",
      "flow-video-player",
      "video-generator-card",
      "labs-video",
      "c-wiz",
      "[data-flow-card]",
      "[data-card-id]",
      "[data-generation-id]",
      "[data-clip-id]",
      "[data-video-id]",
      "[data-asset-id]",
      "[data-task-id]",
      "[data-node-id]",
      "[data-scene-id]",
      "[data-shot-id]",
      "[data-media-id]",
      ".flow-card",
      ".video-card",
      ".generation-card",
      ".asset-card",
      ".card",
      ".card-container",
      ".generation-container",
      ".tile",
      ".flow-node",
      ".flow-timeline-node",
      ".flow-canvas-node",
      ".scene-container",
      ".shot-container"
    ];

    for (let depth = 0; depth < 12 && curr && curr !== document.documentElement; depth++) {
      if (curr.matches) {
        for (const sel of cardSelectors) {
          try {
            if (curr.matches(sel)) return curr;
          } catch (_) {}
        }
      }
      if (curr.getAttribute) {
        if (
          curr.getAttribute("data-generation-id") ||
          curr.getAttribute("data-card-id") ||
          curr.getAttribute("data-prompt") ||
          curr.getAttribute("data-created-at") ||
          curr.getAttribute("data-scene") ||
          curr.getAttribute("data-flow-metadata") ||
          curr.getAttribute("data-metadata") ||
          curr.getAttribute("data-node-id") ||
          curr.getAttribute("data-asset-id")
        ) {
          return curr;
        }
      }
      if (curr.parentElement) {
        curr = curr.parentElement;
      } else if (curr.parentNode && curr.parentNode.host) {
        curr = curr.parentNode.host;
      } else {
        break;
      }
    }
    return node.parentElement || null;
  }

  function formatTimestampLabel(ts) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      return `${h}:${m}:${s}`;
    } catch (_) {
      return "";
    }
  }

  // Parseur universel des horodatages Flow (compact, ISO, Epoch, Heure seule, et temps relatifs)
  function parseTimestampValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number" && !isNaN(val)) {
      if (val > 1000000000000) return { timestamp: val, label: formatTimestampLabel(val) };
      if (val > 1000000000) return { timestamp: val * 1000, label: formatTimestampLabel(val * 1000) };
    }
    if (typeof val !== "string") val = String(val);
    const s = val.trim();
    if (!s) return null;

    // 0. Horodatages relatifs fréquents dans l'UI Google Flow ("il y a 5 min", "2 min ago", "just now", "hier à 14:30")
    const lower = s.toLowerCase();
    if (lower === "just now" || lower === "à l'instant" || lower === "maintenant" || lower === "now") {
      const now = Date.now();
      return { timestamp: now, label: formatTimestampLabel(now) };
    }
    const relSec = lower.match(/(?:il y a\s*)?(\d+)\s*(?:s|sec|secondes?|seconds?)(?:\s*ago|\s*passées?)?/);
    if (relSec && (lower.includes("il y a") || lower.includes("ago") || lower.includes("s"))) {
      const ts = Date.now() - parseInt(relSec[1], 10) * 1000;
      return { timestamp: ts, label: formatTimestampLabel(ts) };
    }
    const relMin = lower.match(/(?:il y a\s*)?(\d+)\s*(?:m|min|minutes?)(?:\s*ago|\s*passées?)?/);
    if (relMin && (lower.includes("il y a") || lower.includes("ago") || lower.includes("min") || lower.includes("m "))) {
      const ts = Date.now() - parseInt(relMin[1], 10) * 60 * 1000;
      return { timestamp: ts, label: formatTimestampLabel(ts) };
    }
    const relHours = lower.match(/(?:il y a\s*)?(\d+)\s*(?:h|hrs|heures?|hours?)(?:\s*ago|\s*passées?)?/);
    if (relHours && (lower.includes("il y a") || lower.includes("ago") || lower.includes("h"))) {
      const ts = Date.now() - parseInt(relHours[1], 10) * 3600 * 1000;
      return { timestamp: ts, label: formatTimestampLabel(ts) };
    }
    const relDays = lower.match(/(?:il y a\s*)?(\d+)\s*(?:d|jours?|days?)(?:\s*ago|\s*passés?)?/);
    if (relDays && (lower.includes("il y a") || lower.includes("ago") || lower.includes("jour") || lower.includes("day"))) {
      const ts = Date.now() - parseInt(relDays[1], 10) * 86400 * 1000;
      return { timestamp: ts, label: formatTimestampLabel(ts) };
    }
    const yestMatch = lower.match(/(?:hier|yesterday)(?:\s*(?:à|at))?\s*([01]?\d|2[0-3])[:.]([0-5]\d)/);
    if (yestMatch) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(parseInt(yestMatch[1], 10), parseInt(yestMatch[2], 10), 0, 0);
      return { timestamp: d.getTime(), label: formatTimestampLabel(d.getTime()) };
    }

    // 1. Format compact 14 à 17 chiffres : 20261027132109 ou 20261027132109123
    const compactMatch = s.match(/\b(20\d\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])([0-5]\d)([0-5]\d)(\d{1,3})?\b/);
    if (compactMatch) {
      const year = parseInt(compactMatch[1], 10);
      const month = parseInt(compactMatch[2], 10) - 1;
      const day = parseInt(compactMatch[3], 10);
      const hour = parseInt(compactMatch[4], 10);
      const min = parseInt(compactMatch[5], 10);
      const sec = parseInt(compactMatch[6], 10);
      const ms = compactMatch[7] ? parseInt(compactMatch[7].padEnd(3, "0").slice(0, 3), 10) : 0;
      const d = new Date(Date.UTC(year, month, day, hour, min, sec, ms));
      const ts = d.getTime();
      return {
        timestamp: ts,
        label: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      };
    }

    // 2. Epoch millisecondes (13 chiffres) ou secondes (10 chiffres)
    if (/^\d{13}$/.test(s)) {
      const ts = parseInt(s, 10);
      return { timestamp: ts, label: formatTimestampLabel(ts) };
    }
    if (/^\d{10}$/.test(s)) {
      const ts = parseInt(s, 10) * 1000;
      return { timestamp: ts, label: formatTimestampLabel(ts) };
    }

    // 3. Format Date + Heure ISO ou standard : 2026-10-27T13:21:09
    const dtMatch = s.match(/\b(20\d\d)[-_./](0[1-9]|1[0-2])[-_./](0[1-9]|[12]\d|3[01])[T\s]+([01]\d|2[0-3])[:._-]([0-5]\d)(?:[:._-]([0-5]\d))?/i);
    if (dtMatch) {
      const year = parseInt(dtMatch[1], 10);
      const month = parseInt(dtMatch[2], 10) - 1;
      const day = parseInt(dtMatch[3], 10);
      const hour = parseInt(dtMatch[4], 10);
      const min = parseInt(dtMatch[5], 10);
      const sec = dtMatch[6] ? parseInt(dtMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      return {
        timestamp: d.getTime(),
        label: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      };
    }

    // 4. Heure seule : 13:21:09 ou 1:21:09 PM
    const timeMatch = s.match(/\b([01]?\d|2[0-3])[:._]([0-5]\d)(?:[:._]([0-5]\d))?(?:\s*(am|pm))?\b/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      const sec = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;
      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;
      const now = new Date();
      now.setHours(hour, min, sec, 0);
      return {
        timestamp: now.getTime(),
        label: `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      };
    }

    // 5. Date.parse générique
    const parsed = Date.parse(s);
    if (!isNaN(parsed) && parsed > 1577836800000) {
      return { timestamp: parsed, label: formatTimestampLabel(parsed) };
    }

    return null;
  }

  // Parseur universel de durée Flow
  function parseDurationValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number" && !isNaN(val) && val > 0) {
      return Number(val.toFixed(2));
    }
    const s = String(val).trim();
    if (!s) return null;

    // Rejeter formellement les horodatages HH:MM:SS (ex: 15:30:45)
    if (/\b\d{1,2}:\d{2}:\d{2}\b/.test(s)) {
      return null;
    }

    // "0:05", "00:05", "01:30" (exactement MM:SS ou M:SS)
    const mmssMatch = s.match(/(?:^|[^\d:])(\d{1,2}):([0-5]\d)(?:\.(\d+))?(?:$|[^\d:])/);
    if (mmssMatch) {
      const mins = parseInt(mmssMatch[1], 10);
      const secs = parseInt(mmssMatch[2], 10);
      const ms = mmssMatch[3] ? parseFloat("0." + mmssMatch[3]) : 0;
      return Number((mins * 60 + secs + ms).toFixed(2));
    }

    // "5s", "8.0s", "5 sec"
    const sMatch = s.match(/\b(\d+(?:\.\d+)?)\s*(?:s|sec|secondes?|seconds?)\b/i);
    if (sMatch) {
      const dur = parseFloat(sMatch[1]);
      if (!isNaN(dur) && dur > 0) return Number(dur.toFixed(2));
    }

    const num = parseFloat(s);
    if (!isNaN(num) && num > 0 && num <= 7200) {
      return Number(num.toFixed(2));
    }
    return null;
  }

  // Parseur de résolution et format d'image Flow (1080p, 4K, 720p, 9:16, 16:9, dimensions brutes)
  function parseResolutionValue(val) {
    if (!val) return null;
    const s = String(val).trim().toLowerCase();
    if (!s) return null;

    const isVertical = s.includes("9:16") || s.includes("vertical") || s.includes("portrait");

    if (s.includes("2160x3840") || (isVertical && (s.includes("4k") || s.includes("2160p")))) {
      return { resolution: "4K (9:16)", width: 2160, height: 3840 };
    }
    if (s.includes("4k") || s.includes("2160p") || s.includes("3840x2160") || s.includes("uhd")) {
      return { resolution: "4K", width: 3840, height: 2160 };
    }

    if (s.includes("1080x1920") || (isVertical && (s.includes("1080p") || s.includes("1920x1080") || s.includes("fhd")))) {
      return { resolution: "1080p (9:16)", width: 1080, height: 1920 };
    }
    if (s.includes("1080p") || s.includes("1920x1080") || s.includes("fhd") || s.includes("full hd")) {
      return { resolution: "1080p", width: 1920, height: 1080 };
    }

    if (s.includes("720x1280") || (isVertical && (s.includes("720p") || s.includes("1280x720") || s.includes("hd")))) {
      return { resolution: "720p (9:16)", width: 720, height: 1280 };
    }
    if (s.includes("720p") || s.includes("1280x720") || s.includes("hd") || s.includes("16:9") || s.includes("landscape")) {
      return { resolution: "720p", width: 1280, height: 720 };
    }

    if (isVertical) {
      return { resolution: "1080p (9:16)", width: 1080, height: 1920 };
    }

    if (s.includes("1:1") || s.includes("square") || s.includes("carré") || s.includes("1080x1080")) {
      return { resolution: "1080×1080", width: 1080, height: 1080 };
    }

    const dimMatch = s.match(/\b(\d{3,4})\s*[x×*]\s*(\d{3,4})\b/i);
    if (dimMatch) {
      const w = parseInt(dimMatch[1], 10);
      const h = parseInt(dimMatch[2], 10);
      if (w > 0 && h > 0) {
        let label = `${w}×${h}`;
        if (w === 1920 && h === 1080) label = "1080p";
        else if (w === 1080 && h === 1920) label = "1080p (9:16)";
        else if (w === 3840 && h === 2160) label = "4K";
        else if (w === 1280 && h === 720) label = "720p";
        else if (w === 720 && h === 1280) label = "720p (9:16)";
        return { resolution: label, width: w, height: h };
      }
    }
    return null;
  }

  // Parseur de numéro de scène ou ordre Flow (supporte mots-clés, ordinaux français/anglais et chiffres romains)
  function parseSceneOrderValue(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number" && !isNaN(val) && val >= 0) return val;
    const s = String(val).trim();
    if (!s) return null;

    // 1. Ordre explicite avec préfixe (Scène, Shot, Plan, Gen, Version, Step...)
    const match = s.match(/(?:scene|scène|shot|plan|partie|part|prise|take|step|étape|seq|séquence|clip|vidéo|video|gen|génération|generation|ver|version|var|variation|#)\s*0*(\d+(?:\.\d+)?)/i);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) return num;
    }

    // 2. Nombres ordinaux français et anglais
    const lower = s.toLowerCase();
    if (/^(?:1[èe]re?|1st|premi[èe]re?|first)\b/.test(lower)) return 1;
    if (/^(?:2[èe]me?|2e|2nd|deuxi[èe]me|second)\b/.test(lower)) return 2;
    if (/^(?:3[èe]me?|3e|3rd|troisi[èe]me|third)\b/.test(lower)) return 3;
    if (/^(?:4[èe]me?|4e|4th|quatri[èe]me|fourth)\b/.test(lower)) return 4;
    if (/^(?:5[èe]me?|5e|5th|cinqui[èe]me|fifth)\b/.test(lower)) return 5;
    if (/^(?:6[èe]me?|6e|6th|sixi[èe]me|sixth)\b/.test(lower)) return 6;
    if (/^(?:7[èe]me?|7e|7th|septi[èe]me|seventh)\b/.test(lower)) return 7;
    if (/^(?:8[èe]me?|8e|8th|huiti[èe]me|eighth)\b/.test(lower)) return 8;
    if (/^(?:9[èe]me?|9e|9th|neuvi[èe]me|ninth)\b/.test(lower)) return 9;
    if (/^(?:10[èe]me?|10e|10th|dixi[èe]me|tenth)\b/.test(lower)) return 10;

    // 3. Chiffres romains (Acte I..XX, Scène I..XX)
    const romanMatch = s.match(/(?:scene|scène|shot|plan|acte|partie|seq|#)?\s*\b([ivx]+)\b/i);
    if (romanMatch) {
      const romanMap = {
        i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
        xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20
      };
      const rVal = romanMap[romanMatch[1].toLowerCase()];
      if (rVal) return rVal;
    }

    // 4. Nombre pur
    const pure = parseFloat(s);
    if (!isNaN(pure) && pure >= 0 && pure <= 500) {
      return pure;
    }
    return null;
  }

  // Nettoyeur de texte de prompt (élimine le bruit de boutons UI)
  function cleanPromptText(raw) {
    if (!raw || typeof raw !== "string") return "";
    let clean = raw.trim();
    clean = clean.replace(/^\[Boost ⚡\]\s*/i, "");
    clean = clean.replace(/\b(Play|Pause|Mute|Unmute|Copier le prompt|Copy prompt|Copier|Copy|Remixer|Remix|Générer|Generate|Télécharger|Download|Partager|Share|Boost|Upscale|\+\s*S[eé]quence|#\d+\s*✓\s*S[eé]quence|1080p|4K|720p)\b/gi, " ");
    clean = clean.replace(/\s+/g, " ").trim();
    return clean.slice(0, 300);
  }

  // Inspection des propriétés internes JS, Web Component, data attributes JSON et React Fiber
  function getComponentInternalData(node) {
    if (!node) return null;
    const candidates = [];

    // 1. Attributs JSON sérialisés directement dans le DOM Flow
    if (node.getAttribute) {
      const jsonAttrs = [
        "data-flow-metadata",
        "data-metadata",
        "data-clip",
        "data-generation",
        "data-video-data",
        "data-card-data",
        "data-asset",
        "data-node",
        "data-initial-data",
        "data-state"
      ];
      for (const attr of jsonAttrs) {
        const val = node.getAttribute(attr);
        if (val && typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try {
            const parsed = JSON.parse(val);
            if (parsed && typeof parsed === "object") candidates.push(parsed);
          } catch (_) {}
        }
      }
    }

    // 2. Propriétés JS de composants Web Component / Lit / React
    const propNames = [
      "__flow_metadata__", "__flow_data__", "__flow_card__", "flowData", "videoData",
      "generationData", "mediaData", "metadata", "clip", "_clip", "video", "_video",
      "generation", "_generation", "item", "_item", "card", "_card", "model", "_model",
      "data", "_data", "asset", "_asset", "task", "_task", "result", "_result",
      "__data", "__ngContext__"
    ];
    for (const p of propNames) {
      if (node[p] && typeof node[p] === "object") candidates.push(node[p]);
    }

    for (const k in node) {
      if (k.startsWith("__reactProps") || k.startsWith("__reactFiber")) {
        const fiber = node[k];
        if (fiber) {
          if (fiber.memoizedProps) candidates.push(fiber.memoizedProps.clip, fiber.memoizedProps.video, fiber.memoizedProps.generation, fiber.memoizedProps.data, fiber.memoizedProps);
          if (fiber.return?.memoizedProps) candidates.push(fiber.return.memoizedProps.clip, fiber.return.memoizedProps.video, fiber.return.memoizedProps.generation, fiber.return.memoizedProps.data, fiber.return.memoizedProps);
        }
      }
    }

    for (const obj of candidates) {
      if (obj && typeof obj === "object") {
        if (
          obj.prompt || obj.promptText || obj.userPrompt || obj.videoUrl || obj.src ||
          obj.createdAt || obj.timestamp || obj.createTime || obj.generationTime ||
          obj.generationId || obj.id || obj.sceneNumber || obj.scene || obj.duration ||
          obj.isBoost || obj.boosted || obj.upscaled
        ) {
          return obj;
        }
      }
    }
    return null;
  }

  // Indexation du JSON embarqué dans la page (avec support AF_initDataCallback, WIZ_global_data, Next.js et scripts standards)
  let inPageScriptMapCache = null;
  let inPageScriptCacheTime = 0;
  function getInPageScriptMetadata() {
    const now = Date.now();
    if (inPageScriptMapCache && now - inPageScriptCacheTime < 4000) return inPageScriptMapCache;
    const map = new Map();
    try {
      const scripts = document.querySelectorAll("script");
      for (const s of scripts) {
        const text = s.textContent || "";
        if (!text || text.length < 15) continue;
        const type = (s.getAttribute ? (s.getAttribute("type") || "") : (s.type || "")).toLowerCase();
        const hasFlowData = s.hasAttribute ? s.hasAttribute("data-flow-metadata") : Boolean(s.dataset && s.dataset.flowMetadata);

        // 1. JSON direct ou script identifié comme contenant des métadonnées
        if (type.includes("json") || hasFlowData || (s.id && (s.id.includes("state") || s.id.includes("flow") || s.id.includes("NEXT")))) {
          try {
            const parsed = JSON.parse(text);
            walkAndIndexJson(parsed, map);
          } catch (_) {}
        }

        // 2. Format AF_initDataCallback (Google standard Wiz)
        if (text.includes("AF_initDataCallback")) {
          const match = text.match(/AF_initDataCallback\s*\(\s*(\{[\s\S]*?\})\s*\)\s*;/);
          if (match) {
            try {
              const parsed = JSON.parse(match[1]);
              walkAndIndexJson(parsed, map);
            } catch (_) {
              try {
                const dataMatch = match[1].match(/data\s*:\s*(\[[\s\S]*?\]|\{[\s\S]*?\})\s*[,}]/);
                if (dataMatch) walkAndIndexJson(JSON.parse(dataMatch[1]), map);
              } catch (_) {}
            }
          }
        }

        // 3. Format window.WIZ_global_data / window.__INITIAL_DATA__ / window.__FLOW_STATE__
        if (text.includes("WIZ_global_data") || text.includes("__INITIAL_DATA__") || text.includes("__FLOW_STATE__")) {
          const objMatch = text.match(/(?:WIZ_global_data|__INITIAL_DATA__|__FLOW_STATE__)\s*=\s*(\{[\s\S]*?\});/);
          if (objMatch) {
            try {
              const parsed = JSON.parse(objMatch[1]);
              walkAndIndexJson(parsed, map);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
    inPageScriptMapCache = map;
    inPageScriptCacheTime = now;
    return map;
  }

  function walkAndIndexJson(obj, map, depth = 0) {
    if (!obj || depth > 8) return;
    if (typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        walkAndIndexJson(item, map, depth + 1);
      }
      return;
    }

    const videoUrl = obj.videoUrl || obj.src || obj.downloadUrl || obj.playbackUrl || obj.assetUrl ||
      obj.mediaUrl || obj.videoUri || obj.downloadUri || obj.contentUri || obj.streamingUri || obj.servingUrl || obj.signedUrl ||
      (typeof obj.video === "string" ? obj.video : (obj.video?.url || obj.video?.uri || ""));
    const prompt = obj.prompt || obj.promptText || obj.userPrompt || obj.rawPrompt || obj.inputPrompt || obj.textPrompt || obj.description || "";
    const id = obj.id || obj.generationId || obj.clipId || obj.assetId || obj.mediaId || obj.taskId || obj.nodeId;

    if (videoUrl || (prompt && id)) {
      const entry = {
        generationId: String(id || ""),
        prompt: String(prompt || ""),
        videoUrl: String(videoUrl || ""),
        createdAt: obj.createdAt || obj.createTime || obj.creationTime || obj.createTimestamp || obj.timestamp || obj.generationTime || obj.timeCreated || null,
        sceneNumber: obj.sceneNumber ?? obj.scene ?? obj.sceneId ?? obj.shotNumber ?? obj.shot ?? obj.order ?? obj.index ?? obj.sequenceNumber ?? null,
        duration: obj.duration ?? obj.videoDuration ?? obj.length ?? obj.seconds ?? null,
        resolution: obj.resolution || (obj.width && obj.height ? `${obj.width}x${obj.height}` : null),
        isBoost: Boolean(obj.isBoost || obj.boosted || obj.upscaled || obj.highRes || obj.isUpscaled || obj.boost),
        model: obj.model || obj.modelName || obj.modelVersion || "",
        seed: obj.seed || obj.randomSeed || ""
      };

      if (entry.videoUrl) map.set(entry.videoUrl, entry);
      if (entry.generationId) map.set(entry.generationId, entry);
      if (entry.prompt && entry.prompt.length > 5) map.set(entry.prompt.slice(0, 60), entry);
    }

    for (const k of Object.keys(obj)) {
      walkAndIndexJson(obj[k], map, depth + 1);
    }
  }

  // Extraction complète et robuste des métadonnées natives Google Flow
  function extractFlowNativeMetadata(videoEl, videoUrl = "", containerNode = null) {
    const result = {
      generationId: "",
      sceneNumber: null,
      promptText: "",
      createdAt: null,
      createdAtLabel: "",
      duration: null,
      resolution: "",
      width: null,
      height: null,
      isBoost: false,
      model: "",
      seed: "",
      source: "unknown",
      raw: {}
    };

    const effectiveUrl = videoUrl || (videoEl && (videoEl.currentSrc || videoEl.src)) || "";
    const container = containerNode || (videoEl ? findFlowCardContainer(videoEl) : null);

    // 0. Vérifier d'abord le registre de métadonnées du pont MAIN world (API Flow et réponses réseau interceptées)
    const bridgeMatch =
      (effectiveUrl && pageBridgeMetadataMap.get(effectiveUrl)) ||
      (videoUrl && pageBridgeMetadataMap.get(videoUrl)) ||
      (container?.getAttribute && container.getAttribute("data-generation-id") && pageBridgeMetadataMap.get(container.getAttribute("data-generation-id")));
    if (bridgeMatch) {
      result.raw.bridge = bridgeMatch;
      if (bridgeMatch.generationId) result.generationId = bridgeMatch.generationId;
      if (bridgeMatch.promptText) result.promptText = cleanPromptText(bridgeMatch.promptText);
      if (bridgeMatch.sceneNumber !== null && bridgeMatch.sceneNumber !== undefined) result.sceneNumber = parseSceneOrderValue(bridgeMatch.sceneNumber);
      if (bridgeMatch.createdAt) {
        result.createdAt = bridgeMatch.createdAt;
        result.createdAtLabel = bridgeMatch.createdAtLabel || formatTimestampLabel(bridgeMatch.createdAt);
      }
      if (bridgeMatch.duration) result.duration = parseDurationValue(bridgeMatch.duration);
      if (bridgeMatch.resolution) {
        const resObj = parseResolutionValue(bridgeMatch.resolution);
        if (resObj) {
          result.resolution = resObj.resolution;
          result.width = resObj.width;
          result.height = resObj.height;
        }
      }
      if (bridgeMatch.isBoost) result.isBoost = true;
      if (bridgeMatch.model) result.model = bridgeMatch.model;
      if (bridgeMatch.seed) result.seed = bridgeMatch.seed;
      result.source = "flow_api_bridge";
    }

    // 1. Collecter tous les éléments candidats dans la hiérarchie ascendante (incluant les balises <source>)
    const candidateNodes = [];
    if (videoEl) {
      candidateNodes.push(videoEl);
      if (videoEl.querySelectorAll) {
        const sources = videoEl.querySelectorAll("source");
        for (let i = 0; i < sources.length; i++) candidateNodes.push(sources[i]);
      }
    }
    let curr = container;
    for (let depth = 0; depth < 10 && curr && curr !== document.documentElement; depth++) {
      candidateNodes.push(curr);
      curr = curr.parentElement || (curr.parentNode && curr.parentNode.host) || null;
    }

    // 2. Vérifier les données d'état interne des Web Components Flow et attributs JSON
    for (const node of candidateNodes) {
      const stateObj = getComponentInternalData(node);
      if (stateObj) {
        result.raw.componentState = stateObj;
        if (!result.generationId && (stateObj.generationId || stateObj.id)) {
          result.generationId = String(stateObj.generationId || stateObj.id);
        }
        if (result.sceneNumber === null && (stateObj.sceneNumber ?? stateObj.scene ?? stateObj.order)) {
          result.sceneNumber = parseSceneOrderValue(stateObj.sceneNumber ?? stateObj.scene ?? stateObj.order);
        }
        if (!result.promptText && (stateObj.prompt || stateObj.promptText || stateObj.userPrompt)) {
          result.promptText = cleanPromptText(stateObj.prompt || stateObj.promptText || stateObj.userPrompt);
        }
        if (!result.createdAt && (stateObj.createdAt || stateObj.timestamp || stateObj.createTime)) {
          const parsedTs = parseTimestampValue(stateObj.createdAt || stateObj.timestamp || stateObj.createTime);
          if (parsedTs) {
            result.createdAt = parsedTs.timestamp;
            result.createdAtLabel = parsedTs.label;
          }
        }
        if (!result.duration && stateObj.duration) {
          result.duration = parseDurationValue(stateObj.duration);
        }
        if (!result.resolution && stateObj.resolution) {
          const resObj = parseResolutionValue(stateObj.resolution);
          if (resObj) {
            result.resolution = resObj.resolution;
            result.width = resObj.width;
            result.height = resObj.height;
          }
        }
        if (stateObj.isBoost || stateObj.boosted || stateObj.upscaled) {
          result.isBoost = true;
        }
        if (!result.model && (stateObj.model || stateObj.modelName)) {
          result.model = String(stateObj.model || stateObj.modelName);
        }
        if (!result.seed && stateObj.seed) {
          result.seed = String(stateObj.seed);
        }
        if (result.source === "unknown") result.source = "component_state";
      }
    }

    // 3. Inspecter les attributs DOM et dataset sur les éléments et ancêtres
    for (const node of candidateNodes) {
      if (!node || !node.getAttribute) continue;

      // ID de génération
      if (!result.generationId) {
        const idAttr =
          node.getAttribute("data-generation-id") ||
          node.getAttribute("data-card-id") ||
          node.getAttribute("data-clip-id") ||
          node.getAttribute("data-video-id") ||
          node.getAttribute("data-asset-id") ||
          node.getAttribute("data-task-id") ||
          node.getAttribute("data-id");
        if (idAttr && idAttr.length > 2) result.generationId = idAttr.trim();
      }

      // Numéro de scène / ordre
      if (result.sceneNumber === null) {
        const sceneAttr =
          node.getAttribute("data-scene") ||
          node.getAttribute("data-scene-number") ||
          node.getAttribute("data-scene-num") ||
          node.getAttribute("data-scene-id") ||
          node.getAttribute("data-order") ||
          node.getAttribute("data-index") ||
          node.getAttribute("data-sequence-index") ||
          node.getAttribute("data-sequence-number") ||
          node.getAttribute("data-generation-order") ||
          node.getAttribute("data-shot-number") ||
          node.getAttribute("data-shot-id") ||
          node.getAttribute("data-step-number") ||
          node.getAttribute("data-take-number") ||
          node.getAttribute("data-clip-index") ||
          node.getAttribute("data-position") ||
          node.getAttribute("data-card-index");
        if (sceneAttr) {
          result.sceneNumber = parseSceneOrderValue(sceneAttr);
        }
      }

      // Prompt
      if (!result.promptText) {
        const promptAttr =
          node.getAttribute("data-prompt") ||
          node.getAttribute("data-prompt-text") ||
          node.getAttribute("data-full-prompt") ||
          node.getAttribute("data-original-prompt") ||
          node.getAttribute("data-user-prompt") ||
          node.getAttribute("data-generation-prompt") ||
          node.getAttribute("data-prompt-content") ||
          node.getAttribute("data-query") ||
          node.getAttribute("data-title") ||
          node.getAttribute("data-description") ||
          node.getAttribute("data-caption");
        if (promptAttr && promptAttr.trim().length > 2) {
          result.promptText = cleanPromptText(promptAttr);
        }
      }

      // Horodatage
      if (!result.createdAt) {
        const timeAttr =
          node.getAttribute("data-created-at") ||
          node.getAttribute("data-create-time") ||
          node.getAttribute("data-created") ||
          node.getAttribute("data-creation-time") ||
          node.getAttribute("data-timestamp") ||
          node.getAttribute("data-time") ||
          node.getAttribute("data-datetime") ||
          node.getAttribute("data-date") ||
          node.getAttribute("data-ts") ||
          node.getAttribute("data-generation-time") ||
          node.getAttribute("data-publish-time") ||
          node.getAttribute("data-uploaded-at") ||
          node.getAttribute("datetime");
        if (timeAttr) {
          const parsed = parseTimestampValue(timeAttr);
          if (parsed) {
            result.createdAt = parsed.timestamp;
            result.createdAtLabel = parsed.label;
          }
        }
      }

      // Durée
      if (!result.duration) {
        const durAttr =
          node.getAttribute("data-duration") ||
          node.getAttribute("data-video-duration") ||
          node.getAttribute("data-duration-seconds") ||
          node.getAttribute("data-length") ||
          node.getAttribute("data-time-length");
        if (durAttr) {
          result.duration = parseDurationValue(durAttr);
        }
      }

      // Résolution
      if (!result.resolution) {
        const resAttr =
          node.getAttribute("data-resolution") ||
          node.getAttribute("data-res") ||
          node.getAttribute("data-quality") ||
          node.getAttribute("data-dimensions");
        if (resAttr) {
          const resObj = parseResolutionValue(resAttr);
          if (resObj) {
            result.resolution = resObj.resolution;
            result.width = resObj.width;
            result.height = resObj.height;
          }
        }
      }

      // Largeur / Hauteur explicites
      if (!result.width && node.getAttribute("data-width")) {
        result.width = parseInt(node.getAttribute("data-width"), 10) || null;
      }
      if (!result.height && node.getAttribute("data-height")) {
        result.height = parseInt(node.getAttribute("data-height"), 10) || null;
      }

      // Boost / Upscale
      if (!result.isBoost) {
        const boostAttr =
          node.getAttribute("data-boost") ||
          node.getAttribute("data-is-boost") ||
          node.getAttribute("data-boosted") ||
          node.getAttribute("data-is-boosted") ||
          node.getAttribute("data-upscale") ||
          node.getAttribute("data-upscaled") ||
          node.getAttribute("data-is-upscaled") ||
          node.getAttribute("data-highres") ||
          node.getAttribute("data-hd") ||
          node.getAttribute("data-super-res") ||
          node.getAttribute("data-veo-boost");
        if (boostAttr && boostAttr !== "false" && boostAttr !== "0") {
          result.isBoost = true;
        }
      }

      // Modèle et Seed
      if (!result.model) {
        const m = node.getAttribute("data-model") || node.getAttribute("data-model-name") || node.getAttribute("data-model-version");
        if (m) result.model = m.trim();
      }
      if (!result.seed && node.getAttribute("data-seed")) {
        result.seed = node.getAttribute("data-seed").trim();
      }
    }

    // 4. Explorer les éléments enfants dans le conteneur de carte (Light DOM & Shadow DOM)
    if (container && container.querySelectorAll) {
      // A. Horodatage : balises <time> et classes temporelles
      if (!result.createdAt) {
        const timeEls = container.querySelectorAll("time, [datetime], .timestamp, .time, .creation-date, .created-at, .date, .time-ago, .meta-date, .generation-time, [data-test-id*='time'], [data-testid*='time']");
        for (let i = 0; i < timeEls.length; i++) {
          const tEl = timeEls[i];
          const rawTime = tEl.getAttribute("datetime") || tEl.getAttribute("data-timestamp") || tEl.getAttribute("title") || tEl.textContent;
          const parsed = parseTimestampValue(rawTime);
          if (parsed) {
            result.createdAt = parsed.timestamp;
            result.createdAtLabel = parsed.label;
            break;
          }
        }
      }

      // B. Prompt : balises et classes dédiées
      if (!result.promptText) {
        const promptEls = container.querySelectorAll("flow-prompt, prompt-view, prompt-display, .prompt, .prompt-text, .flow-prompt, .user-prompt, .card-prompt, .generation-prompt, .prompt-content, .prompt-display, .prompt-container, .prompt-title, [data-test-id*='prompt'], [data-testid*='prompt'], textarea[readonly], p.prompt, p.description");
        for (let i = 0; i < promptEls.length; i++) {
          const pEl = promptEls[i];
          const text = pEl.value || pEl.textContent || pEl.getAttribute("title") || pEl.getAttribute("aria-label");
          if (text && text.trim().length > 3) {
            result.promptText = cleanPromptText(text);
            break;
          }
        }
      }

      // C. Badges Scène / Ordre
      if (result.sceneNumber === null) {
        const sceneEls = container.querySelectorAll(".scene-badge, .scene-number, .order-badge, .card-index, .shot-number, .sequence-tag, .step-badge, [data-scene], [data-order]");
        for (let i = 0; i < sceneEls.length; i++) {
          const sText = sceneEls[i].textContent || sceneEls[i].getAttribute("data-scene") || sceneEls[i].getAttribute("data-order");
          const parsed = parseSceneOrderValue(sText);
          if (parsed !== null) {
            result.sceneNumber = parsed;
            break;
          }
        }
      }

      // D. Badges Résolution
      if (!result.resolution) {
        const resEls = container.querySelectorAll(".resolution-badge, .res-chip, .badge-res, .quality-badge, [data-resolution]");
        for (let i = 0; i < resEls.length; i++) {
          const rText = resEls[i].textContent || resEls[i].getAttribute("data-resolution");
          const resObj = parseResolutionValue(rText);
          if (resObj) {
            result.resolution = resObj.resolution;
            if (!result.width) result.width = resObj.width;
            if (!result.height) result.height = resObj.height;
            break;
          }
        }
      }

      // E. Badges Durée
      if (!result.duration) {
        const durEls = container.querySelectorAll(".duration-badge, .clip-duration, .badge-duration, [data-duration]");
        for (let i = 0; i < durEls.length; i++) {
          const dText = durEls[i].textContent;
          const parsed = parseDurationValue(dText);
          if (parsed) {
            result.duration = parsed;
            break;
          }
        }
      }

      // F. Badges Boost / Upscale
      if (!result.isBoost) {
        const boostEls = container.querySelectorAll(".boost-badge, .upscale-badge, .boost-chip, .badge-boost, [data-boost], [data-upscale]");
        if (boostEls.length > 0) {
          result.isBoost = true;
        } else {
          const allText = container.textContent || "";
          if (/\b(⚡|boost|upscaled?|haute résolution|veo boost)\b/i.test(allText)) {
            result.isBoost = true;
          }
        }
      }

      // G. Badges Modèle
      if (!result.model) {
        const modelEls = container.querySelectorAll(".model-badge, .model-tag, [data-model]");
        for (let i = 0; i < modelEls.length; i++) {
          const mText = modelEls[i].textContent || modelEls[i].getAttribute("data-model");
          if (mText && /veo|imagen/i.test(mText)) {
            result.model = mText.trim();
            break;
          }
        }
      }
    }

    // 5. Indexation JSON embarqué dans la page
    const scriptIndex = getInPageScriptMetadata();
    if (scriptIndex.size > 0) {
      const match =
        (videoUrl && scriptIndex.get(videoUrl)) ||
        (result.generationId && scriptIndex.get(result.generationId)) ||
        (result.promptText && scriptIndex.get(result.promptText.slice(0, 60)));
      if (match) {
        result.raw.scriptMatch = match;
        if (!result.generationId && match.generationId) result.generationId = match.generationId;
        if (!result.promptText && match.prompt) result.promptText = cleanPromptText(match.prompt);
        if (result.sceneNumber === null && match.sceneNumber !== null) result.sceneNumber = parseSceneOrderValue(match.sceneNumber);
        if (!result.createdAt && match.createdAt) {
          const parsed = parseTimestampValue(match.createdAt);
          if (parsed) {
            result.createdAt = parsed.timestamp;
            result.createdAtLabel = parsed.label;
          }
        }
        if (!result.duration && match.duration) result.duration = parseDurationValue(match.duration);
        if (!result.resolution && match.resolution) {
          const resObj = parseResolutionValue(match.resolution);
          if (resObj) {
            result.resolution = resObj.resolution;
            result.width = resObj.width;
            result.height = resObj.height;
          }
        }
        if (match.isBoost) result.isBoost = true;
        if (!result.model && match.model) result.model = match.model;
        if (!result.seed && match.seed) result.seed = match.seed;
      }
    }

    // 6. Extraction depuis l'URL de la vidéo et Resource Timing
    if (effectiveUrl) {
      // Boost par URL
      if (isBoostIndicator(effectiveUrl)) {
        result.isBoost = true;
      }

      // Horodatage dans l'URL / nom de fichier (ex: Lion_steps_in_courtyard_20261027132109.mp4)
      if (!result.createdAt) {
        const urlTs = parseTimestampValue(effectiveUrl);
        if (urlTs) {
          result.createdAt = urlTs.timestamp;
          result.createdAtLabel = urlTs.label;
        }
      }

      // Numéro de scène dans l'URL
      if (result.sceneNumber === null) {
        const urlScene = parseSceneOrderValue(effectiveUrl);
        if (urlScene !== null) result.sceneNumber = urlScene;
      }

      // Résolution dans l'URL
      if (!result.resolution) {
        const resObj = parseResolutionValue(effectiveUrl);
        if (resObj) {
          result.resolution = resObj.resolution;
          if (!result.width) result.width = resObj.width;
          if (!result.height) result.height = resObj.height;
        }
      }

      // Paramètres de requête de l'URL
      try {
        if (effectiveUrl.includes("?")) {
          let searchParams = null;
          if (typeof URL !== "undefined") {
            try {
              const base = (typeof window !== "undefined" && window.location && window.location.href) ? window.location.href : "https://flow.google.com/";
              const u = new URL(effectiveUrl, base);
              searchParams = u.searchParams;
            } catch (_) {}
          }
          if (searchParams) {
            if (!result.generationId && (searchParams.get("id") || searchParams.get("generationId"))) {
              result.generationId = searchParams.get("id") || searchParams.get("generationId");
            }
            if (!result.promptText && searchParams.get("prompt")) {
              result.promptText = cleanPromptText(searchParams.get("prompt"));
            }
            if (result.sceneNumber === null && searchParams.get("scene")) {
              result.sceneNumber = parseSceneOrderValue(searchParams.get("scene"));
            }
            if (!result.createdAt && (searchParams.get("t") || searchParams.get("createdAt"))) {
              const parsed = parseTimestampValue(searchParams.get("t") || searchParams.get("createdAt"));
              if (parsed) {
                result.createdAt = parsed.timestamp;
                result.createdAtLabel = parsed.label;
              }
            }
          } else {
            const qStr = effectiveUrl.split("?")[1] || "";
            const idM = qStr.match(/(?:^|&)(?:id|generationId)=([^&]+)/i);
            if (!result.generationId && idM) result.generationId = decodeURIComponent(idM[1]);
            const pM = qStr.match(/(?:^|&)(?:prompt)=([^&]+)/i);
            if (!result.promptText && pM) result.promptText = cleanPromptText(decodeURIComponent(pM[1].replace(/\+/g, " ")));
            const sM = qStr.match(/(?:^|&)(?:scene)=([^&]+)/i);
            if (result.sceneNumber === null && sM) result.sceneNumber = parseSceneOrderValue(decodeURIComponent(sM[1]));
            const tM = qStr.match(/(?:^|&)(?:t|createdAt)=([^&]+)/i);
            if (!result.createdAt && tM) {
              const parsed = parseTimestampValue(decodeURIComponent(tM[1]));
              if (parsed) {
                result.createdAt = parsed.timestamp;
                result.createdAtLabel = parsed.label;
              }
            }
          }
        }
      } catch (_) {}

      // Performance Resource Timing API
      if (!result.createdAt && typeof performance !== "undefined" && performance.getEntriesByName) {
        try {
          const perfEntries = performance.getEntriesByName(effectiveUrl);
          if (perfEntries && perfEntries.length > 0) {
            const entry = perfEntries[perfEntries.length - 1];
            const loadTs = Math.round((performance.timeOrigin || Date.now()) + (entry.startTime || 0));
            if (loadTs > 1577836800000) {
              result.createdAt = loadTs;
              result.createdAtLabel = formatTimestampLabel(loadTs);
            }
          }
        } catch (_) {}
      }
    }

    // 7. Propriétés natives du lecteur <video>
    if (videoEl) {
      if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
        result.duration = Number(videoEl.duration.toFixed(2));
      }
      if (videoEl.videoWidth > 0) result.width = videoEl.videoWidth;
      if (videoEl.videoHeight > 0) result.height = videoEl.videoHeight;
    }

    // 8. Normalisation finale des résolutions et dimensions
    if (result.width && result.height && !result.resolution) {
      if (result.width >= 3840 || result.height >= 2160) result.resolution = "4K";
      else if (result.width >= 1920 || result.height >= 1080) result.resolution = "1080p";
      else if (result.width >= 1280 || result.height >= 720) result.resolution = "720p";
      else result.resolution = `${result.width}×${result.height}`;
    } else if (result.isBoost && !result.resolution) {
      result.resolution = "1080p";
      if (!result.width) result.width = 1920;
      if (!result.height) result.height = 1080;
    }

    return result;
  }

  // Inspection des attributs d'un élément pour trouver une URL vidéo
  function extractUrlFromElement(el) {
    if (!el) return "";
    const priorityAttrs = [
      "data-boost-url",
      "data-upscale-url",
      "data-highres-url",
      "data-super-res-url",
      "data-video-url",
      "data-download-url",
      "data-playback-url",
      "data-stream-url",
      "data-media-url",
      "data-asset-url",
      "data-src",
      "data-url",
      "data-orig-src"
    ];

    // D'abord les attributs boost
    for (const attr of priorityAttrs) {
      const val = el.getAttribute ? el.getAttribute(attr) : null;
      if (val && isBoostIndicator(val)) {
        return toAbsoluteUrl(val.trim());
      }
    }

    // Ensuite n'importe quel attribut vidéo valide
    for (const attr of priorityAttrs) {
      const val = el.getAttribute ? el.getAttribute(attr) : null;
      if (val && val.trim()) {
        const abs = toAbsoluteUrl(val.trim());
        if (abs.startsWith("http") || abs.startsWith("blob:") || abs.includes(".mp4") || abs.includes(".webm")) {
          return abs;
        }
      }
    }

    if (el.tagName === "A" && el.href) {
      const h = el.href.trim();
      if (isBoostIndicator(h) || /\.(mp4|webm)(\?|$)/i.test(h)) {
        return toAbsoluteUrl(h);
      }
    }

    return "";
  }

  // Extraction d'URL vidéo fiable (priorise systématiquement les flux /boost & haute résolution)
  function getVideoSourceUrl(videoEl, containerNode = null) {
    if (!videoEl) return "";

    // A. Attribut boost direct sur le <video>
    const directElUrl = extractUrlFromElement(videoEl);
    if (directElUrl && isBoostIndicator(directElUrl)) {
      return directElUrl;
    }

    // B. Balises <source> enfants
    const sources = Array.from(videoEl.querySelectorAll ? videoEl.querySelectorAll("source") : []);
    let bestSourceUrl = "";
    for (const source of sources) {
      const sSrc = source.src || source.getAttribute("src") || extractUrlFromElement(source);
      if (sSrc && sSrc.trim()) {
        const abs = toAbsoluteUrl(sSrc.trim());
        if (isBoostIndicator(abs)) {
          return abs;
        }
        if (!bestSourceUrl) bestSourceUrl = abs;
      }
    }

    // C. Inspecter les conteneurs de carte Flow et leurs ancêtres (traverse les frontières Shadow DOM)
    let container = containerNode || findFlowCardContainer(videoEl);
    for (let depth = 0; depth < 10 && container && container !== document.documentElement; depth++) {
      const containerBoostUrl = extractUrlFromElement(container);
      if (containerBoostUrl && isBoostIndicator(containerBoostUrl)) {
        return containerBoostUrl;
      }

      if (container.querySelectorAll) {
        const actionLinks = container.querySelectorAll("a[href], button, [role='button'], [data-boost-url], [data-download-url], [data-video-url]");
        for (let j = 0; j < actionLinks.length; j++) {
          const linkUrl = extractUrlFromElement(actionLinks[j]);
          if (linkUrl && isBoostIndicator(linkUrl)) {
            return linkUrl;
          }
        }
      }
      container = container.parentElement || (container.parentNode && container.parentNode.host) || null;
    }

    // D. Si aucun flux boost prioritaire trouvé, utiliser la meilleure source enfant
    if (bestSourceUrl) return bestSourceUrl;

    // E. Sinon, utiliser les URLs déclarées sur l'élément vidéo
    if (directElUrl) return directElUrl;
    if (videoEl.currentSrc && videoEl.currentSrc.trim()) return toAbsoluteUrl(videoEl.currentSrc.trim());
    if (videoEl.src && videoEl.src.trim()) return toAbsoluteUrl(videoEl.src.trim());
    const attrSrc = videoEl.getAttribute ? videoEl.getAttribute("src") : null;
    if (attrSrc && attrSrc.trim()) return toAbsoluteUrl(attrSrc.trim());

    return "";
  }

  // Extraction du prompt ou du titre associé à la vidéo avec priorisation des métadonnées Flow
  function extractPromptTextNearVideo(videoEl, videoUrl = "") {
    // 1. Tenter l'extraction via les métadonnées natives Flow
    if (videoEl) {
      const flowMeta = extractFlowNativeMetadata(videoEl, videoUrl);
      if (flowMeta.promptText) {
        return flowMeta.promptText;
      }
    }

    // 2. Repli vers l'arborescence DOM environnante
    let container = videoEl ? videoEl.parentElement : null;
    for (let depth = 0; depth < 8 && container; depth++) {
      const aria = container.getAttribute("aria-label") || container.getAttribute("title");
      if (aria && aria.length > 4 && !/^(play|pause|mute|unmute|video|clip)/i.test(aria)) {
        return cleanPromptText(aria.slice(0, 140));
      }
      const textCandidate = container.innerText ? container.innerText.trim() : "";
      if (textCandidate && textCandidate.length > 3 && textCandidate.length < 350) {
        const clean = textCandidate
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !/^\d+:\d+$/.test(l) && !/^\+\s*S[eé]quence|^#\d+/i.test(l))[0];
        if (clean && clean.length > 2) return cleanPromptText(clean.slice(0, 140));
      }
      container = container.parentElement || (container.parentNode && container.parentNode.host) || null;
    }

    const isFr = currentLang === "fr";
    if (isBoostIndicator(videoUrl)) {
      return isFr ? `Clip Boost Flow #${discoveryCounter}` : `Boost Flow Clip #${discoveryCounter}`;
    }
    return isFr ? `Clip Flow #${discoveryCounter}` : `Flow Clip #${discoveryCounter}`;
  }

  function captureVideoThumbnail(videoEl) {
    if (!videoEl) return "";
    try {
      // 1. Tenter la capture par canvas si la vidéo a une frame disponible
      if (videoEl.videoWidth > 0 && videoEl.readyState >= 2) {
        const w = videoEl.videoWidth;
        const h = videoEl.videoHeight;
        const canvas = document.createElement("canvas");
        canvas.width = 240;
        canvas.height = Math.max(135, Math.round((240 * h) / w));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        if (dataUrl && dataUrl.length > 100) return dataUrl;
      }
    } catch (_) {}

    // 2. Vérifier si un poster est déclaré sur le <video>
    const poster = videoEl.poster || (videoEl.getAttribute && videoEl.getAttribute("poster"));
    if (poster && poster.trim()) {
      return toAbsoluteUrl(poster.trim());
    }

    // 3. Chercher une image miniature dans le conteneur parent (carte Flow)
    try {
      let container = videoEl.parentElement;
      for (let depth = 0; depth < 5 && container; depth++) {
        const img = container.querySelector ? container.querySelector("img") : null;
        if (img && img.src && !img.src.includes("avatar") && !img.src.includes("icon")) {
          try {
            if (img.naturalWidth > 0 && img.complete) {
              const canvas = document.createElement("canvas");
              canvas.width = 240;
              canvas.height = Math.max(135, Math.round((240 * (img.naturalHeight || 135)) / (img.naturalWidth || 240)));
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              return canvas.toDataURL("image/jpeg", 0.75);
            }
          } catch (_) {}
          return toAbsoluteUrl(img.src);
        }
        container = container.parentElement;
      }
    } catch (_) {}

    return "";
  }

  function ensureClipRegistered(videoEl, overrideUrl = null) {
    const container = videoEl ? findFlowCardContainer(videoEl) : null;
    const src = overrideUrl || getVideoSourceUrl(videoEl, container);
    if (!src) return null;

    // 1. Extraire les métadonnées natives Flow profondes
    const flowMeta = extractFlowNativeMetadata(videoEl, src, container);

    let clipId = videoEl && videoEl.dataset ? videoEl.dataset.fvmClipId : null;
    if (!clipId) {
      discoveryCounter += 1;
      clipId = flowMeta.generationId ? `flow_gen_${flowMeta.generationId}` : ("flow_clip_" + Date.now() + "_" + discoveryCounter);
      if (videoEl && videoEl.dataset) {
        videoEl.dataset.fvmClipId = clipId;
      }
    }

    let domTop = 0;
    let domLeft = 0;
    if (videoEl && typeof videoEl.getBoundingClientRect === "function") {
      const rect = videoEl.getBoundingClientRect();
      domTop = Math.round(rect.top + window.scrollY);
      domLeft = Math.round(rect.left + window.scrollX);
    } else if (container && typeof container.getBoundingClientRect === "function") {
      const rect = container.getBoundingClientRect();
      domTop = Math.round(rect.top + window.scrollY);
      domLeft = Math.round(rect.left + window.scrollX);
    }

    const isBoostVideo = Boolean(
      flowMeta.isBoost ||
      isBoostIndicator(src) ||
      (videoEl && videoEl.className && String(videoEl.className).includes("boost"))
    );
    const existing = discoveredVideos.get(clipId) || {};

    let promptText = flowMeta.promptText || existing.promptText || extractPromptTextNearVideo(videoEl, src);
    if (isBoostVideo && !promptText.includes("Boost") && !promptText.includes("⚡")) {
      promptText = `[Boost ⚡] ${promptText}`;
    }

    const duration = (videoEl && Number.isFinite(videoEl.duration) && videoEl.duration > 0)
      ? Number(videoEl.duration.toFixed(2))
      : (flowMeta.duration || existing.duration || 5);

    const thumbnail = existing.thumbnail || captureVideoThumbnail(videoEl);

    const meta = {
      id: clipId,
      generationId: flowMeta.generationId || existing.generationId || "",
      videoUrl: src,
      promptText,
      duration,
      resolution: flowMeta.resolution || existing.resolution || (isBoostVideo ? "1080p" : "720p"),
      width: (videoEl && videoEl.videoWidth) || flowMeta.width || existing.width || (isBoostVideo ? 1920 : 1280),
      height: (videoEl && videoEl.videoHeight) || flowMeta.height || existing.height || (isBoostVideo ? 1080 : 720),
      sceneNumber: flowMeta.sceneNumber ?? existing.sceneNumber ?? null,
      discoveredOrder: existing.discoveredOrder || discoveryCounter,
      createdAt: flowMeta.createdAt || existing.createdAt || Date.now(),
      createdAtLabel: flowMeta.createdAtLabel || existing.createdAtLabel || "",
      domTop,
      domLeft,
      thumbnail,
      isBoost: isBoostVideo,
      model: flowMeta.model || existing.model || "",
      seed: flowMeta.seed || existing.seed || "",
      flowMetadata: flowMeta
    };

    discoveredVideos.set(clipId, meta);
    if (videoEl) {
      injectOverlayBadge(videoEl, clipId, isBoostVideo, flowMeta.sceneNumber);

      // Si la frame n'était pas encore chargée lors du scan, écouter le chargement pour capturer la miniature
      if (!meta.thumbnail || !videoEl.videoWidth || videoEl.readyState < 2) {
        const onFrameReady = () => {
          const updatedThumb = captureVideoThumbnail(videoEl);
          if (updatedThumb) {
            const currentMeta = discoveredVideos.get(clipId);
            if (currentMeta) {
              currentMeta.thumbnail = updatedThumb;
              if (videoEl.videoWidth) currentMeta.width = videoEl.videoWidth;
              if (videoEl.videoHeight) currentMeta.height = videoEl.videoHeight;
              if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
                currentMeta.duration = Number(videoEl.duration.toFixed(2));
              }
              discoveredVideos.set(clipId, currentMeta);
              chrome.runtime.sendMessage({
                type: "CLIP_METADATA_UPDATED",
                clipId,
                thumbnail: updatedThumb,
                width: currentMeta.width,
                height: currentMeta.height,
                duration: currentMeta.duration,
                resolution: currentMeta.resolution,
                sceneNumber: currentMeta.sceneNumber,
                createdAt: currentMeta.createdAt,
                createdAtLabel: currentMeta.createdAtLabel
              }).catch(() => {});
            }
          }
        };
        videoEl.addEventListener("loadeddata", onFrameReady, { once: true });
        videoEl.addEventListener("canplay", onFrameReady, { once: true });
      }
    }
    return meta;
  }

  function injectOverlayBadge(videoEl, clipId, isBoost = false, sceneNumber = null) {
    const parent = videoEl.parentElement;
    if (!parent) return;

    const rootNode = videoEl.getRootNode();
    ensureShadowStyles(rootNode);

    const computedPos = window.getComputedStyle(parent).position;
    if (computedPos === "static") {
      parent.style.position = "relative";
    }

    const isFr = currentLang === "fr";
    let btn = parent.querySelector(`.fvm-overlay-btn[data-clip-id="${clipId}"]`);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fvm-overlay-btn" + (isBoost ? " fvm-boost-badge" : "");
      btn.dataset.clipId = clipId;
      btn.title = isBoost
        ? (isFr
            ? "Clip haute résolution Boosté (/boost) — Cliquer pour ajouter/retirer de la séquence"
            : "High-resolution Boosted clip (/boost) — Click to add/remove from sequence")
        : (isFr
            ? "Cliquer pour ajouter/retirer de la séquence ordonnée Flow Video Merger"
            : "Click to add/remove from ordered Flow Video Merger sequence");
      if (sceneNumber !== null && sceneNumber !== undefined) {
        btn.dataset.sceneNumber = String(sceneNumber);
        btn.title = (isFr ? `Scène Flow #${sceneNumber} — ` : `Flow Scene #${sceneNumber} — `) + btn.title;
      }
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const meta = ensureClipRegistered(videoEl);
        if (!meta) return;
        chrome.runtime.sendMessage({
          type: "TOGGLE_CLIP_FROM_PAGE",
          clip: meta
        });
      });
      parent.appendChild(btn);
    }
    updateSingleBadgeLabel(btn, clipId);
  }

  function updateSingleBadgeLabel(btn, clipId) {
    const idx = sequenceOrderIds.indexOf(clipId);
    const isFr = currentLang === "fr";
    if (idx !== -1) {
      const numStr = String(idx + 1).padStart(2, "0");
      btn.classList.add("fvm-selected");
      btn.textContent = isFr ? `#${numStr} ✓ Séquence` : `#${numStr} ✓ Sequence`;
    } else {
      btn.classList.remove("fvm-selected");
      btn.textContent = isFr ? "+ Séquence" : "+ Sequence";
    }
  }

  function updateAllBadges() {
    const badges = findAllDeep(".fvm-overlay-btn", document);
    const isFr = currentLang === "fr";
    badges.forEach((btn) => {
      const clipId = btn.dataset.clipId;
      const isBoost = btn.classList.contains("fvm-boost-badge");
      const sceneNumber = btn.dataset.sceneNumber;
      btn.title = isBoost
        ? (isFr
            ? "Clip haute résolution Boosté (/boost) — Cliquer pour ajouter/retirer de la séquence"
            : "High-resolution Boosted clip (/boost) — Click to add/remove from sequence")
        : (isFr
            ? "Cliquer pour ajouter/retirer de la séquence ordonnée Flow Video Merger"
            : "Click to add/remove from ordered Flow Video Merger sequence");
      if (sceneNumber !== null && sceneNumber !== undefined && sceneNumber !== "") {
        btn.title = (isFr ? `Scène Flow #${sceneNumber} — ` : `Flow Scene #${sceneNumber} — `) + btn.title;
      }
      updateSingleBadgeLabel(btn, clipId);
    });
  }

  // Scanner toutes les vidéos présentes (DOM standard + Shadow DOM + Cartes Flow + Resource Timing + Pont API)
  function scanAllVideosOnPage(sortMode = "dom") {
    const clipsMap = new Map(); // videoUrl -> clip meta

    // 1. Trouver toutes les balises <video> dans le light DOM et tous les ShadowRoots (ouverts et fermés)
    const videoElements = findAllDeep("video", document);
    videoElements.forEach((v) => {
      const src = getVideoSourceUrl(v);
      if (!src) return;
      const meta = ensureClipRegistered(v, src);
      if (meta && meta.videoUrl) {
        const prev = clipsMap.get(meta.videoUrl);
        if (!prev || (meta.isBoost && !prev.isBoost) || (meta.thumbnail && !prev.thumbnail) || (meta.flowMetadata && !prev.flowMetadata)) {
          clipsMap.set(meta.videoUrl, meta);
        }
      }
    });

    // 2. Chercher les conteneurs de cartes Google Flow (même si le lecteur <video> est différé ou lazy-loaded)
    const flowCardElements = findAllDeep("flow-card, video-card, generation-card, flow-video, flow-player, flow-generation, prompt-card, flow-node, [data-flow-card], [data-generation-id], [data-card-id], [data-clip-id], c-wiz", document);
    flowCardElements.forEach((cardEl) => {
      let cardUrl = extractUrlFromElement(cardEl);
      if (!cardUrl) {
        const childVid = cardEl.querySelector ? cardEl.querySelector("video, source") : null;
        if (childVid) {
          cardUrl = getVideoSourceUrl(childVid, cardEl);
        }
      }
      if (!cardUrl) {
        const childLink = cardEl.querySelector ? cardEl.querySelector("a[href*='.mp4'], a[href*='/asb/'], [data-video-url]") : null;
        if (childLink) {
          cardUrl = extractUrlFromElement(childLink);
        }
      }
      if (cardUrl && !clipsMap.has(cardUrl)) {
        const flowMeta = extractFlowNativeMetadata(null, cardUrl, cardEl);
        const isBoost = Boolean(flowMeta.isBoost || isBoostIndicator(cardUrl));
        discoveryCounter += 1;
        const clipId = flowMeta.generationId ? `flow_gen_${flowMeta.generationId}` : ("flow_card_" + Date.now() + "_" + discoveryCounter);
        const rect = cardEl.getBoundingClientRect ? cardEl.getBoundingClientRect() : { top: 0, left: 0 };
        let cardThumb = "";
        try {
          const img = cardEl.querySelector ? (cardEl.querySelector("img") || cardEl.parentElement?.querySelector("img")) : null;
          if (img && img.src) cardThumb = toAbsoluteUrl(img.src);
        } catch (_) {}

        let cardPrompt = flowMeta.promptText || (cardEl.title || cardEl.getAttribute("aria-label") || cardEl.innerText || `Clip #${discoveryCounter}`).slice(0, 140).trim();
        cardPrompt = cleanPromptText(cardPrompt);
        if (isBoost && !cardPrompt.includes("Boost") && !cardPrompt.includes("⚡")) {
          cardPrompt = `[Boost ⚡] ${cardPrompt}`;
        }

        const meta = {
          id: clipId,
          generationId: flowMeta.generationId || "",
          videoUrl: cardUrl,
          promptText: cardPrompt,
          duration: flowMeta.duration || 5,
          resolution: flowMeta.resolution || (isBoost ? "1080p" : "720p"),
          width: flowMeta.width || (isBoost ? 1920 : 1280),
          height: flowMeta.height || (isBoost ? 1080 : 720),
          sceneNumber: flowMeta.sceneNumber ?? null,
          discoveredOrder: discoveryCounter,
          createdAt: flowMeta.createdAt || Date.now(),
          createdAtLabel: flowMeta.createdAtLabel || "",
          domTop: Math.round(rect.top + window.scrollY),
          domLeft: Math.round(rect.left + window.scrollX),
          thumbnail: cardThumb,
          isBoost,
          model: flowMeta.model || "",
          seed: flowMeta.seed || "",
          flowMetadata: flowMeta
        };
        clipsMap.set(cardUrl, meta);
        discoveredVideos.set(clipId, meta);
      }
    });

    // 3. Chercher les éléments d'export / boutons / liens /boost ou boutons d'action
    const candidateNodes = findAllDeep("a[href], button, [role='button'], [data-boost-url], [data-upscale-url], [data-download-url], [data-video-url]", document);
    candidateNodes.forEach((el) => {
      const candidateUrl = extractUrlFromElement(el);
      if (candidateUrl && !clipsMap.has(candidateUrl)) {
        const candContainer = findFlowCardContainer(el);
        const flowMeta = extractFlowNativeMetadata(null, candidateUrl, candContainer || el);
        const isBoost = Boolean(
          flowMeta.isBoost ||
          isBoostIndicator(candidateUrl) ||
          isBoostIndicator(el.innerText || el.getAttribute("aria-label") || "")
        );
        discoveryCounter += 1;
        const clipId = flowMeta.generationId ? `flow_gen_${flowMeta.generationId}` : ("flow_clip_link_" + Date.now() + "_" + discoveryCounter);
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { top: 0, left: 0 };
        let candThumb = "";
        try {
          const candImg = el.querySelector ? (el.querySelector("img") || el.parentElement?.querySelector("img")) : null;
          if (candImg && candImg.src) candThumb = toAbsoluteUrl(candImg.src);
        } catch (_) {}

        let candPrompt = flowMeta.promptText || (el.title || el.getAttribute("aria-label") || el.innerText || `Clip #${discoveryCounter}`).slice(0, 140).trim();
        candPrompt = cleanPromptText(candPrompt);
        if (isBoost && !candPrompt.includes("Boost") && !candPrompt.includes("⚡")) {
          candPrompt = `[Boost ⚡] ${candPrompt}`;
        }

        const meta = {
          id: clipId,
          generationId: flowMeta.generationId || "",
          videoUrl: candidateUrl,
          promptText: candPrompt,
          duration: flowMeta.duration || 5,
          resolution: flowMeta.resolution || (isBoost ? "1080p" : "720p"),
          width: flowMeta.width || (isBoost ? 1920 : 1280),
          height: flowMeta.height || (isBoost ? 1080 : 720),
          sceneNumber: flowMeta.sceneNumber ?? null,
          discoveredOrder: discoveryCounter,
          createdAt: flowMeta.createdAt || Date.now(),
          createdAtLabel: flowMeta.createdAtLabel || "",
          domTop: Math.round(rect.top + window.scrollY),
          domLeft: Math.round(rect.left + window.scrollX),
          thumbnail: candThumb,
          isBoost,
          model: flowMeta.model || "",
          seed: flowMeta.seed || "",
          flowMetadata: flowMeta
        };
        clipsMap.set(candidateUrl, meta);
        discoveredVideos.set(clipId, meta);
      }
    });

    // 4. Vérifier les ressources réseau chargées (performance timing) pour capturer les flux /boost récents
    try {
      const resources = performance.getEntriesByType("resource") || [];
      for (const res of resources) {
        const name = res.name || "";
        if (name && (name.includes("/boost") || (name.includes("storage.googleapis.com") && name.includes(".mp4"))) && !clipsMap.has(name)) {
          discoveryCounter += 1;
          const flowMeta = extractFlowNativeMetadata(null, name, null);
          const clipId = flowMeta.generationId ? `flow_gen_${flowMeta.generationId}` : ("flow_clip_res_" + Date.now() + "_" + discoveryCounter);
          const resTimingTs = Math.round((performance.timeOrigin || Date.now()) + (res.startTime || 0));
          const timingMeta = {
            id: clipId,
            generationId: flowMeta.generationId || "",
            videoUrl: name,
            promptText: flowMeta.promptText ? `[Boost ⚡] ${flowMeta.promptText}` : `[Boost ⚡] ${(currentLang === "fr" ? "Clip Flow #" : "Flow Clip #")}${discoveryCounter}`,
            duration: flowMeta.duration || 5,
            resolution: flowMeta.resolution || "1080p",
            width: flowMeta.width || 1920,
            height: flowMeta.height || 1080,
            sceneNumber: flowMeta.sceneNumber ?? null,
            discoveredOrder: discoveryCounter,
            createdAt: flowMeta.createdAt || resTimingTs || Date.now(),
            createdAtLabel: flowMeta.createdAtLabel || formatTimestampLabel(resTimingTs),
            domTop: 0,
            domLeft: 0,
            thumbnail: "",
            isBoost: true,
            model: flowMeta.model || "",
            seed: flowMeta.seed || "",
            flowMetadata: flowMeta
          };
          clipsMap.set(name, timingMeta);
          discoveredVideos.set(clipId, timingMeta);
        }
      }
    } catch (_) {}

    // 5. Intégrer les flux vidéo interceptés par le pont MAIN world (API Flow, IndexedDB & createObjectURL)
    for (const item of pageBridgeMetadataMap.values()) {
      if (item && item.videoUrl && !clipsMap.has(item.videoUrl)) {
        discoveryCounter += 1;
        const clipId = item.generationId ? `flow_gen_${item.generationId}` : ("flow_bridge_" + Date.now() + "_" + discoveryCounter);
        const meta = {
          id: clipId,
          generationId: item.generationId || "",
          videoUrl: item.videoUrl,
          promptText: item.promptText || `${(currentLang === "fr" ? "Clip Flow #" : "Flow Clip #")}${discoveryCounter}`,
          duration: item.duration || 5,
          resolution: item.resolution || (item.isBoost ? "1080p" : "720p"),
          width: item.width || (item.isBoost ? 1920 : 1280),
          height: item.height || (item.isBoost ? 1080 : 720),
          sceneNumber: item.sceneNumber ?? null,
          discoveredOrder: discoveryCounter,
          createdAt: item.createdAt || Date.now(),
          createdAtLabel: item.createdAtLabel || "",
          domTop: 0,
          domLeft: 0,
          thumbnail: item.thumbnail || "",
          isBoost: Boolean(item.isBoost),
          model: item.model || "",
          seed: item.seed || "",
          flowMetadata: item
        };
        clipsMap.set(item.videoUrl, meta);
        discoveredVideos.set(clipId, meta);
      }
    }

    // 6. Conserver l'historique de session de discoveredVideos (évite de perdre les clips déchargés du DOM par virtual scrolling)
    for (const [id, meta] of discoveredVideos.entries()) {
      if (meta && meta.videoUrl && !clipsMap.has(meta.videoUrl)) {
        clipsMap.set(meta.videoUrl, meta);
      }
    }

    const clips = Array.from(clipsMap.values());

    if (sortMode === "dom") {
      clips.sort((a, b) => (a.domTop - b.domTop) || (a.domLeft - b.domLeft));
    } else if (sortMode === "chronological") {
      clips.sort((a, b) => {
        const timeA = Number(a.createdAt) || 0;
        const timeB = Number(b.createdAt) || 0;
        if (timeA && timeB && Math.abs(timeA - timeB) > 500) {
          return timeA - timeB;
        }
        return a.discoveredOrder - b.discoveredOrder;
      });
    } else if (sortMode === "explicit_scene") {
      clips.sort((a, b) => {
        const sA = a.sceneNumber !== null && a.sceneNumber !== undefined ? a.sceneNumber : 9999;
        const sB = b.sceneNumber !== null && b.sceneNumber !== undefined ? b.sceneNumber : 9999;
        if (sA !== sB) return sA - sB;
        return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
      });
    } else if (sortMode === "reverse") {
      clips.sort((a, b) => (b.domTop - a.domTop) || (b.domLeft - a.domLeft));
    }

    return clips;
  }

  // Demande de scan profond au pont MAIN world (DOM principal + Shadow roots + IDB + Cache API)
  function requestBridgeFullScan(timeoutMs = 1500) {
    return new Promise((resolve) => {
      const requestId = "fvm_scan_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      let timer = null;

      const onMessage = (event) => {
        if (
          event.data &&
          event.data.source === "FLOW_PAGE_BRIDGE" &&
          event.data.type === "FVM_FULL_SCAN_RESPONSE" &&
          event.data.requestId === requestId
        ) {
          if (timer) clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          resolve(Array.isArray(event.data.items) ? event.data.items : []);
        }
      };

      timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve([]);
      }, timeoutMs);

      window.addEventListener("message", onMessage);
      try {
        window.postMessage({
          source: "FVM_CONTENT",
          type: "FVM_PERFORM_FULL_SCAN",
          requestId
        }, "*");
      } catch (_) {
        if (timer) clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve([]);
      }
    });
  }

  // Scan asynchrone complet combinant pont MAIN world et monde isolé
  async function scanAllVideosOnPageAsync(sortMode = "dom") {
    try {
      const bridgeItems = await requestBridgeFullScan(1500);
      if (Array.isArray(bridgeItems)) {
        for (const item of bridgeItems) {
          if (item) {
            if (item.videoUrl) pageBridgeMetadataMap.set(item.videoUrl, item);
            if (item.generationId) pageBridgeMetadataMap.set(item.generationId, item);
            if (item.promptText && item.promptText.length > 5) pageBridgeMetadataMap.set(item.promptText.slice(0, 60), item);
          }
        }
      }
    } catch (_) {}
    return scanAllVideosOnPage(sortMode);
  }

  // Demande de transfert binaire au pont MAIN world (contourne les restrictions d'origine blob: et CORS isolées)
  function requestVideoBytesFromBridge(videoUrl, timeoutMs = 8000, clipId = "", generationId = "") {
    return new Promise((resolve) => {
      const requestId = "fvm_req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      let timer = null;

      const onMessage = (event) => {
        if (
          event.data &&
          event.data.source === "FLOW_PAGE_BRIDGE" &&
          event.data.type === "FVM_VIDEO_DATA_RESPONSE" &&
          event.data.requestId === requestId
        ) {
          if (timer) clearTimeout(timer);
          window.removeEventListener("message", onMessage);
          if (event.data.ok && event.data.buffer) {
            resolve({ buffer: event.data.buffer, mimeType: event.data.mimeType || "video/mp4" });
          } else {
            resolve(null);
          }
        }
      };

      timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve(null);
      }, timeoutMs);

      window.addEventListener("message", onMessage);
      try {
        window.postMessage({
          source: "FVM_CONTENT",
          type: "FVM_REQUEST_VIDEO_DATA",
          requestId,
          videoUrl,
          clipId,
          generationId
        }, "*");
      } catch (_) {
        if (timer) clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve(null);
      }
    });
  }

  // Hooks globaux disponibles pour exécution multi-frame et tests
  window.__flowVideoMergerScanAsync = (sortMode = "dom") => scanAllVideosOnPageAsync(sortMode);
  window.__flowVideoMergerScan = (sortMode = "dom") => scanAllVideosOnPage(sortMode);
  window.__flowVideoMergerExtractMetadata = extractFlowNativeMetadata;
  window.__flowVideoMergerFindContainer = findFlowCardContainer;

  // ============================================================================
  // PROTOCOLE DE TÉLÉCHARGEMENT PAR BLOCS SÉQUENTIELS (ANTI-CORS & ANTI-IPC 32Mo)
  // ============================================================================
  async function handleStartChunkedDownload(videoUrl, clipId = "", generationId = "") {
    if (!videoUrl) throw new Error(currentLang === "fr" ? "URL vidéo invalide." : "Invalid video URL.");

    let bytes = null;
    let mimeType = "video/mp4";

    // 1. Tenter d'abord la récupération par le pont MAIN world
    // (Résout les blob: créés dans la page et les sessions Flow /asb/ avec credentials natifs)
    try {
      const bridgeData = await requestVideoBytesFromBridge(videoUrl, 8000, clipId, generationId);
      if (bridgeData && bridgeData.buffer && bridgeData.buffer.byteLength > 0) {
        bytes = new Uint8Array(bridgeData.buffer);
        if (bridgeData.mimeType) mimeType = bridgeData.mimeType;
      }
    } catch (bridgeErr) {
      console.warn("Main world bridge video request fallback notice:", bridgeErr);
    }

    // 2. Si le pont n'a pas pu fournir les données, tenter fetch direct dans le content script
    if (!bytes || bytes.length === 0) {
      let response;
      if (videoUrl.startsWith("blob:")) {
        try {
          response = await fetch(videoUrl);
        } catch (_) {}
      } else {
        try {
          response = await fetch(videoUrl, { credentials: "include" });
        } catch (_) {
          try {
            response = await fetch(videoUrl);
          } catch (_) {}
        }
      }

      if (response && response.ok) {
        const blob = await response.blob();
        mimeType = blob.type || mimeType;
        const arrayBuffer = await blob.arrayBuffer();
        bytes = new Uint8Array(arrayBuffer);
      }
    }

    // 3. Fallback Service Worker arrière-plan (anti-CORS & règles DNR host_permissions)
    if (!bytes || bytes.length === 0) {
      try {
        const bgRes = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: "START_BG_CHUNKED_DOWNLOAD", videoUrl }, (res) => {
            if (chrome.runtime.lastError || !res || !res.ok) resolve(null);
            else resolve(res);
          });
        });
        if (bgRes && bgRes.downloadId) {
          const chunkBuffers = [];
          for (let c = 0; c < bgRes.totalChunks; c++) {
            const chunkRes = await new Promise((resolve) => {
              chrome.runtime.sendMessage({ type: "GET_BG_CHUNK", downloadId: bgRes.downloadId, chunkIndex: c }, (r) => {
                if (chrome.runtime.lastError || !r || !r.data) resolve(null);
                else resolve(r);
              });
            });
            if (chunkRes && chunkRes.data) {
              const bin = atob(chunkRes.data);
              const u8 = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
              chunkBuffers.push(u8);
            }
          }
          chrome.runtime.sendMessage({ type: "FINISH_BG_CHUNKED_DOWNLOAD", downloadId: bgRes.downloadId }, () => {});
          if (chunkBuffers.length > 0) {
            const totalLen = chunkBuffers.reduce((sum, b) => sum + b.length, 0);
            bytes = new Uint8Array(totalLen);
            let off = 0;
            for (const b of chunkBuffers) {
              bytes.set(b, off);
              off += b.length;
            }
            if (bgRes.mimeType) mimeType = bgRes.mimeType;
          }
        }
      } catch (_) {}
    }

    if (!bytes || bytes.length === 0) {
      throw new Error(currentLang === "fr"
        ? `Échec de récupération du flux vidéo (${videoUrl.slice(0, 80)}...). Vérifiez que Google Flow est ouvert et que la vidéo est chargée.`
        : `Failed to retrieve video stream (${videoUrl.slice(0, 80)}...). Verify that Google Flow is open and the video is loaded.`);
    }

    const downloadId = "dl_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2 Mo par bloc (base64 ~ 2.6 Mo, sous la limite IPC 32 Mo)
    const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);

    pendingDownloads.set(downloadId, {
      bytes,
      mimeType,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      createdAt: Date.now()
    });

    return {
      downloadId,
      totalBytes: bytes.length,
      totalChunks,
      chunkSize: CHUNK_SIZE,
      mimeType
    };
  }

  function handleGetVideoChunk(downloadId, chunkIndex) {
    const item = pendingDownloads.get(downloadId);
    if (!item) throw new Error(currentLang === "fr" ? "Téléchargement introuvable ou expiré." : "Download not found or expired.");

    const offset = chunkIndex * item.chunkSize;
    if (offset >= item.bytes.length) {
      throw new Error(currentLang === "fr" ? "Index de bloc hors limites." : "Chunk index out of bounds.");
    }

    const slice = item.bytes.subarray(offset, Math.min(item.bytes.length, offset + item.chunkSize));

    // Conversion optimisée par blocs de 32 Ko pour éviter tout freeze CPU
    const BLOCK = 0x8000;
    let binary = "";
    for (let i = 0; i < slice.length; i += BLOCK) {
      binary += String.fromCharCode.apply(null, slice.subarray(i, Math.min(slice.length, i + BLOCK)));
    }
    const data = btoa(binary);

    return { data };
  }

  // Observer automatique avec support Shadow DOM pour numéroter les vidéos dès leur apparition
  let scanDebounceTimer = null;
  const observer = new MutationObserver(() => {
    if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(() => {
      const videoElements = findAllDeep("video", document);
      videoElements.forEach((videoEl) => {
        if (getVideoSourceUrl(videoEl)) {
          ensureClipRegistered(videoEl);
        }
      });
    }, 400);
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "data-src", "data-video-url", "data-boost-url", "href", "class"]
  });

  // Scan initial
  setTimeout(() => scanAllVideosOnPage("dom"), 600);

  // Écoute des commandes du Side Panel / Background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_FLOW_VIDEOS") {
      scanAllVideosOnPageAsync(message.sortMode || "dom")
        .then((clips) => sendResponse({ ok: true, clips }))
        .catch((err) => sendResponse({ ok: false, error: err.message, clips: [] }));
      return true; // Async
    }

    if (message.type === "SYNC_BADGE_NUMBERS") {
      sequenceOrderIds = Array.isArray(message.orderedIds) ? message.orderedIds : [];
      updateAllBadges();
      sendResponse({ ok: true });
      return false;
    }

    // Nouveau protocole sécurisé par blocs (anti-dépassement IPC 32 Mo)
    if (message.type === "START_CHUNKED_DOWNLOAD") {
      handleStartChunkedDownload(message.videoUrl, message.clipId, message.generationId)
        .then((res) => sendResponse({ ok: true, ...res }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true; // Async
    }

    if (message.type === "GET_VIDEO_CHUNK") {
      try {
        const res = handleGetVideoChunk(message.downloadId, message.chunkIndex);
        sendResponse({ ok: true, ...res });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return false;
    }

    if (message.type === "FINISH_CHUNKED_DOWNLOAD") {
      if (message.downloadId) pendingDownloads.delete(message.downloadId);
      sendResponse({ ok: true });
      return false;
    }

    // Compatibilité descendante
    if (message.type === "FETCH_CLIP_DATA_URL") {
      handleStartChunkedDownload(message.videoUrl, message.clipId, message.generationId)
        .then((initRes) => {
          if (initRes.totalBytes <= 12 * 1024 * 1024) {
            const chunk = handleGetVideoChunk(initRes.downloadId, 0);
            pendingDownloads.delete(initRes.downloadId);
            sendResponse({
              ok: true,
              isChunked: false,
              dataUrl: `data:${initRes.mimeType};base64,${chunk.data}`,
              mimeType: initRes.mimeType,
              size: initRes.totalBytes
            });
          } else {
            // Signal pour basculer sur le mode séquentiel
            sendResponse({
              ok: true,
              requiresSequentialChunks: true,
              downloadId: initRes.downloadId,
              totalChunks: initRes.totalChunks,
              mimeType: initRes.mimeType,
              size: initRes.totalBytes
            });
          }
        })
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true; // Async
    }
  });
})();
