FROM mcr.microsoft.com/devcontainers/base:ubuntu

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    procps \
    lsof \
    htop \
    net-tools \
    psmisc \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Claude Code and Codex
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN npm install -g @openai/codex @go-task/cli

WORKDIR /workspace
