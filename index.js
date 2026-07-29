// index.js — Combined Application Bootstrapper

import { registerRootComponent } from 'expo';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { db } from './src/core/database';
import { OfflineSyncManager } from './src/core/sync-manager';
import { EdgeModelLoader } from './src/core/model-loader';
import { MarketplaceClient } from './src/features/marketplace/MarketplaceClient';

import FarmerList from './src/features/farmers/FarmerList';
import FarmerForm from './src/features/farmers/FarmerForm';
import QRScanner from './src/features/farmers/QRScanner';
import MapView from './src/features/mapping/MapView';
import SurveyFormScreen from './src/features/forms/SurveyFormScreen';
import SurveyList from './src/features/forms/SurveyList';
import SettingsScreen from './src/features/settings/SettingsScreen';

const syncManager = new OfflineSyncManager(db);
const modelLoader = new EdgeModelLoader(db);
const marketplaceClient = new MarketplaceClient(db);

const Stack = createStackNavigator();

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    syncManager.startBackgroundSync();
    marketplaceClient.syncInstalledTemplates();

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('[SW] Registered'))
        .catch((err) => console.warn('[SW] Registration failed:', err));
    }

    setIsReady(true);
    return () => syncManager.stopBackgroundSync();
  }, []);

  if (!isReady) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="FarmerList">
        <Stack.Screen name="FarmerList" component={FarmerList} />
        <Stack.Screen name="FarmerForm" component={FarmerForm} />
        <Stack.Screen name="QRScanner" component={QRScanner} />
        <Stack.Screen name="MapView" component={MapView} />
        <Stack.Screen name="FormRenderer" component={SurveyFormScreen} />
        <Stack.Screen name="SurveyList" component={SurveyList} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);

if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GLOBAL ERROR]', error, isFatal);
  });
}

export { modelLoader };
