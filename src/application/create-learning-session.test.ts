import { describe, expect, it, vi } from "vitest";
import type { AttemptRepository, ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { PreferencesRepository } from "@/application/ports/preferences-repository";
import type { ProgressRepository } from "@/application/ports/progress-repository";
import type { ReviewScheduleRepository } from "@/application/ports/review-schedule-repository";
import { DEFAULT_PREFERENCE_VALUES, type LearnerPreferences } from "@/learning/core/preferences";
import type { ReviewSchedule } from "@/learning/core/progress";
import { KNOWN_SCHEDULER_IDS } from "@/learning/scheduling/scheduler-identifiers";
import { verbsModule } from "@/learning/modules/verbs/module";
import { createLearningSession } from "./create-learning-session";

const learnerId = "learner-budget-test";
const now = new Date(2026, 10, 24, 12, 0, 0);

function preferencesRepository(dailyLearningMinutes = 10): PreferencesRepository {
  const preferences: LearnerPreferences = {
    id: learnerId,
    learnerId,
    ...DEFAULT_PREFERENCE_VALUES,
    dailyLearningMinutes,
    updatedAt: now.toISOString(),
  };
  return {
    async getByLearnerId() { return preferences; },
    async save() {},
  };
}

const progressRepository: ProgressRepository = {
  async get() { return undefined; },
  async listByLearner() { return []; },
  async save() {},
};

function reviewSchedule(itemId: string, skillId: string, focusId: string): ReviewSchedule {
  return {
    id: `${learnerId}:${skillId}`,
    learnerId,
    skillId,
    moduleId: "verbs",
    itemId,
    focusId,
    scheduler: KNOWN_SCHEDULER_IDS[0],
    card: {
      due: now.toISOString(),
      stability: 1,
      difficulty: 5,
      elapsed_days: 1,
      scheduled_days: 1,
      learning_steps: 0,
      reps: 1,
      lapses: 0,
      state: 2,
      last_review: now.toISOString(),
    },
    dueAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function attempt(id: string, createdAt: string, durationMs?: number): ExerciseAttempt {
  return {
    id,
    learnerId,
    skillId: "verb:lopen:perfectum",
    skillIds: ["verb:lopen:perfectum"],
    sessionId: null,
    contentId: "verb:lopen",
    moduleId: "verbs",
    exerciseType: "typed-answer",
    answer: { type: "typed-answer", value: "Ik heb gelopen." },
    correct: true,
    rating: "good",
    durationMs,
    createdAt,
    updatedAt: createdAt,
  };
}

function dependencies(input: {
  attempts?: ExerciseAttempt[];
  dueSchedules?: ReviewSchedule[];
  dailyLearningMinutes?: number;
}) {
  const listSince = vi.fn(async () => input.attempts ?? []);
  const attempts: AttemptRepository = {
    async listByLearner() { return input.attempts ?? []; },
    listSince,
  };
  const reviewSchedules: ReviewScheduleRepository = {
    async get() { return undefined; },
    async listDue() { return input.dueSchedules ?? []; },
    async save() {},
  };
  return {
    listSince,
    dependencies: {
      attempts,
      loadModule: async () => verbsModule,
      preferences: preferencesRepository(input.dailyLearningMinutes),
      progress: progressRepository,
      reviewSchedules,
      now: () => now,
      createId: () => "session-budget-test",
    },
  };
}

describe("createLearningSession", () => {
  it("uses attempts since local midnight and treats missing legacy duration as zero", async () => {
    const records = [
      attempt("two-minutes", now.toISOString(), 120_000),
      attempt("legacy-no-duration", now.toISOString()),
    ];
    const fixture = dependencies({ attempts: records });

    const prepared = await createLearningSession(
      learnerId,
      "verbs",
      fixture.dependencies,
    );

    expect(fixture.listSince).toHaveBeenCalledWith(
      learnerId,
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
    );
    expect(prepared.effectiveBudgetMinutes).toBe(8);
    expect(prepared.dailyGoalReached).toBe(false);
  });

  it("maps due schedules into candidates for the selected module", async () => {
    const matchingModuleSchedule = reviewSchedule("verb:lopen", "verb:lopen:perfectum", "perfectum");
    const otherModuleSchedule = {
      ...matchingModuleSchedule,
      id: `${learnerId}:other:skill`,
      moduleId: "vocabulary",
    };
    const fixture = dependencies({
      dueSchedules: [matchingModuleSchedule, otherModuleSchedule],
    });

    const prepared = await createLearningSession(
      learnerId,
      "verbs",
      fixture.dependencies,
    );

    expect(prepared.plan).toContainEqual(expect.objectContaining({
      moduleId: "verbs",
      itemId: "verb:lopen",
      skillId: "verb:lopen:perfectum",
      focusId: "perfectum",
      estimatedMinutes: 2,
    }));
    expect(prepared.plan).not.toContainEqual(expect.objectContaining({ moduleId: "vocabulary" }));
  });
});
