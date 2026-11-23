import { describe, expect, it } from "vitest";
import type { ExerciseAttempt, AttemptRepository } from "./ports/attempt-repository";
import { submitAnswer } from "./submit-answer";
import { verbsModule } from "@/learning/modules/verbs/module";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";

describe("submitAnswer", () => {
  it("evaluates and saves an attempt with learner and skill identifiers", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");
    const saved: ExerciseAttempt[] = [];
    const progress = new Map<string, SkillProgress>();
    const schedules = new Map<string, ReviewSchedule>();
    const attempts: AttemptRepository = { async save(attempt) { saved.push(attempt); } };

    const { result, attempt } = await submitAnswer(
      {
        learnerId: "00000000-0000-4000-8000-000000000001",
        module: verbsModule,
        exercise,
        answer: { type: "typed-answer", value: "Ik heb gelopen." },
      },
      {
        attempts,
        progress: {
          async get(learnerId, skillId) { return progress.get(`${learnerId}:${skillId}`); },
          async listByLearner(learnerId) { return [...progress.values()].filter((item) => item.learnerId === learnerId); },
          async save(item) { progress.set(item.id, item); },
        },
        reviewSchedules: {
          async get(learnerId, skillId) { return schedules.get(`${learnerId}:${skillId}`); },
          async listDue(learnerId, dueAt) { return [...schedules.values()].filter((item) => item.learnerId === learnerId && item.dueAt <= dueAt); },
          async save(item) { schedules.set(item.id, item); },
        },
        scheduler: createFsrsReviewScheduler(),
        now: () => new Date("2026-11-22T12:00:00.000Z"),
        createId: () => "attempt-1",
      },
    );

    expect(result.rating).toBe("good");
    expect(attempt).toMatchObject({
      id: "attempt-1",
      learnerId: "00000000-0000-4000-8000-000000000001",
      skillId: "verb:lopen:perfectum",
      correct: true,
    });
    expect(saved).toEqual([attempt]);
    expect(progress.get("00000000-0000-4000-8000-000000000001:verb:lopen:perfectum")).toMatchObject({
      attempts: 1,
      correctAttempts: 1,
      consecutiveCorrect: 1,
      skillId: "verb:lopen:perfectum",
    });
    expect(schedules.get("00000000-0000-4000-8000-000000000001:verb:lopen:perfectum")).toMatchObject({
      scheduler: "ts-fsrs@5.4.2/fsrs-6",
      skillId: "verb:lopen:perfectum",
      card: { reps: 1, last_review: "2026-11-22T12:00:00.000Z" },
    });
  });
});
