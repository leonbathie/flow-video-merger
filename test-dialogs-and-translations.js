// Automated Test Suite: FlowDialog Modern Themed Modals & Bilingual Translations
// Verifies custom dialog implementation, prompt/confirm/alert lifecycles, and French/English translation parity.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TEST SUITE: FlowDialog Modern Modals & Full Bilingual Localization ===\n');

// ---------------------------------------------------------------------
// Test 1: Manifest V3 & Web Accessible Resources Declaration
// ---------------------------------------------------------------------
console.log('--- Test 1: Manifest V3 Web Resources & HTML Inclusions ---');

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const webResources = manifest.web_accessible_resources[0].resources;

assert.ok(webResources.includes('dialog.js'), 'manifest.json must declare dialog.js in web_accessible_resources');
assert.ok(webResources.includes('dialog.css'), 'manifest.json must declare dialog.css in web_accessible_resources');

const sidepanelHtml = fs.readFileSync(path.join(__dirname, 'sidepanel.html'), 'utf8');
const studioHtml = fs.readFileSync(path.join(__dirname, 'studio.html'), 'utf8');

assert.ok(sidepanelHtml.includes('dialog.css'), 'sidepanel.html must link dialog.css');
assert.ok(sidepanelHtml.includes('dialog.js'), 'sidepanel.html must load dialog.js');
assert.ok(studioHtml.includes('dialog.css'), 'studio.html must link dialog.css');
assert.ok(studioHtml.includes('dialog.js'), 'studio.html must load dialog.js');

console.log('✅ Test 1 PASSED: dialog.js & dialog.css correctly declared and linked in HTML.\n');

// ---------------------------------------------------------------------
// Test 2: Bilingual Translation Parity for All Dialog Keys
// ---------------------------------------------------------------------
console.log('--- Test 2: Bilingual Parity for Dialog Titles, Buttons & Messages ---');

const FlowI18n = require('./i18n.js');

const dialogKeys = [
  'dialog_confirm',
  'dialog_cancel',
  'dialog_ok',
  'dialog_got_it',
  'dialog_close',
  'dialog_clear_clips',
  'dialog_delete_scene',
  'dialog_create',
  'dialog_rename',
  'dialog_title_confirm',
  'dialog_title_clear_scene',
  'dialog_title_delete_scene',
  'dialog_title_new_scene',
  'dialog_title_rename_scene',
  'dialog_title_notice',
  'dialog_title_error',
  'dialog_title_no_videos',
  'dialog_title_open_flow',
  'prompt_new_scene',
  'prompt_new_scene_placeholder',
  'prompt_rename_scene',
  'confirm_delete_scene',
  'confirm_clear_scene',
  'cannot_delete_last',
  'open_flow_prompt',
  'no_videos_found',
  'merge_error'
];

// Test English translations
FlowI18n.setLanguage('en');
for (const key of dialogKeys) {
  const trans = FlowI18n.t(key, { group: 'Sequence 7', error: 'Code 404' });
  assert.ok(trans, `English translation must exist for '${key}'`);
  assert.notStrictEqual(trans, key, `English key '${key}' must not return raw key name`);
}

assert.strictEqual(
  FlowI18n.t('confirm_clear_scene', { group: 'Sequence 7' }),
  'Clear all clips from sequence "Sequence 7"?'
);
assert.strictEqual(FlowI18n.t('dialog_title_clear_scene'), 'Clear Sequence');
assert.strictEqual(FlowI18n.t('dialog_clear_clips'), 'Clear clips');
assert.strictEqual(FlowI18n.t('dialog_cancel'), 'Cancel');

// Test French translations
FlowI18n.setLanguage('fr');
for (const key of dialogKeys) {
  const trans = FlowI18n.t(key, { group: 'Séquence 7', error: 'Code 404' });
  assert.ok(trans, `French translation must exist for '${key}'`);
  assert.notStrictEqual(trans, key, `French key '${key}' must not return raw key name`);
}

assert.strictEqual(
  FlowI18n.t('confirm_clear_scene', { group: 'Séquence 7' }),
  'Vider tous les clips de la séquence "Séquence 7" ?'
);
assert.strictEqual(FlowI18n.t('dialog_title_clear_scene'), 'Vider la séquence');
assert.strictEqual(FlowI18n.t('dialog_clear_clips'), 'Vider les clips');
assert.strictEqual(FlowI18n.t('dialog_cancel'), 'Annuler');
assert.strictEqual(FlowI18n.t('dialog_create'), 'Créer');
assert.strictEqual(FlowI18n.t('dialog_rename'), 'Renommer');
assert.strictEqual(FlowI18n.t('dialog_got_it'), 'Compris');

console.log('✅ Test 2 PASSED: All 27 dialog keys verified with 100% French and English parity.\n');

// ---------------------------------------------------------------------
// Test 3: FlowDialog API & DOM Lifecycle Simulation in VM
// ---------------------------------------------------------------------
console.log('--- Test 3: FlowDialog Modal DOM Lifecycle (Confirm, Prompt, Alert) ---');

const dialogCode = fs.readFileSync(path.join(__dirname, 'dialog.js'), 'utf8');

function createMockDomEnvironment() {
  const domListeners = [];
  const windowListeners = [];
  let appendedElements = [];

  class MockElement {
    constructor(tagName) {
      this.tagName = (tagName || 'div').toUpperCase();
      this.className = '';
      this.classList = {
        add: (...names) => {
          names.forEach(n => { if (!this.className.includes(n)) this.className += ' ' + n; });
        },
        remove: (...names) => {
          names.forEach(n => { this.className = this.className.replace(n, '').trim(); });
        },
        contains: (n) => this.className.includes(n)
      };
      this.attributes = {};
      this.innerHTML = '';
      this.value = '';
      this.parentNode = null;
      this.style = {};
      this.listeners = {};
      this._subElements = {};
    }
    setAttribute(name, val) { this.attributes[name] = String(val); }
    getAttribute(name) { return this.attributes[name] || null; }
    appendChild(child) {
      child.parentNode = this;
      appendedElements.push(child);
      return child;
    }
    removeChild(child) {
      child.parentNode = null;
      const idx = appendedElements.indexOf(child);
      if (idx !== -1) appendedElements.splice(idx, 1);
      return child;
    }
    addEventListener(type, fn) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    }
    click() {
      (this.listeners['click'] || []).forEach(fn => fn({ target: this }));
    }
    focus() {}
    select() {}
    querySelector(sel) {
      if (this._subElements[sel]) return this._subElements[sel];
      let found;
      if (sel.includes('.fvm-btn-confirm')) found = this._findWithClass('fvm-btn-confirm');
      else if (sel.includes('.fvm-btn-cancel')) found = this._findWithClass('fvm-btn-cancel');
      else if (sel.includes('.fvm-dialog-close-btn')) found = this._findWithClass('fvm-dialog-close-btn');
      else if (sel.includes('.fvm-dialog-input')) found = this._findWithClass('fvm-dialog-input');
      else found = new MockElement('div');
      this._subElements[sel] = found;
      return found;
    }
    _findWithClass(cls) {
      const el = new MockElement(cls.includes('input') ? 'input' : 'button');
      el.className = cls;
      el.parentNode = this;
      return el;
    }
  }

  const documentBody = new MockElement('body');

  const context = {
    document: {
      body: documentBody,
      createElement: (tag) => new MockElement(tag),
      activeElement: null
    },
    window: {
      addEventListener: (type, fn) => { windowListeners.push({ type, fn }); },
      removeEventListener: (type, fn) => {
        const idx = windowListeners.findIndex(l => l.type === type && l.fn === fn);
        if (idx !== -1) windowListeners.splice(idx, 1);
      }
    },
    FlowI18n: FlowI18n,
    requestAnimationFrame: (cb) => cb(),
    setTimeout: (cb) => cb(),
    clearTimeout: () => {},
    console: console
  };
  context.window.window = context.window;

  vm.createContext(context);
  vm.runInContext(dialogCode, context);

  return {
    FlowDialog: context.FlowDialog || context.window.FlowDialog,
    windowListeners,
    getAppended: () => appendedElements
  };
}

(async () => {
  // 3.1 Test FlowDialog.confirm() resolving true on confirm click
  {
    const { FlowDialog, getAppended } = createMockDomEnvironment();
    assert.ok(FlowDialog && typeof FlowDialog.confirm === 'function', 'FlowDialog.confirm must be defined');

    const confirmPromise = FlowDialog.confirm('Clear all clips?', {
      title: 'Vider la séquence',
      confirmText: 'Vider les clips',
      danger: true
    });

    const overlay = getAppended()[0];
    assert.ok(overlay, 'Modal overlay must be appended to document.body');
    assert.ok(overlay.innerHTML.includes('Clear all clips?'), 'Dialog message must be included');
    assert.ok(overlay.innerHTML.includes('Vider la séquence'), 'Dialog title must be included');
    assert.ok(overlay.innerHTML.includes('fvm-btn-danger'), 'Danger styling must be applied');

    const confirmBtn = overlay.querySelector('.fvm-btn-confirm');
    confirmBtn.click();

    const result = await confirmPromise;
    assert.strictEqual(result, true, 'confirm() must resolve true when confirm button is clicked');
    console.log('✅ 3.1 confirm() positive resolution verified.');
  }

  // 3.2 Test FlowDialog.confirm() resolving false on cancel click or Escape key
  {
    const { FlowDialog, getAppended, windowListeners } = createMockDomEnvironment();

    const cancelPromise = FlowDialog.confirm('Delete scene?', { danger: true });
    const overlay = getAppended()[0];
    const cancelBtn = overlay.querySelector('.fvm-btn-cancel');
    cancelBtn.click();
    const cancelRes = await cancelPromise;
    assert.strictEqual(cancelRes, false, 'confirm() must resolve false on cancel click');

    const escPromise = FlowDialog.confirm('Delete scene?', { danger: true });
    const escListener = windowListeners.find(l => l.type === 'keydown');
    assert.ok(escListener, 'keydown listener must be attached');
    escListener.fn({ key: 'Escape', preventDefault: () => {}, stopPropagation: () => {} });
    const escRes = await escPromise;
    assert.strictEqual(escRes, false, 'confirm() must resolve false on Escape key');

    console.log('✅ 3.2 confirm() cancel & Escape resolution verified.');
  }

  // 3.3 Test FlowDialog.prompt() resolving with input text
  {
    const { FlowDialog, getAppended } = createMockDomEnvironment();
    assert.ok(typeof FlowDialog.prompt === 'function', 'FlowDialog.prompt must be defined');

    const promptPromise = FlowDialog.prompt('New sequence name:', 'Séquence 8', {
      title: 'Nouvelle séquence',
      confirmText: 'Créer'
    });

    const overlay = getAppended()[0];
    assert.ok(overlay.innerHTML.includes('fvm-dialog-prompt'), 'Prompt dialog class must be set');
    const inputEl = overlay.querySelector('.fvm-dialog-input');
    inputEl.value = 'Intro Scene Cinematic';

    const confirmBtn = overlay.querySelector('.fvm-btn-confirm');
    confirmBtn.click();

    const res = await promptPromise;
    assert.strictEqual(res, 'Intro Scene Cinematic', 'prompt() must resolve entered text');
    console.log('✅ 3.3 prompt() text input submission verified.');
  }

  // 3.4 Test FlowDialog.alert() resolving void
  {
    const { FlowDialog, getAppended } = createMockDomEnvironment();
    assert.ok(typeof FlowDialog.alert === 'function', 'FlowDialog.alert must be defined');

    const alertPromise = FlowDialog.alert('Assembly finished successfully!', {
      title: 'Information',
      type: 'info'
    });

    const overlay = getAppended()[0];
    assert.ok(overlay.innerHTML.includes('fvm-dialog-alert'), 'Alert dialog class must be set');
    const confirmBtn = overlay.querySelector('.fvm-btn-confirm');
    confirmBtn.click();

    await alertPromise;
    console.log('✅ 3.4 alert() resolution verified.');
  }

  console.log('✅ Test 3 PASSED: FlowDialog modal DOM lifecycle and interactions verified.\n');

  // ---------------------------------------------------------------------
  // Test 4: studio.js & sidepanel.js Source Code Integration Integrity
  // ---------------------------------------------------------------------
  console.log('--- Test 4: studio.js & sidepanel.js FlowDialog Integration ---');

  const studioJs = fs.readFileSync(path.join(__dirname, 'studio.js'), 'utf8');
  const sidepanelJs = fs.readFileSync(path.join(__dirname, 'sidepanel.js'), 'utf8');

  // studio.js checks
  assert.ok(studioJs.includes('FlowDialog.confirm'), 'studio.js must use FlowDialog.confirm for clear and delete');
  assert.ok(studioJs.includes('FlowDialog.prompt'), 'studio.js must use FlowDialog.prompt for new and rename');
  assert.ok(studioJs.includes('FlowDialog.alert'), 'studio.js must use FlowDialog.alert for notices and errors');
  assert.ok(studioJs.includes('dialog_title_clear_scene'), 'studio.js must use localized title for clear scene');
  assert.ok(studioJs.includes('dialog_title_delete_scene'), 'studio.js must use localized title for delete scene');
  assert.ok(studioJs.includes('dialog_title_new_scene'), 'studio.js must use localized title for new scene');

  // sidepanel.js checks
  assert.ok(sidepanelJs.includes('FlowDialog.confirm'), 'sidepanel.js must use FlowDialog.confirm for clear sequence');
  assert.ok(sidepanelJs.includes('FlowDialog.prompt'), 'sidepanel.js must use FlowDialog.prompt for new sequence');
  assert.ok(sidepanelJs.includes('FlowDialog.alert'), 'sidepanel.js must use FlowDialog.alert for notices and errors');

  console.log('✅ Test 4 PASSED: Both studio.js and sidepanel.js utilize modern FlowDialog modals.\n');

  console.log('=== ALL TESTS IN DIALOG & BILINGUAL SUITE PASSED SUCCESSFULLY! ===\n');
})().catch((err) => {
  console.error('ASYNC ERROR IN TEST:', err);
  process.exit(1);
});
