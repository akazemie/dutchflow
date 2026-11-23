import { describe, expect, it } from "vitest";
import type { LearningExercise, TypedAnswerExercise } from "@/learning/contracts/module";
import { verbsModule } from "./module";

function assertTypedAnswer(exercise: LearningExercise): asserts exercise is TypedAnswerExercise {
  if (exercise.type !== "typed-answer") throw new Error(`Expected typed-answer, received ${exercise.type}.`);
}

describe("Dutch verb exercise evaluation", () => {
  it("includes available lower-level content for a higher selected level", async () => {
    const items = await verbsModule.loadItems({ level: "B1" });

    expect(items.length).toBeGreaterThanOrEqual(100);
    expect(items.some((item) => item.id === "verb:lopen" && item.level === "A1")).toBe(true);
    expect(items.some((item) => item.id === "verb:bezoeken" && item.level === "A2")).toBe(true);
  });

  it("accepts case and punctuation variants and assigns a good rating", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");

    await expect(verbsModule.evaluate(exercise, { type: "typed-answer", value: "ik heb gelopen" })).resolves.toMatchObject({
      correct: true,
      rating: "good",
      skillIds: ["verb:lopen:perfectum"],
    });
  });

  it("returns an again rating for an incorrect answer", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");

    await expect(verbsModule.evaluate(exercise, { type: "typed-answer", value: "Ik ben looped." })).resolves.toMatchObject({
      correct: false,
      rating: "again",
    });
  });

  it.each([
    {
      name: "singular imperfectum",
      itemId: "verb:werken",
      focusId: "imperfectum-singular",
      answer: "Ik werkten.",
    },
    {
      name: "perfectum participle",
      itemId: "verb:werken",
      focusId: "perfectum",
      answer: "Ik heb gewerkd.",
    },
    {
      name: "perfectum participle for antwoorden",
      itemId: "verb:antwoorden",
      focusId: "perfectum",
      answer: "Ik heb de vraag beantwoort.",
    },
  ])("does not tolerate one-edit typos for $name", async ({ itemId, focusId, answer }) => {
    const exercise = await verbsModule.createExercise(itemId, { focusId });

    expect(exercise.typoTolerance).toBe("none");
    await expect(verbsModule.evaluate(exercise, { type: "typed-answer", value: answer })).resolves.toMatchObject({
      correct: false,
      score: 0,
      rating: "again",
    });
  });

  it("creates distinct skill IDs for Perfectum and Imperfectum facets", async () => {
    const perfectum = await verbsModule.createExercise("verb:werken", { focusId: "perfectum" });
    const imperfectum = await verbsModule.createExercise("verb:werken", { focusId: "imperfectum-plural" });
    assertTypedAnswer(perfectum);
    assertTypedAnswer(imperfectum);

    expect(perfectum.skillId).toBe("verb:werken:perfectum");
    expect(imperfectum.skillId).toBe("verb:werken:imperfectum:plural");
    expect(imperfectum.acceptedAnswers).toContain("Wij werkten.");
  });

  it("accepts both we and wij for the plural imperfectum example", async () => {
    const exercise = await verbsModule.createExercise("verb:wonen", { focusId: "imperfectum-plural" });
    assertTypedAnswer(exercise);

    expect(exercise.acceptedAnswers).toContain("Wij woonden in Brussel.");
    expect(exercise.acceptedAnswers).toContain("We woonden in Brussel.");
    await expect(verbsModule.evaluate(exercise, { type: "typed-answer", value: "we woonden in brussel" })).resolves.toMatchObject({
      correct: true,
      rating: "good",
      skillIds: ["verb:wonen:imperfectum:plural"],
    });
  });

  it("accepts the we pronoun for the fietsen plural imperfectum example", async () => {
    const exercise = await verbsModule.createExercise("verb:fietsen", { focusId: "imperfectum-plural" });
    assertTypedAnswer(exercise);

    expect(exercise.acceptedAnswers).toContain("Wij fietsten naar het werk.");
    expect(exercise.acceptedAnswers).toContain("We fietsten naar het werk.");
    await expect(verbsModule.evaluate(exercise, { type: "typed-answer", value: "we fietsten naar het werk" })).resolves.toMatchObject({
      correct: true,
      rating: "good",
    });
  });

  it("keeps separable and auxiliary variants as accepted answers", async () => {
    const separable = await verbsModule.createExercise("verb:opbellen", { focusId: "perfectum" });
    const bothAuxiliaries = await verbsModule.createExercise("verb:lopen", { focusId: "perfectum" });
    assertTypedAnswer(separable);
    assertTypedAnswer(bothAuxiliaries);

    expect(separable.acceptedAnswers).toContain("Ik heb hem opgebeld.");
    expect(bothAuxiliaries.acceptedAnswers).toContain("Ik ben gelopen.");
  });

  it("uses the learner's explanation language", async () => {
    const exercise = await verbsModule.createExercise("verb:werken", {
      focusId: "perfectum",
      explanationLanguage: "nl",
    });

    expect(exercise.hint).toContain("Het werkwoord werken");
  });
});
