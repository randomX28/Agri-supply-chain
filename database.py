import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables (from .env locally, or from system in production)
load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("⚠️ WARNING: SUPABASE_URL or SERVICE_ROLE_KEY missing from environment!")

# Initialize Supabase (will work if url and key are provided in Render Dashboard settings)
supabase: Client = create_client(url, key) if (url and key) else None