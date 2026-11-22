import type { SkillProgress } from "@/learning/core/progress";

export interface ProgressRepository {
  get(learnerId: string, skillId: string): Promise<SkillProgress | undefined>;
  listByLearner(learnerId: string): Promise<SkillProgress[]>;
  save(progress: SkillProgress): Promise<void>;
}
