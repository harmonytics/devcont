#!/usr/bin/env node

import { createRequire } from 'module';
import { program } from 'commander';
import { initCommand } from '../src/commands/init.js';
import { upCommand } from '../src/commands/up.js';
import { attachCommand } from '../src/commands/attach.js';
import { downCommand } from '../src/commands/down.js';
import { listTemplatesCommand } from '../src/commands/templates.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/**
 * Parse and validate timeout value
 * @param {string} value - The timeout value from CLI
 * @returns {number} - Validated timeout in seconds
 */
function parseTimeout(value) {
  const timeout = parseInt(value, 10);
  if (isNaN(timeout) || timeout <= 0) {
    console.error(`Error: Invalid timeout value "${value}". Must be a positive integer.`);
    process.exit(1);
  }
  return timeout;
}

program
  .name('devcont')
  .description('CLI tool for devcontainerizing projects with Claude Code support')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize devcontainer in a project folder')
  .argument('[target]', 'Target folder to devcontainerize', '.')
  .option('--source <path>', 'Legacy source devcontainer path (overrides bundled templates)')
  .option('--no-pull', 'Skip git pull on source repository')
  .option('--template <id>', 'Bundled template id to use (default auto-detect)')
  .option('--compose-service <name>', 'Service name to use when docker-compose has multiple services')
  .option('--claude-mounts', 'Bind mount ~/.claude/* into the container')
  .option('--firewall', 'Add init-firewall.sh hook to the devcontainer')
  .option('--dry-run', 'Preview changes without making them')
  .action(initCommand);

program
  .command('up')
  .description('Build and start the devcontainer')
  .argument('[folder]', 'Project folder with devcontainer', '.')
  .option('--dry-run', 'Preview changes without making them')
  .action(upCommand);

program
  .command('attach')
  .description('Attach to a running devcontainer')
  .argument('[folder]', 'Project folder with devcontainer', '.')
  .option('-c, --command <cmd>', 'Command to run', 'bash')
  .action(attachCommand);

program
  .command('down')
  .description('Stop the devcontainer')
  .argument('[folder]', 'Project folder with devcontainer', '.')
  .option('--dry-run', 'Preview changes without making them')
  .option('-t, --timeout <seconds>', 'Timeout for stopping containers', parseTimeout)
  .action(downCommand);

program
  .command('shell')
  .description('Start devcontainer and attach in one command')
  .argument('[folder]', 'Project folder with devcontainer', '.')
  .action(async (folder) => {
    try {
      await upCommand(folder);
      await attachCommand(folder, { command: 'bash' });
    } catch (error) {
      console.error(`Shell command failed: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('templates')
  .description('List bundled devcontainer templates')
  .action(listTemplatesCommand);

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (error) => {
  console.error(`Error: ${error.message || error}`);
  process.exit(1);
});

program.parse();
