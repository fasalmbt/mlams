import json
from functools import wraps
from http.server import BaseHTTPRequestHandler
from src.utils.auth import decode_token
from src.database import get_db

class JSONHTTPRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress default logging

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(body)

    def set_cors(self):
        origin = self.headers.get('Origin')
        if not origin or origin == 'null' or origin.startswith('http://localhost') or origin.startswith('http://127.0.0.1') or origin.startswith('file://'):
            self.send_header('Access-Control-Allow-Origin', origin or '*')
        else:
            self.send_header('Access-Control-Allow-Origin', 'null')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def send_error_json(self, msg, status=400):
        self.send_json({'error': msg}, status)

    def do_OPTIONS(self):
        self.send_response(200)
        self.set_cors()
        self.end_headers()

    def get_body(self):
        length = int(self.headers.get('Content-Length', 0))
        ctype = self.headers.get('Content-Type', '')
        if length and 'application/json' in ctype:
            try:
                return json.loads(self.rfile.read(length))
            except json.JSONDecodeError:
                return {}
        return {}

    def get_user(self):
        auth = self.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return None
        token = auth[7:]
        payload = decode_token(token)
        if not payload:
            return None
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE id=?", (payload['sub'],)).fetchone()
        conn.close()
        return dict(user) if user else None

    def require_auth(self, *roles):
        user = self.get_user()
        if not user:
            self.send_error_json('Unauthorized', 401)
            return None
        if roles and user['role'] not in roles:
            self.send_error_json('Forbidden', 403)
            return None
        return user
