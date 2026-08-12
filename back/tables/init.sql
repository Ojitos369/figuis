-- postgresql
/*
docker rm -f figuis-dbl && \
docker run --name figuis-dbl -d \
    -e POSTGRES_DB=figuis \
    -e POSTGRES_USER=figuis \
    -e POSTGRES_PASSWORD=figuis \
    -e TZ=America/Mexico_City \
    -p 5442:5432 \
    postgres

docker exec -it figuis-dbl psql -U figuis -d figuis
docker exec -it figuis-dbp psql -U figuis -d figuis

export DB_HOST="localhost"
export DB_USER="figuis"
export DB_PASSWORD="figuis"
export DB_NAME="figuis"
export DB_PORT="5446"
export ADMIN_KEY="123456"

*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------   USUARIOS ADMIN   -------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id VARCHAR(50) PRIMARY KEY,
    usuario VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    nombre VARCHAR(150),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sesiones (
    id VARCHAR(50) PRIMARY KEY,
    token VARCHAR(100) UNIQUE NOT NULL,
    usuario_id VARCHAR(50) REFERENCES usuarios(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);

-- -------------------   ETIQUETAS   -------------------
CREATE TABLE IF NOT EXISTS etiquetas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(60) UNIQUE NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT NOW()
);

-- -------------------   FIGURAS (catalogo)   -------------------
CREATE TABLE IF NOT EXISTS figuras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    estatus VARCHAR(20) NOT NULL DEFAULT 'borrador', -- borrador | publico
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_figuras_estatus ON figuras(estatus);

CREATE TABLE IF NOT EXISTS figura_etiquetas (
    figura_id uuid REFERENCES figuras(id) ON DELETE CASCADE,
    etiqueta_id uuid REFERENCES etiquetas(id) ON DELETE CASCADE,
    PRIMARY KEY (figura_id, etiqueta_id)
);

-- tipo: 'resultado' (portada / figura final) | 'relacionado' (fotos de referencia usadas)
CREATE TABLE IF NOT EXISTS figura_archivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    figura_id uuid REFERENCES figuras(id) ON DELETE CASCADE,
    archivo_url TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'relacionado', -- resultado | relacionado
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_figura_archivos_figura ON figura_archivos(figura_id);
