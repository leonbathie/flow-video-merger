// Side Panel Controller & Client-Side Video Assembler — Flow Video Merger
// Prise en charge complète des flux /boost haute résolution, streaming par blocs et assemblage fluide

(() => {
  const defaultGroupName = (typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr") ? "Séquence 1" : "Sequence 1";
  const state = {
    groups: {
      [defaultGroupName]: []
    },
    activeGroup: defaultGroupName,
    isMerging: false,
    dragSrcIndex: null
  };

  // Références DOM
  const groupSelect = document.getElementById("groupSelect");
  const newGroupBtn = document.getElementById("newGroupBtn");
  const openStudioBtn = document.getElementById("openStudioBtn");
  const scanFlowBtn = document.getElementById("scanFlowBtn");
  const localFileInput = document.getElementById("localFileInput");
  const sortModeSelect = document.getElementById("sortModeSelect");
  const applySortBtn = document.getElementById("applySortBtn");
  const clipListEl = document.getElementById("clipList");
  const clipCountEl = document.getElementById("clipCount");
  const totalDurationBadge = document.getElementById("totalDurationBadge");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const previewSection = document.getElementById("previewSection");
  const closePreviewBtn = document.getElementById("closePreviewBtn");
  const sequencePreviewPlayer = document.getElementById("sequencePreviewPlayer");
  const previewNowPlaying = document.getElementById("previewNowPlaying");
  const resolutionSelect = document.getElementById("resolutionSelect");
  const transitionSelect = document.getElementById("transitionSelect");
  const progressContainer = document.getElementById("progressContainer");
  const progressStatus = document.getElementById("progressStatus");
  const progressPercent = document.getElementById("progressPercent");
  const progressBarFill = document.getElementById("progressBarFill");
  const previewSeqBtn = document.getElementById("previewSeqBtn");
  const mergeExportBtn = document.getElementById("mergeExportBtn");
  const mergerCanvas = document.getElementById("mergerCanvas");

  if (openStudioBtn) {
    openStudioBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("studio.html") });
      if (typeof chrome !== "undefined" && chrome.sidePanel && typeof chrome.sidePanel.close === "function") {
        try {
          if (chrome.windows && typeof chrome.windows.getCurrent === "function") {
            chrome.windows.getCurrent((win) => {
              if (win && typeof win.id === "number") {
                chrome.sidePanel.close({ windowId: win.id }).catch(() => {});
              }
            });
          }
        } catch (_) {}
      }
      if (typeof window !== "undefined" && typeof window.close === "function") {
        window.close();
      }
    });
  }

  // Écoute des messages pour fermer le panneau latéral (Side Panel)
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === "CLOSE_SIDEPANEL") {
        if (sendResponse) {
          try {
            sendResponse({ ok: true });
          } catch (_) {}
        }
        if (typeof chrome !== "undefined" && chrome.sidePanel && typeof chrome.sidePanel.close === "function") {
          try {
            if (chrome.windows && typeof chrome.windows.getCurrent === "function") {
              chrome.windows.getCurrent((win) => {
                if (win && typeof win.id === "number") {
                  chrome.sidePanel.close({ windowId: win.id }).catch(() => {});
                }
              });
            }
          } catch (_) {}
        }
        if (typeof window !== "undefined" && typeof window.close === "function") {
          window.close();
        }
        return false;
      }
    });
  }

  // Écoute de synchronisation temps réel avec le Studio Web
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      let shouldReRender = false;
      if (changes.fvm_groups && changes.fvm_groups.newValue) {
        const incoming = changes.fvm_groups.newValue;
        const newGroups = {};
        for (const [gName, list] of Object.entries(incoming)) {
          const existingLocal = (state.groups[gName] || []).filter((c) => c.isLocalFile);
          const restored = (list || []).map((c) => {
            const matchLocal = existingLocal.find((l) => l.id === c.id);
            return matchLocal || c;
          });
          newGroups[gName] = restored;
        }
        state.groups = newGroups;
        if (!state.groups[state.activeGroup]) {
          state.activeGroup = Object.keys(state.groups)[0] || defaultGroupName;
          if (!state.groups[state.activeGroup]) state.groups[state.activeGroup] = [];
        }
        shouldReRender = true;
      }
      if (changes.fvm_activeGroup && changes.fvm_activeGroup.newValue) {
        if (state.groups[changes.fvm_activeGroup.newValue]) {
          state.activeGroup = changes.fvm_activeGroup.newValue;
          shouldReRender = true;
        }
      }
      if (shouldReRender) {
        renderGroupOptions();
        renderUI();
      }
    }
  });

  function getActiveClips() {
    if (!state.groups[state.activeGroup]) {
      state.groups[state.activeGroup] = [];
    }
    return state.groups[state.activeGroup];
  }

  function setActiveClips(clips) {
    state.groups[state.activeGroup] = clips.map((c, idx) => ({
      ...c,
      orderIndex: idx + 1
    }));
    saveState();
    renderUI();
    syncBadgesWithTab();
  }

  function saveState() {
    const serializableGroups = {};
    for (const [gName, list] of Object.entries(state.groups)) {
      serializableGroups[gName] = list.map((item) => ({
        id: item.id,
        generationId: item.generationId || "",
        fileName: item.fileName || item.name || "",
        title: item.title || "",
        videoUrl: item.isLocalFile ? "" : item.videoUrl,
        promptText: item.promptText,
        duration: item.duration,
        width: item.width,
        height: item.height,
        sceneNumber: item.sceneNumber ?? null,
        resolution: item.resolution || "",
        model: item.model || "",
        seed: item.seed || "",
        flowMetadata: item.flowMetadata || null,
        discoveredOrder: item.discoveredOrder,
        createdAt: item.createdAt,
        createdAtLabel: item.createdAtLabel || "",
        domTop: item.domTop,
        domLeft: item.domLeft,
        thumbnail: item.thumbnail,
        orderIndex: item.orderIndex,
        isLocalFile: Boolean(item.isLocalFile),
        isBoost: Boolean(item.isBoost),
        tabId: item.tabId,
        frameId: item.frameId
      }));
    }
    chrome.storage.local.set({
      fvm_groups: serializableGroups,
      fvm_activeGroup: state.activeGroup
    });
  }

  function loadState() {
    if (typeof FlowI18n !== "undefined") {
      FlowI18n.init((lang) => {
        if (typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.setLanguage) {
          FlowSmartOrder.setLanguage(lang);
        }
        FlowI18n.onLanguageChanged((newLang) => {
          if (typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.setLanguage) {
            FlowSmartOrder.setLanguage(newLang);
          }
          const targetDefault = newLang === "fr" ? "Séquence 1" : "Sequence 1";
          const oldDefault = newLang === "fr" ? "Sequence 1" : "Séquence 1";
          if (state.groups[oldDefault] && state.groups[oldDefault].length === 0 && !state.groups[targetDefault]) {
            state.groups[targetDefault] = [];
            delete state.groups[oldDefault];
            if (state.activeGroup === oldDefault) {
              state.activeGroup = targetDefault;
            }
            saveState();
          }
          renderGroupOptions();
          renderUI();
        });
      });
    }

    chrome.storage.local.get(["fvm_groups", "fvm_activeGroup"], (res) => {
      if (res.fvm_groups && Object.keys(res.fvm_groups).length > 0) {
        const restored = {};
        for (const [gName, list] of Object.entries(res.fvm_groups)) {
          restored[gName] = (list || []).filter((c) => !c.isLocalFile && c.videoUrl);
        }
        if (Object.keys(restored).length > 0) {
          state.groups = restored;
        }
      }
      if (res.fvm_activeGroup && state.groups[res.fvm_activeGroup]) {
        state.activeGroup = res.fvm_activeGroup;
      }

      // Migrate empty default sequence to active language if needed
      const lang = typeof FlowI18n !== "undefined" ? FlowI18n.getLanguage() : "en";
      const targetDefault = lang === "fr" ? "Séquence 1" : "Sequence 1";
      const oldDefault = lang === "fr" ? "Sequence 1" : "Séquence 1";
      if (state.groups[oldDefault] && state.groups[oldDefault].length === 0 && !state.groups[targetDefault]) {
        state.groups[targetDefault] = [];
        delete state.groups[oldDefault];
        if (state.activeGroup === oldDefault) {
          state.activeGroup = targetDefault;
        }
      }

      renderGroupOptions();
      renderUI();
      syncBadgesWithTab();
    });
  }

  function syncBadgesWithTab() {
    const orderedIds = getActiveClips().map((c) => c.id);
    chrome.runtime.sendMessage({
      type: "HIGHLIGHT_CLIP_IN_TAB",
      orderedIds
    });
  }

  function renderGroupOptions() {
    groupSelect.innerHTML = "";
    Object.keys(state.groups).forEach((groupName) => {
      const opt = document.createElement("option");
      opt.value = groupName;
      opt.textContent = `${groupName} (${state.groups[groupName].length})`;
      if (groupName === state.activeGroup) opt.selected = true;
      groupSelect.appendChild(opt);
    });
  }

  function renderUI() {
    renderGroupOptions();
    const clips = getActiveClips();
    clipCountEl.textContent = String(clips.length);

    const totalSec = clips.reduce((acc, c) => acc + (Number(c.duration) || 0), 0);
    totalDurationBadge.textContent = `${totalSec.toFixed(1)}s`;

    previewSeqBtn.disabled = clips.length === 0 || state.isMerging;
    mergeExportBtn.disabled = clips.length === 0 || state.isMerging;

    clipListEl.innerHTML = "";

    if (clips.length === 0) {
      const emptyTitle = FlowI18n.t("empty_title", { group: escapeHtml(state.activeGroup) });
      const emptyDesc = FlowI18n.t("empty_desc_sidepanel");
      const step1 = FlowI18n.t("empty_step_1");
      const step2 = FlowI18n.t("empty_step_2");
      const step3 = FlowI18n.t("empty_step_3");

      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="empty-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <path d="M10 8l6 4-6 4V8z" fill="currentColor" fill-opacity="0.3" />
          </svg>
        </div>
        <div class="empty-title">${emptyTitle}</div>
        <p class="empty-desc">
          ${emptyDesc}
        </p>
        <div class="empty-steps">
          <div class="empty-step">
            <span class="step-num">1</span>
            <span>${step1}</span>
          </div>
          <div class="empty-step">
            <span class="step-num">2</span>
            <span>${step2}</span>
          </div>
          <div class="empty-step">
            <span class="step-num">3</span>
            <span>${step3}</span>
          </div>
        </div>
      `;
      clipListEl.appendChild(empty);
      return;
    }

    clips.forEach((clip, index) => {
      const numStr = String(index + 1).padStart(2, "0");
      const card = document.createElement("div");
      card.className = "clip-card";
      card.draggable = !state.isMerging;
      card.dataset.index = String(index);

      const isBoost = Boolean(
        clip.isBoost ||
        (clip.videoUrl && (clip.videoUrl.includes("/boost") || clip.videoUrl.includes("boost") || clip.videoUrl.includes("upscale"))) ||
        (clip.promptText && (clip.promptText.includes("Boost") || clip.promptText.includes("⚡")))
      );

      const hasLocalBlob = Boolean(clip.cachedObjectUrl || clip.localObjectUrl);
      const isSafeLocalThumb = clip.thumbnail && (clip.thumbnail.startsWith("data:") || clip.thumbnail.startsWith("blob:"));
      const isRemoteThumb = clip.thumbnail && (clip.thumbnail.startsWith("http://") || clip.thumbnail.startsWith("https://"));

      const thumbHtml = isSafeLocalThumb
        ? `<img class="clip-thumb" src="${clip.thumbnail}" alt="Clip ${numStr}" />`
        : hasLocalBlob
        ? `<video class="clip-thumb" src="${clip.cachedObjectUrl || clip.localObjectUrl}" muted preload="metadata"></video>`
        : `<div class="clip-thumb clip-thumb-placeholder" data-clip-id="${clip.id}" title="Clip #${numStr}"><svg class="placeholder-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span class="placeholder-tag">#${numStr}</span></div>`;

      const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
      const gripTitle = FlowI18n.t("drag_grip_title");
      const posTitle = FlowI18n.t("pos_badge_title", { num: numStr });
      const posSelectTitle = FlowI18n.t("pos_select_title");
      const thumbTitle = FlowI18n.t("thumb_preview_title");
      const boostTitle = FlowI18n.t("boost_fidelity_title");
      const editTitle = FlowI18n.t("clip_title_title");
      const placeholderTitle = FlowI18n.t("clip_title_placeholder");
      const moveUpTitle = FlowI18n.t("move_up_title");
      const moveDownTitle = FlowI18n.t("move_down_title");
      const deleteTitle = FlowI18n.t("remove_clip_title");

      const boostBadgeHtml = isBoost
        ? `<span class="boost-indicator" title="${boostTitle}">⚡ 4K</span>`
        : "";

      // Titre épuré et lisible (retrait des horodatages _20261027... et suffixes techniques)
      const displayTitle = typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.cleanTitle
        ? FlowSmartOrder.cleanTitle(clip.title || clip.promptText || clip.fileName, index + 1)
        : (clip.title || clip.promptText || (isFr ? `Clip Flow #${numStr}` : `Flow Clip #${numStr}`));

      // Options du sélecteur de position directe
      let posOptionsHtml = "";
      for (let p = 0; p < clips.length; p++) {
        const pNum = String(p + 1).padStart(2, "0");
        posOptionsHtml += `<option value="${p}" ${p === index ? "selected" : ""}>#${pNum}</option>`;
      }

      card.innerHTML = `
        <!-- Grip tactile de réorganisation -->
        <div class="clip-drag-grip" title="${gripTitle}">
          <div class="grip-column">
            <span class="grip-dot"></span>
            <span class="grip-dot"></span>
            <span class="grip-dot"></span>
          </div>
          <div class="grip-column">
            <span class="grip-dot"></span>
            <span class="grip-dot"></span>
            <span class="grip-dot"></span>
          </div>
        </div>

        <!-- Badge d'ordre épuré avec sélecteur discret au clic -->
        <div class="clip-order-badge" title="${posTitle}">
          <span class="order-num">#${numStr}</span>
          <select class="clip-pos-select" title="${posSelectTitle}">
            ${posOptionsHtml}
          </select>
        </div>

        <!-- Miniature avec durée et clic lecture -->
        <div class="clip-thumb-wrap" title="${thumbTitle}">
          ${thumbHtml}
          <div class="clip-thumb-play-overlay">
            <span class="play-overlay-icon">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </span>
          </div>
          <span class="clip-thumb-dur">${(Number(clip.duration) || 5).toFixed(1)}s</span>
        </div>

        <!-- Informations épurées -->
        <div class="clip-info">
          <div class="clip-title-row">
            <input type="text" class="clip-title-input" value="${escapeHtml(displayTitle)}" title="${editTitle}" placeholder="${placeholderTitle}" spellcheck="false" />
            ${boostBadgeHtml}
          </div>
          <div class="clip-meta">
            <span class="meta-tag meta-res">${escapeHtml(clip.resolution || "1080p")}</span>
            <span class="meta-sep">•</span>
            <span class="meta-tag meta-dur">${(Number(clip.duration) || 5).toFixed(1)}s</span>
          </div>
        </div>

        <!-- Actions rapides au survol -->
        <div class="clip-hover-actions">
          <button class="mini-btn move-up" title="${moveUpTitle}" ${index === 0 ? "disabled" : ""}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button class="mini-btn move-down" title="${moveDownTitle}" ${index === clips.length - 1 ? "disabled" : ""}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <button class="mini-btn delete" title="${deleteTitle}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;

      const titleInput = card.querySelector(".clip-title-input");
      if (titleInput) {
        titleInput.addEventListener("input", (e) => {
          clip.title = e.target.value;
          clip.promptText = e.target.value;
          saveState();
        });
        titleInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            titleInput.blur();
          }
        });
        titleInput.addEventListener("blur", (e) => {
          if (!e.target.value.trim()) {
            const fallback = `Clip #${numStr}`;
            e.target.value = fallback;
            clip.title = fallback;
            clip.promptText = fallback;
            saveState();
          }
        });
        titleInput.addEventListener("click", (e) => {
          e.stopPropagation();
        });
      }

      if (isRemoteThumb && !isSafeLocalThumb) {
        const placeholder = card.querySelector(`.clip-thumb-placeholder[data-clip-id="${clip.id}"]`);
        if (placeholder) {
          loadRemoteThumbnailSafely(clip, placeholder);
        }
      }

      const posSelect = card.querySelector(".clip-pos-select");
      if (posSelect) {
        posSelect.addEventListener("change", (e) => {
          const newPos = parseInt(e.target.value, 10);
          if (newPos !== index) {
            moveClip(index, newPos);
          }
        });
      }

      const playBtn = card.querySelector(".play-clip-btn");
      if (playBtn) {
        playBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          previewSection.classList.remove("hidden");
          previewIndex = index;
          playPreviewClipAtIndex(index);
        });
      }

      card.querySelector(".clip-thumb-wrap")?.addEventListener("click", () => {
        previewSection.classList.remove("hidden");
        previewIndex = index;
        playPreviewClipAtIndex(index);
      });

      const moveFirstBtn = card.querySelector(".move-first");
      if (moveFirstBtn) {
        moveFirstBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          moveClip(index, 0);
        });
      }

      const moveUpBtn = card.querySelector(".move-up");
      if (moveUpBtn) {
        moveUpBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          moveClip(index, index - 1);
        });
      }

      const moveDownBtn = card.querySelector(".move-down");
      if (moveDownBtn) {
        moveDownBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          moveClip(index, index + 1);
        });
      }

      const moveLastBtn = card.querySelector(".move-last");
      if (moveLastBtn) {
        moveLastBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          moveClip(index, clips.length - 1);
        });
      }

      const deleteBtn = card.querySelector(".delete");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeClip(index);
        });
      }

      card.addEventListener("dragstart", (e) => {
        if (e.target.closest("select, button, input")) {
          e.preventDefault();
          return;
        }
        state.dragSrcIndex = index;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        state.dragSrcIndex = null;
        document.querySelectorAll(".clip-card.drag-over").forEach((c) => c.classList.remove("drag-over"));
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("dragenter", () => {
        if (state.dragSrcIndex !== null && state.dragSrcIndex !== index) {
          card.classList.add("drag-over");
        }
      });
      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) {
          card.classList.remove("drag-over");
        }
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (state.dragSrcIndex !== null && state.dragSrcIndex !== index) {
          moveClip(state.dragSrcIndex, index);
        }
      });

      clipListEl.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function moveClip(fromIndex, toIndex) {
    const clips = [...getActiveClips()];
    if (toIndex < 0 || toIndex >= clips.length) return;
    const [moved] = clips.splice(fromIndex, 1);
    clips.splice(toIndex, 0, moved);
    if (previewIndex === fromIndex) {
      previewIndex = toIndex;
    } else if (previewIndex > fromIndex && previewIndex <= toIndex) {
      previewIndex -= 1;
    } else if (previewIndex < fromIndex && previewIndex >= toIndex) {
      previewIndex += 1;
    }
    setActiveClips(clips);
  }

  function removeClip(index) {
    const clips = [...getActiveClips()];
    const [removed] = clips.splice(index, 1);
    if (removed && removed.cachedObjectUrl) {
      URL.revokeObjectURL(removed.cachedObjectUrl);
    }
    setActiveClips(clips);
  }

  function sortClipsList(clips, mode) {
    if (typeof FlowSmartOrder !== "undefined") {
      return FlowSmartOrder.sortClips(clips, mode);
    }
    const copy = [...clips];
    if (mode === "dom") {
      copy.sort((a, b) => ((a.domTop || 0) - (b.domTop || 0)) || ((a.domLeft || 0) - (b.domLeft || 0)));
    } else if (mode === "chronological") {
      copy.sort((a, b) => (a.discoveredOrder || a.createdAt || 0) - (b.discoveredOrder || b.createdAt || 0));
    } else if (mode === "natural") {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      copy.sort((a, b) => collator.compare(a.promptText || "", b.promptText || ""));
    } else if (mode === "reverse") {
      copy.reverse();
    }
    return copy;
  }

  // Fusion intelligente : si une version Boostée est scannée pour un clip existant,
  // mettre à jour le clip EN PLACE dans la séquence (#01, #02...) sans créer de doublon
  function smartMergeClips(currentList, scanned, sortMode) {
    if (currentList.length === 0) {
      return sortClipsList(scanned, sortMode);
    }

    const result = [...currentList];

    for (const incoming of scanned) {
      const isIncomingBoost = Boolean(
        incoming.isBoost ||
        (incoming.videoUrl && (incoming.videoUrl.includes("/boost") || incoming.videoUrl.includes("boost") || incoming.videoUrl.includes("upscale")))
      );

      // Chercher une correspondance dans la liste actuelle (par URL exacte, ID, ID de génération Flow, ou upgrade Boost par prompt)
      const existingIdx = result.findIndex((existing) => {
        if (existing.videoUrl === incoming.videoUrl) return true;
        if (existing.id === incoming.id) return true;
        if (existing.generationId && incoming.generationId && existing.generationId === incoming.generationId) return true;
        // Seul un clip Boost venant remplacer un draft standard pour le même prompt peut matcher par prompt
        if (isIncomingBoost && !existing.isBoost) {
          if (!existing.generationId || !incoming.generationId || existing.generationId === incoming.generationId) {
            const cleanExisting = (existing.promptText || "").replace(/^\[Boost ⚡\]\s*/i, "").trim().toLowerCase();
            const cleanIncoming = (incoming.promptText || "").replace(/^\[Boost ⚡\]\s*/i, "").trim().toLowerCase();
            return cleanExisting.length > 5 && cleanExisting === cleanIncoming;
          }
        }
        return false;
      });

      if (existingIdx !== -1) {
        const existing = result[existingIdx];
        // Si le clip scanné est Boosté et que l'actuel ne l'est pas (ou que l'URL boost est plus récente), UPGRADE EN PLACE !
        if (isIncomingBoost && (!existing.isBoost || !existing.videoUrl.includes("boost"))) {
          result[existingIdx] = {
            ...existing,
            generationId: incoming.generationId || existing.generationId || "",
            videoUrl: incoming.videoUrl,
            thumbnail: incoming.thumbnail || existing.thumbnail,
            width: incoming.width || 1920,
            height: incoming.height || 1080,
            sceneNumber: incoming.sceneNumber ?? existing.sceneNumber,
            resolution: incoming.resolution || existing.resolution,
            createdAt: incoming.createdAt || existing.createdAt,
            createdAtLabel: incoming.createdAtLabel || existing.createdAtLabel,
            model: incoming.model || existing.model,
            seed: incoming.seed || existing.seed,
            flowMetadata: incoming.flowMetadata || existing.flowMetadata,
            isBoost: true,
            tabId: incoming.tabId || existing.tabId,
            frameId: incoming.frameId ?? existing.frameId,
            promptText: incoming.promptText.startsWith("[Boost ⚡]") ? incoming.promptText : `[Boost ⚡] ${incoming.promptText}`
          };
          // Invalider l'ancien cache pour recharger le flux haute résolution
          if (existing.cachedObjectUrl) {
            URL.revokeObjectURL(existing.cachedObjectUrl);
            result[existingIdx].cachedObjectUrl = null;
          }
        } else {
          // Enrichissement avec les métadonnées natives Flow sans casser l'ordre
          result[existingIdx] = {
            ...existing,
            generationId: existing.generationId || incoming.generationId || "",
            sceneNumber: existing.sceneNumber ?? incoming.sceneNumber ?? null,
            resolution: existing.resolution || incoming.resolution || "",
            createdAt: (existing.createdAt && existing.createdAt > 100000000) ? existing.createdAt : (incoming.createdAt || existing.createdAt),
            createdAtLabel: existing.createdAtLabel || incoming.createdAtLabel || "",
            model: existing.model || incoming.model || "",
            seed: existing.seed || incoming.seed || "",
            flowMetadata: existing.flowMetadata || incoming.flowMetadata || null,
            thumbnail: existing.thumbnail || incoming.thumbnail || "",
            duration: (existing.duration && existing.duration !== 5) ? existing.duration : (incoming.duration || existing.duration)
          };
        }
      } else {
        result.push(incoming);
      }
    }

    return result;
  }

  // Événements Toolbar
  groupSelect.addEventListener("change", () => {
    state.activeGroup = groupSelect.value;
    saveState();
    renderUI();
    syncBadgesWithTab();
  });

  newGroupBtn.addEventListener("click", async () => {
    const nextNum = Object.keys(state.groups).length + 1;
    const promptMsg = FlowI18n.t("prompt_new_scene");
    const defaultName = `${FlowI18n.t("new_group_prefix")}${nextNum}`;
    const title = FlowI18n.t("dialog_title_new_scene");
    const confirmText = FlowI18n.t("dialog_create");
    const cancelText = FlowI18n.t("dialog_cancel");
    const placeholder = FlowI18n.t("prompt_new_scene_placeholder");
    const name = (typeof FlowDialog !== "undefined" && FlowDialog.prompt)
      ? await FlowDialog.prompt(promptMsg, defaultName, { title, confirmText, cancelText, placeholder, icon: "plus" })
      : prompt(promptMsg, defaultName);
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    if (!state.groups[cleanName]) {
      state.groups[cleanName] = [];
    }
    state.activeGroup = cleanName;
    saveState();
    renderUI();
    syncBadgesWithTab();
  });

  scanFlowBtn.addEventListener("click", () => {
    const sortMode = sortModeSelect.value;
    scanFlowBtn.disabled = true;
    scanFlowBtn.textContent = FlowI18n.t("scanning_clips");
    chrome.runtime.sendMessage({ type: "SCAN_ACTIVE_TAB", sortMode }, async (res) => {
      scanFlowBtn.disabled = false;
      scanFlowBtn.innerHTML = `
        <svg class="btn-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span data-i18n="capture_flow_clips">${FlowI18n.t("capture_flow_clips")}</span>
      `;
      if (!res || !res.ok) {
        const errMsg = res?.error || FlowI18n.t("open_flow_prompt");
        const title = FlowI18n.t("dialog_title_open_flow");
        if (typeof FlowDialog !== "undefined" && FlowDialog.alert) {
          await FlowDialog.alert(errMsg, { title, type: "warning" });
        } else {
          alert(errMsg);
        }
        return;
      }
      const scanned = res.clips || [];
      if (scanned.length === 0) {
        const msg = FlowI18n.t("no_videos_found");
        const title = FlowI18n.t("dialog_title_no_videos");
        if (typeof FlowDialog !== "undefined" && FlowDialog.alert) {
          await FlowDialog.alert(msg, { title, type: "info" });
        } else {
          alert(msg);
        }
        return;
      }

      const mergedList = smartMergeClips(getActiveClips(), scanned, sortMode);
      setActiveClips(mergedList);

      const boostCount = mergedList.filter((c) => c.isBoost || (c.videoUrl && c.videoUrl.includes("boost"))).length;
      if (boostCount > 0) {
        console.log(`Flow Video Merger: ${mergedList.length} clips chargés, dont ${boostCount} vidéos /boost haute résolution ⚡.`);
      }
    });
  });

  applySortBtn.addEventListener("click", () => {
    const sorted = sortClipsList(getActiveClips(), sortModeSelect.value);
    setActiveClips(sorted);
  });

  clearAllBtn.addEventListener("click", async () => {
    const current = getActiveClips();
    if (current.length === 0) return;
    const msg = FlowI18n.t("confirm_clear_scene", { group: state.activeGroup });
    const title = FlowI18n.t("dialog_title_clear_scene");
    const confirmText = FlowI18n.t("dialog_clear_clips");
    const cancelText = FlowI18n.t("dialog_cancel");
    const ok = (typeof FlowDialog !== "undefined" && FlowDialog.confirm)
      ? await FlowDialog.confirm(msg, { title, confirmText, cancelText, danger: true, icon: "danger" })
      : confirm(msg);
    if (!ok) return;
    current.forEach((c) => {
      if (c.cachedObjectUrl) URL.revokeObjectURL(c.cachedObjectUrl);
    });
    setActiveClips([]);
  });

  // Import de fichiers vidéo locaux (.mp4 / .webm) avec tri naturel par nom (01, 02, 03...)
  localFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    files.sort((a, b) => collator.compare(a.name, b.name));

    const currentClips = [...getActiveClips()];
    for (const file of files) {
      const objUrl = URL.createObjectURL(file);
      const meta = await probeLocalVideoMetadata(objUrl, file.name);
      currentClips.push({
        id: "local_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        videoUrl: objUrl,
        localObjectUrl: objUrl,
        isLocalFile: true,
        fileName: file.name,
        name: file.name,
        promptText: file.name.replace(/\.[^/.]+$/, ""),
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        thumbnail: meta.thumbnail,
        createdAt: file.lastModified || Date.now(),
        discoveredOrder: currentClips.length + 1
      });
    }
    localFileInput.value = "";
    const sorted = sortClipsList(currentClips, sortModeSelect.value);
    setActiveClips(sorted);
  });

  function probeLocalVideoMetadata(url, fallbackName) {
    return new Promise((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.src = url;
      v.onloadeddata = () => {
        v.currentTime = Math.min(0.2, (v.duration || 1) * 0.1);
      };
      v.onseeked = () => {
        let thumb = "";
        try {
          const c = document.createElement("canvas");
          c.width = 240;
          c.height = Math.max(135, Math.round((240 * (v.videoHeight || 720)) / (v.videoWidth || 1280)));
          c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
          thumb = c.toDataURL("image/jpeg", 0.72);
        } catch (_) {}
        resolve({
          duration: Number.isFinite(v.duration) ? Number(v.duration.toFixed(2)) : 5,
          width: v.videoWidth || 1280,
          height: v.videoHeight || 720,
          thumbnail: thumb
        });
      };
      v.onerror = () => {
        resolve({ duration: 5, width: 1280, height: 720, thumbnail: "" });
      };
    });
  }

  // Écoute du bouton "+ Séquence" cliqué directement sur une vidéo dans Google Flow
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TOGGLE_CLIP_FROM_PAGE" && message.clip) {
      const clips = [...getActiveClips()];
      const existingIdx = clips.findIndex((c) => c.id === message.clip.id || c.videoUrl === message.clip.videoUrl);
      if (existingIdx !== -1) {
        clips.splice(existingIdx, 1);
      } else {
        clips.push(message.clip);
      }
      setActiveClips(clips);
    }

    if (message.type === "CLIP_METADATA_UPDATED" && message.clipId) {
      const clips = getActiveClips();
      const target = clips.find((c) => c.id === message.clipId);
      if (target) {
        let changed = false;
        if (message.thumbnail && !target.thumbnail) {
          target.thumbnail = message.thumbnail;
          changed = true;
        }
        if (message.duration && (!target.duration || target.duration === 5)) {
          target.duration = message.duration;
          changed = true;
        }
        if (message.width) {
          target.width = message.width;
          changed = true;
        }
        if (message.height) {
          target.height = message.height;
          changed = true;
        }
        if (message.sceneNumber !== undefined && message.sceneNumber !== null && target.sceneNumber === null) {
          target.sceneNumber = message.sceneNumber;
          changed = true;
        }
        if (message.resolution && !target.resolution) {
          target.resolution = message.resolution;
          changed = true;
        }
        if (message.createdAt && (!target.createdAt || target.createdAt < 100000000)) {
          target.createdAt = message.createdAt;
          target.createdAtLabel = message.createdAtLabel || target.createdAtLabel;
          changed = true;
        }
        if (message.generationId && !target.generationId) {
          target.generationId = message.generationId;
          changed = true;
        }
        if (message.model && !target.model) {
          target.model = message.model;
          changed = true;
        }
        if (message.seed && !target.seed) {
          target.seed = message.seed;
          changed = true;
        }
        if (message.flowMetadata && !target.flowMetadata) {
          target.flowMetadata = message.flowMetadata;
          changed = true;
        }
        if (changed) {
          saveState();
          renderUI();
        }
      }
    }
  });

  // ============================================================================
  // GESTION SÉCURISÉE DES MINIATURES ET DU PROTOCOLE VIDÉO (/boost, GCS & BLOBS)
  // ============================================================================
  const pendingThumbFetches = new Set();
  async function loadRemoteThumbnailSafely(clip, placeholderEl) {
    if (!clip || !clip.thumbnail || pendingThumbFetches.has(clip.id)) return;
    if (clip.thumbnail.startsWith("data:") || clip.thumbnail.startsWith("blob:")) return;
    pendingThumbFetches.add(clip.id);
    try {
      // 1. Tenter la récupération privilégiée via le service worker d'arrière-plan
      const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "FETCH_BACKGROUND_RESOURCE", url: clip.thumbnail }, (r) => {
          if (chrome.runtime.lastError || !r || !r.ok) resolve(null);
          else resolve(r);
        });
      });

      let safeThumbUrl = "";
      if (res && res.dataUrl) {
        safeThumbUrl = res.dataUrl;
      } else {
        // 2. Tenter un fetch direct depuis le sidepanel sous declarativeNetRequest
        const resp = await fetch(clip.thumbnail, { credentials: "include" }).catch(() => null)
          || await fetch(clip.thumbnail).catch(() => null);
        if (resp && resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 0) {
            safeThumbUrl = URL.createObjectURL(blob);
          }
        }
      }

      if (safeThumbUrl) {
        clip.thumbnail = safeThumbUrl;
        if (placeholderEl && placeholderEl.parentElement) {
          const img = document.createElement("img");
          img.className = "clip-thumb";
          img.src = safeThumbUrl;
          img.alt = clip.promptText || "Clip";
          placeholderEl.replaceWith(img);
        }
      }
    } catch (_) {
      // Échec silencieux : le badge placeholder reste affiché sans générer d'erreur console
    } finally {
      pendingThumbFetches.delete(clip.id);
    }
  }

  async function resolveTabForClip(clip) {
    const isEligible = (t) => t && t.id && t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://");
    const isFlow = (t) => isEligible(t) && (
      t.url.includes("flow.google") ||
      t.url.includes("labs.google") ||
      t.url.includes("aitestkitchen.withgoogle.com") ||
      t.url.includes("deepmind.google")
    );

    // 1. Tenter le tabId mémorisé sur le clip
    if (clip && clip.tabId) {
      try {
        const tab = await chrome.tabs.get(clip.tabId);
        if (isEligible(tab)) return tab.id;
      } catch (_) {}
    }

    // 2. Chercher les onglets Flow ouverts
    try {
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
        const activeFlow = flowTabs.find((t) => t.active);
        return (activeFlow || flowTabs[0]).id;
      }
    } catch (_) {}

    // 3. Onglet actif de la fenêtre (s'il n'est pas une extension)
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (isEligible(activeTab)) return activeTab.id;
    } catch (_) {}

    // 4. N'importe quel onglet nommé flow
    try {
      const allTabs = await chrome.tabs.query({});
      const named = allTabs.find((t) => isEligible(t) && (t.url?.includes("flow") || t.title?.toLowerCase().includes("flow")));
      if (named) return named.id;
    } catch (_) {}

    return null;
  }

  // Téléchargement par blocs de 2 Mo depuis l'onglet source pour les gros flux /boost et blobs
  async function fetchVideoFromTabInChunks(clip) {
    let tabId = await resolveTabForClip(clip);
    if (!tabId) {
      console.warn("Onglet source introuvable pour le flux vidéo :", clip.videoUrl);
      return null;
    }

    const frameId = typeof clip.frameId === "number" ? clip.frameId : 0;

    function sendToTab(targetTabId, msg) {
      return new Promise((resolve) => {
        const opts = frameId > 0 ? { frameId } : {};
        chrome.tabs.sendMessage(targetTabId, msg, opts, (res) => {
          if (chrome.runtime.lastError) {
            if (frameId > 0) {
              chrome.tabs.sendMessage(targetTabId, msg, {}, (retryRes) => {
                if (chrome.runtime.lastError) {
                  resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                  resolve(retryRes || { ok: false, error: "Pas de réponse" });
                }
              });
            } else {
              resolve({ ok: false, error: chrome.runtime.lastError.message });
            }
          } else {
            resolve(res || { ok: false, error: "Pas de réponse" });
          }
        });
      });
    }

    // 1. Démarrer la session de téléchargement par blocs
    let initRes = await sendToTab(tabId, {
      type: "START_CHUNKED_DOWNLOAD",
      videoUrl: clip.videoUrl,
      clipId: clip.id,
      generationId: clip.generationId || ""
    });

    // En cas d'échec de premier contact (ex: tab rechargé ou tabId orphelin), re-résoudre l'onglet
    if (!initRes || !initRes.ok) {
      const freshTabId = await resolveTabForClip(null);
      if (freshTabId && freshTabId !== tabId) {
        tabId = freshTabId;
        clip.tabId = freshTabId;
        initRes = await sendToTab(freshTabId, {
          type: "START_CHUNKED_DOWNLOAD",
          videoUrl: clip.videoUrl,
          clipId: clip.id,
          generationId: clip.generationId || ""
        });
      }
    }

    if (!initRes || !initRes.ok) {
      console.warn("Échec START_CHUNKED_DOWNLOAD :", initRes?.error);
      return null;
    }

    const { downloadId, totalChunks, mimeType } = initRes;
    const chunkBuffers = [];

    // 2. Récupérer chaque bloc séquentiellement
    for (let c = 0; c < totalChunks; c++) {
      const chunkRes = await sendToTab(tabId, {
        type: "GET_VIDEO_CHUNK",
        downloadId,
        chunkIndex: c
      });

      if (!chunkRes || !chunkRes.ok || !chunkRes.data) {
        console.error(`Erreur sur le bloc ${c + 1}/${totalChunks} :`, chunkRes?.error);
        return null;
      }

      // Reconversion optimisée base64 -> Uint8Array
      const binary = atob(chunkRes.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      chunkBuffers.push(bytes);
    }

    // 3. Libérer la mémoire côté content.js
    await sendToTab(tabId, { type: "FINISH_CHUNKED_DOWNLOAD", downloadId }).catch(() => {});

    return new Blob(chunkBuffers, { type: mimeType || "video/mp4" });
  }

  // Téléchargement par blocs de secours depuis le service worker d'arrière-plan
  async function fetchVideoFromBgInChunks(videoUrl) {
    const initRes = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "START_BG_CHUNKED_DOWNLOAD", videoUrl }, (res) => {
        if (chrome.runtime.lastError || !res || !res.ok) resolve(null);
        else resolve(res);
      });
    });

    if (!initRes || !initRes.downloadId) return null;

    const { downloadId, totalChunks, mimeType } = initRes;
    const chunkBuffers = [];

    for (let c = 0; c < totalChunks; c++) {
      const chunkRes = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "GET_BG_CHUNK", downloadId, chunkIndex: c }, (res) => {
          if (chrome.runtime.lastError || !res || !res.ok) resolve(null);
          else resolve(res);
        });
      });

      if (!chunkRes || !chunkRes.data) return null;

      const binary = atob(chunkRes.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      chunkBuffers.push(bytes);
    }

    chrome.runtime.sendMessage({ type: "FINISH_BG_CHUNKED_DOWNLOAD", downloadId }, () => {});
    return new Blob(chunkBuffers, { type: mimeType || "video/mp4" });
  }

  async function resolvePlayableUrl(clip) {
    if (clip.localObjectUrl) return clip.localObjectUrl;
    if (clip.cachedObjectUrl) return clip.cachedObjectUrl;

    const url = clip.videoUrl;
    if (!url) return "";

    const isGoogleFlowUrl = url.includes("flow.google") || url.includes("/asb/") || url.includes("labs.google");

    // 1. Pour les URLs Google Flow (notamment flow.google.com/asb/...),
    // la méthode prioritaire et la plus fiable est la récupération par blocs depuis l'onglet source
    // car l'onglet détient la session authentifiée active et le contexte DOM.
    if (isGoogleFlowUrl || url.startsWith("blob:")) {
      try {
        const blob = await fetchVideoFromTabInChunks(clip);
        if (blob && blob.size > 0) {
          clip.cachedObjectUrl = URL.createObjectURL(blob);
          return clip.cachedObjectUrl;
        }
      } catch (tabErr) {
        console.warn("Chunked fetch from tab failed for:", url, tabErr);
      }
    }

    // 2. Pour les URLs HTTP/HTTPS, tenter un fetch direct depuis le Side Panel
    // (bénéficie des host_permissions et des règles declarativeNetRequest anti-CORP)
    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        let resp = await fetch(url, { credentials: "include" }).catch(() => null);
        if (!resp || !resp.ok) {
          resp = await fetch(url).catch(() => null);
        }
        if (resp && resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 0) {
            clip.cachedObjectUrl = URL.createObjectURL(blob);
            return clip.cachedObjectUrl;
          }
        }
      } catch (err) {
        console.warn("Direct fetch from sidepanel failed for:", url, err);
      }
    }

    // 3. Fallback secondaire par l'onglet si non tenté précédemment
    if (!isGoogleFlowUrl && !url.startsWith("blob:")) {
      try {
        const blob = await fetchVideoFromTabInChunks(clip);
        if (blob && blob.size > 0) {
          clip.cachedObjectUrl = URL.createObjectURL(blob);
          return clip.cachedObjectUrl;
        }
      } catch (tabErr) {
        console.warn("Secondary chunked fetch from tab failed for:", url, tabErr);
      }
    }

    // 4. Fallback par blocs via le service worker d'arrière-plan (bypass privilégié anti-limite IPC)
    try {
      const bgBlob = await fetchVideoFromBgInChunks(url);
      if (bgBlob && bgBlob.size > 0) {
        clip.cachedObjectUrl = URL.createObjectURL(bgBlob);
        return clip.cachedObjectUrl;
      }
    } catch (_) {}

    // 5. Si toutes les tentatives ont échoué pour un flux protégé Google Flow /asb/,
    // NE PAS retourner l'URL distante brute car l'insérer dans un <video src="..."> déclencherait
    // immédiatement net::ERR_BLOCKED_BY_RESPONSE.NotSameSite dans le lecteur du sidepanel.
    if (isGoogleFlowUrl) {
      throw new Error(FlowI18n.t("err_stream_protected"));
    }

    // Fallback direct uniquement pour les URLs tierces non-Flow
    return clip.videoUrl;
  }

  // ============================================================================
  // PRÉVISUALISATION CONTINUE DANS L'ORDRE (#01 -> #N)
  // ============================================================================
  let previewIndex = 0;

  previewSeqBtn.addEventListener("click", async () => {
    const clips = getActiveClips();
    if (clips.length === 0) return;
    previewSection.classList.remove("hidden");
    previewIndex = 0;
    await playPreviewClipAtIndex(previewIndex);
  });

  function highlightSidepanelActiveCard(activeIndex) {
    const allCards = document.querySelectorAll(".clip-card");
    allCards.forEach((c, i) => {
      if (i === activeIndex) {
        c.classList.add("is-playing");
        c.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        c.classList.remove("is-playing");
      }
    });
  }

  closePreviewBtn.addEventListener("click", () => {
    sequencePreviewPlayer.pause();
    sequencePreviewPlayer.removeAttribute("src");
    previewSection.classList.add("hidden");
    highlightSidepanelActiveCard(-1);
  });

  function waitForSidepanelVideoReady(videoEl, timeoutMs = 7000) {
    return new Promise((resolve) => {
      if (videoEl.readyState >= 2) return resolve(true);
      let timer = null;
      const onReady = () => { cleanup(); resolve(true); };
      const onError = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        videoEl.removeEventListener("loadeddata", onReady);
        videoEl.removeEventListener("canplay", onReady);
        videoEl.removeEventListener("error", onError);
      };
      timer = setTimeout(() => {
        cleanup();
        resolve(videoEl.readyState >= 1);
      }, timeoutMs);
      videoEl.addEventListener("loadeddata", onReady, { once: true });
      videoEl.addEventListener("canplay", onReady, { once: true });
      videoEl.addEventListener("error", onError, { once: true });
    });
  }

  sequencePreviewPlayer.addEventListener("ended", async () => {
    const clips = getActiveClips();
    if (previewIndex + 1 < clips.length) {
      previewIndex += 1;
      await playPreviewClipAtIndex(previewIndex);
    } else {
      const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
      previewNowPlaying.textContent = isFr ? "✅ Lecture de la séquence complète terminée." : "✅ Full sequence playback completed.";
      highlightSidepanelActiveCard(-1);
    }
  });

  sequencePreviewPlayer.addEventListener("error", () => {
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    const clips = getActiveClips();
    if (previewIndex + 1 < clips.length) {
      previewNowPlaying.textContent = isFr
        ? `⚠️ Clip #${previewIndex + 1} indisponible. Passage au suivant...`
        : `⚠️ Clip #${previewIndex + 1} unavailable. Advancing to next...`;
      setTimeout(() => {
        previewIndex += 1;
        playPreviewClipAtIndex(previewIndex);
      }, 1000);
    }
  });

  async function playPreviewClipAtIndex(idx) {
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    const clips = getActiveClips();
    const clip = clips[idx];
    if (!clip) return;
    const numStr = String(idx + 1).padStart(2, "0");
    const boostTag = clip.isBoost ? " ⚡ [Boost]" : "";
    const cleanLabel = typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.cleanTitle
      ? FlowSmartOrder.cleanTitle(clip.title || clip.promptText || clip.fileName, idx + 1)
      : (clip.title || clip.promptText || `Clip #${numStr}`);
    previewNowPlaying.textContent = isFr
      ? `⏳ Chargement du Clip #${numStr}/${String(clips.length).padStart(2, "0")}${boostTag} : ${cleanLabel}`
      : `⏳ Loading Clip #${numStr}/${String(clips.length).padStart(2, "0")}${boostTag}: ${cleanLabel}`;
    highlightSidepanelActiveCard(idx);
    try {
      const playableUrl = await resolvePlayableUrl(clip);
      if (!playableUrl) throw new Error(FlowI18n.t("err_video_stream_not_found"));
      if (sequencePreviewPlayer.src !== playableUrl) {
        sequencePreviewPlayer.src = playableUrl;
        sequencePreviewPlayer.load();
        await waitForSidepanelVideoReady(sequencePreviewPlayer);
      }
      try {
        sequencePreviewPlayer.currentTime = 0;
      } catch (_) {}
      previewNowPlaying.textContent = isFr
        ? `Lecture du Clip #${numStr}/${String(clips.length).padStart(2, "0")}${boostTag} : ${cleanLabel}`
        : `Playing Clip #${numStr}/${String(clips.length).padStart(2, "0")}${boostTag}: ${cleanLabel}`;
      try {
        await sequencePreviewPlayer.play();
      } catch (playErr) {
        if (playErr.name === "NotAllowedError") {
          sequencePreviewPlayer.muted = true;
          await sequencePreviewPlayer.play();
        } else {
          throw playErr;
        }
      }
    } catch (err) {
      previewNowPlaying.textContent = isFr
        ? `⚠️ Erreur sur le Clip #${numStr} (${err.message || "erreur"}). Passage au suivant...`
        : `⚠️ Error on Clip #${numStr} (${err.message || "error"}). Skipping to next...`;
      if (idx + 1 < clips.length) {
        setTimeout(() => {
          previewIndex = idx + 1;
          playPreviewClipAtIndex(previewIndex);
        }, 1200);
      }
    }
  }

  // ============================================================================
  // MOTEUR D'ASSEMBLAGE VIDÉO + AUDIO DANS L'ORDRE STRICT (#01 -> #N)
  // ============================================================================
  function updateProgress(text, pct) {
    progressContainer.classList.remove("hidden");
    progressStatus.textContent = text;
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    progressPercent.textContent = `${clamped}%`;
    progressBarFill.style.width = `${clamped}%`;
  }

  function pickSupportedRecorderMime() {
    const candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=avc1,opus",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    for (const mime of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  }

  mergeExportBtn.addEventListener("click", async () => {
    const orderedClips = getActiveClips();
    if (orderedClips.length === 0 || state.isMerging) return;

    state.isMerging = true;
    renderUI();

    try {
      // Étape 1 : Télécharger et préparer tous les clips dans l'ordre strict #01 -> #N
      const preparedVideos = [];
      for (let i = 0; i < orderedClips.length; i++) {
        const clip = orderedClips[i];
        const numStr = String(i + 1).padStart(2, "0");
        const boostTag = clip.isBoost ? " (Boost ⚡)" : "";
        updateProgress(
          FlowI18n.t("loading_clip_progress", {
            current: numStr,
            total: orderedClips.length,
            boost: boostTag
          }),
          (i / orderedClips.length) * 35
        );

        const playableUrl = await resolvePlayableUrl(clip);
        const videoEl = await createLoadedVideoElement(playableUrl);
        preparedVideos.push({ clip, videoEl, index: i });
      }

      // Étape 2 : Déterminer la résolution cible
      let targetW = preparedVideos[0].videoEl.videoWidth || 1280;
      let targetH = preparedVideos[0].videoEl.videoHeight || 720;
      const resChoice = resolutionSelect.value;
      if (resChoice !== "auto") {
        const [wStr, hStr] = resChoice.split("x");
        targetW = parseInt(wStr, 10);
        targetH = parseInt(hStr, 10);
      }

      mergerCanvas.width = targetW;
      mergerCanvas.height = targetH;
      const ctx = mergerCanvas.getContext("2d", { alpha: false });

      // Étape 3 : Configurer le bus Audio (AudioContext) + Flux Vidéo Canvas (30 FPS)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioDest = audioCtx.createMediaStreamDestination();

      const canvasStream = mergerCanvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);

      const mimeType = pickSupportedRecorderMime();
      const isMp4 = mimeType.startsWith("video/mp4");
      const recorderOptions = mimeType
        ? { mimeType, videoBitsPerSecond: 12_000_000 }
        : { videoBitsPerSecond: 12_000_000 };

      const recordedChunks = [];
      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
      };

      const recordingFinished = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });

      const transitionSec = parseFloat(transitionSelect.value) || 0;
      recorder.start(100);

      // Étape 4 : Lecture et rendu séquentiel dans l'ordre strict (#01 -> #N) sans écran noir
      for (let i = 0; i < preparedVideos.length; i++) {
        const { videoEl } = preparedVideos[i];
        const numStr = String(i + 1).padStart(2, "0");

        // Garder la dernière frame du clip précédent affichée sur le canvas pour éviter tout flash noir
        await renderClipToCanvasAndAudio({
          videoEl,
          ctx,
          targetW,
          targetH,
          audioCtx,
          audioDest,
          transitionSec: i > 0 ? transitionSec : 0,
          onProgress: (clipRatio) => {
            const overallPct = 35 + ((i + clipRatio) / preparedVideos.length) * 60;
            updateProgress(
              FlowI18n.t("merging_clip_progress", {
                current: numStr,
                total: preparedVideos.length
              }),
              overallPct
            );
          }
        });
      }

      updateProgress(FlowI18n.t("finalizing_single_file"), 97);
      recorder.stop();
      await recordingFinished;
      await audioCtx.close().catch(() => {});

      const finalBlob = new Blob(recordedChunks, { type: mimeType || "video/mp4" });
      const finalUrl = URL.createObjectURL(finalBlob);
      const ext = isMp4 ? "mp4" : "webm";
      const safeGroupName = state.activeGroup.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const filename = `${safeGroupName}_Flow_${orderedClips.length}clips.${ext}`;

      chrome.runtime.sendMessage(
        { type: "DOWNLOAD_MERGED_VIDEO", url: finalUrl, filename },
        () => {
          updateProgress(
            FlowI18n.t("video_assembled_success", { total: orderedClips.length }),
            100
          );
          setTimeout(() => {
            progressContainer.classList.add("hidden");
          }, 3500);
        }
      );
    } catch (err) {
      console.error("Erreur lors de l'assemblage :", err);
      const msg = FlowI18n.t("merge_error") + (err?.message || String(err));
      const title = FlowI18n.t("dialog_title_error");
      if (typeof FlowDialog !== "undefined" && FlowDialog.alert) {
        FlowDialog.alert(msg, { title, type: "error" });
      } else {
        alert(msg);
      }
      progressContainer.classList.add("hidden");
    } finally {
      state.isMerging = false;
      renderUI();
    }
  });

  function createLoadedVideoElement(url) {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      if (url.startsWith("http://") || url.startsWith("https://")) {
        v.crossOrigin = "anonymous";
      }
      v.preload = "auto";
      v.playsInline = true;
      v.muted = true;
      v.src = url;

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(FlowI18n.t("err_timeout_clip")));
        }
      }, 25000);

      const onSuccess = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(v);
        }
      };

      if (v.readyState >= 2) {
        onSuccess();
        return;
      }

      v.onloadeddata = onSuccess;
      v.oncanplay = onSuccess;
      v.onerror = () => {
        if (v.crossOrigin) {
          v.removeAttribute("crossorigin");
          v.src = url;
          v.onloadeddata = onSuccess;
          v.onerror = () => {
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              reject(new Error(FlowI18n.t("err_decode_clip")));
            }
          };
        } else if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error(FlowI18n.t("err_decode_clip")));
        }
      };
    });
  }

  function drawVideoCentered(ctx, videoEl, targetW, targetH, alpha = 1) {
    const vw = videoEl.videoWidth || targetW;
    const vh = videoEl.videoHeight || targetH;
    const scale = Math.min(targetW / vw, targetH / vh);
    const drawW = Math.round(vw * scale);
    const drawH = Math.round(vh * scale);
    const offsetX = Math.round((targetW - drawW) / 2);
    const offsetY = Math.round((targetH - drawH) / 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (alpha === 1) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(videoEl, offsetX, offsetY, drawW, drawH);
    ctx.restore();
  }

  function renderClipToCanvasAndAudio({ videoEl, ctx, targetW, targetH, audioCtx, audioDest, transitionSec, onProgress }) {
    return new Promise(async (resolve, reject) => {
      let previousFrameCanvas = null;
      if (transitionSec > 0) {
        previousFrameCanvas = document.createElement("canvas");
        previousFrameCanvas.width = targetW;
        previousFrameCanvas.height = targetH;
        previousFrameCanvas.getContext("2d").drawImage(mergerCanvas, 0, 0);
      }

      let sourceNode = null;
      let gainNode = null;
      try {
        sourceNode = audioCtx.createMediaElementSource(videoEl);
        gainNode = audioCtx.createGain();
        sourceNode.connect(gainNode);
        gainNode.connect(audioDest);
        if (transitionSec > 0) {
          gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + transitionSec);
        } else {
          gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
        }
      } catch (_) {}

      videoEl.currentTime = 0;
      videoEl.muted = false;

      let animId = null;
      const duration = Number.isFinite(videoEl.duration) && videoEl.duration > 0 ? videoEl.duration : 5;

      const renderFrame = () => {
        if (videoEl.paused || videoEl.ended) return;
        const t = videoEl.currentTime || 0;
        if (transitionSec > 0 && previousFrameCanvas && t < transitionSec) {
          const alpha = Math.min(1, Math.max(0, t / transitionSec));
          ctx.drawImage(previousFrameCanvas, 0, 0, targetW, targetH);
          drawVideoCentered(ctx, videoEl, targetW, targetH, alpha);
        } else {
          drawVideoCentered(ctx, videoEl, targetW, targetH, 1);
        }
        onProgress(Math.min(1, t / duration));
        animId = requestAnimationFrame(renderFrame);
      };

      videoEl.onended = () => {
        if (animId) cancelAnimationFrame(animId);
        drawVideoCentered(ctx, videoEl, targetW, targetH, 1);
        if (sourceNode) {
          try {
            sourceNode.disconnect();
            if (gainNode) gainNode.disconnect();
          } catch (_) {}
        }
        onProgress(1);
        resolve();
      };

      videoEl.onerror = () => {
        if (animId) cancelAnimationFrame(animId);
        reject(new Error(FlowI18n.t("err_playback_assembly")));
      };

      try {
        await videoEl.play();
        renderFrame();
      } catch (err) {
        reject(err);
      }
    });
  }

  // Initialisation au chargement du Side Panel
  loadState();
})();
