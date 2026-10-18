import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { seed } from "../src/core/seed";
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const db = new PGlite();
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
}
async function save(revision: number, state = seed()) {
  return db.query<{ revision: number }>(
    "select public.save_studyflow_library($1::jsonb, $2::bigint) as revision",
    [JSON.stringify(state), revision],
  );
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema public, auth to authenticated, anon;
    insert into auth.users values ('${a}'), ('${b}');`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610180001_accounts.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
}, 20000);
afterAll(async () => {
  await db.close();
});
describe("real PostgreSQL account isolation and optimistic concurrency", () => {
  it("denies unauthenticated table reads and RPC writes", async () => {
    await db.exec("set role anon");
    await expect(
      db.query("select * from public.studyflow_libraries"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(save(0)).rejects.toMatchObject({ code: "42501" });
    await asUser("");
    await expect(save(0)).rejects.toMatchObject({ code: "28000" });
  });
  it("creates a library using JWT identity and denies direct mutation", async () => {
    await asUser(a);
    expect((await save(0)).rows[0].revision).toBe(1);
    const { rows } = await db.query<{ user_id: string }>(
      "select user_id from public.studyflow_libraries",
    );
    expect(rows).toEqual([{ user_id: a }]);
    await expect(
      db.exec("delete from public.studyflow_libraries"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.exec("update public.studyflow_libraries set revision = 100"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("isolates two accounts and cannot read another account's row", async () => {
    await asUser(b);
    expect(
      (await db.query("select * from public.studyflow_libraries")).rows,
    ).toEqual([]);
    const state = seed();
    state.settings.name = "Account B";
    expect((await save(0, state)).rows[0].revision).toBe(1);
    expect(
      (await db.query("select user_id from public.studyflow_libraries")).rows,
    ).toEqual([{ user_id: b }]);
    expect(
      (
        await db.query(
          "select * from public.studyflow_libraries where user_id = $1",
          [a],
        )
      ).rows,
    ).toEqual([]);
  });
  it("rejects stale revisions instead of overwriting newer work", async () => {
    await asUser(a);
    expect((await save(1)).rows[0].revision).toBe(2);
    await expect(save(1)).rejects.toMatchObject({ code: "40001" });
    await expect(save(0)).rejects.toMatchObject({ code: "40001" });
    expect(
      (await db.query("select revision from public.studyflow_libraries")).rows,
    ).toEqual([{ revision: 2 }]);
    await asUser(b);
    expect(
      (
        await db.query(
          "select state->'settings'->>'name' as name from public.studyflow_libraries",
        )
      ).rows,
    ).toEqual([{ name: "Account B" }]);
  });
  it("rejects invalid payloads without modifying saved data", async () => {
    await asUser(a);
    await expect(
      db.query("select public.save_studyflow_library('{}'::jsonb, 2)"),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      db.query("select public.save_studyflow_library(null, 2)"),
    ).rejects.toMatchObject({ code: "22023" });
    expect(
      (await db.query("select revision from public.studyflow_libraries")).rows,
    ).toEqual([{ revision: 2 }]);
  });
});
