import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Read and parse a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {object} - Parsed JSON content
 * @throws {Error} If file cannot be read or contains invalid JSON
 */
function readJsonFile(filePath) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

/**
 * Write an object to a JSON file with pretty formatting
 * @param {string} filePath - Path to JSON file
 * @param {object} data - Data to write
 */
function writeJsonFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Add a mount to config if it doesn't already exist (checked by pattern)
 * @param {object} config - Devcontainer config object
 * @param {string} mount - Mount string to add
 * @param {string} pattern - Pattern to check for existing mount
 */
function addMountIfMissing(config, mount, pattern) {
  config.mounts = config.mounts || [];
  if (!config.mounts.some(m => m.includes(pattern))) {
    config.mounts.push(mount);
  }
}

/**
 * Ensure Claude config directories exist on the host
 * Creates ~/.claude/agents and ~/.claude/plugins if they don't exist
 */
export function ensureClaudeConfigDirs() {
  const homeDir = homedir();
  const dirs = [
    join(homeDir, '.claude', 'agents'),
    join(homeDir, '.claude', 'plugins')
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Add claude agents and plugins mounts to devcontainer.json
 * @param {string} devcontainerJsonPath - Path to devcontainer.json
 * @param {string} [targetUser='node'] - Target user in the container
 * @throws {Error} If file cannot be read or contains invalid JSON
 */
export function addAgentsMount(devcontainerJsonPath, targetUser = 'node') {
  ensureClaudeConfigDirs();
  const config = readJsonFile(devcontainerJsonPath);
  const homeDir = homedir();

  // Determine target home directory based on remoteUser if present in config
  const containerUser = config.remoteUser || targetUser;
  const targetHome = containerUser === 'root' ? '/root' : `/home/${containerUser}`;

  addMountIfMissing(
    config,
    `source=${homeDir}/.claude/agents,target=${targetHome}/.claude/agents,type=bind`,
    '.claude/agents'
  );
  addMountIfMissing(
    config,
    `source=${homeDir}/.claude/plugins,target=${targetHome}/.claude/plugins,type=bind`,
    '.claude/plugins'
  );

  writeJsonFile(devcontainerJsonPath, config);
  return config;
}

/**
 * Generate UV-based Python Dockerfile
 * @param {object} options - Configuration options
 * @returns {string} - Dockerfile content
 */
export function generateUvDockerfile(options = {}) {
  const {
    pythonVersion = '3.12',
    claudeCodeVersion = 'latest',
    gitDeltaVersion = '0.18.2',
    zshInDockerVersion = '1.2.0',
    hasBackendFolder = false
  } = options;

  const workDir = hasBackendFolder ? '/workspace/backend' : '/workspace';
  const copyPath = hasBackendFolder ? 'backend/' : '';

  return `# syntax=docker/dockerfile:1

# UV-based Python devcontainer with Claude Code
FROM ghcr.io/astral-sh/uv:python${pythonVersion}-bookworm

ARG TZ
ENV TZ="\$TZ"

ARG CLAUDE_CODE_VERSION=${claudeCodeVersion}

# Install Node.js for Claude Code
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \\
    apt-get install -y nodejs

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \\
  less \\
  git \\
  procps \\
  sudo \\
  fzf \\
  zsh \\
  man-db \\
  unzip \\
  gnupg2 \\
  gh \\
  iptables \\
  ipset \\
  iproute2 \\
  dnsutils \\
  aggregate \\
  jq \\
  nano \\
  vim \\
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=\$USER_UID

RUN groupadd --gid \$USER_GID \$USERNAME \\
    && useradd --uid \$USER_UID --gid \$USER_GID -m \$USERNAME \\
    && echo \$USERNAME ALL=\\(root\\) NOPASSWD:ALL > /etc/sudoers.d/\$USERNAME \\
    && chmod 0440 /etc/sudoers.d/\$USERNAME

# Ensure npm global directory
RUN mkdir -p /usr/local/share/npm-global && \\
    chown -R \$USERNAME:\$USERNAME /usr/local/share/npm-global

# Persist bash history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \\
    && mkdir /commandhistory \\
    && touch /commandhistory/.bash_history \\
    && chown -R \$USERNAME /commandhistory

# Set devcontainer environment variable
ENV DEVCONTAINER=true

# Create workspace and config directories
RUN mkdir -p /workspace /home/\$USERNAME/.claude && \\
    chown -R \$USERNAME:\$USERNAME /workspace /home/\$USERNAME/.claude

WORKDIR /workspace

# Install git-delta
ARG GIT_DELTA_VERSION=${gitDeltaVersion}
RUN ARCH=\$(dpkg --print-architecture) && \\
    wget "https://github.com/dandavison/delta/releases/download/\${GIT_DELTA_VERSION}/git-delta_\${GIT_DELTA_VERSION}_\${ARCH}.deb" && \\
    dpkg -i "git-delta_\${GIT_DELTA_VERSION}_\${ARCH}.deb" && \\
    rm "git-delta_\${GIT_DELTA_VERSION}_\${ARCH}.deb"

# Switch to non-root user
USER \$USERNAME

# Set up npm global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=\$PATH:/usr/local/share/npm-global/bin

# Set default shell to zsh
ENV SHELL=/bin/zsh
ENV EDITOR=nano
ENV VISUAL=nano

# Install zsh with plugins
ARG ZSH_IN_DOCKER_VERSION=${zshInDockerVersion}
RUN sh -c "\$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v\${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \\
    -p git \\
    -p fzf \\
    -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \\
    -a "source /usr/share/doc/fzf/examples/completion.zsh" \\
    -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \\
    -x

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code@\${CLAUDE_CODE_VERSION}

# Configure UV
ENV UV_LINK_MODE=copy
ENV UV_COMPILE_BYTECODE=1
ENV UV_PYTHON_DOWNLOADS=never
ENV UV_PYTHON=python${pythonVersion}

# Copy project files and install dependencies
WORKDIR ${workDir}
COPY --chown=\$USERNAME:\$USERNAME ${copyPath}pyproject.toml ${copyPath}uv.lock* ./
RUN --mount=type=cache,target=/home/\$USERNAME/.cache/uv \\
    uv sync --frozen --no-install-project || uv sync --no-install-project

# Copy firewall script (context is project root, so path is .devcontainer/)
COPY .devcontainer/init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \\
    echo "\$USERNAME ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/\$USERNAME-firewall && \\
    chmod 0440 /etc/sudoers.d/\$USERNAME-firewall
USER \$USERNAME

WORKDIR /workspace
`;
}

/**
 * Detect docker-compose files in a directory
 * @param {string} dirPath - Directory to check
 * @returns {{ found: boolean, file: string | null }} - Detection result
 */
export function detectDockerCompose(dirPath) {
  const composeFiles = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml'
  ];

  for (const file of composeFiles) {
    const filePath = join(dirPath, file);
    if (existsSync(filePath)) {
      return { found: true, file };
    }
  }

  return { found: false, file: null };
}

/**
 * Parse service names from a docker-compose file
 * Uses simple regex to avoid YAML dependency
 * @param {string} composePath - Path to docker-compose file
 * @returns {string[]} - Array of service names
 */
export function parseComposeServices(composePath) {
  try {
    const content = readFileSync(composePath, 'utf-8');
    const services = [];

    // Find the services: section and extract service names
    // Matches lines like "  servicename:" under "services:"
    const lines = content.split('\n');
    let inServices = false;

    for (const line of lines) {
      // Check for services: section
      if (/^services:\s*$/.test(line)) {
        inServices = true;
        continue;
      }

      if (inServices) {
        // Check if we've exited the services section (top-level key)
        if (/^[a-zA-Z]/.test(line) && !line.startsWith(' ')) {
          break;
        }

        // Match service names (indented keys under services)
        const match = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
        if (match) {
          services.push(match[1]);
        }
      }
    }

    return services;
  } catch {
    return [];
  }
}

/**
 * Configure devcontainer.json for docker-compose
 * @param {string} devcontainerJsonPath - Path to devcontainer.json
 * @param {string} composeFile - Name of docker-compose file
 * @param {string} serviceName - Name of the service to use
 */
export function configureDockerCompose(devcontainerJsonPath, composeFile, serviceName) {
  const config = readJsonFile(devcontainerJsonPath);

  // Remove build section if present (docker-compose handles building)
  delete config.build;

  // Add docker-compose configuration
  config.dockerComposeFile = composeFile;
  config.service = serviceName;

  // Ensure workspaceFolder is set
  if (!config.workspaceFolder) {
    config.workspaceFolder = '/workspace';
  }

  writeJsonFile(devcontainerJsonPath, config);
  return config;
}

/**
 * Ensure zsh and Oh My Zsh are installed in a Dockerfile
 * Adds zsh and Oh My Zsh installation if not already present
 * @param {string} dockerfilePath - Path to Dockerfile
 * @returns {boolean} - True if modified, false if zsh already present
 */
export function ensureZshInDockerfile(dockerfilePath) {
  if (!existsSync(dockerfilePath)) {
    return false;
  }

  let content = readFileSync(dockerfilePath, 'utf-8');

  if (content.includes('zsh')) {
    return false;
  }

  content = addZshToDockerfile(content);
  content = addOhMyZshToDockerfile(content);

  writeFileSync(dockerfilePath, content);
  return true;
}

/**
 * Add zsh package to Dockerfile content
 * Modifies existing apt-get install or adds a new RUN command
 * @param {string} content - Dockerfile content
 * @returns {string} - Modified Dockerfile content
 */
function addZshToDockerfile(content) {
  const aptInstallMatch = content.match(/(apt-get install\s+[^\\]*?)(\s*\\?\n)/);

  if (aptInstallMatch) {
    const [fullMatch, installCmd, lineEnd] = aptInstallMatch;
    const updatedCmd = installCmd + ' zsh curl' + lineEnd;
    return content.replace(fullMatch, updatedCmd);
  }

  const zshInstall = `# Install zsh and curl (for Oh My Zsh)
RUN apt-get update && apt-get install -y --no-install-recommends zsh curl \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

`;

  const insertMatch = content.match(/^(USER|WORKDIR)\s/m);
  if (insertMatch) {
    return content.replace(insertMatch[0], zshInstall + insertMatch[0]);
  }

  return content + '\n' + zshInstall;
}

/**
 * Add Oh My Zsh installation to Dockerfile content
 * Only adds if not already present
 * @param {string} content - Dockerfile content
 * @returns {string} - Modified Dockerfile content
 */
function addOhMyZshToDockerfile(content) {
  const hasOhMyZsh = content.includes('oh-my-zsh') || content.includes('ohmyzsh');

  if (hasOhMyZsh) {
    if (!content.includes('SHELL')) {
      return content + '\n# Set default shell to zsh\nENV SHELL=/bin/zsh\n';
    }
    return content;
  }

  return content + `
# Install Oh My Zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Set default shell to zsh
ENV SHELL=/bin/zsh
`;
}

/**
 * Generate devcontainer.json for Python UV project
 * @returns {object} - devcontainer.json content
 */
export function generateUvDevcontainerJson() {
  ensureClaudeConfigDirs();
  const homeDir = homedir();

  return {
    name: "Claude Code Sandbox (Python UV)",
    build: {
      dockerfile: "Dockerfile",
      context: "..",
      args: {
        TZ: "${localEnv:TZ:America/Los_Angeles}",
        CLAUDE_CODE_VERSION: "latest",
        GIT_DELTA_VERSION: "0.18.2",
        ZSH_IN_DOCKER_VERSION: "1.2.0"
      }
    },
    runArgs: [
      "--cap-add=NET_ADMIN",
      "--cap-add=NET_RAW"
    ],
    customizations: {
      vscode: {
        extensions: [
          "anthropic.claude-code",
          "ms-python.python",
          "ms-python.vscode-pylance",
          "charliermarsh.ruff",
          "eamodio.gitlens"
        ],
        settings: {
          "editor.formatOnSave": true,
          "editor.defaultFormatter": "charliermarsh.ruff",
          "terminal.integrated.defaultProfile.linux": "zsh",
          "terminal.integrated.profiles.linux": {
            bash: {
              path: "bash",
              icon: "terminal-bash"
            },
            zsh: {
              path: "zsh"
            }
          },
          "python.defaultInterpreterPath": "/workspace/.venv/bin/python"
        }
      }
    },
    remoteUser: "vscode",
    mounts: [
      "source=claude-code-bashhistory-${devcontainerId},target=/commandhistory,type=volume",
      "source=claude-code-config-${devcontainerId},target=/home/vscode/.claude,type=volume",
      `source=${homeDir}/.claude/agents,target=/home/vscode/.claude/agents,type=bind`,
      `source=${homeDir}/.claude/plugins,target=/home/vscode/.claude/plugins,type=bind`
    ],
    containerEnv: {
      NODE_OPTIONS: "--max-old-space-size=4096",
      CLAUDE_CONFIG_DIR: "/home/vscode/.claude",
      POWERLEVEL9K_DISABLE_GITSTATUS: "true"
    },
    workspaceMount: "source=${localWorkspaceFolder},target=/workspace,type=bind,consistency=delegated",
    workspaceFolder: "/workspace",
    postStartCommand: "sudo /usr/local/bin/init-firewall.sh",
    waitFor: "postStartCommand"
  };
}
