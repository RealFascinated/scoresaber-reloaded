"use client";

import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateUserPreferences, useUserPreference } from "@/hooks/use-user-preferences";
import { SharedIcons } from "@/shared-icons";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getHMDInfo } from "@ssr/common/hmds";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { HMD } from "@ssr/common/schemas/hmd";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { ReactNode, useMemo, useState } from "react";

type StatContent = {
  value: ReactNode;

  tooltip?: ReactNode;

  /**
   * Optional classes for the value (e.g. a color).
   */
  valueClassName?: string;
};

type Stat = {
  name: string;
  defaultHidden?: boolean;
  create: (player: ScoreSaberPlayer) => StatContent | undefined;
};

const RANKED_VALUE_COLOR = "text-pp";

const playerStats: Stat[] = [
  {
    name: "Ranked Plays",
    create: player => ({
      value: formatNumberWithCommas(player.statistics.totalRankedScores),
      valueClassName: RANKED_VALUE_COLOR,
    }),
  },
  {
    name: "Ranked Score",
    create: player => ({
      value: formatNumberWithCommas(player.statistics.totalRankedScore),
      valueClassName: RANKED_VALUE_COLOR,
    }),
  },
  {
    name: "Avg Ranked Acc",
    create: player => ({
      value: `${player.statistics.averageRankedAccuracy.toFixed(2)}%`,
      valueClassName: RANKED_VALUE_COLOR,
    }),
  },
  {
    name: "Total Plays",
    create: player => ({ value: formatNumberWithCommas(player.statistics.totalScores) }),
  },
  {
    name: "Total Score",
    create: player => ({ value: formatNumberWithCommas(player.statistics.totalScore) }),
  },
  {
    name: "Joined",
    create: player => ({
      value: formatDate(player.joinedDate),
      tooltip: (
        <p>
          {formatDate(player.joinedDate, "DD MMMM YYYY HH:mm")} ({timeAgo(player.joinedDate)})
        </p>
      ),
    }),
  },
  {
    name: "Roles",
    create: player => {
      const roles = getScoreSaberRoles(player);
      if (roles.length === 0) {
        return undefined;
      }

      return {
        value: roles.map(role => role.shortName ?? role.name).join(", "),
        tooltip: (
          <div className="flex flex-col gap-0.5">
            {roles.map(role => (
              <div key={role.roleId} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
                <span>{role.name}</span>
              </div>
            ))}
          </div>
        ),
      };
    },
  },
  {
    name: "Replay Views",
    defaultHidden: true,
    create: player => ({ value: formatNumberWithCommas(player.statistics.replaysWatched) }),
  },
  {
    name: "Top PP",
    defaultHidden: true,
    create: player => {
      if (!player.topPp) {
        return undefined;
      }

      return {
        value: `${formatPp(player.topPp)}pp`,
        tooltip: <p>The most raw pp from a single score</p>,
      };
    },
  },
  {
    name: "Tracked Since",
    defaultHidden: true,
    create: player => ({
      value: formatDate(player.trackedSince),
      tooltip: (
        <p>
          {formatDate(player.trackedSince, "DD MMMM YYYY HH:mm")} ({timeAgo(player.trackedSince)})
        </p>
      ),
    }),
  },
  {
    name: "Headset",
    defaultHidden: true,
    create: player => {
      if (player.hmd === undefined) {
        return undefined;
      }

      return {
        value: (
          <span className="flex items-center gap-1.5">
            <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(player.hmd as HMD)} />
            {player.hmd}
          </span>
        ),
        tooltip: (
          <div className="flex flex-col gap-1">
            <p className="mb-1">Percentage breakdown of headsets for all scores</p>
            {Object.entries(player.hmdBreakdown ?? {}).map(([hmdKey, percentage]) => (
              <div key={hmdKey} className="flex items-center gap-2">
                <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(hmdKey as HMD)} />
                <span>{hmdKey}</span>
                <span className="text-muted-foreground text-sm">{percentage.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        ),
      };
    },
  },
  {
    name: "Peak Rank",
    defaultHidden: true,
    create: player => {
      if (player.peakRank === undefined) {
        return undefined;
      }

      return {
        value: `#${formatNumberWithCommas(player.peakRank.rank)}`,
        tooltip: (
          <p>
            {formatDate(player.peakRank.timestamp, "DD MMMM YYYY")} ({timeAgo(player.peakRank.timestamp)})
          </p>
        ),
      };
    },
  },
  {
    name: "+1 PP",
    defaultHidden: true,
    create: player => {
      if (!player.plusOnePp) {
        return undefined;
      }

      return {
        value: `${formatPp(player.plusOnePp)}pp`,
        tooltip: <p>Amount of raw PP required to increase your global pp by 1pp</p>,
      };
    },
  },
];

function PlayerStat({
  name,
  content,
  editing = false,
}: {
  name: string;
  content: StatContent;
  editing?: boolean;
}) {
  return (
    <div className="bg-control ring-border flex min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-1.5 ring-1 lg:gap-1 lg:px-3 lg:py-2">
      <dt
        className={cn(
          "text-muted-foreground truncate text-[11px] font-medium tracking-wide uppercase",
          editing && "pr-6"
        )}
      >
        {name}
      </dt>
      <dd className={cn("m-0 truncate text-sm font-semibold tabular-nums", content.valueClassName)}>
        {content.tooltip && !editing ? (
          <SimpleTooltip display={content.tooltip} side="bottom" showOnMobile className="w-fit max-w-full">
            {content.value}
          </SimpleTooltip>
        ) : (
          content.value
        )}
      </dd>
    </div>
  );
}

function SortablePlayerStat({
  name,
  content,
  pinned,
  onPinnedChange,
}: {
  name: string;
  content: StatContent;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: name });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative cursor-grab touch-none", isDragging && "z-10 cursor-grabbing opacity-80")}
      {...attributes}
      {...listeners}
    >
      <PlayerStat name={name} content={content} editing />
      <Checkbox
        aria-label={`Show ${name} before "Show more"`}
        checked={pinned}
        onCheckedChange={checked => onPinnedChange(checked === true)}
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
        className="absolute top-2 right-2 cursor-pointer"
      />
    </div>
  );
}

type StatsLayout = {
  /** Every stat name in display order. */
  order: string[];

  /** The stats shown before the "Show more" collapse. */
  pinned: string[];
};

const DEFAULT_ORDER = playerStats.map(stat => stat.name);
const DEFAULT_PINNED = playerStats.filter(stat => !stat.defaultHidden).map(stat => stat.name);

function useStatsLayout() {
  const saved = useUserPreference("playerStatsLayout");
  const { update } = useUpdateUserPreferences();

  const layout = useMemo<StatsLayout>(() => {
    // Stats that were added after the layout was saved go to the end
    const savedOrder = saved?.order.filter(name => DEFAULT_ORDER.includes(name)) ?? [];
    return {
      order: [...savedOrder, ...DEFAULT_ORDER.filter(name => !savedOrder.includes(name))],
      pinned: saved?.pinned ?? DEFAULT_PINNED,
    };
  }, [saved]);

  return {
    layout,
    setOrder: (order: string[]) => update({ playerStatsLayout: { ...layout, order } }),
    setPinned: (name: string, pinned: boolean) =>
      update({
        playerStatsLayout: {
          ...layout,
          pinned: pinned ? [...layout.pinned, name] : layout.pinned.filter(existing => existing !== name),
        },
      }),
    reset: () => update({ playerStatsLayout: null }),
  };
}

/**
 * Button that toggles the edit mode of the player stats. While editing it also shows a reset button.
 */
export function PlayerStatsSettings({
  editing,
  onEditingChange,
}: {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const { reset } = useStatsLayout();
  const { isSignedIn } = useUpdateUserPreferences();
  const buttonClass =
    "text-muted-foreground hover:bg-control hover:text-foreground border-border flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors";

  // The layout is saved to the account, so there is nothing to edit when signed out
  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      {editing && (
        <SimpleTooltip display="Reset to the default stats" side="bottom">
          <button type="button" aria-label="Reset player stats" onClick={reset} className={buttonClass}>
            <SharedIcons.PlayerStatsResetIcon className="size-4" />
          </button>
        </SimpleTooltip>
      )}
      <SimpleTooltip display={editing ? "Finish editing" : "Customize the stats shown"} side="bottom">
        <button
          type="button"
          aria-label={editing ? "Finish editing player stats" : "Edit player stats"}
          aria-pressed={editing}
          onClick={() => onEditingChange(!editing)}
          className={cn(buttonClass, editing && "text-foreground bg-control")}
        >
          {editing ? (
            <>
              <SharedIcons.PlayerStatsEditDoneIcon className="size-4" />
              Done
            </>
          ) : (
            <SharedIcons.PlayerStatsSettingsIcon className="size-4" />
          )}
        </button>
      </SimpleTooltip>
    </>
  );
}

type Props = {
  player: ScoreSaberPlayer;
  editing: boolean;
};

export default function PlayerStats({ player, editing }: Props) {
  const [showMore, setShowMore] = useState(false);
  const { layout, setOrder, setPinned } = useStatsLayout();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allStats = layout.order.flatMap(name => {
    const stat = playerStats.find(candidate => candidate.name === name);
    const content = stat?.create(player);
    return stat && content ? [{ name, content }] : [];
  });
  const visibleStats = editing
    ? allStats
    : allStats.filter(({ name }) => layout.pinned.includes(name) || showMore);
  const hiddenStatCount = allStats.filter(({ name }) => !layout.pinned.includes(name)).length;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    // Stats without a value for this player aren't shown, so they keep their slot in the saved order
    const shownNames = allStats.map(({ name }) => name);
    const moved = arrayMove(
      shownNames,
      shownNames.indexOf(String(active.id)),
      shownNames.indexOf(String(over.id))
    );
    let next = 0;
    setOrder(layout.order.map(name => (shownNames.includes(name) ? moved[next++] : name)));
  };

  const gridClass = "m-0 grid w-full grid-cols-2 gap-1.5 text-left sm:grid-cols-3 lg:gap-2 2xl:grid-cols-4";

  return (
    <div className="flex w-full flex-col items-center gap-2 lg:items-start">
      {editing ? (
        <>
          <p className="text-muted-foreground text-xs">
            Drag to reorder. Tick the stats to show before &quot;Show more&quot;.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleStats.map(({ name }) => name)} strategy={rectSortingStrategy}>
              <dl id="player-stats" className={gridClass}>
                {visibleStats.map(({ name, content }) => (
                  <SortablePlayerStat
                    key={`player-stat-${name}`}
                    name={name}
                    content={content}
                    pinned={layout.pinned.includes(name)}
                    onPinnedChange={pinned => setPinned(name, pinned)}
                  />
                ))}
              </dl>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <dl id="player-stats" className={gridClass}>
          {visibleStats.map(({ name, content }) => (
            <PlayerStat key={`player-stat-${name}`} name={name} content={content} />
          ))}
        </dl>
      )}

      {!editing && hiddenStatCount > 0 && (
        <button
          type="button"
          aria-expanded={showMore}
          aria-controls="player-stats"
          onClick={() => setShowMore(current => !current)}
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs font-medium transition-colors"
        >
          {showMore ? "Show less" : `Show ${hiddenStatCount} more`}
          {showMore ? (
            <SharedIcons.CollapsePlayerStatsIcon className="size-3.5 shrink-0" />
          ) : (
            <SharedIcons.ExpandPlayerStatsIcon className="size-3.5 shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}
