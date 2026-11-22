import { describe, expect, it } from "vitest";
import { generateWeakForms } from "./weak-forms";

describe("weak Dutch verb forms", () => {
  it.each([
    ["werk", { perfectumParticiple: "gewerkt", imperfectum: { singular: "werkte", plural: "werkten" } }],
    ["maak", { perfectumParticiple: "gemaakt", imperfectum: { singular: "maakte", plural: "maakten" } }],
    ["woon", { perfectumParticiple: "gewoond", imperfectum: { singular: "woonde", plural: "woonden" } }],
    ["fiets", { perfectumParticiple: "gefietst", imperfectum: { singular: "fietste", plural: "fietsten" } }],
    ["juich", { perfectumParticiple: "gejuicht", imperfectum: { singular: "juichte", plural: "juichten" } }],
    ["bel", { perfectumParticiple: "opgebeld", imperfectum: { singular: "belde op", plural: "belden op" } }],
    ["beantwoord", { perfectumParticiple: "beantwoord", imperfectum: { singular: "beantwoordde", plural: "beantwoordden" } }],
  ])("generates verified weak forms for stem %s", (stem, expected) => {
    const morphology = stem === "bel"
      ? { type: "weak" as const, stem, gePrefix: true, separablePrefix: "op" }
      : stem === "beantwoord"
        ? { type: "weak" as const, stem, gePrefix: false }
        : { type: "weak" as const, stem, gePrefix: true };

    expect(generateWeakForms(morphology)).toEqual(expected);
  });
});
