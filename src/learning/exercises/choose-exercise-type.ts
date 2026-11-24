import type { ExerciseType } from "@/learning/contracts/module";
import { getExerciseStage, type SkillProgress } from "@/learning/core/progress";
import { createSeededRandom } from "@/learning/core/seeded-shuffle";

export function chooseExerciseType(
  supportedTypes: readonly ExerciseType[],
  skillProgress: SkillProgress | undefined,
  seed: string,
): ExerciseType {
  if (supportedTypes.length === 0) {
    throw new Error("Cannot choose an exercise type when a module supports none.");
  }

  const stage = getExerciseStage(skillProgress);
  let preferredType: ExerciseType;
  if (stage === 0) {
    preferredType = "multiple-choice";
  } else if (stage === 1) {
    preferredType = "fill-gap";
  } else {
    const advancedTypes = supportedTypes.filter((type) =>
      type === "typed-answer" || type === "word-ordering" || type === "matching",
    );
    if (advancedTypes.length > 0) {
      const random = createSeededRandom(seed);
      return advancedTypes[Math.floor(random() * advancedTypes.length)]!;
    }
    preferredType = "typed-answer";
  }

  if (supportedTypes.includes(preferredType)) return preferredType;
  if (stage === 0 && supportedTypes.includes("fill-gap")) return "fill-gap";
  if (supportedTypes.includes("typed-answer")) return "typed-answer";
  if (supportedTypes.length > 0) return supportedTypes[0]!;
  throw new Error(`Exercise type ${preferredType} is unsupported and typed-answer fallback is unavailable.`);
}
