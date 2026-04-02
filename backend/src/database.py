import sqlite3
import os
import uuid
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', 'mlams.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','telecaller','counselor','accountant')),
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        source TEXT,
        destination TEXT,
        visa_type TEXT,
        notes TEXT,
        stage TEXT NOT NULL DEFAULT 'lead' CHECK(stage IN ('lead','counseling','accounts','completed')),
        status TEXT NOT NULL DEFAULT 'New',
        assigned_telecaller_id TEXT,
        assigned_counselor_id TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(assigned_telecaller_id) REFERENCES users(id),
        FOREIGN KEY(assigned_counselor_id) REFERENCES users(id),
        FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS status_logs (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        old_stage TEXT,
        new_stage TEXT,
        old_status TEXT,
        new_status TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES leads(id),
        FOREIGN KEY(changed_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS counseling_sessions (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        counselor_id TEXT NOT NULL,
        session_number INTEGER NOT NULL,
        sitting_status TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES leads(id),
        FOREIGN KEY(counselor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL,
        payment_date TEXT NOT NULL,
        notes TEXT,
        recorded_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES leads(id),
        FOREIGN KEY(recorded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS cheques (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        payment_id TEXT,
        cheque_number TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        amount REAL NOT NULL,
        issue_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Issued','Cleared','Bounced')),
        notes TEXT,
        created_by TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES leads(id),
        FOREIGN KEY(payment_id) REFERENCES payments(id),
        FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES leads(id),
        FOREIGN KEY(uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS lead_comments (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(lead_id) REFERENCES leads(id),
        FOREIGN KEY(author_id) REFERENCES users(id)
    );
    """)

    # Seed initial admin if users table is empty
    count = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0:
        now = datetime.utcnow().isoformat()
        admin_email = os.environ.get('ADMIN_EMAIL', 'admin@localhost.com')
        import secrets
        admin_pass = os.environ.get('ADMIN_PASSWORD')
        if not admin_pass:
            admin_pass = secrets.token_urlsafe(12)
            print(f"\\n⚠️  WARNING: No ADMIN_PASSWORD provided in .env!")
            print(f"🔒 Generated secure default password: {admin_pass}\\n")
            
        admin_name = os.environ.get('ADMIN_NAME', 'System Admin')
        
        # We must import hash_password here to avoid circular dependencies
        from src.utils.auth import hash_password
        c.execute(
            "INSERT INTO users VALUES (?,?,?,?,?,?)",
            (str(uuid.uuid4()), admin_name, admin_email, hash_password(admin_pass), 'admin', now)
        )
        print(f"✅ Initial admin user created: {admin_email}")

    conn.commit()
    conn.close()
    print("✅ Database initialized")

def log_status(conn, lead_id, changed_by, old_stage, new_stage, old_status, new_status, note=''):
    conn.execute(
        "INSERT INTO status_logs VALUES (?,?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), lead_id, changed_by, old_stage, new_stage, old_status, new_status, note, datetime.utcnow().isoformat())
    )
