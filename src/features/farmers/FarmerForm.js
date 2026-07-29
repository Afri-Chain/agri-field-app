import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../../core/database';

export default function FarmerForm() {
  const navigation = useNavigation();
  const route = useRoute();
  const { farmerId, qrCodeHash, plotData } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    village_name: '',
    phone_number: '',
    gender: '',
    qr_code_hash: qrCodeHash || '',
  });

  useEffect(() => {
    if (farmerId) {
      setLoading(true);
      db.query('farmers')
        .findOne({ farmer_id: farmerId })
        .then((farmer) => {
          if (farmer) {
            setForm({
              first_name: farmer.first_name || '',
              last_name: farmer.last_name || '',
              village_name: farmer.village_name || '',
              phone_number: farmer.phone_number || '',
              gender: farmer.gender || '',
              qr_code_hash: farmer.qr_code_hash || '',
            });
          } else {
            Alert.alert('Error', 'Farmer not found.');
            navigation.goBack();
          }
        })
        .catch((err) => {
          console.error('Load farmer error:', err);
          Alert.alert('Error', 'Failed to load farmer.');
        })
        .finally(() => setLoading(false));
    }
  }, [farmerId]);

  // Handle a plot just drawn in MapView and passed back via route.params.
  useEffect(() => {
    if (plotData && farmerId) {
      const plotId = `plot_${Date.now()}`;
      db.query('plots')
        .insert({
          plot_id: plotId,
          farmer_id: farmerId,
          area_hectares: plotData.areaHectares,
          geometry_type: 'Polygon',
          geojson_data: JSON.stringify(plotData.geojson),
          eudr_deforestation_risk: plotData.eudrStatus === 'REQUIRES_POLYGON' ? 'PASS' : 'UNKNOWN',
          sync_status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .then(() => {
          Alert.alert('Plot Saved', `Area: ${plotData.areaHectares.toFixed(4)} ha`);
        })
        .catch((err) => console.error('Plot save error:', err));
    }
  }, [plotData, farmerId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      Alert.alert('Validation', 'First and last name are required.');
      return;
    }
    if (!form.village_name.trim()) {
      Alert.alert('Validation', 'Village name is required.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        village_name: form.village_name.trim(),
        phone_number: form.phone_number.trim(),
        updated_at: now,
      };

      if (farmerId) {
        await db.query('farmers').update(
          { farmer_id: farmerId },
          { ...data, sync_status: 'PENDING' }
        );
        Alert.alert('Success', 'Farmer updated.');
      } else {
        const farmer_id = `farmer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await db.query('farmers').insert({
          ...data,
          farmer_id,
          created_at: now,
          sync_status: 'PENDING',
          deleted_at: null,
        });
        Alert.alert('Success', 'Farmer created.');
      }
      navigation.goBack();
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save farmer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 12 }}>Loading farmer…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{farmerId ? 'Edit Farmer' : 'New Farmer'}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={form.first_name}
            onChangeText={(v) => handleChange('first_name', v)}
            placeholder="e.g., John"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={form.last_name}
            onChangeText={(v) => handleChange('last_name', v)}
            placeholder="e.g., Doe"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Village *</Text>
          <TextInput
            style={styles.input}
            value={form.village_name}
            onChangeText={(v) => handleChange('village_name', v)}
            placeholder="e.g., Mwanga"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={form.phone_number}
            onChangeText={(v) => handleChange('phone_number', v)}
            placeholder="e.g., +254 700 123 456"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {['M', 'F', 'O'].map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderButton, form.gender === g && styles.genderButtonActive]}
                onPress={() => handleChange('gender', g)}
              >
                <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>
                  {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>QR Code Hash</Text>
          <TextInput
            style={styles.input}
            value={form.qr_code_hash}
            onChangeText={(v) => handleChange('qr_code_hash', v)}
            placeholder="Scanned QR or manual"
            editable={true}
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('QRScanner', { returnTo: 'FarmerForm' })}
          >
            <Text style={styles.scanButtonText}>📷 Scan QR</Text>
          </TouchableOpacity>
        </View>

        {farmerId && (
          <>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => navigation.navigate('MapView', { farmerId })}
            >
              <Text style={styles.scanButtonText}>🗺️ Draw Plot Boundary</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => navigation.navigate('FormRenderer', { farmerId })}
            >
              <Text style={styles.scanButtonText}>📝 Start Survey</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving…' : farmerId ? 'Update Farmer' : 'Create Farmer'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1e3a2f', marginBottom: 24 },
  field: { marginBottom: 18 },
  label: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderColor: '#ddd', borderWidth: 1 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#eee', marginRight: 8 },
  genderButtonActive: { backgroundColor: '#2e7d32' },
  genderText: { fontSize: 16, color: '#333' },
  genderTextActive: { color: '#fff' },
  scanButton: { marginTop: 8, backgroundColor: '#2196f3', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  scanButtonText: { color: '#fff', fontWeight: '600' },
  saveButton: { backgroundColor: '#2e7d32', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButton: { marginTop: 12, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16 },
});
