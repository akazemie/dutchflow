import { expect, test } from "@playwright/test";
import { join } from "node:path";

async function installStableIds(page: import("@playwright/test").Page, firstId = 1) {
  await page.addInitScript((initialId) => {
    const storageKey = "dutchflow-e2e-id-counter";
    let counter = Number(localStorage.getItem(storageKey));
    if (!Number.isSafeInteger(counter) || counter < initialId) counter = initialId - 1;
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: () => {
        counter += 1;
        localStorage.setItem(storageKey, String(counter));
        return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
      },
    });
  }, firstId);
}

async function importFixture(page: import("@playwright/test").Page, fixture: string) {
  await page.goto("/settings/");
  const reload = page.waitForEvent("load");
  await page.getByLabel("Choose DutchFlow backup file").setInputFiles(
    join(process.cwd(), "e2e", "fixtures", fixture),
  );
  await reload;
  await expect(page.getByLabel("Explanation language")).toBeVisible();
}

async function openExercise(
  page: import("@playwright/test").Page,
  fixture: string,
  moduleId: "verbs" | "vocabulary",
  firstId = 1,
) {
  await installStableIds(page, firstId);
  await importFixture(page, fixture);
  await page.goto(`/learn/${moduleId}/`);
}

async function expectSavedFeedback(page: import("@playwright/test").Page) {
  await expect(page.getByText("Your attempt is saved on this device.")).toBeVisible();
}

test("serves exported routes and a real 404 response", async ({ request }) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(home.headers()["content-type"]).toContain("text/html");

  const learningRoute = await request.get("/learn/verbs/");
  expect(learningRoute.status()).toBe(200);
  expect(await learningRoute.text()).toContain("DutchFlow");

  const missingRoute = await request.get("/missing-e2e-route/");
  expect(missingRoute.status()).toBe(404);
  expect(await missingRoute.text()).not.toBe("");
});

test("records an answer, shows feedback, and preserves progress after reload", async ({ page }) => {
  await openExercise(page, "empty-v4.json", "vocabulary");
  await expect(page.getByRole("radio").first()).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
  await expect(page.locator(".feedback")).toContainText("Expected:");

  await page.reload();
  await page.goto("/progress/");
  const answerCount = page.getByRole("article").filter({ hasText: "Answers recorded" });
  await expect(answerCount.getByText("1")).toBeVisible();
});

test("persists preferences and applies the selected UI locale", async ({ page }) => {
  await installStableIds(page);
  await importFixture(page, "empty-v4.json");
  await page.getByLabel("Explanation language").selectOption("nl");
  await page.getByRole("button", { name: "Save preferences" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByText("Op dit apparaat opgeslagen", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByRole("heading", { name: "Voorkeuren" })).toBeVisible();
});

test("uses English UI and RTL only on Persian explanations", async ({ page }) => {
  await installStableIds(page);
  await importFixture(page, "empty-v4.json");
  await page.getByLabel("Explanation language").selectOption("fa");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.goto("/learn/verbs/");
  await expect(page.locator(".exercise-hint")).toHaveAttribute("lang", "fa");
  await expect(page.locator(".exercise-hint")).toHaveAttribute("dir", "rtl");
  await expect(page.getByText("I have walked")).toBeVisible();
});

test("exports, clears IndexedDB, and imports the backup through the UI", async ({ page }, testInfo) => {
  await installStableIds(page);
  await importFixture(page, "empty-v4.json");
  await page.goto("/learn/vocabulary/");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
  await expect(page.getByRole("button", { name: "Next exercise" })).toBeEnabled();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Settings" }).click();
  const exportButton = page.getByRole("button", { name: "Export backup" });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath("exported-backup.json");
  await download.saveAs(backupPath);

  const missingRoute = await page.goto("/missing-e2e-route/");
  expect(missingRoute?.status()).toBe(404);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase("dutchflow");
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error);
    deletion.onblocked = () => reject(new Error("IndexedDB deletion was blocked."));
  }));

  await page.goto("/settings/");
  const reload = page.waitForEvent("load");
  await page.getByLabel("Choose DutchFlow backup file").setInputFiles(backupPath);
  await reload;
  await page.goto("/progress/");
  const answerCount = page.getByRole("article").filter({ hasText: "Answers recorded" });
  await expect(answerCount.getByText("1")).toBeVisible();
});

test("completes a multiple-choice tap flow", async ({ page }) => {
  await openExercise(page, "empty-v4.json", "vocabulary");
  await expect(page.getByRole("radio").first()).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
});

test("completes a fill-gap tap flow", async ({ page }) => {
  await openExercise(page, "vocabulary-stage1-v4.json", "vocabulary");
  const answer = page.getByRole("textbox", { name: "Fill in the missing Dutch word 1" });
  await expect(answer).toBeVisible();
  await answer.fill("boek");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
});

test("completes a typed-answer flow", async ({ page }) => {
  await openExercise(page, "vocabulary-stage2-v4.json", "vocabulary");
  const answer = page.getByRole("textbox", { name: "Your answer in Dutch" });
  await expect(answer).toBeVisible();
  await answer.fill("Ik lees een boek.");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
});

test("completes a word-ordering tap flow", async ({ page }) => {
  await openExercise(page, "vocabulary-stage2-v4.json", "vocabulary", 2);
  const availableWords = page.getByRole("list", { name: "Available words" });
  await expect(availableWords).toBeVisible();
  for (const word of ["ik", "lees", "een", "boek"]) {
    await availableWords.getByRole("button", { name: word, exact: true }).click();
  }
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
});

test("completes a matching tap flow when all facets are due", async ({ page }) => {
  await openExercise(page, "verbs-matching-v4.json", "verbs");
  const facets = page.getByRole("group", { name: "Facets" });
  await expect(facets.getByRole("button", { name: "Perfectum", exact: true })).toBeVisible();

  const pairs = [
    ["Perfectum", "hebben or zijn + gelopen"],
    ["Imperfectum · singular", "liep"],
    ["Imperfectum · plural", "liepen"],
  ] as const;
  for (const [facet, form] of pairs) {
    await facets.getByRole("button", { name: facet, exact: true }).click();
    await page.getByRole("group", { name: "Forms" }).getByRole("button", { name: form, exact: true }).click();
  }
  await page.getByRole("button", { name: "Check answer" }).click();
  await expectSavedFeedback(page);
});
