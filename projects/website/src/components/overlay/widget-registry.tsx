import type { OverlayRuntime } from "@/common/overlay/overlay-runtime";
import { PbDeltaWidget } from "@/components/overlay/widgets/pb-delta-widget";
import {
  PlayerAvatarWidget,
  PlayerBlPpWidget,
  PlayerCountryRankWidget,
  PlayerMedalsWidget,
  PlayerNameWidget,
  PlayerPpWidget,
  PlayerRankWidget,
} from "@/components/overlay/widgets/player-widgets";
import {
  ScoreAccuracyWidget,
  ScoreBlPpWidget,
  ScoreComboWidget,
  ScorePpWidget,
  ScoreScoreWidget,
} from "@/components/overlay/widgets/score-widgets";
import { SongCoverWidget, SongInfoWidget } from "@/components/overlay/widgets/song-widgets";
import { TextWidget } from "@/components/overlay/widgets/text-widget";
import {
  OverlayWidgetTypes,
  type OverlayElement,
  type OverlayWidgetType,
} from "@ssr/common/schemas/overlay/overlay-element";
import {
  CaseSensitive,
  Flag,
  Flame,
  Gauge,
  Hash,
  Image,
  Medal,
  Music,
  Percent,
  TrendingUp,
  Trophy,
  Type,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ReactNode } from "react";

export type OverlayWidgetDefinition = {
  icon: LucideIcon;
  label: string;
  group: "Player" | "Song" | "Score" | "Other";
  /** Whether the widget only has something to show while the game is connected. */
  requiresRealTimeData: boolean;
  /** Whether there is data to show right now. Widgets without data are hidden on stream. */
  isAvailable: (runtime: OverlayRuntime) => boolean;
};

const hasPlayer = (runtime: OverlayRuntime) => !!runtime.player;
const hasSong = (runtime: OverlayRuntime) => !!runtime.data.map?.beatSaverMap;
const hasScore = (runtime: OverlayRuntime) => !!runtime.data.score;

export const OVERLAY_WIDGETS: Record<OverlayWidgetType, OverlayWidgetDefinition> = {
  playerAvatar: {
    icon: UserRound,
    label: "Player avatar",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: hasPlayer,
  },
  playerName: {
    icon: Type,
    label: "Player name",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: hasPlayer,
  },
  playerRank: {
    icon: Trophy,
    label: "Global rank",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: hasPlayer,
  },
  playerCountryRank: {
    icon: Flag,
    label: "Country rank",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: hasPlayer,
  },
  playerMedals: {
    icon: Medal,
    label: "Medals",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: hasPlayer,
  },
  playerPp: {
    icon: Gauge,
    label: "ScoreSaber PP",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: hasPlayer,
  },
  playerBlPp: {
    icon: Gauge,
    label: "BeatLeader PP",
    group: "Player",
    requiresRealTimeData: false,
    isAvailable: runtime => !!runtime.blPlayer,
  },
  songCover: {
    icon: Image,
    label: "Song cover",
    group: "Song",
    requiresRealTimeData: true,
    isAvailable: hasSong,
  },
  songInfo: {
    icon: Music,
    label: "Song info",
    group: "Song",
    requiresRealTimeData: true,
    isAvailable: hasSong,
  },
  scoreAccuracy: {
    icon: Percent,
    label: "Accuracy",
    group: "Score",
    requiresRealTimeData: true,
    isAvailable: hasScore,
  },
  scoreCombo: {
    icon: Flame,
    label: "Combo",
    group: "Score",
    requiresRealTimeData: true,
    isAvailable: hasScore,
  },
  scoreScore: {
    icon: Hash,
    label: "Score",
    group: "Score",
    requiresRealTimeData: true,
    isAvailable: hasScore,
  },
  scorePp: {
    icon: Gauge,
    label: "Live ScoreSaber PP",
    group: "Score",
    requiresRealTimeData: true,
    isAvailable: runtime => hasScore(runtime) && !!runtime.data.map?.leaderboard?.ranked,
  },
  scoreBlPp: {
    icon: Gauge,
    label: "Live BeatLeader PP",
    group: "Score",
    requiresRealTimeData: true,
    isAvailable: runtime => hasScore(runtime) && !!runtime.ratings?.ranked,
  },
  pbDelta: {
    icon: TrendingUp,
    label: "PB delta",
    group: "Score",
    requiresRealTimeData: true,
    isAvailable: runtime => hasScore(runtime) && !!runtime.pb,
  },
  text: {
    icon: CaseSensitive,
    label: "Text",
    group: "Other",
    requiresRealTimeData: false,
    isAvailable: () => true,
  },
};

export const OVERLAY_WIDGET_TYPES = Object.keys(OVERLAY_WIDGETS) as OverlayWidgetType[];

/** Renders the content of an element. */
export function OverlayWidget({ element }: { element: OverlayElement }): ReactNode {
  switch (element.type) {
    case OverlayWidgetTypes.PlayerAvatar:
      return <PlayerAvatarWidget />;
    case OverlayWidgetTypes.PlayerName:
      return <PlayerNameWidget />;
    case OverlayWidgetTypes.PlayerRank:
      return <PlayerRankWidget />;
    case OverlayWidgetTypes.PlayerCountryRank:
      return <PlayerCountryRankWidget />;
    case OverlayWidgetTypes.PlayerMedals:
      return <PlayerMedalsWidget />;
    case OverlayWidgetTypes.PlayerPp:
      return <PlayerPpWidget options={element.options} />;
    case OverlayWidgetTypes.PlayerBlPp:
      return <PlayerBlPpWidget options={element.options} />;
    case OverlayWidgetTypes.SongCover:
      return <SongCoverWidget />;
    case OverlayWidgetTypes.SongInfo:
      return <SongInfoWidget />;
    case OverlayWidgetTypes.ScoreAccuracy:
      return <ScoreAccuracyWidget />;
    case OverlayWidgetTypes.ScoreCombo:
      return <ScoreComboWidget />;
    case OverlayWidgetTypes.ScoreScore:
      return <ScoreScoreWidget />;
    case OverlayWidgetTypes.ScorePp:
      return <ScorePpWidget options={element.options} />;
    case OverlayWidgetTypes.ScoreBlPp:
      return <ScoreBlPpWidget options={element.options} />;
    case OverlayWidgetTypes.PbDelta:
      return <PbDeltaWidget options={element.options} />;
    case OverlayWidgetTypes.Text:
      return <TextWidget options={element.options} />;
  }
}
