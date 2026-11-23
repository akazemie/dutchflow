import type { LearningModule } from "@/learning/contracts/module";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { SkillProgress } from "@/learning/core/progress";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import { chooseExerciseType } from "@/learning/exercises/choose-exercise-type";
import { collapseMatchingCandidates, filterEligibleExerciseTypes } from "@/learning/planning/matching-candidates";
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
  const skillProgress = input.skillProgress ?? [];
  const knownSkills = new Set([
    ...(input.knownSkillIds ?? []),
    ...skillProgress.map((progress) => progress.skillId),
  ]);
  const knownSkillIds = [...knownSkills];
  const skillsByItem = new Map(items.map((item) => [item.id, input.module.listSkills(item.id)]));

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

  const progressBySkill = new Map(skillProgress.map((progress) => [progress.skillId, progress]));
  const sessionSeed = createExerciseId();
  let candidateIndex = 0;
  const prepareCandidates = (candidates: readonly SessionCandidate[]) => candidates.map((candidate) => {
    const seed = `${sessionSeed}:${candidate.skillId}:${candidateIndex++}`;
    const supportedTypes = filterEligibleExerciseTypes({
      supportedTypes: input.module.supportedExerciseTypes(candidate.itemId, candidate.focusId),
      siblingSkills: skillsByItem.get(candidate.itemId) ?? input.module.listSkills(candidate.itemId),
      knownSkillIds,
      skillProgress,
    });
    const withinTimeBudget = candidate.estimatedMinutes * 3 <= input.preferences.dailyLearningMinutes;
    const availableTypes = withinTimeBudget
      ? supportedTypes
      : supportedTypes.filter((type) => type !== "matching");
    const exerciseType = chooseExerciseType(availableTypes, progressBySkill.get(candidate.skillId), seed);
    return {
      ...candidate,
      exerciseType,
      seed,
      estimatedMinutes: exerciseType === "matching" ? candidate.estimatedMinutes * 3 : candidate.estimatedMinutes,
    };
  });
  const dueCandidates = prepareCandidates(input.dueReviews);
  const newCandidates = prepareCandidates(eligibleNewItems);
  const practiceCandidates = prepareCandidates(extraPracticeItems);
  const matchingCollapsed = new Set(collapseMatchingCandidates(
    [...dueCandidates, ...newCandidates, ...practiceCandidates],
    skillsByItem,
  ));
  const plan = planSession({
    dueReviews: dueCandidates.filter((candidate) => matchingCollapsed.has(candidate)),
    newItems: newCandidates.filter((candidate) => matchingCollapsed.has(candidate)),
    practiceItems: practiceCandidates.filter((candidate) => matchingCollapsed.has(candidate)),
    strategy: input.preferences.exerciseStrategy,
    timeBudgetMinutes: input.preferences.dailyLearningMinutes,
  });

  return {
    module: input.module,
    preferences: input.preferences,
    plan,
    skillProgress,
  };
}
