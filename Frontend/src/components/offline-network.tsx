"use client";

import FullscreenLoader from "@/components/loaders/fullscreen-loader";
import { useNetworkState } from "@uidotdev/usehooks";

type Props = {
  children: React.ReactNode;
};

export default function OfflineNetwork({ children }: Props) {
  const network = useNetworkState();

  return !network.online ? (
    <FullscreenLoader reason="Your device is offline. Check your internet connection." />
  ) : (
    children
  );
}
