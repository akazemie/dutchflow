import type { ReviewSchedule } from "@/learning/core/progress";

export interface ReviewScheduleRepository {
  get(learnerId: string, skillId: string): Promise<ReviewSchedule | undefined>;
  listDue(learnerId: string, dueAt: string): Promise<ReviewSchedule[]>;
  save(schedule: ReviewSchedule): Promise<void>;
}
