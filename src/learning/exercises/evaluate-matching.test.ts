import { describe, expect, it } from "vitest";
import type { MatchingExercise } from "@/learning/contracts/module";
import { evaluateMatching } from "./evaluate-matching";

const exercise: MatchingExercise = {
  id: "matching-1",
  type: "matching",
  moduleId: "verbs",
  contentId: "verb:lopen",
  skillId: "verb:lopen:perfectum",
  level: "A1",
  focusId: "matching",
  focusLabel: "Verb forms",
  title: "Match each facet to its form",
  answerLabel: "Tap a facet, then its matching form",
  typoTolerance: "none",
  partialCredit: "none",
  pairs: [
    { id: "perfectum", left: "Perfectum", right: "hebben or zijn + gelopen", skillId: "verb:lopen:perfectum" },
    { id: "singular", left: "Imperfectum singular", right: "liep", skillId: "verb:lopen:imperfectum:singular" },
    { id: "plural", left: "Imperfectum plural", right: "liepen", skillId: "verb:lopen:imperfectum:plural" },
  ],
  rightOrder: ["plural", "perfectum", "singular"],
};

describe("evaluateMatching", () => {
  it.each([
    ["all correct", { perfectum: "perfectum", singular: "singular", plural: "plural" }, true, 1, "hard"],
    ["all wrong", { perfectum: "singular", singular: "plural", plural: "perfectum" }, false, 0, "again"],
    ["partial", { perfectum: "perfectum", singular: "missing", plural: "plural" }, false, 2 / 3, "again"],
    ["empty", {}, false, 0, "again"],
    ["right side reused", { perfectum: "perfectum", singular: "perfectum", plural: "perfectum" }, false, 0, "again"],
  ] as const)("grades %s matches", (_name, matches, correct, score, rating) => {
    const result = evaluateMatching(exercise, { type: "matching", matches });

    expect(result).toMatchObject({
      correct,
      score,
      rating,
      skillResults: [
        { skillId: "verb:lopen:perfectum" },
        { skillId: "verb:lopen:imperfectum:singular" },
        { skillId: "verb:lopen:imperfectum:plural" },
      ],
    });
    expect(result.skillResults.every((skillResult) =>
      skillResult.correct ? skillResult.rating === "hard" : skillResult.rating === "again",
    )).toBe(true);
  });
});
