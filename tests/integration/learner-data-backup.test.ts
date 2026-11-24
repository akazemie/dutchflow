import { afterEach, describe, expect, it, vi } from "vitest";
import { exportLearnerData, importLearnerData } from "@/application/export-import-data";
import { DexieLearnerDataRepository } from "@/infrastructure/dexie/learner-data-repository";
import { DutchFlowDatabase } from "@/infrastructure/dexie/database";

describe("DexieLearnerDataRepository", () => {
  const createDb = () => new DutchFlowDatabase(`dutchflow-backup-${crypto.randomUUID()}`);
  let db = createDb();
  let repository = new DexieLearnerDataRepository(db);

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
    db = createDb();
    repository = new DexieLearnerDataRepository(db);
  });

  it("restores a validated backup and replaces only the target learner atomically", async () => {
    await repository.replace("learner-a", {
      preferences: {
        id: "learner-a", learnerId: "learner-a", level: "A2", explanationLanguage: "nl",
        exerciseStrategy: "review-first", dailyLearningMinutes: 20, updatedAt: "2026-11-22T10:00:00.000Z",
      },
      attempts: [{
        id: "attempt-a", learnerId: "learner-a", skillId: "verb:lopen:perfectum",
        skillIds: ["verb:lopen:perfectum"], sessionId: "session-a", durationMs: 1200, contentId: "verb:lopen",
        moduleId: "verbs", exerciseType: "typed-answer",
        answer: { type: "typed-answer", value: "Ik heb gelopen." }, correct: true,
        rating: "good", createdAt: "2026-11-22T10:00:00.000Z", updatedAt: "2026-11-22T10:00:00.000Z",
      }],
      progress: [{
        id: "learner-a:verb:lopen:perfectum", learnerId: "learner-a", skillId: "verb:lopen:perfectum",
        moduleId: "verbs", itemId: "verb:lopen", focusId: "perfectum", attempts: 1, correctAttempts: 1,
        consecutiveCorrect: 1, lastReviewedAt: "2026-11-22T10:00:00.000Z", createdAt: "2026-11-22T10:00:00.000Z",
        updatedAt: "2026-11-22T10:00:00.000Z",
      }],
      reviewSchedules: [{
        id: "learner-a:verb:lopen:perfectum", learnerId: "learner-a", skillId: "verb:lopen:perfectum",
        moduleId: "verbs", itemId: "verb:lopen", focusId: "perfectum", scheduler: "ts-fsrs@5.4.2/fsrs-6",
        card: { due: "2026-11-23T10:00:00.000Z", stability: 1, difficulty: 5, elapsed_days: 0,
          scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 2, last_review: "2026-11-22T10:00:00.000Z" },
        dueAt: "2026-11-23T10:00:00.000Z", updatedAt: "2026-11-22T10:00:00.000Z",
      }],
      sessions: [{
        id: "session-a", learnerId: "learner-a", moduleId: "verbs",
        startedAt: "2026-11-22T09:00:00.000Z", completedAt: "2026-11-22T10:00:00.000Z",
        strategy: "review-first", preferences: { level: "A2", dailyLearningMinutes: 20 },
        plannedSkillIds: ["verb:lopen:perfectum"], plannedExerciseTypes: ["typed-answer"],
      }],
    });
    await repository.replace("learner-b", { attempts: [], progress: [], reviewSchedules: [], sessions: [] });
    const backup = await exportLearnerData("learner-a", { data: repository, now: () => new Date("2026-11-22T12:00:00.000Z") });

    await importLearnerData("learner-b", backup, { data: repository });

    const restored = await repository.read("learner-b");
    expect(restored.preferences).toMatchObject({ learnerId: "learner-b", level: "A2", explanationLanguage: "nl" });
    expect(restored.attempts).toHaveLength(1);
    expect(restored.attempts[0]).toMatchObject({
      sessionId: "session-a",
      skillIds: ["verb:lopen:perfectum"],
      durationMs: 1200,
    });
    expect(restored.sessions[0]).toMatchObject({ id: "session-a", learnerId: "learner-b" });
    expect(restored.progress[0]).toMatchObject({ id: "learner-b:verb:lopen:perfectum", attempts: 1 });
    expect(restored.reviewSchedules[0]).toMatchObject({ id: "learner-b:verb:lopen:perfectum", dueAt: "2026-11-23T10:00:00.000Z" });
    await expect(repository.read("learner-a")).resolves.toMatchObject({ progress: [{ learnerId: "learner-a" }] });
  });

  it("preserves the prior learner data when a backup write fails", async () => {
    const previous = {
      id: "learner-a",
      learnerId: "learner-a",
      level: "A1" as const,
      explanationLanguage: "en" as const,
      exerciseStrategy: "balanced" as const,
      dailyLearningMinutes: 10,
      updatedAt: "2026-11-22T10:00:00.000Z",
    };
    await repository.replace("learner-a", {
      preferences: previous,
      attempts: [{
        id: "attempt-old", learnerId: "learner-a", skillId: "verb:lopen:perfectum",
        skillIds: ["verb:lopen:perfectum"], sessionId: "session-old", contentId: "verb:lopen",
        moduleId: "verbs", exerciseType: "typed-answer",
        answer: { type: "typed-answer", value: "old answer" }, correct: true, rating: "good",
        createdAt: "2026-11-22T10:00:00.000Z", updatedAt: "2026-11-22T10:00:00.000Z",
      }],
      progress: [],
      reviewSchedules: [],
      sessions: [{
        id: "session-old", learnerId: "learner-a", moduleId: "verbs",
        startedAt: "2026-11-22T09:00:00.000Z", strategy: "balanced",
        preferences: { level: "A1", dailyLearningMinutes: 10 },
        plannedSkillIds: ["verb:lopen:perfectum"], plannedExerciseTypes: ["typed-answer"],
      }],
    });
    const before = await repository.read("learner-a");
    const incomingSnapshot = {
      preferences: { ...previous, id: "source", learnerId: "source", level: "A2" as const },
      attempts: [],
      progress: [],
      reviewSchedules: [],
      sessions: [],
    };
    const backup = await exportLearnerData("source", {
      data: {
        async read() { return incomingSnapshot; },
        async replace() {},
      },
    });
    vi.spyOn(db.learnerPreferences, "put").mockRejectedValue(new Error("Injected backup write failure."));

    await expect(importLearnerData("learner-a", backup, { data: repository }))
      .rejects.toThrow("Injected backup write failure.");

    await expect(repository.read("learner-a")).resolves.toEqual(before);
  });
});
