# Flow Video Merger & Web Studio 🎬⚡

[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](manifest.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](manifest.json)
[![Compatible](https://img.shields.io/badge/Compatible-Google_Flow_%26_Veo-0F9D58.svg)](https://flow.google)
[![Tests](https://img.shields.io/badge/tests-passing_100%25-brightgreen.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

> **The ultimate Chrome extension to capture, intelligently organize, preview, and stitch Google Flow & Veo videos into high-quality films directly in your browser.**

**Flow Video Merger** bridges Google Flow (`flow.google`, `flow.google.com`, `labs.google/fx/tools/flow`) with a desktop-grade video editor. It automatically discovers your generated clips — including full-resolution **`/boost` 4K** generations — sequences them with an advanced multi-signal **AI narrative & chronological engine**, and renders a single seamless video with **native Veo audio** via a **Side Panel** or a dedicated **Fullscreen Web Studio**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture & How It Works](#-architecture--how-it-works)
- [Installation Guide](#-installation-guide-chrome-30-seconds)
- [How to Use](#-how-to-use)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Repository Structure](#-repository-structure)
- [Automated Test Suite](#-automated-test-suite)
- [Manifest V3 Permissions](#-manifest-v3-permissions-transparency)
- [Documentation en Français](#-documentation-en-français)
- [License](#-license)

---

## ✨ Key Features

### 1. ⚡ Full Support for `/boost` 4K & Upscaled Clips
- **Smart Boost Recovery**: Automatically detects and prioritizes 1080p / 4K Boost clips over draft previews (`storage.googleapis.com/veo-flow/*`).
- **In-Place Seamless Upgrade**: Replaces draft clips with boosted assets while strictly preserving sequence ordering (`#01`, `#02`...).
- **Chrome IPC 32MB Bypass**: Overcomes Chrome's message size limit with an internal 2MB binary chunking protocol.
- **Declarative Net Request CORP Bypass**: Bundled rule sets bypass `net::ERR_BLOCKED_BY_RESPONSE.NotSameSite` without compromising browser security.

### 2. 🧠 Multi-Signal AI Smart Order Engine (`smart-order.js`)
Automatically reconstructs logical video sequences using five complementary analysis signals:
- **Explicit Scene Numbering**: Understands `Scene 1`, `Plan #2`, `Shot 03`, `Part IV`, `[1/4]`, and filename prefixes/suffixes.
- **Dramatic Narrative Arc** (Bilingual English & French):
  - *Phase 1 (Introduction / Exposition)*: `intro`, `dawn`, `opening shot`, `once upon a time`, `aube`...
  - *Phase 2 (Journey / Progression)*: `journey`, `walking`, `exploration`, `voyage`, `marche`...
  - *Phase 3 (Climax / Action)*: `battle`, `fight`, `explosion`, `turning point`, `affrontement`...
  - *Phase 4 (Resolution / Transition)*: `aftermath`, `sunset`, `calm returns`, `crépuscule`...
  - *Phase 5 (Ending / Denouement)*: `ending`, `credits`, `fade to black`, `night`, `fin`, `adieu`...
- **Timestamp & Timecode Extraction**: Parses 15+ date/time patterns (`HH:MM:SS`, `YYYYMMDD_HHMMSS`, etc.).
- **Temporal & Day/Night Progression**: Dawn ➔ Morning ➔ Noon ➔ Golden Hour ➔ Sunset ➔ Night.
- **Flow Canvas 2D Spatial Layout**: Top-to-bottom, left-to-right reading order.
- **Interactive AI Confidence Report**: Displays average confidence score (%) and contextual justifications for every clip.

### 3. 🎬 Ergonomic Fullscreen Web Studio (`Flow Video Studio`)
- **Sequential Storyboard Grid**: Large card previews, numbered badges (`#01`, `#02`...), `/boost` 4K indicators, narrative tags, and fluid drag-and-drop handles.
- **Interactive Multi-Clip Timeline**:
  - Live graduated ruler (`00:00.0`).
  - Proportional clip blocks matching duration.
  - Scrubbable playhead with real-time seeking across clips.
- **Continuous Sequence Player ("Play All")**: Uninterrupted multi-clip playback, live timecodes, and resilient auto-advance if a clip is buffering.
- **Two-Way Real-Time Synchronization**: Changes in the Web Studio immediately sync with the Chrome Side Panel and the Google Flow canvas badges.

### 4. 🎞️ Native Veo Audio & Video Stitched Assembly
- **Zero-Drop Client-Side Rendering**: Hardware-accelerated canvas merger with native Web Audio mixing.
- **Export Formats**:
  - Auto (matches source aspect ratio)
  - 4K Ultra HD (3840×2160 Landscape)
  - 1080p Full HD (1920×1080 Landscape)
  - 720p HD (1280×720 Landscape)
  - 4K Vertical Shorts / Reels (2160×3840)
  - 1080p Vertical Shorts / Reels (1080×1920)
- **Transitions**: Hard cut, Smooth Crossfade (`0.25s`), Cinematic Dissolve (`0.5s`).
- **Configurable Bitrates**: Standard (5 Mbps), High (10 Mbps), Ultra 4K (20 Mbps).

---

## 🏗️ Architecture & How It Works

```
Google Flow Tab (flow.google)
    ├── flow-page-bridge.js (MAIN World: API interception & Blob protection)
    └── content.js (ISOLATED World: Shadow DOM traversal, clip badges)
           │
           │ Chrome Extension Messaging (2MB chunked binary IPC)
           ▼
    background.js (Service Worker & declarativeNetRequest CORP rules)
           │
           ├──────────────────────────┐
           ▼                          ▼
    sidepanel.html / js        studio.html / js (Fullscreen Tab)
    (Quick panel workflow)     (Interactive Storyboard + Timeline Editor)
           │                          │
           └──────────┬───────────────┘
                      ▼
           smart-order.js (Multi-signal AI sequencing)
                      ▼
           Canvas + Web Audio Rendering Pipeline
                      ▼
           Single Final Merged MP4/WebM Video
```

---

## 🚀 Installation Guide (Chrome, 30 seconds)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/leonbathie/flow-video-merger.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** (*Charger l'extension non empaquetée*).
5. Select the `flow-video-merger` folder.
6. Pin the **Flow Video Merger** icon to your Chrome toolbar.

---

## 🎯 How to Use

1. Open [Google Flow](https://flow.google/) and generate your video clips.
2. Click the extension icon in your Chrome toolbar to open the **Side Panel**, or click **⛶ Open Web Studio** for the full tab interface.
3. Click **🔍 Capture Flow clips** to automatically ingest all clips from your current Flow project, or click the **+ Sequence** badges directly on Flow cards.
4. Click **✨ Reorder with AI** to let the Smart Ordering engine sequence your narrative automatically (or drag and drop to reorder manually).
5. Press **▶ Play All** to preview your uninterrupted sequence.
6. Select your desired output resolution and transition, then click **🎬 Merge & Export Video**.

---

## ⌨️ Keyboard Shortcuts

When using the **Flow Video Studio** fullscreen interface:

| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause continuous sequence playback |
| `Arrow Left` (`←`) | Jump to previous clip |
| `Arrow Right` (`→`) | Jump to next clip |
| `Home` | Restart sequence from clip `#01` |
| `Delete` / `Backspace` | Remove currently selected clip from sequence |
| `Escape` | Deselect clip / Close AI explanations drawer |
| `Enter` (inside prompt) | Confirm prompt text edit and blur |

*(Shortcuts are automatically suspended when typing inside text inputs).*

---

## 📂 Repository Structure

```
flow-video-merger/
├── manifest.json             # Manifest V3 extension configuration
├── background.js             # Service worker, session state & binary IPC broker
├── content.js                # In-page detector, Shadow DOM walker, UI badges
├── flow-page-bridge.js       # Main-world script intercepting Flow generation APIs
├── rules.json                # declarativeNetRequest rules for Cross-Origin isolation
├── smart-order.js            # Multi-signal AI sequencing engine
├── i18n.js                   # Bilingual dictionary (English & French)
├── sidepanel.html            # Chrome Side Panel markup
├── sidepanel.css             # Side Panel styles (Arc/Linear dark theme)
├── sidepanel.js              # Side Panel controller & assembler
├── studio.html               # Fullscreen Web Studio interface
├── studio.css                # Web Studio styles (Storyboard & Timeline)
├── studio.js                 # Web Studio controller, scrubber & merger
├── icons/                    # Vector-rendered extension icons (16, 48, 128px)
├── package.json              # Project metadata & npm test scripts
├── .gitignore                # Git exclusions (OS files, Chrome metadata, packages)
├── LICENSE                   # MIT License
├── test-all.js               # Unified runner for all 12 test suites
└── test-*.js                 # Comprehensive automated test suites (12 suites)
```

---

## 🧪 Automated Test Suite

Every module is rigorously tested using Node.js without requiring a browser runner:

```bash
# Run all 12 test suites at once with summary metrics
npm test
# or
node test-all.js

# Run individual test suites
node test-suite-deep.js
node test-studio-and-smart-ordering.js
node test-smart-order.js
node test-timestamp-and-play-all.js
node test-break-and-verify-flow-retrieval.js
node test-flow-native-metadata.js
node test-extension-design-refresh.js
node test-i18n-and-bilingual.js
node test-not-same-site-fix.js
node test-break-and-verify.js
node test-flow-retrieval-pipeline.js
node test-generative-ui-cleanup.js
```

### Coverage Highlights
- ✅ Closed Shadow DOM traversal and Web Component hydration.
- ✅ Google XSSI prefix stripping (`)]}'`).
- ✅ 40MB 4K chunked binary transmission over Chrome IPC.
- ✅ Dramatic narrative arc sorting (FR & EN).
- ✅ Mixed timestamp patterns and explicit anchor positions.
- ✅ Two-way real-time state synchronization between Side Panel and Web Studio.
- ✅ Full keyboard shortcut accessibility without button conflict.

---

## 🔒 Manifest V3 Permissions Transparency

| Permission | Purpose |
| :--- | :--- |
| `sidePanel` | Displays the compact video manager right next to Google Flow. |
| `storage` | Stores user sequences and settings locally on your machine. |
| `downloads` | Downloads the final stitched `.mp4` / `.webm` video to your computer. |
| `offscreen` | Video frame decoding in headless workers for smooth export. |
| `declarativeNetRequest` | Prevents CORP blocking on Google Cloud video storage endpoints. |
| `scripting` / `activeTab` | Inspects Flow video elements only when requested by the user. |

---

## 🇫🇷 Documentation en Français

<details>
<summary><strong>Cliquez ici pour lire la documentation en français</strong></summary>

### Description
**Flow Video Merger** est une extension Chrome (Manifest V3) permettant de capturer, ordonner intelligemment et fusionner les vidéos générées dans **Google Flow** (`flow.google`, `flow.google.com`, `labs.google/fx/tools/flow`) — y compris les vidéos haute résolution **/boost 4K** — directement dans votre navigateur, via un **Side Panel** ou un **Studio Web Plein Écran**.

### Fonctionnalités Clés
1. **Support complet /boost 4K & Upscale ⚡** :
   - Détection et remplacement en place des brouillons par les rendus 4K.
   - Traversée récursive du Shadow DOM sans doublon.
   - Streaming IPC par blocs de 2 Mo évitant la limite Chrome de 32 Mo.
   - Règles anti-CORP éliminant les erreurs `net::ERR_BLOCKED_BY_RESPONSE.NotSameSite`.
2. **Moteur d'Ordre Intelligent (`smart-order.js`)** :
   - Détection des numéros de scènes (`Scène 1`, `Plan #2`, `Shot 3`...).
   - Analyse de l'arc dramatique en 5 phases (Exposition, Voyage, Climax, Résolution, Fin).
   - Reconnaissance d'horodatages multiples et progression temporelle (Aube ➔ Nuit).
   - Ordre de lecture spatial 2D sur le canvas Flow.
   - Rapport d'explications IA avec indice de confiance.
3. **Studio Web Plein Écran (`studio.html`)** :
   - Vue Storyboard et vue Piste de Montage (Timeline) avec timecode dynamique.
   - Lecteur séquentiel continu ("Lire Tout").
   - Synchronisation bidirectionnelle instantanée avec le Panneau Latéral.
4. **Assemblage Vidéo + Audio natif Veo** :
   - Résolutions : Auto, 4K UHD, 1080p, 720p, 4K Vertical Shorts (9:16), 1080p Shorts.
   - Transitions : Coupure nette, Fondu doux 0.25s, Fondu cinéma 0.5s.
   - Débit ajustable jusqu'à 20 Mbps.

### Installation Rapide
1. Téléchargez ou clonez ce dépôt : `git clone https://github.com/leonbathie/flow-video-merger.git`
2. Ouvrez `chrome://extensions/` dans Chrome et activez le **Mode développeur**.
3. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier.
4. Rendez-vous sur [Google Flow](https://flow.google/) et commencez à monter vos vidéos !

</details>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for Google Flow & Veo creators by [Ousmane Ba (leonbathie)](https://github.com/leonbathie).
