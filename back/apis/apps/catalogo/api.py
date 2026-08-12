import re

from core.bases.apis import BaseApi, NoSession, pln


class GetFiguras(NoSession, BaseApi):
    ORDEN_MAP = {
        "nombre_asc": "f.nombre ASC",
        "nombre_desc": "f.nombre DESC",
        "fecha_desc": "f.created_at DESC",
        "fecha_asc": "f.created_at ASC",
        "tags_desc": "num_etiquetas DESC, f.nombre ASC",
        "media_desc": "num_media DESC, f.nombre ASC",
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

        limit = self.data.get("limit", 24)
        page = self.data.get("page", 1)
        try: limit = int(limit)
        except Exception: limit = 24
        try: page = int(page)
        except Exception: page = 1
        offset = (page - 1) * limit

        orden_sql = self.ORDEN_MAP.get(self.data.get("orden"), self.ORDEN_MAP["fecha_desc"])

        query = f"""
        SELECT f.id, f.nombre, f.descripcion, f.created_at,
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
            (SELECT COUNT(*) FROM figura_archivos fa3 WHERE fa3.figura_id = f.id) as num_media
        FROM figuras f
        {self.joins}
        WHERE f.estatus = 'publico' {self.filtros}
        GROUP BY f.id
        ORDER BY {orden_sql}
        LIMIT :limit OFFSET :offset
        """
        query_data = {**self.query_data, "limit": limit, "offset": offset}
        figuras = self.conexion.consulta_asociativa(query, query_data)
        self.response = {
            "data": self.d2d(figuras),
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
            q = q.strip()
            try:
                re.compile(q)
                is_regex = True
            except re.error:
                is_regex = False

            if is_regex:
                # ~* = regex posix, sin distinguir mayusculas. Busca en nombre,
                # descripcion e id (para poder pegar/buscar un id directo).
                self.filtros += " AND (f.nombre ~* :q OR f.descripcion ~* :q OR f.id::text ~* :q)\n"
                self.query_data["q"] = q
            else:
                # el texto no es un regex valido (parentesis sueltos, etc):
                # se cae a busqueda de substring normal, sin tronar la consulta.
                q_like = q.lower()
                self.filtros += " AND (LOWER(f.nombre) LIKE :q OR LOWER(f.descripcion) LIKE :q OR LOWER(f.id::text) LIKE :q)\n"
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


class GetFigura(NoSession, BaseApi):
    def main(self):
        self.show_me()
        id = self.data["id"]

        query = "SELECT * FROM figuras WHERE id = :id AND estatus = 'publico'"
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
