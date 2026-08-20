import io
import os
import re
import uuid
import zipfile

from core.bases.apis import BaseApi, NoSession, pln
from core.bases.utils import CODIGO_EXPR, CODIGO_LEGACY_EXPR
from core.catalog import (
    canonical_identifier,
    collection_slug,
    normalize_pagination,
    resolve_collection,
)
from core.conf.settings import MEDIA_DIR
from fastapi.responses import StreamingResponse


class DownloadFiguraMedia(NoSession, BaseApi):
    """Genera un ZIP con los resultados y archivos relacionados de una figura."""

    def main(self):
        resolved = resolve_collection(self.data.get("id"), connection=self.conexion)
        if resolved is None:
            raise self.MYE("Figura no encontrada")
        figura_id = resolved["id"]

        figura = self.conexion.consulta_asociativa(
            "SELECT id, nombre FROM figuras WHERE id = :id AND estatus = 'publico'",
            {"id": figura_id},
        )
        if figura.empty:
            raise self.MYE("Figura no encontrada")

        archivo_ids = []
        for raw_id in str(self.data.get("archivos") or "").split(","):
            raw_id = raw_id.strip()
            if not raw_id:
                continue
            try:
                archivo_ids.append(str(uuid.UUID(raw_id)))
            except ValueError:
                continue

        params = {"id": figura_id}
        filtro_ids = ""
        if archivo_ids:
            filtro_ids = "AND id = ANY(:archivo_ids::uuid[])"
            params["archivo_ids"] = archivo_ids

        archivos = self.conexion.consulta_asociativa(
            f"""
            SELECT archivo_url, tipo
            FROM figura_archivos
            WHERE figura_id = :id AND tipo IN ('resultado', 'relacionado') {filtro_ids}
            ORDER BY tipo ASC, orden ASC, created_at ASC
            """,
            params,
        )

        buffer = io.BytesIO()
        used_names = set()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for row in self.d2d(archivos):
                relative_path = str(row["archivo_url"])
                file_path = os.path.abspath(os.path.join(MEDIA_DIR, relative_path))
                if os.path.commonpath((file_path, os.path.abspath(MEDIA_DIR))) != os.path.abspath(MEDIA_DIR):
                    continue
                if not os.path.isfile(file_path):
                    continue

                base_name = os.path.basename(relative_path)
                archive_name = f"{row['tipo']}/{base_name}"
                stem, extension = os.path.splitext(archive_name)
                suffix = 1
                while archive_name in used_names:
                    archive_name = f"{stem}_{suffix}{extension}"
                    suffix += 1
                used_names.add(archive_name)
                archive.write(file_path, archive_name)

        buffer.seek(0)
        nombre = str(figura.iloc[0]["nombre"] or "album").strip()
        safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", nombre).strip("._") or "album"
        return StreamingResponse(
            buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{safe_name}.zip"'},
        )


class GetFiguras(NoSession, BaseApi):
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
        WHERE f.estatus = 'publico' {self.filtros}
        """
        total_res = self.conexion.consulta_asociativa(query_count, self.query_data)
        total = int(total_res.iloc[0]["total"]) if not total_res.empty else 0

        page, limit = normalize_pagination(
            self.data.get("page", 1), self.data.get("limit", 24)
        )
        offset = (page - 1) * limit

        orden_sql = self.ORDEN_MAP.get(self.data.get("orden"), self.ORDEN_MAP["fecha_desc"])

        query = f"""
        SELECT f.id, f.nombre, f.descripcion, f.created_at,
            {CODIGO_EXPR} as codigo,
            (
                SELECT fa.archivo_url FROM figura_archivos fa
                WHERE fa.figura_id = f.id AND fa.tipo = 'resultado'
                ORDER BY fa.orden ASC, fa.created_at ASC LIMIT 1
            ) as portada,
            (SELECT COUNT(*) FROM figura_archivos fa2 WHERE fa2.figura_id = f.id AND fa2.tipo = 'relacionado') as num_relacionados,
            EXISTS(SELECT 1 FROM figura_archivos fa4 WHERE fa4.figura_id = f.id AND fa4.tipo = 'modelo_3d') as tiene_3d,
            (
                SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre, 'color', e.color))
                FROM figura_etiquetas fe
                JOIN etiquetas e ON e.id = fe.etiqueta_id
                WHERE fe.figura_id = f.id
            ) as etiquetas,
            (
                SELECT json_agg(json_build_object('emoji', r.emoji, 'cantidad', r.cantidad))
                FROM (
                    SELECT emoji, COUNT(*) as cantidad
                    FROM figura_reacciones
                    WHERE figura_id = f.id
                    GROUP BY emoji
                    ORDER BY cantidad DESC
                    LIMIT 5
                ) r
            ) as reacciones_top,
            (SELECT COUNT(*) FROM figura_etiquetas fe3 WHERE fe3.figura_id = f.id) as num_etiquetas,
            (SELECT COUNT(*) FROM figura_archivos fa3 WHERE fa3.figura_id = f.id) as num_media,
            (SELECT COUNT(*) FROM figura_reacciones fr2 WHERE fr2.figura_id = f.id) as num_reacciones
        FROM figuras f
        {self.joins}
        WHERE f.estatus = 'publico' {self.filtros}
        GROUP BY f.id
        ORDER BY {orden_sql}
        LIMIT :limit OFFSET :offset
        """
        query_data = {**self.query_data, "limit": limit, "offset": offset}
        figuras = self.d2d(self.conexion.consulta_asociativa(query, query_data))
        for figura in figuras:
            etiquetas = figura.get("etiquetas") if isinstance(figura.get("etiquetas"), list) else []
            figura["slug"] = collection_slug(figura.get("nombre"), etiquetas)
            figura["canonical_id"] = canonical_identifier(figura.get("nombre"), etiquetas, figura["id"])
        self.response = {
            "data": figuras,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "total_pages": (total + limit - 1) // limit if limit > 0 else 0
            }
        }

    def get_filtros(self):
        self.filtros = ""
        self.joins = ""
        self.query_data = {}

        q = self.data.get("q", None)
        if q:
            # Las etiquetas se muestran con ``#`` en la UI, pero se guardan
            # sin ese prefijo. Aceptar ambas formas hace que ``twice`` y
            # ``#twice`` produzcan el mismo resultado.
            q = q.strip().lstrip("#").strip()
        if q:
            try:
                re.compile(q)
                is_regex = True
            except re.error:
                is_regex = False

            if is_regex:
                # ~* = regex posix, sin distinguir mayusculas. Busca en nombre,
                # descripcion, id y codigo corto (para poder pegar/buscar un
                # id o codigo directo, tanto el alfanumerico actual como el
                # numerico legacy de codigos ya compartidos antes del cambio).
                self.filtros += f""" AND (
                    f.nombre ~* :q
                    OR COALESCE(f.descripcion, '') ~* :q
                    OR f.id::text ~* :q
                    OR {CODIGO_EXPR} ~* :q
                    OR {CODIGO_LEGACY_EXPR} ~* :q
                    OR EXISTS (
                        SELECT 1
                        FROM figura_etiquetas fe_search
                        JOIN etiquetas e_search ON e_search.id = fe_search.etiqueta_id
                        WHERE fe_search.figura_id = f.id
                          AND e_search.nombre ~* :q
                    )
                )
                """
                self.query_data["q"] = q
            else:
                # el texto no es un regex valido (parentesis sueltos, etc):
                # se cae a busqueda de substring normal, sin tronar la consulta.
                q_like = q.lower()
                self.filtros += f""" AND (
                    LOWER(f.nombre) LIKE :q
                    OR LOWER(COALESCE(f.descripcion, '')) LIKE :q
                    OR LOWER(f.id::text) LIKE :q
                    OR LOWER({CODIGO_EXPR}) LIKE :q
                    OR {CODIGO_LEGACY_EXPR} LIKE :q
                    OR EXISTS (
                        SELECT 1
                        FROM figura_etiquetas fe_search
                        JOIN etiquetas e_search ON e_search.id = fe_search.etiqueta_id
                        WHERE fe_search.figura_id = f.id
                          AND LOWER(e_search.nombre) LIKE :q
                    )
                )
                """
                self.query_data["q"] = f"%{q_like}%"

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


class GetFiguraPagina(GetFiguras):
    """Dado un id de figura y el orden/filtros actuales, calcula en que
    pagina cae dentro del listado paginado (para abrir el detalle desde
    cero -p. ej. nueva pestana- en la pagina que le corresponde en vez de
    la 1)."""

    def main(self):
        self.show_me()
        self.get_filtros()

        resolved = resolve_collection(self.data.get("id"), connection=self.conexion)
        if resolved is None:
            self.response = {"data": None}
            return
        figura_id = resolved["id"]

        _, limit = normalize_pagination(1, self.data.get("limit", 24))

        orden_sql = self.ORDEN_MAP.get(self.data.get("orden"), self.ORDEN_MAP["fecha_desc"])

        query = f"""
        WITH ordered AS (
            SELECT f.id,
                (SELECT COUNT(*) FROM figura_etiquetas fe3 WHERE fe3.figura_id = f.id) as num_etiquetas,
                (SELECT COUNT(*) FROM figura_archivos fa3 WHERE fa3.figura_id = f.id) as num_media,
                (SELECT COUNT(*) FROM figura_reacciones fr2 WHERE fr2.figura_id = f.id) as num_reacciones,
                ROW_NUMBER() OVER (ORDER BY {orden_sql}) as rn
            FROM figuras f
            {self.joins}
            WHERE f.estatus = 'publico' {self.filtros}
            GROUP BY f.id
        )
        SELECT rn FROM ordered WHERE id = :id
        """
        query_data = {**self.query_data, "id": figura_id}
        res = self.conexion.consulta_asociativa(query, query_data)
        if res.empty:
            self.response = {"data": None}
            return

        rn = int(res.iloc[0]["rn"])
        page = ((rn - 1) // limit) + 1 if limit > 0 else 1
        self.response = {"data": {"page": page, "position": rn}}


class GetFigura(NoSession, BaseApi):
    def main(self):
        self.show_me()
        resolved = resolve_collection(self.data["id"], connection=self.conexion)
        if resolved is None:
            raise self.MYE("Figura no encontrada")
        id = resolved["id"]

        query = f"SELECT f.*, {CODIGO_EXPR} as codigo FROM figuras f WHERE f.id = :id AND f.estatus = 'publico'"
        res = self.conexion.consulta_asociativa(query, {"id": id})
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
        figura["tags"] = figura["etiquetas"]
        figura["slug"] = collection_slug(figura.get("nombre"), figura["etiquetas"])
        figura["canonical_id"] = canonical_identifier(figura.get("nombre"), figura["etiquetas"], id)
        figura["resolution"] = resolved["resolution"]

        reacciones = self.conexion.consulta_asociativa(
            """
            SELECT emoji, COUNT(*) as cantidad
            FROM figura_reacciones
            WHERE figura_id = :id
            GROUP BY emoji
            ORDER BY cantidad DESC
            """,
            {"id": id}
        )
        figura["reacciones"] = self.d2d(reacciones)

        visitor_id = self.data.get("visitor_id", None)
        mis_reacciones = []
        if visitor_id:
            mias = self.conexion.consulta_asociativa(
                "SELECT emoji FROM figura_reacciones WHERE figura_id = :id AND visitor_id = :visitor_id",
                {"id": id, "visitor_id": visitor_id}
            )
            mis_reacciones = [r["emoji"] for r in self.d2d(mias)]
        figura["mis_reacciones"] = mis_reacciones

        self.response = {"data": figura}


class ToggleReaccion(NoSession, BaseApi):
    def main(self):
        self.show_me()
        figura_id = self.data.get("figura_id")
        visitor_id = (self.data.get("visitor_id") or "").strip()[:64]
        emoji = (self.data.get("emoji") or "").strip()[:16]
        if not figura_id or not visitor_id or not emoji:
            raise self.MYE("Faltan datos")

        existente = self.conexion.consulta_asociativa(
            "SELECT id FROM figura_reacciones WHERE figura_id = :figura_id AND visitor_id = :visitor_id AND emoji = :emoji",
            {"figura_id": figura_id, "visitor_id": visitor_id, "emoji": emoji}
        )
        if not existente.empty:
            self.conexion.ejecutar(
                "DELETE FROM figura_reacciones WHERE id = :id",
                {"id": existente.iloc[0]["id"]}
            )
            added = False
        else:
            self.conexion.ejecutar(
                "INSERT INTO figura_reacciones (id, figura_id, visitor_id, emoji) VALUES (:id, :figura_id, :visitor_id, :emoji)",
                {"id": self.get_id(), "figura_id": figura_id, "visitor_id": visitor_id, "emoji": emoji}
            )
            added = True
        self.conexion.commit()

        reacciones = self.conexion.consulta_asociativa(
            """
            SELECT emoji, COUNT(*) as cantidad
            FROM figura_reacciones
            WHERE figura_id = :figura_id
            GROUP BY emoji
            ORDER BY cantidad DESC
            """,
            {"figura_id": figura_id}
        )
        self.response = {"added": added, "reacciones": self.d2d(reacciones)}


class GetEtiquetas(NoSession, BaseApi):
    def main(self):
        self.show_me()
        query = """
        SELECT e.id, e.nombre, e.color,
            (
                SELECT COUNT(DISTINCT fe.figura_id) FROM figura_etiquetas fe
                JOIN figuras f ON f.id = fe.figura_id AND f.estatus = 'publico'
                WHERE fe.etiqueta_id = e.id
            ) as num_figuras
        FROM etiquetas e
        ORDER BY e.nombre ASC
        """
        etiquetas = self.conexion.consulta_asociativa(query)
        self.response = {"data": self.d2d(etiquetas)}


class GetReacciones(NoSession, BaseApi):
    def main(self):
        self.show_me()
        query = """
        SELECT r.emoji, COUNT(DISTINCT r.figura_id) as num_figuras, COUNT(*) as total
        FROM figura_reacciones r
        JOIN figuras f ON f.id = r.figura_id AND f.estatus = 'publico'
        GROUP BY r.emoji
        ORDER BY total DESC
        """
        reacciones = self.conexion.consulta_asociativa(query)
        self.response = {"data": self.d2d(reacciones)}
