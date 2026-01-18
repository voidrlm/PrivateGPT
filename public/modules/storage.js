/**
 * Storage Management
 */

import {
  STORAGE_KEY,
  SETTINGS_KEY,
  THEME_KEY,
  DEFAULT_SETTINGS,
} from "./constants.js";
import { state } from "./state.js";
import { showToast } from "./toast.js";

export function loadState() {
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

export function saveChats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.chats));
  } catch (e) {
    console.error("Failed to save chats:", e);
    showToast("Failed to save chats", "error");
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export function saveTheme() {
  localStorage.setItem(THEME_KEY, state.theme);
}

export function createNewChat(name = "New Chat") {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: state.settings.defaultModel,
  };
}

export function getCurrentChat() {
  return state.chats.find((c) => c.id === state.currentChatId) || null;
}
