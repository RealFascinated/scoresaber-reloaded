import dayjs from "dayjs";
import { ConsoleColors } from "./utils/console-colors";

const LogLevel = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
const LogLevelColors: Record<keyof typeof LogLevel, string> = {
  debug: ConsoleColors.magenta,
  info: ConsoleColors.green,
  warn: ConsoleColors.yellow,
  error: ConsoleColors.red,
};

export default class Logger {
  /**
   * Logs a message to the console.
   *
   * @param level the log level to use
   * @param message the message to log
   * @param args the arguments to log
   */
  public static log(level: keyof typeof LogLevel, message: string, ...args: unknown[]) {
    const color = LogLevelColors[level];
    const formattedMessage = `${ConsoleColors.gray}${dayjs().format("HH:mm:ss")} ${color}[SSR / ${level.toUpperCase()}]: ${ConsoleColors.reset}${message}`;

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
