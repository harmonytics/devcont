import { existsSync } from 'fs';
import { join } from 'path';
import { execFileSync, spawn } from 'child_process';
import chalk from 'chalk';

/**
 * Check if a CLI command is available in PATH
 * @param {string} command - Command name to check
 * @returns {boolean} - Whether the command is available
 */
function isCommandAvailable(command) {
  // Validate command name to prevent injection attempts
  if (!command || typeof command !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(command)) {
    return false;
  }
  const checkCmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    // Use execFileSync to avoid shell interpretation
    execFileSync(checkCmd, [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a CLI command is available, exit with error if not
 * @param {string} command - Command name to check
 * @param {string} installHint - Installation hint message
 */
function requireCommand(command, installHint) {
  if (!isCommandAvailable(command)) {
    console.error(chalk.red(`Error: ${command} CLI not found`));
    console.log(chalk.yellow(installHint));
    process.exit(1);
  }
}

/**
 * Ensure devcontainer CLI is available, exit with error if not
 */
export function requireDevcontainerCli() {
  requireCommand('devcontainer', 'Install it with: npm install -g @devcontainers/cli');
}

/**
 * Ensure Docker CLI is available, exit with error if not
 */
export function requireDockerCli() {
  requireCommand('docker', 'Please ensure Docker is installed and available in your PATH');
}

/**
 * Validate that a devcontainer exists in the given folder
 * @param {string} folderPath - Absolute path to the project folder
 * @param {string} [hint] - Optional hint message for how to fix
 */
export function requireDevcontainer(folderPath, hint) {
  const devcontainerPath = join(folderPath, '.devcontainer');
  if (!existsSync(devcontainerPath)) {
    console.error(chalk.red(`Error: No .devcontainer found in: ${folderPath}`));
    if (hint) {
      console.log(chalk.yellow(hint));
    }
    process.exit(1);
  }
}

/**
 * Run a command via spawn and return a promise
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {object} options - Spawn options
 * @returns {Promise<void>}
 */
export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });

    proc.on('close', (code, signal) => {
      if (code === 0) {
        return resolve();
      }
      const reason = signal ? `Process terminated by signal: ${signal}` : `Exit code: ${code}`;
      reject(new Error(reason));
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}
