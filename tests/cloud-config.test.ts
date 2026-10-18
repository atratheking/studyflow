import { expect, it } from "vitest";
import { readCloudConfig } from "../src/core/cloud-config";
it("allows public cloud configuration and rejects secret keys and unintended endpoints", () => {
  expect(readCloudConfig()).toBeNull();
  expect(
    readCloudConfig("https://project.supabase.co/", "sb_publishable_test"),
  ).toEqual({ url: "https://project.supabase.co", key: "sb_publishable_test" });
  expect(() => readCloudConfig("https://project.supabase.co")).toThrow("both");
  expect(() =>
    readCloudConfig("http://project.supabase.co", "sb_publishable_test"),
  ).toThrow("https");
  expect(() =>
    readCloudConfig(
      "https://project.supabase.co.attacker.com",
      "sb_publishable_test",
    ),
  ).toThrow("project");
  expect(() =>
    readCloudConfig("https://project.supabase.co", "sb_secret_private"),
  ).toThrow("secret");
  const service = `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
  expect(() => readCloudConfig("https://project.supabase.co", service)).toThrow(
    "service-role",
  );
});
