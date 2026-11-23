import { describe, expect, it } from "vitest";
import type { FillGapExercise } from "@/learning/contracts/module";
import { evaluateFillGap } from "./evaluate-fill-gap";

const exercise: FillGapExercise = {
  id: "gap-1",
  type: "fill-gap",
  moduleId: "vocabulary",
  contentId: "vocabulary:sentences",
  skillId: "vocabulary:sentences:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: "Vocabulary",
  title: "Complete the sentence",
  answerLabel: "Fill in the missing words",
  typoTolerance: "one-edit",
  partialCredit: "graded",
  prompt: "She reads a book.",
  segments: [
    { id: "t1", type: "text", text: "Zij leest een " },
    { type: "blank", blankId: "b1" },
    { id: "t2", type: "text", text: " en een " },
    { type: "blank", blankId: "b2" },
    { id: "t3", type: "text", text: "." },
  ],
  blanks: [
    { id: "b1", acceptedAnswers: ["boek"] },
    { id: "b2", acceptedAnswers: ["krant", "dagblad"] },
  ],
};

describe("evaluateFillGap", () => {
  it.each([
    ["correct", { b1: "boek", b2: "krant" }, true, 1, "good"],
    ["accepted variant", { b1: "boek", b2: "dagblad" }, true, 1, "good"],
    ["partial", { b1: "boek", b2: "" }, false, 0.5, "hard"],
    ["one-edit typo", { b1: "boek", b2: "krantt" }, false, 0.75, "hard"],
    ["wrong", { b1: "tafel", b2: "peer" }, false, 0, "again"],
    ["empty", {}, false, 0, "again"],
  ] as const)("grades a %s response", (_name, values, correct, score, rating) => {
    const result = evaluateFillGap(exercise, { type: "fill-gap", values });

    expect(result).toMatchObject({
      correct,
      score,
      rating,
      skillResults: [{ skillId: exercise.skillId, correct, rating }],
      itemResults: [
        { itemId: "b1", expected: ["boek"] },
        { itemId: "b2", expected: ["krant", "dagblad"] },
      ],
    });
  });
});
