/**
 * Theme Management
 */

import { state } from "./state.js";
import { elements } from "./elements.js";
import { saveTheme } from "./storage.js";
import { showToast } from "./toast.js";

export function applyTheme() {
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

export function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveTheme();
  showToast(
    `${state.theme === "dark" ? "Dark" : "Light"} mode enabled`,
    "success"
  );
}
