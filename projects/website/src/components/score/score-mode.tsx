"use client";

import { Button } from "@/components/ui/button";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { PersonIcon } from "@radix-ui/react-icons";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ReactElement, useState } from "react";

export type ScoreModeType = {
  name: string;
  id: ScoreModeEnum;
  icon: ReactElement<any>;
};

export enum ScoreModeEnum {
  Global = "global",
  Friends = "friend",
}

export const scoreModes: ScoreModeType[] = [
  {
    name: capitalizeFirstLetter(ScoreModeEnum.Global),
    id: ScoreModeEnum.Global,
    icon: <GlobeAmericasIcon className="w-4 h-4" />,
  },
  {
    name: capitalizeFirstLetter(ScoreModeEnum.Friends),
    id: ScoreModeEnum.Friends,
    icon: <PersonIcon className="w-4 h-4" />,
  },
];

type ScoreModeProps = {
  initialMode?: ScoreModeEnum;
  onModeChange?: (mode: ScoreModeEnum) => void;
};

export default function ScoreMode({ initialMode, onModeChange }: ScoreModeProps) {
  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(
    initialMode ?? ScoreModeEnum.Global
  );

  return (
    <div className="flex gap-2">
      {scoreModes.map(mode => (
        <Button
          key={mode.name}
          variant={selectedMode === mode.id ? "default" : "outline"}
          className="flex items-center gap-1"
          onClick={() => {
            setSelectedMode(mode.id);
            onModeChange && onModeChange(mode.id);
          }}
        >
          {mode.icon}
          {mode.name}
        </Button>
      ))}
    </div>
  );
}
