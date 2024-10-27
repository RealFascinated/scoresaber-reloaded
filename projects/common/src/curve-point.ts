export class CurvePoint {
  constructor(
    private acc: number,
    private multiplier: number
  ) {}

  getAcc(): number {
    return this.acc;
  }

  getMultiplier(): number {
    return this.multiplier;
  }
}
