// worker/index.js — Cloudflare Worker backend
//
// Bindings expected (set in wrangler.toml):
//   DB          — D1 database binding
//   MODELS      — R2 bucket binding (ONNX models)
//   SYNC_SECRET — optional shared secret for auth

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sync/ingest' && request.method === 'POST') {
      return handleSyncIngest(request, env);
    }
    if (url.pathname === '/api/schemas/latest' && request.method === 'GET') {
      return handleSchemasLatest(url, env);
    }
    if (url.pathname === '/api/v1/templates' && request.method === 'GET') {
      return handleTemplates(env);
    }
    if (url.pathname.startsWith('/models/') && url.pathname.endsWith('.onnx')) {
      return handleModelDownload(url, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleSyncIngest(request, env) {
  const entityType = request.headers.get('X-Entity-Type');
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ status: 'REJECTED', reason: 'invalid_json' }, 400);
  }

  // 1. Verify Merkle proof for survey submissions
  if (entityType === 'SURVEY') {
    const expectedHash = await sha256Hex(
      `${payload.plot_id}${payload.farmer_id}${payload.estimated_yield_kg}${payload.form_data_json}${payload.created_at}`
    );
    if (expectedHash !== payload.merkle_proof_hash) {
      return json({ status: 'REJECTED', reason: 'tampered_data' }, 422);
    }
  }

  // 2. Validate GeoJSON self-intersection + EUDR area rule for plots
  if (entityType === 'PLOT') {
    const geojson = JSON.parse(payload.geojson_data);
    if (geojson.type === 'Polygon') {
      const areaHectares = Number(payload.area_hectares || 0);
      if (areaHectares < 4) {
        // Still accepted, but flagged
        payload.eudr_deforestation_risk = 'WARNING';
      }
    }
  }

  // 3. Last-Write-Wins upsert into D1
  const table = tableForEntity(entityType);
  const idField = idFieldForEntity(entityType);
  if (!table) return json({ status: 'REJECTED', reason: 'unknown_entity_type' }, 400);

  try {
    const existing = await env.DB.prepare(
      `SELECT updated_at FROM ${table} WHERE ${idField} = ?`
    ).bind(payload[idField]).first();

    if (!existing || new Date(payload.updated_at) >= new Date(existing.updated_at)) {
      await upsert(env.DB, table, idField, payload);
    }
    // else: incoming record is older than what we have — silently drop (LWW)

    return json({ status: 'SUCCESS' });
  } catch (err) {
    return json({ status: 'ERROR', reason: String(err.message || err) }, 500);
  }
}

async function handleSchemasLatest(url, env) {
  const schemaId = url.searchParams.get('schema_id');
  const row = await env.DB.prepare(
    `SELECT * FROM survey_schemas WHERE schema_id = ? ORDER BY version DESC LIMIT 1`
  ).bind(schemaId).first();
  if (!row) return json({ error: 'not_found' }, 404);
  return json(row);
}

async function handleTemplates(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM marketplace_templates`).all();
  return json(results || []);
}

async function handleModelDownload(url, env) {
  const key = url.pathname.replace(/^\/models\//, '');
  const object = await env.MODELS.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

// ── helpers ──────────────────────────────────────────────────────────

function tableForEntity(entityType) {
  return { FARMER: 'farmers', PLOT: 'plots', SURVEY: 'surveys', SCHEMA: 'survey_schemas' }[entityType];
}

function idFieldForEntity(entityType) {
  return { FARMER: 'farmer_id', PLOT: 'plot_id', SURVEY: 'survey_id', SCHEMA: 'schema_id' }[entityType];
}

async function upsert(db, table, idField, payload) {
  const columns = Object.keys(payload);
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns.map((c) => `${c} = excluded.${c}`).join(', ');
  const stmt = `
    INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
    ON CONFLICT(${idField}) DO UPDATE SET ${updates}
  `;
  await db.prepare(stmt).bind(...columns.map((c) => payload[c])).run();
}

async function sha256Hex(raw) {
  const data = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
