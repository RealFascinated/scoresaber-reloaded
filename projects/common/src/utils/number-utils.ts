export function isWholeNumber(number: number) {
  return number % 1 === 0;
}

export function formatNumberWithCommas(num: number) {
  return num.toLocaleString();
}

export function formatPp(num: number, fractionDigits: number = 2) {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
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
