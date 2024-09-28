/**
 * This function returns the time ago of the input date
 *
 * @param input Date | number
 * @returns the format of the time ago
 */
export function timeAgo(input: Date | number) {
  const date = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges: { [key: string]: number } = {
    year: 3600 * 24 * 365,
    month: 3600 * 24 * 30,
    week: 3600 * 24 * 7,
    day: 3600 * 24,
    hour: 3600,
    minute: 60,
    second: 1,
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  for (const key in ranges) {
    if (ranges[key] < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / ranges[key];
      return formatter.format(
        Math.round(delta),
        key as Intl.RelativeTimeFormatUnit,
      );
    }
  }
}

/**
 * Formats the date in the format "DD MMMM YYYY"
 *
 * @param date the date
 */
export function formatDateMinimal(date: Date) {
  return date.toLocaleString("en-US", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Gets the midnight aligned date
 *
 * @param date the date
 */
export function getMidnightAlignedDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Gets the date X days ago
 *
 * @param days the number of days to go back
 * @returns {Date} A Date object representing the date X days ago
 */
export function getDaysAgoDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Gets the amount of days ago a date was
 *
 * @param date the date
 * @returns the amount of days
 */
export function getDaysAgo(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
}

/**
 * Parses a date from a string
 *
 * @param date the date
 */
export function parseDate(date: string): Date {
  return new Date(date);
}
