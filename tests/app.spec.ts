import { test, expect, type Page } from "@playwright/test";
async function open(page: Page) {
  await page.goto("/");
  await expect(page.locator(".home-feed")).toBeVisible();
}
async function create(
  page: Page,
  title = "Integration study set",
  cards = [
    ["Alpha", "First letter"],
    ["Beta", "Second letter"],
  ],
) {
  await page.goto("/#/create");
  await page
    .getByRole("textbox", { name: "Study set title", exact: true })
    .fill(title);
  for (let i = 0; i < cards.length; i++) {
    if (i >= 2)
      await page
        .getByRole("button", { name: "Add a card", exact: true })
        .click();
    await page
      .getByRole("textbox", { name: `Term ${i + 1}`, exact: true })
      .fill(cards[i][0]);
    await page
      .getByRole("textbox", { name: `Definition ${i + 1}`, exact: true })
      .fill(cards[i][1]);
  }
  await page
    .getByRole("button", { name: "Create set", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  return /#\/set\/([^/]+)/.exec(page.url())![1];
}

test("create, edit, reorder, duplicate, delete cards and retain data after reload", async ({
  page,
}) => {
  await open(page);
  const id = await create(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Integration study set", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Edit set", exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate card 1", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Term 3", exact: true }),
  ).toHaveValue("Beta");
  await page
    .getByRole("button", { name: "Move card 3 up", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Term 2", exact: true }),
  ).toHaveValue("Beta");
  await page
    .getByRole("button", { name: "Remove card 3", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Definition 2", exact: true })
    .fill("Updated second letter");
  await page
    .getByRole("button", { name: "Save changes", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp("/set/" + id + "$"));
  await expect(
    page.getByText("Updated second letter", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Updated second letter", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/set/" + id + "/flashcards");
  await expect(
    page.getByRole("button", { name: "Flip flashcard" }),
  ).toContainText("Alpha");
  await page.locator("main").click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Flip flashcard" }),
  ).toContainText("First letter");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Flip flashcard" }),
  ).toContainText("Beta");
  await page.getByRole("button", { name: "Know it", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Round complete!" }),
  ).toBeVisible();
  await page.goto("/#/statistics");
  await expect(page.getByText("Cards studied", { exact: true })).toBeVisible();
});

test("editor draft survives route navigation and is cleared after a successful save", async ({
  page,
}) => {
  await open(page);
  await page.goto("/#/create");
  await page
    .getByRole("textbox", { name: "Study set title", exact: true })
    .fill("Resumable draft");
  await page.getByRole("textbox", { name: "Term 1", exact: true }).fill("one");
  await page
    .getByRole("textbox", { name: "Definition 1", exact: true })
    .fill("uno");
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await page.getByRole("link", { name: "Your library", exact: true }).click();
  await page.getByRole("link", { name: "Create", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Study set title", exact: true }),
  ).toHaveValue("Resumable draft");
  await page
    .getByRole("button", { name: "Create set", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Resumable draft", exact: true }),
  ).toBeVisible();
  await page.goto("/#/create");
  await expect(
    page.getByRole("textbox", { name: "Study set title", exact: true }),
  ).toHaveValue("");
});

test("CSV import preview, export and search use stored cards", async ({
  page,
}) => {
  await open(page);
  await page.goto("/#/create");
  await page
    .getByRole("textbox", { name: "Study set title", exact: true })
    .fill("Imported Unicode");
  await page
    .getByRole("button", { name: "Import from text or a file" })
    .click();
  await page.getByLabel("Separate term and definition with").selectOption(",");
  await page
    .getByRole("textbox", { name: "Import text", exact: true })
    .fill('term,definition\n"café, sí","line one\nline two"\nHola,Hello');
  await expect(
    page.getByRole("heading", { name: "Preview · 2 cards" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import 2 cards", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create set", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "More set actions" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export as CSV" }).click();
  expect((await dl).suggestedFilename()).toBe("Imported Unicode.csv");
  await page
    .getByRole("textbox", { name: "Search your library", exact: true })
    .fill("café");
  await page
    .getByRole("textbox", { name: "Search your library", exact: true })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Imported Unicode", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Filter study sets", exact: true })
    .fill("not-found-zz");
  await expect(
    page.getByRole("heading", { name: "No matches this time" }),
  ).toBeVisible();
});

test("folders organise sets, support rename, and deleting a folder preserves sets", async ({
  page,
}) => {
  await open(page);
  await page.goto("/#/folders");
  await page.getByRole("button", { name: "New folder", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Folder name", exact: true })
    .fill("Semester 1");
  await page
    .getByRole("button", { name: "Create folder", exact: true })
    .click();
  await page.getByRole("link", { name: "Semester 1 0 study sets" }).click();
  await page.getByRole("checkbox").first().click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(page.locator(".library-list .set-card")).toHaveCount(1);
  await page.goto("/#/folders");
  await page.getByRole("button", { name: "Rename Semester 1" }).click();
  await page
    .getByRole("textbox", { name: "Folder name" })
    .fill("Biology folder");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Biology folder" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete Biology folder" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.goto("/#/library");
  await expect(page.locator(".set-card")).toHaveCount(3);
});

test("write retries errors, normalises responses, and persists SM-2 schedule", async ({
  page,
}) => {
  await open(page);
  const id = await create(page, "Write test", [
    ["A", "Alpha"],
    ["B", "Beta"],
  ]);
  await page.goto("/#/set/" + id + "/write");
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("wrong");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(".feedback[role=status]")).toContainText(
    "Correct answer: Alpha",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill(" beta ");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(".feedback[role=status]")).toContainText(
    "That’s right",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill(" ALPHA ");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Look at what you know." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "You completed 2 cards with 67% accuracy across 3 attempts.",
    ),
  ).toBeVisible();
  await page.reload();
  await page.goto("/#/statistics");
  await expect(page.getByText("2 correct of 3 answers")).toBeVisible();
  await page.goto("/#/reviews");
  await expect(
    page.getByRole("heading", { name: "You’re all caught up" }),
  ).toBeVisible();
});

test("adaptive learn completes after two successful recalls and reverses question direction", async ({
  page,
}) => {
  await open(page);
  const id = await create(page, "Adaptive test", [
    ["A", "Alpha"],
    ["B", "Beta"],
  ]);
  await page.goto("/#/set/" + id + "/learn");
  await page.getByRole("button", { name: "Start Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "1 Alpha", exact: true })
    .or(page.getByRole("button", { name: "2 Alpha", exact: true }))
    .click();
  await expect(page.locator(".answer-option.correct-choice")).toContainText(
    "Alpha",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "1 Beta", exact: true })
    .or(page.getByRole("button", { name: "2 Beta", exact: true }))
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".question-prompt")).toHaveText("Alpha");
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("A");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("B");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Look at what you know." }),
  ).toBeVisible();
});

test("mixed test generates, grades and supports retakes", async ({ page }) => {
  await open(page);
  const id = await create(page, "Mixed test", [
    ["A", "Alpha"],
    ["B", "Beta"],
    ["C", "Gamma"],
    ["D", "Delta"],
  ]);
  await page.goto("/#/set/" + id + "/test");
  await page
    .getByRole("spinbutton", { name: "Number of questions", exact: true })
    .fill("4");
  await page
    .getByRole("switch", { name: "Randomise question order", exact: true })
    .uncheck();
  await page.getByRole("switch", { name: "Written", exact: true }).check();
  await page
    .getByRole("switch", { name: "True or false", exact: true })
    .check();
  await page.getByRole("switch", { name: "Matching", exact: true }).check();
  await page.getByRole("button", { name: "Start test", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Answer 1", exact: true })
    .fill("Alpha");
  await page
    .locator(".test-question")
    .nth(1)
    .getByRole("radio", { name: /Beta/ })
    .check();
  const candidate = await page.locator(".truefalse-candidate").textContent();
  await page
    .locator(".test-question")
    .nth(2)
    .getByRole("radio", {
      name: candidate === "Gamma" ? "A True" : "B False",
      exact: true,
    })
    .check();
  await page
    .getByRole("combobox", { name: "Answer 4", exact: true })
    .selectOption("Delta");
  await page.getByRole("button", { name: "Submit test" }).click();
  await expect(
    page.getByText("4 correct out of 4. Review your answers below."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create another test" }).click();
  await expect(page.getByRole("button", { name: "Start test" })).toBeVisible();
});

test("match resolves real pairs and saves a personal best", async ({
  page,
}) => {
  await open(page);
  const id = await create(page, "Match test", [
    ["A", "Alpha"],
    ["B", "Beta"],
  ]);
  await page.goto("/#/set/" + id + "/match");
  await page.getByRole("button", { name: "Start game" }).click();
  await page.getByRole("button", { name: "A", exact: true }).click();
  await page.getByRole("button", { name: "Alpha", exact: true }).click();
  await page.getByRole("button", { name: "B", exact: true }).click();
  await page.getByRole("button", { name: "Beta", exact: true }).click();
  await expect(page.getByText("ALL CONNECTED", { exact: true })).toBeVisible();
  await expect(page.locator(".personal-best")).toHaveText(
    /Personal best: [0-9.]+ seconds/,
  );
  await page.reload();
  await expect(page.locator(".personal-best")).toBeVisible();
});

test("settings persist theme and display name and reject invalid backups", async ({
  page,
}) => {
  await open(page);
  await page.goto("/#/profile");
  await page
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Alex");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.goto("/#/settings");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "not a valid StudyFlow backup",
  );
  await page.goto("/#/dashboard");
  await expect(page.getByRole("link", { name: "Your profile" })).toHaveText(
    "A",
  );
});

test("all routes render, console is clean, and desktop/tablet/narrow windows avoid overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const href = await page.locator(".feed-set").first().getAttribute("href");
  const id = href!.split("/").at(-1);
  const routes = [
    "dashboard",
    "library",
    "create",
    "folders",
    "statistics",
    "profile",
    "settings",
    "features",
    "login",
    "signup",
    "search",
    `set/${id}`,
    `set/${id}/edit`,
    `set/${id}/flashcards`,
    `set/${id}/learn`,
    `set/${id}/test`,
    `set/${id}/match`,
    `set/${id}/write`,
    "reviews",
  ];
  for (const route of routes) {
    await page.goto("/#/" + route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main").locator("h1,h2").first()).toBeAttached();
  }
  for (const [width, height] of [
    [1440, 900],
    [1280, 800],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      "dashboard",
      `set/${id}`,
      `set/${id}/flashcards`,
      "create",
    ]) {
      await page.goto("/#/" + route);
      await expect(page.locator("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("main")
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      ).toBe(true);
      await page.screenshot({
        path: `evidence/${route.replace(id!, "set").replaceAll("/", "-")}-${width}.png`,
        fullPage: false,
      });
    }
  }
  expect(errors).toEqual([]);
});

test("backup export and confirmed restore preserve the entire library", async ({
  page,
}) => {
  await open(page);
  await page.goto("/#/settings");
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const stream = await (await waiting).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString()).sets).toHaveLength(3);
  await create(page, "A set made after the backup");
  await page.goto("/#/settings");
  await page.locator("input[type=file]").setInputFiles({
    name: "StudyFlow-backup.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Restore this backup?" })
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await page.goto("/#/library");
  await expect(page.locator(".set-card")).toHaveCount(3);
  await page.reload();
  await expect(page.locator(".set-card")).toHaveCount(3);
});

test("card images persist through save, flip and reopening a set", async ({
  page,
}) => {
  await open(page);
  await page.goto("/#/create");
  await page
    .getByRole("textbox", { name: "Study set title", exact: true })
    .fill("Image study set");
  await page
    .getByRole("textbox", { name: "Term 1", exact: true })
    .fill("StudyFlow");
  await page
    .getByRole("textbox", { name: "Definition 1", exact: true })
    .fill("An original icon");
  await page
    .getByLabel("Term image 1", { exact: true })
    .setInputFiles("build/icon.png");
  await expect(
    page.getByRole("img", { name: "Term image 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create set", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Image study set", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Flashcard illustration" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: "Flashcard illustration" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Flip flashcard" }).click();
  await expect(
    page.getByRole("img", { name: "Flashcard illustration" }),
  ).toHaveCount(0);
});

test("overdue cards enter daily review and are rescheduled after recall", async ({
  page,
}) => {
  await open(page);
  const id = await create(page, "Scheduled review", [["A", "Alpha"]]);
  await page.evaluate(async (setId) => {
    const req = indexedDB.open("studyflow-desktop", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction("app", "readwrite");
    const store = tx.objectStore("app");
    const get = store.get("state");
    get.onsuccess = () => {
      const s = get.result;
      const c = s.sets.find((x: { id: string }) => x.id === setId).cards[0];
      s.reviews[c.id] = {
        cardId: c.id,
        setId,
        repetitions: 1,
        interval: 1,
        ease: 2.5,
        last: Date.now() - 172800000,
        due: Date.now() - 86400000,
        correct: 1,
        incorrect: 0,
      };
      store.put(s, "state");
    };
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, id);
  await page.reload();
  await page.goto("/#/reviews");
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("Alpha");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Look at what you know." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "You’re all caught up" }),
  ).toBeVisible();
});

test("a 500-card imported set can be saved and edited", async ({ page }) => {
  await open(page);
  await page.goto("/#/create");
  await page
    .getByRole("textbox", { name: "Study set title", exact: true })
    .fill("Large library test");
  await page
    .getByRole("button", { name: "Import from text or a file" })
    .click();
  await page
    .getByRole("textbox", { name: "Import text", exact: true })
    .fill(
      Array.from({ length: 500 }, (_, i) => `Term ${i}\tDefinition ${i}`).join(
        "\n",
      ),
    );
  await page
    .getByRole("button", { name: "Import 500 cards", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Definition 500", exact: true })
    .fill("The last edited card");
  await page
    .getByRole("button", { name: "Create set", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Large library test", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("The last edited card", { exact: true }),
  ).toBeAttached();
});

test("flashcard starred filtering can recover from an empty selection", async ({
  page,
}) => {
  await open(page);
  const id = await create(page, "Starred recall", [
    ["A", "Alpha"],
    ["B", "Beta"],
  ]);
  await page.goto("/#/set/" + id + "/flashcards");
  await page.getByRole("button", { name: "Practice options" }).click();
  await page
    .getByRole("checkbox", { name: "Study starred cards only" })
    .click();
  await expect(
    page.getByRole("heading", { name: "No starred cards yet" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Study all cards", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Star card", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unstar card", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Practice options" }).click();
  await page
    .getByRole("checkbox", { name: "Study starred cards only" })
    .click();
  await expect(page.locator(".activity-progress")).toHaveText("1 / 1");
  await page.getByRole("button", { name: "Know it", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Round complete!" }),
  ).toBeVisible();
});

test("import delimiter can switch from CSV back to TSV", async ({ page }) => {
  await open(page);
  await page.goto("/#/create");
  await page
    .getByRole("button", { name: "Import from text or a file" })
    .click();
  await page.getByLabel("Separate term and definition with").selectOption(",");
  await page.getByLabel("Separate term and definition with").selectOption("\t");
  await page
    .getByRole("textbox", { name: "Import text", exact: true })
    .fill("Hola\tHello");
  await expect(
    page.getByRole("heading", { name: "Preview · 1 cards" }),
  ).toBeVisible();
});
