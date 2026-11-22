import { readFile } from "node:fs/promises";
import { verbCollectionSchema } from "../src/content/verbs/schema";
import { generateWeakForms } from "../src/learning/modules/verbs/conjugation/weak-forms";
import { vocabularyCollectionSchema } from "../src/content/vocabulary/schema";

const source = new URL("../src/content/verbs/verbs.json", import.meta.url);
const vocabularySource = new URL("../src/content/vocabulary/vocabulary.json", import.meta.url);
const parsed = verbCollectionSchema.safeParse(JSON.parse(await readFile(source, "utf8")));

if (!parsed.success) {
  console.error(parsed.error.format());
  process.exitCode = 1;
} else {
  const ids = parsed.data.items.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    console.error("Verb content IDs must be unique.");
    process.exitCode = 1;
  } else {
    const errors = parsed.data.items.flatMap((verb) => {
      if (verb.morphology.type !== "weak") return [];
      const generated = generateWeakForms(verb.morphology);
      const mismatches: string[] = [];
      if (generated.perfectumParticiple !== verb.forms.perfectum.participle) {
        mismatches.push(`${verb.id}: generated participle ${generated.perfectumParticiple}, expected ${verb.forms.perfectum.participle}`);
      }
      if (generated.imperfectum.singular !== verb.forms.imperfectum.singular) {
        mismatches.push(`${verb.id}: generated singular ${generated.imperfectum.singular}, expected ${verb.forms.imperfectum.singular}`);
      }
      if (generated.imperfectum.plural !== verb.forms.imperfectum.plural) {
        mismatches.push(`${verb.id}: generated plural ${generated.imperfectum.plural}, expected ${verb.forms.imperfectum.plural}`);
      }
      return mismatches;
    });

    if (errors.length > 0) {
      console.error(errors.join("\n"));
      process.exitCode = 1;
    } else {
      console.log(`Validated ${ids.length} verb content item(s) and generated forms.`);
    }
  }
}

const vocabulary = vocabularyCollectionSchema.safeParse(JSON.parse(await readFile(vocabularySource, "utf8")));
if (!vocabulary.success) {
  console.error(vocabulary.error.format());
  process.exitCode = 1;
} else {
  const ids = vocabulary.data.items.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    console.error("Vocabulary content IDs must be unique.");
    process.exitCode = 1;
  } else {
    console.log(`Validated ${ids.length} vocabulary content item(s).`);
  }
}
