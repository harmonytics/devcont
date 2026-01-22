ARG GO_VERSION=1.22
FROM golang:${GO_VERSION}-bookworm

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
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
  && (getent group $USER_GID || groupadd --gid $USER_GID $USERNAME) \
  && (id -u $USERNAME >/dev/null 2>&1 || useradd --uid $USER_UID --gid $USER_GID -m $USERNAME) \
  && echo "$USERNAME ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
  && chmod 0440 /etc/sudoers.d/$USERNAME

# Install Claude Code and Codex
RUN curl -fsSL https://claude.ai/install.sh | bash
RUN npm install -g @openai/codex @go-task/cli

USER $USERNAME
WORKDIR /workspace
ENV GOPATH=/home/$USERNAME/go
ENV PATH=$PATH:$GOPATH/bin

RUN go install github.com/go-delve/delve/cmd/dlv@latest
