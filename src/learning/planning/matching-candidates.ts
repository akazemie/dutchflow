import type { ExerciseType, LearningSkill } from "@/learning/contracts/module";
import { getExerciseStage, type SkillProgress } from "@/learning/core/progress";
import type { SessionCandidate } from "./session-planner";

export function filterEligibleExerciseTypes(input: {
  supportedTypes: readonly ExerciseType[];
  siblingSkills: readonly LearningSkill[];
  knownSkillIds: readonly string[];
  skillProgress: readonly SkillProgress[];
}): ExerciseType[] {
  if (!input.supportedTypes.includes("matching")) return [...input.supportedTypes];

  const knownSkills = new Set(input.knownSkillIds);
  const progressBySkill = new Map(input.skillProgress.map((progress) => [progress.skillId, progress]));
  const matchingEligible = input.siblingSkills.length > 0 && input.siblingSkills.every(({ skillId }) => {
    const progress = progressBySkill.get(skillId);
    return knownSkills.has(skillId) && getExerciseStage(progress) >= 1;
  });

  return matchingEligible
    ? [...input.supportedTypes]
    : input.supportedTypes.filter((type) => type !== "matching");
}

export function collapseMatchingCandidates(
  candidates: readonly SessionCandidate[],
  skillsByItem: ReadonlyMap<string, readonly LearningSkill[]>,
): SessionCandidate[] {
  const matchingGroups = new Map<string, { anchor: SessionCandidate; skillIds: Set<string> }>();

  for (const candidate of candidates) {
    if (candidate.exerciseType !== "matching") continue;
    const groupId = `${candidate.moduleId}:${candidate.itemId}`;
    if (matchingGroups.has(groupId)) continue;
    matchingGroups.set(groupId, {
      anchor: candidate,
      skillIds: new Set((skillsByItem.get(candidate.itemId) ?? []).map((skill) => skill.skillId)),
    });
  }

  return candidates.filter((candidate) => {
    const group = matchingGroups.get(`${candidate.moduleId}:${candidate.itemId}`);
    return !group || candidate === group.anchor || !group.skillIds.has(candidate.skillId);
  });
}
