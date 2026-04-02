import uuid
from datetime import datetime
from src.database import get_db, log_status

def now_iso():
    return datetime.utcnow().isoformat()

def get_sessions(req, lid):
    user = req.require_auth()
    if not user: return
    conn = get_db()
    sessions = conn.execute("""
        SELECT cs.*, u.name as counselor_name FROM counseling_sessions cs
        JOIN users u ON cs.counselor_id = u.id
        WHERE cs.lead_id=? ORDER BY cs.session_number
    """, (lid,)).fetchall()
    conn.close()
    req.send_json([dict(s) for s in sessions])

def add_session(req, lid, body):
    user = req.require_auth('counselor', 'admin')
    if not user: return
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM counseling_sessions WHERE lead_id=?", (lid,)).fetchone()[0]
    sid = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO counseling_sessions VALUES (?,?,?,?,?,?,?)",
        (sid, lid, user['id'], count + 1, body['sitting_status'], body.get('notes', ''), now_iso())
    )
    conn.execute("UPDATE leads SET status=?, updated_at=? WHERE id=?",
                 (body['sitting_status'], now_iso(), lid))
    log_status(conn, lid, user['id'], 'counseling', 'counseling', None, body['sitting_status'],
               f"Session {count+1}: {body.get('notes','')}")
    conn.commit()
    conn.close()
    req.send_json({'id': sid, 'session_number': count + 1}, 201)

def complete_counseling(req, lid, body):
    user = req.require_auth('counselor', 'admin')
    if not user: return
    conn = get_db()
    lead = conn.execute("SELECT * FROM leads WHERE id=?", (lid,)).fetchone()
    if not lead:
        conn.close()
        return req.send_error_json('Not found', 404)
    lead = dict(lead)
    conn.execute("UPDATE leads SET stage='accounts', status='Counseling Complete', updated_at=? WHERE id=?",
                 (now_iso(), lid))
    log_status(conn, lid, user['id'], 'counseling', 'accounts', lead['status'], 'Counseling Complete',
               body.get('note', 'Counseling completed, moved to accounts'))
    conn.commit()
    conn.close()
    req.send_json({'message': 'Moved to accounts'})
