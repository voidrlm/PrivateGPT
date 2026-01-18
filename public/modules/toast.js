/**
 * Toast Notifications
 */

import { escapeHtml } from "./utils.js";

export function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

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

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
