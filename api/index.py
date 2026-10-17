"""Vercel Serverless Function entrypoint for SolarisFortress CTF Platform.

Vercel's Python runtime detects WSGI applications exported as `app` or `handler`.
This routes /api/*, /admin/*, and media requests into the Django WSGI application.
"""
import os
import sys
from pathlib import Path

# Add the backend directory to Python sys.path so config and challenges can be imported
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure settings module is configured
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application

# Vercel WSGI entry point
app = get_wsgi_application()
