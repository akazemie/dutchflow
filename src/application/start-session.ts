import type { LearningModule } from "@/learning/contracts/module";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { SkillProgress } from "@/learning/core/progress";
import type { LearningSession } from "@/learning/core/session";
import { createExerciseId } from "@/learning/core/create-exercise-id";
import { chooseExerciseType } from "@/learning/exercises/choose-exercise-type";
import { collapseMatchingCandidates, filterEligibleExerciseTypes } from "@/learning/planning/matching-candidates";
import { planSession, type SessionCandidate } from "@/learning/planning/session-planner";

export interface PreparedLearningSession {
  module: LearningModule;
  preferences: LearnerPreferences;
  plan: SessionCandidate[];
  skillProgress: SkillProgress[];
  session: LearningSession;
  effectiveBudgetMinutes: number;
  dailyGoalReached: boolean;
}

function candidateKey(candidate: SessionCandidate): string {
  return `${candidate.moduleId}:${candidate.itemId}:${candidate.skillId}`;
}

export async function startSession(input: {
  learnerId: string;
  module: LearningModule;
  preferences: LearnerPreferences;
  dueReviews: SessionCandidate[];
  minutesSpentToday: number;
  extraSession?: boolean;
  knownSkillIds?: string[];
  skillProgress?: SkillProgress[];
  estimatedMinutesPerExercise?: number;
}, dependencies: {
  now?: () => Date;
  createId?: () => string;
}): Promise<PreparedLearningSession> {
  const items = await input.module.loadItems({ level: input.preferences.level });
  const newItems: SessionCandidate[] = [];
  const estimatedMinutes = input.estimatedMinutesPerExercise ?? 2;
  const remainingMinutes = input.preferences.dailyLearningMinutes - input.minutesSpentToday;
  const dailyGoalReached = !input.extraSession && remainingMinutes < 2;
  const effectiveBudgetMinutes = input.extraSession
    ? 5
    : dailyGoalReached
      ? 0
      : Math.max(0, remainingMinutes);
  const skillProgress = input.skillProgress ?? [];
  const knownSkills = new Set([
    ...(input.knownSkillIds ?? []),
    ...skillProgress.map((progress) => progress.skillId),
  ]);
  const knownSkillIds = [...knownSkills];
  const skillsByItem = new Map(items.map((item) => [item.id, input.module.listSkills(item.id)]));
  const sessionId = (dependencies.createId ?? createExerciseId)();

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
  const sessionSeed = sessionId;
  let candidateIndex = 0;
  const prepareCandidates = (candidates: readonly SessionCandidate[]) => candidates.map((candidate) => {
    const seed = `${sessionSeed}:${candidate.skillId}:${candidateIndex++}`;
    const siblingSkills = skillsByItem.get(candidate.itemId) ?? input.module.listSkills(candidate.itemId);
    const declaredTypes = input.module.supportedExerciseTypes(candidate.itemId, candidate.focusId);
    const supportedTypes = filterEligibleExerciseTypes({
      supportedTypes: declaredTypes,
      siblingSkills,
      knownSkillIds,
      skillProgress,
    });
    const isMatchingAnchor = siblingSkills[0]?.skillId === candidate.skillId;
    const withinTimeBudget = !input.extraSession
      && candidate.estimatedMinutes * 3 <= effectiveBudgetMinutes;
    let availableTypes = supportedTypes.filter((type) =>
      (withinTimeBudget || type !== "matching")
      && (itemsWithMultipleDueSkills.has(candidate.itemId) || type !== "matching")
      && (isMatchingAnchor || type !== "matching"),
    );
    if (availableTypes.length === 0 && declaredTypes.includes("matching")) {
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
    timeBudgetMinutes: effectiveBudgetMinutes,
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
    const remainingBudget = effectiveBudgetMinutes
      - plan.reduce((minutes, candidate) => minutes + candidate.estimatedMinutes, 0);
    if (remainingBudget <= 0) break;

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
      timeBudgetMinutes: remainingBudget,
    });
    if (refill.length === 0) break;
    plan = [...plan, ...refill];
  }

  const plannedSkillIds = [...new Set(plan.flatMap((candidate) =>
    candidate.exerciseType === "matching"
      ? (skillsByItem.get(candidate.itemId) ?? []).map(({ skillId }) => skillId)
      : [candidate.skillId],
  ))];
  const session: LearningSession = {
    id: sessionId,
    learnerId: input.learnerId,
    moduleId: input.module.id,
    startedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    strategy: input.preferences.exerciseStrategy,
    preferences: {
      level: input.preferences.level,
      dailyLearningMinutes: input.preferences.dailyLearningMinutes,
    },
    plannedSkillIds,
    plannedExerciseTypes: plan.map((candidate) => candidate.exerciseType ?? "typed-answer"),
  };
  return {
    module: input.module,
    preferences: input.preferences,
    plan,
    skillProgress,
    session,
    effectiveBudgetMinutes,
    dailyGoalReached,
  };
}
