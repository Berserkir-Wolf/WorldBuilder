#!/bin/sh
set -eu

provider="${DATABASE_PROVIDER:-sqlite}"
schema="prisma/schema.${provider}.prisma"

case "$provider" in
  sqlite|mysql)
	;;
  *)
	echo "Unsupported DATABASE_PROVIDER: $provider. Use sqlite or mysql." >&2
	exit 1
	;;
esac

if [ ! -f "$schema" ]; then
  echo "Prisma schema not found: $schema" >&2
  exit 1
fi

if [ "$provider" = "mysql" ] && [ -z "${DATABASE_URL:-}" ]; then
  : "${MYSQL_HOST:?MYSQL_HOST is required when DATABASE_PROVIDER=mysql}"
  : "${MYSQL_PORT:=3306}"
  : "${MYSQL_DATABASE:?MYSQL_DATABASE is required when DATABASE_PROVIDER=mysql}"
  : "${MYSQL_USER:?MYSQL_USER is required when DATABASE_PROVIDER=mysql}"
  : "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required when DATABASE_PROVIDER=mysql}"

  DATABASE_URL="$(node -e 'const encode = value => encodeURIComponent(value); const host = process.env.MYSQL_HOST; const port = process.env.MYSQL_PORT || "3306"; const database = process.env.MYSQL_DATABASE; const user = encode(process.env.MYSQL_USER); const password = encode(process.env.MYSQL_PASSWORD); process.stdout.write(`mysql://${user}:${password}@${host}:${port}/${database}`);')"
  export DATABASE_URL
fi

cp "$schema" prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma

exec "$@"
