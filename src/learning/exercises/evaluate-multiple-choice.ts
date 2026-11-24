import type { EvaluationResult, MultipleChoiceAnswer, MultipleChoiceExercise } from "@/learning/contracts/module";
import { message } from "@/learning/contracts/message";
import { gradeScore } from "./grade-score";

export function evaluateMultipleChoice(
  exercise: MultipleChoiceExercise,
  answer: MultipleChoiceAnswer,
): EvaluationResult {
  const correct = answer.optionId === exercise.correctOptionId;
  const score = correct ? 1 : 0;
  const grade = gradeScore(score, exercise.partialCredit);
  const rating = correct ? "hard" : grade.rating;
  const expected = exercise.options
    .filter((option) => option.id === exercise.correctOptionId)
    .map((option) => option.text);

  return {
    correct,
    feedback: correct
      ? message("evaluation.correct")
      : message("evaluation.expected", { expected: expected[0] ?? "" }),
    score,
    expected,
    rating,
    skillIds: [exercise.skillId],
    skillResults: [{ skillId: exercise.skillId, correct, rating }],
  };
}
