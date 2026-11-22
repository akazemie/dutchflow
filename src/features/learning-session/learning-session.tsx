"use client";

import { useEffect, useState } from "react";
import type { LearningExercise, LearningModule } from "@/learning/contracts/module";
import { exerciseRendererRegistry } from "@/exercise-renderers/registry";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";

interface LearningSessionProps {
  moduleId: string;
}

export function LearningSession({ moduleId }: LearningSessionProps) {
  const runtime = useLearningRuntime();
  const [module, setModule] = useState<LearningModule | null>(null);
  const [exercise, setExercise] = useState<LearningExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function initialize() {
      try {
        if (!runtime) return;
        const loadedModule = await runtime.loadLearningModule(moduleId);
        const items = await loadedModule.loadItems();
        if (!items[0]) throw new Error("This module has no learning items yet.");
        const firstExercise = await loadedModule.createExercise(items[0].id);
        if (isCurrent) {
          setModule(loadedModule);
          setExercise(firstExercise);
        }
      } catch {
        if (isCurrent) setError("DutchFlow could not load this exercise. Please refresh and try again.");
      }
    }

    void initialize();
    return () => {
      isCurrent = false;
    };
  }, [moduleId, runtime]);

  async function handleAnswer(answer: string) {
    if (!runtime || !module || !exercise || isSaving || feedback) return;
    setIsSaving(true);
    setError(null);

    try {
      const { result } = await runtime.submitAnswer({ exercise, answer });
      setFeedback({ correct: result.correct, text: result.feedback });
    } catch {
      setError("Your attempt could not be saved locally. Check browser storage and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (error && !exercise) return <p className="notice notice-error" role="alert">{error}</p>;
  if (!module || !exercise) return <p className="loading-copy" role="status">Preparing your exercise…</p>;

  const Renderer = exerciseRendererRegistry[exercise.type];

  return (
    <section className="lesson-card" aria-labelledby="exercise-title">
      <div className="lesson-card-topline">
        <span className="lesson-label">{module.displayName}</span>
        <span className="level-pill">{exercise.focusLabel} · {exercise.level}</span>
      </div>
      <h1 id="exercise-title">Translate into Dutch</h1>
      <p className="prompt-translation">“{exercise.prompt}.”</p>
      {exercise.hint && <p className="exercise-hint">{exercise.hint}</p>}
      <Renderer exercise={exercise} disabled={isSaving || feedback !== null} onAnswer={handleAnswer} />
      {isSaving && <p className="save-status" role="status">Saving your attempt…</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {feedback && (
        <div className={`feedback ${feedback.correct ? "feedback-correct" : "feedback-incorrect"}`} role="status">
          <strong>{feedback.correct ? "Goed gedaan!" : "Keep practicing"}</strong>
          <p>{feedback.text}</p>
          <span>Your attempt is saved on this device.</span>
        </div>
      )}
    </section>
  );
}
