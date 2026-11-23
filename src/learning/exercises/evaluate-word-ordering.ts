import type { EvaluationResult, WordOrderingAnswer, WordOrderingExercise } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";

export function evaluateWordOrdering(
  exercise: WordOrderingExercise,
  answer: WordOrderingAnswer,
): EvaluationResult {
  const tokenTextById = new Map(exercise.tokens.map((token) => [token.id, token.text]));
  const tokenIds = answer.tokenIds;
  const validTokens = tokenIds.length === exercise.tokens.length
    && new Set(tokenIds).size === exercise.tokens.length
    && tokenIds.every((tokenId) => tokenTextById.has(tokenId));
  const submittedTokens = validTokens ? tokenIds.map((tokenId) => tokenTextById.get(tokenId)!) : [];
  const normalizedSubmitted = submittedTokens.map(normalizeAnswer);
  const correct = validTokens && exercise.acceptedOrders.some((acceptedOrder) =>
    acceptedOrder.length === normalizedSubmitted.length
    && acceptedOrder.every((token, index) => normalizeAnswer(token) === normalizedSubmitted[index]),
  );
  const expected = exercise.acceptedOrders.map((order) => order.join(" "));
  const rating = correct ? "good" : "again";

  return {
    correct,
    feedback: correct ? "Correct." : `Not quite. Expected: ${expected[0] ?? ""}`,
    score: correct ? 1 : 0,
    expected,
    rating,
    skillIds: [exercise.skillId],
    skillResults: [{ skillId: exercise.skillId, correct, rating }],
    itemResults: [{ itemId: exercise.id, correct, expected }],
  };
}
