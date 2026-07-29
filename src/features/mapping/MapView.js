// src/features/mapping/MapView.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { validatePolygon, calculateArea, checkEUDRArea } from './PolygonDrawer';

// ─── MapView Component ──────────────────────────────────────────────

export default function MapViewScreen({ route }) {
  const navigation = useNavigation();
  const { farmerId, plotId } = route.params || {};

  const mapRef = useRef(null);
  const [coordinates, setCoordinates] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required for mapping.');
        navigation.goBack();
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setCurrentLocation({ latitude, longitude });
      setLoadingLocation(false);
      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const handleMapPress = (e) => {
    if (!isDrawing) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoordinates((prev) => [...prev, { latitude, longitude }]);
  };

  const handleUndo = () => {
    setCoordinates((prev) => prev.slice(0, -1));
  };

  const handleFinishDrawing = async () => {
    if (coordinates.length < 3) {
      Alert.alert('Not Enough Points', 'Please add at least 3 points to form a polygon.');
      return;
    }

    setSaving(true);
    try {
      const geoJsonCoords = coordinates.map((c) => [c.longitude, c.latitude]);
      const closedCoords = [...geoJsonCoords, geoJsonCoords[0]];

      const validation = validatePolygon(closedCoords);
      if (!validation.isValid) {
        Alert.alert('Invalid Polygon', validation.errors.join('\n'));
        setSaving(false);
        return;
      }

      const areaHa = calculateArea(closedCoords);
      const eudr = checkEUDRArea(areaHa);

      const geojson = {
        type: 'Polygon',
        coordinates: [closedCoords],
      };

      const result = {
        geojson,
        areaHectares: areaHa,
        eudrStatus: eudr.status,
        requiresFullPolygon: eudr.requiresFullPolygon,
        vertices: coordinates.length,
      };

      navigation.navigate('FarmerForm', {
        plotData: result,
        farmerId,
        plotId,
      });
    } catch (err) {
      console.error('Map save error:', err);
      Alert.alert('Error', 'Failed to save polygon. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingLocation) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 12 }}>Getting GPS location…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {plotId ? 'Edit Plot' : 'New Plot Boundary'}
        </Text>
        <Text style={styles.headerSub}>
          {isDrawing
            ? `Tap map to add points (${coordinates.length} vertices)`
            : 'Press "Start Drawing" to begin'}
        </Text>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onPress={isDrawing ? handleMapPress : undefined}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {coordinates.length > 2 && (
          <Polygon
            coordinates={coordinates}
            strokeColor="#2e7d32"
            fillColor="rgba(46, 125, 50, 0.3)"
            strokeWidth={2}
          />
        )}
        {coordinates.map((coord, idx) => (
          <Marker
            key={idx}
            coordinate={coord}
            pinColor="#2e7d32"
            title={`Point ${idx + 1}`}
          />
        ))}
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isDrawing ? styles.buttonActive : styles.buttonInactive]}
          onPress={() => setIsDrawing(!isDrawing)}
        >
          <Text style={styles.buttonText}>
            {isDrawing ? '🔴 Stop Adding Points' : '🟢 Start Drawing'}
          </Text>
        </TouchableOpacity>

        {coordinates.length > 0 && (
          <TouchableOpacity style={styles.buttonUndo} onPress={handleUndo}>
            <Text style={styles.buttonText}>↩️ Undo</Text>
          </TouchableOpacity>
        )}

        {coordinates.length >= 3 && (
          <TouchableOpacity
            style={[styles.buttonSave, saving && styles.buttonDisabled]}
            onPress={handleFinishDrawing}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving…' : '✅ Save Plot'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.buttonCancel}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>✖️ Cancel</Text>
        </TouchableOpacity>
      </View>

      {coordinates.length >= 2 && (
        <View style={styles.areaBanner}>
          <Text style={styles.areaText}>
            Points: {coordinates.length} | Area: {calculateArea(coordinates.map(c => [c.longitude, c.latitude])).toFixed(4)} ha
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e3a2f' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 4 },
  map: { flex: 1 },
  controls: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eee', justifyContent: 'space-around', gap: 8,
  },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  buttonActive: { backgroundColor: '#d32f2f' },
  buttonInactive: { backgroundColor: '#2e7d32' },
  buttonUndo: { backgroundColor: '#f57c00', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  buttonSave: { backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonCancel: { backgroundColor: '#999', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  areaBanner: {
    position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12, borderRadius: 8, alignItems: 'center',
  },
  areaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
