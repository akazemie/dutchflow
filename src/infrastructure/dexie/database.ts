import Dexie, { type EntityTable } from "dexie";
import type { ExerciseAttempt } from "@/application/ports/attempt-repository";
import type { LearnerPreferences } from "@/learning/core/preferences";

export class DutchFlowDatabase extends Dexie {
  exerciseAttempts!: EntityTable<ExerciseAttempt, "id">;
  learnerPreferences!: EntityTable<LearnerPreferences, "id">;

  constructor(name = "dutchflow") {
    super(name);
    this.version(1).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
    });
    this.version(2).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
      learnerPreferences: "id, learnerId, updatedAt",
    });
  }
}

