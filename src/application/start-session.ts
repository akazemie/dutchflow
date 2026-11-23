import type { LearningModule } from "@/learning/contracts/module";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { SkillProgress } from "@/learning/core/progress";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import { chooseExerciseType } from "@/learning/exercises/choose-exercise-type";
import { planSession, type SessionCandidate } from "@/learning/planning/session-planner";

export interface PreparedLearningSession {
  module: LearningModule;
  preferences: LearnerPreferences;
  plan: SessionCandidate[];
  skillProgress: SkillProgress[];
}

export async function startSession(input: {
  module: LearningModule;
  preferences: LearnerPreferences;
  dueReviews: SessionCandidate[];
  knownSkillIds?: string[];
  skillProgress?: SkillProgress[];
  estimatedMinutesPerExercise?: number;
}): Promise<PreparedLearningSession> {
  const items = await input.module.loadItems({ level: input.preferences.level });
  const newItems: SessionCandidate[] = [];
  const estimatedMinutes = input.estimatedMinutesPerExercise ?? 2;
  const knownSkills = new Set(input.knownSkillIds ?? []);

  for (const item of items) {
    for (const skill of input.module.listSkills(item.id)) {
      newItems.push({
        skillId: skill.skillId,
        moduleId: input.module.id,
        itemId: item.id,
        focusId: skill.focusId,
        estimatedMinutes,
      });
    }
  }

  const dueSkillIds = new Set(input.dueReviews.map((candidate) => candidate.skillId));
  const eligibleNewItems = newItems.filter((candidate) =>
    !knownSkills.has(candidate.skillId) && !dueSkillIds.has(candidate.skillId),
  );
  const extraPracticeItems = newItems.filter((candidate) =>
    knownSkills.has(candidate.skillId) && !dueSkillIds.has(candidate.skillId),
  );

  const planned = planSession({
    dueReviews: input.dueReviews,
    newItems: eligibleNewItems,
    practiceItems: extraPracticeItems,
    strategy: input.preferences.exerciseStrategy,
    timeBudgetMinutes: input.preferences.dailyLearningMinutes,
  });
  const skillProgress = input.skillProgress ?? [];
  const progressBySkill = new Map(skillProgress.map((progress) => [progress.skillId, progress]));
  const sessionSeed = createExerciseId();
  const plan = planned.map((candidate, index) => {
    const seed = `${sessionSeed}:${candidate.skillId}:${index}`;
    return {
      ...candidate,
      exerciseType: chooseExerciseType(
        input.module.supportedExerciseTypes(candidate.itemId, candidate.focusId),
        progressBySkill.get(candidate.skillId),
        seed,
      ),
      seed,
    };
  });

  return {
    module: input.module,
    preferences: input.preferences,
    plan,
    skillProgress,
  };
}
