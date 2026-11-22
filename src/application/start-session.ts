import type { LearningModule } from "@/learning/contracts/module";
import type { LearnerPreferences } from "@/learning/core/preferences";
import { planSession, type SessionCandidate } from "@/learning/planning/session-planner";

export interface PreparedLearningSession {
  module: LearningModule;
  preferences: LearnerPreferences;
  plan: SessionCandidate[];
}

export async function startSession(input: {
  module: LearningModule;
  preferences: LearnerPreferences;
  dueReviews: SessionCandidate[];
  estimatedMinutesPerExercise?: number;
}): Promise<PreparedLearningSession> {
  const items = await input.module.loadItems({ level: input.preferences.level });
  const newItems: SessionCandidate[] = [];
  const estimatedMinutes = input.estimatedMinutesPerExercise ?? 2;

  for (const item of items) {
    for (const focus of input.module.exerciseFocuses) {
      const exercise = await input.module.createExercise(item.id, {
        focusId: focus.id,
        explanationLanguage: input.preferences.explanationLanguage,
      });
      newItems.push({
        skillId: exercise.skillId,
        moduleId: input.module.id,
        itemId: item.id,
        focusId: focus.id,
        estimatedMinutes,
      });
    }
  }

  return {
    module: input.module,
    preferences: input.preferences,
    plan: planSession({
      dueReviews: input.dueReviews,
      newItems,
      strategy: input.preferences.exerciseStrategy,
      timeBudgetMinutes: input.preferences.dailyLearningMinutes,
    }),
  };
}
