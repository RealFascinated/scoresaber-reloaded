"use client";

import useSettings from "@/hooks/use-settings";

export default function BackgroundCover() {
  const settings = useSettings();

  if (
    settings == undefined ||
    settings?.backgroundCover == undefined ||
    settings?.backgroundCover == ""
  ) {
    return null; // Don't render anything if the background image is not set
  }
  const backgroundCover = settings.backgroundCover;

  // Static background color
  if (backgroundCover.startsWith("#")) {
    return (
      <div
        className={`fixed -z-50 object-cover w-screen h-screen pointer-events-none select-none`}
        style={{ backgroundColor: backgroundCover }}
      />
    );
  }

  return (
    <img
      src={backgroundCover}
      alt="Background image"
      fetchPriority="high"
      className={`fixed -z-50 object-cover w-screen h-screen blur-xs brightness-[33%] pointer-events-none select-none`}
    />
  );
}
