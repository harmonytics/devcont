ARG PYTHON_VERSION=3.14
FROM ghcr.io/astral-sh/uv:python${PYTHON_VERSION}-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      git \
      curl \
      sudo \
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

ENV UV_LINK_MODE=copy
ENV UV_PYTHON=python${PYTHON_VERSION}
WORKDIR /workspace

# Create .venv directory for volume mount
RUN mkdir -p /workspace/.venv
