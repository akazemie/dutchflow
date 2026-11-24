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

function candidateKey(candidate: SessionCandidate): string {
  return `${candidate.moduleId}:${candidate.itemId}:${candidate.skillId}`;
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
  const dueSkillsByItem = new Map<string, Set<string>>();
  for (const candidate of input.dueReviews) {
    const dueSkills = dueSkillsByItem.get(candidate.itemId) ?? new Set<string>();
    dueSkills.add(candidate.skillId);
    dueSkillsByItem.set(candidate.itemId, dueSkills);
  }
  const itemsWithMultipleDueSkills = new Set(
    [...skillsByItem].filter(([itemId, skills]) =>
      skills.filter(({ skillId }) => dueSkillsByItem.get(itemId)?.has(skillId)).length >= 2,
    ).map(([itemId]) => itemId),
  );
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
    const siblingSkills = skillsByItem.get(candidate.itemId) ?? input.module.listSkills(candidate.itemId);
    const supportedTypes = filterEligibleExerciseTypes({
      supportedTypes: input.module.supportedExerciseTypes(candidate.itemId, candidate.focusId),
      siblingSkills,
      knownSkillIds,
      skillProgress,
    });
    const isMatchingAnchor = siblingSkills[0]?.skillId === candidate.skillId;
    const withinTimeBudget = candidate.estimatedMinutes * 3 <= input.preferences.dailyLearningMinutes;
    let availableTypes = supportedTypes.filter((type) =>
      (withinTimeBudget || type !== "matching")
      && (itemsWithMultipleDueSkills.has(candidate.itemId) || type !== "matching")
      && (isMatchingAnchor || type !== "matching"),
    );
    if (availableTypes.length === 0 && supportedTypes.includes("matching")) {
      availableTypes = ["typed-answer"];
    }
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
  const candidatePools = {
    dueReviews: dueCandidates,
    newItems: newCandidates,
    practiceItems: practiceCandidates,
  };
  let plan = planSession({
    ...candidatePools,
    strategy: input.preferences.exerciseStrategy,
    timeBudgetMinutes: input.preferences.dailyLearningMinutes,
  });
  const processedMatchingGroups = new Set<string>();
  const coveredSkillKeys = new Set<string>();

  while (true) {
    const newlyPlannedMatching = plan.filter((candidate) => {
      if (candidate.exerciseType !== "matching") return false;
      return !processedMatchingGroups.has(`${candidate.moduleId}:${candidate.itemId}`);
    });
    if (newlyPlannedMatching.length === 0) break;

    for (const candidate of newlyPlannedMatching) {
      processedMatchingGroups.add(`${candidate.moduleId}:${candidate.itemId}`);
      for (const skill of skillsByItem.get(candidate.itemId) ?? []) {
        coveredSkillKeys.add(candidateKey({ ...candidate, skillId: skill.skillId }));
      }
    }

    plan = collapseMatchingCandidates(plan, skillsByItem);
    const selectedSkillKeys = new Set(plan.map(candidateKey));
    const remainingMinutes = input.preferences.dailyLearningMinutes
      - plan.reduce((minutes, candidate) => minutes + candidate.estimatedMinutes, 0);
    if (remainingMinutes <= 0) break;

    const refillPools = {
      dueReviews: candidatePools.dueReviews.filter((candidate) =>
        !selectedSkillKeys.has(candidateKey(candidate)) && !coveredSkillKeys.has(candidateKey(candidate)),
      ),
      newItems: candidatePools.newItems.filter((candidate) =>
        !selectedSkillKeys.has(candidateKey(candidate)) && !coveredSkillKeys.has(candidateKey(candidate)),
      ),
      practiceItems: candidatePools.practiceItems.filter((candidate) =>
        !selectedSkillKeys.has(candidateKey(candidate)) && !coveredSkillKeys.has(candidateKey(candidate)),
      ),
    };
    const refill = planSession({
      ...refillPools,
      strategy: input.preferences.exerciseStrategy,
      timeBudgetMinutes: remainingMinutes,
    });
    if (refill.length === 0) break;
    plan = [...plan, ...refill];
  }

  return {
    module: input.module,
    preferences: input.preferences,
    plan,
    skillProgress,
  };
}
