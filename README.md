# 🎬 Flow Video Merger & Web Studio ⚡

<p align="center">
  <img src="icons/icon128.png" alt="Flow Video Merger Logo" width="96" height="96" />
</p>

<h3 align="center">The #1 Free, Open-Source Video Sequencer & Stitcher for Google Flow, Veo & Veo 2</h3>

<p align="center">
  <strong>Transform scattered Google Flow AI clips into seamless, cinematic 4K films in 1-click.</strong><br/>
  Auto-detect <code>/boost</code> 4K assets, sequence scenes with AI narrative logic, preview with zero buffering, and export with native Veo audio — 100% locally in your browser.
</p>

<p align="center">
  <a href="https://github.com/leonbathie/flow-video-merger/stargazers"><img src="https://img.shields.io/github/stars/leonbathie/flow-video-merger?style=for-the-badge&logo=github&color=FFD700" alt="GitHub Stars" /></a>
  <a href="https://github.com/leonbathie/flow-video-merger/releases"><img src="https://img.shields.io/github/v/release/leonbathie/flow-video-merger?style=for-the-badge&color=blue" alt="Latest Release" /></a>
  <a href="manifest.json"><img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome MV3" /></a>
  <a href="https://flow.google"><img src="https://img.shields.io/badge/Compatible-Google_Flow_%7C_Veo_%7C_Veo_2-0F9D58?style=for-the-badge&logo=google&logoColor=white" alt="Google Flow & Veo Compatible" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" /></a>
  <a href="#-automated-test-suite"><img src="https://img.shields.io/badge/Tests-14%2F14_Passing_100%25-brightgreen?style=for-the-badge" alt="Tests 100% Passing" /></a>
  <img src="https://img.shields.io/badge/Privacy-100%25_Local_Client--Side-blueviolet?style=for-the-badge" alt="100% Local Privacy" />
</p>

---

<p align="center">
  <a href="#-quick-start-installation-30-seconds"><b>🚀 Quick Install (30s)</b></a> •
  <a href="#-why-flow-video-merger-the-problem--the-solution"><b>💡 Why This Tool?</b></a> •
  <a href="#-comparison-flow-video-merger-vs-traditional-editors"><b>📊 Comparison</b></a> •
  <a href="#-key-features"><b>✨ Features</b></a> •
  <a href="#-fullscreen-web-studio-preview"><b>🖥️ Web Studio</b></a> •
  <a href="#-faq--troubleshooting-google--github-search"><b>❓ FAQ & SEO</b></a> •
  <a href="#-documentation-en-français"><b>🇫🇷 En Français</b></a>
</p>

---

## 💡 Why Flow Video Merger? (The Problem & The Solution)

If you create AI videos with **Google Flow** (`flow.google`, `labs.google/fx/tools/flow`) powered by **Google Veo & Veo 2**, you know the pain:

| The Pain with Default Google Flow ❌ | The Flow Video Merger Solution ⚡ |
| :--- | :--- |
| **Scattered 5s–8s clips**: Videos are isolated generation cards with no timeline or sequence player. | **1-Click Sequence Capture**: Detects and extracts all clips across open and closed Shadow DOMs instantly. |
| **30+ minutes wasted per scene**: Downloading 10+ clips manually, opening Premiere/CapCut, renaming, re-importing, re-ordering. | **Instant 3-Click Assembly**: Open Studio ➔ Click *"✨ AI Reorder"* ➔ Click *"🎬 Merge & Export 4K"* in under 30 seconds. |
| **Lost 4K `/boost` assets**: High-res upscale clips are buried in storage buckets while low-res drafts stay on canvas. | **Smart `/boost` 4K In-Place Upgrade**: Automatically detects 4K boosted clips and upgrades draft slots without altering sequence order. |
| **Clunky narrative order**: Prompts with "Scene 1", "Scene 2", or story arcs end up disordered. | **AI Multi-Signal Smart Ordering**: Understands scene numbers, dramatic 5-phase story arcs (FR/EN), and timestamps. |
| **CORP playback errors**: Google Cloud storage links throw `net::ERR_BLOCKED_BY_RESPONSE.NotSameSite`. | **Built-in Declarative Net Request**: Seamlessly unblocks cross-origin media headers without compromising browser security. |
| **Lost Veo audio**: Manual canvas stitching often drops or desyncs generated soundscapes. | **Native Web Audio Synchronization**: Zero-drop audio merging preserving Veo's synthetic soundscapes and voiceovers. |
| **Cloud upload & privacy risks**: Third-party online editors require re-uploading private prompts and footage. | **100% Local & Client-Side**: Zero servers, zero telemetry, zero accounts. Everything stays on your machine. |

---

## 📊 Comparison: Flow Video Merger vs Traditional Editors

| Feature | Default Google Flow | CapCut / Premiere / DaVinci | FFmpeg CLI | **Flow Video Merger & Studio** 🚀 |
| :--- | :---: | :---: | :---: | :---: |
| **Direct Browser Integration** | ❌ None | ❌ None (external app) | ❌ None | ✅ **Built right into Google Flow** |
| **Automatic Clip Capture** | ❌ Manual 1-by-1 download | ❌ Manual import | ❌ Manual scripting | ✅ **1-Click DOM & Canvas Scan** |
| **Auto `/boost` 4K Detection** | ❌ Manual URL hunting | ❌ Manual file replacement | ❌ Manual matching | ✅ **Automatic In-Place 4K Upgrade** |
| **AI Narrative & Chronological Sorting** | ❌ Manual | ❌ Manual drag-and-drop | ❌ Alphabetical / manual | ✅ **AI 5-Phase Arc + Scene Numbering** |
| **Continuous "Play All" Preview** | ❌ Single clip preview only | ✅ Requires project setup | ❌ No GUI preview | ✅ **Instant zero-buffer sequence player** |
| **Shorts / Reels 9:16 Vertical Export** | ❌ Manual crop | ⚠️ Manual framing | ⚠️ Complex filter graph | ✅ **1-Click 4K & 1080p Vertical Mode** |
| **Veo Native Audio Stitched** | ❌ Separate files | ⚠️ Manual sync | ⚠️ Stream re-encoding | ✅ **Automated Web Audio Mixing** |
| **Zero Software Installation** | ✅ | ❌ Heavy 2GB–10GB installs | ❌ Terminal dependency | ✅ **Lightweight Chrome Extension** |
| **Cost & Privacy** | Free tier / Gemini | Paid subscriptions / Cloud | Free / Local | ✅ **100% Free & Open-Source (MIT)** |

---

## 🖥️ Fullscreen Web Studio Preview

Flow Video Merger provides two fluid workspaces: a lightweight **Chrome Side Panel** for quick captures, and a desktop-grade **Fullscreen Web Studio** (`studio.html`):

```
+---------------------------------------------------------------------------------------------------------+
|  [🎬 Flow Video Studio]    Sequence: 5 clips | 00:28.4 | 4K Boosted    [▶ Play All]  [✨ AI Order]  [🎬 Export] |
+---------------------------------------------------------------------------------------------------------+
|  STORYBOARD GRID                                                                                        |
|  +--------------------+   +--------------------+   +--------------------+   +--------------------+      |
|  | #01  [4K BOOST] ⚡ |   | #02  [4K BOOST] ⚡ |   | #03  [DRAFT]       |   | #04  [4K BOOST] ⚡ |      |
|  | [ Video Thumbnail ]|   | [ Video Thumbnail ]|   | [ Video Thumbnail ]|   | [ Video Thumbnail ]|      |
|  | 00:00 - 00:06 (6s) |   | 00:06 - 00:12 (6s) |   | 00:12 - 00:18 (6s) |   | 00:18 - 00:24 (6s) |      |
|  | "Scene 1: Dawn..." |   | "Scene 2: Journey" |   | "Scene 3: Climax"  |   | "Scene 4: Sunset"  |      |
|  | [▲] [▼] [✕ Remove] |   | [▲] [▼] [✕ Remove] |   | [▲] [▼] [✕ Remove] |   | [▲] [▼] [✕ Remove] |      |
|  +--------------------+   +--------------------+   +--------------------+   +--------------------+      |
+---------------------------------------------------------------------------------------------------------+
|  INTERACTIVE MULTI-CLIP TIMELINE & RULER                                                                |
|  Timecode: 00:14.2 / 00:28.4  ==========================▼=============================================  |
|  [00:00]                 [00:06]                 [00:12]                 [00:18]               [00:28]  |
|  |--- Clip #01 (6.0s) ---|--- Clip #02 (6.0s) ---|--- Clip #03 (6.0s) ---|--- Clip #04 (6.0s) --|----|  |
|  [⏮ First]  [◀ Prev]  [ ▶ Play / Pause (Space) ]  [Next ▶]  [Last ⏭]   Resolution: [ 4K UHD 3840x2160 ▾ ] |
+---------------------------------------------------------------------------------------------------------+
```

---

## ✨ Key Features

### 1. ⚡ Full Support for `/boost` 4K & Upscaled Clips
- **Smart Boost Recovery**: Automatically discovers and prioritizes full 1080p and 4K `/boost` clips over low-resolution draft previews (`storage.googleapis.com/veo-flow/*`).
- **In-Place Seamless Upgrade**: Replaces draft clips with boosted assets while strictly preserving sequence ordering (`#01`, `#02`...).
- **Chrome IPC 32MB Bypass**: Overcomes Chrome's extension message size limit with an internal 2MB binary chunking protocol.
- **Declarative Net Request CORP Bypass**: Bundled rule sets bypass `net::ERR_BLOCKED_BY_RESPONSE.NotSameSite` without disabling security.

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
- **Export Formats & Aspect Ratios**:
  - **Auto**: Matches original source aspect ratio.
  - **4K Ultra HD**: 3840×2160 (16:9 Landscape)
  - **1080p Full HD**: 1920×1080 (16:9 Landscape)
  - **720p HD**: 1280×720 (16:9 Landscape)
  - **4K Vertical**: 2160×3840 (9:16 Shorts / Reels / TikTok)
  - **1080p Vertical**: 1080×1920 (9:16 Shorts / Reels / TikTok)
- **Cinematic Transitions**: Hard Cut, Smooth Crossfade (`0.25s`), Cinematic Dissolve (`0.5s`).
- **Configurable Bitrates**: Standard (5 Mbps), High (10 Mbps), Ultra 4K (20 Mbps).

---

## 🚀 Quick Start Installation (30 Seconds)

### Method 1: Download Ready-to-Use ZIP (Recommended for Creators)

No command line, Git, or Node.js required:

1. Click **[⬇️ Download Latest Release ZIP](https://github.com/leonbathie/flow-video-merger/releases)** (or download this repo as ZIP via the green **Code ➔ Download ZIP** button above).
2. Unzip the downloaded file onto your computer (e.g. in your `Downloads` or `Documents` folder).
3. Open Google Chrome and type `chrome://extensions/` into the URL address bar.
4. Enable the **Developer mode** toggle in the top-right corner.
5. Click the **Load unpacked** (*Charger l'extension non empaquetée*) button on the top-left.
6. Select the unzipped `flow-video-merger-extension` folder.
7. Click the **Extensions puzzle piece** icon in Chrome and **Pin 📌 Flow Video Merger** to your toolbar.

### Method 2: For Developers (Git Clone)

```bash
# Clone the repository
git clone https://github.com/leonbathie/flow-video-merger.git
cd flow-video-merger

# Run automated verification tests
npm test

# Load the folder in chrome://extensions/ with Developer Mode turned ON
```

---

## 🎯 How to Use (Step-by-Step Guide)

1. **Open Google Flow**: Navigate to [flow.google](https://flow.google/) (or `labs.google/fx/tools/flow`) and open your video project.
2. **Open Flow Video Merger**:
   - Click the extension icon in your Chrome toolbar to open the **Side Panel**, OR
   - Click **⛶ Open Web Studio** for the full tab storyboard & timeline editor.
3. **Capture Your Clips**:
   - Click **🔍 Capture Flow clips** to scan and ingest all generated clips automatically.
   - Or click the **+ Sequence** badges directly on video cards in your Flow canvas.
4. **Organize & AI Order**:
   - Click **✨ Reorder with AI** to let the multi-signal narrative engine analyze prompt text, scene numbers, and temporal progression.
   - Or use drag-and-drop handles or **▲ / ▼** buttons to fine-tune order manually.
5. **Continuous Preview ("Play All")**:
   - Press **Space** or click **▶ Play All** to watch the entire sequence without interruption.
   - Scrub along the timeline ruler to inspect any exact timecode.
6. **Merge & Export**:
   - Choose your target resolution (up to **4K UHD** or **9:16 Vertical Shorts**).
   - Choose your transition (Cut, Crossfade 0.25s, Dissolve 0.5s).
   - Click **🎬 Merge & Export Video**. Your browser stitches the video with native Veo audio and triggers a direct `.mp4` / `.webm` download!

---

## ⌨️ Keyboard Shortcuts (Web Studio)

| Shortcut Key | Action |
| :--- | :--- |
| `Space` | Play / Pause continuous sequence playback |
| `Arrow Left` (`←`) | Jump to previous clip in sequence |
| `Arrow Right` (`→`) | Jump to next clip in sequence |
| `Home` | Restart sequence playback from clip `#01` |
| `Delete` / `Backspace` | Remove currently selected clip from sequence |
| `Escape` | Deselect clip / Close AI explanations drawer |
| `Enter` (inside prompt) | Save edited prompt text and blur |

*(Shortcuts are automatically paused when typing inside text boxes).*

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
├── test-all.js               # Unified runner for all 14 test suites
└── test-*.js                 # Comprehensive automated test suites (14 suites)
```

---

## 🧪 Automated Test Suite

Every module is rigorously tested using Node.js without requiring a browser runner:

```bash
# Run all 14 test suites at once with summary metrics
npm test
# or
node test-all.js
```

### Coverage Highlights (100% Passing)
- ✅ Closed Shadow DOM traversal and Web Component hydration.
- ✅ Google XSSI prefix stripping (`)]}'`).
- ✅ 40MB 4K chunked binary transmission over Chrome IPC.
- ✅ Dramatic narrative arc sorting (FR & EN).
- ✅ Mixed timestamp patterns and explicit anchor positions.
- ✅ Two-way real-time state synchronization between Side Panel and Web Studio.
- ✅ Full keyboard shortcut accessibility without button conflict.
- ✅ Declarative Net Request CORP rule verification.

---

## 🔒 Manifest V3 Permissions Transparency

Flow Video Merger adheres strictly to the principle of least privilege:

| Permission | Purpose |
| :--- | :--- |
| `sidePanel` | Displays the compact video manager right next to Google Flow in Chrome. |
| `storage` | Stores your sequences and project preferences locally on your machine. |
| `downloads` | Saves the final stitched `.mp4` / `.webm` video directly to your computer. |
| `offscreen` | Frame-by-frame hardware-accelerated video decoding for stutter-free export. |
| `declarativeNetRequest` | Prevents CORP blocking on Google Cloud video storage endpoints (`storage.googleapis.com`). |
| `scripting` / `activeTab` | Inspects Flow video elements only on Google Flow tabs when requested by the user. |

---

## ❓ FAQ & Troubleshooting (Google & GitHub Search)

<details>
<summary><strong>Q: How do I merge multiple Google Flow clips into one continuous video?</strong></summary>

Install Flow Video Merger, open [Google Flow](https://flow.google/), click the extension icon to open the Side Panel or Web Studio, click **🔍 Capture Flow clips**, then click **🎬 Merge & Export Video**. The extension stitches all clips into a single video file directly in your browser.
</details>

<details>
<summary><strong>Q: Does Google Flow have a built-in sequence editor or export feature?</strong></summary>

As of 2025/2026, Google Flow does not provide a native multi-clip timeline editor or batch video merger. Flow Video Merger was built specifically to bridge this gap, offering a native-feeling timeline and sequence exporter directly inside Google Chrome.
</details>

<details>
<summary><strong>Q: How does the extension detect and handle `/boost` 4K videos?</strong></summary>

When you generate or upscale a clip with `/boost` in Google Flow, Google saves high-definition video assets to `storage.googleapis.com/veo-flow/*`. Flow Video Merger automatically detects these 4K assets through DOM observation and network interception, upgrading your draft clips in-place while keeping your sequence ordering intact.
</details>

<details>
<summary><strong>Q: Can I create 9:16 vertical videos for TikTok, YouTube Shorts, and Instagram Reels?</strong></summary>

Yes! In the Web Studio export settings, select **4K Vertical (2160×3840)** or **1080p Vertical (1080×1920)**. The canvas automatically centers and fits your clips for mobile vertical viewing.
</details>

<details>
<summary><strong>Q: How does the extension resolve `ERR_BLOCKED_BY_RESPONSE.NotSameSite`?</strong></summary>

Google Cloud video storage applies strict Cross-Origin Read Blocking (CORP). Flow Video Merger includes pre-configured `declarativeNetRequest` rules (`rules.json`) that adjust headers for Google video buckets, allowing seamless browser playback and canvas frame extraction without security compromises.
</details>

<details>
<summary><strong>Q: Are my prompts, videos, or account data uploaded to any external server?</strong></summary>

**No.** Flow Video Merger operates 100% locally on your computer. There are no external analytics, no cloud backends, no tracking, and no logins required.
</details>

---

## 🇫🇷 Documentation en Français

<details>
<summary><strong>Cliquez ici pour lire la documentation complète en français</strong></summary>

### Présentation
**Flow Video Merger & Web Studio** est l'extension Chrome (Manifest V3) incontournable pour tous les créateurs utilisant **Google Flow** (`flow.google`, `labs.google/fx/tools/flow`) et **Google Veo / Veo 2**.

Elle résout le principal manque de Google Flow : l'absence d'outil d'assemblage et de banc de montage séquentiel. En 1 clic, elle détecte vos générations, récupère les rendus **`/boost` 4K**, ordonne les scènes grâce à son **moteur narratif IA**, vous permet de visualiser la séquence continue avec le lecteur **"Lire Tout"**, et exporte un film complet haute définition avec **l'audio natif Veo** synchronisé.

---

### Pourquoi utiliser Flow Video Merger ?
- ⚡ **Gain de temps massif** : Finies les 30 minutes perdues à télécharger 15 fichiers `.mp4` séparés et les réimporter dans CapCut ou Premiere.
- 🎬 **Support 4K `/boost` automatique** : Vos clips brouillons sont automatiquement remplacés par les versions 4K haute résolution dès que le boost est terminé.
- 🧠 **Tri narratif intelligent (`smart-order.js`)** : Détection des numéros de plans (`Plan 1`, `Scène 2`, `Partie III`) et de l'arc dramatique (Exposition ➔ Voyage ➔ Climax ➔ Résolution ➔ Fin).
- 📱 **Formats Paysage & Shorts Verticaux** : Exportez en 16:9 (4K UHD, 1080p, 720p) ou en 9:16 pour TikTok, Instagram Reels et YouTube Shorts.
- 🔒 **100% Privé et Gratuit** : Tout est calculé dans votre navigateur via l'accélération matérielle. Aucun serveur externe, aucune donnée collectée.

---

### Installation Express en 3 Étapes (30 secondes)
1. **Téléchargez le ZIP** : Cliquez sur le bouton vert **Code ➔ Download ZIP** en haut de cette page (ou sur la [page Releases](https://github.com/leonbathie/flow-video-merger/releases)).
2. **Dézippez le dossier** sur votre ordinateur (par exemple dans `Téléchargements`).
3. **Dans Google Chrome** :
   - Rendez-vous sur `chrome://extensions/`.
   - Activez le **Mode développeur** (en haut à droite).
   - Cliquez sur **Charger l'extension non empaquetée** (en haut à gauche).
   - Sélectionnez le dossier dézippé `flow-video-merger-extension`.
   - Épinglez 📌 l'icône dans votre barre Chrome !

---

### Comment l'utiliser
1. Ouvrez [Google Flow](https://flow.google/) et créez vos scènes.
2. Ouvrez le **Panneau Latéral** ou cliquez sur **⛶ Ouvrir le Studio Web**.
3. Cliquez sur **🔍 Capturer les clips Flow** (ou cliquez sur les badges `+ Séquence` sur vos cartes de génération).
4. Cliquez sur **✨ Réordonner avec l'IA** pour structurer l'histoire.
5. Appuyez sur **Espace** pour lancer la prévisualisation continue ("Lire Tout").
6. Choisissez votre résolution (4K UHD ou Shorts 9:16) et cliquez sur **🎬 Fusionner & Exporter la vidéo**.

---

### Raccourcis Clavier du Studio Web
- `Espace` : Lecture / Pause de la séquence complète
- `Flèche Gauche` (`←`) : Clip précédent
- `Flèche Droite` (`→`) : Clip suivant
- `Début` (`Home`) : Revenir au clip `#01`
- `Suppr` / `Retour Arrière` : Supprimer le clip sélectionné de la séquence
- `Échap` : Désélectionner / Fermer le tiroir d'explications IA

</details>

---

## 🌟 Support the Project

If **Flow Video Merger** saved you time or helped you build awesome AI films with Google Flow and Veo:

- ⭐ **Star this repository** on GitHub (it helps other creators discover the tool!).
- 📢 Share it with fellow AI filmmakers on Twitter/X, Reddit (`r/GoogleVeo`, `r/aivideo`), and LinkedIn.
- 🐛 Found a bug or want a feature? Open an [Issue](https://github.com/leonbathie/flow-video-merger/issues) or submit a Pull Request!

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Developed with ❤️ for Google Flow & Veo creators by [Ousmane Ba (leonbathie)](https://github.com/leonbathie).
