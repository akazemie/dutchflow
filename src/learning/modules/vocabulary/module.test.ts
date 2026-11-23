import { describe, expect, it } from "vitest";
import { vocabularyModule } from "./module";

describe("vocabularyModule", () => {
  it("loads A1 words and creates a stable skill-specific exercise", async () => {
    const items = await vocabularyModule.loadItems({ level: "A1" });
    const exercise = await vocabularyModule.createExercise(items[0]!.id, { explanationLanguage: "fa" });

    expect(items.length).toBeGreaterThanOrEqual(50);
    expect(exercise).toMatchObject({
      moduleId: "vocabulary",
      contentId: "vocabulary:boek",
      skillId: "vocabulary:boek:meaning",
      hint: "Boek یعنی کتاب و با حرف تعریف het می‌آید.",
    });
  });

  it("includes available lower-level vocabulary for a higher selected level", async () => {
    const items = await vocabularyModule.loadItems({ level: "B1" });

    expect(items.length).toBeGreaterThanOrEqual(100);
    expect(items.some((item) => item.level === "A2")).toBe(true);
  });

  it("evaluates authored variants through the shared module contract", async () => {
    const exercise = await vocabularyModule.createExercise("vocabulary:appel");
    const result = await vocabularyModule.evaluate(exercise, { type: "typed-answer", value: " Ze eet een appel. " });

    expect(result).toMatchObject({ correct: true, rating: "good", skillIds: ["vocabulary:appel:meaning"] });
  });

  it("uses target words rather than sentence translations for multiple-choice options", async () => {
    const exercise = await vocabularyModule.createExercise("vocabulary:appel", {
      exerciseType: "multiple-choice",
      seed: "word-options",
    });

    expect(exercise.type).toBe("multiple-choice");
    if (exercise.type !== "multiple-choice") throw new Error("Expected a multiple-choice exercise.");
    expect(exercise.options.map((option) => option.text)).toContain("appel");
    expect(exercise.options.map((option) => option.text)).toContain("boek");
    expect(exercise.options.every((option) => !option.text.includes("."))).toBe(true);
  });
});
