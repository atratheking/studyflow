import { test, expect, _electron as electron } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
test("production desktop opens the real login gate instead of a local library", async () => {
  const data = await mkdtemp(join(tmpdir(), "studyflow-online-test-"));
  const env = { ...process.env, STUDYFLOW_TEST_DATA: data };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({
    args: process.env.STUDYFLOW_EXECUTABLE ? [] : [resolve(".")],
    env,
    ...(process.env.STUDYFLOW_EXECUTABLE
      ? { executablePath: process.env.STUDYFLOW_EXECUTABLE }
      : {}),
  });
  try {
    const page = await app.firstWindow();
    await expect(
      page.getByRole("heading", { name: "Welcome back." }),
    ).toBeVisible();
    await expect(page.locator(".home-feed")).toHaveCount(0);
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    expect(page.url()).toContain("studyflow://app/");
    expect(
      await app.evaluate(
        ({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
            .sandbox,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => typeof (window as unknown as { require?: unknown }).require,
      ),
    ).toBe("undefined");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Start your study flow." }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Log in", exact: true })
      .first()
      .click();
    await page.screenshot({ path: "evidence/desktop-online-login.png" });
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
