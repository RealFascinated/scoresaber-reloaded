export function isWholeNumber(number: number) {
  return number % 1 === 0;
}

// Number#toLocaleString builds a new Intl.NumberFormat on every call, which is slow and these run for
// every row of every list. A cached formatter gives the same output (same default locale and options).
const commasFormat = new Intl.NumberFormat();
const fractionFormats = new Map<number, Intl.NumberFormat>();

function getFractionFormat(fractionDigits: number): Intl.NumberFormat {
  let format = fractionFormats.get(fractionDigits);
  if (!format) {
    format = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    fractionFormats.set(fractionDigits, format);
  }
  return format;
}

export function formatNumberWithCommas(num: number) {
  return commasFormat.format(num);
}

export function formatPp(num: number, fractionDigits: number = 2) {
  return getFractionFormat(fractionDigits).format(num);
}

export function formatNumber(num: number, type: "number" | "pp" = "number") {
  if (type == "pp") {
    return formatPp(num);
  }
  return formatNumberWithCommas(num);
}

export function ensurePositiveNumber(num: number) {
  if (num == -0) {
    return 0;
  }
  return num < 0 ? num * -1 : num;
}
