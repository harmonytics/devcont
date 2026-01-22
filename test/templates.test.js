import { describe, it } from 'node:test';
import assert from 'node:assert';
import { loadTemplateManifest, selectTemplate, listTemplates, renderTemplate } from '../src/templates/index.js';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Template manifest', () => {
  it('loads templates from disk', () => {
    const manifest = loadTemplateManifest();
    assert.ok(Array.isArray(manifest.templates));
    assert.ok(manifest.templates.length > 0);
  });

  it('lists templates with labels and descriptions', () => {
    const templates = listTemplates();
    assert.ok(templates.some((tpl) => tpl.id === 'generic'));
    templates.forEach((tpl) => {
      assert.ok(tpl.label);
      assert.ok(tpl.description);
    });
  });
});

describe('Template selection', () => {
  it('selects python template for python projects', () => {
    const result = selectTemplate({ projectType: 'python' });
    assert.strictEqual(result.id, 'python');
  });

  it('prefers compose template when compose is detected', () => {
    const result = selectTemplate({ projectType: 'node', hasCompose: true });
    assert.strictEqual(result.id, 'compose-multi');
  });

  it('respects preferred template override', () => {
    const result = selectTemplate({ preferredTemplate: 'generic', projectType: 'python' });
    assert.strictEqual(result.id, 'generic');
  });

  it('throws for unknown preferred template', () => {
    assert.throws(() => selectTemplate({ preferredTemplate: 'does-not-exist' }));
  });
});

describe('Template rendering', () => {
  it('copies shared assets', () => {
    const dir = mkdtempSync(join(tmpdir(), 'devcont-render-'));
    try {
      renderTemplate('generic', dir);
      assert.ok(existsSync(join(dir, 'init-firewall.sh')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
