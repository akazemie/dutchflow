"use client";

import { useState, type ReactNode } from "react";
import { getPreferences } from "@/application/get-preferences";
import { createLearningSession } from "@/application/create-learning-session";
import { submitAnswer } from "@/application/submit-answer";
import { updatePreferences } from "@/application/update-preferences";
import type { LearningRuntime } from "@/application/learning-runtime";
import { LearningRuntimeProvider } from "@/features/runtime/learning-runtime-provider";
import { I18nProvider } from "@/features/i18n/i18n-provider";
import { LOCAL_LEARNER_ID } from "@/learning/core/local-learner";
import { DutchFlowDatabase } from "@/infrastructure/dexie/database";
import { DexieAnswerRecorder } from "@/infrastructure/dexie/answer-recorder";
import { DexieLearningSessionRepository } from "@/infrastructure/dexie/learning-session-repository";
import { DexiePreferencesRepository } from "@/infrastructure/dexie/preferences-repository";
import { DexieProgressRepository } from "@/infrastructure/dexie/progress-repository";
import { DexieReviewScheduleRepository } from "@/infrastructure/dexie/review-schedule-repository";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";
import { DexieLearnerDataRepository } from "@/infrastructure/dexie/learner-data-repository";
import { DexieAttemptRepository } from "@/infrastructure/dexie/attempt-repository";
import { exportLearnerData, importLearnerData } from "@/application/export-import-data";
import { loadLearningModule } from "@/learning/modules/registry";

function createLearningRuntime(): LearningRuntime {
  const db = new DutchFlowDatabase();
  const answerRecorder = new DexieAnswerRecorder(db);
  const sessions = new DexieLearningSessionRepository(db);
  const preferences = new DexiePreferencesRepository(db);
  const progress = new DexieProgressRepository(db);
  const reviewSchedules = new DexieReviewScheduleRepository(db);
  const scheduler = createFsrsReviewScheduler();
  const learnerData = new DexieLearnerDataRepository(db);
  const attempts = new DexieAttemptRepository(db);
  if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
  return {
    loadLearningModule,
    getPreferences: () => getPreferences(LOCAL_LEARNER_ID, { preferences }),
    updatePreferences: (changes) => updatePreferences(LOCAL_LEARNER_ID, changes, { preferences }),
    getProgress: () => progress.listByLearner(LOCAL_LEARNER_ID),
    getDueReviews: () => reviewSchedules.listDue(LOCAL_LEARNER_ID, new Date().toISOString()),
    exportData: () => exportLearnerData(LOCAL_LEARNER_ID, { data: learnerData }),
    importData: (serialized) => importLearnerData(LOCAL_LEARNER_ID, serialized, { data: learnerData }).then(() => undefined),
    createSession: (moduleId, options) => createLearningSession(
      LOCAL_LEARNER_ID,
      moduleId,
      {
        attempts,
        loadModule: loadLearningModule,
        preferences,
        progress,
        reviewSchedules,
      },
      options,
    ),
    async submitAnswer(input) {
      const learningModule = await loadLearningModule(input.exercise.moduleId);
      return submitAnswer(
        { ...input, learnerId: LOCAL_LEARNER_ID, module: learningModule },
        { answerRecorder, scheduler },
      );
    },
    completeSession: (sessionId) => sessions.complete(
      LOCAL_LEARNER_ID,
      sessionId,
      new Date().toISOString(),
    ),
  };
}

export function AppCompositionRoot({ children }: { children: ReactNode }) {
  const [runtime] = useState<LearningRuntime | null>(() =>
    typeof window === "undefined" ? null : createLearningRuntime(),
  );

  return (
    <LearningRuntimeProvider runtime={runtime}>
      <I18nProvider>{children}</I18nProvider>
    </LearningRuntimeProvider>
  );
}
