/**
 * Removes the given fields from an object.
 *
 * @param obj the object to remove the fields from
 * @param fields the fields to remove
 * @returns the object with the fields removed
 */
export function removeObjectFields<T>(obj: T, fields: string[]): T {
  const newObj = { ...obj };
  for (const field of fields) {
    // @ts-ignore
    delete newObj[field];
  }
  return newObj;
}
