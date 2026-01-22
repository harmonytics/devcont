import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { detectProjectType } from '../utils/detect.js';
import {
  addAgentsMount,
  generateUvDockerfile,
  generateUvDevcontainerJson,
  detectDockerCompose,
  parseComposeServices,
  configureDockerCompose,
  ensureZshInDockerfile
} from '../utils/config.js';
import { selectTemplate, renderTemplate, resolveTemplateDir, copySharedAssets, loadTemplateManifest } from '../templates/index.js';

/**
 * Exit with an error message and optional hint
 * @param {string} message - Error message
 * @param {string} [hint] - Optional hint for resolution
 */
function exitWithError(message, hint) {
  console.error(chalk.red(`Error: ${message}`));
  if (hint) {
    console.log(chalk.yellow(hint));
  }
  process.exit(1);
}

/**
 * Validate all required paths exist and are valid
 * @param {string} source - Source path from options
 * @param {string} targetPath - Target folder path
 * @param {string} sourceDevcontainer - Source devcontainer path
 */
function validatePaths(source, targetPath, sourceDevcontainer) {
  if (!source || source.includes('undefined')) {
    exitWithError(
      'Source path is invalid. HOME environment variable may not be set.',
      'Use --source <path> to specify the source devcontainer path explicitly.'
    );
  }
  if (!existsSync(targetPath)) {
    exitWithError(`Target folder does not exist: ${targetPath}`);
  }
  if (!existsSync(sourceDevcontainer)) {
    exitWithError(`Source devcontainer not found at: ${sourceDevcontainer}`);
  }
}

/**
 * Pull latest changes from source repository
 * @param {string} sourcePath - Source repository path
 */
function pullSourceRepository(sourcePath) {
  console.log(chalk.blue('\nUpdating source repository...'));
  try {
    execSync('git pull', { cwd: sourcePath, stdio: 'inherit' });
  } catch {
    console.warn(chalk.yellow('Warning: git pull failed, continuing with existing files'));
  }
}

/**
 * Set up UV-based Python devcontainer
 * @param {string} targetDevcontainer - Target devcontainer path
 * @param {string} sourceDevcontainer - Source devcontainer path
 * @param {object} projectInfo - Project detection info
 */
function setupUvDevcontainer(targetDevcontainer, sourceDevcontainer, projectInfo) {
  console.log(chalk.blue('\nGenerating UV-based Python devcontainer...'));

  const hasBackendFolder = projectInfo.details.pyprojectPath?.includes('/backend/');

  // Generate Dockerfile
  const dockerfile = generateUvDockerfile({ hasBackendFolder, pythonVersion: '3.12' });
  writeFileSync(join(targetDevcontainer, 'Dockerfile'), dockerfile);
  console.log(`  Created: ${chalk.green('Dockerfile')}`);

  // Generate devcontainer.json
  const devcontainerJson = generateUvDevcontainerJson();
  writeFileSync(
    join(targetDevcontainer, 'devcontainer.json'),
    JSON.stringify(devcontainerJson, null, 2) + '\n'
  );
  console.log(`  Created: ${chalk.green('devcontainer.json')}`);

  // Copy firewall script if it exists
  if (sourceDevcontainer) {
    const firewallScriptPath = join(sourceDevcontainer, 'init-firewall.sh');
    if (existsSync(firewallScriptPath)) {
      cpSync(firewallScriptPath, join(targetDevcontainer, 'init-firewall.sh'));
      console.log(`  Copied: ${chalk.green('init-firewall.sh')}`);
    }
  }

  copySharedAssets(targetDevcontainer);
}

function enableFirewallHook(targetDevcontainer) {
  const devcontainerJsonPath = join(targetDevcontainer, 'devcontainer.json');
  if (!existsSync(devcontainerJsonPath)) {
    console.warn(chalk.yellow('  Warning: devcontainer.json not found for firewall hook'));
    return;
  }
  try {
    const config = JSON.parse(readFileSync(devcontainerJsonPath, 'utf-8'));
    config.postStartCommand = 'sudo /usr/local/bin/init-firewall.sh';
    config.waitFor = config.waitFor || 'postStartCommand';
    writeFileSync(devcontainerJsonPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`  Updated: ${chalk.green('devcontainer.json')} (firewall hook)`);
  } catch (error) {
    console.warn(chalk.yellow(`  Warning: failed to enable firewall hook (${error.message})`));
  }
}

/**
 * Set up generic devcontainer by copying from source
 * @param {string} targetDevcontainer - Target devcontainer path
 * @param {string} sourceDevcontainer - Source devcontainer path
 */
function setupGenericDevcontainer(targetDevcontainer, sourceDevcontainer) {
  console.log(chalk.blue('\nCopying devcontainer files...'));
  cpSync(sourceDevcontainer, targetDevcontainer, { recursive: true });

  const devcontainerJsonPath = join(targetDevcontainer, 'devcontainer.json');
  addAgentsMount(devcontainerJsonPath);
  console.log(`  Updated: ${chalk.green('devcontainer.json')} (added agents mount)`);

  // Ensure zsh and Oh My Zsh are installed in the Dockerfile
  const dockerfilePath = join(targetDevcontainer, 'Dockerfile');
  if (ensureZshInDockerfile(dockerfilePath)) {
    console.log(`  Updated: ${chalk.green('Dockerfile')} (added zsh + Oh My Zsh)`);
  }
}

/**
 * Check for docker-compose and configure if found
 * @param {string} targetDevcontainer - Target devcontainer path
 * @returns {{ configured: boolean, file: string | null, service: string | null }}
 */
function handleDockerCompose(targetDevcontainer) {
  const compose = detectDockerCompose(targetDevcontainer);

  if (!compose.found) {
    return { configured: false, file: null, service: null };
  }

  console.log(chalk.blue('\nDetected docker-compose configuration...'));
  console.log(`  Found: ${chalk.green(compose.file)}`);

  // Parse services from the compose file
  const composePath = join(targetDevcontainer, compose.file);
  const services = parseComposeServices(composePath);

  if (services.length === 0) {
    console.warn(chalk.yellow('  Warning: No services found in docker-compose file'));
    return { configured: false, file: compose.file, service: null };
  }

  // Use first service as default (typically 'app' or main service)
  const serviceName = services[0];
  console.log(`  Services: ${chalk.cyan(services.join(', '))}`);
  console.log(`  Using: ${chalk.green(serviceName)} as primary service`);

  // Configure devcontainer.json for docker-compose
  const devcontainerJsonPath = join(targetDevcontainer, 'devcontainer.json');
  configureDockerCompose(devcontainerJsonPath, compose.file, serviceName);
  console.log(`  Updated: ${chalk.green('devcontainer.json')} (configured for docker-compose)`);

  return { configured: true, file: compose.file, service: serviceName };
}

/**
 * Configure devcontainer to use compose file from project root
 * @param {string} targetDevcontainer
 * @param {string} projectPath
 * @param {{ found: boolean, file: string | null }} composeDetection
 */
async function configureProjectCompose(targetDevcontainer, projectPath, composeDetection, options = {}) {
  if (!composeDetection?.found || !composeDetection.file) {
    return { configured: false, file: null, service: null };
  }

  console.log(chalk.blue('\nDetected project docker-compose configuration...'));
  console.log(`  Found: ${chalk.green(join(projectPath, composeDetection.file))}`);

  const composePath = join(projectPath, composeDetection.file);
  const services = parseComposeServices(composePath);

  if (services.length === 0) {
    console.warn(chalk.yellow('  Warning: No services found in docker-compose file'));
    return { configured: false, file: composeDetection.file, service: null };
  }

  let serviceName = options.composeService;
  if (serviceName && !services.includes(serviceName)) {
    throw new Error(`Service "${serviceName}" not found in docker-compose file. Available: ${services.join(', ')}`);
  }

  if (!serviceName) {
    if (!options.nonInteractive && services.length > 1) {
      serviceName = await promptForService(services);
    }
    if (!serviceName) {
      serviceName = services[0];
      if (services.length > 1) {
        console.log(chalk.yellow(`  Multiple services detected (${services.join(', ')}). Override with --compose-service <name> if needed.`));
      }
    }
  }
  console.log(`  Services: ${chalk.cyan(services.join(', '))}`);
  console.log(`  Using: ${chalk.green(serviceName)} as primary service`);

  const devcontainerJsonPath = join(targetDevcontainer, 'devcontainer.json');
  const relativeCompose = join('..', composeDetection.file);
  configureDockerCompose(devcontainerJsonPath, relativeCompose, serviceName);
  console.log(`  Updated: ${chalk.green('devcontainer.json')} (configured for docker-compose)`);

  return { configured: true, file: composeDetection.file, service: serviceName };
}

/**
 * Print next steps after successful initialization
 * @param {string} target - Target folder name
 * @param {boolean} hasDockerCompose - Whether docker-compose was configured
 */
function printNextSteps(target, hasDockerCompose = false) {
  console.log(chalk.green('\nDevcontainer initialized successfully!'));

  if (hasDockerCompose) {
    console.log(chalk.dim('\nNote: Using docker-compose for multi-container setup'));
  }

  console.log(chalk.blue('\nNext steps:'));
  console.log(`  1. cd ${target}`);
  console.log('  2. devcont up');
  console.log('  3. devcont attach');
  console.log(chalk.dim('\nOr use: devcont shell'));
}

/**
 * Initialize devcontainer in a project folder
 * @param {string} target - Target folder path
 * @param {object} options - Command options
 * @param {boolean} [options.dryRun=false] - If true, only print what would be done
 */
export async function initCommand(target, options = {}) {
  const targetPath = resolve(target);
  const targetDevcontainer = join(targetPath, '.devcontainer');
  const {
    dryRun = false,
    template: preferredTemplate,
    composeService,
    claudeMounts = false,
    firewall = false
  } = options;
  const useLegacySource = Boolean(options.source);
  const sourcePath = useLegacySource ? resolve(options.source) : null;
  const sourceDevcontainer = useLegacySource ? join(sourcePath, '.devcontainer') : null;

  if (dryRun) {
    console.log(chalk.magenta('[DRY RUN] No changes will be made\n'));
  }

  console.log(chalk.blue('Initializing devcontainer...'));
  console.log(`  Target: ${chalk.cyan(targetPath)}`);
  if (useLegacySource) {
    console.log(`  Source: ${chalk.cyan(sourcePath)}`);
  } else {
    console.log(`  Source: ${chalk.cyan('Bundled templates')}`);
  }

  if (useLegacySource) {
    validatePaths(options.source, targetPath, sourceDevcontainer);

    if (options.pull !== false) {
      if (dryRun) {
        console.log(chalk.dim('\n  Would run: git pull'));
      } else {
        pullSourceRepository(sourcePath);
      }
    }
  }

  // Detect project type
  console.log(chalk.blue('\nDetecting project type...'));
  const projectInfo = detectProjectType(targetPath);
  console.log(`  Detected: ${chalk.green(projectInfo.type)}`);

  const existingCompose = detectDockerCompose(targetPath);
  const nonInteractive = dryRun || process.env.DEVCONT_NO_PROMPT === '1';
  let selectedTemplate = null;
  let userSelectedTemplate = preferredTemplate;

  // If no tech detected and no template specified, prompt user to select
  if (!useLegacySource && !preferredTemplate && projectInfo.type === 'generic' && !existingCompose.found && !nonInteractive) {
    const manifest = loadTemplateManifest();
    // Filter out compose-multi (auto-selected) and generic (fallback)
    const selectableTemplates = manifest.templates.filter(
      (tpl) => tpl.id !== 'compose-multi' && tpl.id !== 'generic'
    );
    userSelectedTemplate = await promptForTemplate(selectableTemplates);
  }

  if (!useLegacySource) {
    try {
      selectedTemplate = selectTemplate({
        preferredTemplate: userSelectedTemplate,
        projectType: projectInfo.type,
        hasCompose: existingCompose.found
      });
    } catch (error) {
      exitWithError(error.message);
    }
    console.log(`  Template: ${chalk.green(selectedTemplate.id)}`);
  }

  if (existsSync(targetDevcontainer)) {
    console.log(chalk.yellow('\nWarning: .devcontainer already exists, it will be overwritten'));
  }

  if (dryRun) {
    console.log(chalk.blue('\nWould create/update files:'));
    if (useLegacySource) {
      if (projectInfo.type === 'python-uv') {
        console.log(`  ${chalk.green('Dockerfile')} (UV-based Python)`);
        console.log(`  ${chalk.green('devcontainer.json')}`);
        console.log(`  ${chalk.green('init-firewall.sh')}`);
      } else {
        console.log(`  ${chalk.green('.devcontainer/')} (copied from source)`);
        console.log(`  ${chalk.green('devcontainer.json')} (with agents mount added)`);
        console.log(`  ${chalk.green('Dockerfile')} (zsh + Oh My Zsh added if not present)`);
      }

      const sourceCompose = detectDockerCompose(sourceDevcontainer);
      if (sourceCompose.found) {
        console.log(chalk.blue('\nWould configure docker-compose:'));
        console.log(`  ${chalk.green(sourceCompose.file)} detected`);
        console.log(`  ${chalk.green('devcontainer.json')} would be updated for docker-compose`);
      }
    } else if (selectedTemplate) {
      console.log(`  ${chalk.green('.devcontainer/')} (from template: ${selectedTemplate.id})`);
    }

    console.log(chalk.magenta('\n[DRY RUN] No files were created'));
    return;
  }

  mkdirSync(targetDevcontainer, { recursive: true });

  if (useLegacySource) {
    if (projectInfo.type === 'python-uv') {
      setupUvDevcontainer(targetDevcontainer, sourceDevcontainer, projectInfo);
    } else {
      setupGenericDevcontainer(targetDevcontainer, sourceDevcontainer);
    }
  } else if (selectedTemplate) {
    if (selectedTemplate.id === 'python-uv') {
      const builtinSource = resolveTemplateDir('python-uv');
      setupUvDevcontainer(targetDevcontainer, builtinSource, projectInfo);
    } else {
      renderTemplate(selectedTemplate.id, targetDevcontainer);
    }
  }

  if (claudeMounts) {
    const devcontainerJsonPath = join(targetDevcontainer, 'devcontainer.json');
    addAgentsMount(devcontainerJsonPath);
    console.log(`  Updated: ${chalk.green('devcontainer.json')} (Claude mounts)`);
  }

  if (firewall) {
    enableFirewallHook(targetDevcontainer);
  }

  let composeResult;
  if (!useLegacySource && existingCompose.found) {
    try {
      composeResult = await configureProjectCompose(targetDevcontainer, targetPath, existingCompose, {
        composeService,
        nonInteractive
      });
    } catch (error) {
      exitWithError(error.message);
    }
  } else {
    composeResult = handleDockerCompose(targetDevcontainer);
  }
  printNextSteps(target, composeResult.configured);
}
function promptForService(services) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(chalk.blue('\nSelect docker-compose service:'));
    services.forEach((svc, idx) => {
      console.log(`  ${idx + 1}. ${svc}`);
    });
    rl.question('Enter number (press Enter for default): ', (answer) => {
      rl.close();
      const choice = Number.parseInt(answer, 10);
      if (!Number.isNaN(choice) && choice >= 1 && choice <= services.length) {
        resolve(services[choice - 1]);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Prompt the user to select a template when no project type was detected
 * @param {Array<{ id: string, label: string, description: string }>} templates
 * @returns {Promise<string | null>}
 */
function promptForTemplate(templates) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(chalk.blue('\nNo project type detected. Select a template:'));
    templates.forEach((tpl, idx) => {
      console.log(`  ${idx + 1}. ${tpl.label} - ${chalk.dim(tpl.description)}`);
    });
    rl.question('Enter number: ', (answer) => {
      rl.close();
      const choice = Number.parseInt(answer, 10);
      if (!Number.isNaN(choice) && choice >= 1 && choice <= templates.length) {
        resolve(templates[choice - 1].id);
      } else {
        resolve(null);
      }
    });
  });
}
