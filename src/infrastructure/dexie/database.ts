import Dexie, { type EntityTable } from "dexie";
import type { ExerciseAttempt } from "@/application/ports/attempt-repository";

export class DutchFlowDatabase extends Dexie {
  exerciseAttempts!: EntityTable<ExerciseAttempt, "id">;

  constructor(name = "dutchflow") {
    super(name);
    this.version(1).stores({
      exerciseAttempts: "id, learnerId, skillId, contentId, moduleId, createdAt, updatedAt",
    });
  }
}

