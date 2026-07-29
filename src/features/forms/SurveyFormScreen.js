// src/features/forms/SurveyFormScreen.js
//
// Navigator screen for "FormRenderer" route. Supplies the JSON schema and
// handles the actual Dync insert + Merkle proof once FormRenderer collects
// the answers — FormRenderer itself is a pure, schema-driven view component.

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import FormRenderer from './FormRenderer';
import { db } from '../../core/database';
import { generateMerkleProof } from '../../utils/merkle';
import { MarketplaceClient } from '../marketplace/MarketplaceClient';

const marketplaceClient = new MarketplaceClient(db);

const DEFAULT_SCHEMA = {
  title: 'Field Survey',
  description: 'Standard crop yield & condition survey',
  schema_id: 'default_schema',
  version: 1,
  fields: [
    { id: 'estimated_yield_kg', label: 'Estimated Yield (kg)', type: 'number', required: true, min: 0 },
    {
      id: 'pest_infestation_level',
      label: 'Pest Infestation Level',
      type: 'select',
      required: true,
      options: ['None', 'Low', 'Medium', 'High'],
    },
    { id: 'crop_photo', label: 'Crop Photo', type: 'photo', required: false },
  ],
};

export default function SurveyFormScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmerId, plotId, agentId = 'current_agent' } = route.params || {};

  const [schema, setSchema] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const remote = await marketplaceClient.fetchLatestSchema('default_schema');
        setSchema(remote?.fields ? remote : DEFAULT_SCHEMA);
      } catch {
        setSchema(DEFAULT_SCHEMA); // offline or worker unreachable — fall back
      }
    })();
  }, []);

  const handleSubmit = async (formData, durationSeconds) => {
    setSaving(true);
    try {
      const surveyId = `srv_${Date.now()}`;
      const createdAt = new Date().toISOString();
      const formDataJson = JSON.stringify(formData);

      const merkleHash = await generateMerkleProof({
        plot_id: plotId,
        farmer_id: farmerId,
        estimated_yield_kg: formData.estimated_yield_kg || 0,
        form_data_json: formDataJson,
        created_at: createdAt,
      });

      await db.query('surveys').insert({
        survey_id: surveyId,
        farmer_id: farmerId,
        plot_id: plotId,
        agent_id: agentId,
        schema_id: schema.schema_id || 'default_schema',
        schema_version: schema.version || 1,
        estimated_yield_kg: formData.estimated_yield_kg || 0,
        survey_duration_seconds: durationSeconds,
        form_data_json: formDataJson,
        merkle_proof_hash: merkleHash,
        created_at: createdAt,
        updated_at: createdAt,
        sync_status: 'PENDING',
      });
      // Dync enqueues the sync_queue entry automatically on insert.

      navigation.navigate('SurveyList');
    } catch (err) {
      console.error('Survey save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!schema) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 12 }}>Loading survey form…</Text>
      </View>
    );
  }

  return (
    <FormRenderer
      schema={schema}
      initialValues={{}}
      loading={saving}
      onSubmit={handleSubmit}
      onCancel={() => navigation.goBack()}
    />
  );
}
