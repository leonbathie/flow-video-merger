// Studio Web Controller & Video Assembler — Flow Video Merger
// Prise en charge complète de l'interface plein écran, ordonnancement intelligent IA, timeline et assemblage 4K

(() => {
  "use strict";

  const defaultGroupName = (typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr") ? "Séquence 1" : "Sequence 1";
  const state = {
    groups: {
      [defaultGroupName]: []
    },
    activeGroup: defaultGroupName,
    selectedClipId: null,
    isMerging: false,
    dragSrcIndex: null,
    currentPreviewIndex: 0,
    isPlayingSequence: false,
    activeView: "storyboard" // "storyboard" | "timeline"
  };

  // Références DOM
  const groupSelect = document.getElementById("groupSelect");
  const newGroupBtn = document.getElementById("newGroupBtn");
  const renameGroupBtn = document.getElementById("renameGroupBtn");
  const deleteGroupBtn = document.getElementById("deleteGroupBtn");

  const clipCountBadge = document.getElementById("clipCountBadge");
  const totalDurationBadge = document.getElementById("totalDurationBadge");
  const boostStatsPill = document.getElementById("boostStatsPill");
  const boostCountBadge = document.getElementById("boostCountBadge");

  const scanFlowBtn = document.getElementById("scanFlowBtn");
  const localFileInput = document.getElementById("localFileInput");

  const sortStrategySelect = document.getElementById("sortStrategySelect");
  const applyAiSortBtn = document.getElementById("applyAiSortBtn");
  const toggleAiReportBtn = document.getElementById("toggleAiReportBtn");
  const aiConfidenceBadge = document.getElementById("aiConfidenceBadge");
  const aiReportDrawer = document.getElementById("aiReportDrawer");
  const closeAiReportBtn = document.getElementById("closeAiReportBtn");
  const aiReportContent = document.getElementById("aiReportContent");

  const tabStoryboardBtn = document.getElementById("tabStoryboardBtn");
  const tabTimelineBtn = document.getElementById("tabTimelineBtn");
  const storyboardView = document.getElementById("storyboardView");
  const timelineView = document.getElementById("timelineView");
  const clipGridEl = document.getElementById("clipGrid");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const timelineCurrentTime = document.getElementById("timelineCurrentTime");
  const timelineTotalTime = document.getElementById("timelineTotalTime");
  const timelinePlayBtn = document.getElementById("timelinePlayBtn");
  const timelineResetBtn = document.getElementById("timelineResetBtn");
  const timelineRuler = document.getElementById("timelineRuler");
  const timelineTrack = document.getElementById("timelineTrack");
  const timelinePlayhead = document.getElementById("timelinePlayhead");

  const sequencePlayer = document.getElementById("sequencePlayer");
  const playerPlaceholder = document.getElementById("playerPlaceholder");
  const playerCurrentTag = document.getElementById("playerCurrentTag");
  const playerCaption = document.getElementById("playerCaption");
  const prevClipBtn = document.getElementById("prevClipBtn");
  const playSequenceBtn = document.getElementById("playSequenceBtn");
  const nextClipBtn = document.getElementById("nextClipBtn");
  const restartSequenceBtn = document.getElementById("restartSequenceBtn");
  const playerStatusBadge = document.getElementById("playerStatusBadge");

  const resolutionSelect = document.getElementById("resolutionSelect");
  const transitionSelect = document.getElementById("transitionSelect");
  const bitrateSelect = document.getElementById("bitrateSelect");
  const progressContainer = document.getElementById("progressContainer");
  const progressStatus = document.getElementById("progressStatus");
  const progressPercent = document.getElementById("progressPercent");
  const progressBarFill = document.getElementById("progressBarFill");
  const mergeExportBtn = document.getElementById("mergeExportBtn");
  const mergerCanvas = document.getElementById("mergerCanvas");

  const clipInspectorCard = document.getElementById("clipInspectorCard");
  const inspectorPosition = document.getElementById("inspectorPosition");
  const inspectorPromptInput = document.getElementById("inspectorPromptInput");
  const inspectorTags = document.getElementById("inspectorTags");
  const inspectorDuration = document.getElementById("inspectorDuration");
  const inspectorResolution = document.getElementById("inspectorResolution");
  const inspectorType = document.getElementById("inspectorType");

  // ============================================================================
  // ÉTAT ET SYNCHRONISATION STORAGE
  // ============================================================================
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
        FlowI18n.applyTranslations();
        FlowI18n.bindSwitchers();
      });
      FlowI18n.onLanguageChanged((newLang) => {
        if (typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.setLanguage) {
          FlowSmartOrder.setLanguage(newLang);
        }
        FlowI18n.applyTranslations();
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
        if (aiReportDrawer && !aiReportDrawer.classList.contains("hidden")) {
          renderAiReport(getActiveClips());
        }
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

  // Écoute des changements de storage pour synchronisation temps réel avec le Side Panel
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      let shouldReRender = false;
      if (changes.fvm_groups && changes.fvm_groups.newValue) {
        const incoming = changes.fvm_groups.newValue;
        const newGroups = {};
        for (const [gName, list] of Object.entries(incoming)) {
          // Conserver les fichiers locaux en mémoire si existants
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
      opt.textContent = `${groupName} (${state.groups[groupName].length} clips)`;
      if (groupName === state.activeGroup) opt.selected = true;
      groupSelect.appendChild(opt);
    });
  }

  // ============================================================================
  // AFFICHAGE PRINCIPAL (STORYBOARD + TIMELINE + STATS)
  // ============================================================================
  function renderUI() {
    renderGroupOptions();
    const clips = getActiveClips();

    // Badges de statistiques
    clipCountBadge.textContent = String(clips.length);
    const totalSec = clips.reduce((acc, c) => acc + (Number(c.duration) || 5), 0);
    totalDurationBadge.textContent = `${totalSec.toFixed(1)}s`;

    const boostCount = clips.filter((c) => c.isBoost || (c.videoUrl && c.videoUrl.includes("boost"))).length;
    if (boostCount > 0) {
      boostStatsPill.classList.remove("hidden");
      boostCountBadge.textContent = String(boostCount);
    } else {
      boostStatsPill.classList.add("hidden");
    }

    mergeExportBtn.disabled = clips.length === 0 || state.isMerging;
    playSequenceBtn.disabled = clips.length === 0 || state.isMerging;

    // Analyse IA pour badges et confiance
    if (typeof FlowSmartOrder !== "undefined" && clips.length > 0) {
      const exp = FlowSmartOrder.explainSequence(clips);
      aiConfidenceBadge.textContent = `${exp.avgConfidence}%`;
    } else {
      aiConfidenceBadge.textContent = "--%";
    }

    if (state.activeView === "storyboard") {
      renderStoryboard(clips);
    } else {
      renderTimeline(clips);
    }

    renderInspector();
  }

  function renderStoryboard(clips) {
    clipGridEl.innerHTML = "";

    if (clips.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="empty-state-icon">🎬</div>
        <h3>${FlowI18n.t("empty_title", { group: escapeHtml(state.activeGroup) })}</h3>
        <p>
          ${FlowI18n.t("empty_desc_studio")}
        </p>
      `;
      clipGridEl.appendChild(empty);
      return;
    }

    clips.forEach((clip, index) => {
      const numStr = String(index + 1).padStart(2, "0");
      const card = document.createElement("div");
      card.className = `storyboard-card ${state.selectedClipId === clip.id ? "is-selected" : ""}`;
      card.dataset.index = String(index);
      card.dataset.clipId = clip.id;

      const isBoost = Boolean(
        clip.isBoost ||
        (clip.videoUrl && (clip.videoUrl.includes("/boost") || clip.videoUrl.includes("boost") || clip.videoUrl.includes("upscale")))
      );

      const hasLocalBlob = Boolean(clip.cachedObjectUrl || clip.localObjectUrl);
      const isSafeLocalThumb = clip.thumbnail && (clip.thumbnail.startsWith("data:") || clip.thumbnail.startsWith("blob:"));
      const isRemoteThumb = clip.thumbnail && (clip.thumbnail.startsWith("http://") || clip.thumbnail.startsWith("https://"));

      const thumbHtml = isSafeLocalThumb
        ? `<img class="card-thumb-img" src="${clip.thumbnail}" alt="Clip ${numStr}" />`
        : hasLocalBlob
        ? `<video class="card-thumb-video" src="${clip.cachedObjectUrl || clip.localObjectUrl}" muted preload="metadata"></video>`
        : `<div class="card-thumb-placeholder" data-clip-id="${clip.id}"><span class="placeholder-icon">▶</span><span>#${numStr}</span></div>`;

      // Titre épuré et lisible (retrait des horodatages _20261027... et suffixes techniques)
      const displayTitle = typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.cleanTitle
        ? FlowSmartOrder.cleanTitle(clip.title || clip.promptText || clip.fileName, index + 1)
        : (clip.title || clip.promptText || `Clip #${numStr}`);

      // Options du sélecteur de position directe
      let posOptionsHtml = "";
      for (let p = 0; p < clips.length; p++) {
        const pNum = String(p + 1).padStart(2, "0");
        posOptionsHtml += `<option value="${p}" ${p === index ? "selected" : ""}>#${pNum}</option>`;
      }

      const previewTitle = isFr ? "Cliquer pour prévisualiser ce clip" : "Click to preview this clip";
      const posTitle = isFr ? `Position #${numStr} (glisser pour déplacer)` : `Position #${numStr} (drag to reorder)`;
      const posSelectTitle = isFr ? "Changer l'ordre directement" : "Change order directly";
      const boostTitle = isFr ? "Haute résolution 4K" : "4K high resolution";
      const removeTitle = isFr ? "Retirer ce clip" : "Remove this clip";
      const editTitle = isFr ? "Cliquer pour modifier le titre" : "Click to edit title";
      const placeholderTitle = isFr ? "Titre du clip..." : "Clip title...";
      const moveLeftTitle = isFr ? "Déplacer vers la gauche" : "Move left";
      const moveRightTitle = isFr ? "Déplacer vers la droite" : "Move right";
      const playingText = isFr ? "▶ EN LECTURE" : "▶ PLAYING";

      card.innerHTML = `
        <div class="card-thumb-container" title="${previewTitle}">
          ${thumbHtml}

          <!-- Badge d'ordre épuré avec sélecteur discret au clic -->
          <div class="card-order-badge" title="${posTitle}">
            <span class="card-order-num">#${numStr}</span>
            <select class="card-pos-select" title="${posSelectTitle}">
              ${posOptionsHtml}
            </select>
          </div>

          ${isBoost ? `<span class="card-boost-badge" title="${boostTitle}">⚡ 4K</span>` : ""}

          <!-- Bouton de suppression rapide au survol -->
          <button class="card-hover-delete delete-btn" title="${removeTitle}">✕</button>

          <!-- Overlay lecture discret au survol -->
          <div class="card-play-overlay">
            <div class="overlay-play-btn">▶</div>
          </div>
          <div class="card-playing-indicator" style="display:none;">${playingText}</div>
          <div class="card-duration-badge">${(Number(clip.duration) || 5).toFixed(1)}s</div>
        </div>

        <div class="card-body">
          <div class="card-title-row">
            <input type="text" class="card-prompt-input card-title-field" value="${escapeHtml(displayTitle)}" title="${editTitle}" placeholder="${placeholderTitle}" spellcheck="false" />
          </div>

          <div class="card-meta-row">
            <span class="card-meta-tag">${escapeHtml(clip.resolution || (clip.width && clip.height ? `${clip.width}×${clip.height}` : "1080p"))}</span>
            <div class="card-hover-arrows">
              <button class="mini-arrow-btn move-up" title="${moveLeftTitle}" ${index === 0 ? "disabled" : ""}>◀</button>
              <button class="mini-arrow-btn move-down" title="${moveRightTitle}" ${index === clips.length - 1 ? "disabled" : ""}>▶</button>
            </div>
          </div>
        </div>
      `;

      if (isRemoteThumb && !isSafeLocalThumb) {
        const placeholder = card.querySelector(`.card-thumb-placeholder[data-clip-id="${clip.id}"]`);
        if (placeholder) {
          loadRemoteThumbnailSafely(clip, placeholder);
        }
      }

      // Événements de lecture de la section
      const thumbContainer = card.querySelector(".card-thumb-container");
      thumbContainer.addEventListener("click", (e) => {
        if (e.target.closest(".card-pos-select, .delete-btn, .mini-arrow-btn")) return;
        selectClip(clip.id, index);
        playSingleClipAtIndex(index);
      });

      const playActionBtn = card.querySelector(".card-play-action-btn");
      if (playActionBtn) {
        playActionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          selectClip(clip.id, index);
          playSingleClipAtIndex(index);
        });
      }

      // Changement direct de position
      const posSelect = card.querySelector(".card-pos-select");
      if (posSelect) {
        posSelect.addEventListener("change", (e) => {
          const newPos = parseInt(e.target.value, 10);
          if (newPos !== index) {
            moveClip(index, newPos);
          }
        });
      }

      const promptInput = card.querySelector(".card-prompt-input");
      if (promptInput) {
        promptInput.addEventListener("input", (e) => {
          clip.promptText = e.target.value;
          clip.title = e.target.value;
          saveState();
          if (state.selectedClipId === clip.id) {
            inspectorPromptInput.value = clip.title || clip.promptText || "";
          }
        });
        promptInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            promptInput.blur();
          }
        });
        promptInput.addEventListener("blur", (e) => {
          if (!e.target.value.trim()) {
            const fallback = `Clip #${numStr}`;
            e.target.value = fallback;
            clip.title = fallback;
            clip.promptText = fallback;
            saveState();
            if (state.selectedClipId === clip.id) {
              inspectorPromptInput.value = fallback;
            }
          }
        });
        promptInput.addEventListener("click", (e) => {
          e.stopPropagation();
          selectClip(clip.id, index);
        });
      }

      // Boutons de déplacement
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

      const deleteBtn = card.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeClip(index);
        });
      }

      // Glisser-déposer fluide et ergonomique
      card.draggable = !state.isMerging;

      card.addEventListener("dragstart", (e) => {
        if (e.target.closest("textarea, input, select, button")) {
          e.preventDefault();
          return;
        }
        state.dragSrcIndex = index;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        state.dragSrcIndex = null;
        document.querySelectorAll(".storyboard-card").forEach((c) => {
          c.classList.remove("drop-target-left", "drop-target-right");
        });
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = card.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (e.clientX < midX) {
          card.classList.add("drop-target-left");
          card.classList.remove("drop-target-right");
        } else {
          card.classList.add("drop-target-right");
          card.classList.remove("drop-target-left");
        }
      });
      card.addEventListener("dragleave", () => {
        card.classList.remove("drop-target-left", "drop-target-right");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drop-target-left", "drop-target-right");
        if (state.dragSrcIndex !== null && state.dragSrcIndex !== index) {
          moveClip(state.dragSrcIndex, index);
        }
      });

      clipGridEl.appendChild(card);
    });
  }

  function renderTimeline(clips) {
    timelineTrack.innerHTML = "";
    timelineRuler.innerHTML = "";

    // Réinsérer le curseur Playhead
    timelineTrack.appendChild(timelinePlayhead);

    if (clips.length === 0) {
      const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
      const emptyNote = document.createElement("div");
      emptyNote.style.padding = "2rem";
      emptyNote.style.color = "var(--text-muted)";
      emptyNote.textContent = isFr ? "Aucun clip sur la piste temporelle." : "No clips on the timeline track.";
      timelineTrack.appendChild(emptyNote);
      return;
    }

    const totalSec = clips.reduce((acc, c) => acc + (Number(c.duration) || 5), 0);
    timelineTotalTime.textContent = formatTimecode(totalSec);

    // Graduations de la règle (toutes les 5 secondes)
    const stepSec = totalSec > 60 ? 10 : (totalSec > 20 ? 5 : 2);
    for (let s = 0; s <= Math.ceil(totalSec); s += stepSec) {
      const pct = (s / (totalSec || 1)) * 100;
      const tick = document.createElement("div");
      tick.className = "ruler-tick";
      tick.style.left = `${pct}%`;
      tick.textContent = formatTimecode(s);
      timelineRuler.appendChild(tick);
    }

    // Blocs de clips proportionnels à leur durée
    let cumulativeSec = 0;
    clips.forEach((clip, index) => {
      const numStr = String(index + 1).padStart(2, "0");
      const duration = Number(clip.duration) || 5;
      const widthPct = Math.max(8, (duration / (totalSec || 1)) * 100);

      const block = document.createElement("div");
      block.className = `timeline-clip-block ${clip.isBoost ? "is-boost" : ""}`;
      block.style.flex = `${widthPct} 0 0%`;
      block.dataset.index = String(index);
      block.draggable = !state.isMerging;

      const displayTitle = typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.cleanTitle
        ? FlowSmartOrder.cleanTitle(clip.title || clip.promptText || clip.fileName, index + 1)
        : (clip.title || clip.promptText || `Clip #${numStr}`);

      block.innerHTML = `
        <div class="timeline-clip-header">
          <span class="timeline-clip-index">#${numStr}</span>
          ${clip.isBoost ? `<span style="color:#f59e0b; font-size:10px;">⚡</span>` : ""}
        </div>
        <div class="timeline-clip-name" title="${escapeHtml(displayTitle)}">
          ${escapeHtml(displayTitle)}
        </div>
        <div class="timeline-clip-dur">${duration.toFixed(1)}s</div>
      `;

      block.addEventListener("click", () => {
        selectClip(clip.id, index);
        playSingleClipAtIndex(index);
      });

      // Drag and drop sur la timeline
      block.addEventListener("dragstart", (e) => {
        state.dragSrcIndex = index;
        e.dataTransfer.effectAllowed = "move";
      });
      block.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      });
      block.addEventListener("drop", (e) => {
        e.preventDefault();
        if (state.dragSrcIndex !== null && state.dragSrcIndex !== index) {
          moveClip(state.dragSrcIndex, index);
        }
      });

      timelineTrack.appendChild(block);
      cumulativeSec += duration;
    });
  }

  function formatTimecode(totalSeconds) {
    const min = Math.floor(totalSeconds / 60);
    const sec = (totalSeconds % 60).toFixed(1);
    return `${String(min).padStart(2, "0")}:${sec.padStart(4, "0")}`;
  }

  function selectClip(clipId, index) {
    state.selectedClipId = clipId;
    state.currentPreviewIndex = index;
    // Update visual selection in storyboard
    document.querySelectorAll(".storyboard-card").forEach((c) => {
      c.classList.toggle("is-selected", c.dataset.clipId === clipId);
    });
    // Update visual selection in timeline
    document.querySelectorAll(".timeline-clip-block").forEach((b) => {
      b.classList.toggle("is-selected", b.dataset.index === String(index));
    });
    renderInspector();
  }

  function filterDisplayTags(tags) {
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    if (!Array.isArray(tags)) return [];
    return tags.filter((t) => {
      if (isFr && t.startsWith("🎬 Scene ")) return false;
      if (!isFr && t.startsWith("🎬 Scène ")) return false;
      return true;
    });
  }

  function renderInspector() {
    const clips = getActiveClips();
    const clip = clips.find((c) => c.id === state.selectedClipId) || clips[state.currentPreviewIndex] || clips[0];
    if (!clip) {
      clipInspectorCard.classList.add("hidden");
      return;
    }

    clipInspectorCard.classList.remove("hidden");
    const idx = clips.indexOf(clip);
    inspectorPosition.textContent = `#${String(idx + 1).padStart(2, "0")}`;
    inspectorPromptInput.value = clip.title || clip.promptText || "";
    inspectorDuration.textContent = `${(Number(clip.duration) || 5).toFixed(1)}s`;
    inspectorResolution.textContent = clip.resolution || `${clip.width || 1280}×${clip.height || 720}`;
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    inspectorType.textContent = clip.isBoost
      ? (isFr ? `Haute résolution /boost ⚡${clip.model ? ` (${clip.model})` : ""}` : `High resolution /boost ⚡${clip.model ? ` (${clip.model})` : ""}`)
      : (clip.isLocalFile ? (isFr ? "Fichier local" : "Local file") : (isFr ? `Génération Flow${clip.model ? ` (${clip.model})` : ""}` : `Flow generation${clip.model ? ` (${clip.model})` : ""}`));

    // Tags IA
    if (typeof FlowSmartOrder !== "undefined") {
      const meta = clip._smartMeta || FlowSmartOrder.analyzeClip(clip, clips);
      inspectorTags.innerHTML = filterDisplayTags(meta.tags)
        .map((t) => `<span class="report-tag-pill">${escapeHtml(t)}</span>`)
        .join("");
    } else {
      inspectorTags.innerHTML = "";
    }
  }

  inspectorPromptInput.addEventListener("input", (e) => {
    const clips = getActiveClips();
    const clip = clips.find((c) => c.id === state.selectedClipId) || clips[state.currentPreviewIndex];
    if (clip) {
      clip.promptText = e.target.value;
      clip.title = e.target.value;
      saveState();
      // Mettre à jour la carte correspondante
      const cardInput = document.querySelector(`.storyboard-card[data-clip-id="${clip.id}"] .card-prompt-input`);
      if (cardInput) cardInput.value = clip.title;
    }
  });

  inspectorPromptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      inspectorPromptInput.blur();
    }
  });

  inspectorPromptInput.addEventListener("blur", (e) => {
    const clips = getActiveClips();
    const clip = clips.find((c) => c.id === state.selectedClipId) || clips[state.currentPreviewIndex];
    if (clip && !e.target.value.trim()) {
      const idx = clips.indexOf(clip);
      const fallback = `Clip #${String(idx + 1).padStart(2, "0")}`;
      e.target.value = fallback;
      clip.title = fallback;
      clip.promptText = fallback;
      saveState();
      const cardInput = document.querySelector(`.storyboard-card[data-clip-id="${clip.id}"] .card-prompt-input`);
      if (cardInput) cardInput.value = fallback;
    }
  });

  // ============================================================================
  // GESTION DES SCÈNES / GROUPES
  // ============================================================================
  groupSelect.addEventListener("change", () => {
    state.activeGroup = groupSelect.value;
    state.selectedClipId = null;
    state.currentPreviewIndex = 0;
    saveState();
    renderUI();
    syncBadgesWithTab();
  });

  newGroupBtn.addEventListener("click", async () => {
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    const count = Object.keys(state.groups).length + 1;
    const defaultName = isFr ? `Séquence ${count}` : `Sequence ${count}`;
    const msg = FlowI18n.t("prompt_new_scene");
    const title = FlowI18n.t("dialog_title_new_scene");
    const confirmText = FlowI18n.t("dialog_create");
    const cancelText = FlowI18n.t("dialog_cancel");
    const placeholder = FlowI18n.t("prompt_new_scene_placeholder");
    const name = (typeof FlowDialog !== "undefined" && FlowDialog.prompt)
      ? await FlowDialog.prompt(msg, defaultName, { title, confirmText, cancelText, placeholder, icon: "plus" })
      : prompt(msg, defaultName);
    if (!name || !name.trim()) return;
    const clean = name.trim();
    if (!state.groups[clean]) {
      state.groups[clean] = [];
    }
    state.activeGroup = clean;
    state.selectedClipId = null;
    state.currentPreviewIndex = 0;
    saveState();
    renderUI();
    syncBadgesWithTab();
  });

  renameGroupBtn.addEventListener("click", async () => {
    const current = state.activeGroup;
    const msg = FlowI18n.t("prompt_rename_scene");
    const title = FlowI18n.t("dialog_title_rename_scene");
    const confirmText = FlowI18n.t("dialog_rename");
    const cancelText = FlowI18n.t("dialog_cancel");
    const newName = (typeof FlowDialog !== "undefined" && FlowDialog.prompt)
      ? await FlowDialog.prompt(msg, current, { title, confirmText, cancelText, icon: "edit" })
      : prompt(msg, current);
    if (!newName || !newName.trim() || newName.trim() === current) return;
    const clean = newName.trim();
    state.groups[clean] = state.groups[current];
    delete state.groups[current];
    state.activeGroup = clean;
    saveState();
    renderUI();
  });

  deleteGroupBtn.addEventListener("click", async () => {
    const keys = Object.keys(state.groups);
    if (keys.length <= 1) {
      const msg = FlowI18n.t("cannot_delete_last");
      const title = FlowI18n.t("dialog_title_notice");
      if (typeof FlowDialog !== "undefined" && FlowDialog.alert) {
        await FlowDialog.alert(msg, { title, type: "warning" });
      } else {
        alert(msg);
      }
      return;
    }
    const msg = FlowI18n.t("confirm_delete_scene", { group: state.activeGroup });
    const title = FlowI18n.t("dialog_title_delete_scene");
    const confirmText = FlowI18n.t("dialog_delete_scene");
    const cancelText = FlowI18n.t("dialog_cancel");
    const ok = (typeof FlowDialog !== "undefined" && FlowDialog.confirm)
      ? await FlowDialog.confirm(msg, { title, confirmText, cancelText, danger: true, icon: "danger" })
      : confirm(msg);
    if (!ok) return;
    delete state.groups[state.activeGroup];
    state.activeGroup = Object.keys(state.groups)[0];
    saveState();
    renderUI();
    syncBadgesWithTab();
  });

  // ============================================================================
  // ORDONNANCEMENT INTELLIGENT IA
  // ============================================================================
  applyAiSortBtn.addEventListener("click", () => {
    const clips = getActiveClips();
    if (clips.length <= 1) return;

    const strategy = sortStrategySelect.value;
    if (typeof FlowSmartOrder !== "undefined") {
      const sorted = FlowSmartOrder.sortClips(clips, strategy);
      setActiveClips(sorted);
      renderAiReport(sorted);
    }
  });

  toggleAiReportBtn.addEventListener("click", () => {
    if (aiReportDrawer.classList.contains("hidden")) {
      const clips = getActiveClips();
      renderAiReport(clips);
      aiReportDrawer.classList.remove("hidden");
    } else {
      aiReportDrawer.classList.add("hidden");
    }
  });

  closeAiReportBtn.addEventListener("click", () => {
    aiReportDrawer.classList.add("hidden");
  });

  function renderAiReport(clips) {
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    if (typeof FlowSmartOrder === "undefined" || clips.length === 0) {
      aiReportContent.innerHTML = isFr ? "<p>Aucun clip à analyser.</p>" : "<p>No clips to analyze.</p>";
      return;
    }

    const exp = FlowSmartOrder.explainSequence(clips);
    aiConfidenceBadge.textContent = `${exp.avgConfidence}%`;

    let html = `
      <div class="report-summary-box">
        <strong>${exp.summary}</strong>
      </div>
      <div class="report-clips-list">
    `;

    exp.clips.forEach((c) => {
      const displayTags = filterDisplayTags(c.tags);
      html += `
        <div class="report-clip-item">
          <div class="report-clip-header">
            <span class="report-pos-badge">${c.positionText}</span>
            <span class="report-conf-badge">${isFr ? "Confiance :" : "Confidence:"} ${c.confidence}%</span>
          </div>
          <div class="report-clip-title" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</div>
          <div class="report-clip-desc">${escapeHtml(c.explanation)}</div>
          <div class="report-tags">
            ${displayTags.map((t) => `<span class="report-tag-pill">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    aiReportContent.innerHTML = html;
  }

  // ============================================================================
  // VUES ONGLETS (STORYBOARD / TIMELINE)
  // ============================================================================
  tabStoryboardBtn.addEventListener("click", () => {
    state.activeView = "storyboard";
    tabStoryboardBtn.classList.add("active");
    tabTimelineBtn.classList.remove("active");
    storyboardView.classList.remove("hidden");
    timelineView.classList.add("hidden");
    renderUI();
  });

  tabTimelineBtn.addEventListener("click", () => {
    state.activeView = "timeline";
    tabTimelineBtn.classList.add("active");
    tabStoryboardBtn.classList.remove("active");
    timelineView.classList.remove("hidden");
    storyboardView.classList.add("hidden");
    renderUI();
  });

  function moveClip(fromIndex, toIndex) {
    const clips = [...getActiveClips()];
    if (toIndex < 0 || toIndex >= clips.length) return;
    const [moved] = clips.splice(fromIndex, 1);
    clips.splice(toIndex, 0, moved);
    if (state.currentPreviewIndex === fromIndex) {
      state.currentPreviewIndex = toIndex;
    } else if (state.currentPreviewIndex > fromIndex && state.currentPreviewIndex <= toIndex) {
      state.currentPreviewIndex -= 1;
    } else if (state.currentPreviewIndex < fromIndex && state.currentPreviewIndex >= toIndex) {
      state.currentPreviewIndex += 1;
    }
    setActiveClips(clips);
  }

  function removeClip(index) {
    const clips = [...getActiveClips()];
    const [removed] = clips.splice(index, 1);
    if (removed && removed.cachedObjectUrl) {
      URL.revokeObjectURL(removed.cachedObjectUrl);
    }
    if (removed && state.selectedClipId === removed.id) {
      state.selectedClipId = null;
    }
    if (state.currentPreviewIndex >= clips.length) {
      state.currentPreviewIndex = Math.max(0, clips.length - 1);
    }
    setActiveClips(clips);
  }

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

  // ============================================================================
  // CAPTURE FLOW ET IMPORT FICHIERS
  // ============================================================================
  scanFlowBtn.addEventListener("click", () => {
    scanFlowBtn.disabled = true;
    scanFlowBtn.textContent = FlowI18n.t("scanning_clips");
    chrome.runtime.sendMessage({ type: "SCAN_ACTIVE_TAB", sortMode: "dom" }, async (res) => {
      scanFlowBtn.disabled = false;
      scanFlowBtn.innerHTML = `🔍 <span data-i18n="capture_flow_clips">${FlowI18n.t("capture_flow_clips")}</span>`;
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

      const mergedList = smartMergeClips(getActiveClips(), scanned);
      // Appliquer l'analyse d'ordre intelligent par défaut
      const sorted = typeof FlowSmartOrder !== "undefined"
        ? FlowSmartOrder.sortClips(mergedList, sortStrategySelect.value)
        : mergedList;

      setActiveClips(sorted);
    });
  });

  function smartMergeClips(currentList, scanned) {
    if (currentList.length === 0) return scanned;
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
          if (existing.cachedObjectUrl) {
            URL.revokeObjectURL(existing.cachedObjectUrl);
            result[existingIdx].cachedObjectUrl = null;
          }
        } else {
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

  // Import de fichiers locaux
  localFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    files.sort((a, b) => collator.compare(a.name, b.name));

    const currentClips = [...getActiveClips()];
    for (const file of files) {
      const objUrl = URL.createObjectURL(file);
      const meta = await probeLocalVideoMetadata(objUrl);
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
    const sorted = typeof FlowSmartOrder !== "undefined"
      ? FlowSmartOrder.sortClips(currentClips, sortStrategySelect.value)
      : currentClips;
    setActiveClips(sorted);
  });

  function probeLocalVideoMetadata(url) {
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

  // ============================================================================
  // GESTION DU LECTEUR VIDÉO ET LECTURE SÉQUENTIELLE
  // ============================================================================
  function updatePlayButtons(isPlaying) {
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    if (playSequenceBtn) playSequenceBtn.textContent = isPlaying ? "⏸ Pause" : (isFr ? "▶ Lire Tout" : "▶ Play All");
    if (timelinePlayBtn) timelinePlayBtn.textContent = isPlaying ? "⏸ Pause" : (isFr ? "▶ Lecture" : "▶ Play");
    if (playerStatusBadge) {
      if (isPlaying) {
        playerStatusBadge.textContent = isFr ? "EN COURS" : "PLAYING";
        playerStatusBadge.classList.remove("hidden");
      } else {
        playerStatusBadge.classList.add("hidden");
      }
    }
  }

  function waitForVideoReady(videoEl, timeoutMs = 7000) {
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

  function highlightActiveCard(activeIndex) {
    const allCards = document.querySelectorAll(".storyboard-card");
    allCards.forEach((c, i) => {
      if (i === activeIndex) {
        c.classList.add("is-playing-now");
        const ind = c.querySelector(".card-playing-indicator");
        if (ind) ind.style.display = "block";
        c.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } else {
        c.classList.remove("is-playing-now");
        const ind = c.querySelector(".card-playing-indicator");
        if (ind) ind.style.display = "none";
      }
    });
  }

  async function playSingleClipAtIndex(idx, seekTime = 0) {
    const clips = getActiveClips();
    const clip = clips[idx];
    if (!clip) return;
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    state.currentPreviewIndex = idx;
    state.isPlayingSequence = false;
    updatePlayButtons(false);
    highlightActiveCard(idx);
    updatePlayerUIForClip(clip, idx, clips.length);

    try {
      playerCaption.textContent = isFr ? `⏳ Chargement du clip #${idx + 1}...` : `⏳ Loading clip #${idx + 1}...`;
      const playable = await resolvePlayableUrl(clip);
      playerPlaceholder.classList.add("hidden");
      if (sequencePlayer.src !== playable) {
        sequencePlayer.src = playable;
        sequencePlayer.load();
        await waitForVideoReady(sequencePlayer);
      }
      const targetTime = Number.isFinite(seekTime) && seekTime >= 0 ? seekTime : 0;
      try {
        sequencePlayer.currentTime = targetTime;
      } catch (_) {}
      updatePlayerUIForClip(clip, idx, clips.length);
      try {
        await sequencePlayer.play();
      } catch (playErr) {
        if (playErr.name === "NotAllowedError") {
          sequencePlayer.muted = true;
          await sequencePlayer.play().catch(() => {});
        } else {
          throw playErr;
        }
      }
    } catch (err) {
      playerCaption.textContent = isFr
        ? `⚠️ Erreur de chargement du Clip #${idx + 1} : ${err.message || "erreur"}`
        : `⚠️ Error loading Clip #${idx + 1}: ${err.message || "error"}`;
    }
  }

  async function playPreviewLoop(idx, startOffset = 0) {
    const clips = getActiveClips();
    const isFr = typeof FlowI18n !== "undefined" && FlowI18n.getLanguage() === "fr";
    if (idx >= clips.length) {
      state.isPlayingSequence = false;
      updatePlayButtons(false);
      playerCaption.textContent = isFr ? "✅ Lecture de la séquence complète terminée." : "✅ Full sequence playback completed.";
      highlightActiveCard(-1);
      return;
    }
    state.currentPreviewIndex = idx;
    state.isPlayingSequence = true;
    updatePlayButtons(true);
    highlightActiveCard(idx);
    const clip = clips[idx];
    updatePlayerUIForClip(clip, idx, clips.length);

    try {
      playerCaption.textContent = isFr
        ? `⏳ Chargement du clip #${String(idx + 1).padStart(2, "0")}/${clips.length}...`
        : `⏳ Loading clip #${String(idx + 1).padStart(2, "0")}/${clips.length}...`;
      const playable = await resolvePlayableUrl(clip);
      if (!state.isPlayingSequence) return;
      if (!playable) throw new Error(isFr ? "Flux vidéo introuvable" : "Video stream not found");
      playerPlaceholder.classList.add("hidden");

      if (sequencePlayer.src !== playable) {
        sequencePlayer.src = playable;
        sequencePlayer.load();
        await waitForVideoReady(sequencePlayer);
        if (!state.isPlayingSequence) return;
      }
      const targetTime = (startOffset > 0 && Number.isFinite(sequencePlayer.duration) && startOffset < sequencePlayer.duration - 0.2) ? startOffset : 0;
      try {
        sequencePlayer.currentTime = targetTime;
      } catch (_) {}
      updatePlayerUIForClip(clip, idx, clips.length);
      try {
        await sequencePlayer.play();
      } catch (playErr) {
        if (playErr.name === "NotAllowedError") {
          sequencePlayer.muted = true;
          await sequencePlayer.play();
        } else {
          throw playErr;
        }
      }
    } catch (err) {
      console.warn("Erreur lecture séquence clip #" + (idx + 1), err);
      playerCaption.textContent = isFr
        ? `⚠️ Clip #${idx + 1} indisponible (${err.message || "erreur"}). Passage au suivant...`
        : `⚠️ Clip #${idx + 1} unavailable (${err.message || "error"}). Moving to next...`;
      if (state.isPlayingSequence) {
        setTimeout(() => {
          if (state.isPlayingSequence) {
            playPreviewLoop(idx + 1, 0);
          }
        }, 1200);
      }
    }
  }

  playSequenceBtn.addEventListener("click", async () => {
    const clips = getActiveClips();
    if (clips.length === 0) return;
    if (state.isPlayingSequence && !sequencePlayer.paused) {
      sequencePlayer.pause();
      state.isPlayingSequence = false;
      updatePlayButtons(false);
    } else {
      let startIndex = state.currentPreviewIndex || 0;
      let startOffset = sequencePlayer.currentTime || 0;
      // Si la vidéo est terminée ou à la fin, repartir du premier clip #01
      if (sequencePlayer.ended || (Number.isFinite(sequencePlayer.duration) && startOffset >= sequencePlayer.duration - 0.3) || startIndex >= clips.length) {
        startIndex = 0;
        startOffset = 0;
      }
      state.isPlayingSequence = true;
      updatePlayButtons(true);
      await playPreviewLoop(startIndex, startOffset);
    }
  });

  if (restartSequenceBtn) {
    restartSequenceBtn.addEventListener("click", async () => {
      const clips = getActiveClips();
      if (clips.length === 0) return;
      sequencePlayer.pause();
      state.currentPreviewIndex = 0;
      if (clips[0]) selectClip(clips[0].id, 0);
      state.isPlayingSequence = true;
      updatePlayButtons(true);
      await playPreviewLoop(0, 0);
    });
  }

  timelinePlayBtn.addEventListener("click", () => {
    playSequenceBtn.click();
  });

  timelineResetBtn.addEventListener("click", () => {
    sequencePlayer.pause();
    state.isPlayingSequence = false;
    updatePlayButtons(false);
    highlightActiveCard(-1);
    state.currentPreviewIndex = 0;
    const clips = getActiveClips();
    if (clips[0]) selectClip(clips[0].id, 0);
    playSingleClipAtIndex(0, 0);
    timelinePlayhead.style.left = "0%";
    timelineCurrentTime.textContent = "00:00.0";
  });

  prevClipBtn.addEventListener("click", () => {
    const clips = getActiveClips();
    if (state.currentPreviewIndex > 0) {
      state.currentPreviewIndex -= 1;
      const targetClip = clips[state.currentPreviewIndex];
      if (targetClip) selectClip(targetClip.id, state.currentPreviewIndex);
      if (state.isPlayingSequence) {
        playPreviewLoop(state.currentPreviewIndex, 0);
      } else {
        playSingleClipAtIndex(state.currentPreviewIndex, 0);
      }
    }
  });

  nextClipBtn.addEventListener("click", () => {
    const clips = getActiveClips();
    if (state.currentPreviewIndex + 1 < clips.length) {
      state.currentPreviewIndex += 1;
      const targetClip = clips[state.currentPreviewIndex];
      if (targetClip) selectClip(targetClip.id, state.currentPreviewIndex);
      if (state.isPlayingSequence) {
        playPreviewLoop(state.currentPreviewIndex, 0);
      } else {
        playSingleClipAtIndex(state.currentPreviewIndex, 0);
      }
    }
  });

  sequencePlayer.addEventListener("ended", async () => {
    if (state.isPlayingSequence) {
      await playPreviewLoop(state.currentPreviewIndex + 1, 0);
    } else {
      updatePlayButtons(false);
    }
  });

  sequencePlayer.addEventListener("error", () => {
    if (state.isPlayingSequence) {
      const idx = state.currentPreviewIndex;
      playerCaption.textContent = FlowI18n.t("playback_error_skip", { num: idx + 1 });
      setTimeout(() => {
        if (state.isPlayingSequence) {
          playPreviewLoop(idx + 1, 0);
        }
      }, 1000);
    }
  });

  sequencePlayer.addEventListener("pause", () => {
    if (!state.isPlayingSequence) {
      updatePlayButtons(false);
    }
  });

  sequencePlayer.addEventListener("timeupdate", () => {
    const clips = getActiveClips();
    if (clips.length === 0) return;
    const clip = clips[state.currentPreviewIndex];
    if (!clip) return;

    // Calcul du temps cumulé
    let pastSec = 0;
    for (let i = 0; i < state.currentPreviewIndex; i++) {
      pastSec += Number(clips[i].duration) || 5;
    }
    const currentSec = pastSec + (sequencePlayer.currentTime || 0);
    timelineCurrentTime.textContent = formatTimecode(currentSec);

    const totalSec = clips.reduce((acc, c) => acc + (Number(c.duration) || 5), 0);
    const pct = Math.min(100, Math.max(0, (currentSec / (totalSec || 1)) * 100));
    timelinePlayhead.style.left = `${pct}%`;
  });

  // Navigation interactive au clic sur la piste ou la règle temporelle
  function handleTimelineScrub(e) {
    const clips = getActiveClips();
    if (clips.length === 0) return;
    const trackEl = timelineTrack || timelineRuler;
    const rect = trackEl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = clickX / rect.width;
    const totalSec = clips.reduce((acc, c) => acc + (Number(c.duration) || 5), 0);
    const targetSec = pct * totalSec;

    let accumulated = 0;
    for (let i = 0; i < clips.length; i++) {
      const dur = Number(clips[i].duration) || 5;
      if (targetSec <= accumulated + dur || i === clips.length - 1) {
        const offsetInClip = Math.max(0, targetSec - accumulated);
        selectClip(clips[i].id, i);
        playSingleClipAtIndex(i, offsetInClip);
        timelinePlayhead.style.left = `${pct * 100}%`;
        timelineCurrentTime.textContent = formatTimecode(targetSec);
        break;
      }
      accumulated += dur;
    }
  }

  if (timelineRuler) {
    timelineRuler.addEventListener("click", handleTimelineScrub);
  }
  if (timelineTrack) {
    timelineTrack.addEventListener("click", (e) => {
      if (e.target === timelineTrack || e.target.classList.contains("timeline-track-header") || e.target.closest(".timeline-playhead")) {
        handleTimelineScrub(e);
      }
    });
  }

  // Keyboard navigation shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.matches("input, textarea, select, button") || e.target.closest("button") || e.target.isContentEditable)) return;

    if (e.code === "Space") {
      e.preventDefault();
      playSequenceBtn?.click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevClipBtn?.click();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextClipBtn?.click();
    } else if (e.key === "Home") {
      e.preventDefault();
      restartSequenceBtn?.click();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const clips = getActiveClips();
      let targetIdx = -1;
      if (state.selectedClipId) {
        targetIdx = clips.findIndex((c) => c.id === state.selectedClipId);
      }
      if (targetIdx === -1 && state.currentPreviewIndex >= 0 && state.currentPreviewIndex < clips.length) {
        targetIdx = state.currentPreviewIndex;
      }
      if (targetIdx !== -1) {
        e.preventDefault();
        removeClip(targetIdx);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      state.selectedClipId = null;
      document.querySelectorAll(".storyboard-card").forEach((c) => c.classList.remove("is-selected"));
      document.querySelectorAll(".timeline-clip-block").forEach((b) => b.classList.remove("is-selected"));
      if (aiReportDrawer && !aiReportDrawer.classList.contains("hidden")) {
        aiReportDrawer.classList.add("hidden");
      }
      renderInspector();
    }
  });

  function updatePlayerUIForClip(clip, idx, total) {
    const numStr = String(idx + 1).padStart(2, "0");
    const boostTag = clip.isBoost ? " ⚡ [Boost 4K]" : "";
    playerCurrentTag.textContent = `#${numStr}`;
    const cleanLabel = typeof FlowSmartOrder !== "undefined" && FlowSmartOrder.cleanTitle
      ? FlowSmartOrder.cleanTitle(clip.title || clip.promptText || clip.fileName, idx + 1)
      : (clip.title || clip.promptText || `Clip #${numStr}`);
    playerCaption.textContent = `Clip #${numStr}/${total}${boostTag} : ${cleanLabel}`;
  }

  // ============================================================================
  // PROTOCOLE DE TÉLÉCHARGEMENT SÉCURISÉ & BLOCS (ANTI-CORS & IPC 32Mo)
  // ============================================================================
  const pendingThumbFetches = new Set();
  async function loadRemoteThumbnailSafely(clip, placeholderEl) {
    if (!clip || !clip.thumbnail || pendingThumbFetches.has(clip.id)) return;
    if (clip.thumbnail.startsWith("data:") || clip.thumbnail.startsWith("blob:")) return;
    pendingThumbFetches.add(clip.id);
    try {
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
          img.className = "card-thumb-img";
          img.src = safeThumbUrl;
          img.alt = clip.promptText || "Clip";
          placeholderEl.replaceWith(img);
        }
      }
    } catch (_) {
    } finally {
      pendingThumbFetches.delete(clip.id);
    }
  }

  async function resolveTabForClip(clip) {
    const isEligible = (t) => t && t.id && t.url && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://");

    if (clip && clip.tabId) {
      try {
        const tab = await chrome.tabs.get(clip.tabId);
        if (isEligible(tab)) return tab.id;
      } catch (_) {}
    }

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

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (isEligible(activeTab)) return activeTab.id;
    } catch (_) {}

    try {
      const allTabs = await chrome.tabs.query({});
      const flowNamed = allTabs.find((t) => isEligible(t) && (t.url?.includes("flow") || t.title?.toLowerCase().includes("flow")));
      if (flowNamed) return flowNamed.id;
    } catch (_) {}

    return null;
  }

  async function fetchVideoFromTabInChunks(clip) {
    let tabId = await resolveTabForClip(clip);
    if (!tabId) return null;
    const frameId = typeof clip.frameId === "number" ? clip.frameId : 0;

    function sendToTab(targetTabId, msg) {
      return new Promise((resolve) => {
        const opts = frameId > 0 ? { frameId } : {};
        chrome.tabs.sendMessage(targetTabId, msg, opts, (res) => {
          if (chrome.runtime.lastError) {
            if (frameId > 0) {
              chrome.tabs.sendMessage(targetTabId, msg, {}, (retryRes) => {
                resolve(retryRes || { ok: false });
              });
            } else {
              resolve({ ok: false });
            }
          } else {
            resolve(res || { ok: false });
          }
        });
      });
    }

    let initRes = await sendToTab(tabId, {
      type: "START_CHUNKED_DOWNLOAD",
      videoUrl: clip.videoUrl,
      clipId: clip.id,
      generationId: clip.generationId || ""
    });

    // Re-résolution si tabId expiré ou rechargé
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

    if (!initRes || !initRes.ok) return null;
    const { downloadId, totalChunks, mimeType } = initRes;
    const chunkBuffers = [];

    for (let c = 0; c < totalChunks; c++) {
      const chunkRes = await sendToTab(tabId, {
        type: "GET_VIDEO_CHUNK",
        downloadId,
        chunkIndex: c
      });
      if (!chunkRes || !chunkRes.ok || !chunkRes.data) return null;
      const binary = atob(chunkRes.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      chunkBuffers.push(bytes);
    }

    await sendToTab(tabId, { type: "FINISH_CHUNKED_DOWNLOAD", downloadId }).catch(() => {});
    return new Blob(chunkBuffers, { type: mimeType || "video/mp4" });
  }

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

    if (isGoogleFlowUrl || url.startsWith("blob:")) {
      try {
        const blob = await fetchVideoFromTabInChunks(clip);
        if (blob && blob.size > 0) {
          clip.cachedObjectUrl = URL.createObjectURL(blob);
          return clip.cachedObjectUrl;
        }
      } catch (_) {}
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      try {
        let resp = await fetch(url, { credentials: "include" }).catch(() => null);
        if (!resp || !resp.ok) resp = await fetch(url).catch(() => null);
        if (resp && resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 0) {
            clip.cachedObjectUrl = URL.createObjectURL(blob);
            return clip.cachedObjectUrl;
          }
        }
      } catch (_) {}
    }

    try {
      const bgBlob = await fetchVideoFromBgInChunks(url);
      if (bgBlob && bgBlob.size > 0) {
        clip.cachedObjectUrl = URL.createObjectURL(bgBlob);
        return clip.cachedObjectUrl;
      }
    } catch (_) {}

    if (isGoogleFlowUrl) {
      throw new Error(FlowI18n.t("err_stream_protected"));
    }
    return clip.videoUrl;
  }

  // ============================================================================
  // MOTEUR D'ASSEMBLAGE VIDÉO PLEIN ÉCRAN
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
    let audioCtx = null;
    try {
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

      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioDest = audioCtx.createMediaStreamDestination();

      const canvasStream = mergerCanvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);

      const mimeType = pickSupportedRecorderMime();
      const isMp4 = mimeType.startsWith("video/mp4");
      const chosenBitrate = parseInt(bitrateSelect.value, 10) || 12000000;
      const recorderOptions = mimeType
        ? { mimeType, videoBitsPerSecond: chosenBitrate }
        : { videoBitsPerSecond: chosenBitrate };

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

      for (let i = 0; i < preparedVideos.length; i++) {
        const { videoEl } = preparedVideos[i];
        const numStr = String(i + 1).padStart(2, "0");

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

      const finalBlob = new Blob(recordedChunks, { type: mimeType || "video/mp4" });
      const finalUrl = URL.createObjectURL(finalBlob);
      const ext = isMp4 ? "mp4" : "webm";
      const safeGroupName = state.activeGroup.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const filename = `${safeGroupName}_FlowStudio_${orderedClips.length}clips.${ext}`;

      function triggerDirectDownload() {
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      chrome.runtime.sendMessage(
        { type: "DOWNLOAD_MERGED_VIDEO", url: finalUrl, filename },
        (res) => {
          if (chrome.runtime.lastError || (res && !res.ok)) {
            triggerDirectDownload();
          }
          updateProgress(
            FlowI18n.t("video_assembled_success", { total: orderedClips.length }),
            100
          );
          setTimeout(() => {
            progressContainer.classList.add("hidden");
          }, 4000);
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
      if (typeof audioCtx !== "undefined" && audioCtx && audioCtx.state !== "closed") {
        audioCtx.close().catch(() => {});
      }
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Écoute des événements de capture et de mise à jour provenant des onglets Flow
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
        if (message.width) target.width = message.width;
        if (message.height) target.height = message.height;
        if (changed) renderUI();
      }
    }
  });

  // Fermeture automatique du panneau latéral (Side Panel) dès l'ouverture du Studio Web
  function closeSidePanelIfOpen() {
    if (typeof chrome === "undefined") return;

    // 1. Diffuser l'instruction CLOSE_SIDEPANEL à toute vue active (side panel)
    if (chrome.runtime && typeof chrome.runtime.sendMessage === "function") {
      try {
        chrome.runtime.sendMessage({ type: "CLOSE_SIDEPANEL" }, () => {
          void chrome.runtime.lastError;
        });
      } catch (_) {}
    }

    // 2. Fermer directement le panneau latéral via chrome.sidePanel.close si supporté
    if (chrome.sidePanel && typeof chrome.sidePanel.close === "function") {
      if (chrome.windows && typeof chrome.windows.getCurrent === "function") {
        try {
          chrome.windows.getCurrent((currentWin) => {
            const windowId = currentWin ? currentWin.id : undefined;
            if (typeof windowId === "number") {
              chrome.sidePanel?.close?.({ windowId })?.catch?.(() => {});
            } else if (chrome.windows && typeof chrome.windows.getLastFocused === "function") {
              chrome.windows.getLastFocused((lastWin) => {
                if (lastWin && typeof lastWin.id === "number") {
                  chrome.sidePanel?.close?.({ windowId: lastWin.id })?.catch?.(() => {});
                }
              });
            }
          });
        } catch (_) {
          if (chrome.windows && typeof chrome.windows.getLastFocused === "function") {
            try {
              chrome.windows.getLastFocused((lastWin) => {
                if (lastWin && typeof lastWin.id === "number") {
                  chrome.sidePanel?.close?.({ windowId: lastWin.id })?.catch?.(() => {});
                }
              });
            } catch (_) {}
          }
        }
      } else if (chrome.windows && typeof chrome.windows.getLastFocused === "function") {
        try {
          chrome.windows.getLastFocused((lastWin) => {
            if (lastWin && typeof lastWin.id === "number") {
              chrome.sidePanel?.close?.({ windowId: lastWin.id })?.catch?.(() => {});
            }
          });
        } catch (_) {}
      }
    }
  }

  // Initialisation au chargement
  closeSidePanelIfOpen();
  loadState();
})();
