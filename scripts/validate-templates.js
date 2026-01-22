#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesRoot = join(__dirname, '..', 'templates');
const manifestPath = join(templatesRoot, 'index.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateTemplateEntry(entry) {
  const templateDir = join(templatesRoot, entry.path);
  const devcontainerPath = join(templateDir, 'devcontainer.json');
  const dockerfilePath = join(templateDir, 'Dockerfile');

  assert(statSync(templateDir).isDirectory(), `Template directory missing: ${templateDir}`);
  JSON.parse(readFileSync(devcontainerPath, 'utf-8'));
  const dockerfile = readFileSync(dockerfilePath, 'utf-8');
  assert(dockerfile.trim().length > 0, `Dockerfile empty for template ${entry.id}`);
}

function validateSharedAssets() {
  const sharedDir = join(templatesRoot, '_shared');
  const entries = readdirSync(sharedDir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.isFile()) {
      readFileSync(join(sharedDir, entry.name), 'utf-8');
    }
  });
}

function main() {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  assert(Array.isArray(manifest.templates), 'Manifest missing templates array');
  manifest.templates.forEach(validateTemplateEntry);
  validateSharedAssets();
  console.log(`Validated ${manifest.templates.length} templates.`);
}

main();
