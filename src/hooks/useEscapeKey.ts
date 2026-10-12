import { useEffect } from 'react';

/**
 * A global hook to listen for the Escape key and trigger a callback.
 * Used primarily for closing modals and popups.
 * 
 * @param onClose - The function to call when Escape is pressed
 * @param isActive - Whether the listener should be active (defaults to true)
 */
export function useEscapeKey(onClose: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isActive]);
}
