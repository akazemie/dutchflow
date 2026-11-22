"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  EXERCISE_STRATEGIES,
  EXPLANATION_LANGUAGES,
  LANGUAGE_LEVELS,
  type LearnerPreferenceChanges,
  type LearnerPreferences,
} from "@/learning/core/preferences";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";

const languageLabels: Record<(typeof EXPLANATION_LANGUAGES)[number], string> = {
  en: "English",
  nl: "Nederlands",
  fa: "فارسی",
};

const strategyLabels: Record<(typeof EXERCISE_STRATEGIES)[number], string> = {
  balanced: "Mix reviews and new practice",
  "review-first": "Review due skills first",
  "new-first": "Learn new skills first",
};

export function PreferencesForm() {
  const runtime = useLearningRuntime();
  const [preferences, setPreferences] = useState<LearnerPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      if (!runtime) return;
      try {
        const loaded = await runtime.getPreferences();
        if (isCurrent) setPreferences(loaded);
      } catch {
        if (isCurrent) setError("DutchFlow could not load your preferences from this device.");
      }
    }

    void load();
    return () => {
      isCurrent = false;
    };
  }, [runtime]);

  function update<K extends keyof LearnerPreferenceChanges>(key: K, value: LearnerPreferenceChanges[K]) {
    setSaved(false);
    setPreferences((current) => current ? { ...current, [key]: value } : current);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runtime || !preferences || isSaving) return;
    setIsSaving(true);
    setSaved(false);
    setError(null);

    const changes: LearnerPreferenceChanges = {
      level: preferences.level,
      explanationLanguage: preferences.explanationLanguage,
      exerciseStrategy: preferences.exerciseStrategy,
      dailyLearningMinutes: preferences.dailyLearningMinutes,
    };

    try {
      setPreferences(await runtime.updatePreferences(changes));
      setSaved(true);
    } catch {
      setError("Your preferences could not be saved locally. Check browser storage and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!preferences) {
    return <p className="loading-copy" role="status">{error ?? "Loading your preferences…"}</p>;
  }

  return (
    <form className="preferences-card" onSubmit={handleSubmit}>
      <label className="preference-field">
        <span>Language level</span>
        <select
          value={preferences.level}
          onChange={(event) => update("level", event.currentTarget.value as LearnerPreferences["level"])}
        >
          {LANGUAGE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
      </label>

      <label className="preference-field">
        <span>Explanation language</span>
        <select
          value={preferences.explanationLanguage}
          onChange={(event) => update("explanationLanguage", event.currentTarget.value as LearnerPreferences["explanationLanguage"])}
        >
          {EXPLANATION_LANGUAGES.map((language) => (
            <option key={language} value={language}>{languageLabels[language]}</option>
          ))}
        </select>
      </label>

      <label className="preference-field">
        <span>Exercise strategy</span>
        <select
          value={preferences.exerciseStrategy}
          onChange={(event) => update("exerciseStrategy", event.currentTarget.value as LearnerPreferences["exerciseStrategy"])}
        >
          {EXERCISE_STRATEGIES.map((strategy) => (
            <option key={strategy} value={strategy}>{strategyLabels[strategy]}</option>
          ))}
        </select>
      </label>

      <label className="preference-field time-field">
        <span>Daily learning time <strong>{preferences.dailyLearningMinutes} min</strong></span>
        <input
          max={60}
          min={5}
          step={5}
          type="range"
          value={preferences.dailyLearningMinutes}
          onChange={(event) => update("dailyLearningMinutes", Number(event.currentTarget.value))}
        />
        <span className="range-labels"><span>5 min</span><span>60 min</span></span>
      </label>

      <div className="preferences-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving…" : "Save preferences"}
        </button>
        {saved && <span className="save-status" role="status">Saved on this device</span>}
      </div>
      {error && <p className="notice-error" role="alert">{error}</p>}
    </form>
  );
}
