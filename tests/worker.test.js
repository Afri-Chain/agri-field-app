import { describe, expect, it } from 'vitest';
import { handleTemplates } from '../worker/index.js';

describe('handleTemplates', () => {
  it('returns schema-backed templates when the marketplace table is unavailable', async () => {
    const calls = [];
    const env = {
      DB: {
        prepare(query) {
          calls.push(query);
          return {
            async all() {
              return {
                results: [
                  {
                    schema_id: 'coffee_rust_v2',
                    title: 'Coffee Rust Survey',
                    version: 2,
                  },
                ],
              };
            },
          };
        },
      },
    };

    const response = await handleTemplates(env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        schema_id: 'coffee_rust_v2',
        title: 'Coffee Rust Survey',
        version: 2,
      },
    ]);
    expect(calls[0]).toContain('survey_schemas');
  });
});
