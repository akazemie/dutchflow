"use client";

import { useState, type FormEvent } from "react";
import type { ExerciseRendererProps } from "./types";

export function MultipleChoiceRenderer({
  exercise,
  disabled,
  feedback,
  onAnswer,
}: ExerciseRendererProps<"multiple-choice">) {
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const correctOption = exercise.options.find((option) => option.id === exercise.correctOptionId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedOptionId) onAnswer({ type: "multiple-choice", optionId: selectedOptionId });
  }

  return (
    <form className="exercise-answer-form" onSubmit={handleSubmit}>
      <fieldset className="exercise-options" disabled={disabled}>
        <legend>{exercise.answerLabel}</legend>
        {exercise.options.map((option) => (
          <label className="exercise-option" key={option.id}>
            <input
              checked={selectedOptionId === option.id}
              name={`answer-${exercise.id}`}
              onChange={() => setSelectedOptionId(option.id)}
              type="radio"
              value={option.id}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
      <span className="visually-hidden" aria-live="polite">
        {exercise.options.find((option) => option.id === selectedOptionId)?.text ?? ""}
      </span>
      <button className="primary-button" type="submit" disabled={disabled || !selectedOptionId}>
        Check answer
      </button>
      {feedback && (
        <p className="renderer-feedback" aria-live="polite">
          {feedback.correct
            ? feedback.feedback
            : `${feedback.feedback} ${correctOption ? `Expected: ${correctOption.text}` : ""}`}
        </p>
      )}
    </form>
  );
}
