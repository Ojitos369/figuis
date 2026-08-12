import sys
import os
import uuid

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from core.utils.security import make_password
from core.conf.settings import db_data, ce, prod_mode
from ojitos369_postgres_db.postgres_db import ConexionPostgreSQL


def create_admin(usuario, password, nombre):
    db = ConexionPostgreSQL(db_data, ce=ce, send_error=prod_mode, parameter_indicator=':')

    res = db.consulta_asociativa("SELECT id FROM usuarios WHERE usuario = :usuario", {"usuario": usuario})
    if not res.empty:
        db.ejecutar(
            "UPDATE usuarios SET password = :password, nombre = :nombre, activo = true WHERE usuario = :usuario",
            {"usuario": usuario, "password": make_password(password), "nombre": nombre}
        )
        db.commit()
        print(f"Usuario '{usuario}' actualizado.")
    else:
        user_id = uuid.uuid4().hex
        db.ejecutar(
            "INSERT INTO usuarios (id, usuario, password, nombre) VALUES (:id, :usuario, :password, :nombre)",
            {"id": user_id, "usuario": usuario, "password": make_password(password), "nombre": nombre}
        )
        db.commit()
        print(f"Usuario '{usuario}' creado exitosamente.")

    db.close()


if __name__ == "__main__":
    # python scripts/create_admin.py usuario password "Nombre Completo"
    usuario = sys.argv[1] if len(sys.argv) > 1 else "admin"
    password = sys.argv[2] if len(sys.argv) > 2 else "admin"
    nombre = sys.argv[3] if len(sys.argv) > 3 else "Administrador"
    create_admin(usuario, password, nombre)
