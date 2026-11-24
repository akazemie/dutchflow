"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Answer, EvaluationResult, LearningExercise, LearningItem, LearningModule } from "@/learning/contracts/module";
import type { SkillProgress } from "@/learning/core/progress";
import type { LearningSession } from "@/learning/core/session";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import type { ExplanationLanguage } from "@/learning/core/preferences";
import { chooseExerciseType } from "@/learning/exercises/choose-exercise-type";
import { filterEligibleExerciseTypes } from "@/learning/planning/matching-candidates";
import type { SessionCandidate } from "@/learning/planning/session-planner";
import type { PreparedLearningSession } from "@/application/start-session";
import { learningModuleRegistry } from "@/learning/modules/registry";
import { ExerciseRendererView } from "@/exercise-renderers/exercise-renderer-view";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";
import { VisibleExerciseTimer } from "@/application/visible-exercise-timer";
import { useI18n } from "@/features/i18n/i18n-provider";

interface LearningSessionProps {
  moduleId: string;
}

interface PreparedSessionView {
  items: LearningItem[];
  exercise: LearningExercise | null;
}

async function materializeSession(session: PreparedLearningSession): Promise<PreparedSessionView> {
  const items = await session.module.loadItems({ level: session.preferences.level });
  if (session.plan.length === 0) return { items, exercise: null };
  const candidate = session.plan[0]!;
  const exercise = await session.module.createExercise(candidate.itemId, {
    focusId: candidate.focusId,
    explanationLanguage: session.preferences.explanationLanguage,
    exerciseType: candidate.exerciseType,
    seed: candidate.seed,
  });
  return { items, exercise };
}

export function LearningSession({ moduleId }: LearningSessionProps) {
  const runtime = useLearningRuntime();
  const { t } = useI18n();
  const [module, setModule] = useState<LearningModule | null>(null);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [skillProgress, setSkillProgress] = useState<SkillProgress[]>([]);
  const [plan, setPlan] = useState<SessionCandidate[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const [isPlannedExercise, setIsPlannedExercise] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState("perfectum");
  const [explanationLanguage, setExplanationLanguage] = useState<ExplanationLanguage>("en");
  const [exercise, setExercise] = useState<LearningExercise | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emptySession, setEmptySession] = useState(false);
  const [dailyGoalReached, setDailyGoalReached] = useState(false);
  const [feedback, setFeedback] = useState<EvaluationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [timer] = useState(() => new VisibleExerciseTimer());

  const activateSession = useCallback((
    session: PreparedLearningSession,
    view: PreparedSessionView,
  ) => {
    setModule(session.module);
    setItems(view.items);
    setPlan(session.plan);
    setSessionIndex(0);
    setLearningSession(session.session);
    setExplanationLanguage(session.preferences.explanationLanguage);
    setEmptySession(session.plan.length === 0);
    setDailyGoalReached(session.dailyGoalReached);
    if (session.plan.length === 0) {
      setExercise(null);
      setIsPlannedExercise(false);
      return;
    }

    const firstCandidate = session.plan[0]!;
    setSkillProgress(session.skillProgress);
    setIsPlannedExercise(true);
    setSelectedItemId(firstCandidate.itemId);
    setFocusId(firstCandidate.focusId);
    setExercise(view.exercise);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function initialize() {
      try {
        if (!runtime) return;
        const session = await runtime.createSession(moduleId);
        const view = await materializeSession(session);
        if (isCurrent) activateSession(session, view);
      } catch {
        if (isCurrent) setError("session.error.load");
      }
    }

    void initialize();
    return () => {
      isCurrent = false;
    };
  }, [activateSession, moduleId, runtime]);

  useEffect(() => {
    if (!exercise) return;
    const activeTimer = timer;
    activeTimer.start();
    const updateVisibility = () => {
      if (document.visibilityState === "hidden") activeTimer.pause();
      else activeTimer.resume();
    };
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();
    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
      activeTimer.pause();
    };
  }, [exercise, timer]);

  async function startExtraSession() {
    if (!runtime || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const session = await runtime.createSession(moduleId, { extraSession: true });
      const view = await materializeSession(session);
      activateSession(session, view);
    } catch {
      setError("session.error.extra");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeExercise(itemId: string, nextFocusId: string) {
    if (!module || isSaving) return;
    try {
      const skill = module.listSkills(itemId).find((candidate) => candidate.focusId === nextFocusId);
      if (!skill) throw new Error(`No skill found for item ${itemId} and focus ${nextFocusId}.`);
      const currentCandidate = plan[sessionIndex];
      const isPlannedSelection = currentCandidate?.moduleId === module.id
        && currentCandidate.itemId === itemId
        && currentCandidate.skillId === skill.skillId
        && currentCandidate.focusId === nextFocusId;
      const seed = isPlannedSelection ? currentCandidate.seed ?? createExerciseId() : createExerciseId();
      const supportedTypes = filterEligibleExerciseTypes({
        supportedTypes: module.supportedExerciseTypes(itemId, nextFocusId),
        siblingSkills: module.listSkills(itemId),
        knownSkillIds: skillProgress.map((progress) => progress.skillId),
        skillProgress,
      });
      const nextExercise = await module.createExercise(itemId, {
        focusId: nextFocusId,
        explanationLanguage,
        exerciseType: isPlannedSelection && currentCandidate.exerciseType
          ? currentCandidate.exerciseType
          : chooseExerciseType(
            supportedTypes,
            skillProgress.find((progress) => progress.skillId === skill.skillId),
            seed,
          ),
        seed,
      });
      setSelectedItemId(itemId);
      setFocusId(nextFocusId);
      setExercise(nextExercise);
      setIsPlannedExercise(isPlannedSelection);
      if (nextExercise.type === "matching") {
        const coveredSkillIds = new Set(nextExercise.pairs.map((pair) => pair.skillId));
        setPlan((current) => [
          ...current.slice(0, sessionIndex + 1),
          ...current.slice(sessionIndex + 1).filter((candidate) =>
            candidate.moduleId !== module.id
            || candidate.itemId !== itemId
            || !coveredSkillIds.has(candidate.skillId),
          ),
        ]);
      }
      setFeedback(null);
      setError(null);
    } catch {
      setError("session.error.prepare");
    }
  }

  async function handleAnswer(answer: Answer) {
    if (!runtime || !module || !exercise || !learningSession || isSaving || feedback) return;
    setIsSaving(true);
    setError(null);

    try {
      const { result } = await runtime.submitAnswer({
        exercise,
        answer,
        session: learningSession,
        durationMs: timer.elapsedMs(),
      });
      setFeedback(result);
      if (isPlannedExercise && sessionIndex + 1 === plan.length) {
        try {
          await runtime.completeSession(learningSession.id);
        } catch {
          setError("session.error.complete");
        }
      }
      try {
        setSkillProgress(await runtime.getProgress());
      } catch {
        setError("session.error.progress");
      }
    } catch {
      setError("session.error.save");
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
        exerciseType: nextCandidate.exerciseType,
        seed: nextCandidate.seed,
      });
      setSessionIndex((current) => current + 1);
      setIsPlannedExercise(true);
      setSelectedItemId(nextCandidate.itemId);
      setFocusId(nextCandidate.focusId);
      setExercise(nextExercise);
      setFeedback(null);
    } catch {
      setError("session.error.prepare");
    } finally {
      setIsSaving(false);
    }
  }

  if (error && !exercise) return <p className="notice notice-error" role="alert">{t(error)}</p>;
  if (emptySession) {
    return (
      <section className="lesson-card empty-session" aria-labelledby="empty-session-title">
        <span className="lesson-label">
          {dailyGoalReached ? t("session.dailyGoal.label") : t("session.complete.label")}
        </span>
        <h1 id="empty-session-title">
          {dailyGoalReached ? t("session.dailyGoal.title") : t("session.complete.title")}
        </h1>
        <p>
          {dailyGoalReached
            ? t("session.dailyGoal.body")
            : t("session.complete.body")}
        </p>
        <div className="empty-session-actions">
          {dailyGoalReached && (
            <button className="primary-button" disabled={isSaving} onClick={() => void startExtraSession()} type="button">
              {t("session.dailyGoal.extra")}
            </button>
          )}
          {learningModuleRegistry
            .filter((entry) => entry.id !== moduleId)
            .map((entry) => (
              <Link className="primary-button" href={`/learn/${entry.id}/`} key={entry.id}>
                {t("session.tryModule", { module: t(entry.i18nKey) })}
              </Link>
            ))}
          <Link className="text-link" href="/progress/">{t("session.viewProgress")}</Link>
          <Link className="text-link" href="/settings/">{t("session.changeLevel")}</Link>
        </div>
      </section>
    );
  }
  if (!module || !exercise) return <p className="loading-copy" role="status">{t("session.loading")}</p>;

  return (
    <section className="lesson-card" aria-labelledby="exercise-title">
      <div className="lesson-card-topline">
        <span className="lesson-label">{t(module.i18nKey)}</span>
        <div className="lesson-meta">
          <span className="level-pill">{t(exercise.focusLabel)} · {exercise.level}</span>
          <span className="session-count">{sessionIndex + 1} / {plan.length}</span>
        </div>
      </div>
      <div className="practice-controls">
        <label className="learning-item-select-label" htmlFor="study-item-select">{t("session.studyItem")}</label>
        <select
          id="study-item-select"
          className="learning-item-select"
          value={selectedItemId ?? ""}
          onChange={(event) => void changeExercise(event.currentTarget.value, focusId)}
          disabled={isSaving}
        >
          {items.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}
        </select>
        <div className="focus-switch" role="group" aria-label={t("session.chooseFocus")}>
          {module.exerciseFocuses.map((focus) => (
            <button
              aria-pressed={focusId === focus.id}
              className={focusId === focus.id ? "focus-button focus-button-active" : "focus-button"}
              disabled={isSaving}
              key={focus.id}
              onClick={() => void changeExercise(selectedItemId ?? exercise.contentId, focus.id)}
              type="button"
            >
              {t(focus.label)}
            </button>
          ))}
        </div>
      </div>
      <h1 id="exercise-title">{t(exercise.title)}</h1>
      {"prompt" in exercise && <p className="prompt-translation">“{exercise.prompt}.”</p>}
      {exercise.hint && (
        <p
          className="exercise-hint"
          lang={explanationLanguage === "fa" ? "fa" : undefined}
          dir={explanationLanguage === "fa" ? "rtl" : undefined}
        >
          {exercise.hint}
        </p>
      )}
      <ExerciseRendererView
        key={exercise.id}
        exercise={exercise}
        disabled={isSaving || feedback !== null}
        feedback={feedback}
        t={t}
        onAnswer={(answer) => void handleAnswer(answer)}
      />
      {isSaving && <p className="save-status" role="status">{t("session.saving")}</p>}
      {error && <p className="notice notice-error" role="alert">{t(error)}</p>}
      {feedback && (
        <div className={`feedback ${feedback.correct ? "feedback-correct" : "feedback-incorrect"}`} role="status">
          <strong>{t(feedback.correct ? "session.feedback.good" : "session.feedback.practice")}</strong>
          <p>{t(feedback.feedback)}</p>
          {!feedback.correct && !feedback.itemResults && (
            <p>{t("session.feedback.expected", { answers: feedback.expected.join(" / ") })}</p>
          )}
          <span>{t("session.feedback.saved")}</span>
          {sessionIndex + 1 < plan.length ? (
            <button className="next-exercise-button" onClick={() => void handleNextExercise()} type="button">
              {t("session.next")} <span aria-hidden="true">→</span>
            </button>
          ) : (
            <p className="session-complete">{t("session.finished")}</p>
          )}
        </div>
      )}
    </section>
  );
}
