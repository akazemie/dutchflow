"use client";

import type { ReactNode } from "react";
import type { Answer, EvaluationResult, ExerciseByType, ExerciseType, LearningExercise } from "@/learning/contracts/module";
import type { MessageTranslator } from "@/i18n/catalog";
import { exerciseRendererRegistry } from "./registry";
import type { ExerciseRenderer } from "./types";

interface ExerciseRendererViewProps {
  exercise: LearningExercise;
  disabled: boolean;
  feedback: EvaluationResult | null;
  t: MessageTranslator;
  onAnswer(answer: Answer): void;
}

function MissingRenderer({ type, t }: { type: ExerciseType; t: MessageTranslator }) {
  return <p role="alert">{t("renderer.noRenderer", { type })}</p>;
}

function renderExercise<T extends ExerciseType>(
  type: T,
  exercise: ExerciseByType[T],
  props: Omit<ExerciseRendererViewProps, "exercise">,
): ReactNode {
  const Renderer = exerciseRendererRegistry[type] as ExerciseRenderer<T> | undefined;
  if (!Renderer) return <MissingRenderer type={type} t={props.t} />;
  return (
    <Renderer
      key={exercise.id}
      exercise={exercise}
      disabled={props.disabled}
      feedback={props.feedback}
      t={props.t}
      onAnswer={props.onAnswer}
    />
  );
}

export function ExerciseRendererView({
  exercise,
  disabled,
  feedback,
  t,
  onAnswer,
}: ExerciseRendererViewProps) {
  switch (exercise.type) {
    case "typed-answer": return renderExercise("typed-answer", exercise, { disabled, feedback, t, onAnswer });
    case "multiple-choice": return renderExercise("multiple-choice", exercise, { disabled, feedback, t, onAnswer });
    case "fill-gap": return renderExercise("fill-gap", exercise, { disabled, feedback, t, onAnswer });
    case "word-ordering": return renderExercise("word-ordering", exercise, { disabled, feedback, t, onAnswer });
    case "matching": return renderExercise("matching", exercise, { disabled, feedback, t, onAnswer });
  }
}
