import dayjs from "dayjs";
import { env } from "./env";
import { ConsoleColors } from "./utils/console-colors";

export type LogLevel = "debug" | "info" | "warn" | "error";

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

const isServer = typeof window === "undefined";

const JSON_OUTPUT =
  isServer && (env.LOG_FORMAT ? env.LOG_FORMAT === "json" : process.env.NODE_ENV === "production");

export type LogAttributes = Record<string, unknown>;

export type LogRecord = {
  timestamp: Date;
  level: LogLevel;
  topic?: string;
  message: string;
  attributes: LogAttributes;
  error?: { name: string; message: string; stack?: string };
};

export type LogSink = (record: LogRecord) => void;

const sinks: LogSink[] = [];

function serializeError(error: Error) {
  return { name: error.name, message: error.message, stack: error.stack };
}

function isPlainObject(value: unknown): value is LogAttributes {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function buildRecord(level: LogLevel, topic: string | undefined, message: string, args: unknown[]) {
  const attributes: LogAttributes = {};
  const extras: unknown[] = [];
  let error: LogRecord["error"];

  for (const arg of args) {
    if (arg instanceof Error) {
      error ??= serializeError(arg);
    } else if (isPlainObject(arg)) {
      Object.assign(attributes, arg);
    } else {
      extras.push(arg);
    }
  }
  if (extras.length > 0) {
    attributes.args = extras;
  }

  return { timestamp: new Date(), level, topic, message, attributes, error } satisfies LogRecord;
}

function stringifyRecord(record: LogRecord) {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    {
      time: record.timestamp.toISOString(),
      level: record.level,
      topic: record.topic,
      message: record.message,
      ...record.attributes,
      error: record.error,
    },
    (_key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    }
  );
}

export type ScopedLogger = ReturnType<typeof Logger.withTopic>;

export default class Logger {
  /** Registers a sink that receives every record at or above the configured level. */
  public static addSink(sink: LogSink) {
    sinks.push(sink);
  }

  public static withTopic(topic: string) {
    return {
      log: (level: LogLevel, message: string, ...args: unknown[]) => Logger.emit(level, topic, message, args),
      debug: (message: string, ...args: unknown[]) => Logger.emit("debug", topic, message, args),
      info: (message: string, ...args: unknown[]) => Logger.emit("info", topic, message, args),
      warn: (message: string, ...args: unknown[]) => Logger.emit("warn", topic, message, args),
      error: (message: string, ...args: unknown[]) => Logger.emit("error", topic, message, args),
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

  private static emit(level: LogLevel, topic: string | undefined, message: string, args: unknown[]) {
    if (LEVEL_RANK[level] < LEVEL_RANK[CONFIGURED_LEVEL]) {
      return;
    }

    if (JSON_OUTPUT || sinks.length > 0) {
      const record = buildRecord(level, topic, message, args);
      if (JSON_OUTPUT) {
        process.stdout.write(`${stringifyRecord(record)}\n`);
      }
      for (const sink of sinks) {
        sink(record);
      }
      if (JSON_OUTPUT) {
        return;
      }
    }

    const timestamp = `${ConsoleColors.gray}${dayjs().format("HH:mm:ss")}${ConsoleColors.reset}`;
    const label = `${LEVEL_COLOR[level]}${level.toUpperCase().padEnd(5)}${ConsoleColors.reset}`;
    const prefix = topic
      ? `${timestamp}${SEP}${label}${SEP}${topic}${SEP}`
      : `${timestamp}${SEP}${label}${SEP}`;

    console[level](`${prefix}${message}`, ...args);
  }
}
