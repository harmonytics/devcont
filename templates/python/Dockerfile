ARG PYTHON_VERSION=3.14
FROM ghcr.io/astral-sh/uv:python${PYTHON_VERSION}-bookworm

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    build-essential \
    sudo \
    zsh \
    nodejs \
    npm \
    procps \
    lsof \
    htop \
    net-tools \
    psmisc \
  && apt-get clean && rm -rf /var/lib/apt/lists/* \
  && (getent group $USER_GID || groupadd --gid $USER_GID $USERNAME) \
  && (id -u $USERNAME >/dev/null 2>&1 || useradd --uid $USER_UID --gid $USER_GID -m $USERNAME) \
  && echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
  && chmod 0440 /etc/sudoers.d/$USERNAME

# Install Claude Code and Codex
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN npm install -g @openai/codex @go-task/cli

USER $USERNAME
WORKDIR /workspace

# Create .venv directory for volume mount
RUN mkdir -p /workspace/.venv

COPY --chown=$USERNAME:$USERNAME pyproject.toml* uv.lock* ./
RUN --mount=type=cache,target=/home/$USERNAME/.cache/uv \
    uv sync --frozen --no-install-project || uv sync --no-install-project

ENV VIRTUAL_ENV=/workspace/.venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
