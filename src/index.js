export { initCommand } from './commands/init.js';
export { upCommand } from './commands/up.js';
export { attachCommand } from './commands/attach.js';
export { downCommand } from './commands/down.js';
export { listTemplatesCommand } from './commands/templates.js';
export { detectProjectType } from './utils/detect.js';
export {
  addAgentsMount,
  ensureClaudeConfigDirs,
  generateUvDockerfile,
  generateUvDevcontainerJson,
  detectDockerCompose,
  parseComposeServices,
  configureDockerCompose,
  ensureZshInDockerfile
} from './utils/config.js';
