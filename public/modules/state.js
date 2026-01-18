/**
 * State Management
 */

import { DEFAULT_SETTINGS } from "./constants.js";

export const state = {
  chats: [],
  currentChatId: null,
  settings: { ...DEFAULT_SETTINGS },
  theme: "light",
  isProcessing: false,
  currentAbort: null,
  searchQuery: "",
  isOnline: navigator.onLine,
};
