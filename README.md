# CivicConnect – Community Problem Reporting & Resolution Platform
### Problem Statement PS-14 Reference Implementation

CivicConnect is a transparent, accountable civic reporting and resolution platform connecting residents and local municipal administrators. It facilitates end-to-end issue reporting, automated categorization, duplicate detection, transparent lifecycle tracking, community fix verification, and recurring hotspot analytics.

---

## 🏛️ PS-14 Mandatory Requirements & Implementation Matrix

| Requirement | Implementation Details | Verification & Enforcement |
|---|---|---|
| **1. Issue Submission** | Multi-attribute submission with text, image upload (EXIF metadata stripped, privacy blur option), and interactive GPS/address picker. | Strict input validation, privacy flags, anonymous submitter option. |
| **2. Categorisation & Prioritisation** | Lightweight tested NLP keyword-weighted classifier (`classifier.ts` / `nlp_utils.py`) recommending categories and safety-hazard priority scoring. | Real-time classification suggestions as citizen types. |
| **3. Lifecycle Tracking** | Finite state machine: `SUBMITTED_UNVERIFIED` → `UNDER_REVIEW` → `IN_PROGRESS` → `RESOLVED_PENDING_VERIFICATION` → `VERIFIED_CLOSED`. | Immutable audit history logged in `status_history`. |
| **4. Map & Dashboard** | Interactive Leaflet GIS map with color-coded status pins, cluster visualizer, and category filters. | Real-time filter by Ward, Category, and Priority. |
| **5. Duplicate Detection** | Jaccard n-gram token similarity + TF-IDF Cosine semantic similarity + Haversine geographic distance calculation. | **Strict constraint adhered:** Duplicates are flagged for admin review, **NEVER** auto-deleted. |
| **6. Admin Review Tools** | PIN-protected officer portal (`civic2026`) with triage workbench, side-by-side duplicate comparator, and assignment dispatch. | Authorized administrators only. |
| **7. Citizen Tracking** | Direct search by Tracking ID (e.g. `CC-2026-1041`), subscribe for status updates, and upvote community issues. | Transparent audit timeline visible to all residents. |
| **8. Recorded Resolution & Fix Verification** | Two-phase resolution: Admin logs required resolution notes & proof image → Citizens vote "Fix Confirmed" or "Still Persists". | **Strict constraint adhered:** Cannot set status to Resolved without a recorded field update. |
| **9. Recurring Community Problems** | Spatial-temporal clustering engine identifying recurring issue hotspots within 200m radius across time. | Provides root-cause diagnosis and civil engineering recommendations. |

---

## 🔒 Important Constraints Enforced

1. **Privacy Respecting**:
   - Camera/image uploads strip EXIF metadata before storage.
   - Anonymity toggle masks citizen names and contact information from public boards.
   - Location can be specified by approximate ward level if GPS coordinate sharing is declined.

2. **Unverified Until Reviewed**:
   - All citizen submissions default strictly to `SUBMITTED_UNVERIFIED`.
   - Civic officer must review and triage before work orders are initiated.

3. **No Resolution Claim Without Recorded Update**:
   - The API and UI strictly forbid transitioning to `RESOLVED` unless mandatory resolution notes (minimum 10 characters detailing field team work) and resolution timestamps are recorded.

4. **Preservation of Potential Duplicates**:
   - Duplicate detection warns submitters and flags issues with confidence scores for admin review.
   - Duplicates are never automatically discarded, preserving citizen voice.

---

## 🚀 How to Run Locally

### Option 1: Full-Stack Node + React (Pre-configured in AI Studio)
The repository includes a unified full-stack server running Express + Vite + SQLite (`node:sqlite`).

```bash
# 1. Install dependencies
npm install

# 2. Run dev server (Frontend + Backend on port 3000)
npm run dev

# 3. Open browser
http://localhost:3000
```

### Option 2: Python Flask + SQLite Backend
You can also run the reference Python Flask backend:

```bash
# 1. Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install requirements
pip install -r requirements.txt

# 3. Run Flask application (runs on port 5000 with civic_connect.db)
python app.py
```

### Administrator Credentials (Demo Mode)
- **PIN**: `civic2026` or `admin123`
- Default Role: Chief Municipal Operations Officer
