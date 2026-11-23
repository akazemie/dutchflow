import type { ComponentType } from "react";
import type {
  AnswerByType,
  EvaluationResult,
  ExerciseByType,
  ExerciseType,
} from "@/learning/contracts/module";

export interface ExerciseRendererProps<T extends ExerciseType> {
  exercise: ExerciseByType[T];
  disabled: boolean;
  feedback: EvaluationResult | null;
  onAnswer(answer: AnswerByType[T]): void;
}

export type ExerciseRenderer<T extends ExerciseType> = ComponentType<ExerciseRendererProps<T>>;

export type ExerciseRendererRegistry<T extends ExerciseType> = {
  [K in T]: ExerciseRenderer<K>;
};
