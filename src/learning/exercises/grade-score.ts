import type { PartialCredit, SchedulerRating } from "@/learning/contracts/module";

export function gradeScore(score: number, partialCredit: PartialCredit): {
  correct: boolean;
  rating: SchedulerRating;
} {
  const correct = score === 1;
  const rating: SchedulerRating = correct
    ? "good"
    : partialCredit === "graded" && score >= 0.5
      ? "hard"
      : "again";

  return { correct, rating };
}
