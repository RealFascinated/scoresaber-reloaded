/**
 * Clamps a value between two values.
 *
 * @param value the value
 * @param min the minimum
 * @param max the maximum
 */
export function clamp(value: number, min: number, max: number) {
  if (min !== null && value < min) {
    return min;
  }

  if (max !== null && value > max) {
    return max;
  }

  return value;
}

/**
 * Lerps between two values.
 *
 * @param v0 value 0
 * @param v1 value 1
 * @param t the amount to lerp
 */
export function lerp(v0: number, v1: number, t: number) {
  return v0 + t * (v1 - v0);
}
