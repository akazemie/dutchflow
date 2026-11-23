import type { EvaluationResult, FillGapAnswer, FillGapExercise, SchedulerRating } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { isAlmostAnswer } from "./evaluate-almost-answer";
import { gradeScore } from "./grade-score";

export function evaluateFillGap(exercise: FillGapExercise, answer: FillGapAnswer): EvaluationResult {
  if (exercise.blanks.length === 0) throw new Error("A fill-gap exercise must contain at least one blank.");

  let earnedPoints = 0;
  let hasAlmostAnswer = false;
  const itemResults = exercise.blanks.map((blank) => {
    const value = normalizeAnswer(answer.values[blank.id] ?? "");
    const accepted = blank.acceptedAnswers.map(normalizeAnswer);
    const correct = value.length > 0 && accepted.includes(value);
    const almost = !correct && isAlmostAnswer(value, accepted, exercise.typoTolerance);
    hasAlmostAnswer ||= almost;
    earnedPoints += correct ? 1 : almost ? 0.5 : 0;
    return { itemId: blank.id, correct, expected: blank.acceptedAnswers };
  });
  const score = earnedPoints / exercise.blanks.length;
  const grade = gradeScore(score, exercise.partialCredit);
  const skillRating: SchedulerRating = grade.rating;
  const expected = exercise.blanks.flatMap((blank) => blank.acceptedAnswers);

  return {
    ...grade,
    feedback: grade.correct
      ? "Correct."
      : hasAlmostAnswer && skillRating === "hard"
        ? `Almost. Expected: ${expected.join(" / ")}`
        : `Not quite. Expected: ${expected.join(" / ")}`,
    score,
    expected,
    rating: skillRating,
    skillIds: [exercise.skillId],
    skillResults: [{ skillId: exercise.skillId, correct: grade.correct, rating: skillRating }],
    itemResults,
  };
}
