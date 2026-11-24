import type { LearningSession } from "@/learning/core/session";

export interface LearningSessionRepository {
  save(session: LearningSession): Promise<void>;
  complete(learnerId: string, sessionId: string, completedAt: string): Promise<void>;
}
