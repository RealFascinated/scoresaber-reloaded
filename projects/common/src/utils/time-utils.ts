export const Months = [
  {
    name: "January",
    number: 1,
  },
  {
    name: "February",
    number: 2,
  },
  {
    name: "March",
    number: 3,
  },
  {
    name: "April",
    number: 4,
  },
  {
    name: "May",
    number: 5,
  },
  {
    name: "June",
    number: 6,
  },
  {
    name: "July",
    number: 7,
  },
  {
    name: "August",
    number: 8,
  },
  {
    name: "September",
    number: 9,
  },
  {
    name: "October",
    number: 10,
  },
  {
    name: "November",
    number: 11,
  },
  {
    name: "December",
    number: 12,
  },
];

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
 * Gets the date X days ago in UTC
 *
 * @param days the number of days to go back
 * @returns {Date} A Date object representing the date X days ago in UTC
 */
export function getDaysAgoDate(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days); // Use UTC methods
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); // Return a new Date in UTC
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
 * Parses a date from a string and ensures it is in UTC
 *
 * @param date the date string in various formats
 * @returns {Date} A Date object representing the parsed date in UTC
 */
export function parseDate(date: string): Date {
  const parsedDate = new Date(date);

  // If the date string didn't specify a time zone, the Date object defaults to local time.
  // Convert to UTC to ensure consistency.
  return new Date(
    Date.UTC(
      parsedDate.getUTCFullYear(),
      parsedDate.getUTCMonth(),
      parsedDate.getUTCDate(),
      parsedDate.getUTCHours(),
      parsedDate.getUTCMinutes(),
      parsedDate.getUTCSeconds(),
      parsedDate.getUTCMilliseconds()
    )
  );
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

/**
 * Formats a duration in the format "X days, X hours, X minutes, X seconds"
 *
 * @param ms
 * @returns the formatted duration
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = -ms;
  const time = {
    day: Math.floor(ms / 86400000),
    hour: Math.floor(ms / 3600000) % 24,
    minute: Math.floor(ms / 60000) % 60,
    second: Math.floor(ms / 1000) % 60,
    ms: Math.floor(ms) % 1000,
  };
  return Object.entries(time)
    .filter(val => val[1] !== 0)
    .map(([key, val]) => `${val} ${key}${val !== 1 ? "s" : ""}`)
    .join(", ");
}

/**
 * Gets the amount of days in a month
 *
 * @param month the month
 * @param year the year
 */
export function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}
