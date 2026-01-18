/**
 * DOM Elements
 */

const $ = (selector) => document.querySelector(selector);

export const elements = {
  // Main containers
  app: $(".app"),
  sidebar: $("#sidebar"),
  sidebarOverlay: $("#sidebar-overlay"),
  chatMessages: $("#chat-messages"),
  chatList: $("#chat-list"),

  // Input elements
  userInput: $("#user-input"),
  sendButton: $("#send-button"),
  stopButton: $("#stop-button"),
  charCount: $("#char-count"),

  // Controls
  memoryRange: $("#memory-range"),
  memoryValue: $("#memory-value"),
  modelSelect: $("#model-select"),

  // Buttons
  newChatBtn: $("#new-chat"),
  menuToggle: $("#menu-toggle"),
  themeToggle: $("#theme-toggle"),
  settingsBtn: $("#settings-btn"),
  shortcutsBtn: $("#shortcuts-btn"),
  clearChatBtn: $("#clear-chat-btn"),
  exportBtn: $("#export-btn"),
  importBtn: $("#import-btn"),
  importFile: $("#import-file"),

  // Chat name displays
  currentChatName: $("#current-chat-name"),
  mobileChatName: $("#mobile-chat-name"),

  // Status
  statusDot: $("#status-dot"),
  statusText: $("#status-text"),
  typingIndicator: $("#typing-indicator"),

  // Search
  searchChats: $("#search-chats"),

  // Modals
  settingsModal: $("#settings-modal"),
  shortcutsModal: $("#shortcuts-modal"),

  // Settings form elements
  systemPrompt: $("#system-prompt"),
  defaultModel: $("#default-model"),
  streamToggle: $("#stream-toggle"),
  markdownToggle: $("#markdown-toggle"),
  soundToggle: $("#sound-toggle"),
  saveSettingsBtn: $("#save-settings"),
  resetSettingsBtn: $("#reset-settings"),

  // Toast container
  toastContainer: $("#toast-container"),
};
