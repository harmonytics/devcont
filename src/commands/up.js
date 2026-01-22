import { resolve } from 'path';
import chalk from 'chalk';
import {
  requireDevcontainerCli,
  requireDevcontainer,
  runCommand
} from '../utils/cli.js';

/**
 * Build and start the devcontainer
 * @param {string} folder - Project folder path
 * @param {object} options - Command options
 * @param {boolean} [options.dryRun=false] - If true, only print what would be done
 */
export async function upCommand(folder = '.', options = {}) {
  const folderPath = resolve(folder);
  const { dryRun = false } = options;

  if (dryRun) {
    console.log(chalk.magenta('[DRY RUN] No changes will be made\n'));
  }

  console.log(chalk.blue('Starting devcontainer...'));
  console.log(`  Workspace: ${chalk.cyan(folderPath)}`);

  requireDevcontainer(folderPath, 'Run "devcont init" first to initialize the devcontainer');
  requireDevcontainerCli();

  if (dryRun) {
    console.log(chalk.blue('\nWould run:'));
    console.log(chalk.dim(`  devcontainer up --workspace-folder ${folderPath}`));
    console.log(chalk.magenta('\n[DRY RUN] No container was started'));
    return;
  }

  console.log(chalk.blue('\nBuilding and starting container...'));

  try {
    await runCommand('devcontainer', ['up', '--workspace-folder', folderPath]);
    console.log(chalk.green('\nDevcontainer started successfully!'));
  } catch (error) {
    console.error(chalk.red(`\nDevcontainer failed to start (${error.message})`));
    throw error;
  }
}
