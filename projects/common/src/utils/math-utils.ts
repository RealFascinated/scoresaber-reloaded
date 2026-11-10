export function clamp(value: number, min: number, max: number) {
  if (min !== null && value < min) {
    return min;
  }

  if (max !== null && value > max) {
    return max;
  }

  return value;
}

export function lerp(v0: number, v1: number, t: number) {
  return v0 + t * (v1 - v0);
}
