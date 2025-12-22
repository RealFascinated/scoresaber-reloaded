"use client";

import ScoresaberLogo from "@/components/logos/logos/scoresaber-logo";
import { usePageTransition } from "@/contexts/page-transition-context";
import { useQueryParamSelector } from "@/hooks/use-query-param-selector";
import { ScoreSaberScoreDataMode } from "@ssr/common/types/score-data-mode";
import { TrendingUpIcon } from "lucide-react";
import { parseAsStringLiteral } from "nuqs";
import { Tab, TabGroup } from "../../ui/control-panel";

const ALLOWED_SCORE_SABER_SCORE_MODES = ["live", "ssr"] as const;
const SCORE_SABER_SCORE_MODE_QUERY = parseAsStringLiteral(ALLOWED_SCORE_SABER_SCORE_MODES).withDefault(
  "live"
);

export const SCORES_MODES: Record<
  ScoreSaberScoreDataMode,
  { name: string; icon: React.ReactNode; tooltip: string }
> = {
  ssr: {
    name: "SSR",
    icon: <ScoresaberLogo className="h-4 w-4" />,
    tooltip: "SSR scores are the scores that are stored in SSR. They may be missing or out of date.",
  },
  live: {
    name: "Live",
    icon: <TrendingUpIcon className="h-4 w-4" />,
    tooltip: "Live data pulled from the ScoreSaber API.",
  },
};

export function useScoreModeSelector() {
  const { setIsLoading } = usePageTransition();

  const { value: mode, setValue: handleModeChange } = useQueryParamSelector({
    param: "mode",
    parser: SCORE_SABER_SCORE_MODE_QUERY,
    clearOtherParams: true,
    omitParamWhen: v => v === "live",
    onStartTransition: () => setIsLoading(true),
  });

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
