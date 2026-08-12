-- postgresql
/*
-- OJO: usa un volumen CON NOMBRE (figuis-db-data). Si vuelves a correr este
-- docker run tras un "docker rm -f figuis-dbl", los datos se conservan porque
-- el volumen no se borra (a diferencia de un volumen anonimo, que se pierde).
-- Mejor aun: usa docker-compose.yml (servicio figuis-db) en vez de esto.
docker rm -f figuis-dbl && \
docker run --name figuis-dbl -d \
    -e POSTGRES_DB=figuis \
    -e POSTGRES_USER=figuis \
    -e POSTGRES_PASSWORD=figuis \
    -e TZ=America/Mexico_City \
    -p 5442:5432 \
    -v figuis-db-data:/var/lib/postgresql/data \
    postgres

docker exec -it figuis-dbl psql -U figuis -d figuis
docker exec -it figuis-dbp psql -U figuis -d figuis

export DB_HOST="localhost"
export DB_USER="figuis"
export DB_PASSWORD="figuis"
export DB_NAME="figuis"
export DB_PORT="5442"
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

-- reacciones tipo whatsapp de visitantes anonimos (visitor_id = uuid generado
-- y guardado en localStorage del navegador, no requiere cuenta)
CREATE TABLE IF NOT EXISTS figura_reacciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    figura_id uuid REFERENCES figuras(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64) NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (figura_id, visitor_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_figura_reacciones_figura ON figura_reacciones(figura_id);


-- Seed de cuentas de prueba (idempotente). Borrar antes de pasar a prod.
INSERT INTO usuarios (id, nombre, usuario, password)
SELECT gen_random_uuid(), 'Erick Garcia', 'ojitos369', '$argon2id$v=19$m=65536,t=3,p=4$x/gfY+z93/ufk9L6/x8j5A$hSRMbAE7gsevFAi3RJkVUtY1bmr3M9TAs5uNI0EDOhc'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE lower(usuario) = 'ojitos369');

INSERT INTO usuarios (id, nombre, usuario, password)
SELECT gen_random_uuid(), 'test', 'test', '$argon2id$v=19$m=65536,t=3,p=4$8r63FgLgfI/xvjdmDKF0rg$Z2qMlvUv0QukeCVP16zMTRzcT4X2f6NZs2NQ6AYxkFk'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE lower(usuario) = 'test');