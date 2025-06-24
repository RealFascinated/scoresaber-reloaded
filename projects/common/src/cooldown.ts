export enum CooldownPriority {
  NORMAL = "normal",
  LOW = "low",
  BACKGROUND = "background",
}

/**
 * Calculates the cooldown in milliseconds for a given number of requests per minute.
 *
 * @param requestsPerMinute the number of requests per minute (must be > 0)
 * @returns the cooldown in milliseconds
 * @throws {Error} if requestsPerMinute is not positive
 */
export function cooldownRequestsPerMinute(requestsPerMinute: number): number {
  if (requestsPerMinute <= 0) {
    throw new Error(`requestsPerMinute must be positive, got: ${requestsPerMinute}`);
  }

  // Ensure we don't get extremely small values that could cause timing issues
  const cooldownMs = 60_000 / requestsPerMinute;

  // Cap at a reasonable minimum (e.g., 1ms) to prevent timing issues
  return Math.max(1, Math.round(cooldownMs));
}

export class Cooldown {
  private lastUsed: number;
  private lastRefresh: number;
  private remainingBursts: number;

  // Separate burst buckets for different priorities
  private backgroundBursts: number;
  private backgroundLastRefresh: number;

  constructor(
    private readonly cooldownMs: number,
    private readonly maxBursts: number = 1,
    private readonly backgroundCooldownMs?: number,
    private readonly maxBackgroundBursts: number = 1
  ) {
    const now = Date.now();
    this.lastUsed = now;
    this.lastRefresh = now;
    this.remainingBursts = maxBursts;

    // Background cooldown defaults to 10x slower if not specified
    this.backgroundCooldownMs = backgroundCooldownMs || cooldownMs * 10;
    this.backgroundLastRefresh = now;
    this.backgroundBursts = maxBackgroundBursts;
  }

  /**
   * Use the cooldown. Will use a burst if available, otherwise updates the last used time.
   *
   * @returns true if the cooldown was ready and is now used, false if it wasn't ready
   */
  use(priority: CooldownPriority = CooldownPriority.NORMAL): boolean {
    if (priority === CooldownPriority.BACKGROUND) {
      return this.useBackground();
    }

    this.refreshBursts();

    if (this.remainingBursts > 0) {
      this.remainingBursts--;
      this.lastUsed = Date.now(); // Update global lastUsed
      return true;
    }

    const now = Date.now();
    if (now - this.lastUsed >= this.cooldownMs) {
      this.lastUsed = now;
      return true;
    }
    return false;
  }

  private useBackground(): boolean {
    this.refreshBackgroundBursts();

    if (this.backgroundBursts > 0) {
      this.backgroundBursts--;
      this.lastUsed = Date.now(); // Update global lastUsed
      return true;
    }

    const now = Date.now();
    if (now - this.lastUsed >= this.backgroundCooldownMs!) {
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

  private refreshBackgroundBursts(): void {
    const now = Date.now();
    const timeSinceRefresh = now - this.backgroundLastRefresh;

    if (timeSinceRefresh >= this.backgroundCooldownMs!) {
      const newTokens = Math.floor(timeSinceRefresh / this.backgroundCooldownMs!);

      // Update the refresh timestamp to account for the tokens we're adding
      this.backgroundLastRefresh += newTokens * this.backgroundCooldownMs!;

      // Add new tokens, up to maxBackgroundBursts
      this.backgroundBursts = Math.min(this.maxBackgroundBursts, this.backgroundBursts + newTokens);
    }
  }

  /**
   * Check if the cooldown is ready
   */
  isReady(priority: CooldownPriority = CooldownPriority.NORMAL): boolean {
    if (priority === CooldownPriority.BACKGROUND) {
      this.refreshBackgroundBursts();
      return this.backgroundBursts > 0 || Date.now() - this.lastUsed >= this.backgroundCooldownMs!;
    }

    this.refreshBursts();
    return this.remainingBursts > 0 || Date.now() - this.lastUsed >= this.cooldownMs;
  }

  /**
   * Get the remaining time until next available use
   */
  getRemainingTime(priority: CooldownPriority = CooldownPriority.NORMAL): number {
    if (priority === CooldownPriority.BACKGROUND) {
      this.refreshBackgroundBursts();
      if (this.backgroundBursts > 0) return 0;

      const timeSinceUse = Date.now() - this.lastUsed;
      const remaining = this.backgroundCooldownMs! - timeSinceUse;
      return Math.max(0, remaining);
    }

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
    while (!this.use(priority)) {
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
    const remainingTime = this.getRemainingTime(priority) * this.getCooldownMultiplier(priority);
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
    }

    return cooldownMultiplier;
  }

  /**
   * Reset the cooldown and restore all bursts
   */
  reset(): void {
    const now = Date.now();
    this.lastUsed = now;
    this.remainingBursts = this.maxBursts;

    this.backgroundBursts = this.maxBackgroundBursts;
  }

  /**
   * Get the number of remaining burst tokens available
   * @returns number of burst tokens that can be used immediately
   */
  getRemainingBursts(priority: CooldownPriority = CooldownPriority.NORMAL): number {
    if (priority === CooldownPriority.BACKGROUND) {
      this.refreshBackgroundBursts();
      return this.backgroundBursts;
    }

    this.refreshBursts();
    return this.remainingBursts;
  }
}
