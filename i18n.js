// Flow Video Merger — Internationalization (i18n) Engine
// Bilingual support: English (default) & French

(function (global) {
  "use strict";

  const TRANSLATIONS = {
    en: {
      app_title: "Flow Video Merger",
      app_subtitle: "Clip Sequencer & Video Assembler",
      active_scene_label: "Active Sequence:",
      group_select_title: "Active Sequence / Scene",
      new_scene_btn: "+ Scene",
      new_scene_title: "Create a new sequence / scene",
      rename_scene_title: "Rename active scene",
      delete_scene_title: "Delete active scene",
      open_studio_title: "Open full-screen web interface with Storyboard & Timeline",
      open_studio_btn: "Web Studio Storyboard & Timeline",
      open_studio_badge: "Fullscreen ↗",
      capture_flow_clips: "Capture Flow clips",
      capture_flow_title: "Scan and automatically capture videos from Google Flow tab",
      import_files_btn: "+ Files",
      import_files_title: "Import .mp4 / .webm video clips from your computer",
      sort_label: "Order:",
      sort_title: "Reapply sort",
      sort_btn: "Sort",
      // Sort options
      sort_smart: "Smart Order (Narrative & Chrono)",
      sort_explicit: "Scene Numbering (Scene 1, 2...)",
      sort_narrative: "Narrative Arc (Intro → Climax → End)",
      sort_temporal: "Time Progression (Morning → Night)",
      sort_dom: "Flow Canvas Order (Top → Bottom)",
      sort_chronological: "Chronological Order (1 → N)",
      sort_natural: "Natural Name Sort (01, 02...)",
      sort_reverse: "Reverse Order",
      // Sequence section
      clips_in_sequence: "Clips in Sequence",
      clear_btn: "Clear",
      clear_btn_title: "Clear current sequence",
      hint_text: "Drag and drop to rearrange order <strong>#01 → #N</strong>. Supports 1080p and <strong>/boost 4K</strong>.",
      // Empty states
      empty_title: "No clips in \"{group}\"",
      empty_desc_sidepanel: "Capture clips from Google Flow or import video files to build your sequence.",
      empty_step_1: "Click <strong>Capture Flow clips</strong> above",
      empty_step_2: "Or click <strong>+ Sequence</strong> directly in Flow",
      empty_step_3: "Supports <strong>1080p</strong> and <strong>/boost ⚡ 4K</strong>",
      empty_desc_studio: "Click <strong>🔍 Capture Flow clips</strong> to import from Google Flow, or add files from your computer.",
      // Clip card
      drag_grip_title: "Drag to reorder",
      pos_badge_title: "Position #{num} (click to change)",
      pos_select_title: "Change position directly",
      thumb_preview_title: "Click to preview",
      clip_title_placeholder: "Clip title...",
      clip_title_title: "Click to edit title",
      boost_fidelity_title: "4K /boost fidelity",
      move_up_title: "Move up",
      move_down_title: "Move down",
      remove_clip_title: "Remove from sequence",
      // Preview
      continuous_preview: "Continuous Preview",
      close_preview_title: "Close preview",
      now_playing: "Playing clip #{num} ({title})...",
      preview_btn: "Preview",
      // Export
      output_format: "Output Format",
      format_auto: "Auto (Source)",
      format_4k_land: "4K Landscape (3840×2160)",
      format_1080p_land: "1080p Landscape (1920×1080)",
      format_720p_land: "720p Landscape (1280×720)",
      format_4k_vert: "4K Vertical Shorts (2160×3840)",
      format_1080p_vert: "1080p Vertical Reels (1080×1920)",
      transition_label: "Transition",
      trans_cut: "Direct cut",
      trans_dissolve_soft: "Soft dissolve (0.25s)",
      trans_dissolve_cine: "Cinematic dissolve (0.5s)",
      merge_btn: "Merge into 1 Video",
      // Progress & notifications
      prep_clips: "Preparing clips...",
      downloading_clip: "Downloading clip {current}/{total}...",
      merging_percent: "Merging video ({percent}%)...",
      loading_clip_progress: "Loading clip #{current}/{total}{boost}...",
      merging_clip_progress: "Assembling clip #{current}/{total} in order...",
      finalizing_single_file: "Finalizing and encoding single file...",
      video_assembled_success: "✅ Single video assembled ({total} clips)!",
      finalizing_merge: "Finalizing merged video...",
      export_complete: "Export complete!",
      no_videos_found: "No videos detected on the active page. Generate or view your clips in Google Flow then try again.",
      open_flow_prompt: "Open a project on Google Flow (flow.google or labs.google) to capture videos.",
      merge_error: "Error during video merge: ",
      prompt_new_scene: "Name of the new scene:",
      prompt_rename_scene: "New name for the sequence:",
      confirm_delete_scene: "Permanently delete sequence \"{group}\"?",
      confirm_clear_scene: "Clear all clips from sequence \"{group}\"?",
      cannot_delete_last: "Cannot delete the last remaining sequence.",
      default_group_name: "Sequence 1",
      new_group_prefix: "Sequence ",
      // Studio specific
      studio_brand_badge: "WEB INTERFACE & AI",
      studio_clips_stat: "Clips",
      studio_duration_stat: "Total Duration",
      studio_ai_title: "Smart Ordering Engine",
      studio_ai_subtitle: "Narrative, chronological, temporal & spatial analysis",
      studio_strategy_label: "Ordering strategy:",
      sort_studio_smart: "🧠 Hybrid AI (Scenes, Narrative Arc & Chronology) [Recommended]",
      sort_studio_explicit: "🎬 Scene Numbering (Scene 1, Scene 2, Shot 3...)",
      sort_studio_narrative: "📖 Narrative Arc (Exposition → Journey → Climax → Resolution)",
      sort_studio_temporal: "⏳ Time Progression (Dawn → Morning → Sunset → Night)",
      sort_studio_spatial: "📍 Flow Canvas Layout (Row by Row, Left → Right)",
      sort_studio_chronological: "🕒 Google Flow Generation Chronology (1 → N)",
      sort_studio_natural: "🔤 Natural Sort by Name / Prompt (01, 02, 03...)",
      sort_studio_reverse: "🔄 Reverse Order",
      studio_reorder_btn: "✨ Reorder with AI",
      studio_reorder_title: "Analyze sequence and reorder intelligently",
      studio_ai_explanations_btn: "💡 AI Explanations ({badge})",
      studio_ai_explanations_title: "Show detailed explanation of AI ordering",
      studio_ai_report_title: "Smart Ordering Engine Analysis Report",
      studio_close_drawer_title: "Close panel",
      studio_empty_report: "Click <strong>✨ Reorder with AI</strong> to generate narrative and temporal analysis for your clips.",
      studio_tab_storyboard: "📋 Sequential Storyboard",
      studio_tab_timeline: "🎞️ Editing Track / Timeline",
      studio_clear_seq: "🗑️ Clear Sequence",
      studio_clear_seq_title: "Clear all clips from this sequence",
      studio_timeline_track_header: "Video Track #01 → #N",
      studio_timeline_play: "▶ Play",
      studio_timeline_pause: "⏸ Pause",
      studio_timeline_reset: "⏮ Start",
      studio_player_title: "Sequence Preview",
      studio_player_status_playing: "PLAYING",
      studio_player_placeholder: "Click on a clip or \"Play All\"",
      studio_player_ready: "Ready for continuous playback.",
      studio_player_prev: "⏮ Previous",
      studio_player_play_all: "▶ Play All",
      studio_player_pause: "⏸ Pause",
      studio_player_next: "Next ⏭",
      studio_player_restart_title: "Restart from first clip (#01)",
      studio_export_title: "Assembly & Export",
      studio_format_label: "Video Format and Resolution:",
      studio_format_auto: "Auto (Same as Clip #01)",
      studio_format_4k_land: "4K Ultra HD Landscape (3840×2160)",
      studio_format_1080p_land: "1080p Full HD Landscape (1920×1080)",
      studio_format_720p_land: "720p HD Landscape (1280×720)",
      studio_format_4k_vert: "4K Vertical Shorts/Reels (2160×3840)",
      studio_format_1080p_vert: "1080p Vertical Shorts/Reels (1080×1920)",
      studio_trans_label: "Transition between clips:",
      studio_trans_cut: "Direct cut (0s — Hard cut)",
      studio_trans_soft: "Soft dissolve (0.25s)",
      studio_trans_cine: "Cinematic dissolve (0.5s)",
      studio_bitrate_label: "Encoding Bitrate (Quality):",
      studio_bitrate_20m: "Very high quality (20 Mbps — Recommended for 4K)",
      studio_bitrate_12m: "High quality (12 Mbps — Ideal for 1080p)",
      studio_bitrate_6m: "Balanced (6 Mbps — Compact file)",
      studio_merge_btn: "🎬 Merge into 1 Final Video",
      studio_inspector_title: "Clip Inspector",
      studio_inspector_prompt_label: "Prompt / Description:",
      studio_inspector_placeholder: "Clip description...",
      studio_inspector_duration: "Duration:",
      studio_inspector_resolution: "Resolution:",
      studio_inspector_type: "Type:",
      // Badge text in content.js
      badge_add: "+ Sequence",
      badge_selected: "#{num} ✓ Sequence",
      badge_boost_title: "High-resolution Boosted clip (/boost) — Click to add/remove from sequence",
      badge_standard_title: "Click to add/remove from ordered Flow Video Merger sequence",
      badge_scene_prefix: "Flow Scene #{scene} — ",
      new_scene_label: "Scene",
      studio_ai_explanations_btn_text: "AI Explanations",
      scanning_clips: "⏳ Scanning...",
      playback_error_skip: "⚠️ Playback error on clip #{num}. Skipping to next...",
      clip_unavailable_skip: "⚠️ Clip #{num} unavailable. Advancing to next...",
      sequence_completed: "✅ Full sequence playback completed.",
      err_timeout_clip: "Timed out while loading one of the video clips.",
      err_decode_clip: "Unable to decode one of the video clips (access denied or unsupported format).",
      err_playback_assembly: "Playback error during clip assembly.",
      err_stream_protected: "Unable to retrieve protected Google Flow video stream (/asb/). Ensure Google Flow tab is open and active.",
      err_video_stream_not_found: "Video stream not found",
      err_invalid_video_url: "Invalid video URL.",
      err_download_expired: "Download not found or expired.",
      err_chunk_out_of_bounds: "Chunk index out of bounds.",
      context_menu_open_studio: "🎬 Open Flow Video Studio (Fullscreen Web)"
    },
    fr: {
      app_title: "Flow Video Merger",
      app_subtitle: "Séquenceur & Assemblage de clips",
      active_scene_label: "Séquence active :",
      group_select_title: "Groupe / Scène actif",
      new_scene_btn: "+ Scène",
      new_scene_title: "Créer un nouveau groupe / scène",
      rename_scene_title: "Renommer la scène active",
      delete_scene_title: "Supprimer la scène active",
      open_studio_title: "Ouvrir l'interface web complète en plein écran avec Storyboard & Timeline",
      open_studio_btn: "Studio Web Storyboard & Timeline",
      open_studio_badge: "Plein Écran ↗",
      capture_flow_clips: "Capturer les clips Flow",
      capture_flow_title: "Scanner et capturer automatiquement les vidéos de l'onglet Google Flow",
      import_files_btn: "+ Fichiers",
      import_files_title: "Importer des petits clips .mp4/.webm depuis votre ordinateur",
      sort_label: "Ordre :",
      sort_title: "Réappliquer le tri",
      sort_btn: "Trier",
      // Sort options
      sort_smart: "Ordre intelligent (Narratif & Chrono)",
      sort_explicit: "Numérotation des Scènes (Scene 1, 2...)",
      sort_narrative: "Arc Narratif (Intro → Climax → Fin)",
      sort_temporal: "Progression Temporelle (Matin → Soir)",
      sort_dom: "Ordre Flow Canvas (Haut → Bas)",
      sort_chronological: "Ordre chronologique (1 → N)",
      sort_natural: "Tri naturel par nom (01, 02...)",
      sort_reverse: "Ordre inversé",
      // Sequence section
      clips_in_sequence: "Clips dans la séquence",
      clear_btn: "Vider",
      clear_btn_title: "Vider la séquence actuelle",
      hint_text: "Glissez-déposez pour réorganiser l'ordre <strong>#01 → #N</strong>. Supporte 1080p et <strong>/boost 4K</strong>.",
      // Empty states
      empty_title: "Aucun clip dans \"{group}\"",
      empty_desc_sidepanel: "Capturez vos clips depuis Google Flow ou importez des fichiers vidéo pour créer votre séquence d'assemblage.",
      empty_step_1: "Cliquez sur <strong>Capturer les clips Flow</strong> ci-dessus",
      empty_step_2: "Ou cliquez sur <strong>+ Séquence</strong> directement sur Flow",
      empty_step_3: "Prend en charge <strong>1080p</strong> et <strong>/boost ⚡ 4K</strong>",
      empty_desc_studio: "Cliquez sur <strong>🔍 Capturer les clips Flow</strong> pour importer depuis Google Flow, ou ajoutez des fichiers depuis votre ordinateur.",
      // Clip card
      drag_grip_title: "Glisser pour réorganiser",
      pos_badge_title: "Position #{num} (cliquer pour changer)",
      pos_select_title: "Changer la position directement",
      thumb_preview_title: "Cliquer pour prévisualiser",
      clip_title_placeholder: "Titre du clip...",
      clip_title_title: "Cliquer pour modifier le titre",
      boost_fidelity_title: "Fidélité 4K /boost",
      move_up_title: "Monter d'un cran",
      move_down_title: "Descendre d'un cran",
      remove_clip_title: "Retirer de la séquence",
      // Preview
      continuous_preview: "Prévisualisation continue",
      close_preview_title: "Fermer la prévisualisation",
      now_playing: "Lecture du clip #{num} ({title})...",
      preview_btn: "Prévisualiser",
      // Export
      output_format: "Format de sortie",
      format_auto: "Auto (Source)",
      format_4k_land: "4K Paysage (3840×2160)",
      format_1080p_land: "1080p Paysage (1920×1080)",
      format_720p_land: "720p Paysage (1280×720)",
      format_4k_vert: "4K Vertical Shorts (2160×3840)",
      format_1080p_vert: "1080p Vertical Reels (1080×1920)",
      transition_label: "Transition",
      trans_cut: "Coupure franche",
      trans_dissolve_soft: "Fondu doux (0.25s)",
      trans_dissolve_cine: "Fondu cinématique (0.5s)",
      merge_btn: "Assembler en 1 vidéo",
      // Progress & notifications
      prep_clips: "Préparation des clips...",
      downloading_clip: "Téléchargement du clip {current}/{total}...",
      merging_percent: "Assemblage de la vidéo ({percent}%)...",
      loading_clip_progress: "Chargement du clip #{current}/{total}{boost}...",
      merging_clip_progress: "Assemblage du clip #{current}/{total} dans l'ordre...",
      finalizing_single_file: "Finalisation et encodage du fichier unique...",
      video_assembled_success: "✅ Vidéo unique assemblée ({total} clips) !",
      finalizing_merge: "Finalisation de la vidéo assemblée...",
      export_complete: "Exportation terminée !",
      no_videos_found: "Aucune vidéo détectée sur la page actuelle. Générez ou affichez vos clips dans Google Flow puis réessayez.",
      open_flow_prompt: "Ouvrez un projet sur Google Flow (flow.google ou labs.google) pour capturer les vidéos.",
      merge_error: "Erreur lors de l'assemblage vidéo : ",
      prompt_new_scene: "Nom de la nouvelle séquence :",
      prompt_rename_scene: "Nouveau nom pour la séquence :",
      confirm_delete_scene: "Supprimer définitivement la séquence \"{group}\" ?",
      confirm_clear_scene: "Vider tous les clips de la séquence \"{group}\" ?",
      cannot_delete_last: "Impossible de supprimer la dernière séquence restante.",
      default_group_name: "Séquence 1",
      new_group_prefix: "Séquence ",
      // Studio specific
      studio_brand_badge: "WEB INTERFACE & IA",
      studio_clips_stat: "Clips",
      studio_duration_stat: "Durée totale",
      studio_ai_title: "Moteur d'Ordre Intelligent",
      studio_ai_subtitle: "Analyse narrative, chronologique, temporelle & spatiale",
      studio_strategy_label: "Stratégie d'ordonnancement :",
      sort_studio_smart: "🧠 Hybride IA (Scènes, Arc narratif & Chronologie) [Recommandé]",
      sort_studio_explicit: "🎬 Numérotation des Scènes (Scene 1, Scene 2, Plan 3...)",
      sort_studio_narrative: "📖 Arc Narratif (Exposition → Voyage → Climax → Dénouement)",
      sort_studio_temporal: "⏳ Progression Temporelle (Aube → Matin → Coucher de soleil → Nuit)",
      sort_studio_spatial: "📍 Disposition Spatiale Canvas Flow (Ligne par Ligne, G → D)",
      sort_studio_chronological: "🕒 Chronologique de génération Google Flow (1 → N)",
      sort_studio_natural: "🔤 Tri naturel par nom / prompt (01, 02, 03...)",
      sort_studio_reverse: "🔄 Ordre inversé",
      studio_reorder_btn: "✨ Réordonner avec l'IA",
      studio_reorder_title: "Analyser la séquence et réordonner intelligemment",
      studio_ai_explanations_btn: "💡 Explications IA ({badge})",
      studio_ai_explanations_title: "Afficher l'explication détaillée de l'ordre IA",
      studio_ai_report_title: "Rapport d'analyse du Moteur d'Ordre Intelligent",
      studio_close_drawer_title: "Fermer le volet",
      studio_empty_report: "Cliquez sur <strong>✨ Réordonner avec l'IA</strong> pour générer l'analyse narrative et temporelle de vos clips.",
      studio_tab_storyboard: "📋 Storyboard Séquentiel",
      studio_tab_timeline: "🎞️ Piste de Montage / Timeline",
      studio_clear_seq: "🗑️ Vider la séquence",
      studio_clear_seq_title: "Vider tous les clips de cette séquence",
      studio_timeline_track_header: "Piste Vidéo #01 → #N",
      studio_timeline_play: "▶ Lecture",
      studio_timeline_pause: "⏸ Pause",
      studio_timeline_reset: "⏮ Début",
      studio_player_title: "Prévisualisation Séquence",
      studio_player_status_playing: "EN COURS",
      studio_player_placeholder: "Cliquez sur un clip ou sur \"Lire Tout\"",
      studio_player_ready: "Prêt pour la lecture continue.",
      studio_player_prev: "⏮ Précédent",
      studio_player_play_all: "▶ Lire Tout",
      studio_player_pause: "⏸ Pause",
      studio_player_next: "Suivant ⏭",
      studio_player_restart_title: "Recommencer depuis le premier clip (#01)",
      studio_export_title: "Assemblage & Exportation",
      studio_format_label: "Format et Résolution vidéo :",
      studio_format_auto: "Auto (Identique au Clip #01)",
      studio_format_4k_land: "4K Ultra HD Paysage (3840×2160)",
      studio_format_1080p_land: "1080p Full HD Paysage (1920×1080)",
      studio_format_720p_land: "720p HD Paysage (1280×720)",
      studio_format_4k_vert: "4K Vertical Shorts/Reels (2160×3840)",
      studio_format_1080p_vert: "1080p Vertical Shorts/Reels (1080×1920)",
      studio_trans_label: "Transition entre clips :",
      studio_trans_cut: "Coupure franche (0s — Raccord direct)",
      studio_trans_soft: "Fondu enchaîné doux (0.25s)",
      studio_trans_cine: "Fondu cinématique (0.5s)",
      studio_bitrate_label: "Débit d'encodage (Qualité) :",
      studio_bitrate_20m: "Très haute qualité (20 Mbps — Recommandé 4K)",
      studio_bitrate_12m: "Haute qualité (12 Mbps — Idéal 1080p)",
      studio_bitrate_6m: "Équilibré (6 Mbps — Fichier compact)",
      studio_merge_btn: "🎬 Assembler en 1 seule vidéo finale",
      studio_inspector_title: "Inspecteur du Clip",
      studio_inspector_prompt_label: "Prompt / Description :",
      studio_inspector_placeholder: "Description du clip...",
      studio_inspector_duration: "Durée :",
      studio_inspector_resolution: "Résolution :",
      studio_inspector_type: "Type :",
      // Badge text in content.js
      badge_add: "+ Séquence",
      badge_selected: "#{num} ✓ Séquence",
      badge_boost_title: "Clip haute résolution Boosté (/boost) — Cliquer pour ajouter/retirer de la séquence",
      badge_standard_title: "Cliquer pour ajouter/retirer de la séquence ordonnée Flow Video Merger",
      badge_scene_prefix: "Scène Flow #{scene} — ",
      new_scene_label: "Scène",
      studio_ai_explanations_btn_text: "Explications IA",
      scanning_clips: "⏳ Scan en cours...",
      playback_error_skip: "⚠️ Erreur de lecture sur le clip #{num}. Passage au suivant...",
      clip_unavailable_skip: "⚠️ Clip #{num} indisponible. Passage au suivant...",
      sequence_completed: "✅ Lecture de la séquence complète terminée.",
      err_timeout_clip: "Délai d'attente dépassé pour charger l'un des clips vidéo.",
      err_decode_clip: "Impossible de décoder l'un des clips vidéo (accès refusé ou format non supporté).",
      err_playback_assembly: "Erreur de lecture pendant l'assemblage d'un clip.",
      err_stream_protected: "Impossible de récupérer le flux vidéo Google Flow protégé (/asb/). Vérifiez que l'onglet Google Flow est ouvert et actif.",
      err_video_stream_not_found: "Flux vidéo introuvable",
      err_invalid_video_url: "URL vidéo invalide.",
      err_download_expired: "Téléchargement introuvable ou expiré.",
      err_chunk_out_of_bounds: "Index de bloc hors limites.",
      context_menu_open_studio: "🎬 Ouvrir Flow Video Studio (Plein Écran Web)"
    }
  };

  let currentLang = "en"; // English is the default primary language
  const changeListeners = [];

  function getLanguage() {
    return currentLang;
  }

  function setLanguage(lang, persist = true) {
    if (lang !== "en" && lang !== "fr") {
      lang = "en";
    }
    if (currentLang === lang) {
      if (persist && typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ fvm_lang: lang });
      }
      return currentLang;
    }
    const previous = currentLang;
    currentLang = lang;

    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = lang;
    }

    if (persist && typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ fvm_lang: lang });
    }

    // Sync with FlowSmartOrder if present
    if (typeof global.FlowSmartOrder !== "undefined" && global.FlowSmartOrder.setLanguage) {
      global.FlowSmartOrder.setLanguage(lang);
    }

    updateLanguageButtons();

    for (const listener of changeListeners) {
      try {
        listener(lang, previous);
      } catch (e) {
        console.error("Error in i18n change listener:", e);
      }
    }
  }

  function updateLanguageButtons() {
    if (typeof document === "undefined") return;
    const enBtn = document.getElementById("langEnBtn");
    const frBtn = document.getElementById("langFrBtn");
    if (enBtn && frBtn) {
      if (currentLang === "en") {
        enBtn.classList.add("active");
        frBtn.classList.remove("active");
      } else {
        frBtn.classList.add("active");
        enBtn.classList.remove("active");
      }
    }
  }

  function t(key, params) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    let str = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.en[key] !== undefined ? TRANSLATIONS.en[key] : key);
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }

  function onLanguageChanged(cb) {
    if (typeof cb === "function") {
      changeListeners.push(cb);
    }
  }

  function applyTranslations(container) {
    const root = container || (typeof document !== "undefined" ? document : null);
    if (!root) return;

    // text or html translation
    const textEls = root.querySelectorAll("[data-i18n]");
    textEls.forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (val.includes("<") && val.includes(">")) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    // title translation
    const titleEls = root.querySelectorAll("[data-i18n-title]");
    titleEls.forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      el.title = t(key);
    });

    // placeholder translation
    const placeholderEls = root.querySelectorAll("[data-i18n-placeholder]");
    placeholderEls.forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.placeholder = t(key);
    });

    // aria-label translation
    const ariaEls = root.querySelectorAll("[data-i18n-aria]");
    ariaEls.forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", t(key));
    });

    updateLanguageButtons();
  }

  function bindSwitchers() {
    if (typeof document === "undefined") return;
    const enBtn = document.getElementById("langEnBtn");
    const frBtn = document.getElementById("langFrBtn");
    if (enBtn && !enBtn.__fvmBound) {
      enBtn.__fvmBound = true;
      enBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setLanguage("en", true);
        applyTranslations();
      });
    }
    if (frBtn && !frBtn.__fvmBound) {
      frBtn.__fvmBound = true;
      frBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setLanguage("fr", true);
        applyTranslations();
      });
    }
    updateLanguageButtons();
  }

  function init(callback) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["fvm_lang"], (res) => {
        if (res && res.fvm_lang && (res.fvm_lang === "en" || res.fvm_lang === "fr")) {
          setLanguage(res.fvm_lang, false);
        } else {
          setLanguage("en", false);
        }
        bindSwitchers();
        applyTranslations();
        if (typeof callback === "function") callback(currentLang);
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local" && changes.fvm_lang && changes.fvm_lang.newValue) {
          if (changes.fvm_lang.newValue !== currentLang) {
            setLanguage(changes.fvm_lang.newValue, false);
            applyTranslations();
          }
        }
      });
    } else {
      setLanguage("en", false);
      bindSwitchers();
      applyTranslations();
      if (typeof callback === "function") callback("en");
    }
  }

  const FlowI18n = {
    TRANSLATIONS,
    getLanguage,
    setLanguage,
    t,
    onLanguageChanged,
    applyTranslations,
    bindSwitchers,
    init
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FlowI18n;
  }
  global.FlowI18n = FlowI18n;
})(typeof window !== "undefined" ? window : globalThis);
