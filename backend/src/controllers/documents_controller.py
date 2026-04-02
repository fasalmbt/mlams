import uuid
import os
import base64
from datetime import datetime
import re
from src.database import get_db

def _can_access_lead(req, user, lid):
    if user['role'] in ('admin', 'accountant'): return True
    conn = get_db()
    lead = conn.execute("SELECT assigned_telecaller_id, assigned_counselor_id FROM leads WHERE id=?", (lid,)).fetchone()
    conn.close()
    if not lead:
        req.send_error_json("Not found", 404)
        return False
    if user['role'] == 'telecaller' and lead['assigned_telecaller_id'] != user['id']:
        req.send_error_json("Forbidden", 403)
        return False
    if user['role'] == 'counselor' and lead['assigned_counselor_id'] != user['id']:
        req.send_error_json("Forbidden", 403)
        return False
    return True

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')

def get_documents(req, lid):
    user = req.require_auth()
    if not user: return
    if not _can_access_lead(req, user, lid): return

    conn = get_db()
    docs = conn.execute("""
        SELECT d.id, d.lead_id, d.document_type, d.original_name, d.created_at, u.name as uploaded_by_name
        FROM documents d
        JOIN users u ON d.uploaded_by = u.id
        WHERE d.lead_id=? ORDER BY d.created_at DESC
    """, (lid,)).fetchall()
    conn.close()
    req.send_json([dict(d) for d in docs])

def upload_document(req, lid, body):
    user = req.require_auth('admin', 'counselor')
    if not user: return
    if not _can_access_lead(req, user, lid): return

    if 'file_data' not in body or 'original_name' not in body or 'document_type' not in body:
        return req.send_error_json("Missing file data, name, or type")

    # The file_data should be base64 string "data:application/pdf;base64,....."
    raw_data = body['file_data']
    try:
        header, encoded = raw_data.split(",", 1)
        file_bytes = base64.b64decode(encoded)
    except Exception:
        return req.send_error_json("Invalid base64 payload")

    original_name = body['original_name']
    
    # Path Traversal & Whitelist Mitigation
    raw_ext = os.path.splitext(original_name)[1].lower()
    # Strip everything except alphanumeric
    ext = '.' + re.sub(r'[^a-z0-9]', '', raw_ext)
    
    if ext not in ['.pdf', '.png', '.jpg', '.jpeg', '.docx']:
        return req.send_error_json("Invalid or unsupported file extension. Allowed: pdf, png, jpg, jpeg, docx")

    doc_id = str(uuid.uuid4())
    filename = f"{doc_id}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    try:
        with open(filepath, 'wb') as f:
            f.write(file_bytes)
    except Exception as e:
        return req.send_error_json(f"Failed to save file: {e}")

    conn = get_db()
    conn.execute(
        "INSERT INTO documents (id, lead_id, document_type, filename, original_name, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?)",
        (doc_id, lid, body['document_type'], filename, original_name, user['id'], datetime.utcnow().isoformat())
    )
    conn.commit()
    conn.close()

    req.send_json({"id": doc_id, "message": "Document uploaded successfully"}, 201)

def download_document(req, did):
    user = req.require_auth()
    if not user: return
    
    conn = get_db()
    doc = conn.execute("SELECT lead_id, filename, original_name FROM documents WHERE id=?", (did,)).fetchone()
    conn.close()

    if not doc:
        return req.send_error_json("Document not found", 404)
        
    if not _can_access_lead(req, user, doc['lead_id']): return
    
    filepath = os.path.join(UPLOADS_DIR, doc['filename'])
    if not os.path.exists(filepath):
        return req.send_error_json("File missing on server", 404)
    
    with open(filepath, 'rb') as f:
        file_bytes = f.read()

    req.send_response(200)
    req.set_cors()
    req.send_header('Content-Type', 'application/octet-stream') 
    req.send_header('Content-Disposition', f'attachment; filename="{doc["original_name"]}"')
    req.send_header('Content-Length', len(file_bytes))
    req.end_headers()
    req.wfile.write(file_bytes)
