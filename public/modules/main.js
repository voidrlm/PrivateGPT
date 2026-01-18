/**
 * LLM Chat Studio - Main Entry Point
 *
 * Features:
 * - Multi-session chat management
 * - Dark/Light theme support
 * - Markdown rendering with syntax highlighting
 * - Message copy, edit, delete, regenerate
 * - Export/Import conversations
 * - Keyboard shortcuts
 * - Search within chats
 * - Custom system prompts
 * - Connection status indicator
 * - Toast notifications
 * - Responsive design with mobile support
 */

import { elements } from "./elements.js";
import { loadState } from "./storage.js";
import { applyTheme } from "./theme.js";
import { checkConnection } from "./connection.js";
import {
  setupEventListeners,
  setupKeyboardShortcuts,
  autoResizeTextarea,
} from "./events.js";
import {
  renderChatList,
  renderMessages,
  updateUIFromSettings,
} from "./render.js";
import {
  switchChat,
  deleteChat,
  renameChat,
  copyMessage,
  deleteMessage,
  regenerateMessage,
  updateCharCount,
} from "./chat.js";

import { fetchModels } from "./chat.js";

function init() {
  loadState();
  applyTheme();
  setupEventListeners();
  setupKeyboardShortcuts();
  renderChatList();
  renderMessages();
  updateUIFromSettings();
  checkConnection();

  // Focus input on load
  setTimeout(() => elements.userInput?.focus(), 100);

  // Fetch available Ollama models and populate model selector
  fetchModels().catch((e) => console.warn("Failed to fetch models:", e));
}

// Global function for suggestion buttons
window.useSuggestion = function (text) {
  if (elements.userInput) {
    elements.userInput.value = text;
    elements.userInput.focus();
    autoResizeTextarea();
    updateCharCount();
  }
};

// Global function for code copy buttons
window.copyCodeBlock = function (btn) {
  const codeBlock = btn.closest(".code-block");
  const code = codeBlock?.querySelector("code")?.textContent;

  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = "Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("copied");
      }, 2000);
    });
  }
};

// Make functions globally available
window.switchChat = switchChat;
window.deleteChat = deleteChat;
window.renameChat = renameChat;
window.copyMessage = copyMessage;
window.deleteMessage = deleteMessage;
window.regenerateMessage = regenerateMessage;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", init);
