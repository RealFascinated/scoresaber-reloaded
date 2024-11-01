/**
 * This function returns the time ago of the input date
 *
 * @param input Date | number (timestamp)
 * @returns the format of the time ago
 */
export function timeAgo(input: Date) {
  const inputDate = new Date(input).getTime(); // Convert input to a Date object if it's not already
  const now = new Date().getTime();
  const deltaSeconds = Math.floor((now - inputDate) / 1000); // Get time difference in seconds

  if (deltaSeconds <= 10) {
    return "just now";
  }

  const timeUnits = [
    { unit: "y", seconds: 60 * 60 * 24 * 365 }, // years
    { unit: "mo", seconds: 60 * 60 * 24 * 30 }, // months
    { unit: "d", seconds: 60 * 60 * 24 }, // days
    { unit: "h", seconds: 60 * 60 }, // hours
    { unit: "m", seconds: 60 }, // minutes
    { unit: "s", seconds: 1 }, // seconds
  ];

  const result = [];
  let remainingSeconds = deltaSeconds;

  for (const { unit, seconds } of timeUnits) {
    const count = Math.floor(remainingSeconds / seconds);
    if (count > 0) {
      result.push(`${count}${unit}`);
      remainingSeconds -= count * seconds;
    }
    // Stop after two units have been added
    if (result.length === 2) break;
  }

  // Return formatted result with at most two units
  return result.join(", ") + " ago";
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
 * Formats the date
 *
 * @param date the date to format
 * @param format the format to return
 * @returns the formatted date
 */
export function formatDate(date: Date, format: "MMMM YYYY" | "DD MMMM YYYY" | "DD MMMM YYYY HH:mm" = "MMMM YYYY") {
  switch (format) {
    case "MMMM YYYY": {
      return date.toLocaleString("en-US", {
        timeZone: "Europe/London",
        month: "long",
        year: "numeric",
      });
    }
    case "DD MMMM YYYY": {
      return date.toLocaleString("en-US", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    case "DD MMMM YYYY HH:mm": {
      return date.toLocaleString("en-US", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      });
    }
    default: {
      return formatDateMinimal(date);
    }
  }
}

/**
 * Gets the midnight aligned date
 *
 * @param date the date
 */
export function getMidnightAlignedDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
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

/**
 * Formats the time in the format "MM:SS"
 *
 * @param seconds the time to format in seconds
 * @returns the formatted time in "MM:SS" format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  // Zero pad minutes and seconds to ensure two digits
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;

  return `${formattedMinutes}:${formattedSeconds}`;
}
