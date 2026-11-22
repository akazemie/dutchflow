import type { ComponentType } from "react";
import type { ExerciseType } from "@/learning/contracts/module";
import { TypedAnswerRenderer, type ExerciseRendererProps } from "./typed-answer-renderer";

export const exerciseRendererRegistry: Record<ExerciseType, ComponentType<ExerciseRendererProps>> = {
  "typed-answer": TypedAnswerRenderer,
};
