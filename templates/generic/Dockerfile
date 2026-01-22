FROM mcr.microsoft.com/devcontainers/base:ubuntu

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN (getent group $USER_GID || groupadd --gid $USER_GID $USERNAME) \
  && (id -u $USERNAME >/dev/null 2>&1 || useradd --uid $USER_UID --gid $USER_GID -m $USERNAME) \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    build-essential \
    sudo \
    zsh \
    nano \
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

WORKDIR /workspace
USER $USERNAME
