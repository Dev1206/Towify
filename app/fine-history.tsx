import React from 'react';
import { Stack } from 'expo-router';
import FineHistoryScreen from '../src/screens/FineHistoryScreen';

export default function FineHistoryPage() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Fine History',
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
      <FineHistoryScreen />
    </>
  );
} 