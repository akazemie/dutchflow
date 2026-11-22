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
import { DexieAttemptRepository } from "@/infrastructure/dexie/attempt-repository";
import { DexiePreferencesRepository } from "@/infrastructure/dexie/preferences-repository";
import { DexieProgressRepository } from "@/infrastructure/dexie/progress-repository";
import { DexieReviewScheduleRepository } from "@/infrastructure/dexie/review-schedule-repository";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";
import { DexieLearnerDataRepository } from "@/infrastructure/dexie/learner-data-repository";
import { exportLearnerData, importLearnerData } from "@/application/export-import-data";

function createLearningRuntime(): LearningRuntime {
  const db = new DutchFlowDatabase();
  const attempts = new DexieAttemptRepository(db);
  const preferences = new DexiePreferencesRepository(db);
  const progress = new DexieProgressRepository(db);
  const reviewSchedules = new DexieReviewScheduleRepository(db);
  const scheduler = createFsrsReviewScheduler();
  const learnerData = new DexieLearnerDataRepository(db);
  if (navigator.storage?.persist) void navigator.storage.persist().catch(() => false);
  async function loadLearningModule(moduleId: string) {
    if (moduleId !== "verbs") throw new Error(`Unknown learning module: ${moduleId}`);
    const loaded = await import("@/learning/modules/verbs/module");
    return loaded.verbsModule;
  }

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
      const now = new Date().toISOString();
      const [knownProgress, dueSchedules] = await Promise.all([
        progress.listByLearner(LOCAL_LEARNER_ID),
        reviewSchedules.listDue(LOCAL_LEARNER_ID, now),
      ]);
      return startSession({
        module: learningModule,
        preferences: learnerPreferences,
        knownSkillIds: knownProgress.map((record) => record.skillId),
        dueReviews: dueSchedules.map((schedule) => ({
          skillId: schedule.skillId,
          moduleId: schedule.moduleId,
          itemId: schedule.itemId,
          focusId: schedule.focusId,
          estimatedMinutes: 2,
        })),
      });
    },
    async submitAnswer(input) {
      const learningModule = await loadLearningModule(input.exercise.moduleId);
      return submitAnswer(
        { ...input, learnerId: LOCAL_LEARNER_ID, module: learningModule },
        { attempts, progress, reviewSchedules, scheduler },
      );
    },
  };
}

export function AppCompositionRoot({ children }: { children: ReactNode }) {
  const [runtime] = useState<LearningRuntime | null>(() =>
    typeof window === "undefined" ? null : createLearningRuntime(),
  );

  return <LearningRuntimeProvider runtime={runtime}>{children}</LearningRuntimeProvider>;
}
