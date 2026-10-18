import { test, expect, type Page } from "@playwright/test";
import type { State } from "../src/core/types";
const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
async function server(page: Page) {
  const libraries = new Map<string, { state: State; revision: number }>();
  const requests: { path: string; data: Record<string, unknown> }[] = [];
  let failLoad = false;
  let conflict = false,
    failSave = false,
    active = userId;
  function session(id = active) {
    const email = id === userId ? "student@example.com" : "second@example.com";
    const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: id, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) }))}.test-signature`;
    return {
      access_token: token,
      refresh_token: "test-refresh",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id,
        aud: "authenticated",
        role: "authenticated",
        email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: { display_name: id === userId ? "Student" : "Second" },
        app_metadata: {},
        created_at: new Date().toISOString(),
      },
    };
  }
  await page.route("https://studyflow-test.supabase.co/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const data = req.postDataJSON() || {};
    requests.push({ path, data });
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
        headers: { "access-control-allow-origin": "*" },
      });
    if (req.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    if (path === "/auth/v1/token") {
      if (data.password === "wrong-password")
        return json(
          { code: "invalid_credentials", msg: "Invalid login credentials" },
          400,
        );
      active = data.email === "second@example.com" ? otherId : userId;
      return json(session());
    }
    if (path === "/auth/v1/signup")
      return json({ user: session().user, session: null });
    if (
      path === "/auth/v1/recover" ||
      path === "/auth/v1/resend" ||
      path === "/auth/v1/logout"
    )
      return json({});
    if (path === "/auth/v1/verify") {
      if (data.token === "000000")
        return json(
          { code: "otp_expired", msg: "Token has expired or is invalid" },
          403,
        );
      return json(session());
    }
    if (path === "/auth/v1/user") return json(session().user);
    if (path === "/rest/v1/studyflow_libraries") {
      if (failLoad) return json({ code: "503", message: "Unavailable" }, 503);
      return json(libraries.get(active) || null);
    }
    if (path === "/rest/v1/rpc/save_studyflow_library") {
      if (failSave) return json({ code: "503", message: "Unavailable" }, 503);
      const current = libraries.get(active);
      if (conflict || (current?.revision || 0) !== data.p_expected_revision)
        return json({ code: "40001", message: "Conflict" }, 409);
      const revision = (current?.revision || 0) + 1;
      libraries.set(active, { state: data.p_state as State, revision });
      return json(revision);
    }
    return json({ message: "Unexpected endpoint: " + path }, 500);
  });
  return {
    libraries,
    requests,
    set failLoad(value: boolean) {
      failLoad = value;
    },
    set conflict(value: boolean) {
      conflict = value;
    },
    set failSave(value: boolean) {
      failSave = value;
    },
  };
}
async function login(
  page: Page,
  email = "student@example.com",
  password = "valid-password-123",
) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Log in", exact: true })
    .last()
    .click();
}
test("login validates credentials, saves online, restores session, signs out and isolates accounts", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(page.locator(".home-feed")).toHaveCount(0);
  await login(page, undefined, "wrong-password");
  await expect(page.getByRole("alert")).toContainText(
    "Invalid login credentials",
  );
  await login(page);
  await expect(page.locator(".home-feed")).toBeVisible();
  await expect(page.locator(".titlebar-status")).toHaveText("Cloud connected");
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await page.getByLabel("Display name").fill("Cloud student");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect
    .poll(() => api.libraries.get(userId)?.state.settings.name)
    .toBe("Cloud student");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cloud student", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await login(page, "second@example.com");
  await expect(page.locator(".home-feed")).toBeVisible();
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await expect(page.getByLabel("Display name")).toHaveValue("Second");
  expect(api.libraries.get(userId)?.state.settings.name).toBe("Cloud student");
});
test("signup confirms an email code, handles an invalid code and resends", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/#/signup");
  await page.getByLabel("Username").fill("New learner");
  await page.getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByLabel("Password", { exact: true }).fill("new-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your email." }),
  ).toBeVisible();
  await page.getByLabel("Email code").fill("000000");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.getByRole("alert")).toContainText("expired");
  await page.getByRole("button", { name: /Resend email/ }).click();
  await expect(page.getByRole("status")).toContainText("new code");
  await page.getByLabel("Email code").fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.locator(".home-feed")).toBeVisible();
  expect(
    api.requests.find((x) => x.path.endsWith("/signup"))?.data,
  ).toMatchObject({
    email: "student@example.com",
    password: "new-password-123",
    data: { display_name: "New learner" },
  });
});
test("email recovery keeps the library locked until the new password is saved", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByRole("button", { name: "Send recovery code" }).click();
  await page.getByLabel("Email code").fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a new password." }),
  ).toBeVisible();
  await expect(page.locator(".home-feed")).toHaveCount(0);
  await page
    .getByLabel("Password", { exact: true })
    .fill("replacement-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("mismatch-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("alert")).toContainText("don’t match");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("replacement-password-123");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.locator(".home-feed")).toBeVisible();
  expect(
    api.requests.some(
      (x) =>
        x.path.endsWith("/user") &&
        x.data.password === "replacement-password-123",
    ),
  ).toBe(true);
});
test("a stale device cannot overwrite cloud data and can explicitly reload", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/");
  await login(page);
  await expect(page.locator(".home-feed")).toBeVisible();
  api.conflict = true;
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await page.getByLabel("Display name").fill("Stale update");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "changed on another device",
  );
  expect(api.libraries.get(userId)?.state.settings.name).toBe("Student");
  await page
    .getByRole("button", { name: "Load cloud copy", exact: true })
    .click();
  await expect(
    page.getByText("Loading the cloud copy discards", { exact: false }),
  ).toBeVisible();
  api.conflict = false;
  await page.getByRole("button", { name: "Discard pending and load" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue("Student");
});
test("a failed cloud save preserves pending changes across reload and retries", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/");
  await login(page);
  await expect(page.locator(".home-feed")).toBeVisible();
  api.failSave = true;
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await page.getByLabel("Display name").fill("Saved after reconnect");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("alert")).toContainText("Cloud save failed");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("not saved online");
  api.failSave = false;
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect
    .poll(() => api.libraries.get(userId)?.state.settings.name)
    .toBe("Saved after reconnect");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("login and signup layouts remain usable at desktop minimum size", async ({
  page,
}) => {
  await server(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeInViewport();
  await page.screenshot({ path: "docs/screenshots/login.png" });
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "docs/screenshots/signup.png" });
  await page.setViewportSize({ width: 760, height: 600 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toBeVisible();
});

test("a library connection failure blocks study access until retry succeeds", async ({
  page,
}) => {
  const api = await server(page);
  api.failLoad = true;
  await page.goto("/");
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Could not open your cloud library",
    { timeout: 20000 },
  );
  await expect(page.locator(".home-feed")).toHaveCount(0);
  api.failLoad = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".home-feed")).toBeVisible();
});
test("changing a password reauthenticates and reports mismatched passwords", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/");
  await login(page);
  await page.getByRole("link", { name: "Your profile", exact: true }).click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("valid-password-123");
  await page
    .getByLabel("New password", { exact: true })
    .fill("changed-password-123");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password-123");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("don’t match");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("changed-password-123");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(
    page.getByText("Password changed.", { exact: true }),
  ).toBeVisible();
  expect(
    api.requests.some(
      (x) =>
        x.path.endsWith("/user") && x.data.password === "changed-password-123",
    ),
  ).toBe(true);
});
test("default email confirmation links can be pasted into the installed-app flow", async ({
  page,
}) => {
  const api = await server(page);
  await page.goto("/#/signup");
  await page.getByLabel("Username").fill("Link learner");
  await page.getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByLabel("Password", { exact: true }).fill("link-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByLabel("Email code")
    .fill(
      "https://studyflow-test.supabase.co/auth/v1/verify?token=test-hash-value&type=signup&redirect_to=http://localhost:3000",
    );
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.locator(".home-feed")).toBeVisible();
  expect(
    api.requests.some(
      (x) =>
        x.path.endsWith("/verify") &&
        x.data.token_hash === "test-hash-value" &&
        x.data.type === "signup",
    ),
  ).toBe(true);
});
