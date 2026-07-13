import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / '.env')

DEFAULT_CORS_ORIGINS = [
    r'http://localhost:\d+',
    r'http://127\.0\.0\.1:\d+',
    r'http://192\.168\.\d{1,3}\.\d{1,3}:\d+',
    r'http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+',
    r'http://172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}:\d+',
]


def _parse_cors_origins():
    raw = os.getenv('CORS_ORIGINS', '').strip()
    if not raw:
        return DEFAULT_CORS_ORIGINS

    return [origin.strip() for origin in raw.split(',') if origin.strip()]


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    MONGO_URI = os.getenv('MONGO_URI')
    DB_NAME = os.getenv('DB_NAME')
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    CORS_ALLOW_ALL = os.getenv('CORS_ALLOW_ALL', 'False') == 'True'
    CORS_ORIGINS = _parse_cors_origins()
