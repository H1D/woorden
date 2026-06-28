import { useCallback, useRef, useState } from "react";

// Copy text using the async Clipboard API (secure-context only — a PWA is
// served over HTTPS, and localhost counts as secure). Tracks which id was last
// copied so the UI can show a transient "Copied ✓" state.
export function useClipboard(timeout = 1500) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const copy = useCallback(
    async (text: string, id: string): Promise<boolean> => {
      if (!navigator.clipboard || !window.isSecureContext) return false;
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiedId(null), timeout);
        return true;
      } catch {
        return false;
      }
    },
    [timeout],
  );

  return { copiedId, copy };
}
