import uuid
from datetime import datetime
from src.database import get_db, log_status
import io
import csv

def now_iso():
    return datetime.utcnow().isoformat()

def _can_access_lead(req, user, lid, conn=None):
    if user['role'] in ('admin', 'accountant'): return True
    close_conn = False
    if not conn:
        conn = get_db()
        close_conn = True
    lead = conn.execute("SELECT assigned_telecaller_id, assigned_counselor_id FROM leads WHERE id=?", (lid,)).fetchone()
    if close_conn: conn.close()
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

def get_leads(req, qs):
    user = req.require_auth()
    if not user: return
    conn = get_db()
    
    query = """
        SELECT l.*, 
               tc.name as telecaller_name,
               co.name as counselor_name,
               cb.name as created_by_name
        FROM leads l
        LEFT JOIN users tc ON l.assigned_telecaller_id = tc.id
        LEFT JOIN users co ON l.assigned_counselor_id = co.id
        LEFT JOIN users cb ON l.created_by = cb.id
        WHERE 1=1
    """
    params = []

    if user['role'] == 'telecaller':
        query += " AND l.assigned_telecaller_id=?"
        params.append(user['id'])
    elif user['role'] == 'counselor':
        query += " AND l.stage IN ('counseling','accounts','completed')"
    elif user['role'] == 'accountant':
        query += " AND l.stage IN ('accounts','completed')"

    search = qs.get('search', [None])[0]
    if search:
        query += " AND (l.name LIKE ? OR l.phone LIKE ? OR l.status LIKE ?)"
        s = f'%{search}%'
        params += [s, s, s]

    stage = qs.get('stage', [None])[0]
    if stage:
        query += " AND l.stage=?"
        params.append(stage)

    status = qs.get('status', [None])[0]
    if status:
        query += " AND l.status=?"
        params.append(status)

    query += " ORDER BY l.updated_at DESC"
    leads = conn.execute(query, params).fetchall()
    conn.close()
    req.send_json([dict(l) for l in leads])

def get_lead(req, lid):
    user = req.require_auth()
    if not user: return
    if not _can_access_lead(req, user, lid): return
    conn = get_db()
    lead = conn.execute("""
        SELECT l.*, tc.name as telecaller_name, co.name as counselor_name
        FROM leads l
        LEFT JOIN users tc ON l.assigned_telecaller_id = tc.id
        LEFT JOIN users co ON l.assigned_counselor_id = co.id
        WHERE l.id=?
    """, (lid,)).fetchone()
    conn.close()
    if not lead:
        return req.send_error_json('Lead not found', 404)
    req.send_json(dict(lead))

def create_lead(req, body):
    user = req.require_auth('admin')
    if not user: return
    lid = str(uuid.uuid4())
    n = now_iso()
    conn = get_db()
    conn.execute(
        "INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (lid, body['name'], body['phone'], body.get('email',''), body.get('source',''),
         body.get('destination',''), body.get('visa_type',''), body.get('notes',''),
         'lead', 'New', body.get('assigned_telecaller_id'), None, user['id'], n, n)
    )
    log_status(conn, lid, user['id'], None, 'lead', None, 'New', 'Lead created')
    conn.commit()
    conn.close()
    req.send_json({'id': lid, 'message': 'Lead created'}, 201)

def export_leads(req):
    user = req.require_auth('admin')
    if not user: return
    conn = get_db()
    leads = conn.execute("""
        SELECT l.name, l.phone, l.email, l.stage, l.status, l.source, l.destination, l.visa_type, 
               tc.name as telecaller, co.name as counselor, l.created_at 
        FROM leads l
        LEFT JOIN users tc ON l.assigned_telecaller_id = tc.id
        LEFT JOIN users co ON l.assigned_counselor_id = co.id
        ORDER BY l.created_at DESC
    """).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Phone', 'Email', 'Stage', 'Status', 'Source', 'Destination', 'Visa Type', 'Telecaller', 'Counselor', 'Created At'])
    for l in leads:
        writer.writerow([l['name'], l['phone'], l['email'], l['stage'], l['status'], l['source'], 
                         l['destination'], l['visa_type'], l['telecaller'], l['counselor'], l['created_at']])
    
    csv_data = output.getvalue().encode('utf-8')
    req.send_response(200)
    req.send_header('Content-Type', 'text/csv')
    req.send_header('Content-Disposition', 'attachment; filename="leads_export.csv"')
    req.send_header('Content-Length', len(csv_data))
    req.set_cors()
    req.end_headers()
    req.wfile.write(csv_data)

def update_lead_status(req, lid, body):
    user = req.require_auth()
    if not user: return
    if not _can_access_lead(req, user, lid): return
    conn = get_db()
    lead = conn.execute("SELECT * FROM leads WHERE id=?", (lid,)).fetchone()
    if not lead:
        conn.close()
        return req.send_error_json('Lead not found', 404)
    lead = dict(lead)

    new_status = body.get('status', lead['status'])
    new_stage = lead['stage']

    if user['role'] == 'telecaller' and new_status in ('Interested', 'Approved'):
        new_stage = 'counseling'

    conn.execute(
        "UPDATE leads SET status=?, stage=?, updated_at=? WHERE id=?",
        (new_status, new_stage, now_iso(), lid)
    )
    log_status(conn, lid, user['id'], lead['stage'], new_stage, lead['status'], new_status, body.get('note',''))
    conn.commit()
    conn.close()
    req.send_json({'message': 'Status updated'})

def assign_lead(req, lid, body):
    user = req.require_auth('admin')
    if not user: return
    conn = get_db()
    lead = conn.execute("SELECT * FROM leads WHERE id=?", (lid,)).fetchone()
    if not lead:
        conn.close()
        return req.send_error_json('Not found', 404)
    lead = dict(lead)
    tc_id = body.get('assigned_telecaller_id', lead['assigned_telecaller_id'])
    co_id = body.get('assigned_counselor_id', lead['assigned_counselor_id'])
    conn.execute("UPDATE leads SET assigned_telecaller_id=?, assigned_counselor_id=?, updated_at=? WHERE id=?",
                 (tc_id, co_id, now_iso(), lid))
    log_status(conn, lid, user['id'], lead['stage'], lead['stage'], lead['status'], lead['status'], 'Lead reassigned')
    conn.commit()
    conn.close()
    req.send_json({'message': 'Assigned'})

def update_lead(req, lid, body):
    user = req.require_auth('admin')
    if not user: return
    conn = get_db()
    lead = conn.execute("SELECT * FROM leads WHERE id=?", (lid,)).fetchone()
    if not lead:
        conn.close()
        return req.send_error_json('Not found', 404)
    conn.execute("""UPDATE leads SET name=?, phone=?, email=?, source=?, destination=?,
                    visa_type=?, notes=?, assigned_telecaller_id=?, assigned_counselor_id=?, updated_at=? WHERE id=?""",
                 (body.get('name', lead['name']), body.get('phone', lead['phone']),
                  body.get('email', lead['email']), body.get('source', lead['source']),
                  body.get('destination', lead['destination']), body.get('visa_type', lead['visa_type']),
                  body.get('notes', lead['notes']), 
                  body.get('assigned_telecaller_id', lead['assigned_telecaller_id']),
                  body.get('assigned_counselor_id', lead['assigned_counselor_id']),
                  now_iso(), lid))
    conn.commit()
    conn.close()
    req.send_json({'message': 'Lead updated'})

def get_logs(req, lid):
    user = req.require_auth()
    if not user: return
    if not _can_access_lead(req, user, lid): return
    conn = get_db()
    logs = conn.execute("""
        SELECT sl.*, u.name as changed_by_name FROM status_logs sl
        JOIN users u ON sl.changed_by = u.id
        WHERE sl.lead_id=? ORDER BY sl.created_at DESC
    """, (lid,)).fetchall()
    conn.close()
    req.send_json([dict(l) for l in logs])

def get_comments(req, lid):
    user = req.require_auth()
    if not user: return
    if not _can_access_lead(req, user, lid): return
    conn = get_db()
    comments = conn.execute("""
        SELECT lc.*, u.name as author_name, u.role as author_role
        FROM lead_comments lc
        JOIN users u ON lc.author_id = u.id
        WHERE lc.lead_id=? ORDER BY lc.created_at ASC
    """, (lid,)).fetchall()
    conn.close()
    req.send_json([dict(c) for c in comments])

def add_comment(req, lid, body):
    user = req.require_auth()
    if not user: return
    if not _can_access_lead(req, user, lid): return
    
    comment_text = body.get('comment', '').strip()
    if not comment_text:
        return req.send_error_json("Comment cannot be empty")
        
    conn = get_db()
    c_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO lead_comments (id, lead_id, author_id, comment, created_at) VALUES (?,?,?,?,?)",
        (c_id, lid, user['id'], comment_text, now_iso())
    )
    conn.commit()
    conn.close()
    req.send_json({'id': c_id, 'message': 'Comment added'}, 201)
