import { describe, expect, it } from "vitest";
import type { LearnerDataRepository, LearnerDataSnapshot } from "./ports/learner-data-repository";
import { exportLearnerData, importLearnerData } from "./export-import-data";

describe("learner data backup", () => {
  it("exports and restores a versioned backup with stable learner-scoped IDs", async () => {
    const source: LearnerDataSnapshot = {
      preferences: {
        id: "learner-a", learnerId: "learner-a", level: "A1", explanationLanguage: "en",
        exerciseStrategy: "balanced", dailyLearningMinutes: 10, updatedAt: "2026-11-22T10:00:00.000Z",
      },
      attempts: [],
      progress: [{
        id: "learner-a:verb:lopen:perfectum", learnerId: "learner-a", skillId: "verb:lopen:perfectum",
        moduleId: "verbs", itemId: "verb:lopen", focusId: "perfectum", attempts: 2, correctAttempts: 1,
        consecutiveCorrect: 1, lastReviewedAt: "2026-11-22T10:00:00.000Z", createdAt: "2026-11-21T10:00:00.000Z",
        updatedAt: "2026-11-22T10:00:00.000Z",
      }],
      reviewSchedules: [],
    };
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return source; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };
    const serialized = await exportLearnerData("learner-a", {
      data,
      now: () => new Date("2026-11-22T12:00:00.000Z"),
    });

    expect(JSON.parse(serialized)).toMatchObject({ format: "dutchflow-backup", version: 1 });
    await importLearnerData("learner-b", serialized, { data });

    expect(restored?.preferences).toMatchObject({ id: "learner-b", learnerId: "learner-b" });
    expect(restored?.progress[0]).toMatchObject({
      id: "learner-b:verb:lopen:perfectum",
      learnerId: "learner-b",
      skillId: "verb:lopen:perfectum",
    });
  });

  it("rejects unsupported or malformed backup files before replacing data", async () => {
    let replaceCalled = false;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [] }; },
      async replace() { replaceCalled = true; },
    };

    await expect(importLearnerData("learner-a", "{\"version\":99}", { data })).rejects.toThrow();
    expect(replaceCalled).toBe(false);
  });
});
