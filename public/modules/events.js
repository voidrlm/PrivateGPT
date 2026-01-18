/**
 * Event Listeners
 */

import { state } from "./state.js";
import { elements } from "./elements.js";
import { MAX_CHAR_COUNT, DEFAULT_SETTINGS } from "./constants.js";
import { saveChats, saveSettings, createNewChat, getCurrentChat } from "./storage.js";
import { showToast } from "./toast.js";
import { toggleTheme } from "./theme.js";
import { openModal, closeAllModals } from "./modal.js";
import { exportChats, importChats } from "./export-import.js";
import {
  renderChatList,
  renderMessages,
  updateUIFromSettings,
  updateMemoryDisplay,
} from "./render.js";
import {
  sendMessage,
  stopGeneration,
  clearCurrentChat,
  updateCharCount,
} from "./chat.js";

const $$ = (selector) => document.querySelectorAll(selector);

function autoResizeTextarea() {
  if (!elements.userInput) return;
  elements.userInput.style.height = "auto";
  elements.userInput.style.height =
    Math.min(elements.userInput.scrollHeight, 200) + "px";
}

export function setupEventListeners() {
  // Input handling
  elements.userInput?.addEventListener("input", () => {
    autoResizeTextarea();
    updateCharCount();
  });

  elements.userInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  elements.sendButton?.addEventListener("click", sendMessage);
  elements.stopButton?.addEventListener("click", stopGeneration);

  // New chat
  elements.newChatBtn?.addEventListener("click", () => {
    const chat = createNewChat();
    state.chats.unshift(chat);
    state.currentChatId = chat.id;
    saveChats();
    renderChatList();
    renderMessages();
    elements.userInput?.focus();
    showToast("New chat created", "success");
  });

  // Controls
  elements.memoryRange?.addEventListener("input", () => {
    updateMemoryDisplay();
    saveSettings();
  });

  // Theme toggle
  elements.themeToggle?.addEventListener("click", toggleTheme);

  // Clear chat
  elements.clearChatBtn?.addEventListener("click", clearCurrentChat);

  // Search
  elements.searchChats?.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderChatList();
  });

  // Mobile menu
  elements.menuToggle?.addEventListener("click", () => {
    elements.sidebar?.classList.add("open");
    elements.sidebarOverlay?.classList.add("visible");
  });

  elements.sidebarOverlay?.addEventListener("click", () => {
    elements.sidebar?.classList.remove("open");
    elements.sidebarOverlay?.classList.remove("visible");
  });

  // Export/Import
  elements.exportBtn?.addEventListener("click", exportChats);
  elements.importBtn?.addEventListener("click", () =>
    elements.importFile?.click()
  );
  elements.importFile?.addEventListener("change", importChats);

  // Settings
  elements.settingsBtn?.addEventListener("click", () => {
    // ensure modal inputs reflect the current chat's prompt (if any)
    updateUIFromSettings();
    openModal("settings-modal");
  });
  elements.shortcutsBtn?.addEventListener("click", () =>
    openModal("shortcuts-modal")
  );

  elements.saveSettingsBtn?.addEventListener("click", () => {
    // Save system prompt to the current chat if present; otherwise save globally
    const chat = getCurrentChat();
    const promptVal = elements.systemPrompt?.value || "";
    if (chat) {
      chat.systemPrompt = promptVal;
      chat.updatedAt = Date.now();
      saveChats();
    } else {
      state.settings.systemPrompt = promptVal;
      saveSettings();
    }

    state.settings.defaultModel =
      elements.defaultModel?.value || DEFAULT_SETTINGS.defaultModel;
    state.settings.enableStreaming = elements.streamToggle?.checked ?? true;
    state.settings.enableMarkdown = elements.markdownToggle?.checked ?? true;
    state.settings.enableSound = elements.soundToggle?.checked ?? false;

    saveSettings();
    closeModal("settings-modal");
    showToast("Settings saved", "success");
  });

  elements.resetSettingsBtn?.addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    state.settings = { ...DEFAULT_SETTINGS };
    updateUIFromSettings();
    saveSettings();
    showToast("Settings reset to defaults", "success");
  });

  // Modal close buttons
  $$(".modal-close").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-overlay");
      if (modal) modal.classList.remove("visible");
      document.body.style.overflow = "";
    });
  });

  // Close modal on overlay click
  $$(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("visible");
        document.body.style.overflow = "";
      }
    });
  });
}

export function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't trigger shortcuts when typing in inputs (except Escape)
    const isTyping = ["INPUT", "TEXTAREA"].includes(
      document.activeElement?.tagName
    );

    // Escape - stop generation or close modal
    if (e.key === "Escape") {
      if (state.isProcessing) {
        stopGeneration();
      } else {
        closeAllModals();
        elements.sidebar?.classList.remove("open");
        elements.sidebarOverlay?.classList.remove("visible");
      }
      return;
    }

    if (isTyping) return;

    // Ctrl/Cmd + N - New chat
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      elements.newChatBtn?.click();
    }

    // Ctrl/Cmd + , - Settings
    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      openModal("settings-modal");
    }

    // Ctrl/Cmd + / - Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      openModal("shortcuts-modal");
    }

    // Ctrl/Cmd + Shift + T - Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "T") {
      e.preventDefault();
      toggleTheme();
    }

    // Ctrl/Cmd + Shift + D - Clear chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
      e.preventDefault();
      clearCurrentChat();
    }

    // / - Focus input
    if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      elements.userInput?.focus();
    }
  });
}

// Expose autoResizeTextarea for global use
export { autoResizeTextarea };
