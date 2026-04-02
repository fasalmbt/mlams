import uuid
from datetime import datetime
from src.database import get_db, log_status

def now_iso():
    return datetime.utcnow().isoformat()

def get_payments(req, lid):
    user = req.require_auth()
    if not user: return
    conn = get_db()
    payments = conn.execute("""
        SELECT p.*, u.name as recorded_by_name FROM payments p
        JOIN users u ON p.recorded_by = u.id
        WHERE p.lead_id=? ORDER BY p.payment_date DESC
    """, (lid,)).fetchall()
    conn.close()
    req.send_json([dict(p) for p in payments])

def add_payment(req, lid, body):
    user = req.require_auth('accountant', 'admin')
    if not user: return
    pid = str(uuid.uuid4())
    conn = get_db()
    conn.execute(
        "INSERT INTO payments VALUES (?,?,?,?,?,?,?,?)",
        (pid, lid, float(body['amount']), body['payment_mode'],
         body.get('payment_date', now_iso()[:10]), body.get('notes', ''), user['id'], now_iso())
    )
    lead = dict(conn.execute("SELECT * FROM leads WHERE id=?", (lid,)).fetchone())
    conn.execute("UPDATE leads SET status='Payment Received', stage='completed', updated_at=? WHERE id=?",
                 (now_iso(), lid))
    log_status(conn, lid, user['id'], lead['stage'], 'completed', lead['status'], 'Payment Received',
               f"Payment: ₹{body['amount']} via {body['payment_mode']}")
    conn.commit()
    conn.close()
    req.send_json({'id': pid, 'message': 'Payment recorded'}, 201)

def get_cheques(req, lid):
    user = req.require_auth()
    if not user: return
    conn = get_db()
    cheques = conn.execute("""
        SELECT ch.*, u.name as created_by_name FROM cheques ch
        JOIN users u ON ch.created_by = u.id
        WHERE ch.lead_id=? ORDER BY ch.created_at DESC
    """, (lid,)).fetchall()
    conn.close()
    req.send_json([dict(c) for c in cheques])

def add_cheque(req, lid, body):
    user = req.require_auth('accountant', 'admin')
    if not user: return
    cid = str(uuid.uuid4())
    n = now_iso()
    conn = get_db()
    conn.execute(
        "INSERT INTO cheques VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (cid, lid, body.get('payment_id'), body['cheque_number'], body['bank_name'],
         float(body['amount']), body['issue_date'], 'Pending', body.get('notes', ''), user['id'], n, n)
    )
    conn.commit()
    conn.close()
    req.send_json({'id': cid, 'message': 'Cheque recorded'}, 201)

def update_cheque(req, cid, body):
    user = req.require_auth('accountant', 'admin')
    if not user: return
    conn = get_db()
    cheque = conn.execute("SELECT * FROM cheques WHERE id=?", (cid,)).fetchone()
    if not cheque:
        conn.close()
        return req.send_error_json('Not found', 404)
    conn.execute("UPDATE cheques SET status=?, notes=?, updated_at=? WHERE id=?",
                 (body['status'], body.get('notes', cheque['notes']), now_iso(), cid))
    conn.commit()
    conn.close()
    req.send_json({'message': 'Cheque updated'})
