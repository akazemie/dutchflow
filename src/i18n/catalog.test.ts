import { describe, expect, it } from "vitest";
import {
  DUTCH_CATALOG_STATUS,
  MESSAGE_CATALOGS,
  formatMessage,
  uiLocaleForExplanationLanguage,
} from "./catalog";

describe("message catalogs", () => {
  it("contains every message key in each UI locale", () => {
    const englishKeys = Object.keys(MESSAGE_CATALOGS.en).sort();
    const dutchKeys = Object.keys(MESSAGE_CATALOGS.nl).sort();

    expect(dutchKeys).toEqual(englishKeys);
    expect(DUTCH_CATALOG_STATUS).toBe("draft");
  });

  it("formats parameters and falls back to English UI for Persian explanations", () => {
    expect(formatMessage("en", "session.tryModule", { module: "verbs" })).toBe("Try verbs");
    expect(uiLocaleForExplanationLanguage("fa")).toBe("en");
  });
});
