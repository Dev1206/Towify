import React from 'react';
import { Stack } from 'expo-router';
import MyComplaintsScreen from '../src/screens/MyComplaintsScreen';

export default function MyComplaintsPage() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false, // Hide header as our component has its own header
        }}
      />
      <MyComplaintsScreen />
    </>
  );
} 