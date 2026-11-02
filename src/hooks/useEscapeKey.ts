import { useEffect } from "react";

// Global LIFO stack of active modal close handlers
const modalCloseStack: Array<() => void> = [];
let isGlobalListenerAttached = false;

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" || event.key === "Esc") {
    if (modalCloseStack.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      // Pop the topmost active modal and invoke its close handler
      const closeTopModal = modalCloseStack.pop();
      if (closeTopModal) {
        closeTopModal();
      }
    }
  }
}

/**
 * Universal Escape Key Hook for Kalki BOS.
 * Automatically pushes modal to the top of the global stack when opened
 * and pops it cleanly when Escape is pressed or modal unmounts.
 * 
 * @param onClose Callback to close the modal
 * @param isActive Whether the modal is currently open / active
 */
export function useEscapeKey(onClose: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isGlobalListenerAttached) {
      window.addEventListener("keydown", handleGlobalKeyDown, true); // Capture phase ensures it handles before others
      isGlobalListenerAttached = true;
    }

    if (!isActive) return;

    // Push this modal's close handler to the stack
    modalCloseStack.push(onClose);

    return () => {
      // Remove this modal from the stack on unmount or when isActive becomes false
      const idx = modalCloseStack.lastIndexOf(onClose);
      if (idx !== -1) {
        modalCloseStack.splice(idx, 1);
      }
    };
  }, [onClose, isActive]);
}

/**
 * Programmatic helper to register an active modal close handler
 */
export function registerModalClose(onClose: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if (!isGlobalListenerAttached) {
    window.addEventListener("keydown", handleGlobalKeyDown, true);
    isGlobalListenerAttached = true;
  }

  modalCloseStack.push(onClose);
  return () => {
    const idx = modalCloseStack.lastIndexOf(onClose);
    if (idx !== -1) {
      modalCloseStack.splice(idx, 1);
    }
  };
}
