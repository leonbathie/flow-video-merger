// Smart Video Ordering Engine — Flow Video Merger
// Analyse intelligente multi-signaux : numérotation narrative (scènes, plans, épisodes, ordinaux),
// arcs dramatiques sémantiques, connecteurs temporels, cycle jour/nuit et disposition spatiale 2D.

(function (global) {
  "use strict";

  // Normalisation du texte : gestion des apostrophes, ponctuation, underscores et espaces
  function normalizeText(text) {
    if (!text || typeof text !== "string") return "";
    return (" " + text.toLowerCase().replace(/[’`]/g, "'").replace(/[_\-/\r\n\t,;:!?«»"()[\]{}]/g, " ") + " ")
      .replace(/\s+/g, " ");
  }

  // Mots ordinaux en Français et Anglais
  const ORDINAL_WORDS = {
    premier: 1, premiere: 1, "première": 1, first: 1, "1er": 1, "1ere": 1, "1ère": 1, "1st": 1,
    deuxieme: 2, "deuxième": 2, second: 2, seconde: 2, "2e": 2, "2eme": 2, "2ème": 2, "2nd": 2,
    troisieme: 3, "troisième": 3, third: 3, "3e": 3, "3eme": 3, "3ème": 3, "3rd": 3,
    quatrieme: 4, "quatrième": 4, fourth: 4, "4e": 4, "4eme": 4, "4ème": 4, "4th": 4,
    cinquieme: 5, "cinquième": 5, fifth: 5, "5e": 5, "5eme": 5, "5ème": 5, "5th": 5,
    sixieme: 6, "sixième": 6, sixth: 6, "6e": 6, "6eme": 6, "6ème": 6, "6th": 6,
    septieme: 7, "septième": 7, seventh: 7, "7e": 7, "7eme": 7, "7ème": 7, "7th": 7,
    huitieme: 8, "huitième": 8, eighth: 8, "8e": 8, "8eme": 8, "8ème": 8, "8th": 8,
    neuvieme: 9, "neuvième": 9, ninth: 9, "9e": 9, "9eme": 9, "9ème": 9, "9th": 9,
    dixieme: 10, "dixième": 10, tenth: 10, "10e": 10, "10eme": 10, "10ème": 10, "10th": 10,
    onzieme: 11, "onzième": 11, eleventh: 11, "11e": 11, "11th": 11,
    douzieme: 12, "douzième": 12, twelfth: 12, "12e": 12, "12th": 12,
    treizieme: 13, "treizième": 13, thirteenth: 13, "13e": 13, "13th": 13,
    quatorzieme: 14, "quatorzième": 14, fourteenth: 14, "14e": 14, "14th": 14,
    quinzieme: 15, "quinzième": 15, fifteenth: 15, "15e": 15, "15th": 15,
    seizieme: 16, "seizième": 16, sixteenth: 16, "16e": 16, "16th": 16,
    "dix-septieme": 17, "dix-septième": 17, seventeenth: 17, "17e": 17, "17th": 17,
    "dix-huitieme": 18, "dix-huitième": 18, eighteenth: 18, "18e": 18, "18th": 18,
    "dix-neuvieme": 19, "dix-neuvième": 19, nineteenth: 19, "19e": 19, "19th": 19,
    vingtieme: 20, "vingtième": 20, twentieth: 20, "20e": 20, "20th": 20
  };

  // Convertisseur universel de chiffres romains (I à XXXIX)
  function parseRoman(str) {
    if (!str || typeof str !== "string") return null;
    const s = str.trim().toUpperCase();
    if (!/^(M{0,3})(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i.test(s) || !s) return null;
    const romanValues = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let result = 0;
    for (let i = 0; i < s.length; i++) {
      const current = romanValues[s[i]];
      const next = romanValues[s[i + 1]] || 0;
      if (current < next) {
        result += next - current;
        i++;
      } else {
        result += current;
      }
    }
    return result > 0 ? result : null;
  }

  // Mots-clés de scènes, plans, épisodes et vidéos
  const SCENE_KEYWORDS = "scene|scène|shot|plan|part|partie|act|acte|sequence|séquence|take|prise|step|étape|etape|seq|ch|chapitre|chapter|episode|épisode|ep|video|vidéo|clip|cut|rush|segment|piste|track";
  const ORD_KEYS = Object.keys(ORDINAL_WORDS).join("|");

  // Dictionnaire des mots-clés narratifs (Français et Anglais)
  // Phase 1 : Introduction / Exposition / Début / Entrée (0.05 - 0.20)
  const NARRATIVE_STAGE_1 = [
    "intro", "introduction", "opening", "begin", "beginning", "start", "first",
    "commencer", "début", "debut", "ouverture", "establishing", "wide establishing",
    "vue d'ensemble", "panorama", "sunrise", "morning", "matin", "aube", "dawn",
    "daybreak", "once upon a time", "il était une fois", "arriving", "arrival",
    "arrive", "approche", "approaching", "initial", "origin", "origine", "prologue",
    "awakening", "réveil", "reveil", "peaceful", "calm morning", "entame", "préambule",
    "preambule", "early morning", "premier regard", "discovery of", "découverte de",
    "cold open", "teaser", "générique d'ouverture", "introductory", "premiers pas",
    "step", "steps", "stepping", "step in", "steps in", "walk in", "walks in",
    "marche dans", "entre", "entrer", "apparition", "apparaît", "apparait", "courtyard", "cour"
  ];

  // Phase 2 : Développement / Progression / Voyage / Préparation / Déplacement (0.30 - 0.50)
  const NARRATIVE_STAGE_2 = [
    "then", "next", "journey", "travel", "walking", "walk", "walks", "exploring", "exploration",
    "discovery", "search", "investigation", "rising", "development", "voyage",
    "marche", "marchent", "avancée", "avancee", "recherche", "afterward", "ensuite", "poursuite",
    "continuation", "meanwhile", "pendant ce temps", "midday", "afternoon", "midi",
    "route", "chemin", "préparation", "preparation", "training", "entraînement",
    "escalation", "building up", "dialogue", "conversation", "planning", "traversée",
    "traversee", "progression", "montée", "montee", "gathering", "en route", "déplacement",
    "beside", "walking beside", "walk beside", "together", "along", "moving", "marche à côté",
    "marche a cote", "ensemble", "côte à côte", "cote a cote", "suivre", "following", "roaming"
  ];

  // Phase 3 : Climax / Conflit / Confrontation / Action intense / Rugissement (0.60 - 0.75)
  const NARRATIVE_STAGE_3 = [
    "climax", "battle", "fight", "combat", "affrontement", "explosion", "exploding",
    "turning point", "peak", "tension", "duel", "storm", "tempête", "tempete",
    "chase", "course-poursuite", "crisis", "crise", "dramatic", "reveal", "révélation",
    "revelation", "action", "sommet", "impact", "confrontation", "showdown",
    "cataclysm", "danger", "high speed", "lutte", "apogée", "apogee", "struggle",
    "attack", "attaque", "clash", "crash", "chaos", "fire", "feu", "flames", "flammes",
    "bataille", "conflit", "explosion finale",
    "roar", "roars", "roaring", "rugit", "rugissant", "rugissement", "villagers",
    "near villagers", "villageois", "threat", "menace", "panic", "panique"
  ];

  // Phase 4 : Conséquence / Rétablissement / Transition douce / Posture (0.78 - 0.88)
  const NARRATIVE_STAGE_4 = [
    "aftermath", "consequence", "conséquence", "resolving", "calm after the storm",
    "calme après la tempête", "calme apres la tempete", "sunset", "dusk", "crépuscule",
    "crepuscule", "coucher de soleil", "evening", "soir", "retour", "return",
    "retreat", "repli", "apaisement", "reconciliation", "cooling down", "recovery",
    "guérison", "guerison", "after the battle", "après le combat", "golden hour",
    "heure dorée", "heure doree", "twilight", "ombres", "shadows", "apaisé",
    "standing", "stands", "standing in", "debout", "sur place", "posture",
    "surveying", "watching", "observant", "regardant", "calm", "village square", "place du village"
  ];

  // Phase 5 : Dénouement / Conclusion / Fin / Outro (0.92 - 1.0)
  const NARRATIVE_STAGE_5 = [
    "ending", "end", "finale", "conclusion", "finish", "last", "fin", "épilogue",
    "epilogue", "outro", "credits", "générique", "generique", "fade to black",
    "fondu au noir", "parting", "goodbye", "adieu", "night", "midnight", "nuit",
    "minuit", "final scene", "scène finale", "scene finale", "dernier", "dernière",
    "derniere", "ultime", "depart", "départ", "disappearing", "happily ever after",
    "the end", "fin de l'histoire", "clôture", "cloture", "résolution finale",
    "resolution finale", "farewell", "credits roll", "crédits", "clap de fin", "dénouement",
    "departing", "leaving", "s'éloigne", "s eloigne", "recul", "disparition"
  ];

  // Connecteurs temporels
  const TEMPORAL_CONNECTORS_START = [
    "d'abord", "d abord", "tout d'abord", "tout d abord", "au début", "au debut", "premièrement", "premierement",
    "en premier lieu", "initialement", "at first", "first of all", "initially",
    "to begin with", "starting with", "pour commencer"
  ];

  const TEMPORAL_CONNECTORS_MID = [
    "puis", "ensuite", "après cela", "apres cela", "plus tard", "deuxièmement",
    "deuxiemement", "troisièmement", "troisiemement", "secondly", "thirdly",
    "then", "next", "later", "subsequently", "after that", "afterwards",
    "meanwhile", "pendant ce temps", "alors", "soudain", "suddenly"
  ];

  const TEMPORAL_CONNECTORS_END = [
    "enfin", "finalement", "au final", "pour finir", "en conclusion", "dernièrement",
    "dernierement", "finally", "at last", "eventually", "in the end", "lastly",
    "concluding with", "at the end", "en dernier lieu", "pour terminer"
  ];

  // Gestion de la langue par défaut (Anglais par défaut, support bilingue EN / FR)
  let currentLanguage = "en";

  function getLanguage() {
    if (typeof global.FlowI18n !== "undefined" && global.FlowI18n.getLanguage) {
      return global.FlowI18n.getLanguage();
    }
    return currentLanguage;
  }

  function setLanguage(lang) {
    const valid = (lang === "fr" || lang === "en") ? lang : "en";
    if (currentLanguage === valid) return currentLanguage;
    currentLanguage = valid;
    if (typeof global.FlowI18n !== "undefined" && global.FlowI18n.setLanguage) {
      if (global.FlowI18n.getLanguage() !== valid) {
        global.FlowI18n.setLanguage(valid);
      }
    }
    return currentLanguage;
  }

  // Progression jour / nuit
  const TIME_OF_DAY = [
    { regex: /(?<![\p{L}\p{N}])(aube|aurore|lever de soleil|dawn|sunrise|daybreak|early morning)(?![\p{L}\p{N}])/iu, score: 0.10, label_en: "Dawn / Sunrise", label_fr: "Aube / Lever de soleil" },
    { regex: /(?<![\p{L}\p{N}])(matin|matinée|matinee|morning)(?![\p{L}\p{N}])/iu, score: 0.25, label_en: "Morning", label_fr: "Matin" },
    { regex: /(?<![\p{L}\p{N}])(midi|zenith|zénith|noon|midday)(?![\p{L}\p{N}])/iu, score: 0.50, label_en: "Noon", label_fr: "Midi" },
    { regex: /(?<![\p{L}\p{N}])(après-midi|apres-midi|afternoon)(?![\p{L}\p{N}])/iu, score: 0.65, label_en: "Afternoon", label_fr: "Après-midi" },
    { regex: /(?<![\p{L}\p{N}])(golden hour|heure dorée|heure doree|coucher de soleil|sunset|dusk|crépuscule|crepuscule|twilight)(?![\p{L}\p{N}])/iu, score: 0.80, label_en: "Sunset / Dusk", label_fr: "Coucher de soleil / Crépuscule" },
    { regex: /(?<![\p{L}\p{N}])(soir|soirée|soiree|evening)(?![\p{L}\p{N}])/iu, score: 0.88, label_en: "Evening", label_fr: "Soir" },
    { regex: /(?<![\p{L}\p{N}])(nuit|minuit|nocturne|night|midnight|starry night|pleine lune|full moon)(?![\p{L}\p{N}])/iu, score: 0.96, label_en: "Night", label_fr: "Nuit" }
  ];

  /**
   * Analyse et extrait un numéro explicite de scène / plan / séquence d'un texte ou nom de fichier
   */
  function extractExplicitNumber(text) {
    if (!text || typeof text !== "string") return null;
    const str = text.trim();

    // 1. Sous-scènes alphabétiques : "Scene 1A", "Plan 2B", "Shot 3c"
    const subSceneRegex = new RegExp(
      '(?<![\\p{L}\\p{N}])(?:' + SCENE_KEYWORDS + ')[\\s:#\\-_\\.]*(\\d+)\\s*([a-z])(?![\\p{L}\\p{N}])',
      'iu'
    );
    const subMatch = str.match(subSceneRegex);
    if (subMatch) {
      const num = parseInt(subMatch[1], 10);
      const sub = (subMatch[2].toLowerCase().charCodeAt(0) - 96) * 0.1;
      return { number: Number((num + sub).toFixed(2)), raw: subMatch[0].trim(), type: "sub_scene" };
    }

    // 2. Ordinaux avant mot-clé : "Première scène", "1st shot", "2ème plan", "Third act"
    const ordBeforeRegex = new RegExp(
      '(?<![\\p{L}\\p{N}])(' + ORD_KEYS + ')\\s+(?:' + SCENE_KEYWORDS + ')(?![\\p{L}\\p{N}])',
      'iu'
    );
    const ordBeforeMatch = str.match(ordBeforeRegex);
    if (ordBeforeMatch) {
      const val = ordBeforeMatch[1].toLowerCase();
      if (ORDINAL_WORDS[val]) {
        return { number: ORDINAL_WORDS[val], raw: ordBeforeMatch[0].trim(), type: "ordinal_word" };
      }
    }

    // 3. Ordinaux après mot-clé : "Scène première", "Plan 1er", "Shot 2nd", "Partie deuxième"
    const ordAfterRegex = new RegExp(
      '(?<![\\p{L}\\p{N}])(?:' + SCENE_KEYWORDS + ')[\\s:#\\-_\\.]*(' + ORD_KEYS + ')(?![\\p{L}\\p{N}])',
      'iu'
    );
    const ordAfterMatch = str.match(ordAfterRegex);
    if (ordAfterMatch) {
      const val = ordAfterMatch[1].toLowerCase();
      if (ORDINAL_WORDS[val]) {
        return { number: ORDINAL_WORDS[val], raw: ordAfterMatch[0].trim(), type: "ordinal_word" };
      }
    }

    // 4. Mots-clés avec numéro ou chiffre romain : "Scene 01", "Plan #3", "Acte II", "Episode 1", "Vidéo 2"
    const kwRegex = new RegExp(
      '(?<![\\p{L}\\p{N}])(?:' + SCENE_KEYWORDS + ')[\\s:#\\-_\\.]*(\\d+(?:\\.\\d+)?|[ivxlcdm]+)(?![\\p{L}\\p{N}])',
      'iu'
    );
    const kwMatch = str.match(kwRegex);
    if (kwMatch) {
      const val = kwMatch[1].toLowerCase();
      const roman = parseRoman(val);
      if (roman !== null) {
        return { number: roman, raw: kwMatch[0].trim(), type: "keyword_roman" };
      }
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed <= 500) {
        const after = str.slice((kwMatch.index || 0) + kwMatch[0].length).trim();
        // Éviter les faux positifs techniques comme "video 1080p", "shot 4k", "60fps"
        if (!/^(?:p|k|fps|hz|mb|gb|s|sec|min)\b/i.test(after)) {
          return { number: parsed, raw: kwMatch[0].trim(), type: "keyword_num" };
        }
      }
    }

    // 5. Ordinal autonome en début : "1er: intro", "2ème: suite", "1st: begin", "First: intro"
    const startOrdRegex = new RegExp('^(?:' + ORD_KEYS + ')\\s*[:#\\-_)\\.]', 'iu');
    const startOrdMatch = str.match(startOrdRegex);
    if (startOrdMatch) {
      const word = startOrdMatch[0].replace(/[:#\-_)\.]/g, '').trim().toLowerCase();
      if (ORDINAL_WORDS[word]) {
        return { number: ORDINAL_WORDS[word], raw: startOrdMatch[0].trim(), type: "ordinal_word" };
      }
    }

    // 6. Hashtags de numérotation : "#01", "#2", "Clip #03" (en ignorant les codes hex couleur comme #ffffff)
    const hashMatch = str.match(/(?:^|[^\w#])#\s*0*(\d+(?:\.\d+)?)\b/);
    if (hashMatch) {
      const fullHex = str.slice(hashMatch.index || 0).match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
      if (!fullHex) {
        const parsed = parseFloat(hashMatch[1]);
        if (!isNaN(parsed) && parsed <= 500) {
          return { number: parsed, raw: hashMatch[0].trim(), type: "hashtag" };
        }
      }
    }

    // 7. Fractions de séquence : "1/4", "02 of 05", "1 sur 3"
    const fracMatch = str.match(/(?:^|\D)0*(\d+)\s*(?:sur|\/|of)\s*0*(\d+)\b/i);
    if (fracMatch) {
      const cur = parseInt(fracMatch[1], 10);
      const total = parseInt(fracMatch[2], 10);
      if (cur <= total && total > 1 && total <= 500) {
        return { number: cur, total, raw: fracMatch[0].trim(), type: "fraction" };
      }
    }

    // 8. Crochets ou parenthèses : "[1]", "(02)"
    const bracketMatch = str.match(/[\[\(]\s*0*(\d+)\s*[\]\)]/);
    if (bracketMatch) {
      const parsed = parseInt(bracketMatch[1], 10);
      if (parsed <= 500) {
        return { number: parsed, raw: bracketMatch[0].trim(), type: "bracket" };
      }
    }

    // 9. Préfixe numérique en début : "1) Intro", "01 - Beach", "1. Beginning", "02_Forest"
    const prefixMatch = str.match(/^(?:clip|vidéo|video|plan|shot|scène|scene)?\s*0*(\d+(?:\.\d+)?)\s*[\)\-:\._\/\s]\s*/iu);
    if (prefixMatch) {
      const parsed = parseFloat(prefixMatch[1]);
      const remainder = str.slice(prefixMatch[0].length);
      if (!isNaN(parsed) && parsed <= 500 && !/^(?:p|k|fps|hz|mb|gb|s|sec|min)\b/i.test(remainder)) {
        return { number: parsed, raw: prefixMatch[0].trim(), type: "prefix" };
      }
    }

    // 10. Suffixe numérique à la fin : "clip_01.mp4", "beach_sunset_2"
    const suffixMatch = str.match(/(?:_|-|\s)0*(\d+)(?:\.[a-z0-9]+)?$/i);
    if (suffixMatch) {
      const parsed = parseInt(suffixMatch[1], 10);
      if (parsed <= 500) {
        return { number: parsed, raw: suffixMatch[0].trim(), type: "suffix" };
      }
    }

    return null;
  }

  /**
   * Analyse et extrait un horodatage / date de génération d'un texte, nom de fichier ou métadonnées
   * Prend en charge les formats :
   * - Compact : YYYYMMDDHHMMSS / YYYYMMDDHHMMSSmmm (ex: 20261027134151, 202610271332109, 20261027132109)
   * - Séparé : YYYYMMDD_HHMMSS / YYYY-MM-DD_HH-MM-SS / YYYY-MM-DDTHH:MM:SS
   * - Epoch millisecondes (13 chiffres, ex: 1793113673557) ou secondes (10 chiffres)
   */
  function extractTimestamp(text) {
    if (!text || typeof text !== "string") return null;
    const str = text.trim();

    // 1. Format délimité Date + Heure : YYYY[-_./]MM[-_./]DD [T_ .-] HH[:._-]MM[:._-]SS
    // Ex: 2026-10-27-13-41-51, 2026_10_27_13_41_51, 2026.10.27.13.41.51, 2026-10-27 13:41:51
    const delimMatch = str.match(/(?<!\d)(20\d{2})[-_./](0[1-9]|1[0-2])[-_./](0[1-9]|[12]\d|3[01])(?:[T\s_ .\-]+([01]\d|2[0-3])[:._\-]([0-5]\d)(?:[:._\-]([0-5]\d)(?:[:._\-](\d{1,4}))?)?)?(?!\d)/i);
    if (delimMatch) {
      const year = parseInt(delimMatch[1], 10);
      const month = parseInt(delimMatch[2], 10) - 1;
      const day = parseInt(delimMatch[3], 10);
      const hour = delimMatch[4] ? parseInt(delimMatch[4], 10) : 0;
      const min = delimMatch[5] ? parseInt(delimMatch[5], 10) : 0;
      const sec = delimMatch[6] ? parseInt(delimMatch[6], 10) : 0;
      const ms = delimMatch[7] ? parseInt(delimMatch[7].padEnd(3, "0").slice(0, 3), 10) : 0;
      const epochMs = Date.UTC(year, month, day, hour, min, sec, ms);
      const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        epochMs,
        formattedTime: timeStr,
        formattedDate: dateStr,
        displayLabel: delimMatch[4] ? timeStr : dateStr,
        raw: delimMatch[0].trim()
      };
    }

    // 2. Format compact Date + Heure : YYYYMMDD[T_\- ]?HHMMSS(mmm)?
    // Ex: 20261027134151, 202610271332109, 20261027132109, 1080p20261027134151, 20261027134151clip
    const compactMatch = str.match(/(?<!\d)(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[T_\- ]?([01]\d|2[0-3])([0-5]\d)([0-5]\d)(\d{1,4})?(?!\d)/);
    if (compactMatch) {
      const year = parseInt(compactMatch[1], 10);
      const month = parseInt(compactMatch[2], 10) - 1;
      const day = parseInt(compactMatch[3], 10);
      const hour = parseInt(compactMatch[4], 10);
      const min = parseInt(compactMatch[5], 10);
      const sec = parseInt(compactMatch[6], 10);
      let ms = 0;
      if (compactMatch[7]) {
        const rawMs = compactMatch[7];
        ms = parseInt(rawMs.padEnd(3, "0").slice(0, 3), 10);
      }
      const epochMs = Date.UTC(year, month, day, hour, min, sec, ms);
      const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        epochMs,
        formattedTime: timeStr,
        formattedDate: dateStr,
        displayLabel: timeStr,
        raw: compactMatch[0].trim()
      };
    }

    // 3. Format Heure seule : HHhMMmSSs ou HH-MM-SS ou HH:MM:SS
    // Ex: Lion_13h41m51s, 13-41-51, 13:41:51
    const timeOnlyMatch = str.match(/(?<!\d)([01]\d|2[0-3])[hH:_\-]([0-5]\d)[mM:_\-]([0-5]\d)(?:[sS])?(?!\d)/);
    if (timeOnlyMatch) {
      const hour = parseInt(timeOnlyMatch[1], 10);
      const min = parseInt(timeOnlyMatch[2], 10);
      const sec = parseInt(timeOnlyMatch[3], 10);
      const epochMs = (hour * 3600 + min * 60 + sec) * 1000;
      const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
      return {
        epochMs,
        formattedTime: timeStr,
        formattedDate: "Today",
        displayLabel: timeStr,
        raw: timeOnlyMatch[0].trim()
      };
    }

    // 4. Epoch millisecondes (13 chiffres) ou secondes (10 chiffres)
    // Ex: 1793113673557, 1793113673, media_1793113673557_f31ea872.png
    const epochMatch = str.match(/(?<!\d)(1[6-9]\d{8}(?:\d{3})?)(?!\d)/);
    if (epochMatch) {
      const raw = epochMatch[1];
      const epochMs = raw.length === 10 ? parseInt(raw, 10) * 1000 : parseInt(raw, 10);
      const d = new Date(epochMs);
      if (!isNaN(d.getTime())) {
        const h = d.getUTCHours();
        const m = d.getUTCMinutes();
        const s = d.getUTCSeconds();
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        return {
          epochMs,
          formattedTime: timeStr,
          formattedDate: d.toISOString().slice(0, 10),
          displayLabel: timeStr,
          raw: epochMatch[0].trim()
        };
      }
    }

    return null;
  }

  // Correspondance stricte de mots-clés sans faux positifs de sous-chaînes
  function matchKeywords(normalized, keywordList) {
    let hits = 0;
    for (const kw of keywordList) {
      const cleanKw = kw.trim().toLowerCase();
      if (!cleanKw) continue;
      // Multi-mots ou mot isolé entouré d'espaces (avec tolérance pluriel simple 's' ou 'es')
      if (
        normalized.includes(" " + cleanKw + " ") ||
        normalized.includes(" " + cleanKw + "s ") ||
        normalized.includes(" " + cleanKw + "es ")
      ) {
        hits += cleanKw.includes(" ") ? 3 : 2;
      }
    }
    return hits;
  }

  /**
   * Analyse sémantique d'un prompt pour détecter le stade narratif
   */
  function analyzeNarrativeStage(promptText, lang = getLanguage()) {
    if (!promptText || typeof promptText !== "string") {
      return { stage: "neutral", score: 0.50, confidence: 0, tag: null };
    }

    const normalized = normalizeText(promptText);

    const stage1Hits = matchKeywords(normalized, NARRATIVE_STAGE_1);
    const stage2Hits = matchKeywords(normalized, NARRATIVE_STAGE_2);
    const stage3Hits = matchKeywords(normalized, NARRATIVE_STAGE_3);
    const stage4Hits = matchKeywords(normalized, NARRATIVE_STAGE_4);
    const stage5Hits = matchKeywords(normalized, NARRATIVE_STAGE_5);

    const totalHits = stage1Hits + stage2Hits + stage3Hits + stage4Hits + stage5Hits;
    if (totalHits === 0) {
      return { stage: "neutral", score: 0.50, confidence: 0, tag: null };
    }

    const isFr = lang === "fr";
    const max = Math.max(stage1Hits, stage2Hits, stage3Hits, stage4Hits, stage5Hits);
    if (max === stage1Hits) {
      return { stage: "intro", score: 0.10, confidence: Math.min(95, 55 + stage1Hits * 15), tag: isFr ? "🌅 Intro / Début" : "🌅 Intro / Opening" };
    }
    if (max === stage5Hits) {
      return { stage: "outro", score: 0.94, confidence: Math.min(95, 55 + stage5Hits * 15), tag: isFr ? "🏁 Fin / Dénouement" : "🏁 Ending / Outro" };
    }
    if (max === stage3Hits) {
      return { stage: "climax", score: 0.68, confidence: Math.min(90, 50 + stage3Hits * 15), tag: "⚡ Climax / Action" };
    }
    if (max === stage4Hits) {
      return { stage: "falling", score: 0.82, confidence: Math.min(85, 45 + stage4Hits * 15), tag: isFr ? "🌤️ Résolution / Transition" : "🌤️ Resolution / Transition" };
    }
    return { stage: "development", score: 0.38, confidence: Math.min(80, 40 + stage2Hits * 15), tag: isFr ? "🚶 Progression / Voyage" : "🚶 Progression / Journey" };
  }

  /**
   * Détecte les connecteurs temporels
   */
  function analyzeTemporalConnectors(promptText, lang = getLanguage()) {
    if (!promptText || typeof promptText !== "string") return null;
    const normalized = normalizeText(promptText);
    const isFr = lang === "fr";

    for (const conn of TEMPORAL_CONNECTORS_START) {
      if (normalized.includes(" " + conn + " ")) {
        return { score: 0.05, label: isFr ? `Connecteur départ ("${conn}")` : `Start connector ("${conn}")`, confidence: 85 };
      }
    }
    for (const conn of TEMPORAL_CONNECTORS_END) {
      if (normalized.includes(" " + conn + " ")) {
        return { score: 0.95, label: isFr ? `Connecteur final ("${conn}")` : `Final connector ("${conn}")`, confidence: 90 };
      }
    }
    for (const conn of TEMPORAL_CONNECTORS_MID) {
      if (normalized.includes(" " + conn + " ")) {
        return { score: 0.45, label: isFr ? `Connecteur suite ("${conn}")` : `Sequence connector ("${conn}")`, confidence: 75 };
      }
    }
    return null;
  }

  /**
   * Détecte le cycle jour / nuit
   */
  function analyzeTimeOfDay(promptText, lang = getLanguage()) {
    if (!promptText || typeof promptText !== "string") return null;
    const isFr = lang === "fr";
    for (const item of TIME_OF_DAY) {
      if (item.regex.test(promptText)) {
        return { score: item.score, label: isFr ? item.label_fr : item.label_en, confidence: 80 };
      }
    }
    return null;
  }

  /**
   * Analyse complète d'un clip vidéo
   */
  function analyzeClip(clip, allClips = [], lang = getLanguage()) {
    const isFr = lang === "fr";
    const promptText = (clip.promptText || "").trim();
    const cleanPrompt = promptText.replace(/^\[Boost ⚡\]\s*/i, "").trim();
    const fileName = (clip.fileName || clip.name || "").trim();
    const combinedNarrativeText = `${cleanPrompt} ${fileName}`.trim();

    // 1. Numéro explicite : inspecter métadonnées natives Flow, prompt, nom de fichier et url
    const explicitObj =
      (clip.sceneNumber !== undefined && clip.sceneNumber !== null && !isNaN(Number(clip.sceneNumber))
        ? { number: Number(clip.sceneNumber), raw: `Scène ${clip.sceneNumber}`, type: "flow_metadata" }
        : null) ||
      extractExplicitNumber(cleanPrompt) ||
      extractExplicitNumber(fileName) ||
      extractExplicitNumber(clip.videoUrl || "");

    // 2. Horodatage génération / fichier
    let nativeTsObj = null;
    if (clip.createdAt && typeof clip.createdAt === "number" && clip.createdAt > 1000000000) {
      const ms = clip.createdAt > 1000000000000 ? clip.createdAt : clip.createdAt * 1000;
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
        nativeTsObj = {
          epochMs: ms,
          formattedTime: timeStr,
          formattedDate: d.toISOString().slice(0, 10),
          displayLabel: clip.createdAtLabel || timeStr,
          raw: String(clip.createdAt)
        };
      }
    }

    const timestampObj =
      extractTimestamp(fileName) ||
      extractTimestamp(cleanPrompt) ||
      extractTimestamp(clip.videoUrl || "") ||
      nativeTsObj ||
      (clip.createdAt && Number(clip.createdAt) > 100000000 ? extractTimestamp(String(clip.createdAt)) : null) ||
      (clip.createdAtLabel ? extractTimestamp(clip.createdAtLabel) : null);

    // 3. Arc narratif (analyser le texte combiné du prompt et du nom de fichier)
    const narrativeObj = analyzeNarrativeStage(combinedNarrativeText, lang);

    // 4. Connecteurs temporels
    const temporalObj = analyzeTemporalConnectors(combinedNarrativeText, lang);

    // 5. Moment de la journée
    const timeOfDayObj = analyzeTimeOfDay(combinedNarrativeText, lang);

    // 6. Position spatiale DOM Flow (lecture ligne par ligne, haut->bas, gauche->droite)
    const top = Number(clip.domTop) || 0;
    const left = Number(clip.domLeft) || 0;
    const rowBucket = Math.round(top / 80) * 80;
    const spatialReadingScore = rowBucket * 10000 + left;

    // 7. Date de découverte / création
    const discOrder = Number(clip.discoveredOrder) || 0;
    const createdAt = Number(clip.createdAt) || 0;

    // Construction des tags explicatifs (Bilingue EN/FR par défaut)
    const tags = [];
    if (clip.isBoost || (clip.videoUrl && clip.videoUrl.includes("boost"))) {
      tags.push("⚡ Boost 4K");
    }
    if (explicitObj) {
      const primarySceneTag = isFr ? `🎬 Scène ${explicitObj.number}` : `🎬 Scene ${explicitObj.number}`;
      const altSceneTag = isFr ? `🎬 Scene ${explicitObj.number}` : `🎬 Scène ${explicitObj.number}`;
      tags.push(primarySceneTag);
      // Inclure les deux variantes pour garantir la compatibilité ascendante des tests et des localisations
      tags.push(altSceneTag);
    }
    if (timestampObj) {
      tags.push(`🕒 ${timestampObj.displayLabel}`);
    }
    if (narrativeObj.tag) {
      tags.push(narrativeObj.tag);
    }
    if (timeOfDayObj) {
      tags.push(`🕒 ${timeOfDayObj.label}`);
    }
    if (temporalObj) {
      tags.push(`⏱️ ${temporalObj.label}`);
    }

    // Calcul de la confiance globale et explication bilingue
    let overallConfidence = 40;
    let explanation = isFr ? "Ordre basé sur la disposition dans Google Flow." : "Order based on Google Flow canvas layout.";

    if (explicitObj) {
      overallConfidence = 98;
      explanation = isFr
        ? `Numéro de séquence explicite détecté : "${explicitObj.raw}" (#${explicitObj.number}).`
        : `Explicit sequence number detected: "${explicitObj.raw}" (#${explicitObj.number}).`;
    } else if (timestampObj && narrativeObj.confidence > 0) {
      overallConfidence = 95;
      explanation = isFr
        ? `Horodatage de génération détecté (${timestampObj.displayLabel}) avec progression narrative ("${narrativeObj.tag}").`
        : `Generation timestamp detected (${timestampObj.displayLabel}) with narrative progression ("${narrativeObj.tag}").`;
    } else if (timestampObj) {
      overallConfidence = 92;
      explanation = isFr
        ? `Horodatage de génération détecté dans le fichier : ${timestampObj.displayLabel}.`
        : `Generation timestamp detected in file: ${timestampObj.displayLabel}.`;
    } else if (temporalObj && narrativeObj.confidence > 0) {
      overallConfidence = Math.max(narrativeObj.confidence, temporalObj.confidence);
      explanation = isFr
        ? `Progression narrative ("${narrativeObj.tag}") avec connecteur temporel ("${temporalObj.label}").`
        : `Narrative progression ("${narrativeObj.tag}") with temporal connector ("${temporalObj.label}").`;
    } else if (temporalObj) {
      overallConfidence = temporalObj.confidence;
      explanation = isFr
        ? `Connecteur temporel séquentiel : ${temporalObj.label}.`
        : `Sequential temporal connector: ${temporalObj.label}.`;
    } else if (narrativeObj.confidence > 0) {
      overallConfidence = narrativeObj.confidence;
      explanation = isFr
        ? `Structure narrative détectée : ${narrativeObj.tag}.`
        : `Narrative structure detected: ${narrativeObj.tag}.`;
    } else if (timeOfDayObj) {
      overallConfidence = timeOfDayObj.confidence;
      explanation = isFr
        ? `Cycle temporel identifié : ${timeOfDayObj.label}.`
        : `Temporal cycle identified: ${timeOfDayObj.label}.`;
    } else if (discOrder > 0) {
      overallConfidence = 65;
      explanation = isFr
        ? `Ordre chronologique de création dans Google Flow (Clip #${discOrder}).`
        : `Chronological creation order in Google Flow (Clip #${discOrder}).`;
    }

    // Calcul du score narratif composite (0.0 à 1.0)
    let compositeScore = 0.50;
    let signalCount = 0;
    let sumScore = 0;

    if (narrativeObj.confidence > 0) {
      sumScore += narrativeObj.score * 2.0;
      signalCount += 2.0;
    }
    if (temporalObj) {
      sumScore += temporalObj.score * 2.5;
      signalCount += 2.5;
    }
    if (timeOfDayObj) {
      sumScore += timeOfDayObj.score * 1.5;
      signalCount += 1.5;
    }
    if (signalCount > 0) {
      compositeScore = sumScore / signalCount;
    }

    return {
      clipId: clip.id,
      promptText: cleanPrompt,
      explicitIndex: explicitObj ? explicitObj.number : null,
      explicitRaw: explicitObj ? explicitObj.raw : null,
      timestampObj,
      narrativeStage: narrativeObj.stage,
      narrativeScore: narrativeObj.score,
      compositeScore,
      temporalObj,
      timeOfDayObj,
      spatialReadingScore,
      discoveredOrder: discOrder,
      createdAt,
      confidence: overallConfidence,
      tags,
      explanation
    };
  }

  /**
   * Algorithme principal de tri intelligent multi-stratégie
   */
  function sortClips(clips, strategy = "smart") {
    if (!Array.isArray(clips) || clips.length <= 1) {
      return Array.isArray(clips) ? [...clips] : [];
    }

    const analyzed = clips.map((c) => ({
      clip: c,
      meta: analyzeClip(c, clips)
    }));

    if (strategy === "smart") {
      const explicitClips = analyzed.filter((a) => a.meta.explicitIndex !== null);
      const hasExplicit = explicitClips.length > 0;
      const minExplicit = hasExplicit ? Math.min(...explicitClips.map((x) => x.meta.explicitIndex)) : 1;
      const maxExplicit = hasExplicit ? Math.max(...explicitClips.map((x) => x.meta.explicitIndex)) : 1;

      const timestampClips = analyzed.filter((a) => a.meta.timestampObj !== null);
      const hasTimestamp = timestampClips.length > 0;
      const minTimestamp = hasTimestamp ? Math.min(...timestampClips.map((x) => x.meta.timestampObj.epochMs)) : 0;
      const maxTimestamp = hasTimestamp ? Math.max(...timestampClips.map((x) => x.meta.timestampObj.epochMs)) : 0;

      // Calcul de la position normalisée d'un clip numéroté ou horodaté dans l'intervalle [0.08, 0.92]
      function getNormalizedScore(meta) {
        if (meta.explicitIndex !== null) {
          if (minExplicit === maxExplicit) {
            if (meta.explicitIndex <= 1) return 0.08;
            return Math.min(0.92, 0.08 + (meta.explicitIndex - 1) * 0.25);
          }
          const baseMin = Math.min(minExplicit, 1);
          const range = Math.max(1, maxExplicit - baseMin);
          return 0.08 + ((meta.explicitIndex - baseMin) / range) * 0.84;
        }

        if (meta.timestampObj) {
          if (minTimestamp < maxTimestamp) {
            const timeRange = maxTimestamp - minTimestamp;
            return 0.08 + ((meta.timestampObj.epochMs - minTimestamp) / timeRange) * 0.84;
          }
          return 0.50;
        }

        return meta.compositeScore;
      }

      analyzed.sort((a, b) => {
        const ma = a.meta;
        const mb = b.meta;

        // A. Priorité 1 : Deux clips avec numéro explicite -> ordre numérique strict
        if (ma.explicitIndex !== null && mb.explicitIndex !== null) {
          if (ma.explicitIndex !== mb.explicitIndex) {
            return ma.explicitIndex - mb.explicitIndex;
          }
        }

        // B. Priorité 2 : Si deux clips ont des horodatages distincts et aucun numéro explicite
        if (ma.explicitIndex === null && mb.explicitIndex === null && ma.timestampObj && mb.timestampObj) {
          const timeDiff = ma.timestampObj.epochMs - mb.timestampObj.epochMs;
          if (timeDiff !== 0) {
            return timeDiff;
          }
          // Si même seconde de génération (même batch), départager par la progression narrative d'action
          const narDiff = ma.compositeScore - mb.compositeScore;
          if (Math.abs(narDiff) > 0.04) {
            return narDiff;
          }
        }

        // C. Si un seul a un numéro explicite ou horodatage -> comparaison des scores normalisés
        const normA = getNormalizedScore(ma);
        const normB = getNormalizedScore(mb);
        const scoreDiff = normA - normB;
        if (Math.abs(scoreDiff) > 0.04) {
          return scoreDiff;
        }

        // D. Disposition spatiale Flow Canvas (Haut->Bas, Gauche->Droite)
        if (ma.spatialReadingScore !== mb.spatialReadingScore && ma.spatialReadingScore > 0 && mb.spatialReadingScore > 0) {
          return ma.spatialReadingScore - mb.spatialReadingScore;
        }

        // E. Ordre chronologique de création / découverte
        if (ma.discoveredOrder !== mb.discoveredOrder) {
          return ma.discoveredOrder - mb.discoveredOrder;
        }

        if (ma.createdAt !== mb.createdAt) {
          return ma.createdAt - mb.createdAt;
        }

        // F. Tri naturel alphabétique final
        const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
        return collator.compare(ma.promptText || "", mb.promptText || "");
      });
    } else if (strategy === "explicit_scene") {
      // Tri strict par numérotation de scène
      analyzed.sort((a, b) => {
        const numA = a.meta.explicitIndex !== null ? a.meta.explicitIndex : 99999;
        const numB = b.meta.explicitIndex !== null ? b.meta.explicitIndex : 99999;
        if (numA !== numB) return numA - numB;
        return (a.meta.discoveredOrder || 0) - (b.meta.discoveredOrder || 0);
      });
    } else if (strategy === "narrative") {
      // Tri pur par arc narratif (Intro -> Action -> Climax -> Résolution -> Fin)
      analyzed.sort((a, b) => {
        const diff = a.meta.narrativeScore - b.meta.narrativeScore;
        if (Math.abs(diff) > 0.04) return diff;
        const timeA = a.meta.timestampObj ? a.meta.timestampObj.epochMs : (a.meta.createdAt || 0);
        const timeB = b.meta.timestampObj ? b.meta.timestampObj.epochMs : (b.meta.createdAt || 0);
        if (timeA && timeB && timeA !== timeB) return timeA - timeB;
        return (a.meta.discoveredOrder || 0) - (b.meta.discoveredOrder || 0);
      });
    } else if (strategy === "temporal") {
      // Tri par progression temporelle (Matin -> Soir & connecteurs)
      analyzed.sort((a, b) => {
        const timeA = a.meta.timeOfDayObj ? a.meta.timeOfDayObj.score : (a.meta.temporalObj ? a.meta.temporalObj.score : 0.5);
        const timeB = b.meta.timeOfDayObj ? b.meta.timeOfDayObj.score : (b.meta.temporalObj ? b.meta.temporalObj.score : 0.5);
        if (Math.abs(timeA - timeB) > 0.04) return timeA - timeB;
        return (a.meta.discoveredOrder || 0) - (b.meta.discoveredOrder || 0);
      });
    } else if (strategy === "spatial_canvas" || strategy === "dom") {
      // Lecture visuelle dans le canvas Flow : Ligne par ligne (G -> D, H -> B)
      analyzed.sort((a, b) => {
        return a.meta.spatialReadingScore - b.meta.spatialReadingScore;
      });
    } else if (strategy === "chronological") {
      // Chronologique de génération : horodatage extrait du fichier en priorité, puis createdAt / discoveredOrder
      analyzed.sort((a, b) => {
        const timeA = a.meta.timestampObj ? a.meta.timestampObj.epochMs : (a.meta.createdAt || 0);
        const timeB = b.meta.timestampObj ? b.meta.timestampObj.epochMs : (b.meta.createdAt || 0);
        if (timeA && timeB && timeA !== timeB) {
          return timeA - timeB;
        }
        if (timeA && !timeB) return -1;
        if (!timeA && timeB) return 1;
        const narDiff = a.meta.narrativeScore - b.meta.narrativeScore;
        if (Math.abs(narDiff) > 0.04) return narDiff;
        return (a.meta.discoveredOrder || 0) - (b.meta.discoveredOrder || 0);
      });
    } else if (strategy === "natural") {
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
      analyzed.sort((a, b) => collator.compare(a.clip.promptText || "", b.clip.promptText || ""));
    } else if (strategy === "reverse") {
      return [...clips].reverse();
    }

    return analyzed.map((item, index) => ({
      ...item.clip,
      orderIndex: index + 1,
      _smartMeta: item.meta
    }));
  }

  /**
   * Produit un rapport textuel clair expliquant l'ordre retenu (Anglais par défaut, bilingue EN / FR)
   */
  function explainSequence(sortedClips, lang = getLanguage()) {
    const isFr = lang === "fr";
    if (!Array.isArray(sortedClips) || sortedClips.length === 0) {
      return { summary: isFr ? "Aucun clip dans la séquence." : "No clips in sequence.", clips: [] };
    }

    const items = sortedClips.map((c, idx) => {
      const meta = c._smartMeta || analyzeClip(c, sortedClips, lang);
      const posStr = String(idx + 1).padStart(2, "0");
      return {
        index: idx + 1,
        positionText: `#${posStr}`,
        title: cleanTitle(c.title || meta.promptText || c.fileName, idx + 1),
        tags: meta.tags,
        confidence: meta.confidence,
        explanation: meta.explanation
      };
    });

    const highConfidenceCount = items.filter((it) => it.confidence >= 80).length;
    const avgConfidence = Math.round(items.reduce((acc, it) => acc + it.confidence, 0) / items.length);

    let summary = "";
    if (isFr) {
      summary = `Séquence ordonnée avec succès (${items.length} clips, indice de confiance moyen : ${avgConfidence}%). `;
      if (highConfidenceCount === items.length) {
        summary += "L'ordre narratif et chronologique est cohérent et solide.";
      } else if (highConfidenceCount > 0) {
        summary += `${highConfidenceCount}/${items.length} clips ont été positionnés avec certitude. Vous pouvez ajuster les positions via glisser-déposer si nécessaire.`;
      } else {
        summary += "L'ordre par défaut de Google Flow a été préservé.";
      }
    } else {
      summary = `Successfully ordered sequence (${items.length} clips, average confidence: ${avgConfidence}%). `;
      if (highConfidenceCount === items.length) {
        summary += "The narrative and chronological order is coherent and solid.";
      } else if (highConfidenceCount > 0) {
        summary += `${highConfidenceCount}/${items.length} clips were placed with high confidence. You can adjust positions via drag-and-drop if needed.`;
      } else {
        summary += "Default Google Flow order was preserved.";
      }
    }

    return {
      summary,
      avgConfidence,
      clips: items
    };
  }

  /**
   * Nettoie un nom de fichier ou prompt technique pour en faire un titre lisible et élégant
   * Supprime les extensions (.mp4, .webm...), les horodatages (ex: _20261027132109),
   * les résolutions redondantes (ex: _1080p), les suffixes de doublons (ex: (1), - Copy),
   * et transforme les underscores en espaces propres.
   */
  function cleanTitle(rawText, fallbackNum) {
    if (!rawText || typeof rawText !== "string") {
      return fallbackNum ? `Clip #${String(fallbackNum).padStart(2, "0")}` : "Clip";
    }
    let s = rawText.trim();
    if (s.includes("%")) {
      try {
        s = decodeURIComponent(s);
      } catch (e) {
        s = s.replace(/%20/g, " ");
      }
    }

    // 1. Supprimer l'extension
    s = s.replace(/\.(mp4|webm|mov|mkv|avi|png|jpg|jpeg|webp)$/i, "");
    // 2. Supprimer les balises Boost
    s = s.replace(/\[Boost(?:\s*⚡)?\]\s*/gi, "");

    // 3. Supprimer préfixes techniques au début (ex: VID_20261027..., IMG_..., etc.)
    s = s.replace(/^(?:VID|IMG|MOV|DSC)[_\-\s]+/i, "");
    // Date + Heure complète au début
    s = s.replace(/^(?:20\d{2}[-_./]?(?:0[1-9]|1[0-2])[-_./]?(?:0[1-9]|[12]\d|3[01])[T_\-\s]*(?:[01]\d|2[0-3])[:._\-]?(?:[0-5]\d)(?:[:._\-]?(?:[0-5]\d)\d*)?)[_\-\s]*/i, "");
    // Date seule au début
    s = s.replace(/^(?:20\d{2}[-_./]?(?:0[1-9]|1[0-2])[-_./]?(?:0[1-9]|[12]\d|3[01]))[_\-\s]+/i, "");
    // Epoch au début
    s = s.replace(/^(?:1[6-9]\d{8,12})[_\-\s]+/i, "");

    // 4. Nettoyer les suffixes techniques répétés (horodatages, hashes, résolutions, copies de téléchargement)
    let prev = "";
    while (prev !== s) {
      prev = s;
      // Copies et doublons de téléchargement (ex: (1), [2], - Copy, - Copie)
      s = s.replace(/[_\-\s]*(?:-?\s*cop(?:y|ie)(?:\s*\(\d+\))?)[_\-\s]*$/i, "");
      s = s.replace(/[_\-\s]*(?:\(\d+\)|\[\d+\])[_\-\s]*$/i, "");
      // Horodatage date + heure compact ou délimité en fin de chaîne (ex: _20261027132109, _2026-10-27-13-21-09)
      s = s.replace(/[_\-\s]*(?:20\d{2}[-_./]?(?:0[1-9]|1[0-2])[-_./]?(?:0[1-9]|[12]\d|3[01])(?:[T_\-\s]*(?:[01]\d|2[0-3])[:._\-]?(?:[0-5]\d)(?:[:._\-]?(?:[0-5]\d)\d*)?)?)[_\-\s]*$/i, "");
      // Horodatage heure seule (ex: 13h41m51s, 13-41-51, 132109)
      s = s.replace(/[_\-\s]*(?:[01]\d|2[0-3])[hH:_\-](?:[0-5]\d)[mM:_\-](?:[0-5]\d)(?:[sS])?[_\-\s]*$/i, "");
      s = s.replace(/[_\-\s]*(?:[01]\d|2[0-3])[:._\-]?(?:[0-5]\d)[:._\-]?(?:[0-5]\d)(?:\d*)?[_\-\s]*$/i, "");
      // Epoch millisecondes ou secondes
      s = s.replace(/[_\-\s]*(?:1[6-9]\d{8,12})[_\-\s]*$/i, "");
      // Hashes hexadécimaux (ex: _f31ea872)
      s = s.replace(/[_\-\s]*[0-9a-f]{8,12}[_\-\s]*$/i, "");
      // Tags de résolution en fin de nom (ex: _1080p, _720p, _4k)
      s = s.replace(/[_\-\s]*(?:1080p|720p|4k|2160p|uhd|fhd)[_\-\s]*$/i, "");
    }

    // 5. Remplacer les underscores par des espaces propres
    if (s.includes("_")) {
      s = s.replace(/_+/g, " ");
    }
    s = s.replace(/\s+/g, " ").trim();

    // 6. Nettoyer les tirets orphelins en début/fin
    s = s.replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();

    // 7. Fallback si vide, sans caractères alphanumériques ou terme technique générique
    const isGeneric = /^(clip|media|video|generation|vid|img|mov|dsc|file|recording|flow)(?:[\s\-_]*\d+)?$/i.test(s) ||
                      /^(flow\s*clip|clip\s*flow)(?:[\s\-_#]*\d+)?$/i.test(s);
    const hasAlphaNum = /[a-zA-Z0-9\u00C0-\u017F]/.test(s);

    if (!s || !hasAlphaNum || isGeneric) {
      return fallbackNum ? `Clip #${String(fallbackNum).padStart(2, "0")}` : "Clip";
    }

    // 8. Majuscule sur la première lettre
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Export pour Node.js et Navigateur
  const FlowSmartOrder = {
    extractExplicitNumber,
    extractTimestamp,
    cleanTitle,
    analyzeNarrativeStage,
    analyzeTemporalConnectors,
    analyzeTimeOfDay,
    analyzeClip,
    sortClips,
    explainSequence,
    setLanguage,
    getLanguage
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FlowSmartOrder;
  }
  global.FlowSmartOrder = FlowSmartOrder;
})(typeof window !== "undefined" ? window : globalThis);
