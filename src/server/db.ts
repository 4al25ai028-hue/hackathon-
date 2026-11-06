import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.resolve(process.cwd(), 'civic_connect.db');

export function getDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  return db;
}

export function initDatabase() {
  const db = getDb();

  // Create tables
  db.exec(`
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
      issue_group_id TEXT,
      duplicate_status TEXT DEFAULT 'unique',
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

    CREATE TABLE IF NOT EXISTS issue_groups (
      id TEXT PRIMARY KEY,
      issue_title TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      latitude REAL,
      longitude REAL,
      total_reports INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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
  `);

  // Column migration checks for existing SQLite database
  try {
    db.exec('ALTER TABLE reports ADD COLUMN issue_group_id TEXT;');
  } catch {}
  try {
    db.exec("ALTER TABLE reports ADD COLUMN duplicate_status TEXT DEFAULT 'unique';");
  } catch {}

  // Check if initial seed is needed
  const countRow = db.prepare('SELECT COUNT(*) as count FROM reports').get() as { count: number };
  if (countRow.count === 0) {
    seedDatabase(db);
  }
}

export function clearAllDatabaseData() {
  const db = getDb();
  db.exec(`
    DELETE FROM reports;
    DELETE FROM issue_groups;
    DELETE FROM status_history;
    DELETE FROM verifications;
    DELETE FROM subscribers;
  `);
}

export function seedDatabase(db: DatabaseSync = getDb()) {
  const insertGroup = db.prepare(`
    INSERT INTO issue_groups (
      id, issue_title, category, location, latitude, longitude, total_reports, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReport = db.prepare(`
    INSERT INTO reports (
      id, title, description, category, priority, status,
      address, latitude, longitude, ward, image_url,
      is_anonymous, submitter_name, submitter_contact, upvotes_count,
      potential_duplicate_of, duplicate_confidence, is_duplicate_flagged,
      issue_group_id, duplicate_status,
      admin_notes, assigned_department, assigned_officer,
      created_at, updated_at, resolved_at, resolution_notes, resolution_image_url,
      verified_count, disputed_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const insertHistory = db.prepare(`
    INSERT INTO status_history (
      report_id, from_status, to_status, action, actor_type, actor_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVerification = db.prepare(`
    INSERT INTO verifications (
      report_id, is_verified_fixed, comment, citizen_token, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  // Sample Reports
  const initialReports = [
    {
      id: 'CC-2026-1041',
      title: 'Deep hazardous crater pothole on 5th Main & Elm St',
      description: 'Massive pothole in the middle of the westbound lane right before the crosswalk. Several two-wheelers have swerved into oncoming traffic to avoid it.',
      category: 'Roads & Potholes',
      priority: 'High',
      status: 'SUBMITTED_UNVERIFIED',
      address: '412 5th Main Road, Ward 12, Indiranagar',
      latitude: 12.9716,
      longitude: 77.6412,
      ward: 'Ward 12 (Central)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'Priya Sharma',
      submitter_contact: '+91 98*** **412',
      upvotes_count: 14,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'Triaged by CivicBot classifier. Awaiting physical field inspection.',
      assigned_department: 'Roads & Infrastructure Division',
      assigned_officer: null,
      created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      resolved_at: null,
      resolution_notes: null,
      resolution_image_url: null,
      verified_count: 0,
      disputed_count: 0,
      history: [
        {
          from_status: null,
          to_status: 'SUBMITTED_UNVERIFIED',
          action: 'Citizen Submission',
          actor_type: 'CITIZEN',
          actor_name: 'Priya Sharma',
          notes: 'Report submitted via CivicConnect portal. Treated as unverified until civic staff review.',
          created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'CC-2026-1042',
      title: 'Huge pothole near Elm Street signal (Potential Duplicate)',
      description: 'Deep road damage and pothole right next to the 5th Main junction. Very unsafe for bicycles and scooters after dark.',
      category: 'Roads & Potholes',
      priority: 'High',
      status: 'SUBMITTED_UNVERIFIED',
      address: '420 5th Main Road, Ward 12, Indiranagar',
      latitude: 12.9718,
      longitude: 77.6414,
      ward: 'Ward 12 (Central)',
      image_url: null,
      is_anonymous: 1,
      submitter_name: 'Anonymous Citizen',
      submitter_contact: 'Masked',
      upvotes_count: 3,
      potential_duplicate_of: 'CC-2026-1041',
      duplicate_confidence: 0.88,
      is_duplicate_flagged: 1,
      admin_notes: 'System flagged as potential duplicate of CC-2026-1041 (within 28m, 88% semantic text match). Held for admin review.',
      assigned_department: 'Roads & Infrastructure Division',
      assigned_officer: null,
      created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      resolved_at: null,
      resolution_notes: null,
      resolution_image_url: null,
      verified_count: 0,
      disputed_count: 0,
      history: [
        {
          from_status: null,
          to_status: 'SUBMITTED_UNVERIFIED',
          action: 'Citizen Submission & Duplicate Warning',
          actor_type: 'SYSTEM',
          actor_name: 'CivicDuplicateGuard',
          notes: 'Submitted by citizen. Duplicate detection algorithm flagged similarity to CC-2026-1041. Kept intact for administrator verification.',
          created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'CC-2026-0985',
      title: 'Overflowing Sewage Drain & Contaminated Stagnant Water',
      description: 'Underground municipal drain backed up behind the vegetable market. Grey water is spilling onto the pedestrian walkway creating severe biohazard and stench.',
      category: 'Water Supply & Drainage',
      priority: 'Critical',
      status: 'IN_PROGRESS',
      address: 'Corner Market Alley, Ward 7, Westside',
      latitude: 12.9654,
      longitude: 77.6321,
      ward: 'Ward 7 (West)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'Rohan Mehra',
      submitter_contact: '+91 97*** **981',
      upvotes_count: 32,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'Emergency sanitation order dispatched. Jetting machine truck unit #4 en-route.',
      assigned_department: 'Water & Sewage Board',
      assigned_officer: 'Officer K. Venkatesh (Zone 2 Supervisor)',
      created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      resolved_at: null,
      resolution_notes: null,
      resolution_image_url: null,
      verified_count: 0,
      disputed_count: 0,
      history: [
        {
          from_status: null,
          to_status: 'SUBMITTED_UNVERIFIED',
          action: 'Citizen Submission',
          actor_type: 'CITIZEN',
          actor_name: 'Rohan Mehra',
          notes: 'Report lodged with photographic evidence.',
          created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'SUBMITTED_UNVERIFIED',
          to_status: 'UNDER_REVIEW',
          action: 'Admin Triage & Field Verification',
          actor_type: 'ADMIN',
          actor_name: 'Admin Desk (P. Nair)',
          notes: 'Issue verified. Upgraded priority to Critical due to proximity to food vendors.',
          created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'UNDER_REVIEW',
          to_status: 'IN_PROGRESS',
          action: 'Field Crew Dispatched',
          actor_type: 'FIELD_CREW',
          actor_name: 'Officer K. Venkatesh',
          notes: 'Jetting crew deployed on site. Clearing calcified obstruction in main 300mm pipe.',
          created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'CC-2026-0814',
      title: 'Fallen Live Electric Cable sparking near St. Jude School Gate',
      description: 'Heavy rain brought down overhead cable onto the footpath. Cable was visibly sparking against metal fence railings.',
      category: 'Streetlighting & Electrical',
      priority: 'Critical',
      status: 'VERIFIED_CLOSED',
      address: '22 School Lane, Ward 5, Green Park',
      latitude: 12.9812,
      longitude: 77.6210,
      ward: 'Ward 5 (North)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'Sister Miriam',
      submitter_contact: '+91 94*** **112',
      upvotes_count: 47,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'Priority 1 Emergency Response completed by BESCOM rapid crew.',
      assigned_department: 'Electricity & Power Distribution',
      assigned_officer: 'Line Engineer A. Kumar',
      created_at: new Date(Date.now() - 140 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
      resolution_notes: 'Line was de-energized within 18 minutes. Overhead insulator replaced, new high-tensile insulated cabling installed and secured 5.5 meters above road clearance.',
      resolution_image_url: null,
      verified_count: 18,
      disputed_count: 0,
      history: [
        {
          from_status: null,
          to_status: 'SUBMITTED_UNVERIFIED',
          action: 'Citizen Submission',
          actor_type: 'CITIZEN',
          actor_name: 'Sister Miriam',
          notes: 'Urgent hazard report logged.',
          created_at: new Date(Date.now() - 140 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'SUBMITTED_UNVERIFIED',
          to_status: 'IN_PROGRESS',
          action: 'Emergency Isolation Triggered',
          actor_type: 'ADMIN',
          actor_name: 'Chief Dispatcher',
          notes: 'Direct dispatch to substation team.',
          created_at: new Date(Date.now() - 138 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'IN_PROGRESS',
          to_status: 'RESOLVED_PENDING_VERIFICATION',
          action: 'Official Resolution Recorded',
          actor_type: 'FIELD_CREW',
          actor_name: 'Line Engineer A. Kumar',
          notes: 'New cabling secured. Insulator replaced. Verification photo uploaded to audit trail.',
          created_at: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'RESOLVED_PENDING_VERIFICATION',
          to_status: 'VERIFIED_CLOSED',
          action: 'Community Verification Passed',
          actor_type: 'CITIZEN',
          actor_name: 'Community Consensus (18 votes)',
          notes: 'School principal and 17 local residents verified fix on site.',
          created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'CC-2026-0752',
      title: 'Broken Swing and Exposed Rusty Nails in Children Play Area',
      description: 'Chain link broke on twin swing set in community park. Exposed metal bracket has sharp rusty edges where children play.',
      category: 'Parks & Public Amenities',
      priority: 'Medium',
      status: 'RESOLVED_PENDING_VERIFICATION',
      address: 'Sunrise Park, Ward 9, South Extension',
      latitude: 12.9540,
      longitude: 77.6480,
      ward: 'Ward 9 (South)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'Anand Joshi',
      submitter_contact: '+91 99*** **765',
      upvotes_count: 9,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'Parks division assigned order #P-441.',
      assigned_department: 'Horticulture & Parks Department',
      assigned_officer: 'Supervisor Ramesh Babu',
      created_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      resolution_notes: 'Replaced broken chain linkage with galvanized rubber-coated heavy duty safety chains. Ground anchor re-welded and painted with rust-preventive coating.',
      resolution_image_url: null,
      verified_count: 2,
      disputed_count: 0,
      history: [
        {
          from_status: null,
          to_status: 'SUBMITTED_UNVERIFIED',
          action: 'Citizen Submission',
          actor_type: 'CITIZEN',
          actor_name: 'Anand Joshi',
          notes: 'Report submitted.',
          created_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'SUBMITTED_UNVERIFIED',
          to_status: 'IN_PROGRESS',
          action: 'Work Order Issued',
          actor_type: 'ADMIN',
          actor_name: 'Parks Officer',
          notes: 'Parts ordered and maintenance team allocated.',
          created_at: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'IN_PROGRESS',
          to_status: 'RESOLVED_PENDING_VERIFICATION',
          action: 'Resolution Filed',
          actor_type: 'FIELD_CREW',
          actor_name: 'Supervisor Ramesh Babu',
          notes: 'Swing repaired and safety inspected. Ready for resident citizen verification.',
          created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        }
      ]
    },
    // RECURRING PROBLEM HOTSPOT: Market Road Junction (3 repeated incidents over 4 months)
    {
      id: 'CC-2026-0610',
      title: 'Recurring Asphalt Collapse at Market Road & 4th Cross',
      description: 'The exact same section of road has sunk again for the 3rd time in 4 months. Drainage water under the roadbed appears to wash away the foundation substrate.',
      category: 'Roads & Potholes',
      priority: 'High',
      status: 'UNDER_REVIEW',
      address: 'Junction of Market Road & 4th Cross, Ward 12',
      latitude: 12.9730,
      longitude: 77.6435,
      ward: 'Ward 12 (Central)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'Vikram Sengupta (Residents Association)',
      submitter_contact: '+91 98*** **304',
      upvotes_count: 51,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'RECURRING PROBLEM DETECTED. Previous repairs (CC-2025-4122 and CC-2026-0199) failed due to subsurface pipe seep. Recommended for structural roadbed overhaul instead of patch tarring.',
      assigned_department: 'Urban Engineering & Drainage Synergy Taskforce',
      assigned_officer: 'Chief Municipal Engineer D. Rao',
      created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      resolved_at: null,
      resolution_notes: null,
      resolution_image_url: null,
      verified_count: 0,
      disputed_count: 0,
      history: [
        {
          from_status: null,
          to_status: 'SUBMITTED_UNVERIFIED',
          action: 'Citizen Submission',
          actor_type: 'CITIZEN',
          actor_name: 'Vikram Sengupta',
          notes: 'Residents association escalation filed.',
          created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
        {
          from_status: 'SUBMITTED_UNVERIFIED',
          to_status: 'UNDER_REVIEW',
          action: 'Recurring Hotspot Flagged by System',
          actor_type: 'SYSTEM',
          actor_name: 'CivicRecurrenceEngine',
          notes: 'Correlated with 2 historical incidents at exact coordinates (radius < 15m). Root cause: subterranean moisture.',
          created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        }
      ]
    },
    {
      id: 'CC-2026-0199',
      title: 'Waterlogged Pothole and Bitumen Stripping at Market Road Junction',
      description: 'Historical record: Road surface peeled off during monsoon overflow.',
      category: 'Roads & Potholes',
      priority: 'Medium',
      status: 'VERIFIED_CLOSED',
      address: 'Junction of Market Road & 4th Cross, Ward 12',
      latitude: 12.9731,
      longitude: 77.6436,
      ward: 'Ward 12 (Central)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'Kavita Menon',
      submitter_contact: '+91 96*** **872',
      upvotes_count: 22,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'Hot mix cold-patch applied. Temporary seal.',
      assigned_department: 'Roads & Infrastructure Division',
      assigned_officer: 'Foreman Sundar',
      created_at: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 42 * 24 * 3600 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 43 * 24 * 3600 * 1000).toISOString(),
      resolution_notes: 'Asphalt cold patch applied and roller compacted.',
      resolution_image_url: null,
      verified_count: 8,
      disputed_count: 1,
      history: []
    },
    {
      id: 'CC-2025-4122',
      title: 'Subsurface Water Leak eroding road surface at Market Road & 4th Cross',
      description: 'Historical record: Pipeline leak causing sinkage.',
      category: 'Water Supply & Drainage',
      priority: 'High',
      status: 'VERIFIED_CLOSED',
      address: 'Junction of Market Road & 4th Cross, Ward 12',
      latitude: 12.9729,
      longitude: 77.6434,
      ward: 'Ward 12 (Central)',
      image_url: null,
      is_anonymous: 0,
      submitter_name: 'M. S. Narayan',
      submitter_contact: '+91 91*** **553',
      upvotes_count: 19,
      potential_duplicate_of: null,
      duplicate_confidence: null,
      is_duplicate_flagged: 0,
      admin_notes: 'Pipe collar clamped. Recommended deep culvert reconstruction.',
      assigned_department: 'Water & Sewage Board',
      assigned_officer: 'Inspector G. Patel',
      created_at: new Date(Date.now() - 95 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 91 * 24 * 3600 * 1000).toISOString(),
      resolution_notes: 'Repaired ruptured underground joint collar and backfilled with stone dust.',
      resolution_image_url: null,
      verified_count: 11,
      disputed_count: 0,
      history: []
    }
  ];

  // Seed initial issue group
  insertGroup.run(
    'ISSUE-0001',
    'Deep crater pothole on 5th Main & Elm Street',
    'Roads & Potholes',
    '412 5th Main Road, Ward 12, Indiranagar',
    12.9716,
    77.6412,
    2,
    new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    new Date(Date.now() - 14 * 3600 * 1000).toISOString()
  );

  insertGroup.run(
    'ISSUE-0002',
    'Overflowing Sewage Drain & Biohazard Waste',
    'Water Supply & Drainage',
    'Corner Market Alley, Ward 7, Westside',
    12.9654,
    77.6321,
    1,
    new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    new Date(Date.now() - 8 * 3600 * 1000).toISOString()
  );

  for (const rep of initialReports) {
    let groupId: string | null = null;
    let dupStatus = 'unique';

    if (rep.id === 'CC-2026-1041') {
      groupId = 'ISSUE-0001';
      dupStatus = 'grouped';
    } else if (rep.id === 'CC-2026-1042') {
      groupId = 'ISSUE-0001';
      dupStatus = 'grouped';
    } else if (rep.id === 'CC-2026-0985') {
      groupId = 'ISSUE-0002';
      dupStatus = 'unique';
    }

    insertReport.run(
      rep.id, rep.title, rep.description, rep.category, rep.priority, rep.status,
      rep.address, rep.latitude, rep.longitude, rep.ward, rep.image_url,
      rep.is_anonymous, rep.submitter_name, rep.submitter_contact, rep.upvotes_count,
      rep.potential_duplicate_of, rep.duplicate_confidence, rep.is_duplicate_flagged,
      groupId, dupStatus,
      rep.admin_notes, rep.assigned_department, rep.assigned_officer,
      rep.created_at, rep.updated_at, rep.resolved_at, rep.resolution_notes, rep.resolution_image_url,
      rep.verified_count, rep.disputed_count
    );

    if (rep.history && rep.history.length > 0) {
      for (const h of rep.history) {
        insertHistory.run(
          rep.id, h.from_status, h.to_status, h.action, h.actor_type, h.actor_name, h.notes, h.created_at
        );
      }
    }
  }

  // Seed sample verifications
  insertVerification.run('CC-2026-0752', 1, 'Inspected swing set with my children this morning, sturdy and safe.', 'tok_demo1', new Date(Date.now() - 8 * 3600 * 1000).toISOString());
  insertVerification.run('CC-2026-0752', 1, 'Good weld job, sharp edges removed.', 'tok_demo2', new Date(Date.now() - 5 * 3600 * 1000).toISOString());
  insertVerification.run('CC-2026-0814', 1, 'Power restored and new cable safely routed above trees.', 'tok_demo3', new Date(Date.now() - 22 * 3600 * 1000).toISOString());
}
