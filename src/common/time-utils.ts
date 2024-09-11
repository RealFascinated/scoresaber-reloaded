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
      return formatter.format(Math.round(delta), key as Intl.RelativeTimeFormatUnit);
    }
  }
}
