import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";
import localeData from "dayjs/plugin/localeData.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(localeData);

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

export function timeAgo(input: Date, maxUnits: number = 2) {
  const inputDate = new Date(input).getTime();
  const now = new Date().getTime();
  const deltaSeconds = Math.floor((now - inputDate) / 1000);

  if (deltaSeconds <= 5) {
    return "just now";
  }

  const timeUnits = [
    { unit: "y", seconds: 60 * 60 * 24 * 365 },
    { unit: "mo", seconds: 60 * 60 * 24 * 30 },
    { unit: "d", seconds: 60 * 60 * 24 },
    { unit: "h", seconds: 60 * 60 },
    { unit: "m", seconds: 60 },
    { unit: "s", seconds: 1 },
  ];

  const result = [];
  let remainingSeconds = deltaSeconds;

  for (const { unit, seconds } of timeUnits) {
    const count = Math.floor(remainingSeconds / seconds);
    if (count > 0) {
      result.push(`${count}${unit}`);
      remainingSeconds -= count * seconds;
    }
    if (result.length === maxUnits) {
      break;
    }
  }

  return result.join(" ") + " ago";
}

export function getMsAgo(input: Date) {
  const inputDate = new Date(input).getTime();
  const now = new Date().getTime();
  return now - inputDate;
}

const ShortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Formats as "MMM D, YYYY" in UTC (e.g. "Jan 1, 2024"). This is the key player history is stored under and
 * charts call it for every day of every dataset, so it avoids building dayjs objects for valid dates.
 */
export function formatDateMinimal(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return dayjs(date).utc().format("MMM D, YYYY");
  }
  return `${ShortMonths[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

export function formatChartDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return dayjs(date).format("MMM D");
  }
  const currentYear = new Date().getUTCFullYear();
  const year = date.getUTCFullYear();
  // The label itself is shown in local time, the year comparison is in UTC
  const label = `${ShortMonths[date.getMonth()]} ${date.getDate()}`;
  return currentYear === year ? label : `${label}, ${date.getFullYear()}`;
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) {
    return "th";
  }
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
    | "MMM D, YYYY"
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
    "MMM D, YYYY": "MMM D, YYYY",
  };

  const formatted = dayjs(date)
    .utc()
    .format(formatMap[format] || "MMM D, YYYY");

  if (format === "Do MMMM, YYYY" || format === "Do MMMM, YYYY HH:mm" || format === "Do MMMM, YYYY HH:mm a") {
    const day = dayjs(date).date();
    const suffix = getOrdinalSuffix(day);
    return formatted.replace(day.toString(), day + suffix);
  }

  return formatted;
}

export function getMidnightAlignedDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return dayjs(date).utc().startOf("day").toDate();
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Gets the date X days ago in UTC
 */
export function getDaysAgoDate(days: number): Date {
  return dayjs().utc().subtract(days, "day").toDate();
}

export function getDaysAgo(date: Date): number {
  return dayjs().diff(dayjs(date).utc(), "day");
}

/**
 * Parses a date from a string and ensures it is in UTC
 */
export function parseDate(date: string | undefined): Date {
  if (date == undefined) {
    throw new Error("Date is undefined");
  }

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
 */
export function formatTime(seconds: number): string {
  return dayjs.utc(seconds * 1000).format("mm:ss");
}

/**
 * Formats a duration in the format "Xd, Xh, Xm, Xs"
 * showing at most two units for simplicity.
 *
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number, long: boolean = false): string {
  if (ms < 0) {
    ms = -ms;
  }

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

export function getDaysInMonth(month: number, year: number) {
  return dayjs(`${year}-${month}-01`).utc().daysInMonth();
}

export function forceUTC(date: Date) {
  return dayjs(date).utc().toDate();
}

export type TimeUnitValue = {
  unit: TimeUnit;
  value: number;
};

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

export function isToday(date: Date) {
  return dayjs(date).isSame(dayjs().utc(), "day");
}
