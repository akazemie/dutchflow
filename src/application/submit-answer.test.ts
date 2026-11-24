import { describe, expect, it } from "vitest";
import type { ExerciseAttempt } from "./ports/attempt-repository";
import type { AnswerRecorder } from "./ports/answer-recorder";
import type { LearningSession } from "@/learning/core/session";
import { message } from "@/learning/contracts/message";
import { submitAnswer } from "./submit-answer";
import { verbsModule } from "@/learning/modules/verbs/module";
import type { SkillProgress, ReviewSchedule } from "@/learning/core/progress";
import { createFsrsReviewScheduler } from "@/learning/scheduling/review-scheduler";
import type { LearningModule } from "@/learning/contracts/module";

function inMemoryRecorder(
  saved: ExerciseAttempt[],
  progress: Map<string, SkillProgress>,
  schedules: Map<string, ReviewSchedule>,
): AnswerRecorder {
  return {
    async record({ attempt, skillUpdates }) {
      saved.push(attempt);
      for (const update of skillUpdates) {
        const key = `${update.learnerId}:${update.skillId}`;
        const records = update.buildRecords(progress.get(key), schedules.get(key));
        progress.set(records.progress.id, records.progress);
        schedules.set(records.schedule.id, records.schedule);
      }
    },
  };
}

function learningSession(learnerId: string): LearningSession {
  return {
    id: "session-1",
    learnerId,
    moduleId: "verbs",
    startedAt: "2026-11-22T11:00:00.000Z",
    strategy: "balanced",
    preferences: { level: "A1", dailyLearningMinutes: 10 },
    plannedSkillIds: ["verb:lopen:perfectum"],
    plannedExerciseTypes: ["typed-answer"],
  };
}

describe("submitAnswer", () => {
  it("evaluates and saves an attempt with learner and skill identifiers", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");
    const saved: ExerciseAttempt[] = [];
    const progress = new Map<string, SkillProgress>();
    const schedules = new Map<string, ReviewSchedule>();

    const { result, attempt } = await submitAnswer(
      {
        learnerId: "00000000-0000-4000-8000-000000000001",
        session: learningSession("00000000-0000-4000-8000-000000000001"),
        module: verbsModule,
        exercise,
        answer: { type: "typed-answer", value: "Ik heb gelopen." },
        durationMs: 1200,
      },
      {
        answerRecorder: inMemoryRecorder(saved, progress, schedules),
        scheduler: createFsrsReviewScheduler(),
        now: () => new Date("2026-11-22T12:00:00.000Z"),
        createId: () => "attempt-1",
      },
    );

    expect(result.rating).toBe("good");
    expect(attempt).toMatchObject({
      id: "attempt-1",
      learnerId: "00000000-0000-4000-8000-000000000001",
      skillId: "verb:lopen:perfectum",
      skillIds: ["verb:lopen:perfectum"],
      sessionId: "session-1",
      durationMs: 1200,
      correct: true,
    });
    expect(saved).toEqual([attempt]);
    expect(progress.get("00000000-0000-4000-8000-000000000001:verb:lopen:perfectum")).toMatchObject({
      attempts: 1,
      correctAttempts: 1,
      consecutiveCorrect: 1,
      exerciseStage: 1,
      skillId: "verb:lopen:perfectum",
    });
    expect(schedules.get("00000000-0000-4000-8000-000000000001:verb:lopen:perfectum")).toMatchObject({
      scheduler: "ts-fsrs@5.4.2/fsrs-6",
      skillId: "verb:lopen:perfectum",
      card: { reps: 1, last_review: "2026-11-22T12:00:00.000Z" },
    });
  });

  it("updates progress and schedules independently for every skill result", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");
    const learnerId = "00000000-0000-4000-8000-000000000001";
    const firstSkill = "verb:lopen:perfectum";
    const secondSkill = "verb:lopen:imperfectum:plural";
    const saved: ExerciseAttempt[] = [];
    const progress = new Map<string, SkillProgress>();
    const schedules = new Map<string, ReviewSchedule>();
    const moduleWithResults: LearningModule = {
      ...verbsModule,
      async evaluate() {
        return {
          correct: false,
          feedback: message("evaluation.expected", { expected: "answer" }),
          score: 0.5,
          expected: [],
          rating: "hard",
          skillIds: [firstSkill, secondSkill],
          skillResults: [
            { skillId: firstSkill, correct: true, rating: "good" },
            { skillId: secondSkill, correct: false, rating: "again" },
          ],
        };
      },
    };

    await submitAnswer(
      {
        learnerId,
        module: moduleWithResults,
        exercise,
        answer: { type: "typed-answer", value: "answer" },
        session: learningSession(learnerId),
      },
      {
        answerRecorder: inMemoryRecorder(saved, progress, schedules),
        scheduler: createFsrsReviewScheduler(),
        now: () => new Date("2026-11-22T12:00:00.000Z"),
        createId: () => "attempt-multi",
      },
    );

    expect(saved[0]?.skillId).toBe(firstSkill);
    expect(progress.get(`${learnerId}:${firstSkill}`)).toMatchObject({
      attempts: 1,
      correctAttempts: 1,
      consecutiveCorrect: 1,
      exerciseStage: 1,
    });
    expect(progress.get(`${learnerId}:${secondSkill}`)).toMatchObject({
      attempts: 1,
      correctAttempts: 0,
      consecutiveCorrect: 0,
      exerciseStage: 0,
      focusId: "imperfectum-plural",
    });
    expect(schedules.has(`${learnerId}:${firstSkill}`)).toBe(true);
    expect(schedules.get(`${learnerId}:${secondSkill}`)).toMatchObject({
      focusId: "imperfectum-plural",
    });
  });
});
