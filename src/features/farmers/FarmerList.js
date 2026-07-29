// src/features/farmers/FarmerList.js
//
// TODO: paste in the JSX/UI from
//   Eport-Farmer-Management-App/src/components/FarmerList.js
// The data-fetching below is already wired to Dync — just keep this
// `farmers` state and render function, replacing only the markup.

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { db } from '../../core/database';

export default function FarmerList({ navigation }) {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await db.query('farmers').find();
      if (mounted) {
        setFarmers(result);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <Text>Loading farmers…</Text>;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={farmers}
        keyExtractor={(item) => item.farmer_id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('FarmerForm', { farmerId: item.farmer_id })}>
            <Text>{item.first_name} {item.last_name} — {item.village_name}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity onPress={() => navigation.navigate('QRScanner')}>
        <Text>Scan QR to find farmer</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('FarmerForm')}>
        <Text>+ New Farmer</Text>
      </TouchableOpacity>
    </View>
  );
}
