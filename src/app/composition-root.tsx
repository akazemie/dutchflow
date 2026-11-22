"use client";

import { useState, type ReactNode } from "react";
import { submitAnswer } from "@/application/submit-answer";
import type { LearningRuntime } from "@/application/learning-runtime";
import { LearningRuntimeProvider } from "@/features/runtime/learning-runtime-provider";
import { LOCAL_LEARNER_ID } from "@/learning/core/local-learner";
import { DutchFlowDatabase } from "@/infrastructure/dexie/database";
import { DexieAttemptRepository } from "@/infrastructure/dexie/attempt-repository";

function createLearningRuntime(): LearningRuntime {
  const attempts = new DexieAttemptRepository(new DutchFlowDatabase());
  async function loadLearningModule(moduleId: string) {
    if (moduleId !== "verbs") throw new Error(`Unknown learning module: ${moduleId}`);
    const loaded = await import("@/learning/modules/verbs/module");
    return loaded.verbsModule;
  }

  return {
    loadLearningModule,
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
