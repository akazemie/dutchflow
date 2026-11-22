import { afterEach, describe, expect, it } from "vitest";
import { exportLearnerData, importLearnerData } from "@/application/export-import-data";
import { DexieLearnerDataRepository } from "@/infrastructure/dexie/learner-data-repository";
import { DutchFlowDatabase } from "@/infrastructure/dexie/database";

describe("DexieLearnerDataRepository", () => {
  const db = new DutchFlowDatabase(`dutchflow-backup-${crypto.randomUUID()}`);
  const repository = new DexieLearnerDataRepository(db);

  afterEach(async () => { await db.delete(); });

  it("restores a validated backup and replaces only the target learner atomically", async () => {
    await repository.replace("learner-a", {
      preferences: {
        id: "learner-a", learnerId: "learner-a", level: "A2", explanationLanguage: "nl",
        exerciseStrategy: "review-first", dailyLearningMinutes: 20, updatedAt: "2026-11-22T10:00:00.000Z",
      },
      attempts: [{
        id: "attempt-a", learnerId: "learner-a", skillId: "verb:lopen:perfectum", contentId: "verb:lopen",
        moduleId: "verbs", exerciseType: "typed-answer", answer: "Ik heb gelopen.", correct: true,
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
    });
    await repository.replace("learner-b", { attempts: [], progress: [], reviewSchedules: [] });
    const backup = await exportLearnerData("learner-a", { data: repository, now: () => new Date("2026-11-22T12:00:00.000Z") });

    await importLearnerData("learner-b", backup, { data: repository });

    const restored = await repository.read("learner-b");
    expect(restored.preferences).toMatchObject({ learnerId: "learner-b", level: "A2", explanationLanguage: "nl" });
    expect(restored.attempts).toHaveLength(1);
    expect(restored.progress[0]).toMatchObject({ id: "learner-b:verb:lopen:perfectum", attempts: 1 });
    expect(restored.reviewSchedules[0]).toMatchObject({ id: "learner-b:verb:lopen:perfectum", dueAt: "2026-11-23T10:00:00.000Z" });
    await expect(repository.read("learner-a")).resolves.toMatchObject({ progress: [{ learnerId: "learner-a" }] });
  });
});
