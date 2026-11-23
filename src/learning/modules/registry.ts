import type { LearningModule } from "@/learning/contracts/module";

export interface LearningModuleMetadata {
  id: string;
  displayName: string;
  i18nKey: string;
}

interface LearningModuleRegistryEntry extends LearningModuleMetadata {
  load(): Promise<LearningModule>;
}

export const learningModuleRegistry: readonly LearningModuleRegistryEntry[] = [
  {
    id: "verbs",
    displayName: "Dutch verbs",
    i18nKey: "modules.verbs.title",
    async load() {
      const loaded = await import("./verbs/module");
      return loaded.verbsModule;
    },
  },
  {
    id: "vocabulary",
    displayName: "Dutch vocabulary",
    i18nKey: "modules.vocabulary.title",
    async load() {
      const loaded = await import("./vocabulary/module");
      return loaded.vocabularyModule;
    },
  },
];

export function getLearningModuleMetadata(moduleId: string): LearningModuleMetadata | undefined {
  const entry = learningModuleRegistry.find((module) => module.id === moduleId);
  if (!entry) return undefined;
  return { id: entry.id, displayName: entry.displayName, i18nKey: entry.i18nKey };
}

export async function loadLearningModule(moduleId: string): Promise<LearningModule> {
  const entry = learningModuleRegistry.find((module) => module.id === moduleId);
  if (!entry) throw new Error(`Unknown learning module: ${moduleId}`);
  return entry.load();
}
