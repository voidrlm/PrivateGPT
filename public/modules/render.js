/**
 * Rendering Functions
 */

import { state } from "./state.js";
import { elements } from "./elements.js";
import { SUGGESTIONS } from "./constants.js";
import { getCurrentChat } from "./storage.js";
import { escapeHtml, formatTime, formatTimeAgo } from "./utils.js";

export function renderChatList() {
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

export function renderMessages() {
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

export function renderMessageContent(content, role) {
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
    // Note: In marked v5+, the code function receives a token object
    const renderer = new marked.Renderer();
    renderer.code = function (token) {
      // In marked v5+, token is an object with: { type, raw, text, lang, escaped }
      // In older versions, arguments are (code, lang, escaped)
      let code, lang;
      if (
        typeof token === "object" &&
        token !== null &&
        token.type === "code"
      ) {
        // Marked v5+ format - token object
        code = token.text || token.raw || "";
        lang = token.lang || "plaintext";
      } else if (typeof token === "object" && token !== null) {
        // Marked v4 format - still an object but different structure
        code = token.text || token.raw || token.code || String(token);
        lang = token.lang || token.language || "plaintext";
      } else {
        // Old format - arguments are (code, lang)
        code = String(token);
        lang = arguments[1] || "plaintext";
      }

      const language = lang || "plaintext";
      const escapedCode = escapeHtml(code);
      return `
        <div class="code-block">
          <div class="code-header">
            <span class="lang">${language.toUpperCase()}</span>
            <button class="copy-code-btn" onclick="copyCodeBlock(this)">Copy</button>
          </div>
          <pre><code class="language-${language}">${escapedCode}</code></pre>
        </div>
      `;
    };

    // Handle inline code spans as well
    renderer.codespan = function (token) {
      let code;
      if (typeof token === "object" && token !== null) {
        code = token.text || token.raw || String(token);
      } else {
        code = String(token);
      }
      return `<code>${escapeHtml(code)}</code>`;
    };

    marked.use({ renderer });
    return marked.parse(content);
  }

  return escapeHtml(content).replace(/\n/g, "<br>");
}

export function highlightCodeBlocks(container) {
  if (typeof hljs !== "undefined") {
    container.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
    });
  }
}

export function updateChatNameDisplay() {
  const chat = getCurrentChat();
  const name = chat?.name || "New Chat";
  if (elements.currentChatName) elements.currentChatName.textContent = name;
  if (elements.mobileChatName) elements.mobileChatName.textContent = name;
}

export function scrollToBottom() {
  if (elements.chatMessages) {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }
}

export function updateUIFromSettings() {
  // Apply settings to UI
  if (elements.memoryRange) {
    elements.memoryRange.value = state.settings.memoryWindow;
    updateMemoryDisplay();
  }

  // Settings modal
  if (elements.systemPrompt) {
    const chat = getCurrentChat();
    elements.systemPrompt.value = chat?.systemPrompt || state.settings.systemPrompt || "";
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

export function updateMemoryDisplay() {
  const raw = elements.memoryRange?.value;
  const value = raw !== undefined && raw !== null ? raw : String(20);
  let display = value;
  let numeric = Number(value);
  if (Number.isNaN(numeric)) numeric = 20;
  if (numeric === -1) {
    display = "Max";
  } else if (numeric === 5) {
    display = "Low";
  } else if (numeric === 20) {
    display = "Medium";
  } else if (numeric === 50) {
    display = "High";
  }

  if (elements.memoryValue) {
    elements.memoryValue.textContent = display;
  }
  state.settings.memoryWindow = numeric;
}

export function updateProcessingUI(isProcessing) {
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
