FROM node:24

LABEL org.opencontainers.image.source="https://github.com/harmonytics/devcont"
LABEL org.opencontainers.image.description="Base development container with Node.js 24, Python 3.14, and essential tools"
LABEL org.opencontainers.image.licenses="MIT"

ARG TZ=UTC
ENV TZ="$TZ"

# Install all development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
  # Essential tools
  less \
  git \
  curl \
  wget \
  ca-certificates \
  # Process management
  procps \
  lsof \
  htop \
  net-tools \
  psmisc \
  # Shell & editors
  sudo \
  fzf \
  zsh \
  man-db \
  nano \
  vim \
  # Archive & utilities
  unzip \
  jq \
  # GitHub CLI
  gnupg2 \
  gh \
  # Network tools
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  # Python
  python3 \
  python3-pip \
  python3-venv \
  # Build essentials
  build-essential \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create node user directories
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Configure passwordless sudo for node user
RUN echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME && \
  chmod 0440 /etc/sudoers.d/$USERNAME

# Persist bash history
RUN mkdir /commandhistory && \
  touch /commandhistory/.bash_history && \
  chown -R $USERNAME /commandhistory

ENV DEVCONTAINER=true

# Create workspace and config directories
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

# Install git-delta for better diffs
ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget -q "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Switch to non-root user
USER node
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
ENV SHELL=/bin/zsh
ENV EDITOR=nano
ENV VISUAL=nano

# Install zsh with powerlevel10k (git status DISABLED for bind mount performance)
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -a "typeset -g POWERLEVEL9K_DISABLE_GITSTATUS=true" \
  -a "typeset -g POWERLEVEL9K_VCS_DISABLED=true" \
  -x

# Install Claude Code
RUN curl -fsSL https://claude.ai/install.sh | bash

# Install global npm packages
RUN npm install -g @openai/codex @go-task/cli

# Install uv (fast Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/home/node/.local/bin:$PATH"

# Install Python 3.14 via uv
RUN /home/node/.local/bin/uv python install 3.14
RUN /home/node/.local/bin/uv python pin 3.14

# Default command
CMD ["zsh"]
