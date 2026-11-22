"use client";

import { useState, type FormEvent } from "react";
import type { LearningExercise } from "@/learning/contracts/module";

export interface ExerciseRendererProps {
  exercise: LearningExercise;
  disabled: boolean;
  onAnswer(answer: string): void;
}

export function TypedAnswerRenderer({ exercise, disabled, onAnswer }: ExerciseRendererProps) {
  const [answer, setAnswer] = useState("");
  if (exercise.type !== "typed-answer") return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAnswer(answer);
  }

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <label htmlFor="answer">Your answer in Dutch</label>
      <input
        autoComplete="off"
        id="answer"
        name="answer"
        onChange={(event) => setAnswer(event.currentTarget.value)}
        placeholder="Type the Dutch sentence"
        value={answer}
        disabled={disabled}
        required
      />
      <button className="primary-button" type="submit" disabled={disabled || answer.trim().length === 0}>
        Check answer
      </button>
    </form>
  );
}
