import Logger from "@ssr/common/logger";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { createGenericEmbed } from "./embed";

const errorLog = Logger.withTopic("Global Errors");

/** Discord embed description limit */
const EMBED_DESCRIPTION_MAX = 4096;

/** Suppress duplicate reports for the same error within this window */
const THROTTLE_MS = 30_000;

const recentReports = new Map<string, number>();

function shouldReport(fingerprint: string): boolean {
  const now = Date.now();
  const last = recentReports.get(fingerprint);
  if (last !== undefined && now - last < THROTTLE_MS) {
    return false;
  }
  recentReports.set(fingerprint, now);

  if (recentReports.size > 200) {
    for (const [key, time] of recentReports) {
      if (now - time > THROTTLE_MS) {
        recentReports.delete(key);
      }
    }
  }

  return true;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 20)}\n\n… (truncated)`;
}

function formatPgCause(error: unknown): string | undefined {
  if (!(error instanceof Error) || !("cause" in error)) {
    return undefined;
  }

  const cause = error.cause;
  if (typeof cause !== "object" || cause === null) {
    return undefined;
  }

  const record = cause as { code?: unknown; detail?: unknown; hint?: unknown };
  const parts: string[] = [];
  if (typeof record.code === "string") {
    parts.push(`code: ${record.code}`);
  }
  if (typeof record.detail === "string") {
    parts.push(`detail: ${record.detail}`);
  }
  if (typeof record.hint === "string") {
    parts.push(`hint: ${record.hint}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

export function formatErrorForDiscord(error: unknown): string {
  const pgCause = formatPgCause(error);

  if (error instanceof Error) {
    const base = error.stack ?? `${error.name}: ${error.message}`;
    return pgCause ? `${base}\n\nPostgreSQL:\n${pgCause}` : base;
  }

  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; stack?: unknown };
    if (typeof record.message === "string") {
      const base =
        typeof record.stack === "string" ? record.stack : record.message;
      return pgCause ? `${base}\n\nPostgreSQL:\n${pgCause}` : base;
    }

    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

/**
 * Reports an error to the backend logs Discord channel (when configured).
 * Duplicate errors are throttled to avoid flooding the channel.
 */
export function reportErrorToDiscord(title: string, error: unknown, extra?: string): void {
  const message = formatErrorForDiscord(error);
  const fingerprint = `${title}:${message.split("\n")[0] ?? message}`.slice(0, 500);

  if (!shouldReport(fingerprint)) {
    return;
  }

  const descriptionParts = [extra, message].filter((part): part is string => part !== undefined && part.length > 0);
  const description = truncate(descriptionParts.join("\n\n"), EMBED_DESCRIPTION_MAX);

  void sendEmbedToChannel(
    DiscordChannels.BACKEND_LOGS,
    createGenericEmbed(title, description, "error")
  );
}

/**
 * Hooks process-level handlers for uncaught exceptions and unhandled promise rejections.
 * Call once at startup before other async work when possible.
 */
export function registerGlobalErrorHandlers(): void {
  process.on("uncaughtException", error => {
    errorLog.error("Uncaught exception:", error);
    reportErrorToDiscord("Uncaught exception", error);
  });

  process.on("unhandledRejection", reason => {
    errorLog.error("Unhandled rejection:", reason);
    reportErrorToDiscord("Unhandled rejection", reason);
  });
}
