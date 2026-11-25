"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ExerciseRendererProps } from "./types";

export function WordOrderingRenderer({
  exercise,
  disabled,
  feedback,
  t,
  onAnswer,
}: ExerciseRendererProps<"word-ordering">) {
  const [orderedTokenIds, setOrderedTokenIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const answerListRef = useRef<HTMLUListElement>(null);
  const focusRequest = useRef<{ type: "available"; tokenId: string } | { type: "answer" } | null>(null);
  const orderedIds = new Set(orderedTokenIds);
  const result = feedback?.itemResults?.find((item) => item.itemId === exercise.id);

  useLayoutEffect(() => {
    const request = focusRequest.current;
    if (!request) return;
    focusRequest.current = null;
    if (request.type === "answer") answerListRef.current?.focus();
    else buttonRefs.current.get(request.tokenId)?.focus();
  }, [orderedTokenIds]);

  function addToken(tokenId: string) {
    const token = exercise.tokens.find((item) => item.id === tokenId);
    if (!token) return;
    const nextAvailable = exercise.tokens.find((item) => item.id !== tokenId && !orderedIds.has(item.id));
    focusRequest.current = nextAvailable
      ? { type: "available", tokenId: nextAvailable.id }
      : { type: "answer" };
    setOrderedTokenIds((current) => [...current, tokenId]);
    setAnnouncement(t("renderer.wordAdded", { word: token.text }));
  }

  function removeToken(tokenId: string) {
    const token = exercise.tokens.find((item) => item.id === tokenId);
    if (!token) return;
    focusRequest.current = { type: "available", tokenId };
    setOrderedTokenIds((current) => current.filter((id) => id !== tokenId));
    setAnnouncement(t("renderer.wordRemoved", { word: token.text }));
  }

  return (
    <div className="exercise-answer-form word-ordering-form">
      <p>{t(exercise.answerLabel)}</p>
      <ul className="word-ordering-token-list" aria-label={t("renderer.availableWords")}>
        {exercise.tokens.filter((token) => !orderedIds.has(token.id)).map((token) => (
          <li key={token.id}>
            <button
              className="word-ordering-token"
              ref={(element) => {
                if (element) buttonRefs.current.set(token.id, element);
                else buttonRefs.current.delete(token.id);
              }}
              type="button"
              disabled={disabled}
              onClick={() => addToken(token.id)}
            >
              {token.text}
            </button>
          </li>
        ))}
      </ul>
      <ul
        className="word-ordering-token-list word-ordering-answer"
        aria-label={t("renderer.sentenceOrder")}
        ref={answerListRef}
        tabIndex={-1}
      >
        {orderedTokenIds.map((tokenId) => {
          const token = exercise.tokens.find((item) => item.id === tokenId)!;
          return (
            <li key={token.id}>
              <button
                className="word-ordering-token"
                type="button"
                disabled={disabled}
                aria-label={t("renderer.removeWord", { word: token.text })}
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
          {t("renderer.expectedSentence")}: {result.expected[0] ?? ""}
        </p>
      )}
      <button
        className="primary-button"
        type="button"
        disabled={disabled || orderedTokenIds.length !== exercise.tokens.length}
        onClick={() => onAnswer({ type: "word-ordering", tokenIds: orderedTokenIds })}
      >
        {t("renderer.checkAnswer")}
      </button>
    </div>
  );
}
