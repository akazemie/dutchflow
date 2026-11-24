import type { AttemptRepository } from "@/application/ports/attempt-repository";
import type { PreferencesRepository } from "@/application/ports/preferences-repository";
import type { ProgressRepository } from "@/application/ports/progress-repository";
import type { ReviewScheduleRepository } from "@/application/ports/review-schedule-repository";
import type { LearningModule } from "@/learning/contracts/module";
import { getPreferences } from "./get-preferences";
import { startSession, type PreparedLearningSession } from "./start-session";

export interface CreateLearningSessionOptions {
  extraSession?: boolean;
}

interface CreateLearningSessionDependencies {
  attempts: AttemptRepository;
  loadModule: (moduleId: string) => Promise<LearningModule>;
  preferences: PreferencesRepository;
  progress: ProgressRepository;
  reviewSchedules: ReviewScheduleRepository;
  now?: () => Date;
  createId?: () => string;
}

export async function createLearningSession(
  learnerId: string,
  moduleId: string,
  dependencies: CreateLearningSessionDependencies,
  options: CreateLearningSessionOptions = {},
): Promise<PreparedLearningSession> {
  const now = (dependencies.now ?? (() => new Date()))();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const [module, preferences, progress, dueSchedules, attempts] = await Promise.all([
    dependencies.loadModule(moduleId),
    getPreferences(learnerId, { preferences: dependencies.preferences, now: () => now }),
    dependencies.progress.listByLearner(learnerId),
    dependencies.reviewSchedules.listDue(learnerId, now.toISOString()),
    dependencies.attempts.listSince(learnerId, localMidnight),
  ]);
  const minutesSpentToday = attempts.reduce(
    (minutes, attempt) => minutes + (attempt.durationMs ?? 0) / 60_000,
    0,
  );

  return startSession({
    learnerId,
    module,
    preferences,
    minutesSpentToday,
    extraSession: options.extraSession,
    knownSkillIds: progress
      .filter((record) => record.moduleId === moduleId)
      .map((record) => record.skillId),
    skillProgress: progress.filter((record) => record.moduleId === moduleId),
    dueReviews: dueSchedules
      .filter((schedule) => schedule.moduleId === moduleId)
      .map((schedule) => ({
        skillId: schedule.skillId,
        moduleId: schedule.moduleId,
        itemId: schedule.itemId,
        focusId: schedule.focusId,
        estimatedMinutes: 2,
      })),
  }, {
    now: () => now,
    createId: dependencies.createId,
  });
}
