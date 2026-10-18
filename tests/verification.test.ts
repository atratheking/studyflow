import { expect, it } from "vitest";
import { verificationParams } from "../src/core/verification";
const project = "https://project.supabase.co";
it("accepts codes and matching default Supabase links without following redirects", () => {
  expect(
    verificationParams("123456", "student@example.com", false, project),
  ).toEqual({ email: "student@example.com", token: "123456", type: "email" });
  expect(
    verificationParams(
      project +
        "/auth/v1/verify?type=signup&token=hash&redirect_to=http://localhost:3000",
      "student@example.com",
      false,
      project,
    ),
  ).toEqual({ token_hash: "hash", type: "signup" });
  expect(
    verificationParams(
      project + "/auth/v1/verify?type=recovery&token=hash",
      "student@example.com",
      true,
      project,
    ),
  ).toEqual({ token_hash: "hash", type: "recovery" });
});
it("rejects links from another project and the wrong authentication flow", () => {
  expect(() =>
    verificationParams(
      "https://attacker.com/auth/v1/verify?token=hash&type=signup",
      "",
      false,
      project,
    ),
  ).toThrow("StudyFlow");
  expect(() =>
    verificationParams(
      project + "/auth/v1/verify?type=signup&token=hash",
      "",
      true,
      project,
    ),
  ).toThrow("doesn’t match");
  expect(() => verificationParams("invalid", "", true, project)).toThrow(
    "Enter",
  );
});
