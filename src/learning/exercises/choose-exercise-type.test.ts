import { describe, expect, it } from "vitest";
import type { ExerciseType } from "@/learning/contracts/module";
import type { SkillProgress } from "@/learning/core/progress";
import { chooseExerciseType } from "./choose-exercise-type";

const allTypes: ExerciseType[] = ["multiple-choice", "fill-gap", "typed-answer", "word-ordering"];

function progress(exerciseStage: 0 | 1 | 2, consecutiveCorrect = 0): SkillProgress {
  return {
    id: "learner:skill",
    learnerId: "learner",
    skillId: "skill",
    moduleId: "vocabulary",
    itemId: "item",
    focusId: "meaning",
    attempts: 2,
    correctAttempts: 1,
    consecutiveCorrect,
    exerciseStage,
    lastReviewedAt: "2026-11-23T12:00:00.000Z",
    createdAt: "2026-11-22T12:00:00.000Z",
    updatedAt: "2026-11-23T12:00:00.000Z",
  };
}

describe("chooseExerciseType", () => {
  it.each([
    [undefined, "multiple-choice"],
    [progress(1), "fill-gap"],
  ] as const)("selects the scaffolded type for progress %s", (skillProgress, expected) => {
    expect(chooseExerciseType(allTypes, skillProgress, "seed")).toBe(expected);
  });

  it("alternates advanced types deterministically when both are supported", () => {
    const choices = new Set(
      Array.from({ length: 20 }, (_, index) =>
        chooseExerciseType(allTypes, progress(2), `advanced-seed-${index}`),
      ),
    );

    expect(chooseExerciseType(allTypes, progress(2), "advanced-seed-1"))
      .toBe(chooseExerciseType(allTypes, progress(2), "advanced-seed-1"));
    expect(choices).toEqual(new Set(["typed-answer", "word-ordering"]));
  });

  it("falls back to typed-answer when the preferred stage is unsupported", () => {
    expect(chooseExerciseType(["typed-answer"], undefined, "seed")).toBe("typed-answer");
  });

  it("falls back to fill-gap before typed-answer for a new skill", () => {
    expect(chooseExerciseType(["fill-gap", "typed-answer"], undefined, "seed")).toBe("fill-gap");
  });

  it("rejects an empty supported type list", () => {
    expect(() => chooseExerciseType([], undefined, "seed")).toThrow("supports none");
  });
});
