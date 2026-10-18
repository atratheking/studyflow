# Release instructions

1. Connect the backend using [online setup](ONLINE-SETUP.md). Run `npm ci`, `npm test`, `npm run test:auth`, `npm run test:e2e`, `npm run test:desktop`, `npm run test:desktop:online`, and `npm run build` on the target host. The final build must use normal production mode and the intended public Supabase settings.
2. Update the version in package.json and regenerate the lockfile when changing releases.
3. Run `npm run dist:mac` on macOS or `npm run dist:win` on Windows. The workflow also builds macOS arm64/x64 and Windows x64.
4. Test the packaged app from the generated archive on clean machines, including create/save/quit/reopen and backup/restore.
5. Upload the desired archives/installers to your own GitHub release. Build output is intentionally excluded from source control.

## Signing

The supplied workflow disables automatic certificate discovery and produces unsigned test artifacts. It has read-only repository permissions and does not publish releases. Do not describe these as signed or notarized.

For distribution, configure [electron-builder code signing](https://www.electron.build/code-signing.html) using your own protected CI secrets. macOS notarization needs an Apple Developer identity and Apple credentials/API key. Windows signing needs a valid code-signing identity or service. Enable the corresponding signing/notarization settings only when these credentials are configured. Never commit certificates or private keys.

A Windows installer and ZIP can be assembled on macOS with `npx electron-builder --win nsis zip --x64 -c.win.signExecutable=false --publish never`. Such a cross-built executable has not thereby been executed or tested on Windows. This keeps icon and version resources while skipping code signing. Windows CI should run the final runtime checks.

## Data and upgrades

Packaged applications load bundled content from `studyflow://app` and store IndexedDB in Electron's per-user profile. Keep `appId`, `productName`, custom origin and database name stable to preserve the library. Back up using Settings before changing those identifiers. Schema version 1 rejects malformed/incompatible backups and does not silently reset corrupt persisted libraries.

No development server or privileged API secret is needed in a packaged build. Internet access and the configured Supabase service are required for account access and cloud saving. Email confirmation remains enabled; public email delivery needs custom SMTP and is deferred in the current connected project. Text-to-speech depends on available system voices.

Version 1.0 release files are the earlier local-only build. Use version 1.1 or later for online accounts. GitHub Actions repository variables supply the public project URL and publishable key. Never distribute an explicit `study-test` fixture build; the workflow rebuilds production after fixture checks.
