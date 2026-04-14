from database import supabase
try:
    auth_users = supabase.auth.admin.list_users()
    print(f"Type of auth_users: {type(auth_users)}")
    print(f"First element: {auth_users[0] if isinstance(auth_users, list) else 'Not a list'}")
    if hasattr(auth_users, 'users'):
        print(f"Has .users attribute. Count: {len(auth_users.users)}")
    else:
        print("Does not have .users attribute.")
except Exception as e:
    print(f"Error: {e}")
