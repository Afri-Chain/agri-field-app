# agri-field-app

Offline-first agri-tech field survey app: Dync data layer, farmer management,
GPS polygon mapping, dynamic survey forms, and a Cloudflare Worker sync backend.

## What's fully implemented here

- `src/core/database.js` — Dync schema for farmers, plots, surveys, sync_queue, audit_log
- `src/core/sync-manager.js` — priority queue + exponential backoff sync engine
- `src/core/model-loader.js` — ONNX Runtime Web loader for edge AI models
- `src/utils/merkle.js`, `src/utils/compression.js` — proof generation & photo compression
- `src/features/marketplace/MarketplaceClient.js` — template/schema marketplace client
- `worker/index.js` — Cloudflare Worker: `/api/sync/ingest` (Merkle + GeoJSON validation
  + LWW upsert into D1), `/api/schemas/latest`, `/api/v1/templates`, `/models/*.onnx`
- `index.js` — app bootstrapper wiring navigation + services together

## What's a stub (needs the real UI pasted in)

I couldn't reach GitHub from this sandbox (no outbound network access), so
these files are working adapters — already wired to Dync with correct data
shapes — but have placeholder markup instead of the real polished UI:

- `src/features/farmers/{FarmerList,FarmerForm,QRScanner}.js` ← from **Eport-Farmer-Management-App**
- `src/features/mapping/{MapView,PolygonDrawer}.js`, `src/hooks/useGPS.js` ← from **agriculture-durability-mobile-app**
- `src/features/forms/FormRenderer.js` ← from **arena-mobile**

### To finish the integration

```bash
git clone https://github.com/micpana/Eport-Farmer-Management-App
git clone https://github.com/frckbrice/agriculture-durability-mobile-app
git clone https://github.com/openforis/arena-mobile
```

Then copy each project's UI markup into the matching stub file above,
keeping the existing Dync calls (`db.query(...)`) and hook signatures intact —
they're already the correct interface each stub expects.

## Dync query API convention

All modules now use one consistent calling style, matching `sync-manager.js`:

- `db.query('table').find(matchObj)` → array of matches
- `db.query('table').findOne(matchObj)` → single match or null
- `db.query('table').update(matchObj, data)` → match object first, data second
- `db.query('table').insert(data)`

`FarmerForm.js` and `QRScanner.js` previously used a fluent `.where({...}).update({...})`
style in a couple of spots — that's been normalized to the convention above.
If `@anfen/dync`'s real API turns out to differ from both (e.g. it wants
`.where()` chaining everywhere), it's a single find-and-replace across these
few call sites, since they're now at least internally consistent.

## Updated screen map (after pasting in the real components)

- `MapView` — full GPS polygon-drawing screen (was previously a stub); on
  save it navigates to `FarmerForm` with a `plotData` param, which `FarmerForm`
  now picks up in a `useEffect` and persists to the `plots` table.
- `FormRenderer` (registered as the `"FormRenderer"` route) now points at
  `SurveyFormScreen`, since the pasted `FormRenderer.js` is a pure
  presentational component (`schema` / `onSubmit` props) rather than a
  route-connected screen. `SurveyFormScreen` supplies the schema (falling
  back to a default if the marketplace is unreachable) and handles the
  Merkle proof + Dync insert on submit.
- `src/features/mapping/PolygonDrawer.js` is now a Turf.js utility module
  (`validatePolygon`, `calculateArea`, `checkEUDRArea`, `fullEUDRCheck`)
  imported by `MapView.js`, not a screen itself.

## Setup

```bash
npm install
# wrangler deploy for the worker:
cd worker && wrangler init agri-sync-worker && wrangler publish
```

Set `SYNC_URL` (app) to your deployed Worker's `/api/sync/ingest` URL, and
configure D1 (`DB`) + R2 (`MODELS`) bindings in `wrangler.toml`.
