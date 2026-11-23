import type { ExerciseType } from "@/learning/contracts/module";
import type { ExerciseRendererRegistry } from "./types";
import { FillGapRenderer } from "./fill-gap-renderer";
import { MultipleChoiceRenderer } from "./multiple-choice-renderer";
import { MatchingRenderer } from "./matching-renderer";
import { TypedAnswerRenderer } from "./typed-answer-renderer";
import { WordOrderingRenderer } from "./word-ordering-renderer";

export const exerciseRendererRegistry: Partial<ExerciseRendererRegistry<ExerciseType>> = {
  "typed-answer": TypedAnswerRenderer,
  "multiple-choice": MultipleChoiceRenderer,
  "fill-gap": FillGapRenderer,
  "word-ordering": WordOrderingRenderer,
  matching: MatchingRenderer,
};
