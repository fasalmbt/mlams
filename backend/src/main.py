import os
from http.server import HTTPServer
from urllib.parse import urlparse, parse_qs

from src.database import init_db
from src.utils.http import JSONHTTPRequestHandler

from src.controllers.auth_controller import auth_login, auth_me
from src.controllers.users_controller import get_users, create_user
from src.controllers.finance_controller import get_payments, add_payment, get_cheques, add_cheque, update_cheque
from src.controllers.leads_controller import get_leads, create_lead, get_lead, update_lead, update_lead_status, assign_lead, get_logs, export_leads, get_comments, add_comment
from src.controllers.counseling_controller import get_sessions, add_session, complete_counseling
from src.controllers.dashboard_controller import get_dashboard
from src.controllers.documents_controller import get_documents, upload_document, download_document

class MLAMSHandler(JSONHTTPRequestHandler):
    def route(self, method, path, body):
        parsed = urlparse(path)
        p = parsed.path.rstrip('/')
        qs = parse_qs(parsed.query)

        # ── AUTH ──
        if p == '/api/auth/login' and method == 'POST': return auth_login(self, body)
        if p == '/api/auth/me' and method == 'GET': return auth_me(self)

        # ── USERS ──
        if p == '/api/users' and method == 'GET': return get_users(self)
        if p == '/api/users' and method == 'POST': return create_user(self, body)

        # ── LEADS ──
        if p == '/api/leads' and method == 'GET': return get_leads(self, qs)
        if p == '/api/leads' and method == 'POST': return create_lead(self, body)
        if p == '/api/leads/export' and method == 'GET': return export_leads(self)
        if p.startswith('/api/leads/') and method == 'GET' and len(p.split('/')) == 4:
            return get_lead(self, p.split('/')[-1])
        if p.startswith('/api/leads/') and p.endswith('/status') and method == 'PUT':
            return update_lead_status(self, p.split('/')[3], body)
        if p.startswith('/api/leads/') and p.endswith('/assign') and method == 'PUT':
            return assign_lead(self, p.split('/')[3], body)
        if p.startswith('/api/leads/') and method == 'PUT' and len(p.split('/')) == 4:
            return update_lead(self, p.split('/')[-1], body)

        # ── COUNSELING ──
        if p.startswith('/api/leads/') and p.endswith('/sessions') and method == 'GET':
            return get_sessions(self, p.split('/')[3])
        if p.startswith('/api/leads/') and p.endswith('/sessions') and method == 'POST':
            return add_session(self, p.split('/')[3], body)
        if p.startswith('/api/leads/') and p.endswith('/complete-counseling') and method == 'PUT':
            return complete_counseling(self, p.split('/')[3], body)

        # ── PAYMENTS ──
        if p.startswith('/api/leads/') and p.endswith('/payments') and method == 'GET':
            return get_payments(self, p.split('/')[3])
        if p.startswith('/api/leads/') and p.endswith('/payments') and method == 'POST':
            return add_payment(self, p.split('/')[3], body)

        # ── CHEQUES ──
        if p.startswith('/api/leads/') and p.endswith('/cheques') and method == 'GET':
            return get_cheques(self, p.split('/')[3])
        if p.startswith('/api/leads/') and p.endswith('/cheques') and method == 'POST':
            return add_cheque(self, p.split('/')[3], body)
        if p.startswith('/api/cheques/') and method == 'PUT':
            return update_cheque(self, p.split('/')[-1], body)

        # ── DOCUMENTS ──
        if p.startswith('/api/leads/') and p.endswith('/documents') and method == 'GET':
            return get_documents(self, p.split('/')[3])
        if p.startswith('/api/leads/') and p.endswith('/documents') and method == 'POST':
            return upload_document(self, p.split('/')[3], body)
        if p.startswith('/api/documents/') and method == 'GET':
            return download_document(self, p.split('/')[-1])

        # ── LOGS ──
        if p.startswith('/api/leads/') and p.endswith('/logs') and method == 'GET':
            return get_logs(self, p.split('/')[3])

        # ── COMMENTS ──
        if p.startswith('/api/leads/') and p.endswith('/comments') and method == 'GET':
            return get_comments(self, p.split('/')[3])
        if p.startswith('/api/leads/') and p.endswith('/comments') and method == 'POST':
            return add_comment(self, p.split('/')[3], body)

        # ── DASHBOARD ──
        if p == '/api/dashboard' and method == 'GET': return get_dashboard(self)

        self.send_error_json('Not found', 404)

    def do_GET(self): self.route('GET', self.path, {})
    def do_POST(self): self.route('POST', self.path, self.get_body())
    def do_PUT(self): self.route('PUT', self.path, self.get_body())

def run_server():
    port = int(os.environ.get('PORT', 5050))
    host = os.environ.get('HOST', '0.0.0.0')
    init_db()
    server = HTTPServer((host, port), MLAMSHandler)
    print(f"🚀 MLAMS Backend running on http://{host}:{port}")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
