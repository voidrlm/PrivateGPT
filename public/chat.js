/**
 * LLM Chat Studio - Advanced Chat Application
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

// =============================================================================
// Constants & Configuration
// =============================================================================

const STORAGE_KEY = "llm-chat-sessions-v2";
const SETTINGS_KEY = "llm-chat-settings-v2";
const THEME_KEY = "llm-chat-theme";
const MAX_CHAR_COUNT = 4000;

const DEFAULT_SETTINGS = {
  memoryWindow: 20,
  responseSize: 2,
  defaultModel: "",
  systemPrompt:
    "You are a helpful, friendly assistant. Provide concise and accurate responses.",
  enableStreaming: true,
  enableMarkdown: true,
  enableSound: false,
};

const RESPONSE_LABELS = ["S", "M", "L", "XL"];

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python function to sort a list",
  "What are the benefits of meditation?",
  "Help me brainstorm project ideas",
];

// =============================================================================
// DOM Elements
// =============================================================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
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
  modelSelect: $("#model-select"),
  memoryRange: $("#memory-range"),
  memoryValue: $("#memory-value"),
  responseRange: $("#response-range"),
  responseValue: $("#response-value"),

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

// =============================================================================
// State Management
// =============================================================================

let state = {
  chats: [],
  currentChatId: null,
  settings: { ...DEFAULT_SETTINGS },
  theme: "light",
  isProcessing: false,
  currentAbort: null,
  searchQuery: "",
  isOnline: navigator.onLine,
};

// =============================================================================
// Initialization
// =============================================================================

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
}

function loadState() {
  // Load chats
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.chats = parsed.map((chat) => ({
          ...chat,
          messages: Array.isArray(chat.messages) ? chat.messages : [],
          createdAt: chat.createdAt || Date.now(),
          updatedAt: chat.updatedAt || Date.now(),
        }));
        state.currentChatId = state.chats[0]?.id;
      }
    }
  } catch (e) {
    console.error("Failed to load chats:", e);
  }

  // Create default chat if none exist
  if (state.chats.length === 0) {
    const chat = createNewChat();
    state.chats.push(chat);
    state.currentChatId = chat.id;
    saveChats();
  }

  // Load settings
  try {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }

  // Load theme
  const savedTheme = localStorage.getItem(THEME_KEY);
  state.theme =
    savedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
}

function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chats));
  } catch (e) {
    console.error("Failed to save chats:", e);
    showToast("Failed to save chats", "error");
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, state.theme);
}

// =============================================================================
// Chat Management
// =============================================================================

function createNewChat(name = "New Chat") {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: state.settings.defaultModel,
    systemPrompt: state.settings?.systemPrompt || DEFAULT_SETTINGS.systemPrompt,
  };
}

function getCurrentChat() {
  return state.chats.find((c) => c.id === state.currentChatId) || null;
}

function switchChat(chatId) {
  if (state.isProcessing) {
    showToast("Please wait for the current response to complete", "warning");
    return;
  }

  state.currentChatId = chatId;
  renderChatList();
  renderMessages();
  updateChatNameDisplay();
  elements.userInput?.focus();
}

function deleteChat(chatId) {
  if (state.chats.length <= 1) {
    showToast("Cannot delete the last chat", "warning");
    return;
  }

  const chatIndex = state.chats.findIndex((c) => c.id === chatId);
  if (chatIndex === -1) return;

  const chatName = state.chats[chatIndex].name;
  state.chats.splice(chatIndex, 1);

  if (state.currentChatId === chatId) {
    state.currentChatId = state.chats[0]?.id;
    renderMessages();
  }

  saveChats();
  renderChatList();
  showToast(`Deleted "${chatName}"`, "success");
}

function renameChat(chatId) {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;

  const newName = prompt("Rename chat:", chat.name)?.trim();
  if (!newName) return;

  chat.name = newName;
  chat.updatedAt = Date.now();
  saveChats();
  renderChatList();
  updateChatNameDisplay();
  showToast("Chat renamed", "success");
}

function clearCurrentChat() {
  const chat = getCurrentChat();
  if (!chat) return;

  if (!confirm("Are you sure you want to clear all messages in this chat?"))
    return;

  chat.messages = [];
  chat.updatedAt = Date.now();
  saveChats();
  renderMessages();
  showToast("Chat cleared", "success");
}

function updateChatNameDisplay() {
  const chat = getCurrentChat();
  const name = chat?.name || "New Chat";
  if (elements.currentChatName) elements.currentChatName.textContent = name;
  if (elements.mobileChatName) elements.mobileChatName.textContent = name;
}

// =============================================================================
// Message Handling
// =============================================================================

async function sendMessage() {
  const chat = getCurrentChat();
  const message = elements.userInput?.value.trim();

  if (!chat || !message || state.isProcessing) return;

  // Add user message
  const userMessage = {
    id: `msg-${Date.now()}`,
    role: "user",
    content: message,
    timestamp: Date.now(),
  };

  chat.messages.push(userMessage);
  chat.updatedAt = Date.now();

  // Auto-name chat based on first message
  if (chat.messages.filter((m) => m.role === "user").length === 1) {
    chat.name = message.slice(0, 40) + (message.length > 40 ? "..." : "");
    updateChatNameDisplay();
    renderChatList();
  }

  // Clear input
  elements.userInput.value = "";
  elements.userInput.style.height = "auto";
  updateCharCount();

  // Render user message
  renderMessages();
  scrollToBottom();

  // Start processing
  state.isProcessing = true;
  updateProcessingUI(true);

  try {
    await streamResponse(chat, userMessage);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error:", error);
      const errorMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, there was an error processing your request. Please try again.",
        timestamp: Date.now(),
        isError: true,
      };
      chat.messages.push(errorMessage);
      showToast("Failed to get response", "error");
    }
  } finally {
    state.isProcessing = false;
    state.currentAbort = null;
    updateProcessingUI(false);
    saveChats();
    renderMessages();
    renderChatList();
  }
}

async function streamResponse(chat, userMessage) {
  const controller = new AbortController();
  state.currentAbort = controller;

  // Prepare messages payload
  const memoryWindow = state.settings.memoryWindow;
  const messagesToSend =
    memoryWindow === 0
      ? chat.messages.slice(-1)
      : chat.messages.slice(-memoryWindow);

  // Add system prompt if configured
  const payload = {
    messages: messagesToSend.map((m) => ({ role: m.role, content: m.content })),
    model: elements.modelSelect?.value || state.settings.defaultModel,
    responseSize: Number(
      elements.responseRange?.value ?? state.settings.responseSize
    ),
  };

  // Use per-chat system prompt if present, otherwise fall back to global setting
  const systemPrompt = chat.systemPrompt || state.settings.systemPrompt;
  if (systemPrompt) {
    payload.systemPrompt = systemPrompt;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  // Create assistant message element
  const assistantMessage = {
    id: `msg-${Date.now()}`,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
  };
  chat.messages.push(assistantMessage);

  // Render initial empty assistant message
  renderMessages();
  scrollToBottom();

  // Get the message element for streaming updates
  const messageEl = document.querySelector(
    `[data-message-id="${assistantMessage.id}"] .message-text`
  );

  // Process stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // Process remaining buffer
      const remaining = consumeSseEvents(buffer + "\n\n");
      for (const data of remaining.events) {
        if (data === "[DONE]") break;
        processStreamData(data, assistantMessage, messageEl);
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = consumeSseEvents(buffer);
    buffer = parsed.buffer;

    for (const data of parsed.events) {
      if (data === "[DONE]") {
        buffer = "";
        break;
      }
      processStreamData(data, assistantMessage, messageEl);
    }

    scrollToBottom();
  }

  // Play sound if enabled
  if (state.settings.enableSound && assistantMessage.content) {
    playNotificationSound();
  }
}

function processStreamData(data, message, messageEl) {
  try {
    const json = JSON.parse(data);
    let content = "";

    if (typeof json.response === "string" && json.response.length > 0) {
      content = json.response;
    } else if (json.choices?.[0]?.delta?.content) {
      content = json.choices[0].delta.content;
    }

    if (content) {
      message.content += content;
      if (messageEl) {
        messageEl.innerHTML = renderMessageContent(
          message.content,
          message.role
        );
        highlightCodeBlocks(messageEl);
      }
    }
  } catch (e) {
    console.error("Error parsing stream data:", e);
  }
}

function stopGeneration() {
  if (state.currentAbort) {
    state.currentAbort.abort();
    showToast("Generation stopped", "warning");
  }
}

function copyMessage(messageId) {
  const chat = getCurrentChat();
  const message = chat?.messages.find((m) => m.id === messageId);
  if (!message) return;

  navigator.clipboard
    .writeText(message.content)
    .then(() => {
      showToast("Copied to clipboard", "success");

      // Update button state
      const btn = document.querySelector(
        `[data-message-id="${messageId}"] .copy-btn`
      );
      if (btn) {
        btn.classList.add("copied");
        btn.textContent = "✓";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = "📋";
        }, 2000);
      }
    })
    .catch(() => {
      showToast("Failed to copy", "error");
    });
}

function deleteMessage(messageId) {
  const chat = getCurrentChat();
  if (!chat) return;

  const index = chat.messages.findIndex((m) => m.id === messageId);
  if (index === -1) return;

  chat.messages.splice(index, 1);
  chat.updatedAt = Date.now();
  saveChats();
  renderMessages();
  showToast("Message deleted", "success");
}

async function regenerateMessage(messageId) {
  const chat = getCurrentChat();
  if (!chat || state.isProcessing) return;

  const index = chat.messages.findIndex((m) => m.id === messageId);
  if (index === -1 || chat.messages[index].role !== "assistant") return;

  // Find the user message before this assistant message
  let userMessageIndex = index - 1;
  while (
    userMessageIndex >= 0 &&
    chat.messages[userMessageIndex].role !== "user"
  ) {
    userMessageIndex--;
  }

  if (userMessageIndex < 0) {
    showToast("No user message found to regenerate from", "error");
    return;
  }

  // Remove the assistant message
  chat.messages.splice(index, 1);

  // Regenerate
  state.isProcessing = true;
  updateProcessingUI(true);

  try {
    await streamResponse(chat, chat.messages[userMessageIndex]);
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error:", error);
      showToast("Failed to regenerate", "error");
    }
  } finally {
    state.isProcessing = false;
    state.currentAbort = null;
    updateProcessingUI(false);
    saveChats();
    renderMessages();
  }
}

// =============================================================================
// Rendering
// =============================================================================

function renderChatList() {
  if (!elements.chatList) return;

  const filteredChats = state.searchQuery
    ? state.chats.filter(
        (c) =>
          c.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
          c.messages.some((m) =>
            m.content.toLowerCase().includes(state.searchQuery.toLowerCase())
          )
      )
    : state.chats;

  // Sort by updated time
  const sortedChats = [...filteredChats].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  elements.chatList.innerHTML = sortedChats
    .map((chat) => {
      const isActive = chat.id === state.currentChatId;
      const messageCount = chat.messages.length;
      const timeAgo = formatTimeAgo(chat.updatedAt);

      return `
      <li class="chat-list-item ${isActive ? "active" : ""}" data-chat-id="${
        chat.id
      }">
        <button class="chat-btn" onclick="switchChat('${chat.id}')">
          <span class="chat-name">${escapeHtml(chat.name)}</span>
          <span class="chat-meta">
            <span>${messageCount} messages</span>
            <span>• ${timeAgo}</span>
          </span>
        </button>
        <div class="chat-actions">
          <button class="chat-action-btn" onclick="renameChat('${
            chat.id
          }')" title="Rename">✎</button>
          <button class="chat-action-btn danger" onclick="deleteChat('${
            chat.id
          }')" title="Delete">🗑</button>
        </div>
      </li>
    `;
    })
    .join("");
}

function renderMessages() {
  if (!elements.chatMessages) return;

  const chat = getCurrentChat();
  updateChatNameDisplay();

  if (!chat || chat.messages.length === 0) {
    renderEmptyState();
    return;
  }

  elements.chatMessages.innerHTML = chat.messages
    .map((msg) => renderMessage(msg))
    .join("");

  // Apply syntax highlighting
  highlightCodeBlocks(elements.chatMessages);

  scrollToBottom();
}

function renderEmptyState() {
  elements.chatMessages.innerHTML = `
    <div class="empty-state">
      <div class="icon">💬</div>
      <h3>Start a conversation</h3>
      <p>Ask questions, get help with code, brainstorm ideas, or just chat. I'm here to help!</p>
      <div class="suggestions">
        ${SUGGESTIONS.map(
          (s) => `
          <button class="suggestion-btn" onclick="useSuggestion('${escapeHtml(
            s
          )}')">${escapeHtml(s)}</button>
        `
        ).join("")}
      </div>
    </div>
  `;
}

function renderMessage(msg) {
  const isUser = msg.role === "user";
  const time = formatTime(msg.timestamp);
  const content = renderMessageContent(msg.content, msg.role);

  return `
    <div class="message ${
      isUser ? "user-message" : "assistant-message"
    }" data-message-id="${msg.id}">
      <div class="message-wrapper">
        <div class="message-avatar">${isUser ? "👤" : "🤖"}</div>
        <div class="message-content">
          <div class="message-bubble ${msg.isError ? "error" : ""}">
            <div class="message-text">${content}</div>
          </div>
          <div class="message-footer">
            <span class="message-time">${time}</span>
            <div class="message-actions">
              <button class="message-action-btn copy-btn" onclick="copyMessage('${
                msg.id
              }')" title="Copy">📋</button>
              ${
                !isUser
                  ? `<button class="message-action-btn" onclick="regenerateMessage('${msg.id}')" title="Regenerate">🔄</button>`
                  : ""
              }
              <button class="message-action-btn" onclick="deleteMessage('${
                msg.id
              }')" title="Delete">🗑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMessageContent(content, role) {
  if (!state.settings.enableMarkdown || role === "user") {
    return escapeHtml(content).replace(/\n/g, "<br>");
  }

  // Configure marked for safe rendering
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
    });

    // Custom renderer for code blocks
    const renderer = new marked.Renderer();
    renderer.code = function (code, lang) {
      const language = lang || "plaintext";
      const escapedCode = escapeHtml(code);
      return `
        <div class="code-block">
          <div class="code-header">
            <span class="lang">${language}</span>
            <button class="copy-code-btn" onclick="copyCodeBlock(this)">Copy</button>
          </div>
          <pre><code class="language-${language}">${escapedCode}</code></pre>
        </div>
      `;
    };

    marked.use({ renderer });
    return marked.parse(content);
  }

  return escapeHtml(content).replace(/\n/g, "<br>");
}

function highlightCodeBlocks(container) {
  if (typeof hljs !== "undefined") {
    container.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  }
}

// =============================================================================
// UI Updates
// =============================================================================

function updateProcessingUI(isProcessing) {
  if (elements.sendButton) {
    elements.sendButton.disabled = isProcessing;
  }
  if (elements.stopButton) {
    elements.stopButton.classList.toggle("visible", isProcessing);
  }
  if (elements.typingIndicator) {
    elements.typingIndicator.classList.toggle("visible", isProcessing);
  }
  if (elements.userInput) {
    elements.userInput.disabled = isProcessing;
  }
}

function updateUIFromSettings() {
  // Apply settings to UI
  if (elements.memoryRange) {
    elements.memoryRange.value = state.settings.memoryWindow;
    updateMemoryDisplay();
  }

  if (elements.responseRange) {
    elements.responseRange.value = state.settings.responseSize;
    updateResponseDisplay();
  }

  if (elements.modelSelect) {
    elements.modelSelect.value = state.settings.defaultModel;
  }

  // Settings modal
  if (elements.systemPrompt) {
    elements.systemPrompt.value = state.settings.systemPrompt;
  }
  if (elements.defaultModel) {
    elements.defaultModel.value = state.settings.defaultModel;
  }
  if (elements.streamToggle) {
    elements.streamToggle.checked = state.settings.enableStreaming;
  }
  if (elements.markdownToggle) {
    elements.markdownToggle.checked = state.settings.enableMarkdown;
  }
  if (elements.soundToggle) {
    elements.soundToggle.checked = state.settings.enableSound;
  }
}

function updateMemoryDisplay() {
  const value = elements.memoryRange?.value || 20;
  if (elements.memoryValue) {
    elements.memoryValue.textContent = value;
  }
  state.settings.memoryWindow = Number(value);
}

function updateResponseDisplay() {
  const value = elements.responseRange?.value || 2;
  if (elements.responseValue) {
    elements.responseValue.textContent = RESPONSE_LABELS[value] || "M";
  }
  state.settings.responseSize = Number(value);
}

function updateCharCount() {
  const count = elements.userInput?.value.length || 0;
  if (elements.charCount) {
    elements.charCount.textContent = `${count} / ${MAX_CHAR_COUNT}`;
    elements.charCount.classList.toggle("visible", count > 0);
  }
}

function scrollToBottom() {
  if (elements.chatMessages) {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }
}

// =============================================================================
// Theme
// =============================================================================

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);

  // Update highlight.js theme
  const lightSheet = document.getElementById("hljs-light");
  const darkSheet = document.getElementById("hljs-dark");

  if (lightSheet && darkSheet) {
    lightSheet.disabled = state.theme === "dark";
    darkSheet.disabled = state.theme === "light";
  }

  // Update theme toggle icon
  if (elements.themeToggle) {
    elements.themeToggle.textContent = state.theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveTheme();
  showToast(
    `${state.theme === "dark" ? "Dark" : "Light"} mode enabled`,
    "success"
  );
}

// =============================================================================
// Connection Status
// =============================================================================

function checkConnection() {
  updateConnectionStatus(navigator.onLine);

  window.addEventListener("online", () => updateConnectionStatus(true));
  window.addEventListener("offline", () => updateConnectionStatus(false));
}

function updateConnectionStatus(isOnline) {
  state.isOnline = isOnline;

  if (elements.statusDot) {
    elements.statusDot.classList.toggle("offline", !isOnline);
  }
  if (elements.statusText) {
    elements.statusText.textContent = isOnline ? "Connected" : "Offline";
  }

  if (!isOnline) {
    showToast(
      "You are offline. Messages will be sent when connection is restored.",
      "warning"
    );
  }
}

// =============================================================================
// Modals
// =============================================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("visible");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("visible");
    document.body.style.overflow = "";
  }
}

function closeAllModals() {
  $$(".modal-overlay").forEach((modal) => {
    modal.classList.remove("visible");
  });
  document.body.style.overflow = "";
}

// =============================================================================
// Export/Import
// =============================================================================

function exportChats() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    chats: state.chats,
    settings: state.settings,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-studio-export-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast("Chats exported successfully", "success");
}

function importChats(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);

      if (data.chats && Array.isArray(data.chats)) {
        const importCount = data.chats.length;
        state.chats = [...data.chats, ...state.chats];
        state.currentChatId = state.chats[0]?.id;

        if (data.settings) {
          state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
          updateUIFromSettings();
          saveSettings();
        }

        saveChats();
        renderChatList();
        renderMessages();
        showToast(`Imported ${importCount} chats`, "success");
      } else {
        throw new Error("Invalid file format");
      }
    } catch (error) {
      console.error("Import error:", error);
      showToast("Failed to import: Invalid file format", "error");
    }
  };
  reader.readAsText(file);

  // Reset file input
  event.target.value = "";
}

// =============================================================================
// Toast Notifications
// =============================================================================

function showToast(message, type = "success") {
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "ℹ"}</span>
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer?.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// =============================================================================
// Event Listeners
// =============================================================================

function setupEventListeners() {
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

  elements.responseRange?.addEventListener("input", () => {
    updateResponseDisplay();
    saveSettings();
  });

  elements.modelSelect?.addEventListener("change", () => {
    const chat = getCurrentChat();
    if (chat) {
      chat.model = elements.modelSelect.value;
      saveChats();
    }
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
  elements.settingsBtn?.addEventListener("click", () =>
    openModal("settings-modal")
  );
  elements.shortcutsBtn?.addEventListener("click", () =>
    openModal("shortcuts-modal")
  );

  elements.saveSettingsBtn?.addEventListener("click", () => {
    // Save the system prompt on a per-chat basis. Other settings remain global.
    const chat = getCurrentChat();
    if (chat) {
      chat.systemPrompt = elements.systemPrompt?.value || "";
      chat.updatedAt = Date.now();
      saveChats();
    } else {
      state.settings.systemPrompt = elements.systemPrompt?.value || "";
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

function setupKeyboardShortcuts() {
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

// =============================================================================
// Utility Functions
// =============================================================================

function autoResizeTextarea() {
  if (!elements.userInput) return;
  elements.userInput.style.height = "auto";
  elements.userInput.style.height =
    Math.min(elements.userInput.scrollHeight, 200) + "px";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "";

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

function consumeSseEvents(buffer) {
  let normalized = buffer.replace(/\r/g, "");
  const events = [];
  let eventEndIndex;

  while ((eventEndIndex = normalized.indexOf("\n\n")) !== -1) {
    const rawEvent = normalized.slice(0, eventEndIndex);
    normalized = normalized.slice(eventEndIndex + 2);

    const lines = rawEvent.split("\n");
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }

    if (dataLines.length === 0) continue;
    events.push(dataLines.join("\n"));
  }

  return { events, buffer: normalized };
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    // Ignore audio errors
  }
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
