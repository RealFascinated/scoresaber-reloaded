import { formatDate } from "./utils/time-utils";

export default class Logger {
  private static readonly LogLevel = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Logs a message to the console.
   *
   * @param level the log level to use
   * @param message the message to log
   * @param args the arguments to log
   */
  public static log(level: keyof typeof Logger.LogLevel, message: string, ...args: unknown[]) {
    const prefix = `${formatDate(new Date(), "DD/MM/YYYY, HH:mm:ss")} [SSR / ${level.toUpperCase()}]`;
    const formattedMessage = `${prefix}: ${message}`;

    switch (level) {
      case "debug":
        console.debug(formattedMessage, ...args);
        break;
      case "info":
        console.info(formattedMessage, ...args);
        break;
      case "warn":
        console.warn(formattedMessage, ...args);
        break;
      case "error":
        console.error(formattedMessage, ...args);
        break;
    }
  }

  public static debug(message: string, ...args: unknown[]) {
    Logger.log("debug", message, ...args);
  }

  public static info(message: string, ...args: unknown[]) {
    Logger.log("info", message, ...args);
  }

  public static warn(message: string, ...args: unknown[]) {
    Logger.log("warn", message, ...args);
  }

  public static error(message: string, ...args: unknown[]) {
    Logger.log("error", message, ...args);
  }
}
