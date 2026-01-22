FROM ghcr.io/harmonytics/devcont-base:latest

LABEL org.opencontainers.image.source="https://github.com/harmonytics/devcont"
LABEL org.opencontainers.image.description="Django 5 + Next.js 15 fullstack starter template"
LABEL org.opencontainers.image.licenses="MIT"

USER root

# Create template directory and volume mount points
RUN mkdir -p /app-template/backend /app-template/frontend \
  /workspace/backend/.venv /workspace/frontend/node_modules && \
  chown -R node:node /app-template /workspace

# Copy starter template
COPY --chown=node:node template/ /app-template/

# Copy and setup entrypoint
COPY --chown=node:node entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER node
WORKDIR /workspace

ENTRYPOINT ["/entrypoint.sh"]
CMD ["zsh"]
