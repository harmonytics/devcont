#!/usr/bin/env node
import { execFileSync } from 'child_process';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir, cpus } from 'os';

const manifest = JSON.parse(readFileSync(new URL('../templates/index.json', import.meta.url)));

function runInit(templateId) {
  const tmpDir = mkdtempSync(join(tmpdir(), `devcont-${templateId}-`));
  try {
    const args = ['bin/devcont.js', 'init', tmpDir, '--template', templateId, '--no-pull'];
    if (templateId === 'compose-multi') {
      args.push('--compose-service', 'app');
    }
    execFileSync('node', args, {
      stdio: 'ignore'
    });
    const devcontainerPath = join(tmpDir, '.devcontainer', 'devcontainer.json');
    if (!existsSync(devcontainerPath)) {
      throw new Error(`devcontainer.json missing for template ${templateId}`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

const maxWorkers = Number.parseInt(process.env.SMOKE_MAX_WORKERS || '', 10);
const cpuCount = cpus().length || 1;
const concurrency = Math.max(1, Math.min(maxWorkers || 4, cpuCount));
const queue = [...manifest.templates];

async function worker() {
  while (queue.length > 0) {
    const tpl = queue.shift();
    if (!tpl) break;
    runInit(tpl.id);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

console.log(`Smoke-tested ${manifest.templates.length} templates via devcont init.`);
