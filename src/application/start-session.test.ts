import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCE_VALUES, type LearnerPreferences } from "@/learning/core/preferences";
import type { SkillProgress } from "@/learning/core/progress";
import type { LearningItem, LearningModule } from "@/learning/contracts/module";
import { verbsModule } from "@/learning/modules/verbs/module";
import { startSession } from "./start-session";

function matchingPlannerFixture() {
  const otherItems: LearningItem[] = Array.from({ length: 4 }, (_, index) => ({
    id: `item:due-${index + 1}`,
    moduleId: "verbs",
    displayName: `due ${index + 1}`,
    contentVersion: 3,
    level: "A1",
  }));
  const items: LearningItem[] = [
    { id: "verb:lopen", moduleId: "verbs", displayName: "lopen", contentVersion: 3, level: "A1" },
    ...otherItems,
  ];
  const plannerModule: LearningModule = {
    ...verbsModule,
    async loadItems() { return items; },
    listSkills(itemId) {
      if (itemId === "verb:lopen") return verbsModule.listSkills(itemId);
      return [{ skillId: `${itemId}:meaning`, focusId: "meaning" }];
    },
    supportedExerciseTypes(itemId, focusId) {
      return itemId === "verb:lopen" && focusId === "perfectum"
        ? ["matching"]
        : ["typed-answer"];
    },
  };
  const verbSkills = plannerModule.listSkills("verb:lopen");
  const otherDueReviews = otherItems.map((item) => ({
    skillId: `${item.id}:meaning`,
    moduleId: "verbs",
    itemId: item.id,
    focusId: "meaning",
    estimatedMinutes: 2,
  }));
  const verbDueReviews = verbSkills.map((skill) => ({
    skillId: skill.skillId,
    moduleId: "verbs",
    itemId: "verb:lopen",
    focusId: skill.focusId,
    estimatedMinutes: 2,
  }));
  const skills = [...verbSkills, ...otherDueReviews.map(({ skillId, focusId }) => ({ skillId, focusId }))];
  const skillProgress: SkillProgress[] = skills.map((skill) => ({
    id: `learner:${skill.skillId}`,
    learnerId: "learner",
    skillId: skill.skillId,
    moduleId: "verbs",
    itemId: skill.skillId.startsWith("verb:") ? "verb:lopen" : skill.skillId.replace(/:meaning$/u, ""),
    focusId: skill.focusId,
    attempts: 2,
    correctAttempts: 2,
    consecutiveCorrect: 2,
    exerciseStage: 2,
    lastReviewedAt: "2026-11-23T12:00:00.000Z",
    createdAt: "2026-11-22T12:00:00.000Z",
    updatedAt: "2026-11-23T12:00:00.000Z",
  }));

  return {
    module: plannerModule,
    knownSkillIds: skills.map((skill) => skill.skillId),
    skillProgress,
    otherDueReviews,
    verbDueReviews,
  };
}

function matchingFacetsFixture(verbCount: number) {
  const items: LearningItem[] = Array.from({ length: verbCount }, (_, index) => ({
    id: `verb:matching-${index + 1}`,
    moduleId: "verbs",
    displayName: `matching ${index + 1}`,
    contentVersion: 3,
    level: "A1",
  }));
  const skillsByItem = new Map(items.map(({ id }) => [id, [
    { skillId: `${id}:perfectum`, focusId: "perfectum" },
    { skillId: `${id}:imperfectum:singular`, focusId: "imperfectum-singular" },
    { skillId: `${id}:imperfectum:plural`, focusId: "imperfectum-plural" },
  ]]));
  const plannerModule: LearningModule = {
    ...verbsModule,
    async loadItems() { return items; },
    listSkills(itemId) { return skillsByItem.get(itemId) ?? []; },
    supportedExerciseTypes(_itemId, focusId) {
      return focusId === "perfectum" ? ["matching"] : ["typed-answer"];
    },
  };
  const skillProgress: SkillProgress[] = [...skillsByItem.entries()].flatMap(([itemId, skills]) =>
    skills.map((skill) => ({
      id: `learner:${skill.skillId}`,
      learnerId: "learner",
      skillId: skill.skillId,
      moduleId: "verbs",
      itemId,
      focusId: skill.focusId,
      attempts: 2,
      correctAttempts: 2,
      consecutiveCorrect: 2,
      exerciseStage: 2,
      lastReviewedAt: "2026-11-23T12:00:00.000Z",
      createdAt: "2026-11-22T12:00:00.000Z",
      updatedAt: "2026-11-23T12:00:00.000Z",
    })),
  );
  const dueReviews = (itemId: string) => (skillsByItem.get(itemId) ?? []).map((skill) => ({
    ...skill,
    moduleId: "verbs",
    itemId,
    estimatedMinutes: 2,
  }));

  return {
    module: plannerModule,
    items,
    skillsByItem,
    skillProgress,
    knownSkillIds: skillProgress.map(({ skillId }) => skillId),
    dueReviews,
  };
}

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

  it("retains verb facets when matching is not selected after other due reviews", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 10,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const fixture = matchingPlannerFixture();

    const session = await startSession({
      module: fixture.module,
      preferences,
      dueReviews: [...fixture.otherDueReviews, ...fixture.verbDueReviews],
      knownSkillIds: fixture.knownSkillIds,
      skillProgress: fixture.skillProgress,
    });

    expect(session.plan.filter((candidate) => candidate.itemId === "verb:lopen")).not.toHaveLength(0);
    expect(session.plan.every((candidate) => candidate.estimatedMinutes === 2)).toBe(true);
  });

  it("removes covered facets only for a planned match and refills the freed time", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 10,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const fixture = matchingPlannerFixture();

    const session = await startSession({
      module: fixture.module,
      preferences,
      dueReviews: [...fixture.verbDueReviews, ...fixture.otherDueReviews],
      knownSkillIds: fixture.knownSkillIds,
      skillProgress: fixture.skillProgress,
    });

    expect(session.plan).toHaveLength(3);
    expect(session.plan[0]).toMatchObject({
      itemId: "verb:lopen",
      exerciseType: "matching",
      estimatedMinutes: 6,
    });
    expect(session.plan.filter((candidate) => candidate.itemId.startsWith("item:due-"))).toHaveLength(2);
    expect(session.plan.reduce((minutes, candidate) => minutes + candidate.estimatedMinutes, 0)).toBe(10);
    expect(session.plan.some((candidate) =>
      candidate.itemId === "verb:lopen" && candidate.exerciseType !== "matching",
    )).toBe(false);
  });

  it("does not plan matching when six verbs each have only one due facet", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 10,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const fixture = matchingFacetsFixture(6);
    const dueReviews = fixture.items.map(({ id }) => fixture.dueReviews(id)[0]!);

    const session = await startSession({
      module: fixture.module,
      preferences,
      dueReviews,
      knownSkillIds: fixture.knownSkillIds,
      skillProgress: fixture.skillProgress,
    });

    expect(session.plan).not.toContainEqual(expect.objectContaining({ exerciseType: "matching" }));
    expect(session.plan).toHaveLength(5);
  });

  it("plans matching when all three facets of one verb are due and collapses its siblings", async () => {
    const preferences: LearnerPreferences = {
      id: "00000000-0000-4000-8000-000000000001",
      learnerId: "00000000-0000-4000-8000-000000000001",
      ...DEFAULT_PREFERENCE_VALUES,
      dailyLearningMinutes: 10,
      updatedAt: "2026-11-22T12:00:00.000Z",
    };
    const fixture = matchingFacetsFixture(1);
    const itemId = fixture.items[0]!.id;

    const session = await startSession({
      module: fixture.module,
      preferences,
      dueReviews: fixture.dueReviews(itemId),
      knownSkillIds: fixture.knownSkillIds,
      skillProgress: fixture.skillProgress,
    });

    expect(session.plan).toEqual([
      expect.objectContaining({ itemId, exerciseType: "matching", estimatedMinutes: 6 }),
    ]);
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
