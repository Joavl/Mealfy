#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export COMPOSE_PROJECT_NAME="mealfy-e2e-${BASHPID}-${RANDOM}"
COMPOSE=(docker compose --project-directory "$ROOT_DIR" --file "$ROOT_DIR/compose.yaml")
SERVICE=postgres-e2e
DATABASE_NAME=mealfy_e2e
DATABASE_USER=mealfy_e2e
DATABASE_PASSWORD=mealfy_e2e
PRISMA="$ROOT_DIR/backend/node_modules/.bin/prisma"
E2E_RUN_ID="${COMPOSE_PROJECT_NAME}-${RANDOM}-${RANDOM}"

fail() {
  printf 'E2E setup failed: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if (( status != 0 )); then
    printf 'E2E failed; PostgreSQL logs follow:\n' >&2
    "${COMPOSE[@]}" logs --no-color "$SERVICE" >&2 || true
  fi
  if ! "${COMPOSE[@]}" down --volumes --remove-orphans >/dev/null 2>&1; then
    printf 'E2E cleanup failed: could not stop the isolated Docker Compose project.\n' >&2
    status=1
  fi
  exit "$status"
}
on_signal() {
  local status="$1"
  trap - INT TERM
  exit "$status"
}

trap cleanup EXIT
trap 'on_signal 130' INT
trap 'on_signal 143' TERM

command -v docker >/dev/null 2>&1 || fail 'Docker is not installed or is not on PATH.'
docker info >/dev/null 2>&1 || fail 'Docker daemon is unavailable.'
"${COMPOSE[@]}" version >/dev/null 2>&1 || fail 'Docker Compose is unavailable.'
[[ -x "$PRISMA" ]] || fail 'Backend dependencies are missing. Run: npm ci --prefix backend'

# Ignore inherited database variables: only the URL derived from this root Compose
# service is allowed to reach Prisma. Random projects/ports isolate parallel runs.
unset E2E_DATABASE_URL DATABASE_URL DIRECT_URL

# Recreate the root Compose service. The random loopback port and tmpfs keep
# concurrent worktrees isolated and prevent access to configured app databases.
"${COMPOSE[@]}" up --detach --wait --force-recreate "$SERVICE" \
  || fail 'could not start PostgreSQL; correctly scoped container logs follow.'

published_port="$("${COMPOSE[@]}" port "$SERVICE" 5432 | tail -n 1 | sed 's/.*://')"
[[ "$published_port" =~ ^[0-9]+$ ]] \
  || fail 'Docker Compose did not publish a usable PostgreSQL port.'

export APP_ENV=ci
export NODE_ENV=test
export DIRECT_PIX_MODE=synthetic
# Retains pre-flag Direct Pix fixture expectations; production remains fail-closed.
export DIRECT_PIX_TEST_DEFAULT_CREATION=true
export DIRECT_PIX_SYNTHETIC_EVPS='00000000-0000-0000-0000-000000000001'
export EMAIL_DELIVERY_MODE=capture
export EMAIL_CAPTURE_DIR=.tmp/e2e-mail
export JWT_SECRET='mealfy-e2e-isolated-secret'
export STEP_UP_OTP_HMAC_KEY='9f4c8d2a7e1b6c5039a4d8e2f7b1c6054a9e3d8f2b7c1a605e4d9f3b8c2a7e10'
export DIRECT_PIX_EVP_ENCRYPTION_KID='e2e-aes-2026-01'
export DIRECT_PIX_EVP_ENCRYPTION_KEY='8c5f1a0b2d3e4f5061728394a5b6c7d8e9f00112233445566778899aabbccdde'
export DIRECT_PIX_EVP_FINGERPRINT_KID='e2e-hmac-2026-01'
export DIRECT_PIX_EVP_FINGERPRINT_KEY='1a2b3c4d5e6f7081928374655647382910fedcba98765432100123456789abcd'
export DATABASE_URL="postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@127.0.0.1:${published_port}/${DATABASE_NAME}?schema=public"
export DIRECT_URL="$DATABASE_URL"
export E2E_RUN_ID

(
  cd "$ROOT_DIR/backend"
  "$PRISMA" generate \
    || fail 'Prisma Client generation failed for the E2E schema.'
  "$PRISMA" migrate deploy \
    || fail 'Prisma migrations failed against the isolated E2E database.'
  printf "CREATE TABLE \"_e2e_runner\" (run_id text PRIMARY KEY); INSERT INTO \"_e2e_runner\" (run_id) VALUES ('%s');\n" "$E2E_RUN_ID" \
    | "${COMPOSE[@]}" exec --no-TTY "$SERVICE" psql --username "$DATABASE_USER" --dbname "$DATABASE_NAME" --set ON_ERROR_STOP=1 \
    || fail 'could not establish E2E database ownership marker.'
  node --test --test-concurrency=1 --require ts-node/register/transpile-only test/*.e2e.test.ts \
    || fail 'authenticated PostgreSQL E2E suite failed.'
  node --test --require ts-node/register/transpile-only test/families-beneficiary-access.test.ts \
    || fail 'existing family authorization regression test failed.'
)
