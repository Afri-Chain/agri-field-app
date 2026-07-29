// src/utils/merkle.js
export async function generateMerkleProof({ plot_id, farmer_id, estimated_yield_kg, form_data_json, created_at }) {
  const raw = `${plot_id}${farmer_id}${estimated_yield_kg}${form_data_json}${created_at}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
