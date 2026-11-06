#!/usr/bin/env python3
"""
CivicConnect – Community Problem Reporting and Resolution Platform
Python Flask REST Backend (PS-14 Reference Implementation)
"""

import os
import random
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import get_db_connection, init_db, dict_from_row
from nlp_utils import classify_text, detect_duplicate, calculate_haversine_meters

app = Flask(__name__)
CORS(app)

ADMIN_PIN = os.getenv("ADMIN_PIN", "civic2026")

def current_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def generate_id() -> str:
    return f"CC-2026-{random.randint(1000, 9999)}"

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "CivicConnect Flask API", "version": "1.0.0"})

@app.route('/api/reports', methods=['GET'])
def get_reports():
    category = request.args.get('category')
    status = request.args.get('status')
    ward = request.args.get('ward')
    search = request.args.get('search')
    flagged = request.args.get('flagged_duplicates')

    query = "SELECT * FROM reports WHERE 1=1"
    params = []

    if category and category != 'All':
        query += " AND category = ?"
        params.append(category)
    if status and status != 'All':
        query += " AND status = ?"
        params.append(status)
    if ward and ward != 'All':
        query += " AND ward = ?"
        params.append(ward)
    if flagged == 'true':
        query += " AND is_duplicate_flagged = 1"
    if search:
        query += " AND (id LIKE ? OR title LIKE ? OR description LIKE ? OR address LIKE ?)"
        s = f"%{search.strip()}%"
        params.extend([s, s, s, s])

    query += " ORDER BY created_at DESC"

    conn = get_db_connection()
    rows = conn.execute(query, params).fetchall()
    reports = [dict_from_row(r) for r in rows]
    conn.close()

    return jsonify({"success": True, "count": len(reports), "reports": reports})

@app.route('/api/reports/check-duplicate', methods=['POST'])
def check_duplicate():
    data = request.json or {}
    title = data.get('title', '')
    description = data.get('description', '')
    lat = float(data['latitude']) if data.get('latitude') else None
    lon = float(data['longitude']) if data.get('longitude') else None
    category = data.get('category', 'Other')

    if not title or not description:
        return jsonify({"is_potential_duplicate": False, "matched_report": None, "confidence": 0, "reason": ""})

    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM reports WHERE status != 'REJECTED_DUPLICATE'").fetchall()
    existing = [dict_from_row(r) for r in rows]
    conn.close()

    res = detect_duplicate(title, description, lat, lon, category, existing)
    return jsonify(res)

@app.route('/api/reports', methods=['POST'])
def submit_report():
    data = request.json or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not title or not description:
        return jsonify({"success": False, "error": "Title and description are required"}), 400

    # Categorization and Priority
    classification = classify_text(title, description)
    category = data.get('category') or classification['recommended_category']
    priority = data.get('priority') or classification['recommended_priority']

    lat = float(data['latitude']) if data.get('latitude') else None
    lon = float(data['longitude']) if data.get('longitude') else None

    conn = get_db_connection()
    existing_rows = conn.execute("SELECT * FROM reports WHERE status != 'REJECTED_DUPLICATE'").fetchall()
    existing = [dict_from_row(r) for r in existing_rows]

    # Duplicate check
    dup_res = detect_duplicate(title, description, lat, lon, category, existing)
    is_dup = 1 if dup_res['is_potential_duplicate'] else 0
    dup_of = dup_res['matched_report']['id'] if dup_res['is_potential_duplicate'] and dup_res['matched_report'] else None
    dup_conf = dup_res['confidence'] if dup_res['is_potential_duplicate'] else None

    report_id = generate_id()
    now = current_iso()
    # MANDATORY CONSTRAINT: Treated as unverified until reviewed
    status = "SUBMITTED_UNVERIFIED"

    is_anon = 1 if data.get('is_anonymous') else 0
    submitter_name = "Anonymous Resident" if is_anon else (data.get('submitter_name') or "Concerned Citizen")
    submitter_contact = "Masked" if is_anon else (data.get('submitter_contact') or "N/A")

    conn.execute('''
        INSERT INTO reports (
            id, title, description, category, priority, status,
            address, latitude, longitude, ward, image_url,
            is_anonymous, submitter_name, submitter_contact, upvotes_count,
            potential_duplicate_of, duplicate_confidence, is_duplicate_flagged,
            admin_notes, assigned_department, assigned_officer,
            created_at, updated_at, resolved_at, resolution_notes, resolution_image_url,
            verified_count, disputed_count
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?
        )
    ''', (
        report_id, title, description, category, priority, status,
        data.get('address', 'Within Municipality'), lat, lon, data.get('ward', 'General Ward'),
        data.get('image_url', ''), is_anon, submitter_name, submitter_contact, 1,
        dup_of, dup_conf, is_dup,
        f"Flagged for admin review: similar to {dup_of}" if is_dup else None,
        None, None, now, now, None, None, None, 0, 0
    ))

    # Audit history
    conn.execute('''
        INSERT INTO status_history (
            report_id, from_status, to_status, action, actor_type, actor_name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        report_id, None, status, 'Citizen Submission', 'CITIZEN', submitter_name,
        "Report logged. Marked as unverified until administrator verification.", now
    ))

    conn.commit()
    new_report = dict_from_row(conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone())
    conn.close()

    return jsonify({
        "success": True,
        "report": new_report,
        "duplicate_flagged": bool(is_dup),
        "duplicate_details": dup_res,
        "message": f"Report submitted successfully. Tracking ID: {report_id}"
    }), 201

@app.route('/api/reports/<id>', methods=['GET'])
def get_report_detail(id):
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM reports WHERE id = ?", (id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "error": f"Report {id} not found"}), 404

    report = dict_from_row(row)
    history = [dict(h) for h in conn.execute("SELECT * FROM status_history WHERE report_id = ? ORDER BY created_at ASC", (id,)).fetchall()]
    verifications = [dict(v) for v in conn.execute("SELECT * FROM verifications WHERE report_id = ? ORDER BY created_at DESC", (id,)).fetchall()]

    orig_report = None
    if report.get('potential_duplicate_of'):
        orig_row = conn.execute("SELECT * FROM reports WHERE id = ?", (report['potential_duplicate_of'],)).fetchone()
        if orig_row:
            orig_report = dict_from_row(orig_row)

    conn.close()
    return jsonify({
        "success": True,
        "report": report,
        "history": history,
        "verifications": verifications,
        "original_report": orig_report
    })

@app.route('/api/reports/<id>/status', methods=['POST'])
def update_status(id):
    data = request.json or {}
    new_status = data.get('status')
    resolution_notes = data.get('resolution_notes', '').strip()
    officer_name = data.get('officer_name', 'Civic Admin')

    # MANDATORY CONSTRAINT: "Never claim resolution without a recorded update."
    if new_status in ['RESOLVED_PENDING_VERIFICATION', 'VERIFIED_CLOSED']:
        if not resolution_notes or len(resolution_notes) < 10:
            return jsonify({
                "success": False,
                "error": "Mandatory Constraint: You cannot mark an issue as Resolved without a recorded resolution update (min 10 characters)."
            }), 400

    conn = get_db_connection()
    curr = conn.execute("SELECT * FROM reports WHERE id = ?", (id,)).fetchone()
    if not curr:
        conn.close()
        return jsonify({"success": False, "error": "Report not found"}), 404

    now = current_iso()
    resolved_at = curr['resolved_at'] or now if new_status in ['RESOLVED_PENDING_VERIFICATION', 'VERIFIED_CLOSED'] else None

    conn.execute('''
        UPDATE reports
        SET status = ?,
            resolution_notes = COALESCE(?, resolution_notes),
            resolution_image_url = COALESCE(?, resolution_image_url),
            admin_notes = COALESCE(?, admin_notes),
            assigned_department = COALESCE(?, assigned_department),
            assigned_officer = COALESCE(?, assigned_officer),
            resolved_at = ?,
            updated_at = ?
        WHERE id = ?
    ''', (
        new_status, resolution_notes or None, data.get('resolution_image_url'),
        data.get('admin_notes'), data.get('assigned_department'), data.get('assigned_officer'),
        resolved_at, now, id
    ))

    conn.execute('''
        INSERT INTO status_history (
            report_id, from_status, to_status, action, actor_type, actor_name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        id, curr['status'], new_status, f"Status set to {new_status}", 'ADMIN', officer_name,
        resolution_notes or data.get('admin_notes', 'Official administrative update'), now
    ))

    conn.commit()
    updated = dict_from_row(conn.execute("SELECT * FROM reports WHERE id = ?", (id,)).fetchone())
    conn.close()

    return jsonify({"success": True, "report": updated})

@app.route('/api/reports/<id>/verify', methods=['POST'])
def verify_fix(id):
    data = request.json or {}
    is_fixed = bool(data.get('is_verified_fixed'))
    comment = data.get('comment', '').strip()
    citizen_token = data.get('citizen_token', 'citizen_web')
    now = current_iso()

    conn = get_db_connection()
    curr = conn.execute("SELECT * FROM reports WHERE id = ?", (id,)).fetchone()
    if not curr:
        conn.close()
        return jsonify({"success": False, "error": "Report not found"}), 404

    if curr['status'] not in ['RESOLVED_PENDING_VERIFICATION', 'VERIFIED_CLOSED']:
        conn.close()
        return jsonify({"success": False, "error": "Fix verification is only possible for resolved reports."}), 400

    conn.execute('''
        INSERT INTO verifications (report_id, is_verified_fixed, comment, citizen_token, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (id, 1 if is_fixed else 0, comment, citizen_token, now))

    if is_fixed:
        conn.execute("UPDATE reports SET verified_count = verified_count + 1 WHERE id = ?", (id,))
    else:
        conn.execute("UPDATE reports SET disputed_count = disputed_count + 1 WHERE id = ?", (id,))

    conn.commit()
    updated = dict_from_row(conn.execute("SELECT * FROM reports WHERE id = ?", (id,)).fetchone())

    # If verification consensus reached, close officially
    if is_fixed and updated['verified_count'] >= 2 and updated['status'] == 'RESOLVED_PENDING_VERIFICATION':
        conn.execute("UPDATE reports SET status = 'VERIFIED_CLOSED', updated_at = ? WHERE id = ?", (now, id))
        conn.execute('''
            INSERT INTO status_history (report_id, from_status, to_status, action, actor_type, actor_name, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (id, 'RESOLVED_PENDING_VERIFICATION', 'VERIFIED_CLOSED', 'Citizen Verification Passed', 'CITIZEN', 'Community Residents', f"{updated['verified_count']} citizens confirmed resolution on site.", now))
        conn.commit()
        updated['status'] = 'VERIFIED_CLOSED'

    conn.close()
    return jsonify({"success": True, "report": updated})

@app.route('/api/recurring-hotspots', methods=['GET'])
def get_recurring_hotspots():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM reports WHERE latitude IS NOT NULL AND longitude IS NOT NULL").fetchall()
    reports = [dict_from_row(r) for r in rows]
    conn.close()

    clusters = []
    visited = set()

    for i in range(len(reports)):
        rep_a = reports[i]
        if rep_a['id'] in visited:
            continue

        group = [rep_a]
        visited.add(rep_a['id'])

        for j in range(i + 1, len(reports)):
            rep_b = reports[j]
            if rep_b['id'] in visited:
                continue

            dist = calculate_haversine_meters(rep_a['latitude'], rep_a['longitude'], rep_b['latitude'], rep_b['longitude'])
            if dist <= 200.0:
                group.append(rep_b)
                visited.add(rep_b['id'])

        if len(group) >= 2:
            avg_lat = sum(r['latitude'] for r in group) / len(group)
            avg_lon = sum(r['longitude'] for r in group) / len(group)
            cat = group[0]['category']

            clusters.append({
                "id": f"HOTSPOT-{len(clusters) + 1}",
                "location_name": group[0]['address'].split(',')[0],
                "latitude": round(avg_lat, 4),
                "longitude": round(avg_lon, 4),
                "ward": group[0]['ward'],
                "category": cat,
                "total_incidents": len(group),
                "active_incidents": len([r for r in group if r['status'] not in ['VERIFIED_CLOSED', 'REJECTED_DUPLICATE']]),
                "resolved_incidents": len([r for r in group if r['status'] == 'VERIFIED_CLOSED']),
                "recurrence_rate": round(((len(group) - 1) / len(group)) * 100),
                "primary_root_cause": "Subsurface water infiltration destabilizing asphalt foundation layers.",
                "recommended_civic_action": "Coordinate dual-department drainage conduit overhaul before resurfacing.",
                "incident_ids": [r['id'] for r in group]
            })

    return jsonify({"success": True, "count": len(clusters), "clusters": clusters})

if __name__ == '__main__':
    init_db()
    print("CivicConnect Python Flask Server running on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
