# Reference observations and visual specification

## Evidence and scope

The first automated requests to quizlet.com, login and signup returned 403 responses. REA's browser capture rendered the site's security challenge. It was not bypassed. The initial custom dashboard was rejected by the user and replaced after directly inspecting the live site in the user's existing desktop Chrome session through Computer Use.

The authenticated session exposed Home, Your library, a study-set overview, dedicated Flashcards, Learn setup and its first question, Test setup, and the empty flashcard editor. Observations were read-only apart from entering a Learn session and temporarily toggling shuffle off/on; shuffle was restored to the observed off setting. No reference study content or source code was imported into StudyFlow. No cards were answered on the reference site, and no sets were saved or changed. No premium access restrictions were bypassed.

Native captures measured 3420×2148 physical pixels: a 1710×1074 logical window at device scale 2. The browser chrome occupied approximately 120 logical pixels; the visible app area was approximately 1710×954. Matched StudyFlow captures use a 1710×982 viewport, including its 28-pixel desktop title strip, leaving a 1710×954 app area.

Local reference images may contain personal account information and remain in the Git-ignored `evidence/private-reference/` directory. Only original StudyFlow screenshots are in `docs/screenshots/` and are packaged with these documents. Reproducible visual test screenshots also cover 1440×900, 1280×800, 768×1024 and 390×844.

## Measured appearance

These measurements are estimates from screenshots and visible interactions, not extracted proprietary CSS.

| Region              | Observed reference                                                        | StudyFlow implementation                                      |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Dark canvas         | RGB 10,9,43, dominant screenshot background                               | `#0a092b`                                                     |
| Card/search surface | RGB 49,56,84                                                              | `#313854`                                                     |
| Primary action      | Vivid indigo-blue                                                         | `#4255ff`                                                     |
| Secondary action    | Muted slate-blue                                                          | `#586380`                                                     |
| Header              | Roughly 64 px; integrated with canvas                                     | 68 px, plus a 28 px desktop drag strip                        |
| Expanded sidebar    | Roughly 232 px; icon and label rows                                       | 232 px, collapsing to 72 px                                   |
| Sidebar row         | Approximately 44 px                                                       | 44 px                                                         |
| Main header search  | Approximately 600×40 px                                                   | Maximum 600×40 px                                             |
| Feed                | Approximately 800 px wide, vertical cards                                 | Maximum 800 px wide                                           |
| Feed promotion      | Two columns, about 250 px tall, 24 px corners                             | Same layout, original artwork and local actions               |
| Library             | Pill categories, sort left/search right, dated wide rows                  | Same arrangement, local categories and dated rows             |
| Library row         | Roughly 78 px tall, small corners; metadata above title                   | 78 px minimum; metadata/title hierarchy                       |
| Study modes         | Dedicated screen; normal navigation removed                               | Dedicated full-window routes                                  |
| Flashcard           | Roughly 1024 px wide and up to 684 px tall                                | 1024 px maximum; height capped at 680 px                      |
| Flashcard controls  | Counts above; progress toggle left; recall buttons centre; shuffle right  | Same hierarchy and control placement                          |
| Learn               | Wide slate question panel, 2×2 outlined options; goal dialog first        | Same hierarchy; functional goal choice and adaptive session   |
| Test setup          | Roughly 640 px dialog; question count/direction above toggle rows         | 640 px dialog; same structure plus configurable order         |
| Editor              | Full-width work area; title/description; two-column card rows with images | Full-width work area, functional image inputs and local draft |
| Font                | Geometric, rounded sans with distinct weight hierarchy                    | Bundled OFL-licensed Nunito Sans; proprietary font not copied |
| Motion              | Subtle flips/selection feedback                                           | 150–200 ms feedback; reduced-motion preference respected      |

The user explicitly requested no advertisements or ad slots. A large blank region visible above the reference set overview was excluded. StudyFlow begins immediately under its header and centres study content without reserving an advertising column.

## Page specifications and differences

- **Home:** integrated sidebar/header and a vertically ordered feed with large two-column promotions and smaller horizontal set cards. Original local review/create/Match actions replace unavailable collaboration, podcast and remote recommendation promotions. No fabricated public sets.
- **Library:** prominent title, wrapping category pills, sort control, search, date labels with divider lines, full-width set rows. Existing local modes replace remote-only category destinations.
- **Set overview:** collapsed navigation, title/actions, three primary mode buttons, large card preview, game/Write links, creator information, actual progress and term list. Ad and remote-recommendation regions omitted.
- **Flashcards:** full-window activity header, title/progress, colour-coded learning counters, large central card, hint/audio/star controls and below-card recall buttons. Tracking can be disabled for arrow navigation. No advertisement space.
- **Learn:** goal dialog, segmented progress treatment, question label/prompt, 2×2 options, immediate feedback and written responses. Uses independently implemented adaptation rather than Quizlet's proprietary algorithm.
- **Test:** modal setup, real question data, grading/review and retakes. Setup options are usable without subscription gates.
- **Editor:** work area spans the window; title/description inputs precede numbered card surfaces. Term and definition inputs sit side by side, with actual local image inputs on the outside. Local-only visibility replaces public-sharing controls. The remote AI panel is omitted because no AI backend is connected.
- **Match:** the reference route loaded a blank white document in the available session. No visual-equivalence claim is made. Its independently implemented game follows the documented six-pair selection, timing and penalty behaviour.
- **Folders, search, settings, profile, statistics:** implemented with the same tokens and navigation conventions; detailed reference-page parity is unverified. Login/signup use honest local-profile explanations.

## Visual comparison checklist

- [x] Capture the accessible reference screens.
- [x] Measure logical viewport, header, sidebar, search and card proportions.
- [x] Sample actual background/surface colours.
- [x] Compare matched 1710-pixel app-area screenshots.
- [x] Replace initial custom dashboard, grid library and small flashcard proportions.
- [x] Verify navigation disappears in dedicated study activities.
- [x] Verify title/input hierarchy, category pills, date rows and progress controls.
- [x] Verify no reserved ad region remains.
- [x] Inspect desktop and narrow-window screenshots and check overflow automatically.
- [ ] Certify pixel-level identity for every screen and state.

No 90/100 visual-parity score is asserted. The remaining differences above, original typeface/artwork/content and inaccessible reference states make that precision unjustified. Screens without direct reference evidence are explicitly unverified. This report records observed similarities and limits instead of treating screenshots or passing tests as proof of exact identity.

## REA usage

The sibling `rea` checkout is a local reverse-engineering CLI/MCP project, not a study-app starter. Its README, package manifest, `AGENTS.md`, CLI, browser observation and browser scenario documentation were inspected. Its dependencies were installed and its documented `npm run build:cached` completed successfully without modifying tracked source.

Documented commands used:

```sh
node scripts/rea.mjs capture-browser-scenario /tmp/studyflow-reference.json --json
node scripts/rea.mjs capture-browser-scenario /tmp/studyflow-local.json --json
```

The reference scenario captured the access challenge at 1440×900. The local scenario captured the real StudyFlow home, accessibility tree and screenshot. Native Chrome Computer Use supplied accessible reference screens after automated access was restricted. Playwright supplied functional tests and local multi-viewport screenshots. REA was not used to extract Quizlet code or bypass access controls.
