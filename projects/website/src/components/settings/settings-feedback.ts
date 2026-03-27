import { toast } from "sonner";

export function getMonotonicTimeMs(): number {
  return globalThis.performance.now();
}

export function showSettingsSavedToast(beforeMs: number): void {
  const afterMs = getMonotonicTimeMs();
  toast.success("Settings saved", {
    description: `Your settings have been saved in ${(afterMs - beforeMs).toFixed(0)}ms`,
  });
}
