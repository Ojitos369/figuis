import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from core.conf.settings import db_data, ce, prod_mode, MEDIA_DIR
from ojitos369_postgres_db.postgres_db import ConexionPostgreSQL


def rename_archivos_uuid():
    db = ConexionPostgreSQL(db_data, ce=ce, send_error=prod_mode, parameter_indicator=':')

    archivos = db.consulta_asociativa("SELECT id, figura_id, archivo_url FROM figura_archivos")
    if archivos.empty:
        print("No hay archivos que renombrar.")
        db.close()
        return

    renombrados = 0
    ya_ok = 0
    faltantes = 0

    for _, row in archivos.iterrows():
        archivo_id = row["id"]
        figura_id = row["figura_id"]
        archivo_url = row["archivo_url"]

        ext = os.path.splitext(archivo_url)[1].lower()
        nuevo_nombre = f"{archivo_id}{ext}"
        nueva_url = f"figuras/{figura_id}/{nuevo_nombre}"

        if archivo_url == nueva_url:
            ya_ok += 1
            continue

        viejo_path = os.path.join(MEDIA_DIR, archivo_url)
        nuevo_path = os.path.join(MEDIA_DIR, nueva_url)

        if not os.path.exists(viejo_path):
            print(f"FALTA en disco, solo se actualiza DB: {archivo_url}")
            faltantes += 1
            db.ejecutar(
                "UPDATE figura_archivos SET archivo_url = :nueva_url WHERE id = :id",
                {"nueva_url": nueva_url, "id": archivo_id}
            )
            db.commit()
            continue

        os.makedirs(os.path.dirname(nuevo_path), exist_ok=True)
        os.rename(viejo_path, nuevo_path)
        db.ejecutar(
            "UPDATE figura_archivos SET archivo_url = :nueva_url WHERE id = :id",
            {"nueva_url": nueva_url, "id": archivo_id}
        )
        db.commit()
        print(f"{archivo_url}  ->  {nueva_url}")
        renombrados += 1

    print(f"\nListo. Renombrados: {renombrados}. Ya estaban bien: {ya_ok}. Faltantes en disco: {faltantes}.")
    db.close()


if __name__ == "__main__":
    rename_archivos_uuid()
