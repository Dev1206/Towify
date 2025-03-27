import React from 'react';
import { Stack } from 'expo-router';
import TowHistoryScreen from '../src/screens/TowHistoryScreen';

export default function TowHistoryPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tow History',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F7F9FC',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false,
        }}
      />
      <TowHistoryScreen />
    </>
  );
} 