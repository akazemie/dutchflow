import type { EvaluationResult, TypedAnswer, TypedAnswerExercise } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";

function isOneEditAway(answer: string, expected: string): boolean {
  if (Math.abs(answer.length - expected.length) > 1) return false;

  let answerIndex = 0;
  let expectedIndex = 0;
  let edits = 0;

  while (answerIndex < answer.length && expectedIndex < expected.length) {
    if (answer[answerIndex] === expected[expectedIndex]) {
      answerIndex += 1;
      expectedIndex += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;
    if (answer.length > expected.length) answerIndex += 1;
    else if (expected.length > answer.length) expectedIndex += 1;
    else {
      answerIndex += 1;
      expectedIndex += 1;
    }
  }

  if (answerIndex < answer.length || expectedIndex < expected.length) edits += 1;
  return edits === 1;
}

function letterCount(value: string): number {
  return [...value].filter((character) => /\p{L}/u.test(character)).length;
}

export function evaluateTypedAnswer(
  exercise: TypedAnswerExercise,
  answer: TypedAnswer,
): EvaluationResult {
  const normalizedAnswer = normalizeAnswer(answer.value);
  const expected = exercise.acceptedAnswers;
  const normalizedExpected = expected.map(normalizeAnswer);
  const correct = normalizedAnswer.length > 0 && normalizedExpected.includes(normalizedAnswer);

  if (correct) {
    return {
      correct: true,
      feedback: `Correct. ${expected[0]} is right.`,
      score: 1,
      expected,
      rating: "good",
      skillIds: [exercise.skillId],
    };
  }

  // Only one insertion, deletion, or substitution across whole normalized answers of at least five letters qualifies.
  const almost = letterCount(normalizedAnswer) >= 5 && normalizedExpected.some(
    (candidate) => letterCount(candidate) >= 5 && isOneEditAway(normalizedAnswer, candidate),
  );

  return {
    correct: false,
    feedback: almost
      ? `Almost. One accepted answer is: ${expected[0]}`
      : `Not quite. One accepted answer is: ${expected[0]}`,
    score: almost ? 0.5 : 0,
    expected,
    rating: almost ? "hard" : "again",
    skillIds: [exercise.skillId],
  };
}
