import type { EvaluationResult, TypedAnswer, TypedAnswerExercise } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { isAlmostAnswer } from "./evaluate-almost-answer";
import { gradeScore } from "./grade-score";

export interface TypedAnswerEvaluationOptions {
  isAlmostAnswer?: typeof isAlmostAnswer;
}

export function evaluateTypedAnswer(
  exercise: TypedAnswerExercise,
  answer: TypedAnswer,
  options: TypedAnswerEvaluationOptions = {},
): EvaluationResult {
  const normalizedAnswer = normalizeAnswer(answer.value);
  const expected = exercise.acceptedAnswers;
  const normalizedExpected = expected.map(normalizeAnswer);
  const correct = normalizedAnswer.length > 0 && normalizedExpected.includes(normalizedAnswer);

  if (correct) {
    const { rating } = gradeScore(1, exercise.partialCredit);
    return {
      correct: true,
      feedback: `Correct. ${expected[0]} is right.`,
      score: 1,
      expected,
      rating,
      skillIds: [exercise.skillId],
      skillResults: [{ skillId: exercise.skillId, correct: true, rating }],
    };
  }

  // Only one insertion, deletion, or substitution across whole normalized answers of at least five letters qualifies.
  const almost = (options.isAlmostAnswer ?? isAlmostAnswer)(answer.value, expected, exercise.typoTolerance);
  const score = almost ? 0.5 : 0;
  const { rating } = gradeScore(score, exercise.partialCredit);

  return {
    correct: false,
    feedback: almost && rating === "hard"
      ? `Almost. One accepted answer is: ${expected[0]}`
      : `Not quite. One accepted answer is: ${expected[0]}`,
    score,
    expected,
    rating,
    skillIds: [exercise.skillId],
    skillResults: [{ skillId: exercise.skillId, correct: false, rating }],
  };
}
