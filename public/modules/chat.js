/**
 * Chat Management
 */

import { state } from "./state.js";
import { elements } from "./elements.js";
import { DEFAULT_SETTINGS, OLLAMA_URL } from "./constants.js";
import { saveChats, createNewChat, getCurrentChat } from "./storage.js";
import { showToast } from "./toast.js";
import {
  renderChatList,
  renderMessages,
  renderMessageContent,
  highlightCodeBlocks,
  updateChatNameDisplay,
  scrollToBottom,
  updateProcessingUI,
} from "./render.js";
import { consumeSseEvents, playNotificationSound } from "./utils.js";

export function switchChat(chatId) {
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

export function deleteChat(chatId) {
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

export function renameChat(chatId) {
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

export function clearCurrentChat() {
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

export async function fetchModels() {
  // First try to load a generated local `models.json` (created by the
  // `npm run ollama:models` script that calls the Ollama CLI). If not
  // present, fall back to the Ollama local HTTP API.
  try {
    const localResp = await fetch('models.json');
    if (localResp.ok) {
      const models = await localResp.json();
      populateModelSelects(models);
      return models;
    }
  } catch (e) {
    // ignore and fall back
  }

  try {
    const resp = await fetch(`${OLLAMA_URL}/api/models`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    let models = [];
    if (Array.isArray(data)) {
      models = data.map((m) => m.name || m.model || m.id || m);
    } else if (Array.isArray(data.models)) {
      models = data.models.map((m) => m.name || m.model || m.id || m);
    }

    populateModelSelects(models);
    return models;
  } catch (e) {
    console.warn("Failed to fetch models from Ollama HTTP API:", e);
    return [];
  }
}

function populateModelSelects(models) {
  const chatSelect = elements.modelSelect;
  const settingsSelect = elements.defaultModel;

  if (chatSelect && models.length > 0) {
    chatSelect.innerHTML = models.map((m) => `<option value="${m}">${m}</option>`).join('');
    chatSelect.value = state.settings.defaultModel || DEFAULT_SETTINGS.defaultModel || models[0];
  }

  if (settingsSelect && models.length > 0) {
    settingsSelect.innerHTML = models.map((m) => `<option value="${m}">${m}</option>`).join('');
    settingsSelect.value = state.settings.defaultModel || DEFAULT_SETTINGS.defaultModel || models[0];
  }
}

export async function sendMessage() {
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
  const modelId = chat.model || elements.modelSelect?.value || state.settings.defaultModel || DEFAULT_SETTINGS.defaultModel;

  const systemPrompt = chat.systemPrompt || state.settings.systemPrompt;

  let prompt = messagesToSend
    .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
    .join("\n\n");

  if (systemPrompt) {
    // Prepend system prompt to the conversation prompt so Ollama receives it.
    prompt = `SYSTEM:\n${systemPrompt}\n\n` + prompt;
  }

  const body = { model: modelId, prompt, stream: true };

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

  // Read raw stream from Ollama and append text to the assistant message.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Buffer and process streaming JSON/NDJSON from Ollama. Ollama may
  // stream JSON objects back-to-back without newlines, or send newline
  // delimited JSON. We normalize by inserting newlines between adjacent
  // objects and then processing full lines.
  let buffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) {
      // process remaining buffer below
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    // Ensure concatenated JSON objects are split: replace '}{' (optionally
    // with whitespace) with '}' + newline + '{'
    buffer = buffer.replace(/}\s*\{/g, "}\n{");

    const lines = buffer.split(/\r?\n/);
    // Keep the last partial line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const text = line; // don't trim here; preserve whitespace between chunks
      if (!text) continue;

      // Try parsing as JSON first; if that fails, attempt to extract JSON
      // objects embedded in the line and also preserve any plain text.
      let handled = false;
      try {
        const j = JSON.parse(text);
        const chunk = extractResponseFromObj(j);
        if (j.done === true || j.completed === true) streamDone = true;
        if (chunk) {
          assistantMessage.content += chunk;
          handled = true;
        }
      } catch (e) {
        // Not a pure JSON object — fall through to extractor below
      }

      if (!handled) {
        // Split into JSON and text segments (handles concatenated objects)
        const segments = splitJsonSegments(text);
        for (const seg of segments) {
          if (seg.type === 'json') {
            try {
              const j = JSON.parse(seg.value);
              const chunk = extractResponseFromObj(j);
              if (j.done === true || j.completed === true) streamDone = true;
              if (chunk) assistantMessage.content += chunk;
            } catch (e) {
              // ignore malformed json segment
            }
          } else {
            // plain text
            assistantMessage.content += seg.value;
          }
        }
      }

      if (messageEl) {
        messageEl.innerHTML = renderMessageContent(
          assistantMessage.content,
          assistantMessage.role
        );
        highlightCodeBlocks(messageEl);
      }
      scrollToBottom();
    }
  }

  // Process any remaining buffer after stream closed
  if (buffer) {
    // Attempt to split and parse remaining content similar to above
    const rem = buffer.replace(/}\s*\{/g, "}\n{").split(/\r?\n/);
    for (const line of rem) {
      const text = line;
      if (!text) continue;

      // Use same logic as above to extract JSON/text segments
      try {
        const j = JSON.parse(text);
        const chunk = extractResponseFromObj(j);
        if (chunk) assistantMessage.content += chunk;
      } catch (e) {
        const segments = splitJsonSegments(text);
        for (const seg of segments) {
          if (seg.type === 'json') {
            try {
              const j = JSON.parse(seg.value);
              const chunk = extractResponseFromObj(j);
              if (chunk) assistantMessage.content += chunk;
            } catch (e) {}
          } else {
            assistantMessage.content += seg.value;
          }
        }
      }

      if (messageEl) {
        messageEl.innerHTML = renderMessageContent(
          assistantMessage.content,
          assistantMessage.role
        );
        highlightCodeBlocks(messageEl);
      }
      scrollToBottom();
    }
  }

  // Helper: extract readable text from Ollama response object
  function extractResponseFromObj(j) {
    if (!j || typeof j !== 'object') return '';
    if (typeof j.response === 'string' && j.response.length > 0) return j.response;
    if (typeof j.text === 'string' && j.text.length > 0) return j.text;
    if (j.output && typeof j.output === 'string') return j.output;
    if (Array.isArray(j.output?.tokens)) return j.output.tokens.join('');
    // Some Ollama variants may include 'choices' similar to OpenAI
    if (Array.isArray(j.choices) && j.choices[0]) {
      const c = j.choices[0];
      if (typeof c.delta?.content === 'string') return c.delta.content;
      if (typeof c.text === 'string') return c.text;
    }
    return '';
  }

  // Helper: split a string into JSON object segments and plain text segments.
  function splitJsonSegments(s) {
    const segments = [];
    let i = 0;
    let start = 0;
    const len = s.length;
    while (i < len) {
      if (s[i] === '{') {
        // flush any preceding text
        if (start < i) {
          segments.push({ type: 'text', value: s.slice(start, i) });
        }
        // parse until matching brace
        let depth = 0;
        let j = i;
        for (; j < len; j++) {
          if (s[j] === '{') depth++;
          else if (s[j] === '}') {
            depth--;
            if (depth === 0) {
              // include j
              segments.push({ type: 'json', value: s.slice(i, j + 1) });
              i = j + 1;
              start = i;
              break;
            }
          }
        }
        if (j >= len) {
          // unmatched brace; treat rest as text
          segments.push({ type: 'text', value: s.slice(i) });
          i = len;
          start = len;
        }
      } else {
        i++;
      }
    }
    if (start < len) {
      segments.push({ type: 'text', value: s.slice(start) });
    }
    return segments;
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

export function stopGeneration() {
  if (state.currentAbort) {
    state.currentAbort.abort();
    showToast("Generation stopped", "warning");
  }
}

export function copyMessage(messageId) {
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

export function deleteMessage(messageId) {
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

export async function regenerateMessage(messageId) {
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

export function updateCharCount() {
  const count = elements.userInput?.value.length || 0;
  const charCount = document.getElementById("char-count");
  if (charCount) {
    charCount.textContent = `${count} / 4000`;
    charCount.classList.toggle("visible", count > 0);
  }
}
