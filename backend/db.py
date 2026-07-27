"""MongoDB client + shared constants."""
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
OWNER_EMAIL = os.environ.get('OWNER_EMAIL', '').lower().strip()

# On cloud hosts (Render/Heroku/etc.) the base image often lacks a full CA
# bundle, causing the TLS handshake to MongoDB Atlas to fail with
# "TLSV1_ALERT_INTERNAL_ERROR". Pinning `tlsCAFile` to certifi's bundle is the
# documented fix. We only enable it when the connection URI actually uses TLS
# (Atlas `mongodb+srv://` or an explicit `?tls=true` param); passing it against
# a plaintext local `mongodb://` would silently enable TLS and break dev.
_uri = MONGO_URL.lower()
_use_tls = _uri.startswith("mongodb+srv://") or "tls=true" in _uri or "ssl=true" in _uri
_client_kwargs = {"tlsCAFile": certifi.where()} if _use_tls else {}

client = AsyncIOMotorClient(MONGO_URL, **_client_kwargs)
db = client[DB_NAME]
