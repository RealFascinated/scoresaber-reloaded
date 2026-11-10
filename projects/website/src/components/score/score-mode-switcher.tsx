"use client";

import { SharedIcons } from "@/shared-icons";
import { ReactElement, useState } from "react";
import { ControlRow, Tab, TabGroup } from "../ui/control-panel";
import { ScoreModeEnum } from "./score-mode";

export { ScoreModeEnum };

export type ScoreModeType = {
  name: string;
  id: ScoreModeEnum;
  color: string;
  icon: ReactElement;
};

export const scoreModes: ScoreModeType[] = [
  {
    name: "Global",
    id: ScoreModeEnum.Global,
    color: "bg-primary/40 border-primary text-primary-foreground",
    icon: <SharedIcons.GlobalScoresModeIcon className="h-4 w-4" />,
  },
  {
    name: "Following",
    id: ScoreModeEnum.Following,
    color: "bg-friends/40 border-friends text-primary-foreground",
    icon: <SharedIcons.FollowingScoresModeIcon className="h-4 w-4" />,
  },
  {
    name: "History",
    id: ScoreModeEnum.History,
    color: "bg-history/40 border-history text-primary-foreground",
    icon: <SharedIcons.HistoryScoresModeIcon className="h-4 w-4" />,
  },
];

type ScoreModeProps = {
  initialMode?: ScoreModeEnum;
  onModeChange?: (mode: ScoreModeEnum) => void;
};

export default function ScoreModeSwitcher({ initialMode, onModeChange }: ScoreModeProps) {
  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(initialMode ?? ScoreModeEnum.Global);

  return (
    <ControlRow>
      <TabGroup>
        {scoreModes.map(mode => (
          <Tab
            key={mode.id}
            isActive={mode.id === selectedMode}
            activeClassName={mode.color}
            onClick={() => {
              setSelectedMode(mode.id);
              if (onModeChange) {
                onModeChange(mode.id);
              }
            }}
          >
            {mode.icon}
            {mode.name}
          </Tab>
        ))}
      </TabGroup>
    </ControlRow>
  );
}
