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
const currentAttempt = {
  ...legacyAttempt,
  skillIds: [legacyAttempt.skillId],
  sessionId: null,
  answer: { type: "typed-answer" as const, value: "Ik heb gelopen." },
};
const learningSession = {
  id: "session-a",
  learnerId: "learner-a",
  moduleId: "verbs",
  startedAt: "2026-11-22T09:00:00.000Z",
  completedAt: "2026-11-22T10:00:00.000Z",
  strategy: "balanced" as const,
  preferences: { level: "A1" as const, dailyLearningMinutes: 10 },
  plannedSkillIds: [legacyAttempt.skillId],
  plannedExerciseTypes: ["typed-answer" as const],
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
const legacyV3BackupFixture = JSON.stringify({
  format: "dutchflow-backup",
  version: 3,
  exportedAt: "2026-11-22T12:00:00.000Z",
  learnerId: "learner-a",
  snapshot: {
    attempts: [{
      ...legacyAttempt,
      answer: { type: "matching", matches: { "facet-1": "form-1" } },
    }],
    progress: [],
    reviewSchedules: [],
  },
});
const backupV4Fixture = JSON.stringify({
  format: "dutchflow-backup",
  version: 4,
  exportedAt: "2026-11-22T12:00:00.000Z",
  learnerId: "learner-a",
  snapshot: {
    attempts: [{ ...currentAttempt, sessionId: learningSession.id, durationMs: 1200 }],
    progress: [],
    reviewSchedules: [],
    sessions: [learningSession],
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
      sessions: [],
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

    expect(JSON.parse(serialized)).toMatchObject({ format: "dutchflow-backup", version: 4 });
    await importLearnerData("learner-b", serialized, { data });

    expect(restored?.preferences).toMatchObject({ id: "learner-b", learnerId: "learner-b" });
    expect(restored?.progress[0]).toMatchObject({
      id: "learner-b:verb:lopen:perfectum",
      learnerId: "learner-b",
      skillId: "verb:lopen:perfectum",
      exerciseStage: 1,
    });
  });

  it("exports normalized attempts in the current backup shape", async () => {
    const data: LearnerDataRepository = {
      async read() { return { attempts: [currentAttempt], progress: [], reviewSchedules: [], sessions: [] }; },
      async replace() {},
    };

    const backup = JSON.parse(await exportLearnerData("learner-a", { data })) as {
      version: number;
      snapshot: { attempts: Array<{ answer: unknown }> };
    };

    expect(backup.version).toBe(4);
    expect(backup.snapshot.attempts[0]?.answer).toEqual({ type: "typed-answer", value: "Ik heb gelopen." });
  });

  it("imports a v1 backup and upgrades its legacy string answer", async () => {
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [], sessions: [] }; },
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
      async read() { return { attempts: [], progress: [], reviewSchedules: [], sessions: [] }; },
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
    expect(restored?.attempts[0]?.skillIds).toEqual([legacyAttempt.skillId]);
    expect(restored?.progress[0]?.exerciseStage).toBe(2);
  });

  it("imports v3 with default skill IDs and no session", async () => {
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [], sessions: [] }; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };

    await importLearnerData("learner-b", legacyV3BackupFixture, { data });

    expect(restored?.attempts[0]).toMatchObject({
      skillIds: [legacyAttempt.skillId],
      answer: { type: "matching", matches: { "facet-1": "form-1" } },
    });
    expect(restored?.attempts[0]?.sessionId).toBeNull();
    expect(restored?.sessions).toEqual([]);
  });

  it("round-trips every structured exercise answer and session in backup v4", async () => {
    const dataSource: LearnerDataSnapshot = {
      attempts: [
        { ...currentAttempt, answer: { type: "multiple-choice", optionId: "option-1" } },
        { ...currentAttempt, id: "attempt-gap", answer: { type: "fill-gap", values: { "gap-1": "boek" } } },
        { ...currentAttempt, id: "attempt-order", answer: { type: "word-ordering", tokenIds: ["token-1", "token-2"] } },
        { ...currentAttempt, id: "attempt-match", answer: { type: "matching", matches: { "left-1": "right-2" } } },
      ],
      progress: [],
      reviewSchedules: [],
      sessions: [learningSession],
    };
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return dataSource; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };
    const serialized = await exportLearnerData("learner-a", { data });

    expect(JSON.parse(serialized)).toMatchObject({ version: 4 });
    await importLearnerData("learner-b", serialized, { data });
    expect(restored?.attempts.map((attempt) => attempt.answer)).toEqual([
      { type: "multiple-choice", optionId: "option-1" },
      { type: "fill-gap", values: { "gap-1": "boek" } },
      { type: "word-ordering", tokenIds: ["token-1", "token-2"] },
      { type: "matching", matches: { "left-1": "right-2" } },
    ]);
    expect(restored?.sessions[0]).toMatchObject({
      id: learningSession.id,
      learnerId: "learner-b",
    });
  });

  it("imports v4 with session linkage and optional attempt duration", async () => {
    let restored: LearnerDataSnapshot | undefined;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [], sessions: [] }; },
      async replace(_learnerId, snapshot) { restored = snapshot; },
    };

    await importLearnerData("learner-b", backupV4Fixture, { data });

    expect(restored?.attempts[0]).toMatchObject({
      skillIds: [legacyAttempt.skillId],
      sessionId: learningSession.id,
      durationMs: 1200,
    });
    expect(restored?.sessions[0]).toMatchObject({
      id: learningSession.id,
      learnerId: "learner-b",
    });
  });

  it("rejects unknown scheduler IDs with a clear message", async () => {
    const invalidBackup = JSON.parse(backupV4Fixture) as {
      snapshot: { reviewSchedules: Array<Record<string, unknown>> };
    };
    invalidBackup.snapshot.reviewSchedules.push({
      id: "schedule-a",
      learnerId: "learner-a",
      skillId: legacyAttempt.skillId,
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: "perfectum",
      scheduler: "unknown-scheduler@1",
      card: {
        due: "2026-11-23T10:00:00.000Z",
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        last_review: "2026-11-22T10:00:00.000Z",
      },
      dueAt: "2026-11-23T10:00:00.000Z",
      updatedAt: "2026-11-22T10:00:00.000Z",
    });
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [], sessions: [] }; },
      async replace() {},
    };

    await expect(importLearnerData("learner-b", JSON.stringify(invalidBackup), { data }))
      .rejects.toThrow("Unsupported scheduler identifier");
  });

  it("rejects unsupported or malformed backup files before replacing data", async () => {
    let replaceCalled = false;
    const data: LearnerDataRepository = {
      async read() { return { attempts: [], progress: [], reviewSchedules: [], sessions: [] }; },
      async replace() { replaceCalled = true; },
    };

    await expect(importLearnerData("learner-a", "{\"version\":99}", { data })).rejects.toThrow();
    expect(replaceCalled).toBe(false);
  });
});
