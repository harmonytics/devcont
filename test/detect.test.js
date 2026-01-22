import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { detectProjectType } from '../src/utils/detect.js';

// Generate unique test directory names to avoid race conditions
let testCounter = 0;
function uniqueTestDir() {
  return join(tmpdir(), `devcont-detect-${process.pid}-${Date.now()}-${testCounter++}`);
}

describe('detectProjectType', () => {
  let testDir;

  beforeEach(() => {
    testDir = uniqueTestDir();
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should detect Node.js project with package.json', () => {
    writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'node');
  });

  it('should detect Python project with pyproject.toml', () => {
    writeFileSync(join(testDir, 'pyproject.toml'), '[project]\nname = "test"');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'python');
  });

  it('should detect Python UV project with uv.lock', () => {
    writeFileSync(join(testDir, 'pyproject.toml'), '[project]\nname = "test"');
    writeFileSync(join(testDir, 'uv.lock'), '');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'python-uv');
  });

  it('should detect Python UV project with [tool.uv] section', () => {
    writeFileSync(join(testDir, 'pyproject.toml'), '[project]\nname = "test"\n\n[tool.uv]\ndev-dependencies = []');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'python-uv');
  });

  it('should detect Python project in backend folder', () => {
    mkdirSync(join(testDir, 'backend'));
    writeFileSync(join(testDir, 'backend', 'pyproject.toml'), '[project]\nname = "test"');
    writeFileSync(join(testDir, 'backend', 'uv.lock'), '');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'python-uv');
    assert.ok(result.details.pyprojectPath.includes('backend'));
  });

  it('should detect Go project with go.mod', () => {
    writeFileSync(join(testDir, 'go.mod'), 'module test');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'go');
  });

  it('should detect Rust project with Cargo.toml', () => {
    writeFileSync(join(testDir, 'Cargo.toml'), '[package]\nname = "test"');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'rust');
  });

  it('should return generic for unknown project type', () => {
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'generic');
  });

  it('should prioritize Python over Node.js when both exist', () => {
    writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');
    writeFileSync(join(testDir, 'pyproject.toml'), '[project]\nname = "test"');
    const result = detectProjectType(testDir);
    assert.strictEqual(result.type, 'python');
  });
});
