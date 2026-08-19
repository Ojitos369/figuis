from core.bases.apis import BaseApi, NoSession, pln
from core.conf.settings import COOKIE_NAME, COOKIE_MAX_AGE, prod_mode
from core.utils.security import check_password


def set_session_cookie(response_obj, token):
    # max_age hace que el cookie persista aunque se reinicie el navegador.
    # La vigencia real la sigue manejando unicamente la tabla `sesiones`
    # -no expira sola, se cierra a mano (logout o revocacion desde el panel)-
    # pero sin max_age el navegador la trataba como cookie de sesion y la
    # borraba al cerrarse, forzando a re-loguear en cada reinicio.
    response_obj.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=prod_mode,
        samesite="lax",
        path="/",
        max_age=COOKIE_MAX_AGE,
    )


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
        self.conexion.ejecutar(
            "INSERT INTO sesiones (id, token, usuario_id) VALUES (:id, :token, :usuario_id)",
            {"id": self.get_id(), "token": token, "usuario_id": row["id"]}
        )
        self.conexion.commit()

        set_session_cookie(self.response_obj, token)
        self.response = {
            "user": {"id": row["id"], "usuario": row["usuario"], "nombre": row["nombre"]},
        }


class ValidateLogin(BaseApi):
    def main(self):
        res = self.conexion.consulta_asociativa(
            "SELECT id, usuario, nombre FROM usuarios WHERE id = :id",
            {"id": self.usuario_id}
        )
        user = self.d2d(res)[0] if not res.empty else {}
        self.response = {"user": user}


class CloseSession(BaseApi):
    """Cierra la sesion actual (la del propio token con el que se llama)."""
    def main(self):
        self.conexion.ejecutar("DELETE FROM sesiones WHERE token = :token", {"token": self.token})
        self.conexion.commit()
        if self.response_obj is not None:
            self.response_obj.delete_cookie(key=COOKIE_NAME, path="/")
        self.response = {"ok": True}


class GetSesiones(BaseApi):
    """Lista las sesiones abiertas (todas, de cualquier admin) para el panel."""
    def main(self):
        self.show_me()
        res = self.conexion.consulta_asociativa(
            """
            SELECT s.id, u.usuario, u.nombre, s.created_at, (s.token = :token) as actual
            FROM sesiones s
            JOIN usuarios u ON u.id = s.usuario_id
            ORDER BY s.created_at DESC
            """,
            {"token": self.token}
        )
        self.response = {"data": self.d2d(res)}


class CloseSesionAdmin(BaseApi):
    """Revoca cualquier sesion abierta por id (panel de admin)."""
    def main(self):
        self.show_me()
        id_sesion = self.data.get("id")
        if not id_sesion:
            raise self.MYE("Falta id de sesión")
        self.conexion.ejecutar("DELETE FROM sesiones WHERE id = :id", {"id": id_sesion})
        self.conexion.commit()
        self.response = {"id": id_sesion}
