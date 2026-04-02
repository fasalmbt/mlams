from src.database import get_db

def get_dashboard(req):
    user = req.require_auth()
    if not user: return
    conn = get_db()
    data = {}

    if user['role'] == 'admin':
        data['total_leads'] = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        data['leads_today'] = conn.execute("SELECT COUNT(*) FROM leads WHERE date(created_at)=date('now')").fetchone()[0]
        data['by_stage'] = {}
        for row in conn.execute("SELECT stage, COUNT(*) as cnt FROM leads GROUP BY stage"):
            data['by_stage'][row['stage']] = row['cnt']
        data['by_status'] = {}
        for row in conn.execute("SELECT status, COUNT(*) as cnt FROM leads GROUP BY status ORDER BY cnt DESC LIMIT 8"):
            data['by_status'][row['status']] = row['cnt']
        data['total_payments'] = conn.execute("SELECT COALESCE(SUM(amount),0) FROM payments").fetchone()[0]
        data['pending_cheques'] = conn.execute("SELECT COUNT(*) FROM cheques WHERE status='Pending'").fetchone()[0]
        data['recent_leads'] = [dict(r) for r in conn.execute(
            "SELECT l.*, u.name as telecaller_name FROM leads l LEFT JOIN users u ON l.assigned_telecaller_id=u.id ORDER BY l.created_at DESC LIMIT 5"
        ).fetchall()]

    elif user['role'] == 'telecaller':
        data['my_leads'] = conn.execute("SELECT COUNT(*) FROM leads WHERE assigned_telecaller_id=?", (user['id'],)).fetchone()[0]
        data['pending'] = conn.execute("SELECT COUNT(*) FROM leads WHERE assigned_telecaller_id=? AND status NOT IN ('Interested','Approved','Not Interested')", (user['id'],)).fetchone()[0]
        data['interested'] = conn.execute("SELECT COUNT(*) FROM leads WHERE assigned_telecaller_id=? AND status='Interested'", (user['id'],)).fetchone()[0]
        data['by_status'] = {}
        for row in conn.execute("SELECT status, COUNT(*) as cnt FROM leads WHERE assigned_telecaller_id=? GROUP BY status", (user['id'],)):
            data['by_status'][row['status']] = row['cnt']

    elif user['role'] == 'counselor':
        data['new_leads'] = conn.execute("SELECT COUNT(*) FROM leads WHERE stage='counseling' AND status IN ('Interested','Approved','New')").fetchone()[0]
        data['in_progress'] = conn.execute("SELECT COUNT(*) FROM leads WHERE stage='counseling' AND status NOT IN ('Counseling Complete')").fetchone()[0]
        data['completed'] = conn.execute("SELECT COUNT(*) FROM leads WHERE stage IN ('accounts','completed')").fetchone()[0]

    elif user['role'] == 'accountant':
        data['pending_accounts'] = conn.execute("SELECT COUNT(*) FROM leads WHERE stage='accounts'").fetchone()[0]
        data['completed'] = conn.execute("SELECT COUNT(*) FROM leads WHERE stage='completed'").fetchone()[0]
        data['total_received'] = conn.execute("SELECT COALESCE(SUM(amount),0) FROM payments").fetchone()[0]
        data['cheques_by_status'] = {}
        for row in conn.execute("SELECT status, COUNT(*) as cnt FROM cheques GROUP BY status"):
            data['cheques_by_status'][row['status']] = row['cnt']

    conn.close()
    req.send_json(data)
