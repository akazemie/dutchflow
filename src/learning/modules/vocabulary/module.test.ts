import { describe, expect, it } from "vitest";
import { vocabularyModule } from "./module";

describe("vocabularyModule", () => {
  it("loads A1 words and creates a stable skill-specific exercise", async () => {
    const items = await vocabularyModule.loadItems({ level: "A1" });
    const exercise = await vocabularyModule.createExercise(items[0]!.id, { explanationLanguage: "fa" });

    expect(items).toHaveLength(3);
    expect(exercise).toMatchObject({
      moduleId: "vocabulary",
      contentId: "vocabulary:boek",
      skillId: "vocabulary:boek:meaning",
      hint: "Boek یعنی کتاب و با حرف تعریف het می‌آید.",
    });
  });

  it("evaluates authored variants through the shared module contract", async () => {
    const exercise = await vocabularyModule.createExercise("vocabulary:appel");
    const result = await vocabularyModule.evaluate(exercise, " Ze eet een appel. ");

    expect(result).toMatchObject({ correct: true, rating: "good", skillIds: ["vocabulary:appel:meaning"] });
  });
});
