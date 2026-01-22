import chalk from 'chalk';
import { listTemplates } from '../templates/index.js';

/**
 * List bundled templates
 */
export function listTemplatesCommand() {
  const templates = listTemplates();
  if (templates.length === 0) {
    console.log(chalk.yellow('No templates found.'));
    return;
  }

  console.log(chalk.blue('Available templates:'));
  templates.forEach((tpl) => {
    console.log(`  ${chalk.green(tpl.id)} - ${tpl.label}`);
    if (tpl.description) {
      console.log(`      ${chalk.dim(tpl.description)}`);
    }
  });
}
