CREATE TABLE IF NOT EXISTS farmers (
  farmer_id TEXT PRIMARY KEY,
  national_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  gender TEXT,
  date_of_birth TEXT,
  village_name TEXT NOT NULL,
  cooperative_id TEXT,
  qr_code_hash TEXT UNIQUE NOT NULL,
  biometric_voice_hash TEXT,
  credit_score INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS plots (
  plot_id TEXT PRIMARY KEY,
  farmer_id TEXT,
  plot_code TEXT UNIQUE,
  plot_name TEXT DEFAULT 'Main Plot',
  area_hectares REAL NOT NULL,
  elevation_meters REAL,
  slope_percentage REAL,
  geometry_type TEXT NOT NULL,
  geojson_data TEXT NOT NULL,
  eudr_deforestation_risk TEXT DEFAULT 'UNKNOWN',
  primary_crop TEXT,
  planting_year INTEGER,
  sync_status TEXT DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS surveys (
  survey_id TEXT PRIMARY KEY,
  plot_id TEXT,
  farmer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  estimated_yield_kg REAL,
  actual_harvest_kg REAL,
  pest_infestation_level TEXT,
  survey_duration_seconds INTEGER NOT NULL,
  form_data_json TEXT NOT NULL,
  confidence_rating TEXT DEFAULT 'HIGH',
  photo_manifest_json TEXT,
  merkle_proof_hash TEXT NOT NULL,
  gps_latitude REAL,
  gps_longitude REAL,
  gps_accuracy_meters REAL,
  sync_status TEXT DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS survey_schemas (
  schema_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  schema_json TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (schema_id, version)
);

CREATE TABLE IF NOT EXISTS marketplace_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL,
  manifest TEXT NOT NULL,
  downloads INTEGER DEFAULT 0,
  rating REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  priority INTEGER DEFAULT 2,
  payload_json TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
