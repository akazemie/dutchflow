import { describe, expect, it } from "vitest";
import { seededShuffle } from "@/learning/core/seeded-shuffle";
import { createWordOrderingFields, supportsWordOrdering } from "./create-word-ordering-exercise";

describe("createWordOrderingFields", () => {
  it("shuffles deterministically and keeps only accepted variants with the same tokens", () => {
    const first = createWordOrderingFields(
      "Vandaag eet ik een appel.",
      ["Ik eet vandaag een appel.", "Zij eet een peer."],
      "exercise-1",
      "same-seed",
    );
    const second = createWordOrderingFields(
      "Vandaag eet ik een appel.",
      ["Ik eet vandaag een appel.", "Zij eet een peer."],
      "exercise-1",
      "same-seed",
    );

    expect(first).toEqual(second);
    expect(first?.tokens.find((token) => token.id === "exercise-1-token-0")?.text).toBe("vandaag");
    expect(first?.tokens.map((token) => token.text)).not.toContain("appel.");
    expect(first?.acceptedOrders).toEqual([
      ["Vandaag", "eet", "ik", "een", "appel"],
      ["Ik", "eet", "vandaag", "een", "appel"],
    ]);
  });

  it("requires at least four tokens", () => {
    expect(supportsWordOrdering("Ik eet appels.")).toBe(false);
    expect(createWordOrderingFields("Ik eet appels.", [], "exercise-short", "seed")).toBeUndefined();
  });

  it("falls back when both seeded shuffles equal an accepted order", () => {
    const tokens = ["Ik", "eet", "een", "appel"];
    const seed = Array.from({ length: 10_000 }, (_, index) => `identity-${index}`)
      .find((candidate) =>
        seededShuffle(tokens, candidate).join(" ") === tokens.join(" ")
        && seededShuffle(tokens, `${candidate}:reshuffle`).join(" ") === tokens.join(" "),
      );
    if (!seed) throw new Error("Expected to find a seed whose initial and derived shuffles are unchanged.");

    expect(createWordOrderingFields("Ik eet een appel.", [], "exercise-fallback", seed)).toBeUndefined();
  });
});
