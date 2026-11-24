// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { I18nProvider, useI18n } from "./i18n-provider";
import { LearningRuntimeProvider } from "@/features/runtime/learning-runtime-provider";

function LocaleControls() {
  const { locale, setExplanationLanguage, t } = useI18n();

  return (
    <div>
      <p>{t("settings.title")}</p>
      <output>{locale}</output>
      <button onClick={() => setExplanationLanguage("nl")} type="button">Dutch</button>
      <button onClick={() => setExplanationLanguage("fa")} type="button">Persian</button>
    </div>
  );
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <LearningRuntimeProvider runtime={null}>
      <I18nProvider>{children}</I18nProvider>
    </LearningRuntimeProvider>
  );
}

describe("I18nProvider", () => {
  it("sets the document language to the UI locale and keeps Persian UI in English", async () => {
    document.documentElement.dir = "ltr";
    render(<LocaleControls />, { wrapper: Providers });

    fireEvent.click(screen.getByRole("button", { name: "Dutch" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("nl"));
    expect(screen.getByText("Voorkeuren")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Persian" }));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
    expect(document.documentElement.dir).toBe("ltr");
    expect(screen.getByText("Preferences")).toBeTruthy();
  });
});
