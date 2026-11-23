import type { EvaluationResult, MatchingAnswer, MatchingExercise } from "@/learning/contracts/module";

export function evaluateMatching(
  exercise: MatchingExercise,
  answer: MatchingAnswer,
): EvaluationResult {
  if (exercise.pairs.length === 0) throw new Error("A matching exercise must contain at least one pair.");

  const rightUseCounts = new Map<string, number>();
  for (const rightId of Object.values(answer.matches)) {
    rightUseCounts.set(rightId, (rightUseCounts.get(rightId) ?? 0) + 1);
  }
  const itemResults = exercise.pairs.map((pair) => {
    const matchedRightId = answer.matches[pair.id];
    const correct = matchedRightId === pair.id && rightUseCounts.get(pair.id) === 1;
    return {
      itemId: pair.id,
      correct,
      expected: [pair.right],
    };
  });
  const correctCount = itemResults.filter((result) => result.correct).length;
  const score = correctCount / exercise.pairs.length;
  const correct = correctCount === exercise.pairs.length;
  const rating = correct ? "hard" : "again";
  const expected = exercise.pairs.map((pair) => pair.right);
  const skillResults = exercise.pairs.map((pair, index) => ({
    skillId: pair.skillId,
    correct: itemResults[index]!.correct,
    rating: itemResults[index]!.correct ? "hard" as const : "again" as const,
  }));
  return {
    correct,
    feedback: correct ? "All pairs are correct." : "Check the mismatched pairs.",
    score,
    expected,
    rating,
    skillIds: exercise.pairs.map((pair) => pair.skillId),
    skillResults,
    itemResults,
  };
}
