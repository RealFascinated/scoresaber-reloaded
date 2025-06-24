export enum CooldownPriority {
  NORMAL = "normal",
  LOW = "low",
  BACKGROUND = "background",
}

export class Cooldown {
  private lastUsed: number;
  private lastRefresh: number;
  private remainingBursts: number;

  constructor(
    private readonly cooldownMs: number,
    private readonly maxBursts: number = 1
  ) {
    const now = Date.now();
    this.lastUsed = now;
    this.lastRefresh = now;
    this.remainingBursts = maxBursts;
  }

  /**
   * Use the cooldown. Will use a burst if available, otherwise updates the last used time.
   *
   * @returns true if the cooldown was ready and is now used, false if it wasn't ready
   */
  use(): boolean {
    this.refreshBursts();

    if (this.remainingBursts > 0) {
      this.remainingBursts--;
      return true;
    }

    const now = Date.now();
    if (now - this.lastUsed >= this.cooldownMs) {
      this.lastUsed = now;
      return true;
    }
    return false;
  }

  private refreshBursts(): void {
    const now = Date.now();
    const timeSinceRefresh = now - this.lastRefresh;

    if (timeSinceRefresh >= this.cooldownMs) {
      const newTokens = Math.floor(timeSinceRefresh / this.cooldownMs);

      // Update the refresh timestamp to account for the tokens we're adding
      this.lastRefresh += newTokens * this.cooldownMs;

      // Add new tokens, up to maxBursts
      this.remainingBursts = Math.min(this.maxBursts, this.remainingBursts + newTokens);
    }
  }

  /**
   * Check if the cooldown is ready
   */
  isReady(): boolean {
    this.refreshBursts();
    return this.remainingBursts > 0 || Date.now() - this.lastUsed >= this.cooldownMs;
  }

  /**
   * Get the remaining time until next available use
   */
  getRemainingTime(): number {
    this.refreshBursts();
    if (this.remainingBursts > 0) return 0;

    const timeSinceUse = Date.now() - this.lastUsed;
    const remaining = this.cooldownMs - timeSinceUse;
    return Math.max(0, remaining);
  }

  /**
   * Wait for the cooldown to be ready and consume it
   *
   * @param priority the priority to wait for
   */
  async waitAndUse(priority: CooldownPriority = CooldownPriority.NORMAL): Promise<void> {
    if (priority === CooldownPriority.BACKGROUND) {
      await this.awaitCooldown(priority);
      this.use();
      return;
    }

    while (!this.use()) {
      await this.awaitCooldown(priority);
    }
  }

  /**
   * Wait for the cooldown to be ready
   *
   * @param priority the priority to wait for
   * @returns promise that resolves when the cooldown is ready
   */
  async awaitCooldown(priority: CooldownPriority = CooldownPriority.NORMAL): Promise<void> {
    if (priority === CooldownPriority.BACKGROUND) {
      let timeoutId: NodeJS.Timeout | undefined;
      try {
        await new Promise<void>(resolve => {
          timeoutId = setTimeout(resolve, this.cooldownMs * this.getCooldownMultiplier(priority));
        });
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
      return;
    }

    const remainingTime = this.getRemainingTime() * this.getCooldownMultiplier(priority);
    if (remainingTime > 0) {
      let timeoutId: NodeJS.Timeout | undefined;
      try {
        await new Promise<void>(resolve => {
          timeoutId = setTimeout(resolve, remainingTime);
        });
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }
  }

  /**
   * Get the cooldown multiplier for a given priority
   *
   * @param priority the priority to get the cooldown multiplier for
   * @returns the cooldown multiplier
   */
  public getCooldownMultiplier(priority: CooldownPriority): number {
    // Adjust cooldown based on priority
    let cooldownMultiplier = 1;
    if (priority === CooldownPriority.LOW) {
      cooldownMultiplier = 2;
    } else if (priority === CooldownPriority.BACKGROUND) {
      cooldownMultiplier = 2; // Used differently to the other priorities
    }

    return cooldownMultiplier;
  }

  /**
   * Reset the cooldown and restore all bursts
   */
  reset(): void {
    this.lastUsed = Date.now();
    this.remainingBursts = this.maxBursts;
  }

  /**
   * Get the number of remaining burst tokens available
   * @returns number of burst tokens that can be used immediately
   */
  getRemainingBursts(): number {
    this.refreshBursts();
    return this.remainingBursts;
  }
}
