import { describe, expect, it } from "vitest";
import type { ExerciseAttempt, AttemptRepository } from "./ports/attempt-repository";
import { submitAnswer } from "./submit-answer";
import { verbsModule } from "@/learning/modules/verbs/module";

describe("submitAnswer", () => {
  it("evaluates and saves an attempt with learner and skill identifiers", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");
    const saved: ExerciseAttempt[] = [];
    const attempts: AttemptRepository = { async save(attempt) { saved.push(attempt); } };

    const { result, attempt } = await submitAnswer(
      {
        learnerId: "00000000-0000-4000-8000-000000000001",
        module: verbsModule,
        exercise,
        answer: "Ik heb gelopen.",
      },
      {
        attempts,
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
  });
});
