import os
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client, Client


# This finds the directory where database.py actually lives
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

# Add this temporary debug line to see what's happening
print(f"DEBUG: URL found is: {url}") 

if not url or not key:
    raise ValueError("URL or Key missing! Check if .env is in: " + str(env_path))

supabase: Client = create_client(url, key)