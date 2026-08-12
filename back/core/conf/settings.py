import os
from pathlib import Path
import setproctitle
from ojitos369.errors import CatchErrors as CE

setproctitle.setproctitle('figuis-py')

# ----------------------   BASE   ----------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MEDIA_DIR = os.path.join(BASE_DIR, 'media')
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
    "port": os.environ.get('DB_PORT', '5432'),
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

ce = CE(name_project = 'REAPI', email_settings = email_settings)
