import hashlib
import secrets
import os
from datetime import datetime, timedelta
import jwt as pyjwt

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    JWT_SECRET = secrets.token_hex(32)
    print("\n⚠️  WARNING: No JWT_SECRET provided in .env! Sessions will disconnect randomly on restart.\n")
JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', 24))

def hash_password(pw):
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(pw, hashed):
    if '$' not in hashed:
        return hashlib.sha256(pw.encode()).hexdigest() == hashed
    salt, key_hex = hashed.split('$', 1)
    key = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt.encode('utf-8'), 100000)
    return key.hex() == key_hex

def create_token(user_id, role):
    payload = {
        'sub': user_id,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm='HS256')

def decode_token(token):
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except Exception:
        return None
