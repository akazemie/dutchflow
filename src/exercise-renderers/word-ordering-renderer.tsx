"use client";

import { useState } from "react";
import type { ExerciseRendererProps } from "./types";
import { EXERCISE_RENDERER_TEXT } from "./text";

export function WordOrderingRenderer({
  exercise,
  disabled,
  feedback,
  onAnswer,
}: ExerciseRendererProps<"word-ordering">) {
  const [orderedTokenIds, setOrderedTokenIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const orderedIds = new Set(orderedTokenIds);
  const result = feedback?.itemResults?.find((item) => item.itemId === exercise.id);

  function addToken(tokenId: string) {
    const token = exercise.tokens.find((item) => item.id === tokenId);
    if (!token) return;
    setOrderedTokenIds((current) => [...current, tokenId]);
    setAnnouncement(EXERCISE_RENDERER_TEXT.wordAdded(token.text));
  }

  function removeToken(tokenId: string) {
    const token = exercise.tokens.find((item) => item.id === tokenId);
    if (!token) return;
    setOrderedTokenIds((current) => current.filter((id) => id !== tokenId));
    setAnnouncement(EXERCISE_RENDERER_TEXT.wordRemoved(token.text));
  }

  return (
    <div className="exercise-answer-form word-ordering-form">
      <p>{exercise.answerLabel}</p>
      <ul className="word-ordering-token-list" aria-label={EXERCISE_RENDERER_TEXT.availableWords}>
        {exercise.tokens.filter((token) => !orderedIds.has(token.id)).map((token) => (
          <li key={token.id}>
            <button
              className="word-ordering-token"
              type="button"
              disabled={disabled}
              onClick={() => addToken(token.id)}
            >
              {token.text}
            </button>
          </li>
        ))}
      </ul>
      <ul className="word-ordering-token-list word-ordering-answer" aria-label={EXERCISE_RENDERER_TEXT.sentenceOrder}>
        {orderedTokenIds.map((tokenId) => {
          const token = exercise.tokens.find((item) => item.id === tokenId)!;
          return (
            <li key={token.id}>
              <button
                className="word-ordering-token"
                type="button"
                disabled={disabled}
                aria-label={EXERCISE_RENDERER_TEXT.removeWord(token.text)}
                onClick={() => removeToken(token.id)}
              >
                {token.text}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="visually-hidden" aria-live="polite">{announcement}</p>
      {result && (
        <p className={result.correct ? "item-result-correct" : "item-result-incorrect"} aria-live="polite">
          {EXERCISE_RENDERER_TEXT.expectedSentence}: {result.expected[0] ?? ""}
        </p>
      )}
      <button
        className="primary-button"
        type="button"
        disabled={disabled}
        onClick={() => onAnswer({ type: "word-ordering", tokenIds: orderedTokenIds })}
      >
        {EXERCISE_RENDERER_TEXT.checkAnswer}
      </button>
    </div>
  );
}
