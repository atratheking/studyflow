import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await chromium.launch(
  existsSync(chrome) ? { executablePath: chrome } : {},
);
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:5173");
await page.locator(".home-feed").waitFor();
const id = (await page.locator(".feed-set").first().getAttribute("href"))
  .split("/")
  .at(-1);
const shots = [
  ["home", "dashboard"],
  ["library", "library"],
  ["set", `set/${id}`],
  ["editor", "create"],
  ["flashcards", `set/${id}/flashcards`],
  ["learn-setup", `set/${id}/learn`],
  ["test-setup", `set/${id}/test`],
  ["match-setup", `set/${id}/match`],
  ["write", `set/${id}/write`],
  ["folders", "folders"],
  ["statistics", "statistics"],
  ["settings", "settings"],
];
for (const [name, route] of shots) {
  await page.goto("http://127.0.0.1:5173/#/" + route);
  await page.locator("main").waitFor();
  await page.screenshot({ path: `docs/screenshots/${name}.png` });
  if (name === "learn-setup") {
    await page
      .getByRole("button", { name: "Start Learn", exact: true })
      .click();
    await page.screenshot({ path: "docs/screenshots/learn.png" });
  }
  if (name === "match-setup") {
    await page.getByRole("button", { name: "Start game" }).click();
    await page.screenshot({ path: "docs/screenshots/match.png" });
  }
}
await page.setViewportSize({ width: 1710, height: 982 });
for (const [name, route] of shots.slice(0, 7)) {
  await page.goto("http://127.0.0.1:5173/#/" + route);
  await page.screenshot({ path: `evidence/comparison-${name}-1710.png` });
}
await context.close();
await browser.close();
console.log(
  "Captured 14 app screens at 1440 × 900 and seven matched reference viewports.",
);
