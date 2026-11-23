import { describe, expect, it } from "vitest";
import type { WordOrderingExercise } from "@/learning/contracts/module";
import { evaluateWordOrdering } from "./evaluate-word-ordering";

const exercise: WordOrderingExercise = {
  id: "word-order-1",
  type: "word-ordering",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: "Vocabulary",
  title: "Build the sentence",
  answerLabel: "Tap the words in sentence order",
  typoTolerance: "none",
  partialCredit: "none",
  prompt: "She eats an apple.",
  tokens: [
    { id: "t-today", text: "Vandaag" },
    { id: "t-eet", text: "eet" },
    { id: "t-ik", text: "ik" },
    { id: "t-een", text: "een" },
    { id: "t-appel", text: "appel" },
  ],
  acceptedOrders: [
    ["Vandaag", "eet", "ik", "een", "appel"],
    ["Ik", "eet", "vandaag", "een", "appel"],
  ],
};

describe("evaluateWordOrdering", () => {
  it.each([
    ["correct", ["t-today", "t-eet", "t-ik", "t-een", "t-appel"], true, 1, "good"],
    ["accepted variant with lower-case sentence start", ["t-ik", "t-eet", "t-today", "t-een", "t-appel"], true, 1, "good"],
    ["wrong order", ["t-eet", "t-today", "t-ik", "t-een", "t-appel"], false, 0, "again"],
    ["empty answer", [], false, 0, "again"],
    ["missing token", ["t-today", "t-eet", "t-ik", "t-een"], false, 0, "again"],
    ["reused token", ["t-today", "t-eet", "t-ik", "t-een", "t-een"], false, 0, "again"],
  ] as const)("grades a %s sequence", (_name, tokenIds, correct, score, rating) => {
    expect(evaluateWordOrdering(exercise, { type: "word-ordering", tokenIds: [...tokenIds] })).toMatchObject({
      correct,
      score,
      rating,
      skillResults: [{ skillId: exercise.skillId, correct, rating }],
    });
  });

  it("compares normalized token text so repeated words can be interchanged", () => {
    const repeatedExercise = {
      ...exercise,
      tokens: [
        { id: "t-ik", text: "Ik" },
        { id: "t-en-first", text: "en" },
        { id: "t-eet", text: "eet" },
        { id: "t-en-second", text: "en" },
      ],
      acceptedOrders: [["Ik", "en", "eet", "en"]],
    };

    expect(evaluateWordOrdering(repeatedExercise, {
      type: "word-ordering",
      tokenIds: ["t-ik", "t-en-second", "t-eet", "t-en-first"],
    })).toMatchObject({ correct: true, score: 1, rating: "good" });
  });
});
