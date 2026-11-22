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

function createLearningRuntime(): LearningRuntime {
  const db = new DutchFlowDatabase();
  const attempts = new DexieAttemptRepository(db);
  const preferences = new DexiePreferencesRepository(db);
  async function loadLearningModule(moduleId: string) {
    if (moduleId !== "verbs") throw new Error(`Unknown learning module: ${moduleId}`);
    const loaded = await import("@/learning/modules/verbs/module");
    return loaded.verbsModule;
  }

  return {
    loadLearningModule,
    getPreferences: () => getPreferences(LOCAL_LEARNER_ID, { preferences }),
    updatePreferences: (changes) => updatePreferences(LOCAL_LEARNER_ID, changes, { preferences }),
    async createSession(moduleId) {
      const learningModule = await loadLearningModule(moduleId);
      const learnerPreferences = await getPreferences(LOCAL_LEARNER_ID, { preferences });
      return startSession({ module: learningModule, preferences: learnerPreferences, dueReviews: [] });
    },
    async submitAnswer(input) {
      const learningModule = await loadLearningModule(input.exercise.moduleId);
      return submitAnswer(
        { ...input, learnerId: LOCAL_LEARNER_ID, module: learningModule },
        { attempts },
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
