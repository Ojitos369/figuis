import os
import json

from core.bases.apis import AdminApi, pln
from core.conf.settings import MEDIA_DIR


class GetFigurasAdmin(AdminApi):
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

        query = f"""
        SELECT f.*,
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
            ) as etiquetas
        FROM figuras f
        {self.joins}
        WHERE 1=1 {self.filtros}
        GROUP BY f.id
        ORDER BY f.orden ASC, f.created_at DESC
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
            q = q.strip().lower()
            self.filtros += " AND (LOWER(f.nombre) LIKE :q OR LOWER(f.descripcion) LIKE :q)\n"
            self.query_data["q"] = f"%{q}%"

        estatus = self.data.get("estatus", None)
        if estatus:
            self.filtros += " AND f.estatus = :estatus\n"
            self.query_data["estatus"] = estatus


class GetFiguraAdmin(AdminApi):
    def main(self):
        self.show_me()
        id = self.data["id"]

        res = self.conexion.consulta_asociativa("SELECT * FROM figuras WHERE id = :id", {"id": id})
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


class SaveFigura(AdminApi):
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
        self.response = {"id": id_figura}


class DeleteFigura(AdminApi):
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

        if not self.conexion.ejecutar("DELETE FROM figuras WHERE id = :id", {"id": id}):
            self.conexion.rollback()
            raise self.MYE("Error al eliminar la figura")
        self.conexion.commit()
        self.response = {"id": id}


class SaveFiguraArchivo(AdminApi):
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
        with open(file_path, 'wb') as f:
            f.write(contents)

        archivo_url = f"figuras/{figura_id}/{filename}"
        self.conexion.ejecutar(
            "INSERT INTO figura_archivos (id, figura_id, archivo_url, tipo) VALUES (:id, :figura_id, :archivo_url, :tipo)",
            {"id": id_archivo, "figura_id": figura_id, "archivo_url": archivo_url, "tipo": tipo}
        )
        self.conexion.commit()
        self.response = {"id": id_archivo, "url": archivo_url, "tipo": tipo}


class DeleteFiguraArchivo(AdminApi):
    def main(self):
        self.show_me()
        id_archivo = self.data.get("id")

        res = self.conexion.consulta_asociativa("SELECT archivo_url FROM figura_archivos WHERE id = :id", {"id": id_archivo})
        if not res.empty:
            archivo_url = res.iloc[0]["archivo_url"]
            file_path = os.path.join(MEDIA_DIR, archivo_url)
            if os.path.exists(file_path):
                os.remove(file_path)

        self.conexion.ejecutar("DELETE FROM figura_archivos WHERE id = :id", {"id": id_archivo})
        self.conexion.commit()
        self.response = {"id": id_archivo}


class SaveEtiqueta(AdminApi):
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


class DeleteEtiqueta(AdminApi):
    def main(self):
        self.show_me()
        id = self.data["id"]
        self.conexion.ejecutar("DELETE FROM etiquetas WHERE id = :id", {"id": id})
        self.conexion.commit()
        self.response = {"id": id}
