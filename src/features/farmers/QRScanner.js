import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../../core/database';

export default function QRScanner() {
  const navigation = useNavigation();
  const route = useRoute();
  const { returnTo } = route.params || {};
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      const farmer = await db.query('farmers')
        .findOne({ qr_code_hash: data, deleted_at: null });

      if (farmer) {
        Alert.alert(
          'Farmer Found',
          `${farmer.first_name} ${farmer.last_name} (${farmer.village_name})`,
          [
            {
              text: 'View Farmer',
              onPress: () => {
                navigation.navigate('FarmerForm', { farmerId: farmer.farmer_id });
              },
            },
            { text: 'Go Back', onPress: () => navigation.goBack() },
          ]
        );
        setScannedData(farmer);
      } else {
        Alert.alert(
          'New Farmer',
          `QR code not registered.\nHash: ${data.slice(0, 12)}…`,
          [
            {
              text: 'Create Farmer',
              onPress: () => {
                navigation.navigate('FarmerForm', { qrCodeHash: data });
              },
            },
            { text: 'Rescan', onPress: () => setScanned(false) },
          ]
        );
      }
    } catch (err) {
      console.error('QR lookup error:', err);
      Alert.alert('Error', 'Failed to look up farmer.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <Text style={{ marginTop: 12 }}>Requesting camera permission…</Text>
      </SafeAreaView>
    );
  }
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>No access to camera</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
      >
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.hint}>Align QR code within the frame</Text>
        </View>
      </BarCodeScanner>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        {scanned && (
          <TouchableOpacity style={[styles.button, styles.rescanButton]} onPress={() => setScanned(false)}>
            <Text style={styles.buttonText}>Rescan</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Looking up farmer…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  errorText: { fontSize: 18, color: '#d32f2f', marginBottom: 20 },
  scanner: { flex: 1, justifyContent: 'flex-end' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 240, height: 240, borderWidth: 2, borderColor: '#2e7d32', backgroundColor: 'transparent', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 16, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, backgroundColor: 'rgba(0,0,0,0.8)' },
  button: { backgroundColor: '#2e7d32', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8 },
  rescanButton: { backgroundColor: '#f57c00' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 16 },
});
