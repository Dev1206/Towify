import React from 'react';
import { Stack } from 'expo-router';
import StaffDashboardScreen from '../src/screens/StaffDashboardScreen';

export default function StaffDashboardPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false, // Hide header as our component has its own header
        }}
      />
      <StaffDashboardScreen />
    </>
  );
} 