// src/hooks/useGPS.js
//
// TODO: replace internals with the tracking logic from
//   agriculture-durability-mobile-app/src/hooks/useGPS.js
// Interface kept stable so PolygonDrawer.js can consume it unchanged.

import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

const MAX_ACCEPTABLE_ACCURACY_M = 10;

export function useGPS() {
  const [points, setPoints] = useState([]);
  const [tracking, setTracking] = useState(false);
  const subRef = useRef(null);

  const start = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');

    setTracking(true);
    subRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1 },
      (loc) => {
        if (loc.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_M) return; // reject noisy fixes
        setPoints((prev) => [...prev, [loc.coords.longitude, loc.coords.latitude]]);
      }
    );
  };

  const stop = () => {
    subRef.current?.remove();
    setTracking(false);
  };

  const reset = () => setPoints([]);

  useEffect(() => () => subRef.current?.remove(), []);

  return { points, tracking, start, stop, reset };
}
