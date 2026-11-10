"use client";

import { useUserPreference } from "@/hooks/use-user-preferences";

import { resolveBackgroundCover, ResolvedBackgroundCover } from "@/common/background-covers";
import { cn } from "@/common/utils";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const FADE_DURATION_MS = 700;

type Layer = {
  key: string;
  background: ResolvedBackgroundCover;
  visible: boolean;
};

function backgroundKey(background: ResolvedBackgroundCover | undefined): string | undefined {
  return background ? `${background.type}:${background.value}` : undefined;
}

/**
 * Drops layers that are no longer needed: anything below the top-most visible
 * layer, and hidden layers that aren't the current target.
 */
function pruneLayers(layers: Layer[], targetKey: string | undefined): Layer[] {
  const lastVisible = layers.findLastIndex(layer => layer.visible);
  return layers.filter((layer, index) => layer.key === targetKey || (layer.visible && index === lastVisible));
}

function ColorLayer({
  layerKey,
  color,
  onReady,
}: {
  layerKey: string;
  color: string;
  onReady: (key: string) => void;
}) {
  useEffect(() => {
    // Wait a frame so the layer is painted at opacity 0 before fading in
    const frame = requestAnimationFrame(() => onReady(layerKey));
    return () => cancelAnimationFrame(frame);
  }, [layerKey, onReady]);

  return <div className="absolute inset-0" style={{ backgroundColor: color }} />;
}

export default function BackgroundCover() {
  const pathname = usePathname();

  const cover = useUserPreference("backgroundCover");
  const custom = useUserPreference("customBackground");
  const brightness = useUserPreference("backgroundCoverBrightness");
  const blur = useUserPreference("backgroundCoverBlur");

  // The landing page has its own animated background
  const background = pathname === "/" ? undefined : resolveBackgroundCover(cover, custom);
  const targetKey = backgroundKey(background);

  const [layers, setLayers] = useState<Layer[]>([]);
  const [currentKey, setCurrentKey] = useState<string | undefined>(undefined);

  if (targetKey !== currentKey) {
    setCurrentKey(targetKey);
    setLayers(prev =>
      background && targetKey
        ? [...prev.filter(layer => layer.key !== targetKey), { key: targetKey, background, visible: false }]
        : prev.map(layer => ({ ...layer, visible: false }))
    );
  }

  useEffect(() => {
    if (pruneLayers(layers, currentKey).length === layers.length) {
      return;
    }
    const timeout = setTimeout(() => setLayers(prev => pruneLayers(prev, currentKey)), FADE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [layers, currentKey]);

  const showLayer = useCallback((key: string) => {
    setLayers(prev =>
      prev.some(layer => layer.key === key && !layer.visible)
        ? prev.map(layer => (layer.key === key ? { ...layer, visible: true } : layer))
        : prev
    );
  }, []);

  if (layers.length === 0) {
    return null;
  }

  return (
    // Fixed to the viewport so it stays put while scrolling; cards and tables are solid and sit on top of it
    <div className="pointer-events-none fixed inset-0 -z-50 overflow-hidden select-none">
      {layers.map(layer => (
        <div
          key={layer.key}
          className={cn(
            "absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none",
            layer.visible ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDuration: `${FADE_DURATION_MS}ms` }}
        >
          {layer.background.type === "color" ? (
            <ColorLayer layerKey={layer.key} color={layer.background.value} onReady={showLayer} />
          ) : (
            <Image
              src={layer.background.value}
              alt=""
              aria-hidden
              fetchPriority="high"
              // Custom backgrounds can be any url, so skip the remotePatterns check
              unoptimized
              fill
              onLoad={() => showLayer(layer.key)}
              // Scale up slightly so the blur doesn't bleed the page background in at the edges
              className="scale-105 object-cover"
              style={{ filter: `blur(${blur ?? 0}px) brightness(${brightness ?? 100}%)` }}
            />
          )}
        </div>
      ))}
      {/* Scrim: keeps text drawn straight onto the cover (page titles, breadcrumbs) readable on bright images */}
      <div className="from-background/50 to-background/20 absolute inset-0 bg-linear-to-b" />
    </div>
  );
}
