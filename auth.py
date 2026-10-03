from pwdlib import PasswordHash
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

password_hasher = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hasher.hash(password)

def verify_password(password: str, stored_hash: str) -> bool:
    return password_hasher.verify(password, stored_hash)

SESSION_DURATION_HOURS = 72


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session_token() -> tuple[str, str, datetime]:
    token = secrets.token_urlsafe(32)
    token_hash = hash_session_token(token)

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(hours=SESSION_DURATION_HOURS)
    )

    return token, token_hash, expires_at