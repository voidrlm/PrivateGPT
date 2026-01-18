/**
 * Export/Import Functionality
 */

import { state } from "./state.js";
import { DEFAULT_SETTINGS } from "./constants.js";
import { saveChats, saveSettings } from "./storage.js";
import { showToast } from "./toast.js";
import {
  renderChatList,
  renderMessages,
  updateUIFromSettings,
} from "./render.js";

export function exportChats() {
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

export function importChats(event) {
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
