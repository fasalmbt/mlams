import uuid
from datetime import datetime
from src.database import get_db
from src.utils.auth import hash_password

def get_users(req):
    user = req.require_auth('admin', 'counselor')
    if not user: return
    conn = get_db()
    users = conn.execute("SELECT id, name, email, role, created_at FROM users ORDER BY name").fetchall()
    conn.close()
    req.send_json([dict(u) for u in users])

def create_user(req, body):
    user = req.require_auth('admin')
    if not user: return
    conn = get_db()
    uid = str(uuid.uuid4())
    try:
        conn.execute(
            "INSERT INTO users VALUES (?,?,?,?,?,?)",
            (uid, body['name'], body['email'], hash_password(body['password']), body['role'], datetime.utcnow().isoformat())
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return req.send_error_json(str(e))
    conn.close()
    req.send_json({'id': uid, 'message': 'User created'}, 201)
