"use client";

import type { ReactNode } from "react";
import type { Answer, EvaluationResult, ExerciseByType, ExerciseType, LearningExercise } from "@/learning/contracts/module";
import { exerciseRendererRegistry } from "./registry";
import type { ExerciseRenderer } from "./types";

interface ExerciseRendererViewProps {
  exercise: LearningExercise;
  disabled: boolean;
  feedback: EvaluationResult | null;
  onAnswer(answer: Answer): void;
}

function renderExercise<T extends ExerciseType>(
  type: T,
  exercise: ExerciseByType[T],
  props: Omit<ExerciseRendererViewProps, "exercise">,
): ReactNode {
  const Renderer = exerciseRendererRegistry[type] as ExerciseRenderer<T> | undefined;
  if (!Renderer) return <p role="alert">No renderer is registered for {type} exercises.</p>;
  return (
    <Renderer
      key={exercise.id}
      exercise={exercise}
      disabled={props.disabled}
      feedback={props.feedback}
      onAnswer={props.onAnswer}
    />
  );
}

export function ExerciseRendererView({
  exercise,
  disabled,
  feedback,
  onAnswer,
}: ExerciseRendererViewProps) {
  switch (exercise.type) {
    case "typed-answer": return renderExercise("typed-answer", exercise, { disabled, feedback, onAnswer });
    case "multiple-choice": return renderExercise("multiple-choice", exercise, { disabled, feedback, onAnswer });
    case "fill-gap": return renderExercise("fill-gap", exercise, { disabled, feedback, onAnswer });
    case "word-ordering": return renderExercise("word-ordering", exercise, { disabled, feedback, onAnswer });
    case "matching": return renderExercise("matching", exercise, { disabled, feedback, onAnswer });
  }
}
