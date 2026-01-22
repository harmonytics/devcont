import { resolve, basename } from 'path';
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import chalk from 'chalk';
import { requireDockerCli, requireDevcontainer } from '../utils/cli.js';

// Default timeout for docker stop (in seconds)
const DOCKER_STOP_TIMEOUT = 10;
// Number of retries for transient Docker errors
const MAX_RETRIES = 3;
// Delay between retries (in milliseconds)
const RETRY_DELAY_MS = 1000;

/**
 * Check if an error is transient and can be retried
 * @param {string} stderr - Standard error output
 * @returns {boolean} - Whether the error is transient
 */
function isTransientError(stderr) {
  const transientPatterns = [
    'connection refused',
    'timeout',
    'temporary failure',
    'try again',
    'resource temporarily unavailable',
    'cannot connect to the docker daemon'
  ];
  const lowerStderr = stderr.toLowerCase();
  return transientPatterns.some(pattern => lowerStderr.includes(pattern));
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a docker command with retry logic for transient errors
 * @param {string[]} args - Docker command arguments
 * @param {number} [maxRetries=MAX_RETRIES] - Maximum number of retries
 * @returns {Promise<string>} - Command stdout trimmed
 * @throws {Error} If docker command fails after all retries
 */
async function runDockerCommand(args, maxRetries = MAX_RETRIES) {
  // Handle edge case of invalid maxRetries
  if (maxRetries < 1) {
    maxRetries = 1;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = spawnSync('docker', args, { encoding: 'utf-8' });

    if (result.error) {
      const error = new Error(`Failed to query Docker: ${result.error.message}`);
      if (attempt < maxRetries) {
        console.log(chalk.dim(`  Retrying (${attempt}/${maxRetries})...`));
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }

    if (result.status !== 0) {
      const stderr = (result.stderr || '').trim();

      // Check if this is a transient error worth retrying
      if (attempt < maxRetries && isTransientError(stderr)) {
        console.log(chalk.dim(`  Transient error, retrying (${attempt}/${maxRetries})...`));
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw new Error(`Docker command failed: ${stderr || `exit code ${result.status}`}`);
    }

    return (result.stdout || '').trim();
  }
}

/**
 * Find devcontainer containers for a workspace
 * Tries label-based lookup first, falls back to name matching
 * @param {string} folderPath - Workspace folder path
 * @returns {Promise<string[]>} - Array of container IDs
 * @throws {Error} If docker command fails
 */
async function findDevcontainers(folderPath) {
  // Try label-based lookup first (most reliable)
  const labelOutput = await runDockerCommand([
    'ps',
    '--filter', `label=devcontainer.local_folder=${folderPath}`,
    '-q'
  ]);

  if (labelOutput) {
    return labelOutput.split('\n').filter(Boolean);
  }

  // Fall back to name matching
  const psOutput = await runDockerCommand(['ps', '--format', '{{.ID}} {{.Names}}']);
  if (!psOutput) {
    return [];
  }

  const folderName = basename(folderPath).toLowerCase();
  const escapedName = folderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[_-])${escapedName}([_-]|$)`, 'i');

  return psOutput
    .split('\n')
    .filter(line => {
      if (!line) return false;
      const containerName = line.split(' ').slice(1).join(' ');
      return pattern.test(containerName);
    })
    .map(line => line.split(' ')[0])
    .filter(Boolean);
}

/**
 * Stop containers by their IDs with timeout
 * @param {string[]} containerIds - Array of container IDs to stop
 * @param {object} options - Options
 * @param {number} [options.timeout=DOCKER_STOP_TIMEOUT] - Timeout in seconds
 * @param {boolean} [options.dryRun=false] - If true, only print what would be done
 * @returns {Promise<boolean>} - True if all containers stopped successfully
 */
async function stopContainers(containerIds, options = {}) {
  const { timeout = DOCKER_STOP_TIMEOUT, dryRun = false } = options;

  console.log(chalk.blue(`Found ${containerIds.length} container(s) to stop`));
  let allSucceeded = true;

  for (const containerId of containerIds) {
    if (dryRun) {
      console.log(`  Would stop: ${chalk.cyan(containerId)} (timeout: ${timeout}s)`);
      continue;
    }

    console.log(`  Stopping: ${chalk.cyan(containerId)} (timeout: ${timeout}s)`);

    try {
      await runDockerCommand(['stop', '-t', String(timeout), containerId], 1);
    } catch (error) {
      // Check if container was already stopped (race condition)
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('no such container') || errorMsg.includes('is not running')) {
        console.log(chalk.dim(`  Container ${containerId} already stopped`));
      } else {
        console.warn(chalk.yellow(`  Warning: Failed to stop container ${containerId}: ${error.message}`));
        allSucceeded = false;
      }
    }
  }

  return allSucceeded;
}

/**
 * Stop the devcontainer
 * @param {string} folder - Project folder path
 * @param {object} options - Command options
 * @param {boolean} [options.dryRun=false] - If true, only print what would be done
 * @param {number} [options.timeout] - Timeout in seconds for docker stop
 */
export async function downCommand(folder = '.', options = {}) {
  const folderPath = resolve(folder);
  const { dryRun = false, timeout } = options;

  if (dryRun) {
    console.log(chalk.magenta('[DRY RUN] No changes will be made\n'));
  }

  console.log(chalk.blue('Stopping devcontainer...'));
  console.log(`  Workspace: ${chalk.cyan(folderPath)}`);

  requireDevcontainer(folderPath);
  requireDockerCli();

  // Check if docker-compose is used
  const devcontainerDir = resolve(folderPath, '.devcontainer');
  const composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  const composeFile = composeFiles.find(f => existsSync(resolve(devcontainerDir, f)));

  if (composeFile) {
    console.log(chalk.blue('\nUsing docker compose down...'));
    if (!dryRun) {
      // Use project name from parent folder (matches devcontainer CLI behavior)
      const projectName = `${basename(folderPath)}_devcontainer`;
      const result = spawnSync('docker', ['compose', '-p', projectName, 'down'], {
        cwd: devcontainerDir,
        stdio: 'inherit'
      });
      if (result.status === 0) {
        console.log(chalk.green('\nAll services stopped successfully!'));
        return;
      }
    } else {
      console.log(chalk.magenta('[DRY RUN] Would run: docker compose down'));
      return;
    }
  }

  console.log(chalk.blue('\nFinding running containers...'));

  let containerIds;
  try {
    containerIds = await findDevcontainers(folderPath);
  } catch (error) {
    console.error(chalk.red(`\nFailed to find containers: ${error.message}`));
    throw error;
  }

  if (containerIds.length === 0) {
    console.log(chalk.yellow('No running devcontainer found for this workspace'));
    return;
  }

  const stopOptions = { dryRun };
  if (timeout !== undefined) {
    stopOptions.timeout = timeout;
  }
  const allStopped = await stopContainers(containerIds, stopOptions);

  if (dryRun) {
    console.log(chalk.magenta('\n[DRY RUN] No containers were stopped'));
  } else if (allStopped) {
    console.log(chalk.green('\nDevcontainer stopped successfully!'));
  } else {
    console.log(chalk.yellow('\nDevcontainer stopped with some warnings.'));
  }
}
