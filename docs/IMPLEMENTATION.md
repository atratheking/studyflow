# StudyFlow implementation and verification

StudyFlow is an Electron desktop app for macOS and Windows. Version 1.1 adds real email/password accounts and cloud libraries using Supabase; a packaged app needs no development server but does require Internet access and its configured backend. There are no advertisements or reserved ad slots.

## Account and cloud implementation

- Email/password login, signup with display name, email confirmation, resend, password recovery, password changes, persistent sessions and sign-out.
- Email codes and pasted original confirmation/recovery links work within the desktop app, without depending on a localhost callback or platform-specific browser redirect.
- Normal development and release builds require authentication and a successful cloud-library load before rendering study content. Missing backend configuration displays an honest setup-pending login screen.
- Supabase Auth manages passwords. Build validation allows only the public publishable/legacy anon key and the project's HTTPS endpoint; secret and service-role keys are rejected.
- Each account owns one PostgreSQL library row, protected by RLS. Anonymous users cannot read the table or call the save function. Direct authenticated table mutation is denied; the write function derives identity from the authenticated JWT and checks the expected revision.
- Whole-library snapshots save sets, images, folders, schedules, activity, preferences and drafts. Stale device updates are rejected. Sign-in and Settings → Refresh from cloud load the latest copy. Realtime collaboration and automatic conflict merging are not implemented.
- Failed saves are preserved durably under an account-specific recovery key. Recovery offers export, retry, or explicit discard-and-load. A stale recovered pending copy cannot overwrite newer cloud work. Underlying editing is disabled while the recovery dialog is active.
- The earlier local library is preserved separately. Settings can export it; restoring into an account is explicit and replaces that account's library only after confirmation.

The user created a dedicated StudyFlow Supabase project in their organization through Helium. The SQL migration was applied successfully. The real public project settings are in ignored `.env.local`. Email authentication and confirmation are enabled; the password policy was set to 12 characters.

**Public email delivery is deferred at the user's request.** The default mailer is restricted to project team addresses. The dashboard requires custom SMTP or an upgraded email service to customize templates. No mail-provider account or paid plan was created, and email confirmation was not disabled. Live signup/login with the user's own credentials and actual email delivery remain to be verified.

## Study tools and desktop application

- Original identity, logo, illustrations, starter study content and locally bundled licensed fonts/icons.
- UI reconstructed from direct observation of the reference's Home, library, set overview, Flashcards, Learn, Test setup and card editor. Integrated header/sidebar, dated library rows, numbered two-column editor and dedicated study screens. No ad regions.
- Create/edit/duplicate/delete sets/cards, reorder, image attachments, automatic drafts, save-and-practise, folders, search, sorting, CSV/TSV/paste import previews, CSV/JSON export, full backup and restore.
- Flashcards with flipping, keyboard navigation, shuffle/restart, starred filtering, autoplay, hints, orientation, available system speech and actual progress.
- Adaptive Learn with short/repeated goals, multiple choice and written recall, alternate question direction, returning missed cards and actual summaries.
- Configurable tests with four question types, grading, answer review and retakes. Timed six-pair Match with error penalties and best times. Write with strict/forgiving recall, feedback, retry and summaries.
- SM-2 review scheduling, due/overdue review, local-calendar streaks, study time, accuracy, mastery and activity from actual answers.
- Sandboxed Electron renderer, context isolation, disabled Node integration, restrictive bundled origin/CSP, denied external navigation/popups, narrow sender-checked quit handshake. Normal quit/sign-out flush drafts and pending saves; failure exposes recovery.
- MIT source, third-party licenses, lockfile and GitHub Actions for Mac arm64/x64 and Windows x64. Distributables remain unsigned; Windows runtime checks require Windows.

## Executed verification

| Check                                                                              | Result                                        |
| ---------------------------------------------------------------------------------- | --------------------------------------------- |
| Strict TypeScript and Vite production build                                        | Passed                                        |
| Vitest domain, storage, cloud recovery, config, verification and PostgreSQL checks | 25 passed                                     |
| Production-build auth workflows with controlled Supabase HTTP responses            | 9 passed                                      |
| Study engine/editor/import/search/responsive renderer regressions                  | 16 passed                                     |
| Real Electron fixture lifecycle scenario                                           | Passed                                        |
| Real Electron production login gate and sandbox scenario                           | Passed                                        |
| Live backend anonymous table read                                                  | Rejected: HTTP 401 / PostgreSQL 42501         |
| Live backend anonymous save RPC                                                    | Rejected: HTTP 401 / PostgreSQL 42501         |
| Live public auth settings                                                          | Email provider enabled; confirmation required |
| Packaged Mac production login/sandbox check                                        | Passed                                        |
| Mac arm64 DMG/ZIP and Windows x64 EXE/ZIP                                          | Built; archive checks passed                  |
| Runtime dependency audit                                                           | 0 vulnerabilities                             |
| Actual user signup/login and email delivery                                        | Not yet verified with user credentials        |
| Windows execution                                                                  | Not performed on this Mac                     |

There are **52 distinct automated tests**: 25 unit/database tests, 9 auth workflows, 16 renderer workflows and 2 desktop scenarios. Test profiles and example content are isolated. Account tests cover credential errors, signup/verification/resend, default email links, recovery, password changes, session restoration, sign-out/account switching, cloud connection failure, durable retry, and stale-write recovery.

Database tests run the actual migration in PostgreSQL through PGlite, with representative `auth.uid()` and roles. They test anonymous denial, identity-derived writes, two-account RLS isolation, denied direct mutations, stale revision conflicts and malformed payload rejection. They complement the deployed public-endpoint probes; they do not substitute for a live two-user release acceptance run.

The older study-engine and persistence scenarios use explicit `study-test` fixture mode. The auth suite uses a normal production build with controlled endpoints. The production desktop scenario uses the configured real backend build but does not submit credentials. Packaging and CI rebuild normal production mode after fixture tests.

The study renderer suite checks create/edit/reorder/duplicate/delete, draft recovery, Unicode/multiline CSV/TSV, import/export/search/folders, every study mode, grading, backups, malformed files, images, overdue review fixtures, 500-card imports, starred-empty recovery and overflow at 1440×900, 1280×800, 768×1024 and 390×844. Desktop minimum size is 760×600; no mobile app is shipped.

## Visual and reference limits

Original app screenshots are in `docs/screenshots/`, including the login and signup pages. Private reference captures remain ignored and are excluded from distributables. Direct observation informed colors, sidebar/header/search geometry, library hierarchy, card proportions and study control placement. The observed ad region was deliberately removed.

The original font/artwork/content and unsupported feature differences remain visible. Reference Match was inaccessible during inspection. Pixel-level equivalence and a fabricated 90/100 score are not claimed. See [reference observations](REFERENCE.md).

## Distribution and remaining work

Source and new online setup instructions are ready in [README](../README.md), [online setup](ONLINE-SETUP.md), and [release instructions](RELEASING.md). GitHub Actions accepts public project connection values from repository variables. No GitHub repository was created or pushed in this session.

Completed release artifacts are `release/StudyFlow-1.1.0-mac-arm64.dmg`, `release/StudyFlow-1.1.0-mac-arm64.zip`, `release/StudyFlow-1.1.0-win-x64.exe`, and `release/StudyFlow-1.1.0-win-x64.zip`, with hashes in `release/SHA256SUMS.txt`. DMG and ZIP integrity checks passed; both packaged archives contain the current production renderer, desktop code, version and licenses. The packaged Mac app passed the production login/sandbox scenario and was opened at Sign up for the user's live account test.

Earlier `StudyFlow-1.0.0-*` artifacts are the local-only release. Use `StudyFlow-1.1.0-*` artifacts for online accounts. Release folders, installed-app profiles, local settings, evidence and reference captures are ignored by Git.

Remaining external release work: custom SMTP/public email delivery; actual user acceptance across two computers; Windows execution; Intel Mac execution; code signing/notarization; and any desired cloud features beyond private account libraries. Hosted public search, collaboration, AI generation, social login, and Quizlet content import are not implemented.
