import { describe, expect, it } from "vitest";
import { seededShuffle } from "./seeded-shuffle";

describe("seededShuffle", () => {
  it("is deterministic for the same seed and varies with a different seed", () => {
    const items = ["a", "b", "c", "d", "e"];

    expect(seededShuffle(items, "same-seed")).toEqual(seededShuffle(items, "same-seed"));
    expect(seededShuffle(items, "same-seed")).not.toEqual(seededShuffle(items, "another-seed"));
    expect(seededShuffle(items, "same-seed").sort()).toEqual([...items].sort());
  });
});
