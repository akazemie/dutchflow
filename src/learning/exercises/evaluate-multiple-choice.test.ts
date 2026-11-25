import { describe, expect, it } from "vitest";
import type { MultipleChoiceExercise } from "@/learning/contracts/module";
import { message } from "@/learning/contracts/message";
import { evaluateMultipleChoice } from "./evaluate-multiple-choice";

const exercise: MultipleChoiceExercise = {
  id: "mc-1",
  type: "multiple-choice",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: message("focus.vocabulary"),
  title: message("exercise.title.chooseTranslation"),
  answerLabel: message("exercise.answer.chooseDutchWord"),
  typoTolerance: "none",
  partialCredit: "none",
  prompt: "She eats an apple.",
  options: [
    { id: "correct", text: "Ze eet een appel." },
    { id: "wrong", text: "Zij eet een peer." },
  ],
  correctOptionId: "correct",
};

describe("evaluateMultipleChoice", () => {
  it.each([
    ["correct option", "correct", true, 1, "hard"],
    ["wrong option", "wrong", false, 0, "again"],
    ["empty answer", "", false, 0, "again"],
  ] as const)("grades a %s", (_name, optionId, correct, score, rating) => {
    expect(evaluateMultipleChoice(exercise, { type: "multiple-choice", optionId })).toMatchObject({
      correct,
      score,
      rating,
      expected: ["Ze eet een appel."],
      skillResults: [{ skillId: exercise.skillId, correct, rating }],
    });
  });
});
