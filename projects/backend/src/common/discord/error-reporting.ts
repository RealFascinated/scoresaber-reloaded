import Logger from "@ssr/common/logger";
import { DiscordChannels, sendEmbedToChannel } from "../../bot/bot";
import { createGenericEmbed } from "./embed";

const errorLog = Logger.withTopic("Global Errors");

const EMBED_DESCRIPTION_MAX = 4096;

const THROTTLE_MS = 30_000;

const recentReports = new Map<string, number>();

function shouldReport(fingerprint: string) {
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

function truncate(text: string, max: number) {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 20)}\n\n… (truncated)`;
}

const MAX_CAUSE_DEPTH = 5;

const BASE_MAX = 2200;

function formatCauseChain(error: unknown) {
  const lines: string[] = [];
  let current: unknown = error instanceof Error ? error.cause : undefined;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== undefined && current !== null; depth++) {
    if (typeof current !== "object") {
      lines.push(String(current));
      break;
    }

    const record = current as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      detail?: unknown;
      hint?: unknown;
      cause?: unknown;
    };
    const parts: string[] = [];
    if (typeof record.name === "string" || typeof record.message === "string") {
      parts.push(
        `${typeof record.name === "string" ? record.name : "Error"}: ${String(record.message ?? "")}`
      );
    }
    if (typeof record.code === "string") {
      parts.push(`code: ${record.code}`);
    }
    if (typeof record.detail === "string") {
      parts.push(`detail: ${record.detail}`);
    }
    if (typeof record.hint === "string") {
      parts.push(`hint: ${record.hint}`);
    }
    if (parts.length > 0) {
      lines.push(`${"  ".repeat(depth)}Caused by ${parts.join(" | ")}`);
    }
    current = record.cause;
  }

  return lines.length > 0 ? lines.join("\n") : undefined;
}

export function formatErrorForDiscord(error: unknown) {
  const causes = formatCauseChain(error);
  const withCauses = (base: string) => (causes ? `${truncate(base, BASE_MAX)}\n\n${causes}` : base);

  if (error instanceof Error) {
    return withCauses(error.stack ?? `${error.name}: ${error.message}`);
  }

  if (typeof error === "object" && error !== null) {
    const record = error as { message?: unknown; stack?: unknown };
    if (typeof record.message === "string") {
      return withCauses(typeof record.stack === "string" ? record.stack : record.message);
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
export function reportErrorToDiscord(title: string, error: unknown, extra?: string) {
  const message = formatErrorForDiscord(error);
  const fingerprint = `${title}:${message.split("\n")[0] ?? message}`.slice(0, 500);

  if (!shouldReport(fingerprint)) {
    return;
  }

  const descriptionParts = [extra, message].filter(
    (part): part is string => part !== undefined && part.length > 0
  );
  const description = truncate(descriptionParts.join("\n\n"), EMBED_DESCRIPTION_MAX);

  void sendEmbedToChannel(DiscordChannels.BACKEND_LOGS, createGenericEmbed(title, description, "error"));
}

/**
 * Hooks process-level handlers for uncaught exceptions and unhandled promise rejections.
 * Call once at startup before other async work when possible.
 */
export function registerGlobalErrorHandlers() {
  process.on("uncaughtException", error => {
    errorLog.error("Uncaught exception:", error);
    reportErrorToDiscord("Uncaught exception", error);
  });

  process.on("unhandledRejection", reason => {
    errorLog.error("Unhandled rejection:", reason);
    reportErrorToDiscord("Unhandled rejection", reason);
  });
}
