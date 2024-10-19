"use client";

import FullscreenLoader from "@/components/loaders/fullscreen-loader";
import { useNetworkState } from "@uidotdev/usehooks";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function OfflineNetwork({ children }: Props) {
  const network = useNetworkState();

  return !network.online ? (
    <FullscreenLoader
      reason={
        <>
          <p>Your device is offline. Check your internet connection.</p>
          <p>Connection Type: {network.type}</p>
        </>
      }
    />
  ) : (
    children
  );
}
