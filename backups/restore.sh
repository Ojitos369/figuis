#!/usr/bin/env bash
# Restaura la base de datos y la carpeta media desde un backup generado por backup.sh
# Uso: ./restore.sh [ruta_al_backup]   (por defecto usa backups/latest)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MEDIA_DIR="$REPO_ROOT/back/media"

DB_CONTAINER="figuis-dbp"
DB_NAME="figuis"
DB_USER="figuis"

SRC="${1:-$SCRIPT_DIR/latest}"
SRC="$(cd "$SRC" && pwd)"

if [ ! -f "$SRC/db.dump" ]; then
    echo "ERROR: no se encontro $SRC/db.dump" >&2
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    echo "ERROR: el contenedor $DB_CONTAINER no esta corriendo." >&2
    exit 1
fi

read -p "Esto SOBREESCRIBE la base '$DB_NAME' y la carpeta media con el backup en $SRC. Continuar? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
fi

echo "==> Restaurando base de datos"
docker cp "$SRC/db.dump" "$DB_CONTAINER:/tmp/restore.dump"
# --clean --if-exists borra los objetos existentes antes de recrearlos.
docker exec "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner "/tmp/restore.dump"
docker exec "$DB_CONTAINER" rm -f "/tmp/restore.dump"

if [ -f "$SRC/media.tar.gz" ]; then
    echo "==> Restaurando media"
    rm -rf "$MEDIA_DIR"
    tar xzf "$SRC/media.tar.gz" -C "$(dirname "$MEDIA_DIR")"
else
    echo "ADVERTENCIA: no hay media.tar.gz en $SRC, se omite." >&2
fi

echo "==> Restore completo desde: $SRC"
