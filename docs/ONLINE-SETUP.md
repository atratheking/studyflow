# Online accounts and cloud libraries

StudyFlow 1.1 adds real email/password accounts using Supabase Auth and a private, versioned PostgreSQL library for each user. Production builds require a connection and successful account authentication before opening the library. There is no guest or offline bypass in a normal build.

## Connect a new project

1. Create a Supabase project in your account. Retain your database password yourself; the desktop app does not need it. Enable the Data API and row-level security. Do not automatically expose every new table.
2. Run `supabase/migrations/202610180001_accounts.sql` once in that project's SQL editor. It creates `studyflow_libraries`, enables RLS, grants authenticated users SELECT on their own row, and exposes one authenticated write function. Do not run this against an unrelated project.
3. In Authentication, keep the email provider and email confirmation enabled. Set the minimum password length to 12 characters.
4. When custom SMTP is available, configure the confirmation and recovery email templates to show an email code rather than requiring a browser redirect. With the default templates, users can copy the confirmation/recovery button's link into the app's Email code field instead. The templates below use Supabase's built-in `{{ .Token }}` value. This lets the same verification flow work inside installed Mac and Windows applications. The dashboard currently requires custom SMTP or an upgraded mail service to edit templates; template customization and public email delivery are deferred at the user's request.
5. For signups outside your project's team, configure custom SMTP. Supabase's default mailer is restricted to team addresses and is unsuitable for a public app. SMTP credentials belong in Supabase's dashboard, never in the desktop app. See [Supabase's SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).
6. Copy `.env.example` to `.env.local`. Set the Project URL and **publishable** key from the project overview. The URL must be `https://PROJECT.supabase.co`. A legacy `anon` key is also accepted; secret and service-role keys are rejected at build time.
7. Run `npm ci`, `npm test`, `npm run test:auth`, `npm run test:e2e`, `npm run test:desktop`, then `npm run build`. Package with `npm run dist:mac` or `npm run dist:win`. Vite embeds the public settings at build time. Rebuild after changing them.

The `.env.local` file is ignored by Git. Public settings can also be supplied through the GitHub repository's Actions **variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. No privileged database key is required by CI. A build with neither setting displays the login screen with account setup pending and disables authentication. Partial, malformed or secret-key configurations fail the build.

### Confirm signup template

Subject: `Confirm your StudyFlow account`

```html
<h2>Confirm your StudyFlow account</h2>
<p>Enter this code in StudyFlow:</p>
<p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>If you did not request an account, you can ignore this email.</p>
```

### Reset password template

Subject: `Reset your StudyFlow password`

```html
<h2>Reset your StudyFlow password</h2>
<p>Enter this recovery code in StudyFlow:</p>
<p style="font-size:28px;letter-spacing:4px"><strong>{{ .Token }}</strong></p>
<p>If you did not request a password reset, you can ignore this email.</p>
```

Reference: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [password authentication](https://supabase.com/docs/guides/auth/passwords), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Saving and using two computers

Sign in on either desktop to load the latest cloud library: sets, card images, folders, progress, activity, preferences and drafts. Changes are submitted automatically and become committed UI state after successful remote writes. Settings → Refresh from cloud reloads newer changes from another computer. This version uses complete library snapshots rather than realtime collaborative editing.

Each snapshot carries a revision. The database write function obtains the owner from the signed session; the app cannot nominate another owner. A stale revision is rejected so an older device cannot silently replace newer work. If two devices edit concurrently, export the pending changes, load the cloud copy, then selectively import/reapply the work you want to keep.

A failed save leaves a durable, account-specific pending copy on the device. The recovery dialog offers export, retry, or explicit discard-and-reload. A recovered pending snapshot whose base revision is stale cannot be uploaded over a newer cloud library. Signing out or quitting normally first flushes the current draft and pending saves. Failed saves block normal sign-out/quit until resolved; the native close recovery flow remains available.

Auth sessions use the Supabase SDK's local session persistence and token refresh. Passwords are submitted to Supabase over HTTPS and are not stored by StudyFlow. Account caches and recovery copies remain in the OS user's Electron profile after sign-out; these are scoped by account ID, not encrypted by the app. They are not a substitute for OS account protection on a shared computer.

## Bring an earlier local library online

The earlier `state` IndexedDB record is preserved and never automatically assigned to a signed-in account. In Settings, export the previous device library, then explicitly restore that backup into the desired account. Restore replaces that account's library after confirmation. Export the current cloud library first if you want to retain it.

## Connected project status

The StudyFlow project was created in the user's Supabase organization through Helium. The migration ran successfully in its SQL editor. Local production builds have the real Project URL and publishable key in ignored `.env.local`. Live public-endpoint probes verified that email authentication and confirmation are enabled, anonymous table reads return permission denied, and anonymous writes through the RPC return permission denied. No secret/service-role key or database password was read or embedded.

The user chose to finish login first and configure public email delivery later. No SMTP account was created, no paid plan was selected, and email confirmation was not disabled. Automated auth flows use controlled responses; live account signup/login and actual email delivery still need to be exercised with the user's own credentials.

## Verification

`npm test` executes real PostgreSQL migration/RLS/revision checks using PGlite, plus domain and IndexedDB tests. `npm run test:auth` exercises the production auth build with controlled Supabase HTTP responses: credential errors, signup/email verification/resend, recovery, password changes, session restoration/sign-out/account switching, failed cloud saves and concurrency recovery. These deterministic tests do not prove live email delivery.

The older study-engine and desktop persistence tests use an explicit `--mode study-test` build, isolated from real accounts. Every packaging script and CI distributable step rebuilds normal production mode afterward. Do not distribute a fixture-mode build.

Before public release, verify actual delivery to two distinct user emails using your SMTP service, then sign in on Mac and Windows and verify account isolation and cross-device saving. The default mailer alone does not support unrestricted public signups.
