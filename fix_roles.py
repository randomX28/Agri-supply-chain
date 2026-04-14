import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fix_user_metadata():
    print("Fetching users from Supabase Auth...")
    response = supabase.auth.admin.list_users()
    
    # Check return type (handle both list and object with .users)
    users = getattr(response, "users", response) if hasattr(response, "users") else response
    
    updated_count = 0
    for u in users:
        current_metadata = u.user_metadata or {}
        current_role = current_metadata.get("role", "")
        
        if current_role == "operator":
            print(f"Found user with role 'operator': {u.email} (ID: {u.id})")
            
            # Create new metadata, changing just the role
            new_metadata = current_metadata.copy()
            new_metadata["role"] = "warehouse_manager" # Or use "transporter" if they are truck drivers
            
            # Update the user metadata
            try:
                # Update user by ID
                supabase.auth.admin.update_user_by_id(
                    u.id, 
                    {"user_metadata": new_metadata}
                )
                print(f"  [SUCCESS] Successfully updated role to 'warehouse_manager'")
                updated_count += 1
            except Exception as e:
                print(f"  [ERROR] Failed to update: {e}")
                
    print(f"\nCompleted! Updated {updated_count} user(s).")

if __name__ == "__main__":
    fix_user_metadata()
