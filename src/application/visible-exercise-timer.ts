const MAX_EXERCISE_DURATION_MS = 5 * 60 * 1000;

export interface MonotonicClock {
  now(): number;
}

export class VisibleExerciseTimer {
  private accumulatedMs = 0;
  private segmentStartedAt: number | null = null;

  constructor(private readonly clock: MonotonicClock = { now: () => performance.now() }) {}

  start(): void {
    this.accumulatedMs = 0;
    this.segmentStartedAt = this.clock.now();
  }

  pause(): void {
    if (this.segmentStartedAt === null) return;
    this.accumulatedMs += Math.max(0, this.clock.now() - this.segmentStartedAt);
    this.segmentStartedAt = null;
  }

  resume(): void {
    if (this.segmentStartedAt !== null) return;
    this.segmentStartedAt = this.clock.now();
  }

  elapsedMs(): number {
    const activeSegment = this.segmentStartedAt === null
      ? 0
      : Math.max(0, this.clock.now() - this.segmentStartedAt);
    return Math.min(MAX_EXERCISE_DURATION_MS, Math.floor(this.accumulatedMs + activeSegment));
  }
}
