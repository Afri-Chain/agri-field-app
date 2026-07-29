import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { db } from '../../core/database';

export default function SettingsScreen() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    (async () => {
      const pending = await db.query('sync_queue').find({ status: 'PENDING' });
      setPendingCount(pending.length);
    })();
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <Text>Sync endpoint: {process.env.SYNC_URL || 'https://your-worker.workers.dev/api/sync/ingest'}</Text>
      <Text>Pending sync items: {pendingCount}</Text>
    </View>
  );
}
