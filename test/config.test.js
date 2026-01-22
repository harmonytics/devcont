import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import {
  addAgentsMount,
  generateUvDockerfile,
  generateUvDevcontainerJson,
  detectDockerCompose,
  parseComposeServices,
  configureDockerCompose,
  ensureZshInDockerfile
} from '../src/utils/config.js';

// Generate unique test directory names to avoid race conditions
let testCounter = 0;
function uniqueTestDir() {
  return join(tmpdir(), `devcont-test-${process.pid}-${Date.now()}-${testCounter++}`);
}

describe('addAgentsMount', () => {
  let testDir;
  let devcontainerJsonPath;

  beforeEach(() => {
    testDir = uniqueTestDir();
    mkdirSync(testDir, { recursive: true });
    devcontainerJsonPath = join(testDir, 'devcontainer.json');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should add agents and plugins mounts to devcontainer.json', () => {
    const config = {
      name: 'Test',
      remoteUser: 'node',
      mounts: []
    };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    addAgentsMount(devcontainerJsonPath);

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.strictEqual(result.mounts.length, 2);
    assert.ok(result.mounts[0].includes('.claude/agents'));
    assert.ok(result.mounts[1].includes('.claude/plugins'));
  });

  it('should not duplicate mounts if already present', () => {
    const homeDir = homedir();
    const config = {
      name: 'Test',
      remoteUser: 'node',
      mounts: [
        `source=${homeDir}/.claude/agents,target=/home/node/.claude/agents,type=bind`,
        `source=${homeDir}/.claude/plugins,target=/home/node/.claude/plugins,type=bind`
      ]
    };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    addAgentsMount(devcontainerJsonPath);

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.strictEqual(result.mounts.length, 2);
  });

  it('should create mounts array if not present', () => {
    const config = { name: 'Test', remoteUser: 'node' };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    addAgentsMount(devcontainerJsonPath);

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.ok(Array.isArray(result.mounts));
    assert.strictEqual(result.mounts.length, 2);
  });

  it('should use correct target path based on remoteUser', () => {
    const config = {
      name: 'Test',
      remoteUser: 'vscode',
      mounts: []
    };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    addAgentsMount(devcontainerJsonPath);

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.ok(result.mounts[0].includes('/home/vscode/.claude/agents'));
    assert.ok(result.mounts[1].includes('/home/vscode/.claude/plugins'));
  });
});

describe('generateUvDockerfile', () => {
  it('should generate valid Dockerfile with default options', () => {
    const dockerfile = generateUvDockerfile();
    assert.ok(dockerfile.includes('FROM ghcr.io/astral-sh/uv:python3.12-bookworm'));
    assert.ok(dockerfile.includes('npm install -g @anthropic-ai/claude-code'));
    assert.ok(dockerfile.includes('UV_LINK_MODE=copy'));
  });

  it('should use custom Python version', () => {
    const dockerfile = generateUvDockerfile({ pythonVersion: '3.11' });
    assert.ok(dockerfile.includes('FROM ghcr.io/astral-sh/uv:python3.11-bookworm'));
    assert.ok(dockerfile.includes('UV_PYTHON=python3.11'));
  });

  it('should handle backend folder configuration', () => {
    const dockerfile = generateUvDockerfile({ hasBackendFolder: true });
    assert.ok(dockerfile.includes('WORKDIR /workspace/backend'));
    assert.ok(dockerfile.includes('backend/pyproject.toml'));
  });
});

describe('generateUvDevcontainerJson', () => {
  it('should generate valid devcontainer.json', () => {
    const config = generateUvDevcontainerJson();
    assert.strictEqual(config.name, 'Claude Code Sandbox (Python UV)');
    assert.strictEqual(config.remoteUser, 'vscode');
    assert.ok(config.build.context === '..');
    assert.ok(Array.isArray(config.mounts));
  });

  it('should include agents and plugins mounts', () => {
    const config = generateUvDevcontainerJson();
    const mountsStr = config.mounts.join(' ');
    assert.ok(mountsStr.includes('.claude/agents'));
    assert.ok(mountsStr.includes('.claude/plugins'));
  });

  it('should include required VS Code extensions', () => {
    const config = generateUvDevcontainerJson();
    const extensions = config.customizations.vscode.extensions;
    assert.ok(extensions.includes('anthropic.claude-code'));
    assert.ok(extensions.includes('ms-python.python'));
    assert.ok(extensions.includes('charliermarsh.ruff'));
  });
});

describe('detectDockerCompose', () => {
  let testDir;

  beforeEach(() => {
    testDir = uniqueTestDir();
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should detect docker-compose.yml', () => {
    writeFileSync(join(testDir, 'docker-compose.yml'), 'version: "3"');
    const result = detectDockerCompose(testDir);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.file, 'docker-compose.yml');
  });

  it('should detect docker-compose.yaml', () => {
    writeFileSync(join(testDir, 'docker-compose.yaml'), 'version: "3"');
    const result = detectDockerCompose(testDir);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.file, 'docker-compose.yaml');
  });

  it('should detect compose.yml', () => {
    writeFileSync(join(testDir, 'compose.yml'), 'version: "3"');
    const result = detectDockerCompose(testDir);
    assert.strictEqual(result.found, true);
    assert.strictEqual(result.file, 'compose.yml');
  });

  it('should return not found when no compose file exists', () => {
    const result = detectDockerCompose(testDir);
    assert.strictEqual(result.found, false);
    assert.strictEqual(result.file, null);
  });

  it('should prefer docker-compose.yml over compose.yml', () => {
    writeFileSync(join(testDir, 'docker-compose.yml'), 'version: "3"');
    writeFileSync(join(testDir, 'compose.yml'), 'version: "3"');
    const result = detectDockerCompose(testDir);
    assert.strictEqual(result.file, 'docker-compose.yml');
  });
});

describe('parseComposeServices', () => {
  let testDir;

  beforeEach(() => {
    testDir = uniqueTestDir();
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should parse service names from docker-compose file', () => {
    const composeContent = `version: "3"
services:
  app:
    build: .
  db:
    image: postgres
`;
    writeFileSync(join(testDir, 'docker-compose.yml'), composeContent);
    const services = parseComposeServices(join(testDir, 'docker-compose.yml'));
    assert.deepStrictEqual(services, ['app', 'db']);
  });

  it('should handle hyphenated service names', () => {
    const composeContent = `services:
  my-app:
    build: .
  postgres-db:
    image: postgres
`;
    writeFileSync(join(testDir, 'docker-compose.yml'), composeContent);
    const services = parseComposeServices(join(testDir, 'docker-compose.yml'));
    assert.deepStrictEqual(services, ['my-app', 'postgres-db']);
  });

  it('should return empty array for invalid file', () => {
    const services = parseComposeServices(join(testDir, 'nonexistent.yml'));
    assert.deepStrictEqual(services, []);
  });

  it('should return empty array for file without services section', () => {
    const composeContent = `version: "3"
networks:
  default:
`;
    writeFileSync(join(testDir, 'docker-compose.yml'), composeContent);
    const services = parseComposeServices(join(testDir, 'docker-compose.yml'));
    assert.deepStrictEqual(services, []);
  });
});

describe('configureDockerCompose', () => {
  let testDir;
  let devcontainerJsonPath;

  beforeEach(() => {
    testDir = uniqueTestDir();
    mkdirSync(testDir, { recursive: true });
    devcontainerJsonPath = join(testDir, 'devcontainer.json');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should add dockerComposeFile and service properties', () => {
    const config = { name: 'Test', build: { dockerfile: 'Dockerfile' } };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    configureDockerCompose(devcontainerJsonPath, 'docker-compose.yml', 'app');

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.strictEqual(result.dockerComposeFile, 'docker-compose.yml');
    assert.strictEqual(result.service, 'app');
  });

  it('should remove build section when configuring docker-compose', () => {
    const config = { name: 'Test', build: { dockerfile: 'Dockerfile', context: '..' } };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    configureDockerCompose(devcontainerJsonPath, 'docker-compose.yml', 'app');

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.strictEqual(result.build, undefined);
  });

  it('should set default workspaceFolder if not present', () => {
    const config = { name: 'Test' };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    configureDockerCompose(devcontainerJsonPath, 'docker-compose.yml', 'app');

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.strictEqual(result.workspaceFolder, '/workspace');
  });

  it('should preserve existing workspaceFolder', () => {
    const config = { name: 'Test', workspaceFolder: '/app' };
    writeFileSync(devcontainerJsonPath, JSON.stringify(config));

    configureDockerCompose(devcontainerJsonPath, 'docker-compose.yml', 'app');

    const result = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    assert.strictEqual(result.workspaceFolder, '/app');
  });
});

describe('ensureZshInDockerfile', () => {
  let testDir;
  let dockerfilePath;

  beforeEach(() => {
    testDir = uniqueTestDir();
    mkdirSync(testDir, { recursive: true });
    dockerfilePath = join(testDir, 'Dockerfile');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should add zsh and Oh My Zsh to existing apt-get install', () => {
    const dockerfile = `FROM node:20
RUN apt-get update && apt-get install -y git \\
    && rm -rf /var/lib/apt/lists/*
`;
    writeFileSync(dockerfilePath, dockerfile);

    const modified = ensureZshInDockerfile(dockerfilePath);

    assert.strictEqual(modified, true);
    const result = readFileSync(dockerfilePath, 'utf-8');
    assert.ok(result.includes('zsh'));
    assert.ok(result.includes('ohmyzsh') || result.includes('oh-my-zsh'));
  });

  it('should not modify if zsh already present', () => {
    const dockerfile = `FROM node:20
RUN apt-get update && apt-get install -y git zsh curl
`;
    writeFileSync(dockerfilePath, dockerfile);

    const modified = ensureZshInDockerfile(dockerfilePath);

    assert.strictEqual(modified, false);
  });

  it('should add zsh and Oh My Zsh installation if no apt-get install found', () => {
    const dockerfile = `FROM python:3.12
WORKDIR /app
COPY . .
`;
    writeFileSync(dockerfilePath, dockerfile);

    const modified = ensureZshInDockerfile(dockerfilePath);

    assert.strictEqual(modified, true);
    const result = readFileSync(dockerfilePath, 'utf-8');
    assert.ok(result.includes('apt-get install'));
    assert.ok(result.includes('zsh'));
    assert.ok(result.includes('ohmyzsh') || result.includes('oh-my-zsh'));
  });

  it('should add SHELL env if not present', () => {
    const dockerfile = `FROM node:20
RUN apt-get update && apt-get install -y git
`;
    writeFileSync(dockerfilePath, dockerfile);

    ensureZshInDockerfile(dockerfilePath);

    const result = readFileSync(dockerfilePath, 'utf-8');
    assert.ok(result.includes('SHELL=/bin/zsh') || result.includes('SHELL /bin/zsh'));
  });

  it('should return false if Dockerfile does not exist', () => {
    const modified = ensureZshInDockerfile(join(testDir, 'nonexistent'));

    assert.strictEqual(modified, false);
  });
});
