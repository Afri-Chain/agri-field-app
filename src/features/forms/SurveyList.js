import React, { useEffect, useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { db } from '../../core/database';

export default function SurveyList() {
  const [surveys, setSurveys] = useState([]);

  useEffect(() => {
    (async () => setSurveys(await db.query('surveys').find()))();
  }, []);

  return (
    <FlatList
      data={surveys}
      keyExtractor={(s) => s.survey_id}
      renderItem={({ item }) => (
        <View style={{ padding: 8 }}>
          <Text>{item.survey_id} — {item.sync_status}</Text>
          <Text>Est. yield: {item.estimated_yield_kg} kg</Text>
        </View>
      )}
    />
  );
}
