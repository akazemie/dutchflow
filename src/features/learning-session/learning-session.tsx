"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import type { ExplanationLanguage } from "@/learning/core/preferences";
import type { SessionCandidate } from "@/learning/planning/session-planner";
import { exerciseRendererRegistry } from "@/exercise-renderers/registry";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";

interface LearningSessionProps {
  moduleId: string;
}

export function LearningSession({ moduleId }: LearningSessionProps) {
  const runtime = useLearningRuntime();
  const [module, setModule] = useState<LearningModule | null>(null);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [plan, setPlan] = useState<SessionCandidate[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState("perfectum");
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage>("en");
  const [exercise, setExercise] = useState<LearningExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emptySession, setEmptySession] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function initialize() {
      try {
        if (!runtime) return;
        const session = await runtime.createSession(moduleId);
        const items = await session.module.loadItems({ level: session.preferences.level });
        if (session.plan.length === 0) {
          if (isCurrent) {
            setModule(session.module);
            setItems(items);
            setPlan([]);
            setExplanationLanguage(session.preferences.explanationLanguage);
            setEmptySession(true);
          }
          return;
        }
        const firstCandidate = session.plan[0];
        const firstExercise = await session.module.createExercise(firstCandidate.itemId, {
          focusId: firstCandidate.focusId,
          explanationLanguage: session.preferences.explanationLanguage,
        });
        if (isCurrent) {
          setModule(session.module);
          setItems(items);
          setPlan(session.plan);
          setSessionIndex(0);
          setSelectedItemId(firstCandidate.itemId);
          setFocusId(firstCandidate.focusId);
          setExplanationLanguage(session.preferences.explanationLanguage);
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

  async function changeExercise(itemId: string, nextFocusId: string) {
    if (!module || isSaving) return;
    try {
      const nextExercise = await module.createExercise(itemId, {
        focusId: nextFocusId,
        explanationLanguage,
      });
      setSelectedItemId(itemId);
      setFocusId(nextFocusId);
      setExercise(nextExercise);
      setFeedback(null);
      setError(null);
    } catch {
      setError("DutchFlow could not prepare that exercise. Please try another selection.");
    }
  }

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

  async function handleNextExercise() {
    const nextCandidate = plan[sessionIndex + 1];
    if (!module || !nextCandidate || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const nextExercise = await module.createExercise(nextCandidate.itemId, {
        focusId: nextCandidate.focusId,
        explanationLanguage,
      });
      setSessionIndex((current) => current + 1);
      setSelectedItemId(nextCandidate.itemId);
      setFocusId(nextCandidate.focusId);
      setExercise(nextExercise);
      setFeedback(null);
    } catch {
      setError("DutchFlow could not prepare the next exercise. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (error && !exercise) return <p className="notice notice-error" role="alert">{error}</p>;
  if (emptySession) {
    return (
      <section className="lesson-card empty-session" aria-labelledby="empty-session-title">
        <span className="lesson-label">SESSION COMPLETE</span>
        <h1 id="empty-session-title">You’re caught up for now.</h1>
        <p>There are no new or due exercises for this module at your current level. Try another module or check your progress.</p>
        <div className="empty-session-actions">
          <Link className="primary-button" href={moduleId === "verbs" ? "/learn/vocabulary/" : "/learn/verbs/"}>
            Try {moduleId === "verbs" ? "vocabulary" : "verbs"}
          </Link>
          <Link className="text-link" href="/progress/">View progress</Link>
          <Link className="text-link" href="/settings/">Change level</Link>
        </div>
      </section>
    );
  }
  if (!module || !exercise) return <p className="loading-copy" role="status">Preparing your exercise…</p>;

  const Renderer = exerciseRendererRegistry[exercise.type];

  return (
    <section className="lesson-card" aria-labelledby="exercise-title">
      <div className="lesson-card-topline">
        <span className="lesson-label">{module.displayName}</span>
        <div className="lesson-meta">
          <span className="level-pill">{exercise.focusLabel} · {exercise.level}</span>
          <span className="session-count">{sessionIndex + 1} / {plan.length}</span>
        </div>
      </div>
      <div className="practice-controls">
        <label className="learning-item-select-label" htmlFor="study-item-select">Study item</label>
        <select
          id="study-item-select"
          className="learning-item-select"
          value={selectedItemId ?? ""}
          onChange={(event) => void changeExercise(event.currentTarget.value, focusId)}
          disabled={isSaving}
        >
          {items.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}
        </select>
        <div className="focus-switch" role="group" aria-label="Choose tense and number">
          {module.exerciseFocuses.map((focus) => (
            <button
              aria-pressed={focusId === focus.id}
              className={focusId === focus.id ? "focus-button focus-button-active" : "focus-button"}
              disabled={isSaving}
              key={focus.id}
              onClick={() => void changeExercise(selectedItemId ?? exercise.contentId, focus.id)}
              type="button"
            >
              {focus.label}
            </button>
          ))}
        </div>
      </div>
      <h1 id="exercise-title">Translate into Dutch</h1>
      <p className="prompt-translation">“{exercise.prompt}.”</p>
      {exercise.hint && <p className="exercise-hint">{exercise.hint}</p>}
      <Renderer key={exercise.id} exercise={exercise} disabled={isSaving || feedback !== null} onAnswer={handleAnswer} />
      {isSaving && <p className="save-status" role="status">Saving your attempt…</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {feedback && (
        <div className={`feedback ${feedback.correct ? "feedback-correct" : "feedback-incorrect"}`} role="status">
          <strong>{feedback.correct ? "Goed gedaan!" : "Keep practicing"}</strong>
          <p>{feedback.text}</p>
          <span>Your attempt is saved on this device.</span>
          {sessionIndex + 1 < plan.length ? (
            <button className="next-exercise-button" onClick={() => void handleNextExercise()} type="button">
              Next exercise <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className="session-complete">You’ve finished today’s planned practice.</p>
          )}
        </div>
      )}
    </section>
  );
}
