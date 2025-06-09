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
  return dayjs(date).format("MMM D, YYYY");
}

/**
 * Formats the date in the format "DD MMMM YYYY"
 *
 * @param date the date
 */
export function formatChartDate(date: Date) {
  const currentYear = dayjs().year();
  const year = dayjs(date).year();
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
    | "Do MMMM, YYYY" = "MMMM YYYY"
) {
  const formatMap = {
    "MMMM YYYY": "MMMM YYYY",
    "DD MMMM YYYY": "D MMMM YYYY",
    "DD-MM-YYYY": "DD-MM-YYYY",
    "dddd, DD MMM, YYYY": "dddd, D MMM, YYYY",
    "DD MMMM YYYY HH:mm": "D MMMM YYYY HH:mm",
    "DD/MM/YYYY, HH:mm:ss": "DD/MM/YYYY, HH:mm:ss",
    "Do MMMM, YYYY": "D MMMM, YYYY",
  };

  const formatted = dayjs(date).format(formatMap[format] || "MMM D, YYYY");

  if (format === "Do MMMM, YYYY") {
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
  return dayjs(date).startOf("day").toDate();
}

/**
 * Gets the date X days ago in UTC
 *
 * @param days the number of days to go back
 * @returns {Date} A Date object representing the date X days ago in UTC
 */
export function getDaysAgoDate(days: number): Date {
  return dayjs().subtract(days, "day").toDate();
}

/**
 * Gets the amount of days ago a date was
 *
 * @param date the date
 * @returns the amount of days
 */
export function getDaysAgo(date: Date): number {
  return dayjs().diff(dayjs(date), "day");
}

/**
 * Parses a date from a string and ensures it is in UTC
 *
 * @param date the date string in various formats
 * @returns {Date} A Date object representing the parsed date in UTC
 */
export function parseDate(date: string): Date {
  return dayjs(date).toDate();
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
export function formatDuration(ms: number): string {
  if (ms < 0) ms = -ms;

  const duration = dayjs.duration(ms);
  const units = [
    { value: duration.days(), unit: "d" },
    { value: duration.hours(), unit: "h" },
    { value: duration.minutes(), unit: "m" },
    { value: duration.seconds(), unit: "s" },
    { value: duration.milliseconds(), unit: "ms" },
  ];

  const result = units
    .filter(u => u.value > 0)
    .slice(0, 2)
    .map(u => `${u.value}${u.unit}`);

  return result.join(", ") || "0s";
}

/**
 * Gets the amount of days in a month
 *
 * @param month the month
 * @param year the year
 */
export function getDaysInMonth(month: number, year: number) {
  return dayjs(`${year}-${month}-01`).daysInMonth();
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
