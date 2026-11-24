"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  EXERCISE_STRATEGIES,
  EXPLANATION_LANGUAGES,
  LANGUAGE_LEVELS,
  type ExplanationLanguage,
  type ExerciseStrategy,
  type LearnerPreferenceChanges,
  type LearnerPreferences,
} from "@/learning/core/preferences";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";
import { useI18n } from "@/features/i18n/i18n-provider";

const languageKeys: Record<ExplanationLanguage, string> = {
  en: "language.en",
  nl: "language.nl",
  fa: "language.fa",
};

const strategyKeys: Record<ExerciseStrategy, string> = {
  balanced: "strategy.balanced",
  "review-first": "strategy.reviewFirst",
  "new-first": "strategy.newFirst",
};

export function PreferencesForm() {
  const runtime = useLearningRuntime();
  const { t, setExplanationLanguage } = useI18n();
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
        if (isCurrent) setError(t("settings.error.load"));
      }
    }

    void load();
    return () => {
      isCurrent = false;
    };
  }, [runtime, t]);

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
      const updated = await runtime.updatePreferences(changes);
      setPreferences(updated);
      setExplanationLanguage(updated.explanationLanguage);
      setSaved(true);
    } catch {
      setError(t("settings.error.save"));
    } finally {
      setIsSaving(false);
    }
  }

  if (!preferences) {
    return <p className="loading-copy" role="status">{error ?? t("settings.loading")}</p>;
  }

  return (
    <form className="preferences-card" onSubmit={handleSubmit}>
      <label className="preference-field">
        <span>{t("settings.level")}</span>
        <select
          value={preferences.level}
          onChange={(event) => update("level", event.currentTarget.value as LearnerPreferences["level"])}
        >
          {LANGUAGE_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
      </label>

      <label className="preference-field">
        <span>{t("settings.explanationLanguage")}</span>
        <select
          value={preferences.explanationLanguage}
          onChange={(event) => update("explanationLanguage", event.currentTarget.value as LearnerPreferences["explanationLanguage"])}
        >
          {EXPLANATION_LANGUAGES.map((language) => (
            <option key={language} value={language}>{t(languageKeys[language])}</option>
          ))}
        </select>
      </label>

      <label className="preference-field">
        <span>{t("settings.strategy")}</span>
        <select
          value={preferences.exerciseStrategy}
          onChange={(event) => update("exerciseStrategy", event.currentTarget.value as LearnerPreferences["exerciseStrategy"])}
        >
          {EXERCISE_STRATEGIES.map((strategy) => (
            <option key={strategy} value={strategy}>{t(strategyKeys[strategy])}</option>
          ))}
        </select>
      </label>

      <label className="preference-field time-field">
        <span>
          {t("settings.dailyTime")} <strong>{t("common.minutes", { minutes: preferences.dailyLearningMinutes })}</strong>
        </span>
        <input
          max={60}
          min={5}
          step={5}
          type="range"
          value={preferences.dailyLearningMinutes}
          onChange={(event) => update("dailyLearningMinutes", Number(event.currentTarget.value))}
        />
        <span className="range-labels">
          <span>{t("common.minutes", { minutes: 5 })}</span>
          <span>{t("common.minutes", { minutes: 60 })}</span>
        </span>
      </label>

      <div className="preferences-actions">
        <button className="primary-button" disabled={isSaving} type="submit">
          {isSaving ? t("settings.saving") : t("settings.save")}
        </button>
        {saved && <span className="save-status" role="status">{t("settings.saved")}</span>}
      </div>
      {error && <p className="notice-error" role="alert">{error}</p>}
    </form>
  );
}
