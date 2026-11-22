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
});
