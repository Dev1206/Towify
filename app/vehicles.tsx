import React from 'react';
import { Stack } from 'expo-router';
import VehicleListScreen from '../src/screens/VehicleListScreen';

export default function VehiclesScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Vehicles',
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
      <VehicleListScreen />
    </>
  );
} 