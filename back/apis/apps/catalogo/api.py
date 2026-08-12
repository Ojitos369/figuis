from core.bases.apis import BaseApi, NoSession, pln


class GetFiguras(NoSession, BaseApi):
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

        query = f"""
        SELECT f.id, f.nombre, f.descripcion, f.created_at,
            (
                SELECT fa.archivo_url FROM figura_archivos fa
                WHERE fa.figura_id = f.id AND fa.tipo = 'resultado'
                ORDER BY fa.orden ASC, fa.created_at ASC LIMIT 1
            ) as portada,
            (SELECT COUNT(*) FROM figura_archivos fa2 WHERE fa2.figura_id = f.id AND fa2.tipo = 'relacionado') as num_relacionados,
            (
                SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre, 'color', e.color))
                FROM figura_etiquetas fe
                JOIN etiquetas e ON e.id = fe.etiqueta_id
                WHERE fe.figura_id = f.id
            ) as etiquetas
        FROM figuras f
        {self.joins}
        WHERE f.estatus = 'publico' {self.filtros}
        GROUP BY f.id
        ORDER BY f.orden ASC, f.created_at DESC
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
            q = q.strip().lower()
            self.filtros += " AND (LOWER(f.nombre) LIKE :q OR LOWER(f.descripcion) LIKE :q)\n"
            self.query_data["q"] = f"%{q}%"

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
