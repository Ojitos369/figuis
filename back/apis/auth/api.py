import datetime

from core.bases.apis import BaseApi, NoSession, AdminApi, pln
from core.conf.settings import SESSION_HOURS
from core.utils.security import check_password


class Login(NoSession, BaseApi):
    def main(self):
        self.show_me()
        usuario = (self.data.get("usuario") or "").strip()
        password = self.data.get("passwd") or ""
        if not usuario or not password:
            raise self.MYE("Falta usuario o contraseña")

        res = self.conexion.consulta_asociativa(
            "SELECT * FROM usuarios WHERE usuario = :usuario AND activo = true",
            {"usuario": usuario}
        )
        if res.empty:
            raise self.MYE("Usuario o contraseña incorrectos")
        row = res.iloc[0].to_dict()

        if not check_password(password, row["password"]):
            raise self.MYE("Usuario o contraseña incorrectos")

        token = self.get_id()
        expires_at = datetime.datetime.now() + datetime.timedelta(hours=SESSION_HOURS)
        self.conexion.ejecutar(
            "INSERT INTO sesiones (id, token, usuario_id, expires_at) VALUES (:id, :token, :usuario_id, :expires_at)",
            {"id": self.get_id(), "token": token, "usuario_id": row["id"], "expires_at": expires_at}
        )
        self.conexion.commit()

        self.response = {
            "user": {"id": row["id"], "usuario": row["usuario"], "nombre": row["nombre"]},
            "token": token
        }


class ValidateLogin(AdminApi):
    def main(self):
        res = self.conexion.consulta_asociativa(
            "SELECT id, usuario, nombre FROM usuarios WHERE id = :id",
            {"id": self.usuario_id}
        )
        user = self.d2d(res)[0] if not res.empty else {}
        self.response = {"user": user, "token": self.token}


class CloseSession(AdminApi):
    def main(self):
        self.conexion.ejecutar("DELETE FROM sesiones WHERE token = :token", {"token": self.token})
        self.conexion.commit()
        self.response = {"ok": True}
