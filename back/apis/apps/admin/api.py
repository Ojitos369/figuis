import os
import json
import re
import struct

from core.bases.apis import BaseApi, pln
from core.bases.utils import CODIGO_EXPR
from core.conf.settings import MEDIA_DIR
from core.home_preview import schedule_home_preview_refresh
from core.social_preview import generate_social_preview, remove_social_preview


def refresh_social_preview(conexion, figura_id: str) -> None:
    portada = conexion.consulta_asociativa(
        """
        SELECT archivo_url FROM figura_archivos
        WHERE figura_id = :figura_id AND tipo = 'resultado'
          AND archivo_url ~* '\\.(jpe?g|png|webp|gif|bmp|tiff?)$'
        ORDER BY orden ASC, created_at ASC LIMIT 1
        """,
        {"figura_id": figura_id},
    )
    if portada.empty:
        remove_social_preview(figura_id)
        return
    generate_social_preview(figura_id, portada.iloc[0]["archivo_url"], force=True)


def stl_esta_completo(contents: bytes) -> bool:
    """Valida que un .stl no venga truncado (subida cortada a medias).
    Binario: el header declara cuantos triangulos trae; alcanza con que el
    archivo tenga AL MENOS ese tanto de bytes (>=, no ==) - muchas
    herramientas dejan padding/bytes extra al final y el archivo sigue siendo
    100% valido, los lectores (incluido three.js) simplemente los ignoran.
    ASCII: debe cerrar con 'endsolid' (muchos exportadores de binario tambien
    meten 'solid...' como comentario en el header de 80 bytes, por eso se
    valida primero como binario)."""
    if len(contents) < 84:
        return False
    n = struct.unpack('<I', contents[80:84])[0]
    if 84 + n * 50 <= len(contents):
        return True
    tail = contents[-200:].strip().lower()
    return contents[:5].lower() == b'solid' and b'endsolid' in tail


class GetFigurasAdmin(BaseApi):
    ORDEN_MAP = {
        "nombre_asc": "f.nombre ASC",
        "nombre_desc": "f.nombre DESC",
        "fecha_desc": "f.created_at DESC",
        "fecha_asc": "f.created_at ASC",
        "tags_desc": "num_etiquetas DESC, f.nombre ASC",
        "media_desc": "num_media DESC, f.nombre ASC",
        "reacciones_desc": "num_reacciones DESC, f.nombre ASC",
    }

    def main(self):
        self.show_me()
        self.get_filtros()

        query_count = f"""
        SELECT COUNT(DISTINCT f.id) as total
        FROM figuras f
        {self.joins}
        WHERE 1=1 {self.filtros}
        """
        total_res = self.conexion.consulta_asociativa(query_count, self.query_data)
        total = int(total_res.iloc[0]["total"]) if not total_res.empty else 0

        limit = self.data.get("limit", 30)
        page = self.data.get("page", 1)
        try: limit = int(limit)
        except Exception: limit = 30
        try: page = int(page)
        except Exception: page = 1
        offset = (page - 1) * limit

        orden_sql = self.ORDEN_MAP.get(self.data.get("orden"), self.ORDEN_MAP["fecha_desc"])

        query = f"""
        SELECT f.*,
            {CODIGO_EXPR} as codigo,
            (
                SELECT fa.archivo_url FROM figura_archivos fa
                WHERE fa.figura_id = f.id AND fa.tipo = 'resultado'
                ORDER BY fa.orden ASC, fa.created_at ASC LIMIT 1
            ) as portada,
            (SELECT COUNT(*) FROM figura_archivos fa2 WHERE fa2.figura_id = f.id) as num_archivos,
            EXISTS(SELECT 1 FROM figura_archivos fa3 WHERE fa3.figura_id = f.id AND fa3.tipo = 'modelo_3d') as tiene_3d,
            (
                SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre, 'color', e.color))
                FROM figura_etiquetas fe
                JOIN etiquetas e ON e.id = fe.etiqueta_id
                WHERE fe.figura_id = f.id
            ) as etiquetas,
            (SELECT COUNT(*) FROM figura_etiquetas fe2 WHERE fe2.figura_id = f.id) as num_etiquetas,
            (SELECT COUNT(*) FROM figura_archivos fa5 WHERE fa5.figura_id = f.id) as num_media,
            (SELECT COUNT(*) FROM figura_reacciones fr2 WHERE fr2.figura_id = f.id) as num_reacciones
        FROM figuras f
        {self.joins}
        WHERE 1=1 {self.filtros}
        GROUP BY f.id
        ORDER BY {orden_sql}
        LIMIT :limit OFFSET :offset
        """
        query_data = {**self.query_data, "limit": limit, "offset": offset}
        figuras = self.conexion.consulta_asociativa(query, query_data)
        self.response = {
            "data": self.d2d(figuras),
            "pagination": {
                "total": total, "page": page, "limit": limit,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }

    def get_filtros(self):
        self.filtros = ""
        self.joins = ""
        self.query_data = {}

        q = self.data.get("q", None)
        if q:
            q = q.strip()
            try:
                re.compile(q)
                is_regex = True
            except re.error:
                is_regex = False

            if is_regex:
                self.filtros += f" AND (f.nombre ~* :q OR f.descripcion ~* :q OR f.id::text ~* :q OR {CODIGO_EXPR} ~* :q)\n"
                self.query_data["q"] = q
            else:
                q_like = q.lower()
                self.filtros += f" AND (LOWER(f.nombre) LIKE :q OR LOWER(f.descripcion) LIKE :q OR LOWER(f.id::text) LIKE :q OR {CODIGO_EXPR} LIKE :q)\n"
                self.query_data["q"] = f"%{q_like}%"

        estatus = self.data.get("estatus", None)
        if estatus:
            self.filtros += " AND f.estatus = :estatus\n"
            self.query_data["estatus"] = estatus

        desde = self.data.get("desde", None)
        if desde:
            self.filtros += " AND f.created_at >= :desde\n"
            self.query_data["desde"] = desde

        hasta = self.data.get("hasta", None)
        if hasta:
            self.filtros += " AND f.created_at < (:hasta::date + interval '1 day')\n"
            self.query_data["hasta"] = hasta

        etiquetas_raw = self.data.get("etiquetas", None)
        if etiquetas_raw:
            if isinstance(etiquetas_raw, str):
                ids = [e for e in etiquetas_raw.split(",") if e]
            else:
                ids = list(etiquetas_raw)
            if ids:
                self.joins += " JOIN figura_etiquetas fe_filter ON fe_filter.figura_id = f.id\n"
                self.filtros += " AND fe_filter.etiqueta_id = ANY(:etiquetas_ids::uuid[])\n"
                self.query_data["etiquetas_ids"] = ids

        reacciones_raw = self.data.get("reacciones", None)
        if reacciones_raw:
            if isinstance(reacciones_raw, str):
                emojis = [e for e in reacciones_raw.split(",") if e]
            else:
                emojis = list(reacciones_raw)
            if emojis:
                self.joins += " JOIN figura_reacciones fr_filter ON fr_filter.figura_id = f.id\n"
                self.filtros += " AND fr_filter.emoji = ANY(:reacciones_emojis::text[])\n"
                self.query_data["reacciones_emojis"] = emojis


class GetFiguraAdmin(BaseApi):
    def main(self):
        self.show_me()
        id = self.data["id"]

        res = self.conexion.consulta_asociativa(
            f"SELECT f.*, {CODIGO_EXPR} as codigo FROM figuras f WHERE f.id = :id", {"id": id}
        )
        if res.empty:
            raise self.MYE("Figura no encontrada")
        figura = self.d2d(res)[0]

        archivos = self.conexion.consulta_asociativa(
            "SELECT id, archivo_url, tipo, orden FROM figura_archivos WHERE figura_id = :id ORDER BY tipo ASC, orden ASC, created_at ASC",
            {"id": id}
        )
        archivos = self.d2d(archivos)
        figura["resultado"] = [a for a in archivos if a["tipo"] == "resultado"]
        figura["relacionados"] = [a for a in archivos if a["tipo"] == "relacionado"]
        figura["modelos_3d"] = [a for a in archivos if a["tipo"] == "modelo_3d"]

        etiquetas = self.conexion.consulta_asociativa(
            """
            SELECT e.id, e.nombre, e.color FROM figura_etiquetas fe
            JOIN etiquetas e ON e.id = fe.etiqueta_id
            WHERE fe.figura_id = :id
            ORDER BY e.nombre ASC
            """,
            {"id": id}
        )
        figura["etiquetas"] = self.d2d(etiquetas)

        self.response = {"data": figura}


class SaveFigura(BaseApi):
    def main(self):
        self.show_me()
        id_figura = self.data.get("id", None) or self.get_id()
        nombre = (self.data.get("nombre") or "").strip()
        if not nombre:
            raise self.MYE("El nombre es requerido")

        estatus = self.data.get("estatus", "borrador")
        if estatus not in ("borrador", "publico"):
            estatus = "borrador"
        orden = self.data.get("orden", 0)
        try: orden = int(orden)
        except Exception: orden = 0

        figura = {
            "id": id_figura,
            "nombre": nombre,
            "descripcion": self.data.get("descripcion", None),
            "estatus": estatus,
            "orden": orden,
        }

        query = """
        INSERT INTO figuras (id, nombre, descripcion, estatus, orden)
        VALUES (:id, :nombre, :descripcion, :estatus, :orden)
        ON CONFLICT (id) DO UPDATE
        SET nombre = EXCLUDED.nombre,
            descripcion = EXCLUDED.descripcion,
            estatus = EXCLUDED.estatus,
            orden = EXCLUDED.orden,
            updated_at = NOW()
        """
        if not self.conexion.ejecutar(query, figura):
            self.conexion.rollback()
            raise self.MYE("Error al guardar la figura")

        etiquetas_ids = self.data.get("etiquetas_ids", None)
        if etiquetas_ids is not None:
            if isinstance(etiquetas_ids, str):
                try:
                    etiquetas_ids = json.loads(etiquetas_ids)
                except Exception:
                    etiquetas_ids = [e for e in etiquetas_ids.split(",") if e]
            self.conexion.ejecutar("DELETE FROM figura_etiquetas WHERE figura_id = :id", {"id": id_figura})
            for etiqueta_id in etiquetas_ids:
                self.conexion.ejecutar(
                    "INSERT INTO figura_etiquetas (figura_id, etiqueta_id) VALUES (:figura_id, :etiqueta_id)",
                    {"figura_id": id_figura, "etiqueta_id": etiqueta_id}
                )

        self.conexion.commit()
        schedule_home_preview_refresh()
        self.response = {"id": id_figura}


class DeleteFigura(BaseApi):
    def main(self):
        self.show_me()
        id = self.data["id"]

        archivos = self.conexion.consulta_asociativa(
            "SELECT archivo_url FROM figura_archivos WHERE figura_id = :id", {"id": id}
        )
        for row in self.d2d(archivos):
            file_path = os.path.join(MEDIA_DIR, row["archivo_url"])
            if os.path.exists(file_path):
                os.remove(file_path)
        remove_social_preview(id)

        if not self.conexion.ejecutar("DELETE FROM figuras WHERE id = :id", {"id": id}):
            self.conexion.rollback()
            raise self.MYE("Error al eliminar la figura")
        self.conexion.commit()
        schedule_home_preview_refresh()
        self.response = {"id": id}


class SaveFiguraArchivo(BaseApi):
    def main(self):
        self.show_me()
        figura_id = self.data.get("figura_id")
        file = self.data.get("file")
        tipo = self.data.get("tipo", "relacionado")
        if tipo not in ("resultado", "relacionado", "modelo_3d"):
            tipo = "relacionado"
        if not figura_id or not file:
            raise self.MYE("Faltan datos")

        res = self.conexion.consulta_asociativa("SELECT id FROM figuras WHERE id = :id", {"id": figura_id})
        if res.empty:
            raise self.MYE("Figura no encontrada")

        folder_path = os.path.join(MEDIA_DIR, "figuras", str(figura_id))
        os.makedirs(folder_path, exist_ok=True)

        id_archivo = self.get_id()
        ext = os.path.splitext(file.filename or "")[1].lower()
        filename = f"{id_archivo}{ext}"
        file_path = os.path.join(folder_path, filename)
        contents = file.file.read()

        if tipo == "modelo_3d" and ext == ".stl" and not stl_esta_completo(contents):
            raise self.MYE("El archivo .stl parece venir incompleto (subida cortada). Vuelve a intentar la subida.")

        with open(file_path, 'wb') as f:
            f.write(contents)

        archivo_url = f"figuras/{figura_id}/{filename}"
        self.conexion.ejecutar(
            "INSERT INTO figura_archivos (id, figura_id, archivo_url, tipo) VALUES (:id, :figura_id, :archivo_url, :tipo)",
            {"id": id_archivo, "figura_id": figura_id, "archivo_url": archivo_url, "tipo": tipo}
        )
        if tipo == "resultado":
            self.conexion.ejecutar(
                "UPDATE figuras SET updated_at = NOW() WHERE id = :id",
                {"id": figura_id},
            )
        self.conexion.commit()
        if tipo == "resultado":
            refresh_social_preview(self.conexion, figura_id)
        schedule_home_preview_refresh()
        self.response = {"id": id_archivo, "url": archivo_url, "tipo": tipo}


class DeleteFiguraArchivo(BaseApi):
    def main(self):
        self.show_me()
        id_archivo = self.data.get("id")

        res = self.conexion.consulta_asociativa(
            "SELECT figura_id, archivo_url, tipo FROM figura_archivos WHERE id = :id",
            {"id": id_archivo},
        )
        figura_id = None
        tipo = None
        if not res.empty:
            figura_id = str(res.iloc[0]["figura_id"])
            archivo_url = res.iloc[0]["archivo_url"]
            tipo = res.iloc[0]["tipo"]
            file_path = os.path.join(MEDIA_DIR, archivo_url)
            if os.path.exists(file_path):
                os.remove(file_path)

        self.conexion.ejecutar("DELETE FROM figura_archivos WHERE id = :id", {"id": id_archivo})
        if figura_id and tipo == "resultado":
            self.conexion.ejecutar(
                "UPDATE figuras SET updated_at = NOW() WHERE id = :id",
                {"id": figura_id},
            )
        self.conexion.commit()
        if figura_id and tipo == "resultado":
            refresh_social_preview(self.conexion, figura_id)
        schedule_home_preview_refresh()
        self.response = {"id": id_archivo}


class SaveEtiqueta(BaseApi):
    def main(self):
        self.show_me()
        id_etiqueta = self.data.get("id", None)
        nombre = (self.data.get("nombre") or "").strip().lower()
        color = self.data.get("color", "#6366f1")
        if not nombre:
            raise self.MYE("El nombre es requerido")

        if id_etiqueta:
            query = "UPDATE etiquetas SET nombre = :nombre, color = :color WHERE id = :id"
            params = {"id": id_etiqueta, "nombre": nombre, "color": color}
            if not self.conexion.ejecutar(query, params):
                self.conexion.rollback()
                raise self.MYE("Ya existe una etiqueta con ese nombre")
            self.conexion.commit()
            self.response = {"id": id_etiqueta}
            return

        # sin id: reutiliza la etiqueta si ya existe (por nombre, todo en minusculas), si no la crea
        existente = self.conexion.consulta_asociativa(
            "SELECT id, nombre, color FROM etiquetas WHERE nombre = :nombre", {"nombre": nombre}
        )
        if not existente.empty:
            row = existente.iloc[0].to_dict()
            self.response = {"id": row["id"], "nombre": row["nombre"], "color": row["color"], "existed": True}
            return

        id_etiqueta = self.get_id()
        query = "INSERT INTO etiquetas (id, nombre, color) VALUES (:id, :nombre, :color)"
        if not self.conexion.ejecutar(query, {"id": id_etiqueta, "nombre": nombre, "color": color}):
            self.conexion.rollback()
            raise self.MYE("Ya existe una etiqueta con ese nombre")
        self.conexion.commit()
        self.response = {"id": id_etiqueta, "nombre": nombre, "color": color, "existed": False}


class DeleteEtiqueta(BaseApi):
    def main(self):
        self.show_me()
        id = self.data["id"]
        self.conexion.ejecutar("DELETE FROM etiquetas WHERE id = :id", {"id": id})
        self.conexion.commit()
        self.response = {"id": id}
