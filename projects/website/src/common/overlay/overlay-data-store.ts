import { create } from "zustand";
import { OverlayData } from "@/common/overlay/overlay-data";

export const useOverlayDataStore = create<OverlayData>(set => ({}));

/**
 * Resets the overlay data.
 */
export function resetOverlayData() {
  useOverlayDataStore.setState({});
}
