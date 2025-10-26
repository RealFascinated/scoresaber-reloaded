import { OverlayData } from "@/common/overlay/overlay-data";
import { create } from "zustand";

export const useOverlayDataStore = create<OverlayData>(() => ({}));

/**
 * Resets the overlay data.
 */
export function resetOverlayData() {
  useOverlayDataStore.setState({}, true);
}
