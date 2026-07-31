# agri-field-app

Offline-first agri-tech field survey app with a Cloudflare Worker sync backend.

## Stack

- **Mobile app**: React Native / Expo SDK 51 (farmers, GPS mapping, dynamic survey forms)
- **Sync backend**: Cloudflare Worker (`worker/index.js`) backed by D1 (SQLite) and optionally R2 (ONNX models)
- **Local DB**: `@anfen/dync` (offline-first layer with sync queue)

## Cloudflare Worker (deployed)

**URL**: `https://agri-sync-worker.africhain-solutions.workers.dev`

### Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/sync/ingest` | Ingest farmer/plot/survey records (Merkle validation + LWW upsert into D1) |
| GET | `/api/schemas/latest?schema_id=` | Fetch latest survey schema version |
| GET | `/api/v1/templates` | List active survey templates |
| GET | `/models/*.onnx` | Serve ONNX model files from R2 |

### D1 Database
- **Name**: `agri-field-db`
- **ID**: `9c3735b3-e40b-4ebf-81a0-5ff6ca3d6843`
- Schema applied from `schema.sql` (farmers, plots, surveys, survey_schemas, marketplace_templates, sync_queue, audit_log)

### Re-deploying
```bash
wrangler deploy
```

### Applying schema changes
```bash
wrangler d1 execute agri-field-db --file=schema.sql --remote
```

### Required secrets (stored as Replit Secrets)
- `CLOUDFLARE_API_TOKEN` — Workers + D1 read/write permissions
- `CLOUDFLARE_ACCOUNT_ID`

## Mobile App

Set `SYNC_URL` in the app to `https://agri-sync-worker.africhain-solutions.workers.dev/api/sync/ingest`.

### Running (Expo web only on Replit)
```bash
npm install
npm run web
```

> Note: Several UI components (FarmerList, FarmerForm, QRScanner, MapView, FormRenderer) are stubs.
> See README.md for instructions on filling them in from their source repos.

### R2 bucket (optional — for ONNX model serving)
Uncomment the `[[r2_buckets]]` block in `wrangler.toml` and create the bucket:
```bash
wrangler r2 bucket create agri-models
```

## User Preferences
