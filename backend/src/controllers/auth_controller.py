from src.database import get_db
from src.utils.auth import verify_password, create_token

def auth_login(req, body):
    email = body.get('email', '').strip()
    password = body.get('password', '')
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    if not user or not verify_password(password, user['password_hash']):
        return req.send_error_json('Invalid credentials', 401)
    token = create_token(user['id'], user['role'])
    req.send_json({
        'token': token,
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}
    })

def auth_me(req):
    user = req.require_auth()
    if not user:
        return
    req.send_json({'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']})
