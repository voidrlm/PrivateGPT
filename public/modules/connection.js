/**
 * Connection Status
 */

import { state } from "./state.js";
import { elements } from "./elements.js";
import { showToast } from "./toast.js";

export function checkConnection() {
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
