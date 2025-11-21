from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import sqlite3
from pathlib import Path
from datetime import datetime
import re

app = Flask(__name__)

# CORS: allow all origins on /api/* during local dev
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=False)

# DB path
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

# ---------- Validation helpers ----------
NAME_RE = re.compile(r"^[A-Za-z]+(?: [A-Za-z]+)*$")
EMAIL_RE  = re.compile(r"^[A-Za-z0-9.]+@[A-Za-z0-9.]+\.[A-Za-z]{2,}$")
PHONE_RE  = re.compile(r"^\d{10,15}$")
COMPANY_RE = re.compile(r"^[A-Za-z0-9&().,'\- ]{0,100}$")

ALLOWED_SIZES = {"", "1", "2-10", "11-50", "51-200", "200+"}
ALLOWED_DESIG = {"individual", "founder", "cto", "pm", "security-lead", "ops", "other"}
ALLOWED_PROJ  = {
    "soar", "api-integrations", "data-pipelines", "testing",
    "security-testing", "android-reversing"
}

# Block common request method tokens (upper-case) and SQL keywords (case-insensitive),
# plus obvious injection markers and script tags.
HTTP_METHODS_UPPER = re.compile(r"\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE|CONNECT)\b")
SQL_KEYWORDS       = re.compile(r"\b(select|insert|update|delete|drop|alter|union|truncate|create|exec|execute|merge)\b", re.I)


def has_suspicious(text: str) -> bool:
    if not text:
        return False
    t = text.strip()
    if HTTP_METHODS_UPPER.search(t):
        return True
    if SQL_KEYWORDS.search(t):
        return True
    tl = t.lower()
    if "<script" in tl or "</script" in tl:
        return True
    if "--" in t or ";" in t or "/*" in t or "*/" in t:
        return True
    return False


def validate_payload(data: dict):
    errors = {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    company = (data.get("company") or "").strip()
    company_size = (data.get("company_size") or "").strip()
    phone = (data.get("phone") or "").strip()
    designation = (data.get("designation") or "").strip()
    project = (data.get("project") or "").strip()

    # Required
    if not name:
        errors["name"] = "Name is required."
    elif not NAME_RE.fullmatch(name):
        errors["name"] = "Only letters, spaces, apostrophes, and hyphens (single spacing)."
    elif has_suspicious(name):
        errors["name"] = "Contains disallowed tokens."

    if not email:
        errors["email"] = "Email is required."
    elif not EMAIL_RE.fullmatch(email):
        errors["email"] = "Email must contain only letters, numbers, dots, @ and a valid domain."
    elif has_suspicious(email):
        errors["email"] = "Contains disallowed tokens."

    if not message:
        errors["message"] = "Message is required."
    elif len(message) < 5:
        errors["message"] = "Message is too short."
    elif len(message) > 4000:
        errors["message"] = "Message is too long."
    elif has_suspicious(message):
        errors["message"] = "Contains disallowed tokens."

    # Optional / enumerated fields
    if company and not COMPANY_RE.fullmatch(company):
        errors["company"] = "Company may include letters, numbers and basic punctuation only."
    elif has_suspicious(company):
        errors["company"] = "Contains disallowed tokens."

    if company_size not in ALLOWED_SIZES:
        errors["company_size"] = "Invalid company size."

    if phone and not PHONE_RE.fullmatch(phone):
        errors["phone"] = "Phone must be 10–15 digits."
    elif has_suspicious(phone):
        errors["phone"] = "Contains disallowed tokens."

    if designation and designation not in ALLOWED_DESIG:
        errors["designation"] = "Invalid designation."

    if project and project not in ALLOWED_PROJ:
        errors["project"] = "Invalid project choice."

    return errors


# ---------- Routes ----------
@app.route("/api/contact", methods=["POST", "OPTIONS"])
def save_contact():
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

    errors = validate_payload(data)
    if errors:
        return jsonify({"ok": False, "errors": errors}), 400

    # Clean values after validation
    name         = (data.get("name") or "").strip()
    email        = (data.get("email") or "").strip()
    message      = (data.get("message") or "").strip()
    company      = (data.get("company") or "").strip()
    company_size = (data.get("company_size") or "").strip()
    phone        = (data.get("phone") or "").strip()
    designation  = (data.get("designation") or "").strip()
    project      = (data.get("project") or "").strip()
    created_at   = datetime.utcnow().isoformat()

    with sqlite3.connect(DB_PATH) as con:
        con.execute("""
            INSERT INTO contacts
            (name, email, company, company_size, phone, designation, project, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (name, email, company, company_size, phone, designation, project, message, created_at))

    return jsonify({"ok": True})


@app.get("/api/contacts")
def list_contacts():
    with sqlite3.connect(DB_PATH) as con:
        con.row_factory = sqlite3.Row
        rows = con.execute("SELECT * FROM contacts ORDER BY id DESC").fetchall()
        return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)