#!/usr/bin/env bash
set -euo pipefail
root_dir=$(cd "$(dirname "$0")/.." && pwd)
tmp_root=$(mktemp -d)
cleanup() {
  rm -rf "$tmp_root"
}
trap cleanup EXIT

if ! command -v devcontainer >/dev/null 2>&1; then
  echo "devcontainer CLI not installed; skipping spec validation"
  exit 0
fi

for dir in "$root_dir"/templates/*/ ; do
  [ -d "$dir" ] || continue
  if [ "$(basename "$dir")" = "_shared" ]; then
    continue
  fi
  echo "Validating template spec in $dir"
  workspace="$tmp_root/$(basename "$dir")"
  mkdir -p "$workspace/.devcontainer"
  cp -R "$dir"/. "$workspace/.devcontainer/"
  if ! devcontainer read-configuration --workspace-folder "$workspace" >"$workspace/out.log" 2>&1; then
    echo "Warning: devcontainer CLI failed to read configuration for $dir"
    cat "$workspace/out.log"
  fi
done
