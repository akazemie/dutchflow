import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCE_VALUES, type LearnerPreferences } from "@/learning/core/preferences";
import type { SkillProgress } from "@/learning/core/progress";
import type { LearningModule } from "@/learning/contracts/module";
import { verbsModule } from "@/learning/modules/verbs/module";
import { startSession } from "./start-session";

describe("startSession", () => {
  it("includes lower-level items when preparing a higher-level session", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      level: "A2",
      dailyLearningMinutes: 4,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };

    const session = await startSession({ module: verbsModule, preferences, dueReviews: [] });

    expect(session.plan).toHaveLength(2);
    expect(session.plan.every(({ itemId }) => itemId === "verb:lopen")).toBe(true);
    expect(session.module.id).toBe("verbs");
  });

  it("offers known skills as extra practice when new work and due reviews are absent", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 60,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const allA1Items = await verbsModule.loadItems({ level: "A1" });
    const knownSkillIds = allA1Items.flatMap((item) =>
      verbsModule.listSkills(item.id).map((skill) => skill.skillId),
    );
    const session = await startSession({
      module: verbsModule,
      preferences,
      dueReviews: [],
      knownSkillIds,
    });

    expect(session.plan.map(({ skillId }) => skillId)).toContain("verb:lopen:perfectum");
    expect(session.plan).toHaveLength(30);
  });

  it("uses listSkills instead of creating an exercise for every item and focus", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 5,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const createExercise = vi.spyOn(verbsModule, "createExercise");

    await startSession({ module: verbsModule, preferences, dueReviews: [] });

    expect(createExercise).not.toHaveBeenCalled();
    expect(verbsModule.listSkills("verb:werken")).toEqual([
      { skillId: "verb:werken:perfectum", focusId: "perfectum" },
      { skillId: "verb:werken:imperfectum:singular", focusId: "imperfectum-singular" },
      { skillId: "verb:werken:imperfectum:plural", focusId: "imperfectum-plural" },
    ]);
    createExercise.mockRestore();
  });

  it("plans one matching exercise at triple skill time and removes covered facets", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 10,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const matchingModule: LearningModule = {
      ...verbsModule,
      async loadItems() {
        return [{ id: "verb:lopen", moduleId: "verbs", displayName: "lopen", contentVersion: 3, level: "A1" }];
      },
      supportedExerciseTypes() {
        return ["matching"];
      },
    };
    const skills = matchingModule.listSkills("verb:lopen");
    const skillProgress: SkillProgress[] = skills.map((skill) => ({
      id: `learner:${skill.skillId}`,
      learnerId: "learner",
      skillId: skill.skillId,
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: skill.focusId,
      attempts: 2,
      correctAttempts: 2,
      consecutiveCorrect: 2,
      exerciseStage: 2,
      lastReviewedAt: "2026-11-23T12:00:00.000Z",
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-23T12:00:00.000Z",
    }));
    const dueReviews = skills.map((skill) => ({
      skillId: skill.skillId,
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: skill.focusId,
      estimatedMinutes: 2,
    }));

    const session = await startSession({
      module: matchingModule,
      preferences,
      dueReviews,
      knownSkillIds: skills.map((skill) => skill.skillId),
      skillProgress,
    });

    expect(session.plan).toHaveLength(1);
    expect(session.plan[0]).toMatchObject({
      itemId: "verb:lopen",
      exerciseType: "matching",
      estimatedMinutes: 6,
    });
  });

  it("does not offer matching when its triple estimate exceeds the daily budget", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 5,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const matchingModule: LearningModule = {
      ...verbsModule,
      async loadItems() {
        return [{ id: "verb:lopen", moduleId: "verbs", displayName: "lopen", contentVersion: 3, level: "A1" }];
      },
      supportedExerciseTypes() {
        return ["typed-answer", "matching"];
      },
    };
    const skills = matchingModule.listSkills("verb:lopen");
    const skillProgress: SkillProgress[] = skills.map((skill) => ({
      id: `learner:${skill.skillId}`,
      learnerId: "learner",
      skillId: skill.skillId,
      moduleId: "verbs",
      itemId: "verb:lopen",
      focusId: skill.focusId,
      attempts: 2,
      correctAttempts: 2,
      consecutiveCorrect: 2,
      exerciseStage: 2,
      lastReviewedAt: "2026-11-23T12:00:00.000Z",
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-23T12:00:00.000Z",
    }));

    const session = await startSession({
      module: matchingModule,
      preferences,
      dueReviews: skills.map((skill) => ({
        skillId: skill.skillId,
        moduleId: "verbs",
        itemId: "verb:lopen",
        focusId: skill.focusId,
        estimatedMinutes: 2,
      })),
      knownSkillIds: skills.map((skill) => skill.skillId),
      skillProgress,
    });

    expect(session.plan.length).toBeGreaterThan(0);
    expect(session.plan.every((candidate) =>
      candidate.exerciseType === "typed-answer" && candidate.estimatedMinutes === 2,
    )).toBe(true);
  });
});
