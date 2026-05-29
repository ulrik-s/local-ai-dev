FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      curl \
      ca-certificates \
      bash \
      less \
      ripgrep \
      jq \
      build-essential \
      python3 \
      python3-pip \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g \
      ruflo@latest \
      @anthropic-ai/claude-code@latest

COPY scripts/ruflo-entrypoint.sh /usr/local/bin/ruflo-entrypoint.sh
RUN chmod +x /usr/local/bin/ruflo-entrypoint.sh

RUN mkdir -p /workspace && chown node:node /workspace

USER node
WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/ruflo-entrypoint.sh"]
CMD ["bash"]
