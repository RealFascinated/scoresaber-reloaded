export function randomString(length: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function pluralize(count: number, word: string) {
  return count === 1 ? word : `${word}s`;
}

export function format(template: string, ...args: unknown[]) {
  let argIndex = 0;
  return template.replace(/%s/g, () => args[argIndex++]?.toString() || "%s");
}
