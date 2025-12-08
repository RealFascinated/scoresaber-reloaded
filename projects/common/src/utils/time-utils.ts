import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import localeData from "dayjs/plugin/localeData.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(localeData);

// Configure ordinal numbers
const locale = dayjs.localeData();
locale.ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

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
export function timeAgo(input: Date, maxUnits: number = 2) {
  const inputDate = new Date(input).getTime(); // Convert input to a Date object if it's not already
  const now = new Date().getTime();
  const deltaSeconds = Math.floor((now - inputDate) / 1000); // Get time difference in seconds

  if (deltaSeconds <= 5) {
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
    if (result.length === maxUnits) break;
  }

  // Return formatted result with at most two units
  return result.join(", ") + " ago";
}

/**
 * Gets the amount of milliseconds ago a date was
 *
 * @param input the date
 * @returns the amount of milliseconds ago
 */
export function getMsAgo(input: Date) {
  const inputDate = new Date(input).getTime(); // Convert input to a Date object if it's not already
  const now = new Date().getTime();
  return now - inputDate;
}

/**
 * Formats the date in the format "MMM D, YYYY"
 *
 * @param date the date
 */
export function formatDateMinimal(date: Date) {
  return dayjs(date).utc().format("MMM D, YYYY");
}

/**
 * Formats the date in the format "DD MMMM YYYY"
 *
 * @param date the date
 */
export function formatChartDate(date: Date) {
  const currentYear = dayjs().utc().year();
  const year = dayjs(date).utc().year();
  return dayjs(date).format(`MMM D${currentYear === year ? "" : ", YYYY"}`);
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Formats the date
 *
 * @param date the date to format
 * @param format the format to return
 * @returns the formatted date
 */
export function formatDate(
  date: Date,
  format:
    | "MMMM YYYY"
    | "DD MMMM YYYY"
    | "DD-MM-YYYY"
    | "dddd, DD MMM, YYYY"
    | "DD MMMM YYYY HH:mm"
    | "DD/MM/YYYY, HH:mm:ss"
    | "Do MMMM, YYYY"
    | "Do MMMM, YYYY HH:mm"
    | "Do MM, YYYY HH:mm a"
    | "Do MMMM, YYYY HH:mm a"
    | "Do MM, YYYY" = "MMMM YYYY"
) {
  const formatMap = {
    "MMMM YYYY": "MMMM YYYY",
    "DD MMMM YYYY": "D MMMM YYYY",
    "DD-MM-YYYY": "DD-MM-YYYY",
    "dddd, DD MMM, YYYY": "dddd, D MMM, YYYY",
    "DD MMMM YYYY HH:mm": "D MMMM YYYY HH:mm",
    "DD/MM/YYYY, HH:mm:ss": "DD/MM/YYYY, HH:mm:ss",
    "Do MMMM, YYYY": "D MMMM, YYYY",
    "Do MMMM, YYYY HH:mm": "D MMMM, YYYY HH:mm",
    "Do MMMM, YYYY HH:mm a": "D MMMM, YYYY HH:mm a",
    "Do MM, YYYY": "D MMM, YYYY",
    "Do MM, YYYY HH:mm a": "D MM, YYYY HH:mm a",
  };

  const formatted = dayjs(date)
    .utc()
    .format(formatMap[format] || "MMM D, YYYY");

  if (
    format === "Do MMMM, YYYY" ||
    format === "Do MMMM, YYYY HH:mm" ||
    format === "Do MMMM, YYYY HH:mm a"
  ) {
    const day = dayjs(date).date();
    const suffix = getOrdinalSuffix(day);
    return formatted.replace(day.toString(), day + suffix);
  }

  return formatted;
}

/**
 * Gets the midnight aligned date
 *
 * @param date the date
 */
export function getMidnightAlignedDate(date: Date) {
  return dayjs(date).utc().startOf("day").toDate();
}

/**
 * Gets the date X days ago in UTC
 *
 * @param days the number of days to go back
 * @returns {Date} A Date object representing the date X days ago in UTC
 */
export function getDaysAgoDate(days: number): Date {
  return dayjs().utc().subtract(days, "day").toDate();
}

/**
 * Gets the amount of days ago a date was
 *
 * @param date the date
 * @returns the amount of days
 */
export function getDaysAgo(date: Date): number {
  return dayjs().diff(dayjs(date).utc(), "day");
}

/**
 * Parses a date from a string and ensures it is in UTC
 *
 * @param date the date string in various formats
 * @returns {Date} A Date object representing the parsed date in UTC
 */
export function parseDate(date: string): Date {
  // Handle the format returned by formatDateMinimal (e.g., "Jan 1, 2024")
  if (date.match(/^[A-Za-z]{3} \d{1,2}, \d{4}$/)) {
    return dayjs(date, "MMM D, YYYY").utc().toDate();
  }
  return dayjs(date).utc().toDate();
}

/**
 * Formats the time in the format "MM:SS"
 *
 * @param seconds the time to format in seconds
 * @returns the formatted time in "MM:SS" format
 */
export function formatTime(seconds: number): string {
  return dayjs.utc(seconds * 1000).format("mm:ss");
}

/**
 * Formats a duration in the format "Xd, Xh, Xm, Xs"
 * showing at most two units for simplicity.
 *
 * @param ms - Duration in milliseconds
 * @returns The formatted duration
 */
export function formatDuration(ms: number, long: boolean = false): string {
  if (ms < 0) ms = -ms;

  const duration = dayjs.duration(ms);
  const units = [
    { value: duration.days(), unit: long ? "Days" : "d" },
    { value: duration.hours(), unit: long ? "Hours" : "h" },
    { value: duration.minutes(), unit: long ? "Minutes" : "m" },
    { value: duration.seconds(), unit: long ? "Seconds" : "s" },
    { value: duration.milliseconds(), unit: long ? "Milliseconds" : "ms" },
  ];

  const result = units
    .filter(u => u.value > 0)
    .slice(0, 2)
    .map(u => `${u.value.toFixed(0)}${u.unit}`);

  return result.join(", ") || (long ? "0 Seconds" : "0s");
}

/**
 * Gets the amount of days in a month
 *
 * @param month the month
 * @param year the year
 */
export function getDaysInMonth(month: number, year: number) {
  return dayjs(`${year}-${month}-01`).utc().daysInMonth();
}

/**
 * Forces the date to be in UTC
 *
 * @param date the date
 * @returns the date in UTC
 */
export function forceUTC(date: Date) {
  return dayjs(date).utc().toDate();
}

export type TimeUnitValue = {
  unit: TimeUnit;
  value: number;
};

/**
 * Enum representing different time units
 */
export enum TimeUnit {
  Millisecond = "millisecond",
  Second = "second",
  Minute = "minute",
  Hour = "hour",
  Day = "day",
  Week = "week",
  Month = "month",
  Year = "year",
}

/**
 * Namespace for TimeUnit methods
 */
export namespace TimeUnit {
  export function toMillis(unit: TimeUnit, value: number): number {
    const multipliers: Record<TimeUnit, number> = {
      [TimeUnit.Millisecond]: 1,
      [TimeUnit.Second]: 1000,
      [TimeUnit.Minute]: 60 * 1000,
      [TimeUnit.Hour]: 60 * 60 * 1000,
      [TimeUnit.Day]: 24 * 60 * 60 * 1000,
      [TimeUnit.Week]: 7 * 24 * 60 * 60 * 1000,
      [TimeUnit.Month]: 30 * 24 * 60 * 60 * 1000,
      [TimeUnit.Year]: 365 * 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }

  export function toSeconds(unit: TimeUnit, value: number): number {
    return toMillis(unit, value) / 1000;
  }
}

/**
 * Checks if a date is today
 *
 * @param date the date
 * @returns true if the date is today, false otherwise
 */
export function isToday(date: Date) {
  return dayjs(date).isSame(dayjs().utc(), "day");
}
