"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReviewSchedule, SkillProgress } from "@/learning/core/progress";
import type { MessageKey } from "@/i18n/catalog";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";
import { useI18n } from "@/features/i18n/i18n-provider";

const focusMessageKeys: Record<string, MessageKey> = {
  perfectum: "focus.perfectum",
  "imperfectum-singular": "focus.imperfectum.singular",
  "imperfectum-plural": "focus.imperfectum.plural",
  meaning: "focus.vocabulary",
};

export function ProgressDashboard() {
  const runtime = useLearningRuntime();
  const { t } = useI18n();
  const [progress, setProgress] = useState<SkillProgress[]>([]);
  const [due, setDue] = useState<ReviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!runtime) return;
      try {
        const [records, dueReviews] = await Promise.all([runtime.getProgress(), runtime.getDueReviews()]);
        if (active) { setProgress(records); setDue(dueReviews); setLoading(false); }
      } catch {
        if (active) { setError(true); setLoading(false); }
      }
    }
    void load();
    return () => { active = false; };
  }, [runtime]);

  if (loading) return <p className="loading-copy progress-shell" role="status">{t("progress.loading")}</p>;
  if (error) return <p className="notice-error progress-shell" role="alert">{t("progress.error")}</p>;

  const attempts = progress.reduce((total, record) => total + record.attempts, 0);
  const correct = progress.reduce((total, record) => total + record.correctAttempts, 0);
  return (
    <div className="progress-shell">
      <div className="learning-intro"><span className="eyebrow">{t("progress.eyebrow")}</span><p>{t("progress.tagline")}</p></div>
      <section className="settings-heading" aria-labelledby="progress-title">
        <h1 id="progress-title">{t("progress.title")}</h1><p>{t("progress.description")}</p>
      </section>
      <div className="progress-summary">
        <article><span>{t("progress.skills")}</span><strong>{progress.length}</strong></article>
        <article><span>{t("progress.answers")}</span><strong>{attempts}</strong></article>
        <article><span>{t("progress.correctAnswers")}</span><strong>{correct}{attempts ? ` / ${attempts}` : ""}</strong></article>
        <article><span>{t("progress.reviewsDue")}</span><strong>{due.length}</strong></article>
      </div>
      <section className="progress-list" aria-labelledby="skills-title">
        <div className="progress-list-heading">
          <h2 id="skills-title">{t("progress.reviewableSkills")}</h2>
          <Link className="text-link" href="/learn/verbs/">{t("progress.practiceVerbs")}</Link>
        </div>
        {progress.length === 0 ? <p className="empty-state">{t("progress.empty")}</p> : (
          <ul>{progress.map((record) => {
            const isDue = due.some((item) => item.skillId === record.skillId);
            const focusMessageKey = focusMessageKeys[record.focusId];
            return <li key={record.id}>
              <div>
                <strong>{record.itemId.replace("verb:", "").replaceAll("-", " ")}</strong>
                <span>{focusMessageKey ? t(focusMessageKey) : record.focusId}</span>
              </div>
              <div className="progress-skill-meta">
                <span>{t("progress.correctCount", { correct: record.correctAttempts, total: record.attempts })}</span>
                <span>{isDue
                  ? t("progress.dueNow")
                  : t("progress.lastPracticed", { date: record.lastReviewedAt.slice(0, 10) })}</span>
              </div>
            </li>;
          })}</ul>
        )}
      </section>
    </div>
  );
}
