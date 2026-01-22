# Bundled Devcontainer Templates

The CLI now ships a catalog of devcontainer templates under `templates/`. Highlights:

- **Auto-selection**: `devcont init` detects the project stack via `detectProjectType()` and chooses an appropriate template (Python, Node, Go, Rust, generic). If a `docker-compose.*` file exists at the project root, the tool now configures the generated `devcontainer.json` to reference that file directly.
- **Override support**: pass `--template <id>` to force a specific template (see `templates/index.json` for IDs or run `devcont templates`). `--compose-service <name>` lets you pick which service to launch when multiple are defined; if omitted and multiple services exist, the CLI will prompt interactively (set `DEVCONT_NO_PROMPT=1` to skip prompts in CI).
- **Special cases**: `python-uv` continues to use the dynamic UV generator but now sources its helper scripts from the bundled template directory instead of an external repo.
- **Manifest + tests**: `src/templates/index.js` loads `templates/index.json` and powers selection logic. `test/templates.test.js` covers manifest parsing and selection edge cases.

Run `devcont templates` to print the catalog and descriptions.

## Template details

- `node`: mirrors `/Users/emre.aladag/projects/claude-code/.devcontainer` (Node 20 base, Claude Code preinstalled, firewall script run on `postStart`).
- `python`: based on [uv's Docker integration guide](https://docs.astral.sh/uv/guides/integration/docker/). Copies `pyproject.toml`/`uv.lock` into the build context and runs `uv sync` to hydrate `/workspace/.venv`.
- `go`/`rust`: provide dedicated images (`golang:<version>` and `mcr.microsoft.com/devcontainers/rust`) with delve/rustfmt/clippy installed and VS Code extensions preconfigured.
- `generic`: Ubuntu base with common tools/zsh for projects that don't map to a known stack.

Example (Node template excerpt):

```json
{
  "name": "Claude Code Sandbox",
  "build": { "dockerfile": "Dockerfile", "args": { "CLAUDE_CODE_VERSION": "latest" } },
  "postStartCommand": "sudo /usr/local/bin/init-firewall.sh",
  "customizations": { "vscode": { "extensions": ["anthropic.claude-code", "esbenp.prettier-vscode"] } }
}
```

Example (Python/uv Dockerfile excerpt):

```Dockerfile
ARG PYTHON_VERSION=3.12
FROM ghcr.io/astral-sh/uv:python${PYTHON_VERSION}-bookworm
COPY --chown=vscode:vscode pyproject.toml* uv.lock* ./
RUN --mount=type=cache,target=/home/vscode/.cache/uv \
    uv sync --frozen --no-install-project || uv sync --no-install-project
```

## Shared assets & optional hooks

Common helper scripts live under `templates/_shared`. Currently this houses `init-firewall.sh`, which is copied into every rendered template (without overwriting template-specific files). Templates can rely on `/usr/local/bin/init-firewall.sh` existing if they opt into `postStartCommand`.

`devcont init --firewall` enforces that `devcontainer.json` runs the firewall script via `postStartCommand`, even for templates that do not include it by default.

`devcont init --claude-mounts` augments the generated `devcontainer.json` with the Claude agents/plugins bind mounts via `addAgentsMount`.

### Visual demos
- Record template init flows using [asciinema](https://asciinema.org/): `asciinema rec docs/media/node-init.cast` while running `devcont init` for a sample repo.
- For screenshots, capture `.devcontainer/` structure and VS Code extension recommendations after init; store assets under `docs/media/` and reference them from README/docs once available.

### Legacy `--source`

If you still need to copy from a custom `.devcontainer` repo, pass `--source <path>`. This bypasses template detection entirely and retains the historical copy-from-source + patch flow. Use sparingly; the bundled templates are the preferred path.

## Adding or Updating Templates
1. Create/modify files under `templates/<name>/`.
2. Update `templates/index.json` with metadata (`id`, `label`, `description`, language tags).
3. Run `npm test`, `npm run lint:templates`, `npm run spec` (requires `@devcontainers/cli`), and `npm run smoke` to ensure templates render end-to-end.
4. (Upcoming) update any renderer/selector tests that assert on available template IDs.

Future work: integrate compose detection, expose `devcont templates list`, and add richer docs/README examples once templates stabilize.
- Smoke tests run templates in parallel (default max 4 workers, respecting CPU count). Set `SMOKE_MAX_WORKERS` to tune concurrency locally/CI.
