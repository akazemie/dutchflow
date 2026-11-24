import { describe, expect, it } from "vitest";
import type { MatchingExercise } from "@/learning/contracts/module";
import { message } from "@/learning/contracts/message";
import { evaluateMatching } from "./evaluate-matching";

const exercise: MatchingExercise = {
  id: "matching-1",
  type: "matching",
  moduleId: "verbs",
  contentId: "verb:lopen",
  skillId: "verb:lopen:perfectum",
  level: "A1",
  focusId: "matching",
  focusLabel: message("focus.verbForms"),
  title: message("exercise.title.matchFacets"),
  answerLabel: message("exercise.answer.matchForms"),
  typoTolerance: "none",
  partialCredit: "none",
  pairs: [
    { id: "perfectum", left: message("focus.perfectum"), right: "hebben or zijn + gelopen", skillId: "verb:lopen:perfectum" },
    { id: "singular", left: message("focus.imperfectum.singular"), right: "liep", skillId: "verb:lopen:imperfectum:singular" },
    { id: "plural", left: message("focus.imperfectum.plural"), right: "liepen", skillId: "verb:lopen:imperfectum:plural" },
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
