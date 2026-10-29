// FlowDialog — Modern, Accessible, Themed Modal Dialog System for Flow Video Merger
// Replaces native browser alert(), confirm(), and prompt() with sleek custom modals
// Fully bilingual (French / English) via FlowI18n

(function (global) {
  "use strict";

  function getI18n(key, params, fallback) {
    if (typeof FlowI18n !== "undefined" && typeof FlowI18n.t === "function") {
      const val = FlowI18n.t(key, params);
      if (val && val !== key) return val;
    }
    return fallback || key;
  }

  function getLang() {
    if (typeof FlowI18n !== "undefined" && typeof FlowI18n.getLanguage === "function") {
      return FlowI18n.getLanguage();
    }
    return "en";
  }

  function createOverlay(contentHtml) {
    const overlay = document.createElement("div");
    overlay.className = "fvm-dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = contentHtml;
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add("fvm-dialog-active");
    });
    return overlay;
  }

  function removeOverlay(overlay) {
    overlay.classList.remove("fvm-dialog-active");
    overlay.classList.add("fvm-dialog-closing");
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 220);
  }

  const ICONS = {
    warning: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    danger: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    info: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    edit: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    plus: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    error: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
  };

  const FlowDialog = {
    confirm: (message, options = {}) => {
      if (typeof document === "undefined" || !document.body) {
        if (typeof window !== "undefined" && typeof window.confirm === "function") {
          return Promise.resolve(window.confirm(message));
        }
        return Promise.resolve(true);
      }

      return new Promise((resolve) => {
        const isFr = getLang() === "fr";
        const title = options.title || getI18n("dialog_title_confirm", {}, isFr ? "Confirmation" : "Confirmation");
        const confirmText = options.confirmText || (options.danger ? getI18n("dialog_confirm", {}, isFr ? "Confirmer" : "Confirm") : getI18n("dialog_ok", {}, "OK"));
        const cancelText = options.cancelText || getI18n("dialog_cancel", {}, isFr ? "Annuler" : "Cancel");
        const isDanger = Boolean(options.danger);
        const iconKey = options.icon || (isDanger ? "danger" : "warning");
        const iconSvg = ICONS[iconKey] || ICONS.warning;

        const html = `
          <div class="fvm-dialog-card fvm-dialog-${isDanger ? 'danger' : 'default'}">
            <div class="fvm-dialog-header">
              <div class="fvm-dialog-icon ${isDanger ? 'fvm-icon-danger' : 'fvm-icon-warning'}">
                ${iconSvg}
              </div>
              <div class="fvm-dialog-heading">
                <h3 class="fvm-dialog-title">${escapeHtml(title)}</h3>
              </div>
              <button type="button" class="fvm-dialog-close-btn" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="fvm-dialog-body">
              <p class="fvm-dialog-message">${escapeHtml(message)}</p>
            </div>
            <div class="fvm-dialog-actions">
              <button type="button" class="fvm-dialog-btn fvm-btn-cancel">${escapeHtml(cancelText)}</button>
              <button type="button" class="fvm-dialog-btn ${isDanger ? 'fvm-btn-danger' : 'fvm-btn-primary'} fvm-btn-confirm">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        `;

        const overlay = createOverlay(html);
        const confirmBtn = overlay.querySelector(".fvm-btn-confirm");
        const cancelBtn = overlay.querySelector(".fvm-btn-cancel");
        const closeBtn = overlay.querySelector(".fvm-dialog-close-btn");

        let settled = false;
        function finish(val) {
          if (settled) return;
          settled = true;
          window.removeEventListener("keydown", onKeyDown, true);
          removeOverlay(overlay);
          resolve(val);
        }

        function onKeyDown(e) {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            finish(false);
          } else if (e.key === "Enter" && !e.isComposing) {
            if (document.activeElement === cancelBtn) {
              finish(false);
            } else {
              e.preventDefault();
              finish(true);
            }
          }
        }

        window.addEventListener("keydown", onKeyDown, true);
        confirmBtn.addEventListener("click", () => finish(true));
        cancelBtn.addEventListener("click", () => finish(false));
        closeBtn.addEventListener("click", () => finish(false));

        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) finish(false);
        });

        if (isDanger) {
          cancelBtn.focus();
        } else {
          confirmBtn.focus();
        }
      });
    },

    prompt: (message, defaultValue = "", options = {}) => {
      if (typeof document === "undefined" || !document.body) {
        if (typeof window !== "undefined" && typeof window.prompt === "function") {
          return Promise.resolve(window.prompt(message, defaultValue));
        }
        return Promise.resolve(defaultValue);
      }

      return new Promise((resolve) => {
        const isFr = getLang() === "fr";
        const title = options.title || getI18n("dialog_title_new_scene", {}, isFr ? "Saisie" : "Input");
        const confirmText = options.confirmText || getI18n("dialog_confirm", {}, isFr ? "Valider" : "OK");
        const cancelText = options.cancelText || getI18n("dialog_cancel", {}, isFr ? "Annuler" : "Cancel");
        const placeholder = options.placeholder || "";
        const iconKey = options.icon || "edit";
        const iconSvg = ICONS[iconKey] || ICONS.edit;

        const html = `
          <div class="fvm-dialog-card fvm-dialog-prompt">
            <div class="fvm-dialog-header">
              <div class="fvm-dialog-icon fvm-icon-edit">
                ${iconSvg}
              </div>
              <div class="fvm-dialog-heading">
                <h3 class="fvm-dialog-title">${escapeHtml(title)}</h3>
              </div>
              <button type="button" class="fvm-dialog-close-btn" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="fvm-dialog-body">
              <label class="fvm-dialog-message">${escapeHtml(message)}</label>
              <div class="fvm-dialog-input-wrap">
                <input type="text" class="fvm-dialog-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" />
              </div>
            </div>
            <div class="fvm-dialog-actions">
              <button type="button" class="fvm-dialog-btn fvm-btn-cancel">${escapeHtml(cancelText)}</button>
              <button type="button" class="fvm-dialog-btn fvm-btn-primary fvm-btn-confirm">${escapeHtml(confirmText)}</button>
            </div>
          </div>
        `;

        const overlay = createOverlay(html);
        const inputEl = overlay.querySelector(".fvm-dialog-input");
        const confirmBtn = overlay.querySelector(".fvm-btn-confirm");
        const cancelBtn = overlay.querySelector(".fvm-btn-cancel");
        const closeBtn = overlay.querySelector(".fvm-dialog-close-btn");

        let settled = false;
        function finish(val) {
          if (settled) return;
          settled = true;
          window.removeEventListener("keydown", onKeyDown, true);
          removeOverlay(overlay);
          resolve(val);
        }

        function onKeyDown(e) {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            finish(null);
          } else if (e.key === "Enter" && !e.isComposing) {
            e.preventDefault();
            finish(inputEl.value);
          }
        }

        window.addEventListener("keydown", onKeyDown, true);
        confirmBtn.addEventListener("click", () => finish(inputEl.value));
        cancelBtn.addEventListener("click", () => finish(null));
        closeBtn.addEventListener("click", () => finish(null));

        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) finish(null);
        });

        setTimeout(() => {
          inputEl.focus();
          inputEl.select();
        }, 50);
      });
    },

    alert: (message, options = {}) => {
      if (typeof document === "undefined" || !document.body) {
        if (typeof window !== "undefined" && typeof window.alert === "function") {
          window.alert(message);
        }
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const isFr = getLang() === "fr";
        const type = options.type || "info";
        const title = options.title || (type === "error"
          ? getI18n("dialog_title_error", {}, isFr ? "Erreur" : "Error")
          : getI18n("dialog_title_notice", {}, isFr ? "Information" : "Notice"));
        const okText = options.okText || getI18n("dialog_got_it", {}, isFr ? "Compris" : "Got it");
        const iconKey = options.icon || (type === "error" ? "error" : (type === "warning" ? "warning" : "info"));
        const iconSvg = ICONS[iconKey] || ICONS.info;

        const html = `
          <div class="fvm-dialog-card fvm-dialog-alert fvm-dialog-${type}">
            <div class="fvm-dialog-header">
              <div class="fvm-dialog-icon fvm-icon-${type}">
                ${iconSvg}
              </div>
              <div class="fvm-dialog-heading">
                <h3 class="fvm-dialog-title">${escapeHtml(title)}</h3>
              </div>
              <button type="button" class="fvm-dialog-close-btn" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="fvm-dialog-body">
              <p class="fvm-dialog-message">${escapeHtml(message)}</p>
            </div>
            <div class="fvm-dialog-actions">
              <button type="button" class="fvm-dialog-btn fvm-btn-primary fvm-btn-confirm">${escapeHtml(okText)}</button>
            </div>
          </div>
        `;

        const overlay = createOverlay(html);
        const confirmBtn = overlay.querySelector(".fvm-btn-confirm");
        const closeBtn = overlay.querySelector(".fvm-dialog-close-btn");

        let settled = false;
        function finish() {
          if (settled) return;
          settled = true;
          window.removeEventListener("keydown", onKeyDown, true);
          removeOverlay(overlay);
          resolve();
        }

        function onKeyDown(e) {
          if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            finish();
          }
        }

        window.addEventListener("keydown", onKeyDown, true);
        confirmBtn.addEventListener("click", finish);
        closeBtn.addEventListener("click", finish);

        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) finish();
        });

        confirmBtn.focus();
      });
    }
  };

  function escapeHtml(str) {
    if (typeof str !== "string") return String(str || "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FlowDialog;
  }
  if (typeof window !== "undefined") {
    window.FlowDialog = FlowDialog;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.FlowDialog = FlowDialog;
  }
  global.FlowDialog = FlowDialog;
})(typeof window !== "undefined" ? window : globalThis);
