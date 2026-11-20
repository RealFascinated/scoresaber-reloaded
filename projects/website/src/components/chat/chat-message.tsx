"use client";

import ChatChoiceCard, { readChatChoice } from "@/components/chat/chat-choice-card";
import {
  type ChatDisplayMessage,
  type ChatDisplayPart,
  getToolLabel,
  getToolSummary,
  readToolError,
} from "@/components/chat/chat-display";
import ChatMarkdown from "@/components/chat/chat-markdown";
import ChatMessageActions from "@/components/chat/chat-message-actions";
import PlaylistFileCard, { type PlaylistFile, readPlaylistFile } from "@/components/chat/playlist-file-card";
import { Separator } from "@/components/ui/separator";
import { SharedIcons } from "@/shared-icons";
import type { ChatChoice } from "@ssr/common/schemas/chat/tools/select-tools";
import { memo, useEffect, useMemo, useState } from "react";

type ToolPart = Extract<ChatDisplayPart, { kind: "tool" }>;

type WorkStep = { kind: "text"; text: string } | { kind: "reasoning"; text: string } | ToolPart;

type MessageTiming = {
  isActive: boolean;
  startedAt: number | null;
  durationMs: number | undefined;
};

function splitParts(parts: ChatDisplayPart[], isStreaming: boolean) {
  let lastWorkIndex = -1;
  parts.forEach((part, index) => {
    if (part.kind !== "text") {
      lastWorkIndex = index;
    }
  });

  const steps: WorkStep[] = [];
  const playlists: PlaylistFile[] = [];
  const choices: ChatChoice[] = [];
  const answer: string[] = [];
  parts.forEach((part, index) => {
    if (part.kind === "tool") {
      const playlist = part.output === undefined ? undefined : readPlaylistFile(part.output);
      const choice = part.output === undefined ? undefined : readChatChoice(part.output);
      if (playlist !== undefined) {
        playlists.push(playlist);
      } else if (choice !== undefined) {
        choices.push(choice);
      } else {
        steps.push(part);
      }
      return;
    }
    if (part.text.trim() === "") {
      return;
    }
    if (part.kind === "reasoning" || isStreaming || index < lastWorkIndex) {
      steps.push(part);
    } else {
      answer.push(part.text);
    }
  });
  return { steps, playlists, choices, answerText: answer.join("\n\n") };
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return seconds === 0 ? `${totalMinutes}m` : `${totalMinutes}m ${seconds}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running]);
  return now;
}

function ToolStep({ tool }: { tool: ToolPart }) {
  const [isOpen, setIsOpen] = useState(false);
  const isError = tool.state === "error";
  const isRunning = tool.state === "running";
  const summary = getToolSummary(tool);
  const error = isError ? readToolError(tool.errorText) : undefined;
  const hasInput = tool.input !== undefined && Object.keys(tool.input).length > 0;

  return (
    <li className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={isRunning}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 self-start text-xs transition-colors disabled:cursor-default ${
          isError ? "text-destructive" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {isRunning ? (
          <SharedIcons.PageLoadingIcon className="size-3 shrink-0 animate-spin" />
        ) : isError ? (
          <SharedIcons.WarningAlertIcon className="size-3 shrink-0" />
        ) : (
          <SharedIcons.ChatToolDoneIcon className="size-3 shrink-0 text-success" />
        )}
        <span className="truncate">
          {isError ? `${getToolLabel(tool.toolName)} failed` : getToolLabel(tool.toolName)}
          {isRunning ? " …" : ""}
        </span>
        {summary !== "" && (
          <span className={`truncate ${isError ? "text-destructive/70" : "text-muted-foreground/60"}`}>
            · {summary}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="flex flex-col gap-2 rounded-md bg-secondary/40 p-2 text-xs">
          {hasInput && (
            <div className="flex flex-col gap-1">
              <span className="font-medium text-muted-foreground">Input</span>
              <pre className="max-h-40 overflow-auto font-mono whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(tool.input, null, 2)}
              </pre>
            </div>
          )}
          {error !== undefined ? (
            <div className="flex flex-col gap-1 text-destructive">
              <p>{error.message}</p>
              {error.hint !== undefined && <p className="text-destructive/80">Hint: {error.hint}</p>}
              {error.code !== undefined && (
                <p className="text-destructive/60">
                  {error.code}
                  {error.retryable ? " · retryable" : ""}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="font-medium text-muted-foreground">Output</span>
              <pre className="max-h-56 overflow-auto font-mono whitespace-pre-wrap text-muted-foreground">
                {JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ThoughtStep({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className="inline-flex cursor-pointer items-center gap-1.5 self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <SharedIcons.ChatThoughtIcon className="size-3 shrink-0" />
        <span>Thought</span>
        <SharedIcons.ChatWorkChevronIcon
          className={`size-3 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>
      {isOpen && <p className="text-xs whitespace-pre-wrap text-muted-foreground/80">{text}</p>}
    </li>
  );
}

function WorkRow({
  steps,
  timing,
  hasAnswer,
}: {
  steps: WorkStep[];
  timing: MessageTiming;
  hasAnswer: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const isWorking = timing.isActive;
  const now = useNow(isWorking && timing.startedAt !== null);
  const isOpen = manualOpen ?? isWorking;
  const tools = steps.filter(step => step.kind === "tool");
  const hasError = tools.some(tool => tool.state === "error");

  let label = "Worked";
  if (isWorking) {
    label =
      timing.startedAt === null
        ? "Working"
        : `Working for ${formatDuration(Math.max(0, now - timing.startedAt))}`;
  } else if (timing.durationMs !== undefined) {
    label = `Worked for ${formatDuration(timing.durationMs)}`;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setManualOpen(!isOpen)}
        className="mt-0.5 inline-flex h-7 cursor-pointer items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors select-none hover:text-foreground"
      >
        {isWorking && <SharedIcons.PageLoadingIcon className="size-3.5 shrink-0 animate-spin" />}
        <span>{label}</span>
        {hasError && (
          <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="A step failed" />
        )}
        <SharedIcons.ChatWorkChevronIcon
          className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
      </button>
      {isOpen && (
        <ul className="flex flex-col gap-2 border-l border-border/60 pl-3">
          {steps.map((step, index) =>
            step.kind === "tool" ? (
              <ToolStep key={`${step.toolName}-${index}`} tool={step} />
            ) : step.kind === "reasoning" ? (
              <ThoughtStep key={`${step.kind}-${index}`} text={step.text} />
            ) : (
              <li key={`${step.kind}-${index}`}>
                <ChatMarkdown text={step.text} isStreaming={timing.isActive} />
              </li>
            )
          )}
        </ul>
      )}
      {!isOpen && hasAnswer && <Separator className="bg-border/60" />}
    </div>
  );
}

function UserText({ message }: { message: ChatDisplayMessage }) {
  const text = message.parts
    .filter(part => part.kind === "text")
    .map(part => part.text)
    .join("\n");
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg border border-primary/20 bg-primary/15 px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs">
        {text}
      </div>
    </div>
  );
}

function ChatMessageItem({
  message,
  isActive,
  startedAt,
  durationMs,
  onRegenerate,
  onSelect,
}: {
  message: ChatDisplayMessage;
  isActive: boolean;
  startedAt: number | null;
  durationMs: number | undefined;
  onRegenerate?: () => void;
  onSelect?: (text: string) => void;
}) {
  const timing = useMemo(
    () => ({ isActive, startedAt, durationMs }) satisfies MessageTiming,
    [isActive, startedAt, durationMs]
  );
  const { steps, playlists, choices, answerText } = useMemo(
    () => splitParts(message.parts, isActive),
    [message.parts, isActive]
  );
  if (message.role === "user") {
    return <UserText message={message} />;
  }

  const hasAnswer = answerText.trim() !== "";
  if (steps.length === 0 && playlists.length === 0 && choices.length === 0 && !hasAnswer) {
    return null;
  }

  return (
    <div className="group/message flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {steps.length > 0 && <WorkRow steps={steps} timing={timing} hasAnswer={hasAnswer} />}
        {playlists.map(file => (
          <PlaylistFileCard key={`${message.id}-${file.fileName}`} file={file} />
        ))}
        {hasAnswer && <ChatMarkdown text={answerText} isStreaming={timing.isActive} />}
        {choices.map((choice, index) => (
          <ChatChoiceCard key={`${message.id}-choice-${index}`} choice={choice} onSelect={onSelect} />
        ))}
        {hasAnswer && !timing.isActive && (
          <ChatMessageActions text={answerText} onRegenerate={onRegenerate} />
        )}
      </div>
    </div>
  );
}

/**
 * One message in the pane: user text in a bubble, assistant work collapsed into one row above the Markdown answer and file cards.
 */
export default memo(ChatMessageItem);
