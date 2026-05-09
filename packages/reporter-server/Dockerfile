FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/reporter-server/package.json ./packages/reporter-server/package.json
RUN cd packages/reporter-server && npm install

COPY packages/reporter-server ./packages/reporter-server
RUN cd packages/reporter-server && npm run build

FROM node:20-alpine AS runtime

RUN apk add --no-cache postgresql postgresql-client su-exec

ENV REPORTER_PORT=8400
ENV REPORTER_ARTIFACTS_DIR=/data/artifacts
ENV REPORTER_SNAPSHOTS_DIR=/data/snapshots
ENV REPORTER_DB_DIR=/data/db
ENV REPORTER_DB_HOST=localhost
ENV REPORTER_DB_PORT=5432
ENV REPORTER_DB_USER=postgres
ENV REPORTER_DB_NAME=reporter

WORKDIR /app

COPY --from=builder /app/packages/reporter-server/package.json ./packages/reporter-server/package.json
RUN cd packages/reporter-server && npm install --production

COPY --from=builder /app/packages/reporter-server/dist ./packages/reporter-server/dist
COPY --from=builder /app/packages/reporter-server/drizzle ./packages/reporter-server/drizzle
COPY packages/reporter-server/scripts/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

RUN mkdir -p /data/artifacts /data/snapshots /data/db /run/postgresql && chown -R postgres:postgres /data/db /run/postgresql

VOLUME ["/data"]
EXPOSE 8400

ENTRYPOINT ["./entrypoint.sh"]
