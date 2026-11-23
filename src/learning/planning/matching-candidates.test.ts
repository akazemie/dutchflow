import { describe, expect, it } from "vitest";
import type { LearningSkill } from "@/learning/contracts/module";
import type { SkillProgress } from "@/learning/core/progress";
import type { SessionCandidate } from "./session-planner";
import { collapseMatchingCandidates, filterEligibleExerciseTypes } from "./matching-candidates";

const skills: LearningSkill[] = [
  { skillId: "verb:lopen:perfectum", focusId: "perfectum" },
  { skillId: "verb:lopen:imperfectum:singular", focusId: "imperfectum-singular" },
  { skillId: "verb:lopen:imperfectum:plural", focusId: "imperfectum-plural" },
];

function progress(skill: LearningSkill, exerciseStage: 0 | 1 | 2): SkillProgress {
  return {
    id: `learner:${skill.skillId}`,
    learnerId: "learner",
    skillId: skill.skillId,
    moduleId: "verbs",
    itemId: "verb:lopen",
    focusId: skill.focusId,
    attempts: 1,
    correctAttempts: 1,
    consecutiveCorrect: 1,
    exerciseStage,
    lastReviewedAt: "2026-11-23T12:00:00.000Z",
    createdAt: "2026-11-23T12:00:00.000Z",
    updatedAt: "2026-11-23T12:00:00.000Z",
  };
}

function candidate(skill: LearningSkill, exerciseType: SessionCandidate["exerciseType"]): SessionCandidate {
  return {
    skillId: skill.skillId,
    moduleId: "verbs",
    itemId: "verb:lopen",
    focusId: skill.focusId,
    estimatedMinutes: 2,
    exerciseType,
  };
}

describe("matching candidate planning", () => {
  it("only exposes matching when all three skills are known and at stage one or above", () => {
    const supportedTypes = ["typed-answer", "matching"] as const;
    const knownSkillIds = skills.map((skill) => skill.skillId);

    expect(filterEligibleExerciseTypes({
      supportedTypes,
      siblingSkills: skills,
      knownSkillIds,
      skillProgress: skills.map((skill) => progress(skill, 0)),
    })).toEqual(["typed-answer"]);

    expect(filterEligibleExerciseTypes({
      supportedTypes,
      siblingSkills: skills,
      knownSkillIds: knownSkillIds.slice(0, 2),
      skillProgress: skills.map((skill) => progress(skill, 1)),
    })).toEqual(["typed-answer"]);

    expect(filterEligibleExerciseTypes({
      supportedTypes,
      siblingSkills: skills,
      knownSkillIds,
      skillProgress: skills.map((skill) => progress(skill, 1)),
    })).toEqual(["typed-answer", "matching"]);
  });

  it("replaces a matching item's other planned facet candidates with the matching candidate", () => {
    const matching = candidate(skills[0]!, "matching");
    const dueSibling = candidate(skills[1]!, "typed-answer");
    const practiceSibling = candidate(skills[2]!, "fill-gap");
    const unrelated = {
      ...candidate(skills[0]!, "typed-answer"),
      itemId: "verb:werken",
      skillId: "verb:werken:perfectum",
    };

    expect(collapseMatchingCandidates(
      [dueSibling, matching, practiceSibling, unrelated],
      new Map([["verb:lopen", skills], ["verb:werken", [{ skillId: unrelated.skillId, focusId: "perfectum" }]]]),
    )).toEqual([matching, unrelated]);
  });
});
