// src/features/forms/FormRenderer.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { compressImage } from '../../utils/compression';

export default function FormRenderer({
  schema,
  initialValues,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const startTime = useRef(Date.now());
  const [formData, setFormData] = useState(initialValues || {});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (fieldId, value) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: null }));
    }
  };

  const handlePhotoCapture = async (fieldId) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is required for photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const compressed = await compressImage(uri);
        handleChange(fieldId, compressed.base64 || uri);
      }
    } catch (err) {
      console.error('Photo capture error:', err);
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const isFieldVisible = (field) => {
    if (!field.dependsOn) return true;
    const { field: dependsField, value: dependsValue } = field.dependsOn;
    const currentValue = formData[dependsField];
    return currentValue === dependsValue;
  };

  const validateForm = () => {
    const newErrors = {};
    let hasError = false;

    schema.fields.forEach((field) => {
      if (!isFieldVisible(field)) return;
      const value = formData[field.id];

      if (field.required && (value === undefined || value === null || value === '')) {
        newErrors[field.id] = `${field.label} is required.`;
        hasError = true;
        return;
      }

      if (field.type === 'number' && value !== undefined && value !== '') {
        const num = parseFloat(value);
        if (field.min !== undefined && num < field.min) {
          newErrors[field.id] = `Minimum value is ${field.min}.`;
          hasError = true;
        }
        if (field.max !== undefined && num > field.max) {
          newErrors[field.id] = `Maximum value is ${field.max}.`;
          hasError = true;
        }
      }
    });

    setErrors(newErrors);
    return !hasError;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const duration = Math.round((Date.now() - startTime.current) / 1000);

    const finalData = {};
    schema.fields.forEach((field) => {
      if (isFieldVisible(field)) {
        finalData[field.id] = formData[field.id] ?? null;
      }
    });

    onSubmit(finalData, duration);
    setIsSubmitting(false);
  };

  const renderField = (field) => {
    if (!isFieldVisible(field)) return null;

    const value = formData[field.id];
    const error = errors[field.id];
    const isRequired = field.required;

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <View key={field.id} style={styles.field}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.required}>*</Text>}
            </Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={value?.toString() || ''}
              onChangeText={(text) => handleChange(field.id, text)}
              placeholder={field.placeholder || ''}
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              editable={!loading}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.field}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.required}>*</Text>}
            </Text>
            <View style={styles.selectContainer}>
              {field.options.map((opt) => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                const isSelected = value === optValue;
                return (
                  <TouchableOpacity
                    key={optValue}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleChange(field.id, optValue)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {optLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'boolean':
        return (
          <View key={field.id} style={[styles.field, styles.switchField]}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.required}>*</Text>}
            </Text>
            <Switch
              value={value === true || value === 'true'}
              onValueChange={(val) => handleChange(field.id, val)}
              trackColor={{ false: '#ccc', true: '#2e7d32' }}
              disabled={loading}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      case 'photo':
        return (
          <View key={field.id} style={styles.field}>
            <Text style={styles.label}>
              {field.label} {isRequired && <Text style={styles.required}>*</Text>}
            </Text>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={() => handlePhotoCapture(field.id)}
              disabled={loading}
            >
              <Text style={styles.photoButtonText}>
                {value ? '📷 Replace Photo' : '📷 Take Photo'}
              </Text>
            </TouchableOpacity>
            {value && <Text style={styles.photoHint}>Photo captured ✓</Text>}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>{schema.title || 'Survey Form'}</Text>
        <Text style={styles.subtitle}>{schema.description || 'Fill in the fields below'}</Text>
      </View>

      {schema.fields.map(renderField)}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || loading}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Submitting…' : 'Submit Audit'}</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2e7d32" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#1e3a2f' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  field: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 6 },
  required: { color: '#d32f2f', fontWeight: '700' },
  input: { backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, borderColor: '#ddd', borderWidth: 1 },
  inputError: { borderColor: '#d32f2f' },
  errorText: { color: '#d32f2f', fontSize: 13, marginTop: 4 },
  selectContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eee', marginRight: 8, marginBottom: 8 },
  optionSelected: { backgroundColor: '#2e7d32' },
  optionText: { fontSize: 14, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  switchField: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoButton: { backgroundColor: '#2196f3', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  photoButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  photoHint: { color: '#2e7d32', marginTop: 6, fontSize: 14 },
  actions: { marginTop: 24, gap: 12 },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  submitButton: { backgroundColor: '#2e7d32' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelButtonText: { color: '#666' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
});
