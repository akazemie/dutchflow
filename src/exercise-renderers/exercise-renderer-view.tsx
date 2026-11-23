"use client";

import type { Answer, EvaluationResult, LearningExercise } from "@/learning/contracts/module";
import { exerciseRendererRegistry } from "./registry";

interface ExerciseRendererViewProps {
  exercise: LearningExercise;
  disabled: boolean;
  feedback: EvaluationResult | null;
  onAnswer(answer: Answer): void;
}

export function ExerciseRendererView({
  exercise,
  disabled,
  feedback,
  onAnswer,
}: ExerciseRendererViewProps) {
  switch (exercise.type) {
    case "typed-answer": {
      const Renderer = exerciseRendererRegistry["typed-answer"];
      return Renderer ? (
        <Renderer
          key={exercise.id}
          exercise={exercise}
          disabled={disabled}
          feedback={feedback}
          onAnswer={onAnswer}
        />
      ) : <p role="alert">No renderer is registered for typed-answer exercises.</p>;
    }
    case "multiple-choice": {
      const Renderer = exerciseRendererRegistry["multiple-choice"];
      return Renderer ? (
        <Renderer
          key={exercise.id}
          exercise={exercise}
          disabled={disabled}
          feedback={feedback}
          onAnswer={onAnswer}
        />
      ) : <p role="alert">No renderer is registered for multiple-choice exercises.</p>;
    }
    case "fill-gap": {
      const Renderer = exerciseRendererRegistry["fill-gap"];
      return Renderer ? (
        <Renderer
          key={exercise.id}
          exercise={exercise}
          disabled={disabled}
          feedback={feedback}
          onAnswer={onAnswer}
        />
      ) : <p role="alert">No renderer is registered for fill-gap exercises.</p>;
    }
    case "word-ordering":
    case "matching":
      return <p role="alert">This exercise type is not available yet.</p>;
  }
}
