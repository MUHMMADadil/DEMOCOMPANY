from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import sqlite3
from pathlib import Path
from datetime import datetime

app = Flask(__name__)

# CORS: allow all origins on /api/* during local dev (simplest way to unblock)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

# DB in the same folder as app.py
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "db.sqlite3"


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            company TEXT,
            company_size TEXT,
            phone TEXT,
            designation TEXT,
            project TEXT,
            message TEXT,
            created_at TEXT NOT NULL
        )
        """)


init_db()


# Contact endpoint (POST) + preflight (OPTIONS)
@app.route("/api/contact", methods=["POST", "OPTIONS"])
def save_contact():
    print('Processings')
    if request.method == "OPTIONS":
        # Preflight response
        resp = make_response("", 204)
        origin = request.headers.get("Origin", "*")
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Max-Age"] = "86400"
        return resp

    # Accept form-data or JSON
    data = request.form if request.form else request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    if not name or not email or not message:
        return jsonify({"ok": False, "error": "Name, email, and message are required."}), 400

    company = (data.get("company") or "").strip()
    company_size = (data.get("company_size") or "").strip()
    phone = (data.get("phone") or "").strip()
    designation = (data.get("designation") or "").strip()
    project = (data.get("project") or "").strip()
    created_at = datetime.utcnow().isoformat()

    with sqlite3.connect(DB_PATH) as con:
        con.execute("""
            INSERT INTO contacts
            (name, email, company, company_size, phone, designation, project, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, email, company, company_size, phone, designation, project, message, created_at))

    return jsonify({"ok": True})


# Simple viewer for testing
@app.get("/api/contacts")
def list_contacts():
    print('Processing')
    with sqlite3.connect(DB_PATH) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute("SELECT * FROM contacts ORDER BY id DESC").fetchall()
        return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    # Bind to 127.0.0.1 to avoid any IPv6/localhost quirks on Windows
    app.run(host="127.0.0.1", port=5000)
