// src/core/database.js
// Central Dync schema + database instance. All feature modules import `db` from here
// instead of touching SQLite/AsyncStorage directly.

import { createDatabase, createTable, schema } from '@anfen/dync';

export const farmerTable = createTable('farmers', {
  farmer_id: schema.text().primary(),
  national_id: schema.text().unique(),
  first_name: schema.text().notNull(),
  last_name: schema.text().notNull(),
  phone_number: schema.text(),
  gender: schema.text().oneOf(['M', 'F', 'O']),
  date_of_birth: schema.text(),
  village_name: schema.text().notNull(),
  cooperative_id: schema.text(),
  qr_code_hash: schema.text().unique().notNull(),
  biometric_voice_hash: schema.text(),
  credit_score: schema.number().default(0),
  sync_status: schema.text().oneOf(['PENDING', 'SYNCED', 'FAILED']).default('PENDING'),
  created_at: schema.text().notNull().default(new Date().toISOString()),
  updated_at: schema.text().notNull().default(new Date().toISOString()),
  deleted_at: schema.text().nullable(),
});

export const plotTable = createTable('plots', {
  plot_id: schema.text().primary(),
  farmer_id: schema.text().references('farmers.farmer_id').onDelete('CASCADE'),
  plot_code: schema.text().unique(),
  plot_name: schema.text().default('Main Plot'),
  area_hectares: schema.number().notNull(),
  elevation_meters: schema.number().nullable(),
  slope_percentage: schema.number().nullable(),
  geometry_type: schema.text().oneOf(['Point', 'Polygon']).notNull(),
  geojson_data: schema.text().notNull(),
  eudr_deforestation_risk: schema.text().oneOf(['PASS', 'WARNING', 'FAIL', 'UNKNOWN']).default('UNKNOWN'),
  primary_crop: schema.text(),
  planting_year: schema.number(),
  sync_status: schema.text().oneOf(['PENDING', 'SYNCED', 'FAILED']).default('PENDING'),
  created_at: schema.text().notNull().default(new Date().toISOString()),
  updated_at: schema.text().notNull().default(new Date().toISOString()),
});

export const surveyTable = createTable('surveys', {
  survey_id: schema.text().primary(),
  plot_id: schema.text().references('plots.plot_id').onDelete('SET NULL'),
  farmer_id: schema.text().references('farmers.farmer_id').onDelete('CASCADE').notNull(),
  agent_id: schema.text().notNull(),
  schema_id: schema.text().notNull(),
  schema_version: schema.number().notNull(),
  estimated_yield_kg: schema.number(),
  actual_harvest_kg: schema.number(),
  pest_infestation_level: schema.text(),
  survey_duration_seconds: schema.number().notNull(),
  form_data_json: schema.text().notNull(),
  confidence_rating: schema.text().oneOf(['HIGH', 'LOW_ESTIMATE']).default('HIGH'),
  photo_manifest_json: schema.text(),
  merkle_proof_hash: schema.text().notNull(),
  gps_latitude: schema.number(),
  gps_longitude: schema.number(),
  gps_accuracy_meters: schema.number(),
  sync_status: schema.text().oneOf(['PENDING', 'SYNCED', 'FAILED']).default('PENDING'),
  created_at: schema.text().notNull().default(new Date().toISOString()),
  updated_at: schema.text().notNull().default(new Date().toISOString()),
});

export const syncQueueTable = createTable('sync_queue', {
  queue_id: schema.number().autoIncrement().primary(),
  entity_type: schema.text().oneOf(['FARMER', 'PLOT', 'SURVEY', 'MEDIA', 'SCHEMA']).notNull(),
  entity_id: schema.text().notNull(),
  action: schema.text().oneOf(['CREATE', 'UPDATE', 'DELETE']).notNull(),
  priority: schema.number().oneOf([1, 2, 3]).default(2), // 1=farmer/plot, 2=survey, 3=media
  payload_json: schema.text().notNull(),
  status: schema.text().oneOf(['PENDING', 'PROCESSING', 'FAILED', 'SYNCED']).default('PENDING'),
  retry_count: schema.number().default(0),
  last_error: schema.text(),
  created_at: schema.text().notNull().default(new Date().toISOString()),
  updated_at: schema.text().notNull().default(new Date().toISOString()),
});

export const auditLogTable = createTable('audit_log', {
  log_id: schema.number().autoIncrement().primary(),
  entity_type: schema.text().notNull(),
  entity_id: schema.text().notNull(),
  action: schema.text().notNull(),
  actor_id: schema.text(),
  detail_json: schema.text(),
  created_at: schema.text().notNull().default(new Date().toISOString()),
});

export const db = createDatabase({
  tables: [farmerTable, plotTable, surveyTable, syncQueueTable, auditLogTable],
  sync: {
    endpoint: process.env.SYNC_URL || 'https://agri-sync-worker.africhain-solutions.workers.dev/api/sync/ingest',
  },
});
