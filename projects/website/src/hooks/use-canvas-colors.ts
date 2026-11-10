import { resolveCanvasColor } from "@/common/canvas-color";
import { useMemo, useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  // The color themes are classes on <html> (set by next-themes)
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/**
 * Resolves theme colors (`var(--token)`) for canvas charts. The returned `resolve` function changes
 * whenever the color theme changes, so charts that depend on it redraw in the new colors.
 */
export function useCanvasColors() {
  const themeClass = useSyncExternalStore(
    subscribe,
    () => document.documentElement.className,
    () => ""
  );

  return useMemo(() => {
    const cache = new Map<string, string>();
    const resolve = (color: string, alpha = 1): string => {
      const key = `${color}|${alpha}`;
      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const resolved = resolveCanvasColor(color, alpha);
      cache.set(key, resolved);
      return resolved;
    };
    return { themeClass, resolve };
  }, [themeClass]);
}
