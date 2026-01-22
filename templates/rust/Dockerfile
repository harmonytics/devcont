ARG RUST_VERSION=1
FROM mcr.microsoft.com/devcontainers/rust:${RUST_VERSION}

ARG USERNAME=vscode

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    sudo \
    zsh \
    curl \
    nodejs \
    npm \
    procps \
    lsof \
    htop \
    net-tools \
    psmisc \
  && apt-get clean && rm -rf /var/lib/apt/lists/* \
  && echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
  && chmod 0440 /etc/sudoers.d/$USERNAME

# Install Claude Code and Codex
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN npm install -g @openai/codex @go-task/cli

USER $USERNAME
WORKDIR /workspace

# Create target directory for volume mount
RUN mkdir -p /workspace/target

RUN rustup component add rustfmt clippy
