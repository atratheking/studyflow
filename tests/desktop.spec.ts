import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
test("isolated study fixture opens securely and retains data and drafts after relaunch", async () => {
  const data = await mkdtemp(join(tmpdir(), "studyflow-desktop-test-"));
  const env = { ...process.env, STUDYFLOW_TEST_DATA: data };
  delete env.ELECTRON_RUN_AS_NODE;
  const launch = {
    args: process.env.STUDYFLOW_EXECUTABLE ? [] : [resolve(".")],
    env,
    ...(process.env.STUDYFLOW_EXECUTABLE
      ? { executablePath: process.env.STUDYFLOW_EXECUTABLE }
      : {}),
  };
  let app = await electron.launch(launch);
  try {
    let page = await app.firstWindow();
    await expect(page.locator(".home-feed")).toBeVisible();
    expect(page.url()).toContain("studyflow://app/");
    expect(
      await page.evaluate(
        () => typeof (window as unknown as { require?: unknown }).require,
      ),
    ).toBe("undefined");
    expect(
      await app.evaluate(({ BrowserWindow }) => {
        const w = BrowserWindow.getAllWindows()[0];
        return w.webContents.getLastWebPreferences().sandbox;
      }),
    ).toBe(true);
    await page.getByRole("link", { name: "Create", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Study set title", exact: true })
      .fill("Desktop persistence verified");
    await page
      .getByRole("textbox", { name: "Term 1", exact: true })
      .fill("Desktop");
    await page
      .getByRole("textbox", { name: "Definition 1", exact: true })
      .fill("An installed application");
    await page
      .getByRole("button", { name: "Create set", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Desktop persistence verified" }),
    ).toBeVisible();
    await page.screenshot({ path: "evidence/desktop-app.png" });
    await app.close();
    app = await electron.launch(launch);
    page = await app.firstWindow();
    await expect(page.locator(".home-feed")).toBeVisible();
    await page.getByRole("link", { name: "Your library", exact: true }).click();
    await expect(
      page
        .locator(".library-list")
        .getByRole("heading", { name: "Desktop persistence verified" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Create", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Study set title", exact: true })
      .fill("Draft saved when quitting");
    await page
      .getByRole("textbox", { name: "Term 1", exact: true })
      .fill("Immediate quit");
    await app.close();
    app = await electron.launch(launch);
    page = await app.firstWindow();
    await page.getByRole("link", { name: "Create", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Study set title", exact: true }),
    ).toHaveValue("Draft saved when quitting");
    await expect(
      page.getByRole("textbox", { name: "Term 1", exact: true }),
    ).toHaveValue("Immediate quit");
  } finally {
    await app.close();
    await rm(data, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
});
