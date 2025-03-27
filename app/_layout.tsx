import React, { useEffect } from 'react';
import { Stack } from "expo-router";
import { SessionProvider } from '../src/context/SessionContext';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we initialize the app
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide the splash screen after initialization
    const hideAsync = async () => {
      await SplashScreen.hideAsync();
    };
    
    hideAsync();
  }, []);

  return (
    <SessionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'white' }
        }}
      />
    </SessionProvider>
  );
}
