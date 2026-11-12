FROM node:lts-alpine
WORKDIR /app
EXPOSE 5173
# The repo is bind-mounted at /app (see compose.yml). Installing at start-up
# keeps the container in sync with the mounted lockfile; the @museumwnf
# packages resolve anonymously from npmjs (public, no login). Nothing in this
# repository holds a token.
CMD ["sh", "-c", "npm ci && npm run dev -- --host --port 5173 --strictPort"]
