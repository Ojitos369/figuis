from uuid import uuid4 as u4
import pandas as pd
import datetime

from ojitos369_postgres_db.postgres_db import ConexionPostgreSQL
from core.conf.settings import MYE, ce, prod_mode, db_data

# codigo corto de 6 digitos derivado del id (uuid): toma los primeros 6
# caracteres hex del uuid, los interpreta como numero y los recorta a 6
# digitos. Determinista (siempre el mismo codigo para el mismo id), no se
# guarda en tabla, se calcula al vuelo en cada query. Requiere alias `f`
# sobre la tabla `figuras` en el FROM de la query donde se use.
# OJO: %% (no %) - el driver hace %-formatting sobre el SQL final (convierte
# :nombre a %(nombre)s), asi que un % suelto (el modulo aqui abajo) rompe el
# parseo de parametros ("dict is not a sequence").
CODIGO_EXPR = "lpad(((('x' || left(replace(f.id::text,'-',''),6))::bit(24)::int) %% 1000000)::text, 6, '0')"

class ClassBase:
    def create_conexion(self):
        self.close_conexion()
        self.conexion = ConexionPostgreSQL(db_data, ce=ce, send_error=prod_mode, parameter_indicator=':')
        self.conexion.raise_error = True

    def close_conexion(self):
        try:
            self.conexion.close()
        except Exception:
            pass

    def get_id(self, hex=False, long=None):
        id = ""
        if hex:
            if long:
                id = str(u4().hex)[:long]
            else:
                id = str(u4().hex)
        else:
            if long:
                id = str(u4())[:long]
            else:
                id = str(u4())
        return id

    def d2d(self, df):
        if not isinstance(df, (pd.DataFrame, pd.Series)):
            return df
        if isinstance(df, pd.DataFrame) and df.empty:
            return []
        clean_df = df.copy().astype(object)
        target_replaces = {"None": None, "True": True, "False": False}
        clean_df = clean_df.replace(target_replaces).infer_objects(copy=False)
        clean_df = clean_df.where(pd.notnull(clean_df), None)
        if isinstance(df, pd.DataFrame):
            return clean_df.to_dict(orient='records')
        return clean_df.to_dict()

    def send_me_error(self, msg):
        if hasattr(self, 'ce'):
            ce_temp = self.ce
        else:
            ce_temp = ce
        error = Exception(msg)
        ce_temp.show_error(error, send_email=True)

