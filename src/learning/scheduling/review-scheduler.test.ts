import { describe, expect, it } from "vitest";
import { createFsrsReviewScheduler } from "./review-scheduler";

describe("FSRS review scheduler", () => {
  it("maps a rating into a reproducible review card", () => {
    const scheduler = createFsrsReviewScheduler();
    const now = new Date("2026-11-22T12:00:00.000Z");
    const first = scheduler.schedule({ rating: "good", now });
    const second = scheduler.schedule({ rating: "good", now });

    expect(first).toEqual(second);
    expect(first.last_review).toBe(now.toISOString());
    expect(Date.parse(first.due)).toBeGreaterThan(now.getTime());
    expect(first.reps).toBe(1);
  });

  it("uses existing state when scheduling later reviews", () => {
    const scheduler = createFsrsReviewScheduler();
    const now = new Date("2026-11-22T12:00:00.000Z");
    const first = scheduler.schedule({ rating: "good", now });
    const later = scheduler.schedule({ card: first, rating: "again", now: new Date("2026-11-23T12:00:00.000Z") });

    expect(later.reps).toBe(2);
    expect(later.lapses).toBe(1);
    expect(later.last_review).toBe("2026-11-23T12:00:00.000Z");
  });
});
