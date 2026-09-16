import { useEffect, type RefObject } from "react";

/**
 * Shared lifecycle for modal overlays: close on Escape, lock background
 * scrolling, optionally focus an initial control, and restore prior focus.
 */
export function useDismissibleOverlay(
  onClose: () => void,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    initialFocusRef?.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [initialFocusRef, onClose]);
}
