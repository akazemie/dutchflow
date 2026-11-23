import type { MultipleChoiceExercise } from "@/learning/contracts/module";
import { normalizeAnswer } from "@/learning/core/normalize-answer";
import { seededShuffle } from "@/learning/core/seeded-shuffle";

export interface AnswerOption {
  id: string;
  text: string;
}

export function selectDistinctDistractors(
  candidates: readonly AnswerOption[],
  acceptedAnswers: readonly string[],
  limit: number,
): AnswerOption[] {
  const accepted = new Set(acceptedAnswers.map(normalizeAnswer));
  const seen = new Set(accepted);
  const distractors: AnswerOption[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeAnswer(candidate.text);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    distractors.push(candidate);
    if (distractors.length === limit) break;
  }

  return distractors;
}

export function createMultipleChoiceOptions(
  correctOption: AnswerOption,
  distractors: readonly AnswerOption[],
  seed: string,
): Pick<MultipleChoiceExercise, "options" | "correctOptionId"> {
  return {
    options: seededShuffle([correctOption, ...distractors], seed),
    correctOptionId: correctOption.id,
  };
}
