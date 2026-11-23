import { describe, expect, it } from "vitest";
import type { TypedAnswerExercise } from "@/learning/contracts/module";
import { evaluateTypedAnswer } from "./evaluate-typed-answer";

const exercise: TypedAnswerExercise = {
  id: "exercise-1",
  type: "typed-answer",
  moduleId: "vocabulary",
  contentId: "vocabulary:appel",
  skillId: "vocabulary:appel:meaning",
  level: "A1",
  focusId: "meaning",
  focusLabel: "Vocabulary",
  title: "Translate into Dutch",
  answerLabel: "Your answer in Dutch",
  prompt: "She eats an apple.",
  typoTolerance: "one-edit",
  partialCredit: "graded",
  acceptedAnswers: ["Zij eet een appel.", "Ze eet een appel."],
};

describe("evaluateTypedAnswer", () => {
  it.each([
    {
      name: "exact answer",
      answer: "Zij eet een appel.",
      correct: true,
      score: 1,
      rating: "good",
    },
    {
      name: "accepted variant",
      answer: "Ze eet een appel.",
      correct: true,
      score: 1,
      rating: "good",
    },
    {
      name: "one edit across an answer with at least five letters",
      answer: "Zij eet een appal.",
      correct: false,
      score: 0.5,
      rating: "hard",
    },
    {
      name: "more than one edit",
      answer: "Zij eet een peer.",
      correct: false,
      score: 0,
      rating: "again",
    },
    {
      name: "empty answer",
      answer: "",
      correct: false,
      score: 0,
      rating: "again",
    },
    {
      name: "case normalization",
      answer: "ZIJ EET EEN APPEL.",
      correct: true,
      score: 1,
      rating: "good",
    },
    {
      name: "trailing punctuation normalization",
      answer: "Zij eet een appel!!!",
      correct: true,
      score: 1,
      rating: "good",
    },
  ])("$name", ({ answer, correct, score, rating }) => {
    const result = evaluateTypedAnswer(exercise, { type: "typed-answer", value: answer });

    expect(result).toMatchObject({
      correct,
      score,
      rating,
      expected: exercise.acceptedAnswers,
    });
    expect(result.feedback.toLocaleLowerCase("en-US")).toContain(rating === "hard" ? "almost" : correct ? "correct" : "not quite");
  });

  it("does not grant a hard rating for short answers even when one edit away", () => {
    const shortExercise = { ...exercise, acceptedAnswers: ["fiets"] };

    expect(evaluateTypedAnswer(shortExercise, { type: "typed-answer", value: "fiet" })).toMatchObject({
      correct: false,
      rating: "again",
      score: 0,
    });
  });

  it("returns again when a full answer has more than one edit", () => {
    expect(evaluateTypedAnswer(exercise, { type: "typed-answer", value: "Zij eet een appxx." })).toMatchObject({
      correct: false,
      rating: "again",
      score: 0,
    });
  });
});
