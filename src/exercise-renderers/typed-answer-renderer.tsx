"use client";

import { useState, type FormEvent } from "react";
import type { ExerciseRendererProps } from "./types";

export function TypedAnswerRenderer({ exercise, disabled, onAnswer }: ExerciseRendererProps<"typed-answer">) {
  const [answer, setAnswer] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAnswer({ type: "typed-answer", value: answer });
  }

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <label htmlFor="answer">{exercise.answerLabel}</label>
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
