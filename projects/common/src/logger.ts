import dayjs from "dayjs";
import { env } from "./env";
import { ConsoleColors } from "./utils/console-colors";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: ConsoleColors.magenta,
  info: ConsoleColors.green,
  warn: ConsoleColors.yellow,
  error: ConsoleColors.red,
};

const SEP = `${ConsoleColors.gray} │ ${ConsoleColors.reset}`;

const CONFIGURED_LEVEL: LogLevel =
  (typeof window === "undefined" ? (env.LOG_LEVEL as LogLevel | undefined) : undefined) ?? "info";

export type ScopedLogger = ReturnType<typeof Logger.withTopic>;

export default class Logger {
  public static withTopic(topic: string) {
    return {
      log: (level: LogLevel, message: string, ...args: unknown[]) =>
        Logger.emit(level, topic, message, args),
      debug: (message: string, ...args: unknown[]) =>
        Logger.emit("debug", topic, message, args),
      info: (message: string, ...args: unknown[]) =>
        Logger.emit("info", topic, message, args),
      warn: (message: string, ...args: unknown[]) =>
        Logger.emit("warn", topic, message, args),
      error: (message: string, ...args: unknown[]) =>
        Logger.emit("error", topic, message, args),
    };
  }

  public static log(level: LogLevel, message: string, ...args: unknown[]) {
    Logger.emit(level, undefined, message, args);
  }

  public static debug(message: string, ...args: unknown[]) {
    Logger.emit("debug", undefined, message, args);
  }

  public static info(message: string, ...args: unknown[]) {
    Logger.emit("info", undefined, message, args);
  }

  public static warn(message: string, ...args: unknown[]) {
    Logger.emit("warn", undefined, message, args);
  }

  public static error(message: string, ...args: unknown[]) {
    Logger.emit("error", undefined, message, args);
  }

  private static emit(
    level: LogLevel,
    topic: string | undefined,
    message: string,
    args: unknown[]
  ) {
    if (LEVEL_RANK[level] < LEVEL_RANK[CONFIGURED_LEVEL]) {
      return;
    }

    const timestamp = `${ConsoleColors.gray}${dayjs().format("HH:mm:ss")}${ConsoleColors.reset}`;
    const label = `${LEVEL_COLOR[level]}${level.toUpperCase().padEnd(5)}${ConsoleColors.reset}`;
    const prefix = topic
      ? `${timestamp}${SEP}${label}${SEP}${topic}${SEP}`
      : `${timestamp}${SEP}${label}${SEP}`;

    console[level](`${prefix}${message}`, ...args);
  }
}