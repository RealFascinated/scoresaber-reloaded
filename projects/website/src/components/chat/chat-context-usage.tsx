"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { ChatContextUsage as ChatContextUsageData } from "@ssr/common/schemas/chat/chat-conversation";
import { useState } from "react";

type ChatContextUsageProps = {
  usage: ChatContextUsageData;
};

type Segment = {
  label: string;
  tokens: number;
  color: string;
};

const RING_RADIUS = 7;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTokens(tokens: number) {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${tokens}`;
}

function formatPercent(tokens: number, maxTokens: number) {
  return `${((tokens / maxTokens) * 100).toFixed(1)}%`;
}

/**
 * A small ring with the share of the context window in use. Opening it breaks the window down into the
 * system prompt, tools and messages, the space held back for replies and compaction, and what is free.
 */
export default function ChatContextUsage({ usage }: ChatContextUsageProps) {
  const [toolsOpen, setToolsOpen] = useState(false);

  const toolTokens = usage.tools.reduce((sum, tool) => sum + tool.tokens, 0);
  const messageTokens = usage.userMessageTokens + usage.assistantMessageTokens;
  const usedSegments: Segment[] = [
    { label: "System prompt", tokens: usage.systemPromptTokens, color: "bg-emerald-500" },
    { label: "Tool definitions", tokens: toolTokens, color: "bg-violet-400" },
    { label: "Summary", tokens: usage.summaryTokens, color: "bg-amber-500" },
    { label: "Your messages", tokens: usage.userMessageTokens, color: "bg-sky-400" },
    { label: "Replies and tool results", tokens: usage.assistantMessageTokens, color: "bg-blue-600" },
  ];
  const usedTokens = usage.systemPromptTokens + toolTokens + usage.summaryTokens + messageTokens;
  const reservedSegments: Segment[] = [
    { label: "Reply reserve", tokens: usage.replyReserveTokens, color: "bg-zinc-500" },
    { label: "Compaction buffer", tokens: usage.compactionBufferTokens, color: "bg-zinc-600" },
  ];
  const freeTokens = Math.max(
    0,
    usage.maxTokens - usedTokens - usage.replyReserveTokens - usage.compactionBufferTokens
  );
  const percent = Math.min(100, Math.round((usedTokens / usage.maxTokens) * 100));

  const renderRow = (segment: Segment) => (
    <li key={segment.label} className="flex items-center gap-2 py-0.5">
      <span className={`size-2.5 shrink-0 rounded-xs ${segment.color}`} />
      <span className="flex-1 truncate">{segment.label}</span>
      <span className="w-14 text-right text-muted-foreground tabular-nums">
        {formatTokens(segment.tokens)}
      </span>
      <span className="w-12 text-right text-muted-foreground tabular-nums">
        {formatPercent(segment.tokens, usage.maxTokens)}
      </span>
    </li>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${percent}% of the context window used`}
          className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 text-xs text-muted-foreground tabular-nums hover:bg-muted"
        >
          <svg viewBox="0 0 20 20" className="size-5 -rotate-90">
            <circle cx="10" cy="10" r={RING_RADIUS} fill="none" strokeWidth="2.5" className="stroke-muted" />
            <circle
              cx="10"
              cy="10"
              r={RING_RADIUS}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
              className="stroke-primary"
            />
          </svg>
          {percent}%
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3 p-4 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span>
            <span className="font-semibold">{percent}%</span>{" "}
            <span className="text-muted-foreground">used</span>
          </span>
          <span className="text-muted-foreground tabular-nums">
            {formatTokens(usedTokens)} / {formatTokens(usage.maxTokens)}
          </span>
        </div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          {usedSegments.map(segment => (
            <div
              key={segment.label}
              className={segment.color}
              style={{ width: `${(segment.tokens / usage.maxTokens) * 100}%` }}
            />
          ))}
        </div>
        <ul>{usedSegments.map(renderRow)}</ul>
        <ul>
          {reservedSegments.map(renderRow)}
          {renderRow({ label: "Free space", tokens: freeTokens, color: "bg-muted" })}
        </ul>
        <div className="border-t border-border pt-2">
          <button
            type="button"
            aria-expanded={toolsOpen}
            className="flex w-full items-center gap-1 py-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => setToolsOpen(open => !open)}
          >
            <ChevronRightIcon className={`size-3.5 transition-transform ${toolsOpen ? "rotate-90" : ""}`} />
            <span className="flex-1 text-left">Tools</span>
            <span className="tabular-nums">{usage.tools.length}</span>
          </button>
          {toolsOpen && (
            <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto pl-5 text-xs text-muted-foreground">
              {usage.tools.map(tool => (
                <li key={tool.name} className="flex justify-between gap-2">
                  <span className="truncate">{tool.name}</span>
                  <span className="tabular-nums">{formatTokens(tool.tokens)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
