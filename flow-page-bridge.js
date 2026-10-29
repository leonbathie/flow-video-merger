// Flow Page Bridge — Interception & Extraction des Métadonnées & Flux Vidéo Google Flow (Main World)
// Exécuté directement dans le contexte d'exécution de la page (MAIN world)
// Intercepte :
// 1. Element.prototype.attachShadow (force mode "open" pour que tous les Shadow DOMs soient traversables par content script + registry)
// 2. URL.createObjectURL & URL.revokeObjectURL (maintient les Blobs en mémoire vive & bouclier anti-révocation prématurée)
// 3. HTMLMediaElement.prototype.src, srcObject, play, load (capture instantanée des affectations et instances de lecteurs vidéo)
// 4. SourceBuffer.prototype.appendBuffer (capture des segments fragmentés de streaming MSE)
// 5. window.fetch & XMLHttpRequest (capture des réponses vidéo y compris octet-stream & JSON avec nettoyage des préfixes XSSI )]}' )
// 6. Base64 video decoding (reconstruction automatique de blobs à partir des champs base64 API)
// 7. IndexedDB scan (découverte proactive des Blobs, ArrayBuffers et Uint8Arrays mis en cache)
// 8. CacheStorage scan (découverte proactive des flux vidéo mis en cache via l'API caches)
// 9. Service de transfert binaire pour content.js (envoi direct sans copie via transfer list postMessage)

(() => {
  if (window.__flowPageBridgeInjected) return;
  window.__flowPageBridgeInjected = true;

  const metadataRegistry = new Map(); // key (url, id, or prompt) -> metadata object
  const blobRegistry = new Map();     // videoUrl -> { blob, mimeType, size, createdAt, source, revokedAt }
  const mseRegistry = new Map();      // mediaSourceUrl -> chunks[]
  const allMediaElements = new Set(); // tous les éléments HTMLMediaElement actifs

  // Normalisation d'URL relative en URL absolue
  function toAbs(raw) {
    if (!raw || typeof raw !== "string") return "";
    const clean = raw.trim();
    if (!clean || clean.startsWith("blob:") || clean.startsWith("data:")) return clean;
    try {
      const base = (typeof window !== "undefined" && window.location && window.location.href) ? window.location.href : "https://flow.google.com/";
      return new URL(clean, base).href;
    } catch (_) {}
    if (clean.startsWith("/")) {
      const base = (typeof window !== "undefined" && window.location && window.location.origin)
        ? window.location.origin
        : ((typeof window !== "undefined" && window.location && window.location.href)
            ? window.location.href.split("/").slice(0, 3).join("/")
            : "https://flow.google.com");
      return base + clean;
    }
    return clean;
  }

  // ============================================================================
  // 1. INTERCEPTION DE ATTACHSHADOW (POUR TRAVERSER TOUS LES SHADOW DOMS)
  // ============================================================================
  const origAttachShadow = typeof Element !== "undefined" && Element.prototype ? Element.prototype.attachShadow : null;
  if (typeof origAttachShadow === "function") {
    Element.prototype.attachShadow = function (init) {
      // Forcer le mode "open" garantit que le moteur DOM natif de Chrome expose node.shadowRoot
      // à TOUS les contextes d'exécution (y compris le content script en monde ISOLÉ)
      const forcedInit = Object.assign({}, init, { mode: "open" });
      const root = origAttachShadow.call(this, forcedInit);
      try {
        this.__fvmShadowRoot = root;
        if (!window.__fvmAllShadowRoots) window.__fvmAllShadowRoots = new Set();
        window.__fvmAllShadowRoots.add(root);
      } catch (_) {}
      return root;
    };
  }

  // ============================================================================
  // 2. INTERCEPTION DE URL.createObjectURL & URL.revokeObjectURL
  // ============================================================================
  const origCreateObjectURL = typeof URL !== "undefined" ? URL.createObjectURL : null;
  if (typeof origCreateObjectURL === "function") {
    URL.createObjectURL = function (obj) {
      const url = origCreateObjectURL.apply(this, arguments);
      try {
        if (typeof Blob !== "undefined" && obj instanceof Blob) {
          const isVideo = (obj.type && obj.type.toLowerCase().includes("video")) || obj.size > 20000;
          if (isVideo) {
            const item = {
              blob: obj,
              mimeType: obj.type || "video/mp4",
              size: obj.size,
              createdAt: Date.now(),
              source: "createObjectURL"
            };
            blobRegistry.set(url, item);
            const cleanUrl = url.split("?")[0];
            if (cleanUrl !== url) blobRegistry.set(cleanUrl, item);

            registerFlowMetadataItem({
              videoUrl: url,
              duration: null,
              isBoost: (url && url.includes("boost")) || obj.size > 8 * 1024 * 1024,
              source: "createObjectURL_interceptor"
            });
          }
        } else if (typeof MediaSource !== "undefined" && obj instanceof MediaSource) {
          mseRegistry.set(url, obj);
          registerFlowMetadataItem({
            videoUrl: url,
            duration: null,
            isBoost: false,
            source: "createObjectURL_mediasource"
          });
        }
      } catch (_) {}
      return url;
    };
  }

  const origRevokeObjectURL = typeof URL !== "undefined" ? URL.revokeObjectURL : null;
  if (typeof origRevokeObjectURL === "function") {
    URL.revokeObjectURL = function (url) {
      // Bouclier anti-révocation prématurée : Conserver le Blob et l'URL valides
      // afin qu'une révocation hâtive par Google Flow ne détruise pas la capacité
      // de notre extension à récupérer le fichier
      try {
        if (typeof url === "string" && (blobRegistry.has(url) || url.startsWith("blob:"))) {
          const item = blobRegistry.get(url);
          if (item) {
            item.revokedAt = Date.now();
          }
          return; // Ne pas révoquer immédiatement dans le navigateur
        }
      } catch (_) {}
      return origRevokeObjectURL.apply(this, arguments);
    };
  }

  // ============================================================================
  // 3. INTERCEPTION DE HTMLMediaElement (src, srcObject, play, load)
  // ============================================================================
  try {
    if (typeof HTMLMediaElement !== "undefined" && HTMLMediaElement.prototype) {
      // Suivi de play
      const origPlay = HTMLMediaElement.prototype.play;
      if (typeof origPlay === "function") {
        HTMLMediaElement.prototype.play = function () {
          try {
            allMediaElements.add(this);
            const s = this.currentSrc || this.src;
            if (s) {
              const abs = toAbs(s);
              registerFlowMetadataItem({ videoUrl: abs, source: "media_play" });
            }
          } catch (_) {}
          return origPlay.apply(this, arguments);
        };
      }

      // Suivi de load
      const origLoad = HTMLMediaElement.prototype.load;
      if (typeof origLoad === "function") {
        HTMLMediaElement.prototype.load = function () {
          try {
            allMediaElements.add(this);
          } catch (_) {}
          return origLoad.apply(this, arguments);
        };
      }

      // Suivi du setter src
      const mediaSrcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
      if (mediaSrcDesc && mediaSrcDesc.set) {
        const origSrcSet = mediaSrcDesc.set;
        Object.defineProperty(HTMLMediaElement.prototype, "src", {
          set: function (val) {
            try {
              allMediaElements.add(this);
              if (val && typeof val === "string") {
                const clean = val.trim();
                if (clean.startsWith("blob:") || clean.startsWith("http")) {
                  const abs = toAbs(clean);
                  registerFlowMetadataItem({
                    videoUrl: abs,
                    source: "media_src_setter"
                  });
                }
              }
            } catch (_) {}
            return origSrcSet.apply(this, arguments);
          },
          get: mediaSrcDesc.get,
          configurable: true,
          enumerable: true
        });
      }

      // Suivi du setter srcObject
      const mediaSrcObjDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "srcObject");
      if (mediaSrcObjDesc && mediaSrcObjDesc.set) {
        const origSrcObjSet = mediaSrcObjDesc.set;
        Object.defineProperty(HTMLMediaElement.prototype, "srcObject", {
          set: function (val) {
            try {
              allMediaElements.add(this);
              if (val) {
                registerFlowMetadataItem({ source: "media_srcObject_setter" });
              }
            } catch (_) {}
            return origSrcObjSet.apply(this, arguments);
          },
          get: mediaSrcObjDesc.get,
          configurable: true,
          enumerable: true
        });
      }
    }
  } catch (_) {}

  // ============================================================================
  // 4. INTERCEPTION DE SourceBuffer.prototype.appendBuffer (STREAMING MSE)
  // ============================================================================
  if (typeof SourceBuffer !== "undefined" && SourceBuffer.prototype.appendBuffer) {
    const origAppendBuffer = SourceBuffer.prototype.appendBuffer;
    SourceBuffer.prototype.appendBuffer = function (data) {
      try {
        if (!this.__fvmChunks) {
          this.__fvmChunks = [];
        }
        if (data) {
          let copy;
          if (data instanceof ArrayBuffer) {
            copy = data.slice(0);
          } else if (ArrayBuffer.isView(data)) {
            copy = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          }
          if (copy && copy.byteLength > 0) {
            this.__fvmChunks.push(copy);
          }
        }
      } catch (_) {}
      return origAppendBuffer.apply(this, arguments);
    };
  }

  // ============================================================================
  // 5. FONCTIONS UTILITAIRES DE PARSING DES MÉTADONNÉES
  // ============================================================================
  function formatTime(ts) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    } catch (_) {
      return "";
    }
  }

  function parseTimestamp(val) {
    if (!val) return null;
    if (typeof val === "number" && !isNaN(val)) {
      if (val > 1000000000000) return { timestamp: val, label: formatTime(val) };
      if (val > 1000000000) return { timestamp: val * 1000, label: formatTime(val * 1000) };
    }
    const s = String(val).trim();
    if (!s) return null;
    if (/^\d{13}$/.test(s)) {
      const ts = parseInt(s, 10);
      return { timestamp: ts, label: formatTime(ts) };
    }
    if (/^\d{10}$/.test(s)) {
      const ts = parseInt(s, 10) * 1000;
      return { timestamp: ts, label: formatTime(ts) };
    }
    const parsed = Date.parse(s);
    if (!isNaN(parsed) && parsed > 1577836800000) {
      return { timestamp: parsed, label: formatTime(parsed) };
    }
    return null;
  }

  function parseScene(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === "number" && !isNaN(val)) return val;
    const s = String(val).trim();
    const m = s.match(/(?:scene|scène|shot|plan|gen|génération|part|step|#)\s*0*(\d+(?:\.\d+)?)/i);
    if (m) {
      const n = parseFloat(m[1]);
      if (!isNaN(n)) return n;
    }
    const pure = parseFloat(s);
    if (!isNaN(pure) && pure >= 0 && pure <= 500) return pure;
    return null;
  }

  function cleanPrompt(p) {
    if (!p || typeof p !== "string") return "";
    return p.replace(/^\[Boost ⚡\]\s*/i, "").trim().slice(0, 300);
  }

  function extractVideoUrlFromObject(obj) {
    if (!obj || typeof obj !== "object") return "";
    const directKeys = [
      "videoUrl", "video_url", "src", "videoSrc", "downloadUrl", "download_url",
      "playbackUrl", "playback_url", "assetUrl", "asset_url", "mediaUrl", "media_url",
      "videoUri", "video_uri", "downloadUri", "download_uri", "contentUri", "content_uri",
      "streamingUri", "streaming_uri", "servingUrl", "serving_url", "signedUrl", "signed_url",
      "fifeUrl", "fife_url", "mp4Url", "mp4_url", "streamUrl", "stream_url", "fileUrl", "file_url"
    ];
    for (const k of directKeys) {
      if (typeof obj[k] === "string" && obj[k].trim()) return toAbs(obj[k].trim());
    }
    if (typeof obj.url === "string" && obj.url.trim()) {
      const u = obj.url.trim();
      if (
        u.includes(".mp4") || u.includes(".webm") || u.includes("/asb/") ||
        u.includes("storage.googleapis.com") || u.includes("googlevideo.com") ||
        u.includes("googleusercontent.com") || (obj.mimeType && obj.mimeType.includes("video"))
      ) {
        return toAbs(u);
      }
    }
    if (typeof obj.video === "string" && obj.video.trim()) {
      return toAbs(obj.video.trim());
    }
    if (obj.video && typeof obj.video === "object") {
      const nested = extractVideoUrlFromObject(obj.video);
      if (nested) return toAbs(nested);
    }
    return "";
  }

  function registerFlowMetadataItem(raw) {
    if (!raw || typeof raw !== "object") return;

    const rawUrl = extractVideoUrlFromObject(raw) || raw.videoUrl || raw.src || "";
    const videoUrl = toAbs(rawUrl);
    const generationId = String(raw.generationId || raw.id || raw.assetId || raw.mediaId || raw.taskId || raw.nodeId || "");
    const promptText = cleanPrompt(raw.prompt || raw.promptText || raw.userPrompt || raw.rawPrompt || raw.inputPrompt || raw.textPrompt || raw.description || "");

    if (!videoUrl && !generationId && !promptText) return;

    const tsObj = parseTimestamp(raw.createdAt || raw.createTime || raw.creationTime || raw.createTimestamp || raw.timestamp || raw.generationTime || raw.timeCreated || raw.publishTime);
    const sceneNum = parseScene(raw.sceneNumber ?? raw.scene ?? raw.sceneId ?? raw.shotNumber ?? raw.shot ?? raw.order ?? raw.index ?? raw.sequenceNumber);

    const isBoost = Boolean(
      raw.isBoost || raw.boosted || raw.upscaled || raw.highRes || raw.isUpscaled || raw.boost ||
      (videoUrl && (videoUrl.includes("/boost") || videoUrl.includes("boost") || videoUrl.includes("upscale")))
    );

    let resolution = raw.resolution || (raw.width && raw.height ? `${raw.width}x${raw.height}` : "");
    if (!resolution && isBoost) resolution = "1080p";

    const normalized = {
      generationId,
      videoUrl,
      promptText,
      createdAt: tsObj ? tsObj.timestamp : null,
      createdAtLabel: tsObj ? tsObj.label : "",
      sceneNumber: sceneNum,
      duration: raw.duration ? parseFloat(raw.duration) : null,
      resolution,
      width: raw.width ? parseInt(raw.width, 10) : (isBoost ? 1920 : null),
      height: raw.height ? parseInt(raw.height, 10) : (isBoost ? 1080 : null),
      isBoost,
      model: raw.model || raw.modelName || raw.modelVersion || "",
      seed: String(raw.seed || raw.randomSeed || ""),
      source: raw.source || "flow_api_interceptor"
    };

    if (videoUrl) {
      metadataRegistry.set(videoUrl, normalized);
      const clean = videoUrl.split("?")[0];
      if (clean !== videoUrl) metadataRegistry.set(clean, normalized);
    }
    if (rawUrl && rawUrl !== videoUrl) {
      metadataRegistry.set(rawUrl, normalized);
    }
    if (generationId) metadataRegistry.set(generationId, normalized);
    if (promptText && promptText.length > 5) metadataRegistry.set(promptText.slice(0, 60), normalized);

    // Relayer vers le Content Script via postMessage
    try {
      window.postMessage({
        source: "FLOW_PAGE_BRIDGE",
        type: "FLOW_METADATA_ITEM",
        metadata: normalized
      }, "*");
    } catch (_) {}

    // Attacher l'attribut DOM directement si un élément correspondant existe déjà dans le DOM
    try {
      if (videoUrl) {
        const videos = document.querySelectorAll(`video[src*="${videoUrl}"], source[src*="${videoUrl}"]`);
        videos.forEach((el) => {
          const target = el.tagName === "SOURCE" ? el.parentElement : el;
          if (target && target.setAttribute) {
            target.setAttribute("data-flow-metadata", JSON.stringify(normalized));
            if (generationId) target.setAttribute("data-generation-id", generationId);
            if (promptText) target.setAttribute("data-prompt", promptText);
            if (sceneNum !== null) target.setAttribute("data-scene", String(sceneNum));
          }
        });
      }
      if (generationId) {
        const cards = document.querySelectorAll(`[data-generation-id="${generationId}"], [data-card-id="${generationId}"]`);
        cards.forEach((c) => {
          if (c && c.setAttribute) {
            c.setAttribute("data-flow-metadata", JSON.stringify(normalized));
          }
        });
      }
    } catch (_) {}
  }

  function walkObject(obj, depth = 0) {
    if (!obj || depth > 9 || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) walkObject(item, depth + 1);
      return;
    }

    const videoUrl = extractVideoUrlFromObject(obj);
    const hasId = obj.id || obj.generationId || obj.assetId || obj.mediaId || obj.taskId;
    const hasPrompt = obj.prompt || obj.promptText || obj.userPrompt || obj.rawPrompt;

    if (videoUrl || (hasId && hasPrompt)) {
      registerFlowMetadataItem(obj);
    }

    // Décodage des vidéos base64 éventuellement embarquées dans le JSON (API Veo / VideoFX)
    const b64Field = obj.videoBytes || obj.bytesBase64Encoded || obj.encodedVideo || obj.rawBytes;
    if (typeof b64Field === "string" && b64Field.length > 5000) {
      try {
        const bin = atob(b64Field.replace(/\s+/g, ""));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const b = new Blob([bytes], { type: "video/mp4" });
        const bUrl = origCreateObjectURL ? origCreateObjectURL.call(URL, b) : URL.createObjectURL(b);
        blobRegistry.set(bUrl, {
          blob: b,
          mimeType: "video/mp4",
          size: b.size,
          createdAt: Date.now()
        });
        registerFlowMetadataItem({
          videoUrl: bUrl,
          generationId: obj.generationId || obj.id || "",
          promptText: obj.prompt || obj.promptText || "",
          isBoost: Boolean(obj.isBoost || obj.boosted),
          source: "base64_json_decoder"
        });
      } catch (_) {}
    }

    for (const k of Object.keys(obj)) {
      walkObject(obj[k], depth + 1);
    }
  }

  // Nettoyeur universel de préfixes de sécurité Google XSSI (ex: )]}' \n ou for(;;);)
  function cleanGoogleXSSIPrefix(text) {
    if (!text || typeof text !== "string") return "";
    let s = text.trim();
    if (s.startsWith(")]}'")) {
      s = s.slice(4).trim();
    } else if (s.startsWith("for(;;);")) {
      s = s.slice(8).trim();
    }
    return s;
  }

  // ============================================================================
  // 6. INTERCEPTION DE FETCH & XHR
  // ============================================================================
  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const reqArg = args[0];
        const rawUrl = (typeof reqArg === "string" ? reqArg : (reqArg?.url || "")) || "";
        const absUrl = toAbs(rawUrl);
        const contentType = (response.headers && typeof response.headers.get === "function" && response.headers.get("content-type")) || "";

        // Détection de flux binaire vidéo (y compris octet-stream ou endpoints /asb/ ou googleapis)
        const isVideoMime = contentType.includes("video") || contentType.includes("octet-stream") || contentType.includes("media");
        const hasVideoExt = absUrl.includes(".mp4") || absUrl.includes(".webm") || absUrl.includes("/asb/") ||
          absUrl.includes("storage.googleapis.com") || absUrl.includes("googlevideo.com");
        const isNotScript = !absUrl.includes(".js") && !absUrl.includes(".css") && !absUrl.includes(".svg");
        const isLikelyVideo = (isVideoMime || hasVideoExt) && isNotScript;

        if (isLikelyVideo && response.ok !== false && typeof response.clone === "function") {
          try {
            const clone = response.clone();
            if (typeof clone.blob === "function") {
              clone.blob().then((blob) => {
                if (blob && blob.size > 20000) {
                  const item = {
                    blob,
                    mimeType: blob.type || "video/mp4",
                    size: blob.size,
                    createdAt: Date.now()
                  };
                  blobRegistry.set(absUrl, item);
                  if (rawUrl && rawUrl !== absUrl) blobRegistry.set(rawUrl, item);
                  const clean = absUrl.split("?")[0];
                  if (clean !== absUrl) blobRegistry.set(clean, item);

                  registerFlowMetadataItem({
                    videoUrl: absUrl,
                    duration: null,
                    isBoost: (absUrl && absUrl.includes("boost")) || blob.size > 8 * 1024 * 1024,
                    source: "fetch_video_interceptor"
                  });
                }
              }).catch(() => {});
            }
          } catch (_) {}
        }

        const isFlowApi = absUrl.includes("/asb/") || absUrl.includes("flow.google") ||
          absUrl.includes("aisandbox-pa.googleapis.com") || absUrl.includes("labs.google") ||
          absUrl.includes("aitestkitchen") || absUrl.includes("deepmind.google") ||
          absUrl.includes("/api/") || absUrl.includes("generate") ||
          absUrl.includes("media") || absUrl.includes("project") || absUrl.includes("veo") ||
          absUrl.includes("storage.googleapis.com");

        if (isFlowApi && response.ok !== false && typeof response.clone === "function") {
          try {
            const clone = response.clone();
            if (typeof clone.text === "function") {
              clone.text().then((rawText) => {
                if (rawText && rawText.length > 10) {
                  const cleaned = cleanGoogleXSSIPrefix(rawText);
                  try {
                    const data = JSON.parse(cleaned);
                    walkObject(data);
                  } catch (_) {}
                }
              }).catch(() => {});
            } else if (typeof clone.json === "function") {
              clone.json().then((data) => {
                walkObject(data);
              }).catch(() => {});
            }
          } catch (_) {}
        }
      } catch (_) {}
      return response;
    };
  }

  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._fvmUrl = toAbs(url);
    this._fvmRawUrl = url;
    return originalXhrOpen.apply(this, [method, url, ...rest]);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", () => {
      try {
        const url = this._fvmUrl || "";
        const rawUrl = this._fvmRawUrl || "";
        const isFlowUrl = url.includes("/asb/") || url.includes("flow.google") ||
          url.includes("aisandbox-pa.googleapis.com") || url.includes("labs.google") ||
          url.includes("aitestkitchen") || url.includes("deepmind.google") ||
          url.includes("/api/") || url.includes("generate") ||
          url.includes("media") || url.includes("project") || url.includes(".mp4");

        if (isFlowUrl) {
          if (this.responseType === "blob" && this.response instanceof Blob) {
            if (this.response.size > 20000) {
              const item = {
                blob: this.response,
                mimeType: this.response.type || "video/mp4",
                size: this.response.size,
                createdAt: Date.now()
              };
              blobRegistry.set(url, item);
              if (rawUrl && rawUrl !== url) blobRegistry.set(rawUrl, item);
              registerFlowMetadataItem({
                videoUrl: url,
                source: "xhr_blob_interceptor"
              });
            }
          } else if (this.responseType === "arraybuffer" && this.response instanceof ArrayBuffer) {
            if (this.response.byteLength > 20000) {
              const b = new Blob([this.response], { type: "video/mp4" });
              const item = {
                blob: b,
                mimeType: "video/mp4",
                size: b.size,
                createdAt: Date.now()
              };
              blobRegistry.set(url, item);
              if (rawUrl && rawUrl !== url) blobRegistry.set(rawUrl, item);
              registerFlowMetadataItem({
                videoUrl: url,
                source: "xhr_arraybuffer_interceptor"
              });
            }
          } else if (!this.responseType || this.responseType === "text") {
            if (this.responseText && this.responseText.length > 20) {
              try {
                const cleaned = cleanGoogleXSSIPrefix(this.responseText);
                const parsed = JSON.parse(cleaned);
                walkObject(parsed);
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    });
    return originalXhrSend.apply(this, args);
  };

  // ============================================================================
  // 7. SCAN PROACTIF D'INDEXEDDB POUR DÉCOUVRIR LES VIDÉOS DU PROJET (BLOBS & BUFFERS)
  // ============================================================================
  async function scanIndexedDBForVideos() {
    if (typeof indexedDB === "undefined" || !indexedDB.databases) return;
    try {
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        if (!dbInfo || !dbInfo.name) continue;
        const dbName = dbInfo.name;
        try {
          const req = indexedDB.open(dbName);
          req.onsuccess = (e) => {
            const db = e.target.result;
            const storeNames = Array.from(db.objectStoreNames || []);
            for (const storeName of storeNames) {
              try {
                const tx = db.transaction(storeName, "readonly");
                const store = tx.objectStore(storeName);
                const getAllReq = store.getAll();
                getAllReq.onsuccess = () => {
                  const records = getAllReq.result || [];
                  for (const rec of records) {
                    if (!rec) continue;
                    // Format 1: Blob direct
                    if (rec instanceof Blob) {
                      if (rec.size > 20000) {
                        const url = origCreateObjectURL ? origCreateObjectURL.call(URL, rec) : URL.createObjectURL(rec);
                        blobRegistry.set(url, { blob: rec, mimeType: rec.type || "video/mp4", size: rec.size, createdAt: Date.now() });
                        registerFlowMetadataItem({ videoUrl: url, source: `idb_${dbName}` });
                      }
                    }
                    // Format 2: ArrayBuffer direct
                    else if (rec instanceof ArrayBuffer && rec.byteLength > 20000) {
                      const b = new Blob([rec], { type: "video/mp4" });
                      const url = origCreateObjectURL ? origCreateObjectURL.call(URL, b) : URL.createObjectURL(b);
                      blobRegistry.set(url, { blob: b, mimeType: "video/mp4", size: b.size, createdAt: Date.now() });
                      registerFlowMetadataItem({ videoUrl: url, source: `idb_${dbName}` });
                    }
                    // Format 3: Objet structuré
                    else if (typeof rec === "object") {
                      walkObject(rec);
                      for (const k of Object.keys(rec)) {
                        const val = rec[k];
                        if (val instanceof Blob && val.size > 20000) {
                          const url = origCreateObjectURL ? origCreateObjectURL.call(URL, val) : URL.createObjectURL(val);
                          blobRegistry.set(url, { blob: val, mimeType: val.type || "video/mp4", size: val.size, createdAt: Date.now() });
                          registerFlowMetadataItem({
                            videoUrl: url,
                            generationId: rec.generationId || rec.id || "",
                            promptText: rec.prompt || rec.promptText || "",
                            source: `idb_${dbName}_${storeName}`
                          });
                        } else if (val instanceof ArrayBuffer && val.byteLength > 20000) {
                          const b = new Blob([val], { type: "video/mp4" });
                          const url = origCreateObjectURL ? origCreateObjectURL.call(URL, b) : URL.createObjectURL(b);
                          blobRegistry.set(url, { blob: b, mimeType: "video/mp4", size: b.size, createdAt: Date.now() });
                          registerFlowMetadataItem({
                            videoUrl: url,
                            generationId: rec.generationId || rec.id || "",
                            promptText: rec.prompt || rec.promptText || "",
                            source: `idb_${dbName}_${storeName}`
                          });
                        } else if (ArrayBuffer.isView(val) && val.byteLength > 20000) {
                          const b = new Blob([val.buffer], { type: "video/mp4" });
                          const url = origCreateObjectURL ? origCreateObjectURL.call(URL, b) : URL.createObjectURL(b);
                          blobRegistry.set(url, { blob: b, mimeType: "video/mp4", size: b.size, createdAt: Date.now() });
                          registerFlowMetadataItem({
                            videoUrl: url,
                            generationId: rec.generationId || rec.id || "",
                            promptText: rec.prompt || rec.promptText || "",
                            source: `idb_${dbName}_${storeName}`
                          });
                        }
                      }
                    }
                  }
                };
              } catch (_) {}
            }
          };
        } catch (_) {}
      }
    } catch (_) {}
  }

  // ============================================================================
  // 8. SCAN DU CACHESTORAGE (API CACHES) POUR LES FICHIERS VIDÉO MIS EN CACHE
  // ============================================================================
  async function scanCacheStorageForVideos() {
    if (typeof caches === "undefined" || !caches.keys) return;
    try {
      const cacheNames = await caches.keys();
      for (const cName of cacheNames) {
        try {
          const cache = await caches.open(cName);
          const requests = await cache.keys();
          for (const req of requests) {
            const reqUrl = req.url || "";
            const isLikely = reqUrl.includes(".mp4") || reqUrl.includes(".webm") ||
              reqUrl.includes("/asb/") || reqUrl.includes("storage.googleapis.com") ||
              reqUrl.includes("googlevideo") || reqUrl.includes("video");
            if (isLikely) {
              try {
                const res = await cache.match(req);
                if (res) {
                  const b = await res.blob();
                  if (b && b.size > 20000) {
                    const abs = toAbs(reqUrl);
                    blobRegistry.set(abs, { blob: b, mimeType: b.type || "video/mp4", size: b.size, createdAt: Date.now() });
                    registerFlowMetadataItem({ videoUrl: abs, source: `cache_${cName}` });
                  }
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // ============================================================================
  // 9. SCAN DES VARIABLES GLOBALES FLOW
  // ============================================================================
  function scanGlobalState() {
    try {
      if (window.__FLOW_STATE__) walkObject(window.__FLOW_STATE__);
      if (window.__NEXT_DATA__?.props) walkObject(window.__NEXT_DATA__.props);
      if (window.WIZ_global_data) walkObject(window.WIZ_global_data);
      if (window.__INITIAL_DATA__) walkObject(window.__INITIAL_DATA__);
    } catch (_) {}
    scanIndexedDBForVideos().catch(() => {});
    scanCacheStorageForVideos().catch(() => {});
  }

  scanGlobalState();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanGlobalState, { once: true });
  }

  // ============================================================================
  // 10. SCAN COMPLET DU DOM EN MONDE PRINCIPAL (LIGHT DOM + TOUS SHADOW ROOTS)
  // ============================================================================
  async function performMainWorldScan() {
    scanGlobalState();
    await Promise.allSettled([
      scanIndexedDBForVideos(),
      scanCacheStorageForVideos()
    ]);

    // Parcourir tous les media elements trackés
    for (const media of allMediaElements) {
      if (media) {
        const s = media.currentSrc || media.src;
        if (s) {
          const abs = toAbs(s);
          registerFlowMetadataItem({
            videoUrl: abs,
            width: media.videoWidth || null,
            height: media.videoHeight || null,
            duration: Number.isFinite(media.duration) && media.duration > 0 ? media.duration : null,
            source: "main_media_element"
          });
        }
      }
    }

    // Parcourir le light DOM et tous les ShadowRoots
    const rootsToScan = [document];
    if (window.__fvmAllShadowRoots) {
      for (const r of window.__fvmAllShadowRoots) {
        if (r) rootsToScan.push(r);
      }
    }

    for (const root of rootsToScan) {
      if (!root.querySelectorAll) continue;
      try {
        const videos = root.querySelectorAll("video, [data-generation-id], flow-card, video-card, generation-card, flow-video");
        videos.forEach((el) => {
          if (el.tagName === "VIDEO") {
            const s = el.currentSrc || el.src;
            if (s) {
              const abs = toAbs(s);
              registerFlowMetadataItem({
                videoUrl: abs,
                width: el.videoWidth || null,
                height: el.videoHeight || null,
                duration: Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null,
                source: "main_dom_video"
              });
            }
          }
          // Inspection des états Web Component en monde principal
          const stateObj = el.flowData || el.videoData || el.generationData || el.metadata || el.clip || el.generation || el.item || el.card || el.__flow_metadata__;
          if (stateObj && typeof stateObj === "object") {
            walkObject(stateObj);
          }
        });
      } catch (_) {}
    }

    return Array.from(metadataRegistry.values());
  }

  // ============================================================================
  // 11. SERVICE DE TRANSFERT BINAIRE POUR LE CONTENT SCRIPT (SANS COPIE)
  // ============================================================================
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("message", async (event) => {
      // A. Synchronisation des métadonnées simple
      if (event.data && event.data.type === "FVM_REQUEST_ALL_METADATA") {
        scanIndexedDBForVideos().catch(() => {});
        scanCacheStorageForVideos().catch(() => {});
        const items = Array.from(metadataRegistry.values());
        window.postMessage({
          source: "FLOW_PAGE_BRIDGE",
          type: "FLOW_ALL_METADATA_RESPONSE",
          items
        }, "*");
      }

      // B. Scan complet asynchrone profond (DOM principal + Shadow roots + IDB + Cache API)
      if (event.data && event.data.source === "FVM_CONTENT" && event.data.type === "FVM_PERFORM_FULL_SCAN") {
        const { requestId } = event.data;
        try {
          const items = await performMainWorldScan();
          window.postMessage({
            source: "FLOW_PAGE_BRIDGE",
            type: "FVM_FULL_SCAN_RESPONSE",
            requestId,
            ok: true,
            items
          }, "*");
        } catch (err) {
          window.postMessage({
            source: "FLOW_PAGE_BRIDGE",
            type: "FVM_FULL_SCAN_RESPONSE",
            requestId,
            ok: false,
            error: err.message,
            items: Array.from(metadataRegistry.values())
          }, "*");
        }
      }

      // C. Récupération binaire de la vidéo (résout les URLs blob: et flow.google/asb/ dans le MAIN world)
      if (event.data && event.data.source === "FVM_CONTENT" && event.data.type === "FVM_REQUEST_VIDEO_DATA") {
        const { requestId, videoUrl, clipId, generationId } = event.data;
        try {
          let buffer = null;
          let mimeType = "video/mp4";

          // 1. Chercher dans blobRegistry par correspondance directe, absolue, sans query params ou par id
          let blobItem = blobRegistry.get(videoUrl);
          if (!blobItem && videoUrl) {
            blobItem = blobRegistry.get(toAbs(videoUrl));
          }
          if (!blobItem && videoUrl) {
            const cleanUrl = videoUrl.split("?")[0];
            blobItem = blobRegistry.get(cleanUrl);
          }
          if (!blobItem && generationId) {
            blobItem = blobRegistry.get(generationId);
          }
          if (!blobItem && generationId && metadataRegistry.has(generationId)) {
            const meta = metadataRegistry.get(generationId);
            if (meta && meta.videoUrl && blobRegistry.has(meta.videoUrl)) {
              blobItem = blobRegistry.get(meta.videoUrl);
            }
          }

          if (blobItem && blobItem.blob) {
            mimeType = blobItem.mimeType || blobItem.blob.type || "video/mp4";
            buffer = await blobItem.blob.arrayBuffer();
          }

          // 2. Si c'est une URL blob: non trouvée en registre, fetch direct dans le MAIN world
          if (!buffer && videoUrl && videoUrl.startsWith("blob:")) {
            try {
              const resp = await (originalFetch || window.fetch)(videoUrl);
              if (resp && resp.ok) {
                const b = await resp.blob();
                mimeType = b.type || "video/mp4";
                buffer = await b.arrayBuffer();
              }
            } catch (_) {}
          }

          // 3. Si c'est une URL HTTP/HTTPS, fetch avec les cookies de session actifs de la page
          if (!buffer && videoUrl && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://"))) {
            try {
              let resp = await (originalFetch || window.fetch)(videoUrl, { credentials: "include" }).catch(() => null);
              if (!resp || !resp.ok) {
                resp = await (originalFetch || window.fetch)(videoUrl).catch(() => null);
              }
              if (resp && resp.ok) {
                const b = await resp.blob();
                mimeType = b.type || "video/mp4";
                buffer = await b.arrayBuffer();
              }
            } catch (_) {}
          }

          // 4. Si c'est un flux MediaSource (MSE)
          if (!buffer && mseRegistry.has(videoUrl)) {
            const ms = mseRegistry.get(videoUrl);
            let chunks = [];
            if (Array.isArray(ms)) {
              chunks = ms;
            } else if (ms && ms.sourceBuffers) {
              for (let i = 0; i < ms.sourceBuffers.length; i++) {
                const sb = ms.sourceBuffers[i];
                if (sb && sb.__fvmChunks && sb.__fvmChunks.length > 0) {
                  chunks = chunks.concat(sb.__fvmChunks);
                }
              }
            }
            if (chunks && chunks.length > 0) {
              const combined = new Blob(chunks, { type: "video/mp4" });
              mimeType = "video/mp4";
              buffer = await combined.arrayBuffer();
            }
          }

          // 5. Recherche dans CacheStorage
          if (!buffer && typeof caches !== "undefined") {
            try {
              const matchRes = await caches.match(videoUrl);
              if (matchRes) {
                const b = await matchRes.blob();
                if (b && b.size > 0) {
                  mimeType = b.type || "video/mp4";
                  buffer = await b.arrayBuffer();
                }
              }
            } catch (_) {}
          }

          if (buffer && buffer.byteLength > 0) {
            // Envoi immédiat vers content.js avec la liste de transfert [buffer] (zéro copie)
            window.postMessage({
              source: "FLOW_PAGE_BRIDGE",
              type: "FVM_VIDEO_DATA_RESPONSE",
              requestId,
              ok: true,
              mimeType,
              buffer
            }, "*", [buffer]);
          } else {
            window.postMessage({
              source: "FLOW_PAGE_BRIDGE",
              type: "FVM_VIDEO_DATA_RESPONSE",
              requestId,
              ok: false,
              error: "Flux vidéo introuvable dans le pont de page"
            }, "*");
          }
        } catch (err) {
          window.postMessage({
            source: "FLOW_PAGE_BRIDGE",
            type: "FVM_VIDEO_DATA_RESPONSE",
            requestId,
            ok: false,
            error: err.message || "Erreur de récupération vidéo dans le pont"
          }, "*");
        }
      }
    });
  }

  // Exposer les méthodes d'accès direct pour inspection ou debug
  window.__flowVideoMergerGetMainWorldMetadata = (key) => metadataRegistry.get(key) || null;
  window.__flowVideoMergerGetBlob = (url) => blobRegistry.get(url) || null;
  window.__flowVideoMergerPerformMainScan = performMainWorldScan;
})();
