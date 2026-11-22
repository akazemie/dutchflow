export interface WeakVerbMorphology {
  type: "weak";
  stem: string;
  gePrefix: boolean;
  separablePrefix?: string;
}

export interface WeakVerbForms {
  perfectumParticiple: string;
  imperfectum: { singular: string; plural: string };
}

function pastEnding(stem: string): "t" | "d" {
  const lower = stem.toLocaleLowerCase("nl-NL");
  const finalSound = lower.endsWith("ch") ? "ch" : lower.slice(-1);
  return "tkfschpx".includes(finalSound) || finalSound === "ch" ? "t" : "d";
}

export function generateWeakForms(morphology: WeakVerbMorphology): WeakVerbForms {
  const ending = pastEnding(morphology.stem);
  const pastSingular = `${morphology.stem}${ending}e`;
  const imperfectum = morphology.separablePrefix
    ? {
        singular: `${pastSingular} ${morphology.separablePrefix}`,
        plural: `${pastSingular}n ${morphology.separablePrefix}`,
      }
    : { singular: pastSingular, plural: `${pastSingular}n` };

  const participleEnding = morphology.stem.toLocaleLowerCase("nl-NL").endsWith(ending) ? "" : ending;
  const participleStem = `${morphology.stem}${participleEnding}`;
  const perfectumParticiple = morphology.separablePrefix
    ? `${morphology.separablePrefix}ge${participleStem}`
    : morphology.gePrefix
      ? `ge${participleStem}`
      : participleStem;

  return { perfectumParticiple, imperfectum };
}
