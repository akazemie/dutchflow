import type { TypoTolerance } from "@/learning/contracts/module";
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

export function isAlmostAnswer(
  answer: string,
  acceptedAnswers: readonly string[],
  typoTolerance: TypoTolerance,
): boolean {
  if (typoTolerance !== "one-edit") return false;
  const normalizedAnswer = normalizeAnswer(answer);
  if (letterCount(normalizedAnswer) < 5) return false;

  return acceptedAnswers.some((acceptedAnswer) => {
    const normalizedAcceptedAnswer = normalizeAnswer(acceptedAnswer);
    return letterCount(normalizedAcceptedAnswer) >= 5
      && isOneEditAway(normalizedAnswer, normalizedAcceptedAnswer);
  });
}
