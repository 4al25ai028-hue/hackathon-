import sqlite3
import os
from typing import Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), 'civic_connect.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL,
            address TEXT,
            latitude REAL,
            longitude REAL,
            ward TEXT,
            image_url TEXT,
            is_anonymous INTEGER DEFAULT 0,
            submitter_name TEXT,
            submitter_contact TEXT,
            upvotes_count INTEGER DEFAULT 0,
            potential_duplicate_of TEXT,
            duplicate_confidence REAL,
            is_duplicate_flagged INTEGER DEFAULT 0,
            admin_notes TEXT,
            assigned_department TEXT,
            assigned_officer TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            resolved_at TEXT,
            resolution_notes TEXT,
            resolution_image_url TEXT,
            verified_count INTEGER DEFAULT 0,
            disputed_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            action TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            actor_name TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS verifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            is_verified_fixed INTEGER NOT NULL,
            comment TEXT,
            citizen_token TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
    ''')
    conn.commit()
    conn.close()

def dict_from_row(row: sqlite3.Row) -> Dict[str, Any]:
    if not row:
        return {}
    d = dict(row)
    d['is_anonymous'] = bool(d.get('is_anonymous'))
    d['is_duplicate_flagged'] = bool(d.get('is_duplicate_flagged'))
    return d
