/**
 * Modal Management
 */

const $$ = (selector) => document.querySelectorAll(selector);

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("visible");
    document.body.style.overflow = "hidden";
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("visible");
    document.body.style.overflow = "";
  }
}

export function closeAllModals() {
  $$(".modal-overlay").forEach((modal) => {
    modal.classList.remove("visible");
  });
  document.body.style.overflow = "";
}
