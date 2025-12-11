import dayjs from "dayjs";
import { env } from "./env";
import { ConsoleColors } from "./utils/console-colors";

export default class Logger {
  private static readonly LogLevel = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private static readonly LogColors = {
    debug: ConsoleColors.magenta,
    info: ConsoleColors.green,
    warn: ConsoleColors.yellow,
    error: ConsoleColors.red,
  };

  /**
   * Logs a message to the console.
   *
   * @param level the log level to use
   * @param message the message to log
   * @param args the arguments to log
   */
  public static log(level: keyof typeof Logger.LogLevel, message: string, ...args: unknown[]) {
    if (!Logger.shouldLog(level)) {
      return;
    }

    const color = Logger.LogColors[level];
    let formattedMessage = message;
    const remainingArgs: unknown[] = [];

    for (let i = 0; i < args.length; i++) {
      if (formattedMessage.includes("%s")) {
        formattedMessage = formattedMessage.replace("%s", String(args[i]));
      } else {
        remainingArgs.push(...args.slice(i));
        break;
      }
    }

    console[level](
      `${ConsoleColors.gray}${dayjs().format("HH:mm:ss")} ${color}[SSR / ${level.toUpperCase()}]: ${ConsoleColors.reset}${formattedMessage}`,
      ...remainingArgs
    );
  }

  /**
   * Logs a debug message to the console.
   *
   * @param message the message to log
   * @param args the arguments to log
   */
  public static debug(message: string, ...args: unknown[]) {
    Logger.log("debug", message, ...args);
  }

  /**
   * Logs an info message to the console.
   *
   * @param message the message to log
   * @param args the arguments to log
   */
  public static info(message: string, ...args: unknown[]) {
    Logger.log("info", message, ...args);
  }

  /**
   * Logs a warning message to the console.
   *
   * @param message the message to log
   * @param args the arguments to log
   */
  public static warn(message: string, ...args: unknown[]) {
    Logger.log("warn", message, ...args);
  }

  /**
   * Logs an error message to the console.
   *
   * @param message the message to log
   * @param args the arguments to log
   */
  public static error(message: string, ...args: unknown[]) {
    Logger.log("error", message, ...args);
  }

  /**
   * Checks if a log level should be logged.
   *
   * @param level the log level to check
   * @returns true if the log level should be logged, false otherwise
   */
  private static shouldLog(level: keyof typeof Logger.LogLevel): boolean {
    const configuredLevel = (typeof window === "undefined" ? env.LOG_LEVEL : undefined) || "info";
    return Logger.LogLevel[level] >= Logger.LogLevel[configuredLevel];
  }
}
