import { readFileSync, cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = join(__dirname, '../../templates');
const MANIFEST_PATH = join(TEMPLATE_ROOT, 'index.json');
const SHARED_ROOT = join(TEMPLATE_ROOT, '_shared');

let cachedManifest = null;

/**
 * Load and cache the template manifest
 * @returns {{ version: number, templates: object[] }}
 */
export function loadTemplateManifest() {
  if (cachedManifest) {
    return cachedManifest;
  }

  const content = readFileSync(MANIFEST_PATH, 'utf-8');
  cachedManifest = JSON.parse(content);
  return cachedManifest;
}

/**
 * Resolve template directory path from manifest entry
 * @param {string} templateId
 * @returns {string}
 */
export function resolveTemplateDir(templateId) {
  const manifest = loadTemplateManifest();
  const entry = manifest.templates.find((tpl) => tpl.id === templateId);
  if (!entry) {
    throw new Error(`Template not found: ${templateId}`);
  }
  return join(TEMPLATE_ROOT, entry.path);
}

export function copySharedAssets(targetDir) {
  if (!existsSync(SHARED_ROOT)) {
    return;
  }
  cpSync(SHARED_ROOT, targetDir, { recursive: true, force: false });
}

/**
 * Copy template contents into target directory
 * @param {string} templateId
 * @param {string} targetDir
 */
export function renderTemplate(templateId, targetDir) {
  const templateDir = resolveTemplateDir(templateId);
  mkdirSync(targetDir, { recursive: true });
  cpSync(templateDir, targetDir, { recursive: true });
  copySharedAssets(targetDir);
}

const TYPE_TO_TEMPLATE = {
  'fullstack': 'fullstack',
  'python-uv': 'python-uv',
  python: 'python',
  node: 'node',
  go: 'go',
  rust: 'rust'
};

/**
 * Select a template based on project info and options
 * @param {object} params
 * @param {string} [params.preferredTemplate]
 * @param {string} [params.projectType]
 * @param {boolean} [params.hasCompose]
 * @returns {{ id: string, entry: object }}
 */
export function selectTemplate({ preferredTemplate, projectType, hasCompose } = {}) {
  const manifest = loadTemplateManifest();

  if (preferredTemplate) {
    const entry = manifest.templates.find((tpl) => tpl.id === preferredTemplate);
    if (!entry) {
      throw new Error(`Unknown template: ${preferredTemplate}`);
    }
    return { id: entry.id, entry };
  }

  if (hasCompose) {
    const composeEntry = manifest.templates.find((tpl) => tpl.id === 'compose-multi');
    if (composeEntry) {
      return { id: composeEntry.id, entry: composeEntry };
    }
  }

  const mappedId = TYPE_TO_TEMPLATE[projectType] || 'generic';
  const fallback = manifest.templates.find((tpl) => tpl.id === mappedId)
    || manifest.templates.find((tpl) => tpl.id === 'generic');

  if (!fallback) {
    throw new Error('No valid templates available in manifest');
  }

  return { id: fallback.id, entry: fallback };
}

/**
 * List templates from manifest with basic info
 * @returns {Array<{ id: string, label: string, description: string }>}
 */
export function listTemplates() {
  const manifest = loadTemplateManifest();
  return manifest.templates.map(({ id, label, description }) => ({ id, label, description }));
}
