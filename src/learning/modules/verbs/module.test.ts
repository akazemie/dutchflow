import { describe, expect, it } from "vitest";
import { verbsModule } from "./module";

describe("Dutch verb exercise evaluation", () => {
  it("accepts case and punctuation variants and assigns a good rating", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");

    await expect(verbsModule.evaluate(exercise, "ik heb gelopen")).resolves.toMatchObject({
      correct: true,
      rating: "good",
      skillIds: ["verb:lopen:perfectum"],
    });
  });

  it("returns an again rating for an incorrect answer", async () => {
    const exercise = await verbsModule.createExercise("verb:lopen");

    await expect(verbsModule.evaluate(exercise, "Ik ben looped.")).resolves.toMatchObject({
      correct: false,
      rating: "again",
    });
  });

  it("creates distinct skill IDs for Perfectum and Imperfectum facets", async () => {
    const perfectum = await verbsModule.createExercise("verb:werken", { focusId: "perfectum" });
    const imperfectum = await verbsModule.createExercise("verb:werken", { focusId: "imperfectum-plural" });

    expect(perfectum.skillId).toBe("verb:werken:perfectum");
    expect(imperfectum.skillId).toBe("verb:werken:imperfectum:plural");
    expect(imperfectum.acceptedAnswers).toContain("Wij werkten.");
  });

  it("accepts both we and wij for the plural imperfectum example", async () => {
    const exercise = await verbsModule.createExercise("verb:wonen", { focusId: "imperfectum-plural" });

    expect(exercise.acceptedAnswers).toContain("Wij woonden in Brussel.");
    expect(exercise.acceptedAnswers).toContain("We woonden in Brussel.");
    await expect(verbsModule.evaluate(exercise, "we woonden in brussel")).resolves.toMatchObject({
      correct: true,
      rating: "good",
      skillIds: ["verb:wonen:imperfectum:plural"],
    });
  });

  it("accepts the we pronoun for the fietsen plural imperfectum example", async () => {
    const exercise = await verbsModule.createExercise("verb:fietsen", { focusId: "imperfectum-plural" });

    expect(exercise.acceptedAnswers).toContain("Wij fietsten naar het werk.");
    expect(exercise.acceptedAnswers).toContain("We fietsten naar het werk.");
    await expect(verbsModule.evaluate(exercise, "we fietsten naar het werk")).resolves.toMatchObject({
      correct: true,
      rating: "good",
    });
  });

  it("keeps separable and auxiliary variants as accepted answers", async () => {
    const separable = await verbsModule.createExercise("verb:opbellen", { focusId: "perfectum" });
    const bothAuxiliaries = await verbsModule.createExercise("verb:lopen", { focusId: "perfectum" });

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
