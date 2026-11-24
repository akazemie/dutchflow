"use client";

import { useState } from "react";
import type { ExerciseRendererProps } from "./types";

export function MatchingRenderer({
  exercise,
  disabled,
  feedback,
  t,
  onAnswer,
}: ExerciseRendererProps<"matching">) {
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  const rightIds = exercise.rightOrder;
  const selectedRightIds = new Set(Object.values(matches));
  const resultById = new Map(feedback?.itemResults?.map((result) => [result.itemId, result]));

  function selectLeft(pairId: string) {
    const pair = exercise.pairs.find((item) => item.id === pairId);
    if (!pair) return;
    setSelectedLeftId(pairId);
    setAnnouncement(t("renderer.facetSelected", { facet: t(pair.left) }));
  }

  function selectRight(pairId: string) {
    if (!selectedLeftId) return;
    const pair = exercise.pairs.find((item) => item.id === pairId);
    const leftPair = exercise.pairs.find((item) => item.id === selectedLeftId);
    if (!pair || !leftPair) return;
    setMatches((current) => ({ ...current, [selectedLeftId]: pairId }));
    setSelectedLeftId(null);
    setAnnouncement(t("renderer.pairMatched", { facet: t(leftPair.left), form: pair.right }));
  }

  function resetMatches() {
    setMatches({});
    setSelectedLeftId(null);
    setAnnouncement(t("renderer.matchesReset"));
  }

  return (
    <div className="exercise-answer-form matching-form">
      <p>{t(exercise.answerLabel)}</p>
      <div className="matching-columns">
        <div className="matching-column" role="group" aria-label={t("renderer.facets")}>
          {exercise.pairs.map((pair) => (
            <button
              key={pair.id}
              className="matching-option"
              type="button"
              disabled={disabled}
              aria-pressed={selectedLeftId === pair.id}
              onClick={() => selectLeft(pair.id)}
            >
              {t(pair.left)}
              {matches[pair.id] && (
                <span className="matching-assignment">
                  {" → "}{exercise.pairs.find((item) => item.id === matches[pair.id])?.right}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="matching-column" role="group" aria-label={t("renderer.forms")}>
          {rightIds.map((rightId) => {
            const pair = exercise.pairs.find((item) => item.id === rightId);
            if (!pair) return null;
            const isSelectedForCurrent = selectedLeftId !== null && matches[selectedLeftId] === pair.id;
            return (
              <button
                key={pair.id}
                className="matching-option"
                type="button"
                disabled={disabled || (selectedRightIds.has(pair.id) && !isSelectedForCurrent)}
                aria-pressed={isSelectedForCurrent}
                onClick={() => selectRight(pair.id)}
              >
                {pair.right}
              </button>
            );
          })}
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">{announcement}</p>
      {feedback && (
        <ul className="matching-results" aria-live="polite" aria-label={t("renderer.matchingResults")}>
          {exercise.pairs.map((pair) => {
            const result = resultById.get(pair.id);
            if (!result) return null;
            return (
              <li className={result.correct ? "item-result-correct" : "item-result-incorrect"} key={pair.id}>
                {t(pair.left)}: {result.correct ? t("renderer.correct") : t("renderer.incorrect")}{" "}
                {t("renderer.expected")} {result.expected.join(" / ")}
              </li>
            );
          })}
        </ul>
      )}
      <button
        className="secondary-button matching-reset-button"
        type="button"
        disabled={disabled || (Object.keys(matches).length === 0 && selectedLeftId === null)}
        onClick={resetMatches}
      >
        {t("renderer.resetMatches")}
      </button>
      <button
        className="primary-button"
        type="button"
        disabled={disabled}
        onClick={() => onAnswer({ type: "matching", matches })}
      >
        {t("renderer.checkAnswer")}
      </button>
    </div>
  );
}
