/**
 * Constants & Configuration
 */

export const STORAGE_KEY = "llm-chat-sessions-v2";
export const SETTINGS_KEY = "llm-chat-settings-v2";
export const THEME_KEY = "llm-chat-theme";
export const MAX_CHAR_COUNT = 4000;

export const DEFAULT_SETTINGS = {
  memoryWindow: 20,
  defaultModel: "",
  systemPrompt:
    "You are a helpful, friendly assistant. Provide concise and accurate responses.",
  enableStreaming: true,
  enableMarkdown: true,
  enableSound: false,
};

// URL for local Ollama instance. Override by setting `window.OLLAMA_URL`
export const OLLAMA_URL = window?.OLLAMA_URL || "http://localhost:11434";

export const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python function to sort a list",
  "What are the benefits of meditation?",
  "Help me brainstorm project ideas",
];
