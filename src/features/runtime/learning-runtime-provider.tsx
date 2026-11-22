"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LearningRuntime } from "@/application/learning-runtime";

const LearningRuntimeContext = createContext<LearningRuntime | null>(null);

export function LearningRuntimeProvider({ runtime, children }: { runtime: LearningRuntime | null; children: ReactNode }) {
  return <LearningRuntimeContext.Provider value={runtime}>{children}</LearningRuntimeContext.Provider>;
}

export function useLearningRuntime(): LearningRuntime | null {
  return useContext(LearningRuntimeContext);
}
