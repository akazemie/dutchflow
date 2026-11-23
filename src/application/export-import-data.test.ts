import { describe, expect, it } from "vitest";
import type { LearnerDataRepository, LearnerDataSnapshot } from "./ports/learner-data-repository";
import { exportLearnerData, importLearnerData } from "./export-import-data";

const legacyAttempt = {
  id: "attempt-legacy",
  learnerId: "learner-a",
  skillId: "verb:lopen:perfectum",
  contentId: "verb:lopen",
  moduleId: "verbs",
  exerciseType: "typed-answer",
  answer: "Ik heb gelopen.",
  correct: true,
  rating: "good" as const,
  createdAt: "2026-11-22T10:00:00.000Z",
  updatedAt: "2026-11-22T10:00:00.000Z",
};

const legacyV1BackupFixture = JSON.stringify({
  format: "dutchflow-backup",
  version: 1,
  exportedAt: "2026-11-22T12:00:00.000Z",
  learnerId: "learner-a",
  snapshot: {
    attempts: [legacyAttempt],
    progress: [],
    reviewSchedules: [],
  },
});

const legacyV2BackupFixture = JSON.stringify({
  format: "dutchflow-backup",
  version: 2,
  exportedAt: "2026-11-22T12:00:00.000Z",
  learnerId: "learner-a",
  snapshot: {
    attempts: [{
      ...legacyAttempt,
      answer: { type: "typed-answer", value: "Ik heb gelopen." },
    }],
    progress: [],
    reviewSchedules: [],
  },
});

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

    expect(JSON.parse(serialized)).toMatchObject({ format: "dutchflow-backup", version: 3 });
    await importLearnerData("learner-b", serialized, { data });

    expect(restored?.preferences).toMatchObject({ id: "learner-b", learnerId: "learner-b" });
    expect(restored?.progress[0]).toMatchObject({
      id: "learner-b:verb:lopen:perfectum",
      learnerId: "learner-b",
      skillId: "verb:lopen:perfectum",
      exerciseStage: 1,
    });
  });

  it("exports legacy string-answer attempts in the current serializable answer shape", async () => {
    const data: LearnerDataRepository = {
      async read() { return { attempts: [legacyAttempt], progress: [], reviewSchedules: [] }; },
      async replace() {},
    };

    const backup = JSON.parse(await exportLearnerData("learner-a", { data })) as {
      version: number;
      snapshot: { attempts: Array<{ answer: unknown }> };
    };

    expect(backup.version).toBe(3);
    expect(backup.snapshot.attempts[0]?.answer).toEqual({ type: "typed-answer", value: "Ik heb gelopen." });
  });

  it("imports a v1 backup and upgrades its legacy string answer", async () => {
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [] }; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };

    await importLearnerData("learner-b", legacyV1BackupFixture, { data });

    expect(restored?.attempts[0]).toMatchObject({
      learnerId: "learner-b",
      answer: { type: "typed-answer", value: "Ik heb gelopen." },
    });
  });

  it("imports a v2 backup and defaults exercise stage from its correct streak", async () => {
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [] }; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };
    const fixture = JSON.parse(legacyV2BackupFixture) as {
      snapshot: { progress: Array<Record<string, unknown>> };
    };
    fixture.snapshot.progress.push({
      id: "learner-a:verb:lopen:perfectum",
      learnerId: "learner-a",
      skillId: "verb:lopen:perfectum",
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: "perfectum",
      attempts: 4,
      correctAttempts: 3,
      consecutiveCorrect: 3,
      lastReviewedAt: "2026-11-22T10:00:00.000Z",
      createdAt: "2026-11-20T10:00:00.000Z",
      updatedAt: "2026-11-22T10:00:00.000Z",
    });

    await importLearnerData("learner-b", JSON.stringify(fixture), { data });

    expect(restored?.attempts[0]?.answer).toEqual({ type: "typed-answer", value: "Ik heb gelopen." });
    expect(restored?.progress[0]?.exerciseStage).toBe(2);
  });

  it("round-trips multiple-choice and fill-gap answers in backup v3", async () => {
    const dataSource: LearnerDataSnapshot = {
      attempts: [
        { ...legacyAttempt, answer: { type: "multiple-choice", optionId: "option-1" } },
        { ...legacyAttempt, id: "attempt-gap", answer: { type: "fill-gap", values: { "gap-1": "boek" } } },
      ],
      progress: [],
      reviewSchedules: [],
    };
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return dataSource; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };
    const serialized = await exportLearnerData("learner-a", { data });

    expect(JSON.parse(serialized)).toMatchObject({ version: 3 });
    await importLearnerData("learner-b", serialized, { data });
    expect(restored?.attempts.map((attempt) => attempt.answer)).toEqual([
      { type: "multiple-choice", optionId: "option-1" },
      { type: "fill-gap", values: { "gap-1": "boek" } },
    ]);
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
