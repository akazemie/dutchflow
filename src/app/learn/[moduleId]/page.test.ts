import { describe, expect, it, vi } from "vitest";
import { getLearningModuleMetadata, learningModuleRegistry } from "@/learning/modules/registry";
import LearnModulePage, { generateStaticParams } from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("learning module routes", () => {
  it("generates static params from the module registry", () => {
    expect(generateStaticParams()).toEqual(learningModuleRegistry.map(({ id }) => ({ moduleId: id })));
  });

  it("renders registered modules and calls notFound for unregistered modules", async () => {
    for (const { id } of learningModuleRegistry) {
      await expect(LearnModulePage({ params: Promise.resolve({ moduleId: id }) })).resolves.toBeTruthy();
      expect(getLearningModuleMetadata(id)).toBeDefined();
    }

    await expect(LearnModulePage({ params: Promise.resolve({ moduleId: "unregistered" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
