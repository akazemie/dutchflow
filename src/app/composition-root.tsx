"use client";

import { useState, type ReactNode } from "react";
import { getPreferences } from "@/application/get-preferences";
import { startSession } from "@/application/start-session";
import { submitAnswer } from "@/application/submit-answer";
import { updatePreferences } from "@/application/update-preferences";
import type { LearningRuntime } from "@/application/learning-runtime";
import { LearningRuntimeProvider } from "@/features/runtime/learning-runtime-provider";
import { LOCAL_LEARNER_ID } from "@/learning/core/local-learner";
import { DutchFlowDatabase } from "@/infrastructure/dexie/database";
import { DexieAnswerRecorder } from "@/infrastructure/dexie/answer-recorder";
import { DexieLearningSessionRepository } from "@/infrastructure/dexie/learning-session-repository";
import { DexiePreferencesRepository } from "@/infrastructure/dexie/preferences-repository";
import { DexieProgressRepository } from "@/infrastructure/dexie/progress-repository";
import { DexieReviewScheduleRepository } from "@/infrastructure/dexie/review-schedule-repository";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";
import { DexieLearnerDataRepository } from "@/infrastructure/dexie/learner-data-repository";
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
  if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
  return {
    loadLearningModule,
    getPreferences: () => getPreferences(LOCAL_LEARNER_ID, { preferences }),
    updatePreferences: (changes) => updatePreferences(LOCAL_LEARNER_ID, changes, { preferences }),
    getProgress: () => progress.listByLearner(LOCAL_LEARNER_ID),
    getDueReviews: () => reviewSchedules.listDue(LOCAL_LEARNER_ID, new Date().toISOString()),
    exportData: () => exportLearnerData(LOCAL_LEARNER_ID, { data: learnerData }),
    importData: (serialized) => importLearnerData(LOCAL_LEARNER_ID, serialized, { data: learnerData }).then(() => undefined),
    async createSession(moduleId) {
      const learningModule = await loadLearningModule(moduleId);
      const learnerPreferences = await getPreferences(LOCAL_LEARNER_ID, { preferences });
      const now = new Date();
      const [knownProgress, allDueSchedules] = await Promise.all([
        progress.listByLearner(LOCAL_LEARNER_ID),
        reviewSchedules.listDue(LOCAL_LEARNER_ID, now.toISOString()),
      ]);
      const dueSchedules = allDueSchedules.filter((schedule) => schedule.moduleId === moduleId);
      return startSession({
        learnerId: LOCAL_LEARNER_ID,
        module: learningModule,
        preferences: learnerPreferences,
        knownSkillIds: knownProgress.filter((record) => record.moduleId === moduleId).map((record) => record.skillId),
        skillProgress: knownProgress.filter((record) => record.moduleId === moduleId),
        dueReviews: dueSchedules.map((schedule) => ({
          skillId: schedule.skillId,
          moduleId: schedule.moduleId,
          itemId: schedule.itemId,
          focusId: schedule.focusId,
          estimatedMinutes: 2,
        })),
      }, {
        sessions,
        now: () => now,
      });
    },
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

  return <LearningRuntimeProvider runtime={runtime}>{children}</LearningRuntimeProvider>;
}
