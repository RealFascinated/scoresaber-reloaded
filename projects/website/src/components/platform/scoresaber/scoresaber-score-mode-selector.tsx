"use client";

import ScoresaberLogo from "@/components/logos/logos/scoresaber-logo";
import { usePageTransition } from "@/components/ui/page-transition-context";
import { ScoreSaberScoreDataMode } from "@ssr/common/types/score-data-mode";
import { TrendingUpIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, startTransition } from "react";
import { Tab, TabGroup } from "../../ui/control-panel";

export const SCORES_MODES: Record<
  ScoreSaberScoreDataMode,
  { name: string; icon: React.ReactNode; tooltip: string }
> = {
  ssr: {
    name: "SSR",
    icon: <ScoresaberLogo className="h-4 w-4" />,
    tooltip:
      "SSR scores are the scores that are stored in SSR. They may be missing or out of date.",
  },
  live: {
    name: "Live",
    icon: <TrendingUpIcon className="h-4 w-4" />,
    tooltip: "Live data pulled from the ScoreSaber API.",
  },
};

export function useScoreModeSelector() {
  const { setIsLoading } = usePageTransition();
  const pathname = usePathname();

  const [mode, setMode] = useQueryState("mode", parseAsString.withDefault("live")) as [
    ScoreSaberScoreDataMode,
    (value: ScoreSaberScoreDataMode | null) => void,
  ];

  const handleModeChange = useCallback(
    (newMode: ScoreSaberScoreDataMode) => {
      setIsLoading(true);
      // Replace URL with only mode param, clearing all others
      const newUrl = newMode === "live" ? pathname : `${pathname}?mode=${newMode}`;
      window.history.replaceState({}, "", newUrl);
      // Trigger a re-read of the URL by nuqs
      setMode(newMode);
    },
    [setIsLoading, pathname, setMode]
  );

  return { mode, handleModeChange };
}

export function ScoreSaberScoreModeTabs() {
  const { mode, handleModeChange } = useScoreModeSelector();

  return (
    <TabGroup>
      {Object.keys(SCORES_MODES).map(modeKey => {
        const scoreMode = modeKey as ScoreSaberScoreDataMode;
        return (
          <Tab
            key={modeKey}
            isActive={modeKey === mode}
            onClick={() => handleModeChange(scoreMode)}
            tooltip={SCORES_MODES[scoreMode].tooltip}
          >
            {SCORES_MODES[scoreMode].icon}
            {SCORES_MODES[scoreMode].name}
          </Tab>
        );
      })}
    </TabGroup>
  );
}
