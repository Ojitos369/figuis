#!/usr/bin/env bash
# Backup de la base de datos (Postgres, contenedor figuis-dbp) + carpeta media.
# Guarda todo en backups/<timestamp>/ para poder restaurar despues de un reinicio.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MEDIA_DIR="$REPO_ROOT/back/media"

DB_CONTAINER="figuis-dbp"
DB_NAME="figuis"
DB_USER="figuis"

TS="$(date +%Y-%m-%d_%H%M%S)"
DEST="$SCRIPT_DIR/$TS"
mkdir -p "$DEST"

echo "==> Backup de base de datos ($DB_NAME) desde contenedor $DB_CONTAINER"
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    echo "ERROR: el contenedor $DB_CONTAINER no esta corriendo." >&2
    exit 1
fi

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f "/tmp/${DB_NAME}_${TS}.dump"
docker cp "$DB_CONTAINER:/tmp/${DB_NAME}_${TS}.dump" "$DEST/db.dump"
docker exec "$DB_CONTAINER" rm -f "/tmp/${DB_NAME}_${TS}.dump"

echo "==> Backup de media ($MEDIA_DIR)"
if [ -d "$MEDIA_DIR" ]; then
    tar czf "$DEST/media.tar.gz" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"
else
    echo "ADVERTENCIA: no existe $MEDIA_DIR, se omite." >&2
fi

# Puntero al backup mas reciente, util para restore.sh sin argumentos.
ln -sfn "$DEST" "$SCRIPT_DIR/latest"

echo "==> Backup completo en: $DEST"
du -sh "$DEST"/* 2>/dev/null || true
