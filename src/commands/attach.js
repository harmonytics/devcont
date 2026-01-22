import { resolve } from 'path';
import chalk from 'chalk';
import {
  requireDevcontainerCli,
  requireDevcontainer,
  runCommand
} from '../utils/cli.js';

/**
 * Validate and sanitize command input
 * @param {string} command - Command to validate
 * @returns {string} - Validated command
 * @throws {Error} If command contains invalid characters
 */
function validateCommand(command) {
  // Allow only alphanumeric, dash, underscore, dot, slash, and space
  // This prevents shell injection while allowing common commands and paths
  if (!/^[a-zA-Z0-9_\-./\s]+$/.test(command)) {
    throw new Error(`Invalid command: contains disallowed characters`);
  }
  return command;
}

/**
 * Attach to a running devcontainer
 * @param {string} folder - Project folder path
 * @param {object} options - Command options
 */
export async function attachCommand(folder = '.', options = {}) {
  const folderPath = resolve(folder);
  const command = validateCommand(options.command || 'bash');

  console.log(chalk.blue('Attaching to devcontainer...'));
  console.log(`  Workspace: ${chalk.cyan(folderPath)}`);
  console.log(`  Command: ${chalk.cyan(command)}`);

  requireDevcontainer(folderPath);
  requireDevcontainerCli();

  try {
    await runCommand('devcontainer', [
      'exec',
      '--workspace-folder', folderPath,
      command
    ]);
  } catch (error) {
    console.error(chalk.red(`\nFailed to attach: ${error.message}`));
    throw error;
  }
}
