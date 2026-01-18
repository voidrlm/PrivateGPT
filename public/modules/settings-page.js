import { state } from "./state.js";
import { loadState, saveSettings } from "./storage.js";
import { DEFAULT_SETTINGS } from "./constants.js";
import { applyTheme } from "./theme.js";
import { showToast } from "./toast.js";
import { fetchModels } from "./chat.js";

function $id(id) {
  return document.getElementById(id);
}

function updateUI() {
  $id("system-prompt").value = state.settings.systemPrompt || "";
  $id("default-model").value =
    state.settings.defaultModel || DEFAULT_SETTINGS.defaultModel;
  $id("stream-toggle").checked = !!state.settings.enableStreaming;
  $id("markdown-toggle").checked = !!state.settings.enableMarkdown;
  $id("sound-toggle").checked = !!state.settings.enableSound;
}

function readFormIntoState() {
  state.settings.systemPrompt = $id("system-prompt").value || "";
  state.settings.defaultModel =
    $id("default-model").value || DEFAULT_SETTINGS.defaultModel;
  state.settings.enableStreaming = $id("stream-toggle").checked;
  state.settings.enableMarkdown = $id("markdown-toggle").checked;
  state.settings.enableSound = $id("sound-toggle").checked;
}

async function setup() {
  loadState();
  applyTheme();
  // Populate models from Ollama if available
  await fetchModels().catch(() => {});
  updateUI();

  $id("save-settings").addEventListener("click", () => {
    readFormIntoState();
    saveSettings();
    showToast("Settings saved", "success");
    setTimeout(() => (window.location.href = "index.html"), 600);
  });

  $id("reset-settings").addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    state.settings = { ...DEFAULT_SETTINGS };
    updateUI();
    saveSettings();
    showToast("Settings reset to defaults", "success");
  });
}

document.addEventListener("DOMContentLoaded", setup);
