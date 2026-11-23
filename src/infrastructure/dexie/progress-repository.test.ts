import { afterEach, describe, expect, it } from "vitest";
import { DexieProgressRepository } from "./progress-repository";
import { DexieReviewScheduleRepository } from "./review-schedule-repository";
import { DutchFlowDatabase } from "./database";
import { getExerciseStage } from "@/learning/core/progress";

describe("skill progress and review repositories", () => {
  const db = new DutchFlowDatabase(`dutchflow-progress-${crypto.randomUUID()}`);
  const progressRepository = new DexieProgressRepository(db);
  const scheduleRepository = new DexieReviewScheduleRepository(db);

  afterEach(async () => {
    await db.skillProgress.clear();
    await db.reviewSchedules.clear();
  });

  it("persists progress independently by learner and reviewable skill", async () => {
    const progress = {
      id: "learner-1:verb:lopen:perfectum",
      learnerId: "learner-1",
      skillId: "verb:lopen:perfectum",
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: "perfectum",
      attempts: 3,
      correctAttempts: 2,
      consecutiveCorrect: 1,
      lastReviewedAt: "2026-11-22T12:00:00.000Z",
      createdAt: "2026-11-20T12:00:00.000Z",
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    await progressRepository.save(progress);

    await expect(progressRepository.get("learner-1", progress.skillId)).resolves.toEqual(progress);
    await expect(progressRepository.listByLearner("learner-1")).resolves.toEqual([progress]);
    await expect(progressRepository.get("learner-2", progress.skillId)).resolves.toBeUndefined();
  });

  it("defaults a legacy progress row without exerciseStage from its correct streak", async () => {
    const legacy = {
      id: "legacy:verb:lopen:perfectum",
      learnerId: "legacy",
      skillId: "verb:lopen:perfectum",
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: "perfectum",
      attempts: 4,
      correctAttempts: 3,
      consecutiveCorrect: 3,
      lastReviewedAt: "2026-11-22T12:00:00.000Z",
      createdAt: "2026-11-20T12:00:00.000Z",
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    await db.skillProgress.put(legacy);

    const stored = await progressRepository.get("legacy", legacy.skillId);
    expect(stored?.exerciseStage).toBeUndefined();
    expect(getExerciseStage(stored)).toBe(2);
  });

  it("returns only due skill schedules for a learner", async () => {
    const schedule = {
      id: "learner-1:verb:lopen:perfectum",
      learnerId: "learner-1",
      skillId: "verb:lopen:perfectum",
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: "perfectum",
      scheduler: "ts-fsrs@5.4.2/fsrs-6" as const,
      card: {
        due: "2026-11-22T11:00:00.000Z",
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        last_review: "2026-11-21T11:00:00.000Z",
      },
      dueAt: "2026-11-22T11:00:00.000Z",
      updatedAt: "2026-11-21T11:00:00.000Z",
    };
    await scheduleRepository.save(schedule);

    await expect(scheduleRepository.listDue("learner-1", "2026-11-22T12:00:00.000Z")).resolves.toEqual([schedule]);
    await expect(scheduleRepository.listDue("learner-2", "2026-11-22T12:00:00.000Z")).resolves.toEqual([]);
  });
});
