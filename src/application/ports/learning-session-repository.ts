export interface LearningSessionRepository {
  complete(learnerId: string, sessionId: string, completedAt: string): Promise<void>;
}
