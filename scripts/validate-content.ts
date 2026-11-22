import { readFile } from "node:fs/promises";
import { verbCollectionSchema } from "../src/content/verbs/schema";

const source = new URL("../src/content/verbs/verbs.json", import.meta.url);
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
    console.log(`Validated ${ids.length} verb content item(s).`);
  }
}
