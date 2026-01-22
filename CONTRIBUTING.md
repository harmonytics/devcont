# Contributing to devcont

First off, thanks for taking the time to help! This guide explains how to get set up, run tests, and work with the bundled template system.

## Getting Started
1. Fork + clone the repo.
2. Install dependencies: `npm install`.
3. Make sure you have Node.js 20+ and Docker if you plan to exercise the CLI manually.

## Development Workflow
- Use topic branches for each change.
- Keep commits focused; include tests/docs updates when applicable.
- Run `npm test`, `npm run lint:templates`, and `npm run smoke` before submitting a PR.

## Template Changes
Templates live under `templates/` with metadata in `templates/index.json`.
- Add/edit files inside `templates/<template-id>/`.
- Update `templates/index.json` to describe new templates.
- Run `npm test` to validate the manifest/selector tests.
- Document notable changes in `docs/templates.md` if behavior shifts.

## CLI Changes
- Add tests in `test/` (Node `node:test` runner).
- Avoid hardcoding paths outside the repo; use the template manifest/helpers.
- When changing command-line behavior, update the README and `docs/templates.md` as needed.

## Pull Requests
- Describe the motivation and testing results in the PR body.
- Reference related issues if applicable.
- Expect at least one reviewer approval before merging.

## Code of Conduct
Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
