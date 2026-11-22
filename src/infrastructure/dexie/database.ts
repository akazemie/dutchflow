import Dexie, { type EntityTable } from "dexie";
import type { ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { LearnerPreferences } from "@/learning/core/preferences";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";

export class DutchFlowDatabase extends Dexie {
  exerciseAttempts!: EntityTable<ExerciseAttempt, "id">;
  learnerPreferences!: EntityTable<LearnerPreferences, "id">;
  skillProgress!: EntityTable<SkillProgress, "id">;
  reviewSchedules!: EntityTable<ReviewSchedule, "id">;

  constructor(name = "dutchflow") {
    super(name);
    this.version(1).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
    });
    this.version(2).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
      learnerPreferences: "id, learnerId, updatedAt",
    });
    this.version(3).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
      learnerPreferences: "id, learnerId, updatedAt",
      skillProgress: "id, learnerId, skillId, moduleId, updatedAt, &[learnerId+skillId]",
      reviewSchedules: "id, learnerId, skillId, moduleId, dueAt, [learnerId+dueAt], &[learnerId+skillId]",
    });
  }
}

