"use client";

import { useState, type FormEvent } from "react";
import type { ExerciseRendererProps } from "./types";

export function FillGapRenderer({
  exercise,
  disabled,
  feedback,
  onAnswer,
}: ExerciseRendererProps<"fill-gap">) {
  const [values, setValues] = useState<Record<string, string>>({});
  const resultsById = new Map(feedback?.itemResults?.map((result) => [result.itemId, result]));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAnswer({ type: "fill-gap", values });
  }

  return (
    <form className="exercise-answer-form fill-gap-form" onSubmit={handleSubmit}>
      <p className="fill-gap-sentence" aria-label={exercise.answerLabel}>
        {exercise.segments.map((segment) => {
          if (segment.type === "text") return <span key={segment.id}>{segment.text}</span>;
          const result = resultsById.get(segment.blankId);
          const blankNumber = exercise.blanks.findIndex((blank) => blank.id === segment.blankId) + 1;
          return (
            <span className="fill-gap-answer" key={segment.blankId}>
              <input
                aria-label={`${exercise.answerLabel} ${blankNumber}`}
                autoComplete="off"
                disabled={disabled}
                onChange={(event) => setValues((current) => ({
                  ...current,
                  [segment.blankId]: event.currentTarget.value,
                }))}
                value={values[segment.blankId] ?? ""}
              />
              {result && (
                <span className={result.correct ? "item-result-correct" : "item-result-incorrect"}>
                  {result.correct ? "Correct" : `Expected: ${result.expected.join(" / ")}`}
                </span>
              )}
            </span>
          );
        })}
      </p>
      <button className="primary-button" type="submit" disabled={disabled || exercise.blanks.some((blank) => !values[blank.id]?.trim())}>
        Check answer
      </button>
      {feedback && <p className="renderer-feedback" aria-live="polite">{feedback.feedback}</p>}
    </form>
  );
}
