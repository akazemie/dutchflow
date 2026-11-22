"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReviewSchedule, SkillProgress } from "@/learning/core/progress";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";

export function ProgressDashboard() {
  const runtime = useLearningRuntime();
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

  if (loading) return <p className="loading-copy progress-shell" role="status">Loading your progress…</p>;
  if (error) return <p className="notice-error progress-shell" role="alert">Progress could not be loaded from this device.</p>;

  const attempts = progress.reduce((total, record) => total + record.attempts, 0);
  const correct = progress.reduce((total, record) => total + record.correctAttempts, 0);
  return (
    <div className="progress-shell">
      <div className="learning-intro"><span className="eyebrow">YOUR LEARNING</span><p>Small steps add up.</p></div>
      <section className="settings-heading" aria-labelledby="progress-title">
        <h1 id="progress-title">Progress</h1><p>Your progress is stored locally on this device.</p>
      </section>
      <div className="progress-summary">
        <article><span>Skills practiced</span><strong>{progress.length}</strong></article>
        <article><span>Answers recorded</span><strong>{attempts}</strong></article>
        <article><span>Correct answers</span><strong>{correct}{attempts ? ` / ${attempts}` : ""}</strong></article>
        <article><span>Reviews due</span><strong>{due.length}</strong></article>
      </div>
      <section className="progress-list" aria-labelledby="skills-title">
        <div className="progress-list-heading"><h2 id="skills-title">Reviewable skills</h2><Link className="text-link" href="/learn/verbs/">Practice verbs →</Link></div>
        {progress.length === 0 ? <p className="empty-state">Complete an exercise to start tracking your progress.</p> : (
          <ul>{progress.map((record) => {
            const isDue = due.some((item) => item.skillId === record.skillId);
            return <li key={record.id}>
              <div><strong>{record.itemId.replace("verb:", "").replaceAll("-", " ")}</strong><span>{record.focusId}</span></div>
              <div className="progress-skill-meta"><span>{record.correctAttempts} / {record.attempts} correct</span>
                <span>{isDue ? "Due now" : `Last practiced ${record.lastReviewedAt.slice(0, 10)}`}</span></div>
            </li>;
          })}</ul>
        )}
      </section>
    </div>
  );
}
