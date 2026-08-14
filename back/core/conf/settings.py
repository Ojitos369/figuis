import os
from pathlib import Path
import setproctitle
from ojitos369.errors import CatchErrors as CE

setproctitle.setproctitle('figuis-py')

# ----------------------   BASE   ----------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = os.path.join(BASE_DIR, 'media')
PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', '').rstrip('/')
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
allow_origin_regex = r"https?://.*(localhost)+.*(:[0-9]+)?"
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

SESSION_HOURS = 12
COOKIE_NAME = "figuis"

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
