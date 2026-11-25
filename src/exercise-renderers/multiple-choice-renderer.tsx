"use client";

import { useState, type FormEvent } from "react";
import type { ExerciseRendererProps } from "./types";

export function MultipleChoiceRenderer({
  exercise,
  disabled,
  t,
  onAnswer,
}: ExerciseRendererProps<"multiple-choice">) {
  const [selectedOptionId, setSelectedOptionId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedOptionId) onAnswer({ type: "multiple-choice", optionId: selectedOptionId });
  }

  return (
    <form className="exercise-answer-form" onSubmit={handleSubmit}>
      <fieldset className="exercise-options" disabled={disabled}>
        <legend>{t(exercise.answerLabel)}</legend>
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
        {t("renderer.checkAnswer")}
      </button>
    </form>
  );
}
