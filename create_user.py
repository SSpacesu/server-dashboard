import getpass

import psycopg

from auth import hash_password
from backend import get_connection


username = input("Create a username: ").strip().lower()
password = getpass.getpass("Create a password: ")
password_confirmation = getpass.getpass("Confirm password: ")

if not 3 <= len(username) <= 32:
    raise SystemExit("Username must contain between 3 and 32 characters")

if len(password) < 12:
    raise SystemExit("Password must contain at least 12 characters")

if password != password_confirmation:
    raise SystemExit("Passwords do not match")

password_hash = hash_password(password)

admin_answer = input("Make this user an administrator? [y/N]: ")
is_admin = admin_answer.strip().lower() in {"y", "yes"}

try:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO app_users
                    (username, password_hash, is_admin)
                VALUES
                    (%s, %s, %s)
                """,
                (username, password_hash, is_admin),
            )
except psycopg.errors.UniqueViolation:
    raise SystemExit("That username already exists")

role = "administrator" if is_admin else "member"
print(f"Created {role} account '{username}'")