# devcont

CLI for bootstrapping project-specific `.devcontainer` setups with sane defaults and Claude Code integration. The tool detects your tech stack, copies a bundled template (Python, Node, Go, Rust, generic, compose-aware, etc.), and optionally wires in Claude-specific mounts or legacy template sources.

## Features
- `devcont init` auto-detects stack + docker-compose usage and scaffolds `.devcontainer/` accordingly.
- Bundled template catalog (run `devcont templates` to inspect) plus `--template <id>` override support.
- Legacy `--source` flag to copy from an existing `.devcontainer` folder if you need full control.
- `devcont up|attach|down|shell` wrappers for the official Dev Containers CLI.

## Installation
```bash
npm install -g @devcontainers/cli
cd /path/to/devcont
npm install
npm install -g .
# or once published
npm install -g devcont
```

## Usage
```bash
# Initialize a repo with an auto-selected template
cd /path/to/project
devcont init

# Force a specific template
devcont init --template python-uv

# Specify compose service when your docker-compose has multiple entries
# (CLI prompts if omitted; `DEVCONT_NO_PROMPT=1` skips prompts)
devcont init --compose-service api

# Opt into Claude mounts or firewall hardening for non-Claude templates
devcont init --claude-mounts --firewall

# List bundled templates
devcont templates

# Legacy mode: copy from an existing template repo
devcont init --source ~/projects/custom-devcontainer
```

After initialization:
```bash
devcont up       # build+start container
devcont attach   # open shell inside
# or combine
devcont shell
```

## Templates
Template sources live under `templates/` with metadata in `templates/index.json`. See `docs/templates.md` for details on adding/modifying templates, compose behavior, and tests.

Preview: [asciinema demo](docs/media/devcont-node.cast) shows `devcont init --template node` creating a sandboxed `.devcontainer`.

## Development
- Requirements: Node.js 20+, npm.
- Run `npm test`, `npm run lint:templates`, `npm run spec` (requires `devcontainer` CLI), and `npm run smoke` (parallelized, tune via `SMOKE_MAX_WORKERS`) before sending changes.
- Follow the doc in `docs/devcontainer-template-plan.md` to evolve template architecture.

### CI / Automation
- Recommended GitHub Actions flow: `npm ci`, `npm run lint:templates`, `npm run smoke`, `npm test`. (Prompts are disabled automatically by setting `DEVCONT_NO_PROMPT=1`.)

### Legacy `--source`
`devcont init --source <path>` copies `.devcontainer/` from another repo (your previous Claude checkout, for example). When this flag is present we skip the bundled templates entirely and run the old “copy+patch” flow, so only use it if you truly need a custom template tree. Otherwise prefer the catalog via `--template`.

## License
MIT – see [LICENSE](LICENSE).
