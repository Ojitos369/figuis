import os
from pathlib import Path
import setproctitle
from ojitos369.errors import CatchErrors as CE

setproctitle.setproctitle('figuis-py')

# ----------------------   BASE   ----------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = os.path.join(BASE_DIR, 'media')
PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', '').rstrip('/')


def env_bool(name, default=False):
    return str(os.environ.get(name, default)).strip().lower() in {'1', 'true', 'yes', 'on'}


def env_optional_int(name, default=None, *, minimum=1):
    """Entero opcional: sin la env var (o "0"/"unlimited"/"off") = sin límite (None)."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    raw = raw.strip()
    if raw == '' or raw.lower() in {'0', 'none', 'unlimited', 'off'}:
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError(f'{name} debe ser un entero, "unlimited" o "0"') from exc
    if value < minimum:
        raise ValueError(f'{name} debe ser >= {minimum}')
    return value


# Sin límite por defecto: el panel admin es de un solo usuario autenticado y
# las subidas ya van en streaming a disco (nunca se bufferean en memoria), así
# que el único riesgo real es llenar el disco del servidor a mano. Se puede
# reintroducir un tope pasando bytes por env (o "0"/"unlimited" para quitarlo).
MAX_REQUEST_BODY_SIZE = env_optional_int('MAX_REQUEST_BODY_SIZE', default=None)
MAX_UPLOAD_FILE_SIZE = env_optional_int('MAX_UPLOAD_FILE_SIZE', default=None)
if (
    MAX_UPLOAD_FILE_SIZE is not None
    and MAX_REQUEST_BODY_SIZE is not None
    and MAX_UPLOAD_FILE_SIZE >= MAX_REQUEST_BODY_SIZE
):
    raise ValueError('MAX_UPLOAD_FILE_SIZE debe ser menor que MAX_REQUEST_BODY_SIZE')


# Los crawlers que alimentan búsquedas se permiten en robots.txt. Entrenamiento
# es una decisión de política distinta y queda desactivado por defecto.
ALLOW_AI_TRAINING_CRAWLERS = env_bool('ALLOW_AI_TRAINING_CRAWLERS', False)
HOME_PREVIEW_CAPTURE_URL = os.environ.get(
    'HOME_PREVIEW_CAPTURE_URL',
    f'{PUBLIC_BASE_URL}/?social_capture=1' if PUBLIC_BASE_URL else 'http://127.0.0.1:8000/?social_capture=1',
)
HOME_PREVIEW_REFRESH_SECONDS = int(os.environ.get('HOME_PREVIEW_REFRESH_SECONDS', '3600'))
prod_mode = True if str(os.environ.get('RUN_PROD_MODE', True)).title() == 'True' else False
dev_mode = True if str(os.environ.get('RUN_DEV_MODE', False)).title() == 'True' else False

# ----------------------   CORS   ----------------------
origins = [
    "http://localhost:5173",
]
allow_origin_regex = r"^https?://(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$"
allow_origins = origins
allow_credentials = True
allow_methods = ["*"]
allow_headers = ["*"]

# ----------------------   DATABASE   ----------------------
db_data = {
    "host": os.environ.get('DB_HOST'),
    "user": os.environ.get('DB_USER'),
    "password": os.environ.get('DB_PASSWORD'),
    "name": os.environ.get('DB_NAME'),
    "port": os.environ.get('DB_PORT', '5442'),
}

COOKIE_NAME = "figuis"
# La sesion en si no expira sola (ver `sesiones` en DB), pero el cookie debe
# sobrevivir a un reinicio del navegador. 400 dias es el max_age tope que
# aceptan Chrome/Firefox para cookies persistentes.
COOKIE_MAX_AGE = 400 * 24 * 60 * 60

# ----------------------   EMAIL   ----------------------
port = os.environ.get('EMAIL_PORT', None)
email_settings = {
    'smtp_server': os.environ.get('EMAIL_HOST', None),
    'port': int(port) if port else None,
    'sender': os.environ.get('EMAIL_HOST_USER', None),
    'receiver': 'ojitos369@gmail.com',
    'user': os.environ.get('EMAIL_HOST_USER', None),
    'password': os.environ.get('EMAIL_HOST_PASSWORD', None),
}

# ----------------------   ERROR   ----------------------
class MYE(Exception):
    pass

ce = CE(name_project = 'figuis', email_settings = email_settings)
