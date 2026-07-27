"""MongoDB client + shared constants."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret')
OWNER_EMAIL = os.environ.get('OWNER_EMAIL', '').lower().strip()

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
