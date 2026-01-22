# Devcontainer Template Bundling Plan

## Objectives
- Ship usable `.devcontainer` templates with the CLI so `devcont init` works anywhere without depending on `${HOME}/projects/claude-code`.
- Detect the project tech stack and automatically pick an appropriate Dockerfile/devcontainer pair while allowing manual overrides.
- Keep host-specific customizations (Claude mounts, compose tweaks, firewall scripts) as optional post-processors rather than baked into every template.

## Template Catalog & Layout (Phase 0 Output)
- **Initial template list**
  - `python-uv`: UV-based Python image with Claude tooling and optional firewall helpers.
  - `python`: Standard Python image with pip/venv tooling for repos that are not on UV.
  - `node`: Node.js template that supports npm/yarn/pnpm workflows.
  - `go`: Go template triggered when `go.mod` exists.
  - `rust`: Rust template triggered when `Cargo.toml` exists.
  - `compose-multi`: Minimal template that expects an existing docker-compose file and wires it into devcontainer.json.
  - `generic`: Fallback when no stack is detected.
- **Directory layout**
  - `templates/`
    - `index.json` – manifest with metadata (`name`, `description`, `languages`, `supportsCompose`, defaults, feature flags).
    - `<template-name>/` – contains `devcontainer.json`, `Dockerfile`, optional `docker-compose.yml`, helper scripts, and a short README snippet.
    - `_shared/` – shared assets (firewall script, VS Code settings fragments) referenced by multiple templates.
- **Naming conventions**
  - Directory names and manifest `name` use kebab-case (`python-uv`).
  - Manifest `id` doubles as the CLI flag (`devcont init --template python-uv`).
  - Tests reference templates through the manifest to avoid hardcoded paths.
- **Current status**
  - Initial directories and placeholder files now live in `templates/`.
  - `templates/index.json` tracks the catalog listed above and will evolve with future templates.

## Proposed Architecture
1. **Template inventory**
   - Add `templates/<name>/` directories to this repo (`templates/python-uv`, `templates/python`, `templates/node`, `templates/generic`, etc.).
   - Each template includes everything needed for a project: `devcontainer.json`, `Dockerfile`, optional `docker-compose.yml`, helper scripts, and README snippets explaining its intent.
2. **Template manifest**
   - Create `templates/index.json` (or `.yaml`) describing each template: `name`, `description`, `supports`, `defaultImage`, `supportsCompose`, `features`.
   - Manifest powers CLI help (`devcont templates list`) and the automatic selector.
3. **Detection & selection**
   - Extend `detectProjectType()` to emit richer metadata: language, dependency files, compose presence, backend directory info.
   - Implement `selectTemplate(projectInfo, flags)` that chooses a template by priority (explicit `--template`, then manifest matches, then fallback to `generic`).
4. **Rendering**
   - Implement a minimal renderer that copies files from the template directory into `<target>/.devcontainer/` and performs token replacement (e.g., `{{workspaceFolder}}`).
   - No heavy templating engine initially; if placeholders get elaborate, introduce a tiny dependency like `eta` later.
5. **Post-processors**
   - Keep features such as Claude mounts, compose wiring, or firewall script copies as opt-in modules executed after template rendering. Example: `applyAgentsMountWhenRequested(configPath, flags)`.

## Development Phases
### Phase 0 – Groundwork
- Document the expected template list and gather current `.devcontainer` content from `claude-code` that will be migrated into this repository.
- Decide naming conventions and folder layout in `templates/`.

### Phase 1 – Template Packaging
- Create baseline templates: start with `python-uv` (full feature), `python` (non-UV), `node`, and `generic`.
- Normalize the files (Dockerfile, devcontainer.json, compose) so paths use placeholders where necessary.
- Author the manifest file with metadata for each template.

### Phase 2 – Detection Enhancements
- Update `src/utils/detect.js` to return `kind`, `details`, and booleans like `hasCompose`, `hasBackendSubdir`, `hasClaudeConfig`.
- Add detection for existing docker-compose files at the project root so we can choose templates that rely on compose.
- Write tests covering the richer detection surface.

### Phase 3 – Template Selection API
- Build `selectTemplate(projectInfo, options, manifest)` in a new module (e.g., `src/templates/selector.js`).
- Implement CLI flags: `devcont init --template <name>` and maybe `--list-templates`.
- Update `initCommand` to rely on the selector rather than hardcoded `python-uv` vs `generic` branching.

### Phase 4 – Rendering & Post-Processing
- Implement `renderTemplate(templateName, targetPath, tokens)` that copies template files and replaces tokens such as workspace folder or container username.
- Move Claude-specific mounts, compose configuration, and firewall script handling into separate helper functions triggered by flags (`--include-claude`, `--copy-firewall`, etc.). Default to off to keep OSS users safe.
- Ensure rendering is idempotent: warn before overwriting existing `.devcontainer/` contents and support `--force`.

### Phase 5 – Testing & Documentation
- Add unit tests for selector, renderer, and manifest parsing. Include fixture templates under `test/fixtures/templates` to avoid duplicating production files.
- Document the workflow in `README.md`: installation, template list, detection order, override flags, and how to author new templates.
- Provide contribution guidelines for template updates (linting, validation script, how to preview changes).
- Prepare visual/demo assets (asciinema recordings, screenshots) demonstrating `devcont init` for key templates.

## Deliverables & Milestones
- `templates/` directory with manifest and initial template set.
- Updated CLI (`devcont init`, `devcont templates` listing, selectors, renderer) plus tests in `test/templates/*.test.js`.
- Documentation: README section, `docs/devcontainer-template-plan.md` (this file), and a CONTRIBUTING guide focused on templates.
- Optional: CI job that lints every template by running `npm run lint:templates` (manifest/Dockerfile checks), `npm run spec` (requires `devcontainer` CLI), and `npm run smoke` (invokes `devcont init` per template, parallelized via `SMOKE_MAX_WORKERS`) to prevent drift. Add `DEVCONT_NO_PROMPT=1` in CI to disable compose prompts.

## Open Questions / Follow-ups
- Do we need a mechanism to fetch templates from remote releases in addition to bundling? If yes, document trust model and update path.
- Should we allow user-provided templates (e.g., `devcont init --template-url <zip>`)? Defer until bundled workflow is stable.
- How will versioning interact with npm releases? Consider exposing template version in the manifest so `devcont --version` reports both CLI and templates.
