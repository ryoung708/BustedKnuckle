# Contributing to IronKnuckle

IronKnuckle is a diagnostic and training product. A visual improvement is not complete if it quietly breaks a diagnostic workflow, a meter reading, a learning interaction, or another page.

## The build-and-protect workflow

1. Start from the latest `main` branch and make one focused feature or fix per branch.
2. Before editing, identify the existing pages, controls, calculations, and data paths the change could affect.
3. Reuse shared engines and helpers where possible. Keep calculation logic separate from page rendering and UI event handlers.
4. Add or update a regression test for every bug fixed and every important behavior introduced.
5. Run `npm test` before opening a pull request.
6. Open a pull request with the affected flows and test results described.
7. The **IronKnuckle Regression Gate** runs on every pull request. Fix failures before merging.
8. After merge, smoke-test the live site on desktop and mobile for the changed workflow.

## What the automated gate protects

- Diagnostic workflow progression, evidence capture, and completion rules.
- Electrical network calculations, voltage/resistance behavior, opens, shorts, and parallel paths.
- WiringHound decision logic.
- Four-stroke engine timing and training regressions.
- Chassis Lab controls and DOM references.
- JavaScript syntax in shipped source files and every inline script in shipped HTML pages.
- Local script references and key Learning Center system, AMT gear, and differential mode controls.

## Test commands

- `npm test` — run the complete regression suite.
- `npm run test:diagnostics` — diagnostic workflow engine.
- `npm run test:electrical` — electrical network calculations.
- `npm run test:decision` — WiringHound decision engine.
- `npm run test:training` — circuit, engine-cycle, Chassis Lab, J1939, and training checks.
- `npm run test:pages` — page/script integrity and Learning Center control checks.

## Pull-request quality checklist

- Preserve existing behavior unless the change intentionally replaces it.
- Test the changed feature and at least one neighboring workflow.
- Check desktop and narrow/mobile layouts when UI changes.
- Confirm buttons, tabs, selectors, reset actions, and navigation still work.
- Check the browser console for errors.
- Verify diagnostic values against known electrical/mechanical principles and the applicable OEM procedure; label conceptual training models honestly.
- Never turn an AI suggestion or an unverified technician observation into a confirmed repair fact.
- Call out any behavior that could not be tested. Never claim a browser test or live-site inspection that was not performed.

## Important limitation

Automated checks catch many regressions, not every visual, browser, or real-world diagnostic error. Human technician review and live smoke testing remain required for safety- and accuracy-critical changes. The repository's CI workflow runs the checks on every pull request; repository branch protection should require the regression status check before allowing merges.
